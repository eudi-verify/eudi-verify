/**
 * @eudi-verify/server - OpenID4VP Engine
 *
 * VerifierEngine adapter wrapping @openeudi/openid4vp for real (non-demo)
 * OpenID4VP verification: emits a by-value authorization request (DCQL,
 * plain `direct_post`, `client_id=redirect_uri:<response_uri>`) and
 * cryptographically verifies the wallet's callback.
 *
 * Distinct from `OpenEudiEngine` (which wraps `@openeudi/core` DemoMode for
 * simulated claims) so either engine — or a future Sphereon engine — can be
 * swapped in behind the same `VerifierEngine` interface.
 *
 * Security posture (see THREAT_MODEL.md): plain `direct_post` means TLS is
 * the only confidentiality layer in transit, so this engine fails closed by
 * default — construction throws unless trust anchoring is configured (or
 * the insecure escape hatch is explicitly and doubly acknowledged) and
 * unless `baseUrl` is `https://` (or insecurity is explicitly allowed for
 * local/LAN lab use).
 */

// `@openeudi/openid4vp` depends on `@peculiar/x509`, which requires a
// reflect polyfill (tsyringe DI) at module load time. Must run before that
// import; `@openeudi/openid4vp` only lists `reflect-metadata` as a
// devDependency, so consumers are responsible for providing it.
import "reflect-metadata";
import {
  createAuthorizationRequest,
  verifyAuthorizationResponse,
  buildOpenID4VPHandoverSessionTranscript,
  StaticTrustStore,
  type AuthorizationResponse,
  type DcqlQuery,
  type TrustStore,
  type TrustStoreInput,
} from "@openeudi/openid4vp";
import type {
  VerifierEngine,
  CreateSessionConfig,
  CreateSessionResult,
  CallbackData,
  CallbackResult,
} from "../engine.js";
import type { Session, VerifierMode } from "../types.js";
import {
  buildAvDcqlQuery,
  requestedClaimKeys,
  verifyResultToClaims,
} from "./openid4vp-mappers.js";

export interface Openid4vpEngineConfig {
  /** Operating mode. This engine only supports 'production' (real crypto). */
  mode: VerifierMode;
  /** Base URL for callback endpoints (e.g., https://example.com/api/eudi). Must be https:// unless allowInsecureTransport. */
  baseUrl: string;
  /** Session TTL in ms (informational; server owns actual TTL enforcement). */
  sessionTtlMs?: number;
  /** Override client_id. Defaults to `redirect_uri:${baseUrl}/callback`. */
  clientId?: string;
  /** OpenID4VP response_mode. Default 'direct_post' (no JARM — matches the AV wallet's free-team build). */
  responseMode?: "direct_post" | "direct_post.jwt";
  /** Pre-built trust store (anchored trust). Takes precedence over trustedCerts. */
  trustStore?: TrustStore;
  /** Certs to build a StaticTrustStore from (anchored trust, no network). */
  trustedCerts?: Iterable<TrustStoreInput>;
  /**
   * Skip issuer trust-chain anchoring. The credential's own signature,
   * device binding, DCQL match, and nonce are still verified — only the
   * "who issued this" check is skipped. A rogue issuer would pass.
   *
   * DANGEROUS: requires `acknowledgeInsecureTrust: true` to take effect,
   * and throws unconditionally when `NODE_ENV === 'production'`. Lab-only.
   */
  skipTrustCheck?: boolean;
  /** Explicit opt-in required alongside `skipTrustCheck` — see its docs. */
  acknowledgeInsecureTrust?: boolean;
  /**
   * Allow a non-https `baseUrl`. Required for the plain-http LAN lab
   * (Milestone A used `http://192.168.x`). Plain `direct_post` has no
   * response encryption, so TLS is otherwise the only confidentiality
   * layer in transit — never set this outside local/LAN development.
   */
  allowInsecureTransport?: boolean;
  /** Expected audience for key-binding JWT verification (SD-JWT path). */
  audience?: string;
}

interface Openid4vpSessionData {
  nonce: string;
  requestedClaims: string[];
  dcqlQuery: DcqlQuery;
  clientId: string;
  responseUri: string;
  createdAt: number;
}

/** Resolved trust level for a verified presentation — see THREAT_MODEL.md. */
export type TrustLevel = "anchored" | "none";

export class Openid4vpEngine implements VerifierEngine {
  readonly name = "openid4vp";
  readonly mode: VerifierMode;

  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly responseMode: "direct_post" | "direct_post.jwt";
  private readonly trustStore?: TrustStore;
  private readonly skipTrustCheck: boolean;
  private readonly audience?: string;
  private readonly trustLevel: TrustLevel;

  constructor(config: Openid4vpEngineConfig) {
    this.mode = config.mode;
    this.baseUrl = config.baseUrl;
    this.responseMode = config.responseMode ?? "direct_post";
    this.clientId =
      config.clientId ?? `redirect_uri:${config.baseUrl}/callback`;
    this.skipTrustCheck = config.skipTrustCheck === true;
    this.audience = config.audience;

    if (
      !config.allowInsecureTransport &&
      !config.baseUrl.startsWith("https://")
    ) {
      throw new Error(
        "[Openid4vpEngine] baseUrl must be https:// (plain direct_post has no " +
          "response encryption — TLS is the only confidentiality layer in " +
          "transit). Set allowInsecureTransport: true only for local/LAN dev.",
      );
    }

    if (config.trustStore) {
      this.trustStore = config.trustStore;
    } else if (config.trustedCerts) {
      this.trustStore = new StaticTrustStore(config.trustedCerts);
    }

    const hasAnchoredTrust = this.trustStore !== undefined;
    const insecureHatchArmed =
      this.skipTrustCheck && config.acknowledgeInsecureTrust === true;

    if (!hasAnchoredTrust && !insecureHatchArmed) {
      throw new Error(
        "[Openid4vpEngine] No trust anchoring configured. Provide `trustStore` " +
          "or `trustedCerts`, or explicitly set both `skipTrustCheck: true` and " +
          "`acknowledgeInsecureTrust: true` to run without issuer trust " +
          "anchoring (lab-only — a rogue issuer would pass).",
      );
    }

    if (!hasAnchoredTrust && process.env.NODE_ENV === "production") {
      throw new Error(
        "[Openid4vpEngine] Refusing to run without anchored trust " +
          "(trustStore/trustedCerts) when NODE_ENV === 'production'. " +
          "skipTrustCheck is lab-only.",
      );
    }

    this.trustLevel = hasAnchoredTrust ? "anchored" : "none";
  }

  async initialize(): Promise<void> {
    if (this.trustLevel === "none") {
      console.warn(
        "[Openid4vpEngine] Running with skipTrustCheck — issuer trust " +
          "anchoring is DISABLED. Do NOT use outside a controlled lab.",
      );
    }
  }

  async createSession(
    config: CreateSessionConfig,
  ): Promise<CreateSessionResult> {
    const responseUri = `${config.baseUrl}/callback`;
    const dcqlQuery = buildAvDcqlQuery(config.request);
    const requestedClaims = requestedClaimKeys(config.request);

    const authRequest = createAuthorizationRequest(
      {
        clientId: this.clientId,
        responseUri,
        nonce: this.generateNonce(),
        state: config.sessionId,
        responseMode: this.responseMode,
      },
      dcqlQuery,
    );

    const engineData: Openid4vpSessionData = {
      nonce: authRequest.nonce,
      requestedClaims,
      dcqlQuery,
      clientId: this.clientId,
      responseUri,
      createdAt: Date.now(),
    };

    return { qrUrl: authRequest.uri, engineData };
  }

  async parseCallback(rawBody: string): Promise<CallbackData> {
    const params = new URLSearchParams(rawBody);
    const vpTokenRaw = params.get("vp_token");
    const state = params.get("state") ?? undefined;
    const sessionIdParam = params.get("session_id") ?? undefined;

    if (!vpTokenRaw) {
      throw new Error("[Openid4vpEngine] Missing vp_token in callback body");
    }

    // Canonical identifier rule (security control #4): state is
    // authoritative; if session_id disagrees, reject rather than silently
    // preferring one.
    if (
      state !== undefined &&
      sessionIdParam !== undefined &&
      state !== sessionIdParam
    ) {
      throw new Error(
        "[Openid4vpEngine] state and session_id disagree in callback body",
      );
    }

    const sessionId = state ?? sessionIdParam;
    if (!sessionId) {
      throw new Error(
        "[Openid4vpEngine] Missing state (and session_id) in callback body",
      );
    }

    let vpToken: unknown;
    try {
      vpToken = JSON.parse(vpTokenRaw);
    } catch {
      throw new Error("[Openid4vpEngine] vp_token is not valid JSON");
    }

    return { sessionId, vpToken, state };
  }

  async handleCallback(
    data: CallbackData,
    session: Session,
  ): Promise<CallbackResult> {
    const engineData = session._engineData as Openid4vpSessionData | undefined;
    if (!engineData) {
      return {
        success: false,
        status: "error",
        error: "missing_engine_session_data",
      };
    }

    // state (when present) must match the session it's claimed against —
    // parseCallback already ruled out state/session_id disagreement, but
    // this catches a state that simply names a different (real) session.
    if (data.state !== undefined && data.state !== session.id) {
      return { success: false, status: "error", error: "state_mismatch" };
    }

    const envelope: AuthorizationResponse = {
      vp_token: data.vpToken as AuthorizationResponse["vp_token"],
      state: data.state,
    };

    try {
      // Plain direct_post has no JWE `apu`, so the library cannot auto-build
      // the mdoc SessionTranscript. Empirically (Milestone B, AV wallet):
      // OpenID4VP 1.0 Final unencrypted handover (jwkThumbprint = null) is
      // the layout the free-team iOS wallet signs. See INTEROP-LOG.
      const mdocSessionTranscript =
        await buildOpenID4VPHandoverSessionTranscript({
          clientId: engineData.clientId,
          nonce: engineData.nonce,
          responseUri: engineData.responseUri,
        });

      const result = await verifyAuthorizationResponse(
        envelope,
        engineData.dcqlQuery,
        {
          nonce: engineData.nonce,
          clientId: engineData.clientId,
          responseUri: engineData.responseUri,
          audience: this.audience,
          trustedCertificates: [],
          mdocSessionTranscript,
          ...(this.trustStore
            ? { trustStore: this.trustStore }
            : { skipTrustCheck: this.skipTrustCheck }),
        },
      );

      return verifyResultToClaims(result, this.trustLevel);
    } catch (err) {
      console.error(
        "[Openid4vpEngine] verifyAuthorizationResponse failed:",
        err,
      );
      return {
        success: false,
        status: "error",
        error: err instanceof Error ? err.message : "verification_failed",
      };
    }
  }

  async cancelSession(_session: Session): Promise<void> {
    // No engine-side resources to release for by-value requests.
  }

  async shutdown(): Promise<void> {
    // No cleanup needed.
  }

  private generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
  }
}

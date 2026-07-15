/**
 * @eudi-verify/server - OpenEUDI Engine
 *
 * VerifierEngine adapter wrapping @openeudi/core IVerificationMode strategies.
 * Session/token lifecycle stays in eudi-verify handlers (IKVStore) so engines
 * remain swappable without adopting core's VerificationService orchestrator.
 *
 * Demo mode: DemoMode from @openeudi/core (simulated age + country claims).
 * Production mode: deferred — returns not-implemented until HAIP path exists.
 */

import {
  DemoMode,
  type BaseSession,
  type IVerificationMode,
  type VerificationType,
} from "@openeudi/core";
import type {
  VerifierEngine,
  CreateSessionConfig,
  CreateSessionResult,
  CallbackData,
  CallbackResult,
  OpenEudiEngineConfig,
} from "../engine.js";
import type { Session, VerifierMode } from "../types.js";
import { coreResultToClaims, requestToCoreType } from "./openeudi-mappers.js";

export interface OpenEudiEngineOptions extends OpenEudiEngineConfig {
  /** Simulated verification delay in ms before delegating to core (demo mode) */
  demoDelayMs?: number;
}

interface OpenEudiSessionData {
  nonce: string;
  requestedClaims: string[];
  coreType: VerificationType;
  createdAt: number;
}

export class OpenEudiEngine implements VerifierEngine {
  readonly name = "openeudi";
  readonly mode: VerifierMode;

  private config: Required<
    Pick<OpenEudiEngineOptions, "baseUrl" | "sessionTtlMs" | "demoDelayMs">
  >;
  private coreMode?: IVerificationMode;

  constructor(options: OpenEudiEngineOptions) {
    this.mode = options.mode;
    this.config = {
      baseUrl: options.baseUrl,
      sessionTtlMs: options.sessionTtlMs ?? 5 * 60 * 1000,
      demoDelayMs: options.demoDelayMs ?? 0,
    };
    // ponytail: production uses the stub callback path; core DemoMode is only
    // wired for demo. Delay is applied in handleCallback, so delayMs stays 0 here.
    if (this.mode === "demo") {
      this.coreMode = new DemoMode({ delayMs: 0 });
    }
  }

  async initialize(): Promise<void> {
    if (this.mode === "demo") {
      console.warn(
        "[OpenEudiEngine] Running in DEMO mode via @openeudi/core DemoMode. " +
          "Credentials are simulated. Do NOT use in production.",
      );
    }
  }

  async createSession(
    config: CreateSessionConfig,
  ): Promise<CreateSessionResult> {
    const nonce = this.generateNonce();
    const requestedClaims = Object.keys(config.request).filter(
      (k) => config.request[k] === true,
    );
    const { type: coreType } = requestToCoreType(config.request);

    const engineData: OpenEudiSessionData = {
      nonce,
      requestedClaims,
      coreType,
      createdAt: Date.now(),
    };

    const qrUrl = this.buildAuthorizationRequestUrl(config, nonce);

    return { qrUrl, engineData };
  }

  async parseCallback(rawBody: string): Promise<CallbackData> {
    const params = new URLSearchParams(rawBody);
    const response = params.get("response");
    const state = params.get("state") || params.get("session_id");

    if (!response || !state) {
      throw new Error("Invalid callback: missing response or state");
    }

    return { sessionId: state, response };
  }

  async handleCallback(
    data: CallbackData,
    session: Session,
  ): Promise<CallbackResult> {
    if (this.config.demoDelayMs > 0) {
      await this.delay(this.config.demoDelayMs);
    }

    if (this.mode === "demo") {
      return this.handleDemoCallback(data, session);
    }

    return this.handleProductionCallback();
  }

  async getAuthorizationRequest(session: Session): Promise<string> {
    const engineData = session._engineData as OpenEudiSessionData | undefined;
    const nonce = engineData?.nonce ?? this.generateNonce();

    // ponytail: signed JWT PAR deferred to production HAIP; ceiling = JSON stub only
    return JSON.stringify({
      type: "authorization_request",
      response_type: "vp_token",
      client_id: this.config.baseUrl,
      redirect_uri: `${this.config.baseUrl}/callback`,
      state: session.id,
      nonce,
      presentation_definition: this.buildPresentationDefinition(
        session.request,
      ),
      mode: this.mode === "demo" ? "demo" : undefined,
    });
  }

  async cancelSession(_session: Session): Promise<void> {
    // No core-side resources to release when using IVerificationMode only
  }

  async shutdown(): Promise<void> {
    // No cleanup needed
  }

  private async handleDemoCallback(
    data: CallbackData,
    session: Session,
  ): Promise<CallbackResult> {
    const engineData = session._engineData as OpenEudiSessionData | undefined;
    if (!engineData) {
      return {
        success: false,
        error: "Missing engine session data",
        status: "error",
      };
    }

    if (!this.coreMode) {
      return {
        success: false,
        error: "Demo engine not initialized",
        status: "error",
      };
    }

    const coreSession = this.toBaseSession(session, engineData);
    const result = await this.coreMode.processCallback(
      coreSession,
      data.response,
    );
    return coreResultToClaims(result, session.request);
  }

  private handleProductionCallback(): CallbackResult {
    return {
      success: false,
      error: "Production mode not yet implemented",
      status: "error",
    };
  }

  private toBaseSession(
    session: Session,
    engineData: OpenEudiSessionData,
  ): BaseSession {
    return {
      id: session.id,
      type: engineData.coreType,
      walletUrl: session.qrUrl ?? `openid4vp://authorize?state=${session.id}`,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    };
  }

  private buildAuthorizationRequestUrl(
    config: CreateSessionConfig,
    nonce: string,
  ): string {
    if (this.mode === "demo") {
      const params = new URLSearchParams({
        client_id: this.config.baseUrl,
        response_type: "vp_token",
        state: config.sessionId,
        nonce,
        redirect_uri: `${this.config.baseUrl}/callback`,
        mode: "demo",
      });

      return `openid4vp://authorize?${params.toString()}`;
    }

    const params = new URLSearchParams({
      client_id: this.config.baseUrl,
      request_uri: `${config.baseUrl}/request/${config.sessionId}`,
    });

    return `openid4vp://authorize?${params.toString()}`;
  }

  private buildPresentationDefinition(
    request: Record<string, boolean | undefined>,
  ): object {
    const requestedClaims = Object.keys(request).filter(
      (k) => request[k] === true,
    );

    const inputDescriptors = requestedClaims.map((claim) => ({
      id: claim,
      name: this.getClaimDisplayName(claim),
      purpose: `Verify ${this.getClaimDisplayName(claim).toLowerCase()}`,
      constraints: {
        fields: [
          {
            path: [`$.${claim}`, `$.vc.credentialSubject.${claim}`],
          },
        ],
      },
    }));

    return {
      id: `eudi-verify-${Date.now()}`,
      name: "EUDI Verification Request",
      purpose: "Identity verification",
      input_descriptors: inputDescriptors,
    };
  }

  private getClaimDisplayName(claim: string): string {
    const names: Record<string, string> = {
      age_over_18: "Age over 18",
      age_over_21: "Age over 21",
      nationality: "Nationality",
      given_name: "Given name",
      family_name: "Family name",
      birth_date: "Birth date",
    };
    return names[claim] ?? claim;
  }

  private generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

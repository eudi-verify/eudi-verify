/**
 * @eudi-verify/server - OpenEUDI Engine
 *
 * Verifier engine implementation wrapping @openeudi/core.
 * Provides both demo mode (simulated credentials) and production mode.
 *
 * Demo mode:
 * - Generates mock OpenID4VP authorization requests
 * - Simulates wallet responses with configurable claims
 * - No real cryptographic verification
 *
 * Production mode (future):
 * - Real OpenID4VP protocol implementation
 * - Cryptographic verification of VPs
 * - Trust list validation
 */

import type {
  VerifierEngine,
  CreateSessionConfig,
  CreateSessionResult,
  CallbackData,
  CallbackResult,
  OpenEudiEngineConfig,
} from '../engine.js';
import type { Session, VerifiedClaims, VerifierMode } from '../types.js';

/**
 * Demo claims configuration.
 */
export interface DemoClaimsConfig {
  age_over_18?: boolean;
  age_over_21?: boolean;
  nationality?: string;
  given_name?: string;
  family_name?: string;
  birth_date?: string;
}

/**
 * Extended OpenEUDI engine configuration.
 */
export interface OpenEudiEngineOptions extends OpenEudiEngineConfig {
  /** Default claims to return in demo mode */
  demoClaims?: DemoClaimsConfig;
  /** Simulated verification delay in ms (demo mode) */
  demoDelayMs?: number;
}

/**
 * Stored engine data for a session.
 */
interface OpenEudiSessionData {
  nonce: string;
  requestedClaims: string[];
  createdAt: number;
}

/**
 * OpenEUDI engine implementation.
 *
 * In demo mode, simulates the OpenID4VP flow:
 * 1. createSession generates a mock authorization request URL
 * 2. handleCallback returns simulated claims
 *
 * In production mode (future), will use @openeudi/core for:
 * - Real authorization request generation
 * - VP signature verification
 * - Trust list validation
 */
export class OpenEudiEngine implements VerifierEngine {
  readonly name = 'openeudi';
  readonly mode: VerifierMode;

  private config: Required<OpenEudiEngineOptions>;

  constructor(options: OpenEudiEngineOptions) {
    this.mode = options.mode;
    this.config = {
      mode: options.mode,
      baseUrl: options.baseUrl,
      sessionTtlMs: options.sessionTtlMs ?? 5 * 60 * 1000,
      demoClaims: options.demoClaims ?? {
        age_over_18: true,
        age_over_21: true,
        nationality: 'LU',
        given_name: 'Jean',
        family_name: 'Dupont',
        birth_date: '1985-03-15',
      },
      demoDelayMs: options.demoDelayMs ?? 0,
    };
  }

  async initialize(): Promise<void> {
    if (this.mode === 'demo') {
      console.warn(
        '[OpenEudiEngine] Running in DEMO mode. ' +
          'Credentials are simulated. Do NOT use in production.'
      );
    }
  }

  async createSession(config: CreateSessionConfig): Promise<CreateSessionResult> {
    const nonce = this.generateNonce();
    const requestedClaims = Object.keys(config.request).filter(
      (k) => config.request[k] === true
    );

    const engineData: OpenEudiSessionData = {
      nonce,
      requestedClaims,
      createdAt: Date.now(),
    };

    const qrUrl = this.buildAuthorizationRequestUrl(config, nonce);

    return { qrUrl, engineData };
  }

  async parseCallback(rawBody: string): Promise<CallbackData> {
    const params = new URLSearchParams(rawBody);
    const response = params.get('response');
    const state = params.get('state') || params.get('session_id');

    if (!response || !state) {
      throw new Error('Invalid callback: missing response or state');
    }

    return { sessionId: state, response };
  }

  async handleCallback(data: CallbackData, session: Session): Promise<CallbackResult> {
    if (this.config.demoDelayMs > 0) {
      await this.delay(this.config.demoDelayMs);
    }

    if (this.mode === 'demo') {
      return this.handleDemoCallback(data, session);
    }

    return this.handleProductionCallback(data, session);
  }

  async getAuthorizationRequest(session: Session): Promise<string> {
    const engineData = session._engineData as OpenEudiSessionData | undefined;
    const nonce = engineData?.nonce ?? this.generateNonce();

    if (this.mode === 'demo') {
      return JSON.stringify({
        type: 'authorization_request',
        response_type: 'vp_token',
        client_id: this.config.baseUrl,
        redirect_uri: `${this.config.baseUrl}/callback`,
        state: session.id,
        nonce,
        presentation_definition: this.buildPresentationDefinition(session.request),
        mode: 'demo',
      });
    }

    return JSON.stringify({
      type: 'authorization_request',
      response_type: 'vp_token',
      client_id: this.config.baseUrl,
      redirect_uri: `${this.config.baseUrl}/callback`,
      state: session.id,
      nonce,
      presentation_definition: this.buildPresentationDefinition(session.request),
    });
  }

  async cancelSession(_session: Session): Promise<void> {
    // No cleanup needed
  }

  async shutdown(): Promise<void> {
    // No cleanup needed
  }

  private handleDemoCallback(
    _data: CallbackData,
    session: Session
  ): CallbackResult {
    const engineData = session._engineData as OpenEudiSessionData | undefined;
    const requestedClaims = engineData?.requestedClaims ?? Object.keys(session.request);

    const claims = this.generateDemoClaims(requestedClaims);

    return {
      success: true,
      claims,
      status: 'verified',
    };
  }

  private handleProductionCallback(
    _data: CallbackData,
    _session: Session
  ): CallbackResult {
    // Production implementation would:
    // 1. Decrypt JWE if encrypted
    // 2. Parse and validate VP token
    // 3. Verify signatures against trust list
    // 4. Check nonce binding
    // 5. Extract disclosed claims

    return {
      success: false,
      error: 'Production mode not yet implemented',
      status: 'error',
    };
  }

  private buildAuthorizationRequestUrl(
    config: CreateSessionConfig,
    nonce: string
  ): string {
    if (this.mode === 'demo') {
      const params = new URLSearchParams({
        client_id: this.config.baseUrl,
        response_type: 'vp_token',
        state: config.sessionId,
        nonce,
        redirect_uri: `${this.config.baseUrl}/callback`,
        mode: 'demo',
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
    request: Record<string, boolean | undefined>
  ): object {
    const requestedClaims = Object.keys(request).filter((k) => request[k] === true);

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
      name: 'EUDI Verification Request',
      purpose: 'Identity verification',
      input_descriptors: inputDescriptors,
    };
  }

  private getClaimDisplayName(claim: string): string {
    const names: Record<string, string> = {
      age_over_18: 'Age over 18',
      age_over_21: 'Age over 21',
      nationality: 'Nationality',
      given_name: 'Given name',
      family_name: 'Family name',
      birth_date: 'Birth date',
    };
    return names[claim] ?? claim;
  }

  private generateDemoClaims(requestedClaims: string[]): VerifiedClaims {
    const claims: VerifiedClaims = {};
    const defaults = this.config.demoClaims;

    for (const claim of requestedClaims) {
      if (claim === 'age_over_18' && defaults.age_over_18 !== undefined) {
        claims.age_over_18 = defaults.age_over_18;
      } else if (claim === 'age_over_21' && defaults.age_over_21 !== undefined) {
        claims.age_over_21 = defaults.age_over_21;
      } else if (claim === 'nationality' && defaults.nationality) {
        claims.nationality = defaults.nationality;
      } else if (claim === 'given_name' && defaults.given_name) {
        claims.given_name = defaults.given_name;
      } else if (claim === 'family_name' && defaults.family_name) {
        claims.family_name = defaults.family_name;
      } else if (claim === 'birth_date' && defaults.birth_date) {
        claims.birth_date = defaults.birth_date;
      }
    }

    return claims;
  }

  private generateNonce(): string {
    // 16 bytes = 32 hex chars; keeps QR URL under 270 byte limit
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

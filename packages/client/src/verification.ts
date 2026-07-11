/**
 * @eudi-verify/client - Verification State Machine
 *
 * Manages the verification flow with state transitions and polling.
 */

import type { VerificationRequest, VerifiedClaims, Session } from "./types.js";
import { isTerminalStatus } from "./types.js";
import { createApiClient, type EudiApiClient, type EudiMode } from "./api.js";
import { createPoller, type PollingConfig } from "./polling.js";
import { generateQRDataUrl, type QRCodeOptions } from "./qr.js";

/**
 * All possible verification states.
 */
export type VerificationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "showQR"; qrDataUrl: string; qrUrl: string; sessionId: string }
  | { status: "waitingForWallet"; sessionId: string }
  | { status: "verified"; token: string; claims: VerifiedClaims }
  | { status: "rejected"; error?: string }
  | { status: "expired" }
  | { status: "error"; error: string };

/**
 * State change callback.
 */
export type StateCallback = (state: VerificationState) => void;

/**
 * Configuration for the verification flow.
 */
export interface VerificationConfig {
  /** Base URL of the EUDI Verifier API */
  apiUrl: string;
  /** Polling configuration */
  polling?: PollingConfig;
  /** QR code options */
  qr?: QRCodeOptions;
  /** Optional fetch implementation (for testing) */
  fetch?: typeof fetch;
  /** Called when `X-Eudi-Mode` is read from POST /sessions (if present) */
  onEudiMode?: (mode: EudiMode | null) => void;
}

/**
 * Verification instance for managing a verification flow.
 */
export interface Verification {
  /** Current state (read-only) */
  readonly state: VerificationState;
  /** Start a new verification flow */
  start(request: VerificationRequest): Promise<void>;
  /** Cancel the current verification */
  cancel(): Promise<void>;
  /** Clean up resources */
  destroy(): void;
  /** Subscribe to state changes. Returns unsubscribe function. */
  subscribe(callback: StateCallback): () => void;
}

/**
 * Create a new verification instance.
 *
 * @example
 * ```ts
 * const verification = createVerification({ apiUrl: 'https://api.example.com' });
 *
 * verification.subscribe((state) => {
 *   console.log('State:', state.status);
 *   if (state.status === 'verified') {
 *     console.log('Token:', state.token);
 *   }
 * });
 *
 * await verification.start({ age_over_18: true });
 * ```
 */
export function createVerification(config: VerificationConfig): Verification {
  const { apiUrl, polling, qr, fetch: fetchFn, onEudiMode } = config;

  const client: EudiApiClient = createApiClient({
    baseUrl: apiUrl,
    fetch: fetchFn,
  });
  const subscribers = new Set<StateCallback>();

  let currentState: VerificationState = { status: "idle" };
  let currentSessionId: string | null = null;
  let poller: ReturnType<typeof createPoller> | null = null;

  function setState(newState: VerificationState): void {
    currentState = newState;
    for (const callback of subscribers) {
      try {
        callback(newState);
      } catch {
        // Ignore subscriber errors
      }
    }
  }

  function mapSessionToState(session: Session): VerificationState {
    switch (session.status) {
      case "pending":
        if (session.qrUrl) {
          return {
            status: "showQR",
            qrDataUrl: generateQRDataUrl(session.qrUrl, qr),
            qrUrl: session.qrUrl,
            sessionId: session.id,
          };
        }
        return { status: "loading" };

      case "waiting_for_wallet":
        return { status: "waitingForWallet", sessionId: session.id };

      case "verified":
        return {
          status: "verified",
          token: session.token!,
          claims: session.claims!,
        };

      case "rejected":
        return { status: "rejected", error: session.error };

      case "expired":
        return { status: "expired" };

      case "cancelled":
        return { status: "rejected", error: "Request was declined" };

      case "error":
        return {
          status: "error",
          error: session.error ?? "Verification failed",
        };

      default:
        return { status: "error", error: "Unknown session status" };
    }
  }

  async function pollSession(): Promise<boolean> {
    const sessionId = currentSessionId;
    if (!sessionId) return true;

    try {
      const session = await client.getSession(sessionId);
      if (currentSessionId !== sessionId) return true;

      const newState = mapSessionToState(session);

      if (
        newState.status !== currentState.status ||
        (newState.status === "showQR" &&
          currentState.status === "showQR" &&
          newState.sessionId !== currentState.sessionId)
      ) {
        setState(newState);
      }

      if (isTerminalStatus(session.status)) {
        return true;
      }

      return false;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setState({ status: "error", error: errorMessage });
      return true;
    }
  }

  function stopPolling(): void {
    if (poller) {
      poller.stop();
      poller = null;
    }
  }

  function startPolling(): void {
    stopPolling();
    poller = createPoller(pollSession, polling);
    poller.start();
  }

  return {
    get state(): VerificationState {
      return currentState;
    },

    async start(request: VerificationRequest): Promise<void> {
      stopPolling();
      currentSessionId = null;
      setState({ status: "loading" });

      try {
        const { session, eudiMode } = await client.createSession(request);
        onEudiMode?.(eudiMode);
        currentSessionId = session.id;

        const newState = mapSessionToState(session);
        setState(newState);

        if (!isTerminalStatus(session.status)) {
          startPolling();
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setState({ status: "error", error: errorMessage });
      }
    },

    async cancel(): Promise<void> {
      const sessionId = currentSessionId;
      if (!sessionId) return;

      stopPolling();
      currentSessionId = null;

      try {
        await client.cancelSession(sessionId);
        setState({ status: "idle" });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to cancel";
        setState({ status: "error", error: errorMessage });
      }
    },

    destroy(): void {
      stopPolling();
      currentSessionId = null;
      subscribers.clear();
    },

    subscribe(callback: StateCallback): () => void {
      subscribers.add(callback);
      try {
        callback(currentState);
      } catch {
        // Ignore subscriber errors
      }
      return () => {
        subscribers.delete(callback);
      };
    },
  };
}

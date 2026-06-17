/**
 * @eudi-verify/embed - Custom Element
 *
 * <eudi-verify> vanilla Custom Element for EUDI Wallet verification.
 * Uses open Shadow DOM with CSS custom property theming.
 */

import {
  createVerification,
  type Verification,
  type VerificationState,
  type VerificationRequest,
} from "@eudi-verify/client";
import { createStyles } from "./styles.js";
import { renderWidget, updateWidgetState } from "./render.js";
import {
  announce,
  clearAnnouncement,
  STATE_MESSAGES,
  getAnnouncementPriority,
} from "./a11y.js";

/**
 * Events dispatched by EudiVerifyElement.
 */
export interface EudiVerifyEventMap {
  verified: CustomEvent<{ token: string; claims: Record<string, unknown> }>;
  rejected: CustomEvent<{ error?: string }>;
  expired: CustomEvent<Record<string, never>>;
  error: CustomEvent<{ error: string }>;
  "state-change": CustomEvent<{ state: VerificationState }>;
}

/**
 * Observed attributes for the custom element.
 */
const OBSERVED_ATTRIBUTES = ["api-url", "request", "auto-start"] as const;
type ObservedAttribute = (typeof OBSERVED_ATTRIBUTES)[number];

/**
 * <eudi-verify> Custom Element
 *
 * @example
 * ```html
 * <eudi-verify
 *   api-url="/api/eudi"
 *   request='{"age_over_18":true}'
 * ></eudi-verify>
 * ```
 *
 * @fires verified - Verification succeeded
 * @fires rejected - User rejected in wallet
 * @fires expired - Session expired
 * @fires error - Error occurred
 * @fires state-change - Any state change
 */
export class EudiVerifyElement extends HTMLElement {
  static get observedAttributes(): readonly string[] {
    return OBSERVED_ATTRIBUTES;
  }

  #shadow: ShadowRoot;
  #verification: Verification | null = null;
  #unsubscribe: (() => void) | null = null;
  #container: HTMLElement | null = null;
  #liveRegion: HTMLElement | null = null;
  #lastStatus: VerificationState["status"] | null = null;
  #isDemo: boolean | null = null;
  #demoBanner: HTMLElement | null = null;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: "open" });
  }

  /**
   * Get the API URL attribute.
   */
  get apiUrl(): string {
    return this.getAttribute("api-url") ?? "";
  }

  /**
   * Set the API URL attribute.
   */
  set apiUrl(value: string) {
    this.setAttribute("api-url", value);
  }

  /**
   * Get the request attribute (JSON string).
   */
  get request(): string {
    return this.getAttribute("request") ?? "";
  }

  /**
   * Set the request attribute (JSON string).
   */
  set request(value: string) {
    this.setAttribute("request", value);
  }

  /**
   * Check if auto-start is enabled.
   */
  get autoStart(): boolean {
    return this.hasAttribute("auto-start");
  }

  /**
   * Set auto-start attribute.
   */
  set autoStart(value: boolean) {
    if (value) {
      this.setAttribute("auto-start", "");
    } else {
      this.removeAttribute("auto-start");
    }
  }

  /**
   * Current verification state (read-only).
   */
  get state(): VerificationState | null {
    return this.#verification?.state ?? null;
  }

  connectedCallback(): void {
    this.#render();
    this.#setupEventListeners();

    if (this.autoStart && this.apiUrl && this.request) {
      this.start();
    }
  }

  disconnectedCallback(): void {
    this.#cleanup();
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    if (name === "api-url" && this.#verification) {
      this.#cleanup();
    }
  }

  /**
   * Start the verification flow.
   */
  start(): void {
    if (!this.apiUrl) {
      console.error("[eudi-verify] api-url attribute is required");
      return;
    }

    let requestObj: VerificationRequest;
    try {
      requestObj = this.request ? JSON.parse(this.request) : {};
    } catch {
      console.error("[eudi-verify] Invalid JSON in request attribute");
      this.#dispatchError("Invalid verification request");
      return;
    }

    this.#ensureVerification();
    this.#verification!.start(requestObj);
  }

  /**
   * Cancel the current verification.
   */
  cancel(): void {
    this.#verification?.cancel();
  }

  /**
   * Reset to idle state.
   */
  reset(): void {
    this.#cleanup();
    this.#updateState({ status: "idle" });
  }

  #render(): void {
    this.#shadow.innerHTML = `
      <style>${createStyles()}</style>
      ${renderWidget()}
    `;

    this.#container = this.#shadow.querySelector(".eudi-widget");
    this.#liveRegion = this.#shadow.querySelector("[aria-live]");
    this.#demoBanner = this.#shadow.querySelector(".eudi-demo-banner");
  }

  #setupEventListeners(): void {
    this.#shadow.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      const button = target.closest<HTMLElement>("[data-action]");
      if (!button) return;

      const action = button.dataset.action;
      switch (action) {
        case "start":
          this.start();
          break;
        case "cancel":
          this.cancel();
          break;
        case "reset":
          this.reset();
          this.start();
          break;
      }
    });
  }

  #ensureVerification(): void {
    if (this.#verification) return;

    this.#verification = createVerification({
      apiUrl: this.apiUrl,
    });

    this.#unsubscribe = this.#verification.subscribe((state) => {
      this.#handleStateChange(state);
    });

    // Detect demo mode on first API interaction
    this.#detectDemoMode();
  }

  async #detectDemoMode(): Promise<void> {
    if (this.#isDemo !== null || !this.apiUrl) return;

    try {
      const response = await fetch(`${this.apiUrl}/sessions`, {
        method: "HEAD",
      });
      const mode = response.headers.get("X-Eudi-Mode");
      this.#isDemo = mode === "demo";
      this.#updateDemoBanner();
    } catch {
      // If detection fails, don't show banner (fail safely)
      this.#isDemo = false;
    }
  }

  #updateDemoBanner(): void {
    if (!this.#demoBanner) return;

    if (this.#isDemo === true) {
      this.#demoBanner.removeAttribute("hidden");
    } else {
      this.#demoBanner.setAttribute("hidden", "");
    }
  }

  #handleStateChange(state: VerificationState): void {
    this.#updateState(state);
    this.#dispatchStateChange(state);

    switch (state.status) {
      case "verified":
        if ("token" in state && "claims" in state) {
          this.#dispatchVerified(state.token, state.claims);
        }
        break;
      case "rejected":
        this.#dispatchRejected("error" in state ? state.error : undefined);
        break;
      case "expired":
        this.#dispatchExpired();
        break;
      case "error":
        if ("error" in state) {
          this.#dispatchError(state.error);
        }
        break;
    }
  }

  #updateState(state: VerificationState): void {
    if (!this.#container) return;

    updateWidgetState(this.#container, state);

    if (this.#liveRegion && state.status !== this.#lastStatus) {
      const message = STATE_MESSAGES[state.status];
      if (message) {
        const priority = getAnnouncementPriority(state.status);
        announce(this.#liveRegion, message, priority);
      }
    }

    this.#lastStatus = state.status;

    this.#manageFocus(state);
  }

  #manageFocus(state: VerificationState): void {
    if (!this.#container) return;

    switch (state.status) {
      case "showQR": {
        const cancelBtn = this.#container.querySelector<HTMLElement>(
          "#eudi-state-showQR .eudi-cancel-btn",
        );
        cancelBtn?.focus();
        break;
      }
      case "verified":
      case "rejected":
      case "expired":
      case "error": {
        const retryBtn = this.#container.querySelector<HTMLElement>(
          `#eudi-state-${state.status} .eudi-retry-btn`,
        );
        retryBtn?.focus();
        break;
      }
    }
  }

  #dispatchVerified(token: string, claims: Record<string, unknown>): void {
    this.dispatchEvent(
      new CustomEvent("verified", {
        bubbles: true,
        composed: true,
        detail: { token, claims },
      }),
    );
  }

  #dispatchRejected(error?: string): void {
    this.dispatchEvent(
      new CustomEvent("rejected", {
        bubbles: true,
        composed: true,
        detail: { error },
      }),
    );
  }

  #dispatchExpired(): void {
    this.dispatchEvent(
      new CustomEvent("expired", {
        bubbles: true,
        composed: true,
        detail: {},
      }),
    );
  }

  #dispatchError(error: string): void {
    this.dispatchEvent(
      new CustomEvent("error", {
        bubbles: true,
        composed: true,
        detail: { error },
      }),
    );
  }

  #dispatchStateChange(state: VerificationState): void {
    this.dispatchEvent(
      new CustomEvent("state-change", {
        bubbles: true,
        composed: true,
        detail: { state },
      }),
    );
  }

  #cleanup(): void {
    if (this.#unsubscribe) {
      this.#unsubscribe();
      this.#unsubscribe = null;
    }

    if (this.#verification) {
      this.#verification.destroy();
      this.#verification = null;
    }

    if (this.#liveRegion) {
      clearAnnouncement(this.#liveRegion);
    }

    this.#lastStatus = null;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "eudi-verify": EudiVerifyElement;
  }

  interface HTMLElementEventMap extends EudiVerifyEventMap {}
}

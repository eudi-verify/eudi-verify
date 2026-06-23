import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderWidget, updateWidgetState, getStateId } from "./render.js";
import type { VerificationState } from "@eudi-verify/client";

describe("render", () => {
  describe("getStateId", () => {
    it("returns prefixed id for each status", () => {
      expect(getStateId("idle")).toBe("eudi-state-idle");
      expect(getStateId("loading")).toBe("eudi-state-loading");
      expect(getStateId("showQR")).toBe("eudi-state-showQR");
      expect(getStateId("waitingForWallet")).toBe(
        "eudi-state-waitingForWallet",
      );
      expect(getStateId("verified")).toBe("eudi-state-verified");
      expect(getStateId("rejected")).toBe("eudi-state-rejected");
      expect(getStateId("expired")).toBe("eudi-state-expired");
      expect(getStateId("error")).toBe("eudi-state-error");
    });
  });

  describe("renderWidget", () => {
    it("returns HTML string", () => {
      const html = renderWidget();
      expect(typeof html).toBe("string");
      expect(html.length).toBeGreaterThan(0);
    });

    it("includes widget container with role and label", () => {
      const html = renderWidget();
      expect(html).toContain('class="eudi-widget"');
      expect(html).toContain('role="region"');
      expect(html).toContain('aria-label="Identity verification"');
    });

    it("includes aria-live region", () => {
      const html = renderWidget();
      expect(html).toContain('aria-live="polite"');
      expect(html).toContain('aria-atomic="true"');
    });

    it("includes all state containers", () => {
      const html = renderWidget();
      expect(html).toContain('id="eudi-state-idle"');
      expect(html).toContain('id="eudi-state-loading"');
      expect(html).toContain('id="eudi-state-showQR"');
      expect(html).toContain('id="eudi-state-waitingForWallet"');
      expect(html).toContain('id="eudi-state-verified"');
      expect(html).toContain('id="eudi-state-rejected"');
      expect(html).toContain('id="eudi-state-expired"');
      expect(html).toContain('id="eudi-state-error"');
    });

    it("includes start button", () => {
      const html = renderWidget();
      expect(html).toContain("Verify with EU Wallet");
      expect(html).toContain('data-action="start"');
    });

    it("includes cancel buttons", () => {
      const html = renderWidget();
      expect(html).toContain('data-action="cancel"');
      expect(html).toContain("Cancel");
    });

    it("includes retry buttons", () => {
      const html = renderWidget();
      expect(html).toContain('data-action="reset"');
      expect(html).toContain("Try again");
    });

    it("includes QR code image element", () => {
      const html = renderWidget();
      expect(html).toContain('class="eudi-qr-img"');
      expect(html).toContain('alt="Scan with EUDI Wallet"');
    });

    it("includes success checkmark", () => {
      const html = renderWidget();
      expect(html).toContain('class="eudi-success-icon"');
    });

    it("includes error icons", () => {
      const html = renderWidget();
      expect(html).toContain('class="eudi-error-icon"');
    });

    it("idle state is active by default", () => {
      const html = renderWidget();
      expect(html).toContain(
        'id="eudi-state-idle" class="eudi-state" data-active',
      );
    });
  });

  describe("updateWidgetState", () => {
    let container: HTMLElement;

    beforeEach(() => {
      container = document.createElement("div");
      container.innerHTML = renderWidget();
      document.body.appendChild(container);
    });

    afterEach(() => {
      container.remove();
    });

    it("activates idle state", () => {
      const state: VerificationState = { status: "idle" };
      updateWidgetState(container, state);

      const idleEl = container.querySelector("#eudi-state-idle");
      expect(idleEl?.hasAttribute("data-active")).toBe(true);

      const loadingEl = container.querySelector("#eudi-state-loading");
      expect(loadingEl?.hasAttribute("data-active")).toBe(false);
    });

    it("activates loading state", () => {
      const state: VerificationState = { status: "loading" };
      updateWidgetState(container, state);

      const loadingEl = container.querySelector("#eudi-state-loading");
      expect(loadingEl?.hasAttribute("data-active")).toBe(true);

      const idleEl = container.querySelector("#eudi-state-idle");
      expect(idleEl?.hasAttribute("data-active")).toBe(false);
    });

    it("activates showQR state and sets image src", () => {
      const state: VerificationState = {
        status: "showQR",
        qrDataUrl: "data:image/png;base64,test",
        qrUrl: "openid4vp://...",
        sessionId: "test-session",
      };
      updateWidgetState(container, state);

      const qrEl = container.querySelector("#eudi-state-showQR");
      expect(qrEl?.hasAttribute("data-active")).toBe(true);

      const img = container.querySelector<HTMLImageElement>(".eudi-qr-img");
      expect(img?.src).toBe("data:image/png;base64,test");
    });

    it("activates waitingForWallet state", () => {
      const state: VerificationState = {
        status: "waitingForWallet",
        sessionId: "test-session",
      };
      updateWidgetState(container, state);

      const waitingEl = container.querySelector("#eudi-state-waitingForWallet");
      expect(waitingEl?.hasAttribute("data-active")).toBe(true);
    });

    it("activates verified state", () => {
      const state: VerificationState = {
        status: "verified",
        token: "test-token",
        claims: { age_over_18: true },
      };
      updateWidgetState(container, state);

      const verifiedEl = container.querySelector("#eudi-state-verified");
      expect(verifiedEl?.hasAttribute("data-active")).toBe(true);
    });

    it("activates rejected state and shows error", () => {
      const state: VerificationState = {
        status: "rejected",
        error: "User declined",
      };
      updateWidgetState(container, state);

      const rejectedEl = container.querySelector("#eudi-state-rejected");
      expect(rejectedEl?.hasAttribute("data-active")).toBe(true);

      const detail = container.querySelector("#eudi-rejected-detail");
      expect(detail?.textContent).toBe("User declined");

      const retryBtn = container.querySelector<HTMLButtonElement>(
        "#eudi-state-rejected .eudi-retry-btn",
      );
      expect(retryBtn?.getAttribute("aria-describedby")).toBe(
        "eudi-rejected-detail",
      );
    });

    it("activates expired state", () => {
      const state: VerificationState = { status: "expired" };
      updateWidgetState(container, state);

      const expiredEl = container.querySelector("#eudi-state-expired");
      expect(expiredEl?.hasAttribute("data-active")).toBe(true);
    });

    it("activates error state and shows message", () => {
      const state: VerificationState = {
        status: "error",
        error: "Network error",
      };
      updateWidgetState(container, state);

      const errorEl = container.querySelector("#eudi-state-error");
      expect(errorEl?.hasAttribute("data-active")).toBe(true);

      const detail = container.querySelector("#eudi-error-state-detail");
      expect(detail?.textContent).toBe("Network error");

      const retryBtn = container.querySelector<HTMLButtonElement>(
        "#eudi-state-error .eudi-retry-btn",
      );
      expect(retryBtn?.getAttribute("aria-describedby")).toBe(
        "eudi-error-state-detail",
      );
    });

    it("only one state is active at a time", () => {
      const states: VerificationState[] = [
        { status: "idle" },
        { status: "loading" },
        {
          status: "showQR",
          qrDataUrl: "test",
          qrUrl: "test",
          sessionId: "test",
        },
        { status: "waitingForWallet", sessionId: "test" },
        { status: "verified", token: "test", claims: {} },
        { status: "rejected" },
        { status: "expired" },
        { status: "error", error: "test" },
      ];

      for (const state of states) {
        updateWidgetState(container, state);

        const activeStates = container.querySelectorAll(
          ".eudi-state[data-active]",
        );
        expect(activeStates).toHaveLength(1);
        expect(activeStates[0]?.id).toBe(getStateId(state.status));
      }
    });
  });
});

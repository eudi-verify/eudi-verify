import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  beforeAll,
} from "vitest";
import { EudiVerifyElement } from "./element.js";
import type { Session } from "@eudi-verify/client";

const TAG_NAME = "eudi-verify-test";

const mockSession: Session = {
  id: "session-123",
  status: "pending",
  qrUrl: "openid4vp://verify?request_uri=...",
  createdAt: "2024-01-01T00:00:00Z",
  expiresAt: "2024-01-01T00:05:00Z",
};

function createMockFetch() {
  return vi.fn(async () => ({
    ok: true,
    status: 201,
    json: async () => mockSession,
    headers: new Headers(),
  })) as unknown as typeof fetch;
}

beforeAll(() => {
  if (!customElements.get(TAG_NAME)) {
    customElements.define(TAG_NAME, EudiVerifyElement);
  }
});

describe("EudiVerifyElement", () => {
  let element: EudiVerifyElement;

  beforeEach(() => {
    element = document.createElement(TAG_NAME) as EudiVerifyElement;
  });

  afterEach(() => {
    if (element?.isConnected) {
      element.remove();
    }
  });

  describe("observedAttributes", () => {
    it("observes api-url, request, auto-start", () => {
      expect(EudiVerifyElement.observedAttributes).toContain("api-url");
      expect(EudiVerifyElement.observedAttributes).toContain("request");
      expect(EudiVerifyElement.observedAttributes).toContain("auto-start");
    });
  });

  describe("properties", () => {
    it("apiUrl property reflects api-url attribute", () => {
      element.setAttribute("api-url", "https://api.example.com");
      expect(element.apiUrl).toBe("https://api.example.com");

      element.apiUrl = "https://api2.example.com";
      expect(element.getAttribute("api-url")).toBe("https://api2.example.com");
    });

    it("request property reflects request attribute", () => {
      element.setAttribute("request", '{"age_over_18":true}');
      expect(element.request).toBe('{"age_over_18":true}');

      element.request = '{"age_over_21":true}';
      expect(element.getAttribute("request")).toBe('{"age_over_21":true}');
    });

    it("autoStart property reflects auto-start attribute", () => {
      expect(element.autoStart).toBe(false);

      element.autoStart = true;
      expect(element.hasAttribute("auto-start")).toBe(true);
      expect(element.autoStart).toBe(true);

      element.autoStart = false;
      expect(element.hasAttribute("auto-start")).toBe(false);
    });

    it("state returns null before start", () => {
      document.body.appendChild(element);
      expect(element.state).toBeNull();
    });
  });

  describe("shadow DOM", () => {
    it("creates open shadow root on connect", () => {
      document.body.appendChild(element);
      expect(element.shadowRoot).not.toBeNull();
      expect(element.shadowRoot?.mode).toBe("open");
    });

    it("renders widget structure", () => {
      document.body.appendChild(element);
      const widget = element.shadowRoot?.querySelector(".eudi-widget");
      expect(widget).not.toBeNull();
      expect(widget?.getAttribute("role")).toBe("region");
      expect(widget?.getAttribute("aria-label")).toBe("Identity verification");
    });

    it("renders start button", () => {
      document.body.appendChild(element);
      const button = element.shadowRoot?.querySelector(".eudi-start-btn");
      expect(button).not.toBeNull();
      expect(button?.textContent).toContain("Verify with EU Wallet");
    });

    it("renders aria-live region", () => {
      document.body.appendChild(element);
      const liveRegion = element.shadowRoot?.querySelector("[aria-live]");
      expect(liveRegion).not.toBeNull();
    });

    it("renders all state containers", () => {
      document.body.appendChild(element);
      const states = [
        "idle",
        "loading",
        "showQR",
        "waitingForWallet",
        "verified",
        "rejected",
        "expired",
        "error",
      ];
      for (const state of states) {
        const container = element.shadowRoot?.querySelector(
          `#eudi-state-${state}`,
        );
        expect(container).not.toBeNull();
      }
    });
  });

  describe("methods", () => {
    beforeEach(() => {
      document.body.appendChild(element);
    });

    it("start() logs error without api-url", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      element.start();
      expect(consoleSpy).toHaveBeenCalledWith(
        "[eudi-verify] api-url attribute is required",
      );
      consoleSpy.mockRestore();
    });

    it("start() dispatches error on invalid JSON request", () => {
      element.apiUrl = "https://api.example.com";
      element.request = "invalid json";

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const errorHandler = vi.fn();
      element.addEventListener("error", errorHandler);

      element.start();

      expect(consoleSpy).toHaveBeenCalledWith(
        "[eudi-verify] Invalid JSON in request attribute",
      );
      expect(errorHandler).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("reset() returns to idle state", () => {
      element.apiUrl = "https://api.example.com";
      element.reset();

      const idleState = element.shadowRoot?.querySelector("#eudi-state-idle");
      expect(idleState?.hasAttribute("data-active")).toBe(true);
    });

    it("cancel() can be called without active verification", () => {
      expect(() => element.cancel()).not.toThrow();
    });
  });

  describe("events", () => {
    beforeEach(() => {
      vi.stubGlobal("fetch", createMockFetch());
      document.body.appendChild(element);
    });

    afterEach(() => {
      element.reset();
      vi.unstubAllGlobals();
    });

    it("dispatches state-change event on start", async () => {
      element.apiUrl = "https://api.example.com";
      element.request = '{"age_over_18":true}';

      const stateChangeHandler = vi.fn();
      element.addEventListener("state-change", stateChangeHandler);

      element.start();

      await vi.waitFor(() => {
        expect(stateChangeHandler).toHaveBeenCalled();
      });
    });

    it("click on start button triggers start()", () => {
      element.apiUrl = "https://api.example.com";
      element.request = '{"age_over_18":true}';

      const startButton = element.shadowRoot?.querySelector(
        ".eudi-start-btn",
      ) as HTMLButtonElement;
      expect(startButton).not.toBeNull();

      const stateChangeHandler = vi.fn();
      element.addEventListener("state-change", stateChangeHandler);

      startButton?.click();

      expect(stateChangeHandler).toHaveBeenCalled();
    });

    it("hides demo banner when verification is cancelled", async () => {
      const cancelledSession: Session = {
        ...mockSession,
        status: "cancelled",
      };

      const mockFetch = vi.fn(
        async (input: string | URL | Request, init?: RequestInit) => {
          const url =
            typeof input === "string"
              ? input
              : input instanceof URL
                ? input.href
                : input.url;
          const method =
            init?.method ??
            (input instanceof Request ? input.method : "GET");

          if (method === "HEAD") {
            return {
              ok: true,
              status: 200,
              headers: new Headers({ "X-Eudi-Mode": "demo" }),
            } as Response;
          }

          if (url.endsWith("/cancel")) {
            return {
              ok: true,
              status: 200,
              json: async () => cancelledSession,
              headers: new Headers(),
            } as Response;
          }

          if (url.includes("/sessions/")) {
            return {
              ok: true,
              status: 200,
              json: async () => mockSession,
              headers: new Headers(),
            } as Response;
          }

          return {
            ok: true,
            status: 201,
            json: async () => mockSession,
            headers: new Headers(),
          } as Response;
        },
      );

      vi.stubGlobal("fetch", mockFetch);
      document.body.appendChild(element);
      element.apiUrl = "https://api.example.com";
      element.request = '{"age_over_18":true}';

      const banner = () =>
        element.shadowRoot?.querySelector(".eudi-demo-banner");

      element.start();

      await vi.waitFor(() => {
        expect(banner()?.hasAttribute("hidden")).toBe(false);
      });

      element.cancel();

      await vi.waitFor(() => {
        expect(element.state?.status).toBe("idle");
        expect(banner()?.hasAttribute("hidden")).toBe(true);
      });
    });
  });

  describe("accessibility", () => {
    beforeEach(() => {
      document.body.appendChild(element);
    });

    it("buttons have correct type attribute", () => {
      const buttons = element.shadowRoot?.querySelectorAll("button");
      buttons?.forEach((button) => {
        expect(button.getAttribute("type")).toBe("button");
      });
    });

    it("images have alt text", () => {
      const images = element.shadowRoot?.querySelectorAll("img");
      images?.forEach((img) => {
        expect(img.hasAttribute("alt")).toBe(true);
      });
    });

    it("icons are hidden from screen readers", () => {
      const svgs = element.shadowRoot?.querySelectorAll("svg");
      svgs?.forEach((svg) => {
        expect(svg.getAttribute("aria-hidden")).toBe("true");
      });
    });

    it("sets aria-busy during loading", async () => {
      vi.stubGlobal("fetch", createMockFetch());
      element.apiUrl = "https://api.example.com";
      element.request = '{"age_over_18":true}';

      element.start();

      const widget = element.shadowRoot?.querySelector(".eudi-widget");
      expect(widget?.getAttribute("aria-busy")).toBe("true");
      vi.unstubAllGlobals();
    });

    it("clears aria-busy after reset", async () => {
      vi.stubGlobal("fetch", createMockFetch());
      element.apiUrl = "https://api.example.com";
      element.request = '{"age_over_18":true}';

      element.start();
      element.reset();

      const widget = element.shadowRoot?.querySelector(".eudi-widget");
      expect(widget?.hasAttribute("aria-busy")).toBe(false);
      vi.unstubAllGlobals();
    });
  });

  describe("theming", () => {
    it("applies CSS custom property defaults", () => {
      document.body.appendChild(element);
      const styles = element.shadowRoot?.querySelector("style");
      const styleContent = styles?.textContent ?? "";

      expect(styleContent).toContain("--eudi-primary");
      expect(styleContent).toContain("--eudi-text");
      expect(styleContent).toContain("--eudi-background");
      expect(styleContent).toContain("--eudi-border-radius");
      expect(styleContent).toContain("--eudi-font-family");
      expect(styleContent).toContain("--eudi-error");
    });

    it("includes reduced motion styles", () => {
      document.body.appendChild(element);
      const styles = element.shadowRoot?.querySelector("style");
      const styleContent = styles?.textContent ?? "";

      expect(styleContent).toContain("prefers-reduced-motion");
    });
  });
});

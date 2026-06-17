import { describe, it, expect } from "vitest";
import { createStyles, CSS_VARIABLES } from "./styles.js";

describe("styles", () => {
  describe("CSS_VARIABLES", () => {
    it("defines all 6 theme tokens", () => {
      expect(Object.keys(CSS_VARIABLES)).toHaveLength(6);
      expect(CSS_VARIABLES["--eudi-primary"]).toBe("#003399");
      expect(CSS_VARIABLES["--eudi-text"]).toBe("#1a1a1a");
      expect(CSS_VARIABLES["--eudi-background"]).toBe("#ffffff");
      expect(CSS_VARIABLES["--eudi-border-radius"]).toBe("8px");
      expect(CSS_VARIABLES["--eudi-font-family"]).toBe("system-ui, sans-serif");
      expect(CSS_VARIABLES["--eudi-error"]).toBe("#d32f2f");
    });
  });

  describe("createStyles", () => {
    it("returns valid CSS string", () => {
      const css = createStyles();
      expect(typeof css).toBe("string");
      expect(css.length).toBeGreaterThan(0);
    });

    it("includes :host selector", () => {
      const css = createStyles();
      expect(css).toContain(":host");
    });

    it("includes :host([hidden]) rule", () => {
      const css = createStyles();
      expect(css).toContain(":host([hidden])");
      expect(css).toContain("display: none");
    });

    it("includes fallback values for all CSS variables", () => {
      const css = createStyles();
      for (const variable of Object.keys(CSS_VARIABLES)) {
        expect(css).toContain(`var(${variable},`);
      }
    });

    it("includes widget styles", () => {
      const css = createStyles();
      expect(css).toContain(".eudi-widget");
      expect(css).toContain(".eudi-state");
      expect(css).toContain(".eudi-start-btn");
    });

    it("includes loading spinner animation", () => {
      const css = createStyles();
      expect(css).toContain(".eudi-spinner");
      expect(css).toContain("@keyframes eudi-spin");
    });

    it("includes QR code styles", () => {
      const css = createStyles();
      expect(css).toContain(".eudi-qr");
      expect(css).toContain(".eudi-qr-img");
    });

    it("includes success state styles", () => {
      const css = createStyles();
      expect(css).toContain(".eudi-success");
      expect(css).toContain(".eudi-success-icon");
    });

    it("includes error state styles", () => {
      const css = createStyles();
      expect(css).toContain(".eudi-error");
      expect(css).toContain(".eudi-error-icon");
      expect(css).toContain(".eudi-retry-btn");
    });

    it("includes focus-visible styles", () => {
      const css = createStyles();
      expect(css).toContain(":focus-visible");
    });

    it("includes screen reader only utility", () => {
      const css = createStyles();
      expect(css).toContain(".eudi-sr-only");
    });

    it("includes prefers-reduced-motion media query", () => {
      const css = createStyles();
      expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    });
  });
});

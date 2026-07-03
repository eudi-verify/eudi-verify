import { createRequire } from "node:module";
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import {
  VERSION,
  EudiVerifyElement,
  CSS_VARIABLES,
  createStyles,
  STATE_MESSAGES,
} from "./index.js";

const require = createRequire(import.meta.url);
const packageJson = require("../package.json") as { version: string };

describe("@eudi-verify/embed", () => {
  it("exports a VERSION constant", () => {
    expect(VERSION).toBe(packageJson.version);
  });

  it("exports EudiVerifyElement class", () => {
    expect(EudiVerifyElement).toBeDefined();
    expect(typeof EudiVerifyElement).toBe("function");
  });

  it("exports CSS_VARIABLES", () => {
    expect(CSS_VARIABLES).toBeDefined();
    expect(CSS_VARIABLES["--eudi-primary"]).toBe("#003399");
    expect(CSS_VARIABLES["--eudi-text"]).toBe("#1a1a1a");
    expect(CSS_VARIABLES["--eudi-background"]).toBe("#ffffff");
    expect(CSS_VARIABLES["--eudi-border-radius"]).toBe("8px");
    expect(CSS_VARIABLES["--eudi-font-family"]).toBe("system-ui, sans-serif");
    expect(CSS_VARIABLES["--eudi-error"]).toBe("#d32f2f");
  });

  it("exports createStyles function", () => {
    expect(typeof createStyles).toBe("function");
    const styles = createStyles();
    expect(styles).toContain(":host");
    expect(styles).toContain("--eudi-primary");
  });

  it("exports STATE_MESSAGES", () => {
    expect(STATE_MESSAGES).toBeDefined();
    expect(STATE_MESSAGES.idle).toBe("");
    expect(STATE_MESSAGES.loading).toContain("Loading");
    expect(STATE_MESSAGES.verified).toContain("verified");
  });

  describe("auto-registration", () => {
    it("registers eudi-verify element", () => {
      expect(customElements.get("eudi-verify")).toBe(EudiVerifyElement);
    });
  });
});

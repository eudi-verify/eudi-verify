import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  appendVerifierAuditLi,
  clearVerifierAudit,
  pushVerifierAudit,
  readVerifierAudit,
  restoreVerifierAudit,
} from "./demo-audit-log.js";

beforeEach(() => {
  sessionStorage.clear();
  clearVerifierAudit();
});

describe("verifier audit log", () => {
  it("accumulates entries", () => {
    pushVerifierAudit("POST /sessions");
    pushVerifierAudit("verified", true);
    const entries = readVerifierAudit();
    expect(entries).toHaveLength(2);
    expect(entries[0].message).toBe("POST /sessions");
    expect(entries[1].html).toBe(true);
  });

  it("clears on new verification", () => {
    pushVerifierAudit("old");
    clearVerifierAudit();
    expect(readVerifierAudit()).toEqual([]);
  });

  it("appends to DOM and storage", () => {
    const ol = document.createElement("ol");
    appendVerifierAuditLi(ol, null, "checkout");
    expect(ol.children).toHaveLength(1);
    expect(ol.textContent).toContain("checkout");
    expect(readVerifierAudit()[0].message).toBe("checkout");
  });

  it("restores persisted log on success page", () => {
    pushVerifierAudit("from verify tab");
    const ol = document.createElement("ol");
    const card = document.createElement("div");
    card.hidden = true;
    restoreVerifierAudit(ol, card);
    expect(ol.children).toHaveLength(1);
    expect(ol.textContent).toContain("from verify tab");
    expect(card.hidden).toBe(false);
  });
});

describe("sessionStorage fallback", () => {
  it("keeps log in memory when storage throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    clearVerifierAudit();
    pushVerifierAudit("still works");
    expect(readVerifierAudit()).toEqual([
      expect.objectContaining({ message: "still works" }),
    ]);

    vi.restoreAllMocks();
  });
});

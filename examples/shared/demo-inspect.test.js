import { describe, it, expect, vi, beforeEach } from "vitest";
import { inspectLink, wireInspectLog } from "./demo-inspect.js";

describe("inspectLink", () => {
  it("builds caret toggle for /api paths", () => {
    const html = inspectLink("/api/eudi/sessions/abc");
    expect(html).toContain("inspect-toggle");
    expect(html).toContain('data-url="/api/eudi/sessions/abc"');
  });

  it("escapes label text", () => {
    const html = inspectLink("/api/x", "<bad>");
    expect(html).not.toContain("<bad>");
    expect(html).toContain("&lt;bad");
  });

  it("supports form-encoded POST (wallet callback)", () => {
    const html = inspectLink("/api/eudi/callback", "inspect", {
      method: "POST",
      body: "response=demo&state=abc",
      encoding: "form",
    });
    expect(html).toContain('data-method="POST"');
    expect(html).toContain('data-encoding="form"');
    expect(html).toContain("response=demo&amp;state=abc");
  });

  it("returns plain text for non-api urls", () => {
    expect(inspectLink("https://evil.com", "nope")).toBe("nope");
  });
});

describe("wireInspectLog", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("lazy-fetches when toggle opens", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      statusText: "OK",
      text: () => Promise.resolve('{"status":"ok"}'),
    });
    vi.stubGlobal("fetch", fetchMock);

    const ol = document.createElement("ol");
    ol.innerHTML = `<li>log – ${inspectLink("/api/eudi/sessions/x")}</li>`;
    wireInspectLog(ol);
    ol.querySelector(".inspect-toggle").click();

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      expect(ol.querySelector(".inspect-panel").textContent).toContain(
        '"status": "ok"',
      );
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/eudi/sessions/x", {
      method: "GET",
    });
  });

  it("sends form body for callback inspect", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      statusText: "OK",
      text: () => Promise.resolve('{"status":"ok"}'),
    });
    vi.stubGlobal("fetch", fetchMock);

    const ol = document.createElement("ol");
    ol.innerHTML = `<li>${inspectLink("/api/eudi/callback", "inspect", {
      method: "POST",
      body: "response=demo&state=id",
      encoding: "form",
    })}</li>`;
    wireInspectLog(ol);
    ol.querySelector(".inspect-toggle").click();

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith("/api/eudi/callback", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "response=demo&state=id",
    });
  });
});

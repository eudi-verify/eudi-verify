function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

/** Inline caret toggle — lazy-fetches /api/* on first open. */
export function inspectLink(
  url,
  label = "inspect",
  { method = "GET", body, encoding } = {},
) {
  if (!url.startsWith("/api/")) return esc(label);
  let attrs = `data-url="${esc(url)}"`;
  if (method !== "GET") attrs += ` data-method="${esc(method)}"`;
  if (encoding === "form") attrs += ` data-encoding="form"`;
  if (body != null) {
    const raw = typeof body === "string" ? body : JSON.stringify(body);
    attrs += ` data-body="${esc(raw)}"`;
  }
  return (
    `<span class="inspect-inline" ${attrs}>` +
    `<button type="button" class="inspect-toggle" aria-expanded="false">` +
    `<span class="inspect-caret" aria-hidden="true"></span>${esc(label)}` +
    `</button><pre class="inspect-panel" hidden>Open to load response…</pre></span>`
  );
}

export function wireInspectLog(container) {
  if (!container || container.dataset.inspectWired) return;
  container.dataset.inspectWired = "1";
  container.addEventListener("click", (e) => {
    const btn = e.target.closest?.(".inspect-toggle");
    if (!btn || !container.contains(btn)) return;
    const wrap = btn.closest(".inspect-inline");
    const pre = wrap?.querySelector(".inspect-panel");
    if (!wrap || !pre) return;

    const open = btn.getAttribute("aria-expanded") === "true";
    if (open) {
      btn.setAttribute("aria-expanded", "false");
      pre.hidden = true;
      wrap.classList.remove("inspect-inline--open");
      return;
    }

    btn.setAttribute("aria-expanded", "true");
    pre.hidden = false;
    wrap.classList.add("inspect-inline--open");
    if (!pre.dataset.loaded) void loadPanel(wrap, pre);
  });
}

async function loadPanel(wrap, pre) {
  const url = wrap.dataset.url;
  const method = (wrap.dataset.method || "GET").toUpperCase();
  const body = wrap.dataset.body;

  if (!url?.startsWith("/api/")) {
    pre.textContent = "URL must start with /api/";
    pre.dataset.loaded = "1";
    return;
  }
  if (!["GET", "HEAD", "POST"].includes(method)) {
    pre.textContent = "Only GET, HEAD, and POST are supported.";
    pre.dataset.loaded = "1";
    return;
  }

  pre.textContent = "Loading…";
  const fetchOpts = { method };
  if (body && method === "POST") {
    if (wrap.dataset.encoding === "form") {
      fetchOpts.headers = {
        "Content-Type": "application/x-www-form-urlencoded",
      };
      fetchOpts.body = body;
    } else {
      fetchOpts.headers = { "Content-Type": "application/json" };
      fetchOpts.body = body;
    }
  }

  try {
    const res = await fetch(url, fetchOpts);
    const text = await res.text();
    const statusLine = `HTTP ${res.status} ${res.statusText}\n\n`;
    try {
      pre.textContent = statusLine + JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      pre.textContent = statusLine + text;
    }
  } catch (err) {
    pre.textContent = `Network error: ${err.message}`;
  }
  pre.dataset.loaded = "1";
}

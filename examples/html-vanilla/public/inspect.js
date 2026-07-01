const params = new URLSearchParams(window.location.search);
const url = params.get("url");
const method = (params.get("method") || "GET").toUpperCase();
const body = params.get("body");

const apiPath = document.getElementById("api-path");
const payload = document.getElementById("payload");

async function loadPayload() {
  if (!url) {
    apiPath.textContent = "Error: Missing URL parameter";
    payload.textContent = "No URL provided. Use ?url=/api/...";
    return;
  }

  if (!url.startsWith("/api/")) {
    apiPath.textContent = "Error: Invalid URL";
    payload.textContent = "URL must start with /api/ for security.";
    return;
  }

  if (!["GET", "HEAD", "POST"].includes(method)) {
    apiPath.textContent = "Error: Invalid method";
    payload.textContent = "Only GET, HEAD, and POST are supported.";
    return;
  }

  apiPath.textContent = method === "GET" ? url : `${method} ${url}`;
  payload.textContent = "Loading...";

  const fetchOpts = { method };
  if (body && method === "POST") {
    fetchOpts.headers = { "Content-Type": "application/json" };
    fetchOpts.body = body;
  }

  let res;
  try {
    res = await fetch(url, fetchOpts);
  } catch (err) {
    payload.textContent = `Network error: ${err.message}`;
    return;
  }

  const text = await res.text();
  const statusLine = `HTTP ${res.status} ${res.statusText}\n\n`;

  try {
    const json = JSON.parse(text);
    payload.textContent = statusLine + JSON.stringify(json, null, 2);
  } catch {
    payload.textContent = statusLine + text;
  }
}

void loadPayload();

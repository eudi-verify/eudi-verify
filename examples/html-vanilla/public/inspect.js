const params = new URLSearchParams(window.location.search);
const url = params.get("url");

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

  apiPath.textContent = url;
  payload.textContent = "Loading...";

  let res;
  try {
    res = await fetch(url);
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

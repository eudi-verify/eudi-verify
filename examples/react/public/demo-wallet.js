const params = new URLSearchParams(window.location.search);
const sessionId = params.get("state");

const errorEl = document.getElementById("wallet-error");
const loadingEl = document.getElementById("wallet-loading");
const contentEl = document.getElementById("wallet-content");
const auditLog = document.getElementById("wallet-audit-log");
const actionsEl = document.getElementById("wallet-actions");
const doneEl = document.getElementById("wallet-done");
const btnApprove = document.getElementById("btn-approve");
const btnDecline = document.getElementById("btn-decline");

function log(message) {
  const li = document.createElement("li");
  const time = new Date().toLocaleTimeString("en-GB", { hour12: false });
  li.textContent = `${time}  ${message}`;
  auditLog.appendChild(li);
  auditLog.scrollTop = auditLog.scrollHeight;
}

function showError(message) {
  errorEl.hidden = false;
  errorEl.textContent = message;
  loadingEl.hidden = true;
  contentEl.hidden = true;
  errorEl.focus();
}

const CLAIM_LABELS = {
  age_over_18: "Age over 18",
  age_over_21: "Age over 21",
  nationality: "Nationality",
  given_name: "Given name",
  family_name: "Family name",
  birth_date: "Birth date",
};

function formatClaimKeys(keys) {
  return keys.map((k) => CLAIM_LABELS[k] ?? k).join(", ");
}

function formatClaims(request) {
  if (!request || typeof request !== "object") return null;
  const keys = Object.keys(request).filter((k) => request[k] === true);
  return keys.length ? formatClaimKeys(keys) : null;
}

async function loadRequestedClaims(id) {
  log(`GET /api/eudi/request/${id}`);
  try {
    const res = await fetch(`/api/eudi/request/${encodeURIComponent(id)}`);
    if (!res.ok) {
      log(`→ ${res.status} (request lookup failed)`);
      return null;
    }
    const auth = JSON.parse(await res.text());
    log(`→ ${res.status}`);
    const descriptors = auth.presentation_definition?.input_descriptors ?? [];
    const names = descriptors.map((d) => d.name || CLAIM_LABELS[d.id] || d.id);
    return names.length ? names.join(", ") : null;
  } catch {
    log("→ request parse error");
    return null;
  }
}

const TERMINAL = new Set([
  "verified",
  "rejected",
  "expired",
  "cancelled",
  "error",
]);

async function loadSession() {
  if (!sessionId) {
    showError(
      "Missing session ID. Open this page from the verification demo (link includes ?state=…).",
    );
    return;
  }

  log(`GET /api/eudi/sessions/${sessionId}`);

  let res;
  try {
    res = await fetch(`/api/eudi/sessions/${encodeURIComponent(sessionId)}`);
  } catch {
    showError("Network error loading session.");
    return;
  }

  if (!res.ok) {
    showError(
      res.status === 404
        ? "Session not found or expired."
        : `Failed to load session (${res.status}).`,
    );
    log(`→ ${res.status}`);
    return;
  }

  const session = await res.json();
  log(`→ ${res.status} status=${session.status}`);

  loadingEl.hidden = true;
  contentEl.hidden = false;

  document.getElementById("session-id").textContent = session.id;
  document.getElementById("session-status").textContent = session.status;
  document.getElementById("session-created").textContent = session.createdAt
    ? new Date(session.createdAt).toLocaleString()
    : "—";
  document.getElementById("session-expires").textContent = session.expiresAt
    ? new Date(session.expiresAt).toLocaleString()
    : "—";

  const requestEl = document.getElementById("session-request");
  requestEl.textContent = "Loading…";
  const fromAuth = await loadRequestedClaims(session.id);
  requestEl.textContent = fromAuth ?? formatClaims(session.request) ?? "—";

  if (TERMINAL.has(session.status)) {
    actionsEl.hidden = true;
    doneEl.hidden = false;
    document.getElementById("wallet-done-title").textContent =
      session.status === "verified"
        ? "Already approved"
        : `Session ${session.status}`;
    document.getElementById("wallet-done-text").textContent =
      session.status === "verified"
        ? "This request was already completed. Return to your verification tab."
        : "No further action is available for this session.";
  }
}

async function approve() {
  btnApprove.disabled = true;
  btnDecline.disabled = true;
  btnApprove.textContent = "Sending…";

  const body = new URLSearchParams({ response: "demo", state: sessionId });
  log(`POST /api/eudi/callback (response=demo&state=${sessionId})`);

  let res;
  try {
    res = await fetch("/api/eudi/callback", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch {
    log("→ network error");
    btnApprove.disabled = false;
    btnDecline.disabled = false;
    btnApprove.textContent = "Approve";
    return;
  }

  log(`→ ${res.status}`);
  actionsEl.hidden = true;
  doneEl.hidden = false;
  document.getElementById("wallet-done-title").textContent = "Credential sent";
  document.getElementById("wallet-done-text").textContent =
    "Return to your verification tab — it should update automatically within a few seconds.";
  document.getElementById("session-status").textContent =
    "verified (pending poll)";
}

async function decline() {
  btnApprove.disabled = true;
  btnDecline.disabled = true;
  log(`POST /api/eudi/sessions/${sessionId} (cancel)`);

  let res;
  try {
    res = await fetch(`/api/eudi/sessions/${encodeURIComponent(sessionId)}`, {
      method: "POST",
    });
  } catch {
    log("→ network error");
    btnApprove.disabled = false;
    btnDecline.disabled = false;
    return;
  }

  log(`→ ${res.status}`);
  actionsEl.hidden = true;
  doneEl.hidden = false;
  document.getElementById("wallet-done-title").textContent = "Request declined";
  document.getElementById("wallet-done-text").textContent =
    "Return to your verification tab — the session was cancelled.";
  document.getElementById("session-status").textContent = "cancelled";
}

btnApprove.addEventListener("click", () => void approve());
btnDecline.addEventListener("click", () => void decline());

void loadSession();

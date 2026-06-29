const widget = document.querySelector("eudi-verify");
const form = document.getElementById("checkout-form");
const tokenInput = document.getElementById("eudi-token");
const sessionInput = document.getElementById("eudi-session-id");
const errorAlert = document.getElementById("error-alert");
const verificationLog = document.getElementById("verification-log");
const demoWalletPanel = document.getElementById("demo-wallet-panel");
const demoWalletLink = document.getElementById("demo-wallet-link");
const curlHint = document.getElementById("curl-hint");
const curlCommand = document.getElementById("curl-command");

let currentSessionId = null;
let lastLoggedStatus = null;
let hasActiveSession = false;

function inspectLink(href, label = "inspect") {
  const view = `/inspect?url=${encodeURIComponent(href)}`;
  return `<a href="${view}" target="_blank" rel="noopener">${label}</a>`;
}
function sessionInspectUrl(id) {
  return `/api/eudi/sessions/${encodeURIComponent(id)}`;
}
function requestInspectUrl(id) {
  return `/api/eudi/request/${encodeURIComponent(id)}`;
}
function receiptInspectUrl(rid) {
  return `/api/demo/receipt/${encodeURIComponent(rid)}`;
}

const logCard = document.querySelector(".log-card");
function log(message, html) {
  if (logCard?.hidden) logCard.hidden = false;
  const li = document.createElement("li");
  const time = new Date().toLocaleTimeString("en-GB", { hour12: false });
  if (html) {
    li.innerHTML = `${time}  ${message}`;
  } else {
    li.textContent = `${time}  ${message}`;
  }
  verificationLog.appendChild(li);
  verificationLog.scrollTop = verificationLog.scrollHeight;
}

function truncateToken(token) {
  if (!token || token.length <= 24) return token;
  return `${token.slice(0, 12)}…${token.slice(-8)}`;
}

function updateCurlHint(sessionId) {
  const origin = window.location.origin;
  curlCommand.textContent =
    `curl -X POST ${origin}/api/eudi/callback \\\n` +
    `  -H "Content-Type: application/x-www-form-urlencoded" \\\n` +
    `  -d "response=demo&state=${sessionId}"`;
  curlHint.hidden = false;
}

function updateDemoWalletLink(sessionId) {
  demoWalletLink.href = `/demo-wallet?state=${encodeURIComponent(sessionId)}`;
}

function resetSessionUi() {
  hasActiveSession = false;
  currentSessionId = null;
  sessionInput.value = "";
  demoWalletPanel.hidden = true;
  curlHint.hidden = true;
}

function showSessionTools() {
  if (!hasActiveSession) return;
  demoWalletPanel.hidden = false;
  curlHint.hidden = false;
}

function clearError() {
  errorAlert.hidden = true;
  errorAlert.textContent = "";
}

function showError(message) {
  errorAlert.hidden = false;
  errorAlert.textContent = message;
  errorAlert.focus();
}

const params = new URLSearchParams(window.location.search);
if (params.get("error")) {
  showError(
    params.get("error") === "invalid_token"
      ? "Token validation failed. Please try again."
      : params.get("error") === "missing_token"
        ? "Missing verification token. Please try again."
        : "Verification failed. Please try again.",
  );
}

widget.addEventListener("state-change", (e) => {
  const state = e.detail.state;
  const status = state.status;

  if (status === lastLoggedStatus && status !== "showQR") return;

  switch (status) {
    case "loading":
      log("Starting verification…");
      resetSessionUi();
      clearError();
      lastLoggedStatus = status;
      break;

    case "showQR":
      if ("sessionId" in state) {
        currentSessionId = state.sessionId;
        sessionInput.value = state.sessionId;
        log(
          `POST /sessions → session <code>${state.sessionId}</code> – ` +
            `${inspectLink(sessionInspectUrl(state.sessionId))}`,
          true,
        );
        updateDemoWalletLink(state.sessionId);
        updateCurlHint(state.sessionId);
        hasActiveSession = true;
        // Server stays on pending (showQR) until callback — not waiting_for_wallet
        showSessionTools();
      }
      lastLoggedStatus = status;
      break;

    case "waitingForWallet":
      if ("sessionId" in state) {
        currentSessionId = state.sessionId;
        sessionInput.value = state.sessionId;
        updateDemoWalletLink(state.sessionId);
        updateCurlHint(state.sessionId);
        hasActiveSession = true;
        showSessionTools();
      }
      log("Status: waiting_for_wallet");
      lastLoggedStatus = status;
      break;

    case "verified":
      if ("token" in state) {
        const sid = currentSessionId ?? "?";
        const inspect =
          sid !== "?" ? ` – ${inspectLink(sessionInspectUrl(sid))}` : "";
        log(
          `GET /sessions/${sid} → verified (token ${truncateToken(state.token)})${inspect}`,
          sid !== "?",
        );
      }
      lastLoggedStatus = status;
      resetSessionUi();
      break;

    case "rejected":
      log(`Verification rejected${state.error ? `: ${state.error}` : ""}`);
      resetSessionUi();
      lastLoggedStatus = status;
      break;

    case "expired":
      log("Session expired");
      resetSessionUi();
      lastLoggedStatus = status;
      break;

    case "error":
      log(`Error: ${state.error ?? "Unknown error"}`);
      resetSessionUi();
      lastLoggedStatus = status;
      break;

    case "idle":
      if (
        lastLoggedStatus === "loading" ||
        lastLoggedStatus === "showQR" ||
        lastLoggedStatus === "waitingForWallet"
      ) {
        log("Returned to idle");
      }
      if (lastLoggedStatus !== "verified") {
        resetSessionUi();
      }
      lastLoggedStatus = status;
      break;
  }
});

console.log("test");
widget.addEventListener("verified", async (e) => {
  const token = e.detail.token;
  const sessionId = currentSessionId || sessionInput.value;

  log("Submitting token to POST /api/checkout");

  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        eudi_token: token,
        eudi_session_id: sessionId,
      }),
    });
    const data = await res.json();

    if (res.ok && data.receiptId) {
      log(
        `POST /api/checkout → 200 – ${inspectLink(receiptInspectUrl(data.receiptId))}`,
        true,
      );
      window.location.href = `/success?rid=${encodeURIComponent(data.receiptId)}`;
      return;
    }

    showError(
      data.error === "invalid_token"
        ? "Token validation failed. Please try again."
        : data.error === "missing_token"
          ? "Missing verification token. Please try again."
          : "Verification failed. Please try again.",
    );
  } catch {
    showError(
      "Checkout failed. Start the API server: cd ../server && pnpm start",
    );
  }
});

widget.addEventListener("rejected", (e) => {
  const message = e.detail?.error
    ? `Verification was declined: ${e.detail.error}`
    : "Verification was rejected. Please try again.";
  showError(message);
  resetSessionUi();
});

widget.addEventListener("expired", () => {
  showError("Session expired. Please try again.");
  resetSessionUi();
});

widget.addEventListener("error", (e) => {
  showError(
    `Error: ${e.detail?.message || e.detail?.error || "Unknown error"}`,
  );
  resetSessionUi();
});

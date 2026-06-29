const params = new URLSearchParams(window.location.search);
const rid = params.get("rid");

const receiptMissing = document.getElementById("receipt-missing");
const receiptPanel = document.getElementById("receipt-panel");
const replayPanel = document.getElementById("replay-panel");
const btnReplay = document.getElementById("btn-replay");
const replayResult = document.getElementById("replay-result");
const auditLog = document.getElementById("api-audit-log");

const logCard = document.querySelector(".log-card");

function inspectLink(href, label = "inspect") {
  const view = `/inspect?url=${encodeURIComponent(href)}`;
  return `<a href="${view}" target="_blank" rel="noopener">${label}</a>`;
}

function receiptInspectUrl(rid) {
  return `/api/demo/receipt/${encodeURIComponent(rid)}`;
}

function log(message, html) {
  if (logCard?.hidden) logCard.hidden = false;
  const li = document.createElement("li");
  const time = new Date().toLocaleTimeString("en-GB", { hour12: false });
  if (html) {
    li.innerHTML = `${time}  ${message}`;
  } else {
    li.textContent = `${time}  ${message}`;
  }
  auditLog.appendChild(li);
  auditLog.scrollTop = auditLog.scrollHeight;
}

async function loadReceipt() {
  if (!rid) {
    receiptMissing.hidden = false;
    receiptMissing.textContent =
      "No receipt ID in URL. Complete verification from the demo page to see a server receipt.";
    receiptMissing.focus();
    return;
  }

  log(`GET /api/demo/receipt/${rid} – ${inspectLink(receiptInspectUrl(rid))}`, true);

  let res;
  try {
    res = await fetch(`/api/demo/receipt/${encodeURIComponent(rid)}`);
  } catch {
    log("→ network error");
    receiptMissing.hidden = false;
    receiptMissing.textContent = "Network error loading receipt.";
    receiptMissing.focus();
    return;
  }

  if (!res.ok) {
    log(`→ ${res.status}`);
    receiptMissing.hidden = false;
    receiptMissing.focus();
    return;
  }

  const receipt = await res.json();
  log(`→ ${res.status}`);

  document.getElementById("receipt-session-id").textContent =
    receipt.sessionId || "—";
  document.getElementById("receipt-verified-at").textContent =
    receipt.verifiedAt ? new Date(receipt.verifiedAt).toLocaleString() : "—";
  document.getElementById("receipt-token-format").textContent =
    receipt.tokenFormat || "eudi_v1.<payload>.<hmac>";
  document.getElementById("receipt-token-preview").textContent =
    receipt.tokenPreview || "—";
  document.getElementById("receipt-claims").textContent = JSON.stringify(
    receipt.claims ?? {},
    null,
    2,
  );

  receiptPanel.hidden = false;
  replayPanel.hidden = false;
}

btnReplay.addEventListener("click", async () => {
  btnReplay.disabled = true;
  btnReplay.textContent = "Submitting…";

  log(`POST /api/demo/replay (→ POST /api/eudi/tokens/verify) – ${inspectLink(receiptInspectUrl(rid), "inspect receipt")}`, true);

  let res;
  try {
    res = await fetch("/api/demo/replay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rid }),
    });
  } catch {
    log("→ network error");
    replayResult.hidden = false;
    replayResult.textContent = "Network error";
    btnReplay.disabled = false;
    btnReplay.textContent = "Try submitting the same token again";
    return;
  }

  const body = await res.json();
  const errorMsg = body.error ? `error=${body.error}` : "";
  const validMsg = "valid" in body ? `valid=${body.valid}` : "";
  const status = [validMsg, errorMsg].filter(Boolean).join(" ");
  log(`→ ${res.status} ${status}`);

  replayResult.hidden = false;
  replayResult.textContent = JSON.stringify(body, null, 2);
  btnReplay.textContent = "Replay attempted";
});

void loadReceipt();

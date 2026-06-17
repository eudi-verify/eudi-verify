const params = new URLSearchParams(window.location.search);
const rid = params.get("rid");

const receiptMissing = document.getElementById("receipt-missing");
const receiptPanel = document.getElementById("receipt-panel");
const replayPanel = document.getElementById("replay-panel");
const btnReplay = document.getElementById("btn-replay");
const replayResult = document.getElementById("replay-result");

async function loadReceipt() {
  if (!rid) {
    receiptMissing.hidden = false;
    receiptMissing.textContent =
      "No receipt ID in URL. Complete verification from the demo page to see a server receipt.";
    return;
  }

  let res;
  try {
    res = await fetch(`/api/demo/receipt/${encodeURIComponent(rid)}`);
  } catch {
    receiptMissing.hidden = false;
    receiptMissing.textContent = "Network error loading receipt.";
    return;
  }

  if (!res.ok) {
    receiptMissing.hidden = false;
    return;
  }

  const receipt = await res.json();

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

  let res;
  try {
    res = await fetch("/api/demo/replay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rid }),
    });
  } catch {
    replayResult.hidden = false;
    replayResult.textContent = "Network error";
    btnReplay.disabled = false;
    btnReplay.textContent = "Try submitting the same token again";
    return;
  }

  const body = await res.json();
  replayResult.hidden = false;
  replayResult.textContent = JSON.stringify(body, null, 2);
  btnReplay.textContent = "Replay attempted";
});

void loadReceipt();

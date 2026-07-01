const KEY = "eudi-verifier-audit";

// ponytail: in-memory fallback when sessionStorage is blocked (private mode, policy)
let memory = [];

function readStorage() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [...memory];
  }
}

function writeStorage(entries) {
  memory = entries;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* use memory only */
  }
}

export function clearVerifierAudit() {
  memory = [];
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
}

export function readVerifierAudit() {
  return readStorage();
}

function writeVerifierAudit(entries) {
  writeStorage(entries);
}

function formatTime() {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

function renderLi(entry) {
  const li = document.createElement("li");
  if (entry.html) {
    li.innerHTML = `${entry.time}  ${entry.message}`;
  } else {
    li.textContent = `${entry.time}  ${entry.message}`;
  }
  return li;
}

/** Persist one verifier-side log line; returns the entry. */
export function pushVerifierAudit(message, html = false) {
  const entry = { time: formatTime(), message, html: !!html };
  writeVerifierAudit([...readVerifierAudit(), entry]);
  return entry;
}

/** Append one verifier-side log line (DOM + sessionStorage). */
export function appendVerifierAuditLi(
  container,
  logCard,
  message,
  html = false,
) {
  if (logCard?.hidden) logCard.hidden = false;
  const entry = pushVerifierAudit(message, html);
  container.appendChild(renderLi(entry));
  container.scrollTop = container.scrollHeight;
}

/** Hydrate log from sessionStorage (success page after redirect). */
export function restoreVerifierAudit(container, logCard) {
  const entries = readVerifierAudit();
  if (!entries.length) return;
  if (logCard?.hidden) logCard.hidden = false;
  container.replaceChildren(...entries.map((entry) => renderLi(entry)));
  container.scrollTop = container.scrollHeight;
}

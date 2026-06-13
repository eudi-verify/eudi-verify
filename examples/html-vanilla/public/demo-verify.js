const widget = document.querySelector('eudi-verify');
const form = document.getElementById('checkout-form');
const tokenInput = document.getElementById('eudi-token');
const sessionInput = document.getElementById('eudi-session-id');
const errorAlert = document.getElementById('error-alert');
const verificationLog = document.getElementById('verification-log');
const demoWalletPanel = document.getElementById('demo-wallet-panel');
const demoWalletLink = document.getElementById('demo-wallet-link');
const curlHint = document.getElementById('curl-hint');
const curlCommand = document.getElementById('curl-command');

let currentSessionId = null;
let lastLoggedStatus = null;

function log(message, html) {
  const li = document.createElement('li');
  const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
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
  demoWalletPanel.hidden = false;
}

const params = new URLSearchParams(window.location.search);
if (params.get('error')) {
  errorAlert.hidden = false;
  errorAlert.textContent =
    params.get('error') === 'invalid_token'
      ? 'Token validation failed. Please try again.'
      : params.get('error') === 'missing_token'
        ? 'Missing verification token. Please try again.'
        : 'Verification failed. Please try again.';
}

widget.addEventListener('state-change', (e) => {
  const state = e.detail.state;
  const status = state.status;

  if (status === lastLoggedStatus && status !== 'showQR') return;

  switch (status) {
    case 'loading':
      log('Starting verification…');
      demoWalletPanel.hidden = true;
      curlHint.hidden = true;
      lastLoggedStatus = status;
      break;

    case 'showQR':
      if ('sessionId' in state) {
        currentSessionId = state.sessionId;
        sessionInput.value = state.sessionId;
        const inspectUrl = `/api/eudi/sessions/${encodeURIComponent(state.sessionId)}`;
        log(
          `POST /sessions → session <code>${state.sessionId}</code> — ` +
            `<a href="${inspectUrl}" target="_blank" rel="noopener">inspect</a>`,
          true
        );
        updateDemoWalletLink(state.sessionId);
        updateCurlHint(state.sessionId);
      }
      lastLoggedStatus = status;
      break;

    case 'waitingForWallet':
      if ('sessionId' in state) {
        currentSessionId = state.sessionId;
        sessionInput.value = state.sessionId;
      }
      log('Status: waiting_for_wallet');
      lastLoggedStatus = status;
      break;

    case 'verified':
      if ('token' in state) {
        log(`GET /sessions/${currentSessionId ?? '?'} → verified (token ${truncateToken(state.token)})`);
      }
      lastLoggedStatus = status;
      demoWalletPanel.hidden = true;
      break;

    case 'rejected':
      log(`Verification rejected${state.error ? `: ${state.error}` : ''}`);
      lastLoggedStatus = status;
      break;

    case 'expired':
      log('Session expired');
      lastLoggedStatus = status;
      break;

    case 'error':
      log(`Error: ${state.error ?? 'Unknown error'}`);
      lastLoggedStatus = status;
      break;

    case 'idle':
      if (lastLoggedStatus === 'loading' || lastLoggedStatus === 'showQR') {
        log('Returned to idle');
      }
      lastLoggedStatus = status;
      break;
  }
});

widget.addEventListener('verified', (e) => {
  log('Submitting token to POST /api/checkout');
  tokenInput.value = e.detail.token;
  if (currentSessionId) {
    sessionInput.value = currentSessionId;
  }
  form.submit();
});

widget.addEventListener('rejected', () => {
  errorAlert.hidden = false;
  errorAlert.textContent = 'Verification was rejected. Please try again.';
});

widget.addEventListener('expired', () => {
  errorAlert.hidden = false;
  errorAlert.textContent = 'Session expired. Please try again.';
});

widget.addEventListener('error', (e) => {
  errorAlert.hidden = false;
  errorAlert.textContent = `Error: ${e.detail?.message || e.detail?.error || 'Unknown error'}`;
});

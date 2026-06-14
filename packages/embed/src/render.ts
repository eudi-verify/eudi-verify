/**
 * @eudi-verify/embed - State-based Rendering
 *
 * Renders the widget UI based on verification state.
 */

import type { VerificationState } from '@eudi-verify/client';

/**
 * SVG icon: EU stars (simplified)
 */
const EU_STARS_ICON = /* html */ `
<svg class="eudi-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <g fill="currentColor">
    <polygon points="12,4 12.5,5.5 14,5.5 12.75,6.5 13.25,8 12,7 10.75,8 11.25,6.5 10,5.5 11.5,5.5"/>
    <polygon points="17,6.5 17.35,7.6 18.5,7.6 17.6,8.3 17.9,9.4 17,8.7 16.1,9.4 16.4,8.3 15.5,7.6 16.65,7.6"/>
    <polygon points="19,11 19.35,12.1 20.5,12.1 19.6,12.8 19.9,13.9 19,13.2 18.1,13.9 18.4,12.8 17.5,12.1 18.65,12.1"/>
    <polygon points="17,15.5 17.35,16.6 18.5,16.6 17.6,17.3 17.9,18.4 17,17.7 16.1,18.4 16.4,17.3 15.5,16.6 16.65,16.6"/>
    <polygon points="12,18 12.35,19.1 13.5,19.1 12.6,19.8 12.9,20.9 12,20.2 11.1,20.9 11.4,19.8 10.5,19.1 11.65,19.1"/>
    <polygon points="7,15.5 7.35,16.6 8.5,16.6 7.6,17.3 7.9,18.4 7,17.7 6.1,18.4 6.4,17.3 5.5,16.6 6.65,16.6"/>
    <polygon points="5,11 5.35,12.1 6.5,12.1 5.6,12.8 5.9,13.9 5,13.2 4.1,13.9 4.4,12.8 3.5,12.1 4.65,12.1"/>
    <polygon points="7,6.5 7.35,7.6 8.5,7.6 7.6,8.3 7.9,9.4 7,8.7 6.1,9.4 6.4,8.3 5.5,7.6 6.65,7.6"/>
  </g>
</svg>
`;

/**
 * SVG icon: checkmark (success)
 */
const SUCCESS_ICON = /* html */ `
<svg class="eudi-success-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
  <path d="M8 12l3 3 5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

/**
 * SVG icon: X (error)
 */
const ERROR_ICON = /* html */ `
<svg class="eudi-error-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
  <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>
`;

/**
 * SVG icon: clock (expired)
 */
const EXPIRED_ICON = /* html */ `
<svg class="eudi-error-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
  <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>
`;

/**
 * SVG icon: wallet (waiting)
 */
const WALLET_ICON = /* html */ `
<svg class="eudi-waiting-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
  <path d="M2 10h20" stroke="currentColor" stroke-width="2"/>
  <circle cx="17" cy="14" r="1.5" fill="currentColor"/>
</svg>
`;

/**
 * SVG icon: warning (demo banner)
 */
const WARNING_ICON = /* html */ `
<svg class="eudi-warning-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

/**
 * Map of status to state container ID.
 */
type RenderableStatus = VerificationState['status'];

/**
 * Get the state container ID for a status.
 */
export function getStateId(status: RenderableStatus): string {
  return `eudi-state-${status}`;
}

/**
 * Render the idle state (start button).
 */
function renderIdle(): string {
  return /* html */ `
    <div id="${getStateId('idle')}" class="eudi-state" data-active>
      <button class="eudi-start-btn" type="button" data-action="start">
        ${EU_STARS_ICON}
        <span>Verify with EU Wallet</span>
      </button>
    </div>
  `;
}

/**
 * Render the loading state.
 */
function renderLoading(): string {
  return /* html */ `
    <div id="${getStateId('loading')}" class="eudi-state">
      <div class="eudi-loading">
        <div class="eudi-spinner" aria-hidden="true"></div>
        <p>Loading...</p>
      </div>
    </div>
  `;
}

/**
 * Render the QR code state.
 */
function renderShowQR(): string {
  return /* html */ `
    <div id="${getStateId('showQR')}" class="eudi-state">
      <div class="eudi-qr">
        <img class="eudi-qr-img" src="" alt="Scan with EUDI Wallet" />
        <p class="eudi-qr-text">Scan with your EU Digital Identity Wallet</p>
        <button class="eudi-cancel-btn" type="button" data-action="cancel">Cancel</button>
      </div>
    </div>
  `;
}

/**
 * Render the waiting for wallet state.
 */
function renderWaitingForWallet(): string {
  return /* html */ `
    <div id="${getStateId('waitingForWallet')}" class="eudi-state">
      <div class="eudi-waiting">
        ${WALLET_ICON}
        <p class="eudi-waiting-text">Waiting for wallet approval...</p>
        <button class="eudi-cancel-btn" type="button" data-action="cancel">Cancel</button>
      </div>
    </div>
  `;
}

/**
 * Render the verified state.
 */
function renderVerified(): string {
  return /* html */ `
    <div id="${getStateId('verified')}" class="eudi-state">
      <div class="eudi-success">
        ${SUCCESS_ICON}
        <p class="eudi-success-text">Verified</p>
      </div>
    </div>
  `;
}

/**
 * Render the rejected state.
 */
function renderRejected(): string {
  return /* html */ `
    <div id="${getStateId('rejected')}" class="eudi-state">
      <div class="eudi-error">
        ${ERROR_ICON}
        <p class="eudi-error-text">Verification declined</p>
        <p class="eudi-error-detail"></p>
        <button class="eudi-retry-btn" type="button" data-action="reset">Try again</button>
      </div>
    </div>
  `;
}

/**
 * Render the expired state.
 */
function renderExpired(): string {
  return /* html */ `
    <div id="${getStateId('expired')}" class="eudi-state">
      <div class="eudi-error">
        ${EXPIRED_ICON}
        <p class="eudi-error-text">Session expired</p>
        <button class="eudi-retry-btn" type="button" data-action="reset">Try again</button>
      </div>
    </div>
  `;
}

/**
 * Render the error state.
 */
function renderError(): string {
  return /* html */ `
    <div id="${getStateId('error')}" class="eudi-state">
      <div class="eudi-error">
        ${ERROR_ICON}
        <p class="eudi-error-text">Verification failed</p>
        <p class="eudi-error-detail"></p>
        <button class="eudi-retry-btn" type="button" data-action="reset">Try again</button>
      </div>
    </div>
  `;
}

/**
 * Render the demo mode banner.
 */
function renderDemoBanner(): string {
  return /* html */ `
    <div class="eudi-demo-banner" role="status" aria-live="polite" hidden>
      ${WARNING_ICON}
      <span>Demo mode — credentials are simulated</span>
    </div>
  `;
}

/**
 * Render the complete widget structure.
 * All states are rendered, only one is visible at a time.
 */
export function renderWidget(): string {
  return /* html */ `
    <div class="eudi-widget" role="region" aria-label="Identity verification">
      <div class="eudi-sr-only" aria-live="polite" aria-atomic="true"></div>
      ${renderDemoBanner()}
      ${renderIdle()}
      ${renderLoading()}
      ${renderShowQR()}
      ${renderWaitingForWallet()}
      ${renderVerified()}
      ${renderRejected()}
      ${renderExpired()}
      ${renderError()}
    </div>
  `;
}

/**
 * Update the visible state and content based on verification state.
 */
export function updateWidgetState(
  container: HTMLElement,
  state: VerificationState
): void {
  const stateContainers = container.querySelectorAll<HTMLElement>('.eudi-state');

  for (const stateEl of stateContainers) {
    if (stateEl.id === getStateId(state.status)) {
      stateEl.setAttribute('data-active', '');
    } else {
      stateEl.removeAttribute('data-active');
    }
  }

  if (state.status === 'showQR') {
    const img = container.querySelector<HTMLImageElement>('.eudi-qr-img');
    if (img && 'qrDataUrl' in state) {
      img.src = state.qrDataUrl;
    }
  }

  if (state.status === 'rejected' && 'error' in state && state.error) {
    const detail = container.querySelector(`#${getStateId('rejected')} .eudi-error-detail`);
    if (detail) {
      detail.textContent = state.error;
    }
  }

  if (state.status === 'error' && 'error' in state) {
    const detail = container.querySelector(`#${getStateId('error')} .eudi-error-detail`);
    if (detail) {
      detail.textContent = state.error;
    }
  }
}

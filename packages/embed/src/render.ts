/**
 * @eudi-verify/embed - State-based Rendering
 *
 * Renders the widget UI based on verification state.
 */

import type { VerificationState } from "@eudi-verify/client";

/**
 * SVG icon: EU emblem – 12 upright five-pointed stars in a ring, per the
 * official European flag (12 stars, clock-face arrangement).
 */
const EU_STARS_ICON = /* html */ `
<svg class="eudi-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <g fill="currentColor">
    <polygon points="12.00,2.30 12.39,3.47 13.62,3.47 12.63,4.20 13.00,5.38 12.00,4.66 11.00,5.38 11.37,4.20 10.38,3.47 11.61,3.47"/>
    <polygon points="16.00,3.37 16.39,4.54 17.62,4.55 16.63,5.28 17.00,6.45 16.00,5.73 15.00,6.45 15.37,5.28 14.38,4.55 15.61,4.54"/>
    <polygon points="18.93,6.30 19.32,7.47 20.54,7.47 19.56,8.20 19.93,9.38 18.93,8.66 17.93,9.38 18.30,8.20 17.31,7.47 18.54,7.47"/>
    <polygon points="20.00,10.30 20.39,11.47 21.62,11.47 20.63,12.20 21.00,13.38 20.00,12.66 19.00,13.38 19.37,12.20 18.38,11.47 19.61,11.47"/>
    <polygon points="18.93,14.30 19.32,15.47 20.54,15.47 19.56,16.20 19.93,17.38 18.93,16.66 17.93,17.38 18.30,16.20 17.31,15.47 18.54,15.47"/>
    <polygon points="16.00,17.23 16.39,18.39 17.62,18.40 16.63,19.13 17.00,20.30 16.00,19.59 15.00,20.30 15.37,19.13 14.38,18.40 15.61,18.39"/>
    <polygon points="12.00,18.30 12.39,19.47 13.62,19.47 12.63,20.20 13.00,21.38 12.00,20.66 11.00,21.38 11.37,20.20 10.38,19.47 11.61,19.47"/>
    <polygon points="8.00,17.23 8.39,18.39 9.62,18.40 8.63,19.13 9.00,20.30 8.00,19.59 7.00,20.30 7.37,19.13 6.38,18.40 7.61,18.39"/>
    <polygon points="5.07,14.30 5.46,15.47 6.69,15.47 5.70,16.20 6.07,17.38 5.07,16.66 4.07,17.38 4.44,16.20 3.46,15.47 4.68,15.47"/>
    <polygon points="4.00,10.30 4.39,11.47 5.62,11.47 4.63,12.20 5.00,13.38 4.00,12.66 3.00,13.38 3.37,12.20 2.38,11.47 3.61,11.47"/>
    <polygon points="5.07,6.30 5.46,7.47 6.69,7.47 5.70,8.20 6.07,9.38 5.07,8.66 4.07,9.38 4.44,8.20 3.46,7.47 4.68,7.47"/>
    <polygon points="8.00,3.37 8.39,4.54 9.62,4.55 8.63,5.28 9.00,6.45 8.00,5.73 7.00,6.45 7.37,5.28 6.38,4.55 7.61,4.54"/>
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
type RenderableStatus = VerificationState["status"];

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
    <div id="${getStateId("idle")}" class="eudi-state" data-active>
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
    <div id="${getStateId("loading")}" class="eudi-state">
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
    <div id="${getStateId("showQR")}" class="eudi-state">
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
    <div id="${getStateId("waitingForWallet")}" class="eudi-state">
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
    <div id="${getStateId("verified")}" class="eudi-state">
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
    <div id="${getStateId("rejected")}" class="eudi-state">
      <div class="eudi-error">
        ${ERROR_ICON}
        <p class="eudi-error-text">Verification declined</p>
        <p id="eudi-rejected-detail" class="eudi-error-detail"></p>
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
    <div id="${getStateId("expired")}" class="eudi-state">
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
    <div id="${getStateId("error")}" class="eudi-state">
      <div class="eudi-error">
        ${ERROR_ICON}
        <p class="eudi-error-text">Verification failed</p>
        <p id="eudi-error-state-detail" class="eudi-error-detail"></p>
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
      <span>Demo mode: credentials are simulated</span>
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
  state: VerificationState,
): void {
  const stateContainers =
    container.querySelectorAll<HTMLElement>(".eudi-state");

  for (const stateEl of stateContainers) {
    if (stateEl.id === getStateId(state.status)) {
      stateEl.setAttribute("data-active", "");
    } else {
      stateEl.removeAttribute("data-active");
    }
  }

  if (state.status === "showQR") {
    const img = container.querySelector<HTMLImageElement>(".eudi-qr-img");
    if (img && "qrDataUrl" in state) {
      img.src = state.qrDataUrl;
    }
  }

  if (state.status === "rejected" && "error" in state && state.error) {
    const detail = container.querySelector(
      `#${getStateId("rejected")} #eudi-rejected-detail`,
    );
    if (detail) {
      detail.textContent = state.error;
    }
    wireRetryDescribedBy(
      container,
      getStateId("rejected"),
      "eudi-rejected-detail",
    );
  }

  if (state.status === "error" && "error" in state) {
    const detail = container.querySelector(
      `#${getStateId("error")} #eudi-error-state-detail`,
    );
    if (detail) {
      detail.textContent = state.error;
    }
    wireRetryDescribedBy(
      container,
      getStateId("error"),
      "eudi-error-state-detail",
    );
  }
}

function wireRetryDescribedBy(
  container: HTMLElement,
  stateId: string,
  detailId: string,
): void {
  const detail = container.querySelector(`#${detailId}`);
  const retryBtn = container.querySelector<HTMLButtonElement>(
    `#${stateId} .eudi-retry-btn`,
  );
  if (!retryBtn) return;

  if (detail?.textContent) {
    retryBtn.setAttribute("aria-describedby", detailId);
  } else {
    retryBtn.removeAttribute("aria-describedby");
  }
}

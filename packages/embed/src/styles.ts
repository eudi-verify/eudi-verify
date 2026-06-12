/**
 * @eudi-verify/embed - Styles
 *
 * CSS template with custom property theming.
 * Uses open Shadow DOM for style encapsulation.
 */

/**
 * CSS custom properties for theming.
 * These can be set on the host element or any ancestor.
 */
export const CSS_VARIABLES = {
  '--eudi-primary': '#003399',
  '--eudi-text': '#1a1a1a',
  '--eudi-background': '#ffffff',
  '--eudi-border-radius': '8px',
  '--eudi-font-family': 'system-ui, sans-serif',
  '--eudi-error': '#d32f2f',
} as const;

/**
 * Generate the internal stylesheet for the shadow DOM.
 * Uses CSS custom properties with fallbacks to defaults.
 */
export function createStyles(): string {
  return /* css */ `
    :host {
      display: block;
      font-family: var(--eudi-font-family, ${CSS_VARIABLES['--eudi-font-family']});
      color: var(--eudi-text, ${CSS_VARIABLES['--eudi-text']});
    }

    :host([hidden]) {
      display: none;
    }

    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    .eudi-widget {
      background: var(--eudi-background, ${CSS_VARIABLES['--eudi-background']});
      border: 1px solid color-mix(in srgb, var(--eudi-text, ${CSS_VARIABLES['--eudi-text']}) 20%, transparent);
      border-radius: var(--eudi-border-radius, ${CSS_VARIABLES['--eudi-border-radius']});
      padding: 24px;
      text-align: center;
      min-width: 280px;
      max-width: 400px;
    }

    /* State containers - only one visible at a time */
    .eudi-state {
      display: none;
    }

    .eudi-state[data-active] {
      display: block;
    }

    /* Start button */
    .eudi-start-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 24px;
      font-size: 16px;
      font-weight: 500;
      font-family: inherit;
      color: #ffffff;
      background: var(--eudi-primary, ${CSS_VARIABLES['--eudi-primary']});
      border: none;
      border-radius: var(--eudi-border-radius, ${CSS_VARIABLES['--eudi-border-radius']});
      cursor: pointer;
      transition: background-color 0.2s ease, transform 0.1s ease;
    }

    .eudi-start-btn:hover {
      background: color-mix(in srgb, var(--eudi-primary, ${CSS_VARIABLES['--eudi-primary']}) 85%, black);
    }

    .eudi-start-btn:focus-visible {
      outline: 2px solid var(--eudi-primary, ${CSS_VARIABLES['--eudi-primary']});
      outline-offset: 2px;
    }

    .eudi-start-btn:active {
      transform: scale(0.98);
    }

    /* EU stars icon */
    .eudi-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    /* Loading state */
    .eudi-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 16px 0;
    }

    .eudi-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid color-mix(in srgb, var(--eudi-primary, ${CSS_VARIABLES['--eudi-primary']}) 20%, transparent);
      border-top-color: var(--eudi-primary, ${CSS_VARIABLES['--eudi-primary']});
      border-radius: 50%;
      animation: eudi-spin 0.8s linear infinite;
    }

    @keyframes eudi-spin {
      to {
        transform: rotate(360deg);
      }
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .eudi-spinner {
        animation: none;
        border-top-color: var(--eudi-primary, ${CSS_VARIABLES['--eudi-primary']});
        border-right-color: var(--eudi-primary, ${CSS_VARIABLES['--eudi-primary']});
      }

      .eudi-start-btn {
        transition: none;
      }
    }

    /* QR code state */
    .eudi-qr {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .eudi-qr-img {
      width: 200px;
      height: 200px;
      border: 1px solid color-mix(in srgb, var(--eudi-text, ${CSS_VARIABLES['--eudi-text']}) 15%, transparent);
      border-radius: 4px;
    }

    .eudi-qr-text {
      margin: 0;
      font-size: 14px;
      color: color-mix(in srgb, var(--eudi-text, ${CSS_VARIABLES['--eudi-text']}) 80%, transparent);
    }

    .eudi-cancel-btn {
      margin-top: 8px;
      padding: 8px 16px;
      font-size: 14px;
      font-family: inherit;
      color: var(--eudi-text, ${CSS_VARIABLES['--eudi-text']});
      background: transparent;
      border: 1px solid color-mix(in srgb, var(--eudi-text, ${CSS_VARIABLES['--eudi-text']}) 30%, transparent);
      border-radius: var(--eudi-border-radius, ${CSS_VARIABLES['--eudi-border-radius']});
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .eudi-cancel-btn:hover {
      background: color-mix(in srgb, var(--eudi-text, ${CSS_VARIABLES['--eudi-text']}) 5%, transparent);
    }

    .eudi-cancel-btn:focus-visible {
      outline: 2px solid var(--eudi-primary, ${CSS_VARIABLES['--eudi-primary']});
      outline-offset: 2px;
    }

    /* Waiting for wallet */
    .eudi-waiting {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 16px 0;
    }

    .eudi-waiting-icon {
      width: 48px;
      height: 48px;
      color: var(--eudi-primary, ${CSS_VARIABLES['--eudi-primary']});
    }

    .eudi-waiting-text {
      margin: 0;
      font-size: 16px;
    }

    /* Success state */
    .eudi-success {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 16px 0;
    }

    .eudi-success-icon {
      width: 48px;
      height: 48px;
      color: var(--eudi-primary, ${CSS_VARIABLES['--eudi-primary']});
    }

    .eudi-success-text {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
      color: var(--eudi-primary, ${CSS_VARIABLES['--eudi-primary']});
    }

    /* Error/rejected/expired states */
    .eudi-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 16px 0;
    }

    .eudi-error-icon {
      width: 48px;
      height: 48px;
      color: var(--eudi-error, ${CSS_VARIABLES['--eudi-error']});
    }

    .eudi-error-text {
      margin: 0;
      font-size: 16px;
      color: var(--eudi-error, ${CSS_VARIABLES['--eudi-error']});
    }

    .eudi-error-detail {
      margin: 0;
      font-size: 14px;
      color: color-mix(in srgb, var(--eudi-text, ${CSS_VARIABLES['--eudi-text']}) 70%, transparent);
    }

    .eudi-retry-btn {
      margin-top: 8px;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 500;
      font-family: inherit;
      color: #ffffff;
      background: var(--eudi-primary, ${CSS_VARIABLES['--eudi-primary']});
      border: none;
      border-radius: var(--eudi-border-radius, ${CSS_VARIABLES['--eudi-border-radius']});
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .eudi-retry-btn:hover {
      background: color-mix(in srgb, var(--eudi-primary, ${CSS_VARIABLES['--eudi-primary']}) 85%, black);
    }

    .eudi-retry-btn:focus-visible {
      outline: 2px solid var(--eudi-primary, ${CSS_VARIABLES['--eudi-primary']});
      outline-offset: 2px;
    }

    /* Screen reader only */
    .eudi-sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `;
}

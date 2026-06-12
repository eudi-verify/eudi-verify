/**
 * @eudi-verify/embed
 *
 * <eudi-verify> Custom Element for EUDI Wallet verification.
 *
 * @example
 * ```html
 * <script type="module">
 *   import '@eudi-verify/embed';
 * </script>
 *
 * <eudi-verify
 *   api-url="/api/eudi"
 *   request='{"age_over_18":true}'
 * ></eudi-verify>
 * ```
 */

export const VERSION = '0.0.0';

export { EudiVerifyElement, type EudiVerifyEventMap } from './element.js';
export { createStyles, CSS_VARIABLES } from './styles.js';
export {
  announce,
  clearAnnouncement,
  createFocusTrap,
  getFocusableElements,
  STATE_MESSAGES,
} from './a11y.js';
export { renderWidget, updateWidgetState, getStateId } from './render.js';

import { EudiVerifyElement } from './element.js';

if (typeof customElements !== 'undefined' && !customElements.get('eudi-verify')) {
  customElements.define('eudi-verify', EudiVerifyElement);
}

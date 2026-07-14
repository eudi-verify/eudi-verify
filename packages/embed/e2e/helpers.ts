import { expect, type Locator, type Page } from "@playwright/test";

/** Active states after the user starts verification (loading is often transient). */
export const ACTIVE_VERIFICATION_SELECTOR =
  "#eudi-state-loading[data-active], #eudi-state-showQR[data-active], #eudi-state-waitingForWallet[data-active]";

/** Stable post-session states once the mock API has responded. */
export const POST_START_SELECTOR =
  "#eudi-state-showQR[data-active], #eudi-state-waitingForWallet[data-active]";

export const ANNOUNCEMENT_LIVE_REGION = ".eudi-sr-only[aria-live]";

export async function waitForPostStart(
  widget: Locator,
  timeout = 10_000,
): Promise<Locator> {
  const state = widget.locator(POST_START_SELECTOR);
  await expect(state).toBeVisible({ timeout });
  return state;
}

export function activeCancelButton(widget: Locator): Locator {
  return widget.locator('.eudi-state[data-active] [data-action="cancel"]');
}

/** Activate cancel — keyboard works reliably in shadow DOM on WebKit/Firefox; click() can flake. */
export async function activateCancel(
  widget: Locator,
  page: Page,
  timeout = 10_000,
): Promise<void> {
  const cancelButton = activeCancelButton(widget);
  await expect(cancelButton).toBeVisible({ timeout });
  await cancelButton.focus();
  await page.keyboard.press("Enter");
}

/** Wait until the session QR is generated (src set). Survives fast showQR → waitingForWallet transitions. */
export async function waitForQrSrc(
  widget: Locator,
  timeout = 10_000,
): Promise<void> {
  const qrImage = widget.locator(".eudi-qr-img");
  await expect
    .poll(async () => qrImage.getAttribute("src"), { timeout })
    .toMatch(/^data:image/);
}

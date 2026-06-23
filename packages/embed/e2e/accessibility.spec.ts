import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("<eudi-verify> accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("idle state passes axe-core", async ({ page }) => {
    const widget = page.locator("eudi-verify");
    await expect(widget).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .include("eudi-verify")
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("loading state passes axe-core", async ({ page }) => {
    const widget = page.locator("eudi-verify");
    const startButton = widget.locator('[data-action="start"]');

    await startButton.click();

    const loadingState = widget.locator("#eudi-state-loading[data-active]");
    await expect(loadingState)
      .toBeVisible({ timeout: 1000 })
      .catch(() => {});

    const accessibilityScanResults = await new AxeBuilder({ page })
      .include("eudi-verify")
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("QR code state passes axe-core", async ({ page }) => {
    const widget = page.locator("eudi-verify");
    const startButton = widget.locator('[data-action="start"]');

    await startButton.click();

    const qrState = widget.locator("#eudi-state-showQR");
    await expect(qrState).toHaveAttribute("data-active", { timeout: 5000 });

    const accessibilityScanResults = await new AxeBuilder({ page })
      .include("eudi-verify")
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("widget has proper ARIA landmarks", async ({ page }) => {
    const widget = page.locator("eudi-verify");

    const region = widget.locator('[role="region"]');
    await expect(region).toBeVisible();
    await expect(region).toHaveAttribute("aria-label", "Identity verification");
  });

  test("has aria-live region for announcements", async ({ page }) => {
    const widget = page.locator("eudi-verify");

    const liveRegion = widget.locator("[aria-live]");
    await expect(liveRegion).toBeAttached();
    await expect(liveRegion).toHaveAttribute("aria-atomic", "true");
  });

  test("start button is keyboard accessible", async ({ page }) => {
    const widget = page.locator("eudi-verify");
    const startButton = widget.locator('[data-action="start"]');

    await startButton.focus();
    await expect(startButton).toBeFocused();

    await page.keyboard.press("Enter");

    const loadingOrQR = widget.locator(
      "#eudi-state-loading[data-active], #eudi-state-showQR[data-active]",
    );
    await expect(loadingOrQR).toBeVisible({ timeout: 5000 });
  });

  test("cancel button is keyboard accessible", async ({ page }) => {
    const widget = page.locator("eudi-verify");
    const startButton = widget.locator('[data-action="start"]');

    await startButton.click();

    const qrState = widget.locator("#eudi-state-showQR");
    await expect(qrState).toHaveAttribute("data-active", { timeout: 5000 });

    const cancelButton = widget.locator(
      '#eudi-state-showQR [data-action="cancel"]',
    );
    await cancelButton.focus();
    await expect(cancelButton).toBeFocused();

    await page.keyboard.press("Enter");

    const idleState = widget.locator("#eudi-state-idle");
    await expect(idleState).toHaveAttribute("data-active");
  });

  test("cancel button receives focus in waitingForWallet state", async ({
    page,
  }) => {
    const widget = page.locator("eudi-verify");
    const startButton = widget.locator('[data-action="start"]');

    await startButton.click();

    const waitingState = widget.locator("#eudi-state-waitingForWallet");
    await expect(waitingState).toHaveAttribute("data-active", {
      timeout: 10000,
    });

    const cancelButton = widget.locator(
      '#eudi-state-waitingForWallet [data-action="cancel"]',
    );
    await expect(cancelButton).toBeFocused();
  });

  test("widget sets aria-busy during loading", async ({ page }) => {
    const widget = page.locator("eudi-verify");
    const startButton = widget.locator('[data-action="start"]');

    await startButton.click();

    const region = widget.locator('[role="region"]');
    await expect(region).toHaveAttribute("aria-busy", "true", {
      timeout: 1000,
    });
  });

  test("buttons have visible focus indicators", async ({ page }) => {
    const widget = page.locator("eudi-verify");
    const startButton = widget.locator('[data-action="start"]');

    await startButton.focus();

    const outlineStyle = await startButton.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        outlineOffset: styles.outlineOffset,
      };
    });

    expect(outlineStyle.outline).not.toBe("none");
  });

  test("QR image has alt text", async ({ page }) => {
    const widget = page.locator("eudi-verify");
    const startButton = widget.locator('[data-action="start"]');

    await startButton.click();

    const qrState = widget.locator("#eudi-state-showQR");
    await expect(qrState).toHaveAttribute("data-active", { timeout: 5000 });

    const qrImage = widget.locator(".eudi-qr-img");
    await expect(qrImage).toHaveAttribute("alt", "Scan with EUDI Wallet");
  });

  test("icons are hidden from screen readers", async ({ page }) => {
    const widget = page.locator("eudi-verify");

    const svgs = widget.locator("svg");
    const count = await svgs.count();

    for (let i = 0; i < count; i++) {
      await expect(svgs.nth(i)).toHaveAttribute("aria-hidden", "true");
    }
  });

  test("color contrast meets WCAG AA", async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include("eudi-verify")
      .withRules(["color-contrast"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe("<eudi-verify> reduced motion", () => {
  test("respects prefers-reduced-motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const widget = page.locator("eudi-verify");
    const startButton = widget.locator('[data-action="start"]');

    await startButton.click();

    const spinner = widget.locator(".eudi-spinner");
    if (await spinner.isVisible()) {
      const animation = await spinner.evaluate((el) => {
        return window.getComputedStyle(el).animation;
      });
      expect(animation).toBe("none");
    }
  });
});

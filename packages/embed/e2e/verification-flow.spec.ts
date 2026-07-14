import { test, expect } from "@playwright/test";
import {
  ACTIVE_VERIFICATION_SELECTOR,
  activateCancel,
  waitForQrSrc,
} from "./helpers";

test.describe("<eudi-verify> verification flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders start button in idle state", async ({ page }) => {
    const widget = page.locator("eudi-verify");
    await expect(widget).toBeVisible();

    const shadowRoot = widget.locator('css=[data-action="start"]');
    await expect(shadowRoot).toBeVisible();
    await expect(shadowRoot).toContainText("Verify with EU Wallet");
  });

  test("shows loading state after clicking start", async ({ page }) => {
    const widget = page.locator("eudi-verify");
    const startButton = widget.locator('[data-action="start"]');

    await startButton.click();

    const activeState = widget.locator(ACTIVE_VERIFICATION_SELECTOR);
    await expect(activeState).toBeVisible({ timeout: 5000 });
  });

  test("shows QR code after session created", async ({ page }) => {
    const widget = page.locator("eudi-verify");
    const startButton = widget.locator('[data-action="start"]');

    await startButton.click();
    await waitForQrSrc(widget);
  });

  test("cancel button returns to idle", async ({ page }) => {
    const widget = page.locator("eudi-verify");
    const startButton = widget.locator('[data-action="start"]');

    await startButton.click();
    await activateCancel(widget, page);

    const idleState = widget.locator("#eudi-state-idle");
    await expect(idleState).toHaveAttribute("data-active");
  });

  test("dispatches state-change events", async ({ page }) => {
    const stateChanges: string[] = [];

    await page.exposeFunction("onStateChange", (state: string) => {
      stateChanges.push(state);
    });

    await page.evaluate(() => {
      const widget = document.querySelector("eudi-verify")!;
      widget.addEventListener("state-change", ((e: CustomEvent) => {
        (window as any).onStateChange(e.detail.state.status);
      }) as EventListener);
    });

    const widget = page.locator("eudi-verify");
    const startButton = widget.locator('[data-action="start"]');

    await startButton.click();

    await page.waitForTimeout(2000);

    expect(stateChanges).toContain("loading");
  });

  test("dispatches verified event on successful verification", async ({
    page,
  }) => {
    let verifiedEvent: any = null;

    await page.exposeFunction("onVerified", (detail: any) => {
      verifiedEvent = detail;
    });

    await page.evaluate(() => {
      const widget = document.querySelector("eudi-verify")!;
      widget.addEventListener("verified", ((e: CustomEvent) => {
        (window as any).onVerified(e.detail);
      }) as EventListener);
    });

    const widget = page.locator("eudi-verify");
    const startButton = widget.locator('[data-action="start"]');

    await startButton.click();

    await expect.poll(() => verifiedEvent, { timeout: 30000 }).toBeTruthy();

    expect(verifiedEvent).toHaveProperty("token");
    expect(verifiedEvent).toHaveProperty("claims");
  });

  test("shows success state after verification", async ({ page }) => {
    const widget = page.locator("eudi-verify");
    const startButton = widget.locator('[data-action="start"]');

    await startButton.click();

    const verifiedState = widget.locator("#eudi-state-verified");
    await expect(verifiedState).toHaveAttribute("data-active", {
      timeout: 30000,
    });

    await expect(widget.locator(".eudi-success-text")).toContainText(
      "Verified",
    );
  });
});

test.describe("<eudi-verify> attributes", () => {
  test("api-url attribute is required", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/pages/missing-api-url.html");
    await page.waitForFunction(
      () => customElements.get("eudi-verify") !== undefined,
    );

    const widget = page.locator("eudi-verify");
    const startButton = widget.locator('[data-action="start"]');

    await startButton.click();

    expect(consoleErrors.some((e) => e.includes("api-url"))).toBe(true);
  });

  test("auto-start attribute starts verification on connect", async ({
    page,
  }) => {
    await page.goto("/?auto-start=true");

    const widget = page.locator("eudi-verify");
    const loadingOrQR = widget.locator(ACTIVE_VERIFICATION_SELECTOR);

    await expect(loadingOrQR).toBeVisible({ timeout: 5000 });
  });
});

test.describe("<eudi-verify> theming", () => {
  test("applies custom CSS variables", async ({ page }) => {
    await page.goto("/pages/themed.html");
    await page.waitForFunction(
      () => customElements.get("eudi-verify") !== undefined,
    );

    const widget = page.locator("eudi-verify");
    await expect(widget).toBeVisible();

    const startButton = widget.locator('[data-action="start"]');
    const backgroundColor = await startButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    expect(backgroundColor).toContain("rgb(255, 0, 0)");
  });
});

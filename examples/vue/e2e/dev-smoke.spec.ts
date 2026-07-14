import { test, expect } from "@playwright/test";

test.describe("Vue example (Vite dev)", () => {
  test("mounts the app shell", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Age Verification Required" }),
    ).toBeVisible();
    await expect(page.getByRole("status")).toContainText(
      "Simulated verification",
    );
  });

  test("loads without page errors", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/");
    await expect(page.locator("#app")).not.toBeEmpty();
    await expect(
      page.getByRole("heading", { name: "Age Verification Required" }),
    ).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test("renders the embed widget in idle state", async ({ page }) => {
    await page.goto("/");

    const widget = page.locator("eudi-verify");
    await expect(widget).toBeVisible();
    await expect(
      widget.getByRole("button", { name: "Verify with EU Wallet" }),
    ).toBeVisible();
  });

  test("starts verification on button click", async ({ page }) => {
    await page.goto("/");

    const widget = page.locator("eudi-verify");
    await widget.getByRole("button", { name: "Verify with EU Wallet" }).click();

    const activeState = widget.locator(
      [
        "#eudi-state-loading[data-active]",
        "#eudi-state-showQR[data-active]",
        "#eudi-state-waitingForWallet[data-active]",
        "#eudi-state-verified[data-active]",
      ].join(", "),
    );
    await expect(activeState).toBeVisible({ timeout: 5000 });
  });
});

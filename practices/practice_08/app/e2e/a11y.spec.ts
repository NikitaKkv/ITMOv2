import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { gotoApp } from "./helpers";

test.describe("доступность", () => {
  test("главный экран без нарушений axe", async ({ page }) => {
    await gotoApp(page);

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();

    expect(results.violations).toEqual([]);
  });
});

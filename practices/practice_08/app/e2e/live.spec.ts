import { expect, test } from "@playwright/test";
import { FORM, fillForm, gotoApp, submit } from "./helpers";

/**
 * Живой прогон против настоящего n8n. По умолчанию пропускается,
 * потому что создаёт реальный запрос и ставит лейбл в GitHub.
 *
 * Запуск: npm run test:e2e:live
 */
test.describe("живой webhook n8n", () => {
  test.skip(process.env["RUN_LIVE_E2E"] !== "1", "Запуск: npm run test:e2e:live");
  test.describe.configure({ timeout: 120_000 });

  test("n8n классифицирует Issue и возвращает лейбл", async ({ page }, testInfo) => {
    await gotoApp(page);
    await fillForm(page);
    await submit(page);

    // LLM + GitHub API отвечают несколько секунд.
    await expect(page.getByText(/Лейбл .*#20/)).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText("Результат", { exact: true })).toBeVisible();
    await expect(page.getByText(/^(bug|task|feature)$/).first()).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.getByText(FORM.title)).toBeVisible();

    await testInfo.attach("live-success", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  });
});

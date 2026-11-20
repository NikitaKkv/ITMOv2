import { expect, test } from "@playwright/test";
import { gotoApp } from "./helpers";

/**
 * Визуальная регрессия: сравниваем не с Lovable напрямую, а с утверждённым
 * platform-specific baseline этого же приложения. Ручные скриншоты в
 * screenshots/*.png остаются эталоном для глаз.
 *
 * Baseline: screenshots/baseline/<state>-chromium-linux.png
 * Обновление: npm run test:e2e:update
 */
const STATES = ["empty", "filled", "loading", "success", "error"] as const;

test.describe("визуальные состояния", () => {
  test.use({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });

  for (const state of STATES) {
    test(`состояние ${state} не изменилось`, async ({ page }) => {
      await gotoApp(page, `/?state=${state}`);

      // Демо-панель — инструмент разработчика, в эталон интерфейса не входит.
      await page.addStyleTag({
        content: '[data-testid="demo-panel"] { display: none !important; }',
      });

      // Ждём Inter, иначе первая снимаемая картинка может быть с fallback-шрифтом.
      await page.evaluate(() => document.fonts.ready);

      await expect(page).toHaveScreenshot(`${state}.png`, {
        fullPage: true,
        animations: "disabled",
        caret: "hide",
      });
    });
  }
});

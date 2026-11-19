import { expect, test } from "@playwright/test";
import { FORM, SUCCESS_BODY, fillForm, gotoApp, mockWebhook, submit } from "./helpers";

test.describe("Issue Classifier в реальном браузере", () => {
  test("пустой экран: подписи полей, кнопка и пустая история", async ({ page }) => {
    await gotoApp(page);

    await expect(page.getByRole("heading", { name: "Issue Classifier" })).toBeVisible();
    for (const label of ["Repository", "Issue number", "Title", "Body"]) {
      await expect(page.getByLabel(label)).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Классифицировать", exact: true })).toBeEnabled();
    await expect(page.getByText("Пока нет обработанных Issue")).toBeVisible();
    await expect(page.getByText("Здесь появится тип Issue и уверенность модели")).toBeVisible();
  });

  test("валидация: показывает ошибки и не отправляет запрос", async ({ page }) => {
    const calls = await mockWebhook(page, (route) => route.fulfill({ json: SUCCESS_BODY }));

    await gotoApp(page);
    await submit(page);

    await expect(page.getByText("Укажите репозиторий", { exact: true })).toBeVisible();
    await expect(page.getByText("Укажите номер Issue")).toBeVisible();
    await expect(page.getByText("Укажите заголовок")).toBeVisible();
    await expect(page.getByText("Опишите Issue")).toBeVisible();

    const repository = page.getByLabel("Repository");
    await expect(repository).toHaveAttribute("aria-invalid", "true");
    await expect(repository).toHaveAccessibleDescription("Укажите репозиторий");

    // Даём возможному запросу время уйти и проверяем, что его не было.
    await page.waitForTimeout(300);
    expect(calls).toHaveLength(0);
    await expect(page.getByText(/Лейбл .*#20/)).toHaveCount(0);
  });

  test("полный сценарий: ввод, запрос к webhook, результат и история", async ({
    page,
  }, testInfo) => {
    const calls = await mockWebhook(page, (route) => route.fulfill({ json: SUCCESS_BODY }));

    await gotoApp(page);
    await fillForm(page);
    await submit(page);

    await expect(page.getByText(/Лейбл .*#20/)).toBeVisible();
    await expect(page.getByText("0.98", { exact: true })).toHaveCount(2); // карточка + таблица
    await expect(page.getByText("bug", { exact: true })).toHaveCount(2);
    await expect(page.getByText(FORM.title)).toBeVisible();
    await expect(page.getByText("Пока нет обработанных Issue")).toHaveCount(0);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.body).toEqual({
      repository: FORM.repository,
      issueNumber: 20,
      title: FORM.title,
      body: FORM.body,
    });
    expect(calls[0]?.headers["content-type"]).toContain("application/json");

    await testInfo.attach("success", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  });

  test("загрузка: кнопка заблокирована, пока сервер не ответил", async ({ page }, testInfo) => {
    await mockWebhook(page, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.fulfill({ json: SUCCESS_BODY });
    });

    await gotoApp(page);
    await fillForm(page);
    await submit(page);

    await expect(page.getByRole("button", { name: /Классифицируем/ })).toBeDisabled();
    await expect(page.getByText("Анализируем текст Issue…")).toBeVisible();

    await testInfo.attach("loading", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });

    await expect(page.getByText(/Лейбл .*#20/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Классифицировать", exact: true })).toBeEnabled();
  });

  test("ошибка 502: сообщение сервера, сохранённый ввод и повтор", async ({ page }, testInfo) => {
    let attempt = 0;
    const calls = await mockWebhook(page, async (route) => {
      attempt += 1;
      if (attempt === 1) {
        await route.fulfill({
          status: 502,
          json: { error: "github", message: "Label could not be applied" },
        });
      } else {
        await route.fulfill({ json: SUCCESS_BODY });
      }
    });

    await gotoApp(page);
    await fillForm(page);
    await submit(page);

    await expect(page.getByRole("alert")).toContainText("Label could not be applied");
    await expect(page.getByLabel("Title")).toHaveValue(FORM.title);
    await expect(page.getByLabel("Body")).toHaveValue(FORM.body);

    const retry = page.getByRole("button", { name: "Повторить", exact: true });
    await expect(retry).toBeEnabled();

    await testInfo.attach("error", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });

    await retry.click();
    await expect(page.getByText(/Лейбл .*#20/)).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect(calls).toHaveLength(2);
  });

  test("двойной submit во время запроса создаёт только один запрос", async ({ page }) => {
    const calls = await mockWebhook(page, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 700));
      await route.fulfill({ json: SUCCESS_BODY });
    });

    await gotoApp(page);
    await fillForm(page);

    // Два submit в одном тике — как двойной Enter или двойной клик.
    await page.locator("form").evaluate((form) => {
      if (!(form instanceof HTMLFormElement)) throw new Error("form not found");
      form.requestSubmit();
      form.requestSubmit();
    });

    await expect(page.getByRole("button", { name: /Классифицируем/ })).toBeDisabled();
    await expect(page.getByText(/Лейбл .*#20/)).toBeVisible({ timeout: 10_000 });
    expect(calls).toHaveLength(1);
  });

  test("клавиатура: Tab по полям, видимый фокус и Enter отправляет форму", async ({ page }) => {
    const calls = await mockWebhook(page, (route) => route.fulfill({ json: SUCCESS_BODY }));

    await gotoApp(page);
    await page.getByLabel("Repository").focus();
    await expect(page.getByLabel("Repository")).toBeFocused();

    const ring = await page
      .getByLabel("Repository")
      .evaluate((element) => getComputedStyle(element).boxShadow);
    expect(ring).not.toBe("none");

    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Issue number")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Title")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Body")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Классифицировать", exact: true })).toBeFocused();

    // Заполняем и отправляем с клавиатуры из поля Title.
    await fillForm(page);
    await page.getByLabel("Title").focus();
    await page.keyboard.press("Enter");

    await expect(page.getByText(/Лейбл .*#20/)).toBeVisible();
    expect(calls).toHaveLength(1);
  });
});

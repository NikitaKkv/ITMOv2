import { type Page, type Route } from "@playwright/test";

/** Адрес, который playwright.config.ts передаёт приложению вместо реального webhook. */
export const WEBHOOK_GLOB = "**/mock/webhook";

export const FORM = {
  repository: "NikitaKkv/AvitoSample",
  issueNumber: "20",
  title: "Приложение падает при загрузке аватара",
  body: "Нажимаю загрузить фото и всё зависает. Ожидал сообщение об ошибке, получил белый экран.",
};

/** Ответ один в один как у production-webhook n8n. */
export const SUCCESS_BODY = {
  repository: FORM.repository,
  issueNumber: Number(FORM.issueNumber),
  type: "bug",
  confidence: 0.98,
  label: "bug",
  needsTriage: false,
};

export interface WebhookCall {
  body: Record<string, unknown>;
  headers: Record<string, string>;
}

type Responder = (route: Route, call: WebhookCall) => Promise<void> | void;

/**
 * Подменяет ответ сервера и записывает все фактические вызовы.
 * Возвращает массив, который пополняется по мере запросов.
 */
export async function mockWebhook(page: Page, respond: Responder): Promise<WebhookCall[]> {
  const calls: WebhookCall[] = [];

  await page.route(WEBHOOK_GLOB, async (route) => {
    const request = route.request();
    const call: WebhookCall = {
      body: (request.postDataJSON() ?? {}) as Record<string, unknown>,
      headers: request.headers(),
    };
    calls.push(call);
    await respond(route, call);
  });

  return calls;
}

export async function fillForm(page: Page, form: typeof FORM = FORM) {
  await page.getByLabel("Repository").fill(form.repository);
  await page.getByLabel("Issue number").fill(form.issueNumber);
  await page.getByLabel("Title").fill(form.title);
  await page.getByLabel("Body").fill(form.body);
}

/** Открывает приложение и ждёт гидратацию React, иначе submit уйдёт нативным GET. */
export async function gotoApp(page: Page, path = "/") {
  await page.goto(path);
  await page.waitForFunction(() => document.documentElement.dataset["appHydrated"] === "true");
}

export async function submit(page: Page) {
  await page.getByRole("button", { name: "Классифицировать", exact: true }).click();
}

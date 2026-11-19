import { http, HttpResponse } from "msw";

export const API_URL = "http://localhost/api/classify";

/** Ответ полностью повторяет формат production-webhook n8n. */
export const successBody = {
  repository: "NikitaKkv/AvitoSample",
  issueNumber: 20,
  type: "bug",
  confidence: 0.98,
  label: "bug",
  needsTriage: false,
};

export const successHandler = http.post(API_URL, () => HttpResponse.json(successBody));

export const errorHandler = http.post(API_URL, () =>
  HttpResponse.json({ error: "github", message: "Label could not be applied" }, { status: 502 }),
);

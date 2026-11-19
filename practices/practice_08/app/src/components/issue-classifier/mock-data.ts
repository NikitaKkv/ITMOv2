import type { IssueType, ProcessedIssue, RequestStatus } from "@/lib/types";
import { EMPTY_FORM, type IssueForm } from "@/lib/types";

export type { IssueType };

export type ScreenState = "empty" | "filled" | "loading" | "success" | "error";

export const SCREEN_STATES: { value: ScreenState; label: string }[] = [
  { value: "empty", label: "Empty" },
  { value: "filled", label: "Filled" },
  { value: "loading", label: "Loading" },
  { value: "success", label: "Success" },
  { value: "error", label: "Error" },
];

export const DEMO_ERROR = "Не удалось классифицировать, попробуйте снова";

export { EMPTY_FORM };
export type { IssueForm };

export const SAMPLE_FORM: IssueForm = {
  repository: "acme/web-app",
  issueNumber: "42",
  title: "Приложение падает при загрузке аватара больше 5 МБ",
  body: "Шаги воспроизведения:\n1. Открыть профиль\n2. Загрузить PNG размером 6 МБ\n\nОжидалось: сообщение об ограничении размера.\nФактически: белый экран и ошибка 500 в консоли.",
};

export const SAMPLE_RESULT: ProcessedIssue = {
  repository: "acme/web-app",
  issueNumber: 42,
  title: SAMPLE_FORM.title,
  type: "bug",
  confidence: 0.93,
  label: "bug",
  needsTriage: false,
};

export const HISTORY: ProcessedIssue[] = [
  {
    repository: "acme/web-app",
    issueNumber: 39,
    title: "Добавить экспорт отчёта в CSV",
    type: "feature",
    confidence: 0.88,
    label: "feature",
    needsTriage: false,
  },
  {
    repository: "acme/api",
    issueNumber: 117,
    title: "Настроить вебхуки для staging",
    type: "task",
    confidence: 0.79,
    label: "needs-triage",
    needsTriage: true,
  },
  {
    repository: "acme/web-app",
    issueNumber: 35,
    title: "Кнопка «Сохранить» не реагирует в Safari",
    type: "bug",
    confidence: 0.91,
    label: "bug",
    needsTriage: false,
  },
];

export function formForState(state: ScreenState): IssueForm {
  return state === "empty" ? EMPTY_FORM : SAMPLE_FORM;
}

export function statusForState(state: ScreenState): RequestStatus {
  if (state === "loading") return "loading";
  if (state === "success") return "success";
  if (state === "error") return "error";
  return "idle";
}

export function resultForState(state: ScreenState): ProcessedIssue | null {
  return state === "success" ? SAMPLE_RESULT : null;
}

export function historyForState(state: ScreenState): ProcessedIssue[] {
  if (state === "empty") return [];
  if (state === "success") return [SAMPLE_RESULT, ...HISTORY];
  return HISTORY;
}

/** Reads the `?state=` URL value; anything that isn't one of the 5 states means "no demo state". */
export function parseScreenState(value: unknown): ScreenState | undefined {
  return SCREEN_STATES.some((s) => s.value === value) ? (value as ScreenState) : undefined;
}

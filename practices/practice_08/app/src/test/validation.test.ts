import { describe, expect, it } from "vitest";
import { toPayload, validateForm } from "@/lib/validation";
import { VALID_FORM } from "./test-utils";

describe("валидация формы", () => {
  it("пропускает корректно заполненную форму", () => {
    expect(validateForm(VALID_FORM)).toEqual({});
  });

  it("требует все поля", () => {
    expect(validateForm({ repository: "", issueNumber: "", title: "", body: "" })).toEqual({
      repository: "Укажите репозиторий",
      issueNumber: "Укажите номер Issue",
      title: "Укажите заголовок",
      body: "Опишите Issue",
    });
  });

  it("не принимает строку из пробелов", () => {
    const errors = validateForm({ ...VALID_FORM, title: "     " });
    expect(errors.title).toBe("Укажите заголовок");
  });

  it("проверяет формат repository", () => {
    expect(validateForm({ ...VALID_FORM, repository: "AvitoSample" }).repository).toBe(
      "Формат: owner/name",
    );
  });

  it("проверяет номер Issue", () => {
    expect(validateForm({ ...VALID_FORM, issueNumber: "0" }).issueNumber).toBe(
      "Номер Issue — целое число больше 0",
    );
    expect(validateForm({ ...VALID_FORM, issueNumber: "-3" }).issueNumber).toBeTruthy();
    expect(validateForm({ ...VALID_FORM, issueNumber: "1.5" }).issueNumber).toBeTruthy();
  });

  it("проверяет длину заголовка и текста", () => {
    expect(validateForm({ ...VALID_FORM, title: "abc" }).title).toBe(
      "Заголовок должен быть от 5 до 120 символов",
    );
    expect(validateForm({ ...VALID_FORM, body: "коротко" }).body).toBe("Минимум 10 символов");
  });

  it("преобразует форму в тело запроса", () => {
    expect(toPayload(VALID_FORM)).toEqual({
      repository: "NikitaKkv/AvitoSample",
      issueNumber: 20,
      title: "Приложение падает при загрузке аватара",
      body: "Нажимаю загрузить фото и всё зависает",
    });
  });
});

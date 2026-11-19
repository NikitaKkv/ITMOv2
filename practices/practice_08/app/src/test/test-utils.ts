import { screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";

export const VALID_FORM = {
  repository: "NikitaKkv/AvitoSample",
  issueNumber: "20",
  title: "Приложение падает при загрузке аватара",
  body: "Нажимаю загрузить фото и всё зависает",
};

/** Заполняет форму так, как это сделал бы пользователь. */
export async function fillValidForm(user: UserEvent) {
  await user.type(screen.getByLabelText("Repository"), VALID_FORM.repository);
  await user.type(screen.getByLabelText("Issue number"), VALID_FORM.issueNumber);
  await user.type(screen.getByLabelText("Title"), VALID_FORM.title);
  await user.type(screen.getByLabelText("Body"), VALID_FORM.body);
}

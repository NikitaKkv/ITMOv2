import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { IssueClassifier } from "@/components/issue-classifier/IssueClassifier";
import { API_URL, successBody } from "./mocks";
import { server } from "./server";
import { fillValidForm } from "./test-utils";

describe("форма классификации", () => {
  it("показывает подписи полей и пустую историю", () => {
    render(<IssueClassifier />);

    expect(screen.getByLabelText("Repository")).toBeInTheDocument();
    expect(screen.getByLabelText("Issue number")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Body")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Классифицировать/ })).toBeEnabled();
    expect(screen.getByText("Пока нет обработанных Issue")).toBeInTheDocument();
  });

  it("показывает сообщения об ошибках и не отправляет запрос", async () => {
    let requests = 0;
    server.use(
      http.post(API_URL, () => {
        requests += 1;
        return HttpResponse.json(successBody);
      }),
    );

    const user = userEvent.setup();
    render(<IssueClassifier />);

    await user.click(screen.getByRole("button", { name: /Классифицировать/ }));

    expect(screen.getByText("Укажите репозиторий")).toBeInTheDocument();
    expect(screen.getByText("Укажите номер Issue")).toBeInTheDocument();
    expect(screen.getByText("Укажите заголовок")).toBeInTheDocument();
    expect(screen.getByText("Опишите Issue")).toBeInTheDocument();

    const repository = screen.getByLabelText("Repository");
    expect(repository).toHaveAttribute("aria-invalid", "true");
    expect(repository).toHaveAccessibleDescription("Укажите репозиторий");

    // Даём возможному запросу время уйти и убеждаемся, что его не было.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(requests).toBe(0);
    expect(screen.queryByText(/Лейбл проставлен/)).not.toBeInTheDocument();
  });

  it("проверяет формат полей", async () => {
    const user = userEvent.setup();
    render(<IssueClassifier />);

    await user.type(screen.getByLabelText("Repository"), "AvitoSample");
    await user.type(screen.getByLabelText("Issue number"), "0");
    await user.type(screen.getByLabelText("Title"), "abc");
    await user.type(screen.getByLabelText("Body"), "коротко");
    await user.click(screen.getByRole("button", { name: /Классифицировать/ }));

    expect(screen.getByText("Формат: owner/name")).toBeInTheDocument();
    expect(screen.getByText("Номер Issue — целое число больше 0")).toBeInTheDocument();
    expect(screen.getByText("Заголовок должен быть от 5 до 120 символов")).toBeInTheDocument();
    expect(screen.getByText("Минимум 10 символов")).toBeInTheDocument();
  });

  it("убирает ошибку поля, когда пользователь начинает ввод", async () => {
    const user = userEvent.setup();
    render(<IssueClassifier />);

    await user.click(screen.getByRole("button", { name: /Классифицировать/ }));
    expect(screen.getByText("Укажите репозиторий")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Repository"), "NikitaKkv/AvitoSample");
    expect(screen.queryByText("Укажите репозиторий")).not.toBeInTheDocument();
  });

  it("показывает загрузку и блокирует кнопку до ответа сервера", async () => {
    server.use(
      http.post(API_URL, async () => {
        await delay(300);
        return HttpResponse.json(successBody);
      }),
    );

    const user = userEvent.setup();
    render(<IssueClassifier />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /Классифицировать/ }));

    expect(screen.getByRole("button", { name: /Классифицируем/ })).toBeDisabled();
    expect(screen.getByText("Анализируем текст Issue…")).toBeInTheDocument();

    expect(await screen.findAllByText("0.98")).not.toHaveLength(0);
    expect(screen.getByRole("button", { name: /Классифицировать/ })).toBeEnabled();
  });
});

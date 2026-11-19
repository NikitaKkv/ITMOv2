import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { IssueClassifier } from "@/components/issue-classifier/IssueClassifier";
import { successHandler } from "./mocks";
import { server } from "./server";
import { fillValidForm, VALID_FORM } from "./test-utils";

describe("основной пользовательский сценарий", () => {
  it("мейнтейнер вводит Issue, отправляет его и видит результат с лейблом", async () => {
    server.use(successHandler);
    const user = userEvent.setup();

    render(<IssueClassifier />);

    // 1. Исходное состояние: пустая форма и пустая история.
    expect(screen.getByText("Пока нет обработанных Issue")).toBeInTheDocument();

    // 2. Действие пользователя.
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /Классифицировать/ }));

    // 3. Видимый результат: тип, уверенность и применённый лейбл.
    expect(await screen.findByText("Лейбл проставлен в #20")).toBeInTheDocument();
    expect(screen.getAllByText("0.98")).not.toHaveLength(0);
    expect(screen.getAllByText("bug").length).toBeGreaterThan(0);

    // 4. Результат попал в историю обработанных Issue.
    expect(screen.getByText(VALID_FORM.title)).toBeInTheDocument();
    expect(screen.queryByText("Пока нет обработанных Issue")).not.toBeInTheDocument();
  });
});

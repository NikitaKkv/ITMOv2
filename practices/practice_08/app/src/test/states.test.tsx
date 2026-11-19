import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { IssueClassifier } from "@/components/issue-classifier/IssueClassifier";
import { errorHandler, successHandler } from "./mocks";
import { server } from "./server";
import { fillValidForm, VALID_FORM } from "./test-utils";

describe("состояния интерфейса", () => {
  it("после успешного ответа показывает тип, confidence и лейбл", async () => {
    server.use(successHandler);

    const user = userEvent.setup();
    render(<IssueClassifier />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /Классифицировать/ }));

    expect(await screen.findByText("Лейбл проставлен в #20")).toBeInTheDocument();
    expect(screen.getAllByText("0.98")).not.toHaveLength(0);
    expect(screen.getAllByText("bug").length).toBeGreaterThan(0);
    expect(screen.getByText(VALID_FORM.title)).toBeInTheDocument();
  });

  it("при ошибке сохраняет ввод, показывает сообщение и позволяет повторить", async () => {
    server.use(errorHandler);

    const user = userEvent.setup();
    render(<IssueClassifier />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /Классифицировать/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Label could not be applied");
    expect(screen.getByLabelText("Title")).toHaveValue(VALID_FORM.title);
    expect(screen.getByLabelText("Body")).toHaveValue(VALID_FORM.body);

    const retry = screen.getByRole("button", { name: /Повторить/ });
    expect(retry).toBeEnabled();

    server.use(successHandler);
    await user.click(retry);
    expect(await screen.findByText("Лейбл проставлен в #20")).toBeInTheDocument();
  });

  it("не создаёт дубль в истории при повторной классификации того же Issue", async () => {
    server.use(successHandler);

    const user = userEvent.setup();
    render(<IssueClassifier />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /Классифицировать/ }));
    expect(await screen.findByText("Лейбл проставлен в #20")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Классифицировать/ }));
    expect(await screen.findAllByText("Лейбл проставлен в #20")).toHaveLength(1);
    expect(screen.getAllByText(VALID_FORM.title)).toHaveLength(1);
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { IssueClassifier } from "@/components/issue-classifier/IssueClassifier";
import { API_URL, successBody } from "./mocks";
import { server } from "./server";
import { fillValidForm } from "./test-utils";

describe("защита от повторной отправки", () => {
  it("два submit подряд во время ожидания создают только один запрос", async () => {
    let requests = 0;
    server.use(
      http.post(API_URL, async () => {
        requests += 1;
        await delay(200);
        return HttpResponse.json(successBody);
      }),
    );

    const user = userEvent.setup();
    render(<IssueClassifier />);
    await fillValidForm(user);

    const form = screen.getByRole("button", { name: /Классифицировать/ }).closest("form");
    expect(form).not.toBeNull();

    // Два нажатия Enter/сабмита до того, как пришёл ответ.
    fireEvent.submit(form!);
    fireEvent.submit(form!);

    await waitFor(() => expect(requests).toBe(1));
    expect(await screen.findAllByText("0.98")).not.toHaveLength(0);
  });

  it("повторный клик по кнопке во время загрузки не создаёт второй запрос", async () => {
    let requests = 0;
    server.use(
      http.post(API_URL, async () => {
        requests += 1;
        await delay(200);
        return HttpResponse.json(successBody);
      }),
    );

    const user = userEvent.setup();
    render(<IssueClassifier />);
    await fillValidForm(user);

    const button = screen.getByRole("button", { name: /Классифицировать/ });
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(requests).toBe(1));
    expect(await screen.findAllByText("0.98")).not.toHaveLength(0);
  });
});

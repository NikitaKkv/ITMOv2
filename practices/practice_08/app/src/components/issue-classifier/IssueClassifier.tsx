import { useEffect, useRef, useState } from "react";
import { classifyIssue, ApiError } from "@/lib/api";
import { toPayload, validateForm, type FieldErrors } from "@/lib/validation";
import type { IssueForm, ProcessedIssue, RequestStatus } from "@/lib/types";
import { ClassifyForm } from "./ClassifyForm";
import { DemoPanel } from "./DemoPanel";
import {
  DEMO_ERROR,
  EMPTY_FORM,
  formForState,
  HISTORY,
  historyForState,
  resultForState,
  SAMPLE_RESULT,
  statusForState,
  type ScreenState,
} from "./mock-data";
import { ProcessedTable } from "./ProcessedTable";
import { ResultCard } from "./ResultCard";

interface Props {
  /** Demo state from the URL (`?state=`); undefined = normal flow using the real webhook. */
  demoState?: ScreenState | undefined;
  onDemoStateChange?: (state: ScreenState) => void;
}

const issueKey = (issue: ProcessedIssue) => `${issue.repository}#${issue.issueNumber}`;

export function IssueClassifier({ demoState, onDemoStateChange }: Props) {
  const demo = demoState !== undefined;

  const [status, setStatus] = useState<RequestStatus>(demo ? statusForState(demoState) : "idle");
  const [form, setForm] = useState<IssueForm>(demo ? formForState(demoState) : EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<ProcessedIssue | null>(
    demo ? resultForState(demoState) : null,
  );
  const [history, setHistory] = useState<ProcessedIssue[]>(demo ? historyForState(demoState) : []);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    demoState === "error" ? DEMO_ERROR : null,
  );

  const inFlight = useRef(false);
  const demoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Маркер для e2e: до гидратации форма отправилась бы нативным GET-запросом.
  useEffect(() => {
    document.documentElement.dataset["appHydrated"] = "true";
  }, []);

  // Follow URL changes from the demo panel, back/forward or an edited ?state= link.
  useEffect(() => {
    if (!demoState) return;
    if (demoTimer.current) clearTimeout(demoTimer.current);
    setStatus(statusForState(demoState));
    setForm(formForState(demoState));
    setErrors({});
    setResult(resultForState(demoState));
    setHistory(historyForState(demoState));
    setErrorMessage(demoState === "error" ? DEMO_ERROR : null);
  }, [demoState]);

  const resetToDemoState = (next: ScreenState) => {
    if (demoTimer.current) clearTimeout(demoTimer.current);
    setStatus(statusForState(next));
    setForm(formForState(next));
    setErrors({});
    setResult(resultForState(next));
    setHistory(historyForState(next));
    setErrorMessage(next === "error" ? DEMO_ERROR : null);
  };

  const changeField = (field: keyof IssueForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const submit = async () => {
    // Demo mode: the published mockup must stay clickable without a backend.
    if (demo) {
      if (demoTimer.current) clearTimeout(demoTimer.current);
      setStatus("loading");
      setErrorMessage(null);
      demoTimer.current = setTimeout(() => {
        setStatus("success");
        setResult(SAMPLE_RESULT);
        setHistory([SAMPLE_RESULT, ...HISTORY]);
      }, 1200);
      return;
    }

    // Second click or Enter while a request is in flight must not send another one.
    if (inFlight.current) return;

    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    inFlight.current = true;
    setStatus("loading");
    setErrorMessage(null);

    try {
      const payload = toPayload(form);
      const response = await classifyIssue(payload);
      const processed: ProcessedIssue = { ...response, title: payload.title };
      setResult(processed);
      setHistory((prev) => [processed, ...prev.filter((item) => issueKey(item) !== issueKey(processed))]);
      setStatus("success");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Не удалось классифицировать Issue",
      );
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  };

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-6xl space-y-8 px-4 pb-28 pt-10 sm:px-6 sm:pb-28 sm:pt-14">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Issue Classifier</h1>
          <p className="max-w-2xl text-muted-foreground">
            Определяет тип GitHub Issue — bug, task или feature — и проставляет лейбл в
            репозитории.
          </p>
        </header>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-8">
          <ClassifyForm
            form={form}
            errors={errors}
            status={status}
            errorMessage={errorMessage}
            onChange={changeField}
            onSubmit={submit}
          />
          <ResultCard status={status} result={result} />
        </div>
        <ProcessedTable rows={history} />
      </main>
      <DemoPanel
        value={demoState ?? "empty"}
        onChange={(next) => {
          resetToDemoState(next);
          onDemoStateChange?.(next);
        }}
      />
    </div>
  );
}

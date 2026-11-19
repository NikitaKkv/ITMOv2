import { AlertCircle, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FieldErrors } from "@/lib/validation";
import type { IssueForm, RequestStatus } from "@/lib/types";

interface Props {
  form: IssueForm;
  errors: FieldErrors;
  status: RequestStatus;
  errorMessage: string | null;
  onChange: (field: keyof IssueForm, value: string) => void;
  onSubmit: () => void;
}

export function ClassifyForm({ form, errors, status, errorMessage, onChange, onSubmit }: Props) {
  const loading = status === "loading";
  const failed = status === "error";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Новый Issue</CardTitle>
        <CardDescription>Укажите репозиторий и содержимое Issue для классификации.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          aria-busy={loading}
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="grid gap-5 sm:grid-cols-[1fr_9rem]">
            <div className="space-y-2">
              <Label htmlFor="repository">Repository</Label>
              <Input
                id="repository"
                placeholder="owner/repo"
                autoComplete="off"
                value={form.repository}
                aria-invalid={errors.repository ? true : undefined}
                aria-describedby={errors.repository ? "repository-error" : undefined}
                onChange={(event) => onChange("repository", event.target.value)}
              />
              {errors.repository && (
                <p id="repository-error" className="text-sm text-destructive">
                  {errors.repository}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="issue-number">Issue number</Label>
              <Input
                id="issue-number"
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="42"
                value={form.issueNumber}
                aria-invalid={errors.issueNumber ? true : undefined}
                aria-describedby={errors.issueNumber ? "issue-number-error" : undefined}
                onChange={(event) => onChange("issueNumber", event.target.value)}
              />
              {errors.issueNumber && (
                <p id="issue-number-error" className="text-sm text-destructive">
                  {errors.issueNumber}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Кратко опишите проблему"
              value={form.title}
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={errors.title ? "title-error" : undefined}
              onChange={(event) => onChange("title", event.target.value)}
            />
            {errors.title && (
              <p id="title-error" className="text-sm text-destructive">
                {errors.title}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              rows={6}
              placeholder="Текст Issue: шаги воспроизведения, ожидаемое и фактическое поведение"
              value={form.body}
              aria-invalid={errors.body ? true : undefined}
              aria-describedby={errors.body ? "body-error" : undefined}
              onChange={(event) => onChange("body", event.target.value)}
            />
            {errors.body && (
              <p id="body-error" className="text-sm text-destructive">
                {errors.body}
              </p>
            )}
          </div>

          {failed && errorMessage && (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                Классифицируем…
              </>
            ) : failed ? (
              <>
                <RotateCcw />
                Повторить
              </>
            ) : (
              <>
                <Sparkles />
                Классифицировать
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

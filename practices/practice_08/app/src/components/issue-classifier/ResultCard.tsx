import { CheckCircle2, Inbox, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProcessedIssue, RequestStatus } from "@/lib/types";
import { TypeBadge } from "./TypeBadge";

interface Props {
  status: RequestStatus;
  result: ProcessedIssue | null;
}

export function ResultCard({ status, result }: Props) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="text-lg">Результат</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {status === "success" && result ? (
          <Success issue={result} />
        ) : (
          <Placeholder loading={status === "loading"} />
        )}
      </CardContent>
    </Card>
  );
}

function Placeholder({ loading }: { loading: boolean }) {
  return (
    <div className="flex min-h-56 flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted px-6 py-10 text-center">
      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
      ) : (
        <Inbox className="h-6 w-6 text-muted-foreground" aria-hidden />
      )}
      <p className="text-sm text-muted-foreground">
        {loading ? "Анализируем текст Issue…" : "Здесь появится тип Issue и уверенность модели"}
      </p>
    </div>
  );
}

function Success({ issue }: { issue: ProcessedIssue }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Тип</p>
        <TypeBadge type={issue.type} className="px-3 py-1 text-sm" />
      </div>
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-muted-foreground">Confidence</p>
          <p className="text-2xl font-semibold tabular-nums">{issue.confidence.toFixed(2)}</p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div
            className="h-full rounded-full bg-success"
            style={{ width: `${issue.confidence * 100}%` }}
          />
        </div>
      </div>
      <div className="flex items-start gap-2 rounded-lg bg-success-soft px-4 py-3 text-sm">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
        <span>
          {issue.needsTriage
            ? `Лейбл needs-triage проставлен в #${issue.issueNumber}`
            : `Лейбл проставлен в #${issue.issueNumber}`}
        </span>
      </div>
    </div>
  );
}

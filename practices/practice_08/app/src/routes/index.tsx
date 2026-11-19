import { createFileRoute } from "@tanstack/react-router";
import { IssueClassifier } from "@/components/issue-classifier/IssueClassifier";
import { parseScreenState, type ScreenState } from "@/components/issue-classifier/mock-data";

export const Route = createFileRoute("/")({
  // ?state=empty|filled|loading|success|error opens the screen in that demo state.
  validateSearch: (search: Record<string, unknown>): { state?: ScreenState } => {
    const state = parseScreenState(search["state"]);
    return state ? { state } : {};
  },
  head: () => ({
    meta: [
      { title: "Issue Classifier — классификация GitHub Issue" },
      {
        name: "description",
        content: "Внутренний инструмент: определяет тип GitHub Issue и проставляет лейбл.",
      },
      { property: "og:title", content: "Issue Classifier — классификация GitHub Issue" },
      {
        property: "og:description",
        content: "Внутренний инструмент: определяет тип GitHub Issue и проставляет лейбл.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IndexPage,
});

function IndexPage() {
  const { state } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <IssueClassifier
      demoState={state}
      onDemoStateChange={(next) => navigate({ search: { state: next }, replace: true })}
    />
  );
}

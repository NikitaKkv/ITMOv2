import { Badge } from "@/components/ui/badge";
import type { IssueType } from "@/lib/types";

const VARIANT: Record<IssueType, "success" | "accent" | "outline"> = {
  bug: "success",
  task: "outline",
  feature: "accent",
};

export function TypeBadge({ type, className }: { type: IssueType; className?: string }) {
  return (
    <Badge variant={VARIANT[type]} className={className}>
      {type}
    </Badge>
  );
}

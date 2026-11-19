import { describe, expect, it } from "vitest";
import { HISTORY, SAMPLE_RESULT, type IssueType } from "@/components/issue-classifier/mock-data";

const ALLOWED: string[] = ["bug", "task", "feature"];

describe("allowed issue types", () => {
  it("only ever uses bug, task or feature", () => {
    const types: string[] = [SAMPLE_RESULT.type, ...HISTORY.map((r) => r.type as IssueType)];
    expect(types.every((t) => ALLOWED.includes(t))).toBe(true);
    expect(types.includes("question")).toBe(false);
  });

  it("keeps the mock rows in the expected types", () => {
    expect(SAMPLE_RESULT.type).toBe("bug");
    expect(HISTORY.map((r) => r.type)).toEqual(["feature", "task", "bug"]);
  });
});

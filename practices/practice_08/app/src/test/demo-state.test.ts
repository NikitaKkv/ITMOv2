import { describe, expect, it } from "vitest";
import { parseScreenState } from "@/components/issue-classifier/mock-data";

describe("?state= demo param", () => {
  it.each(["empty", "filled", "loading", "success", "error"])("accepts %s", (v) => {
    expect(parseScreenState(v)).toBe(v);
  });

  it("ignores unknown or missing values so the normal flow runs", () => {
    expect(parseScreenState("done")).toBeUndefined();
    expect(parseScreenState(undefined)).toBeUndefined();
  });
});

import { describe, it, expect } from "vitest";
import { COMPLETION_TAG } from "../src/completion.ts";

describe("COMPLETION_TAG regex", () => {
  it("matches the canonical form", () => {
    expect(COMPLETION_TAG.test("<promise>DONE</promise>")).toBe(true);
  });

  it("matches with surrounding whitespace inside the tag", () => {
    expect(COMPLETION_TAG.test("<promise>  DONE  </promise>")).toBe(true);
    expect(COMPLETION_TAG.test("<promise>\nDONE\n</promise>")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(COMPLETION_TAG.test("<PROMISE>done</PROMISE>")).toBe(true);
    expect(COMPLETION_TAG.test("<Promise>Done</Promise>")).toBe(true);
  });

  it("matches inside larger text", () => {
    const blob = "I finished the work.\n\n<promise>DONE</promise>\n\nMoving on.";
    expect(COMPLETION_TAG.test(blob)).toBe(true);
  });

  it("does not match when the inner token is not DONE", () => {
    expect(COMPLETION_TAG.test("<promise>WIP</promise>")).toBe(false);
    expect(COMPLETION_TAG.test("<promise>almost done</promise>")).toBe(false);
  });

  it("does not match a stray DONE outside the tag", () => {
    expect(COMPLETION_TAG.test("DONE")).toBe(false);
    expect(COMPLETION_TAG.test("the task is DONE")).toBe(false);
  });
});

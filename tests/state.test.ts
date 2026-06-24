import { describe, it, expect } from "vitest";
import { parseState, serializeState, type RalphState } from "../src/state.ts";

describe("parseState", () => {
  it("returns defaults when no frontmatter is present", () => {
    expect(parseState("")).toEqual({
      active: false,
      iteration: 0,
      maxIterations: 100,
    });
  });

  it("returns defaults when content has no frontmatter delimiters", () => {
    expect(parseState("just some text")).toEqual({
      active: false,
      iteration: 0,
      maxIterations: 100,
    });
  });

  it("parses active, iteration, maxIterations, sessionId", () => {
    const content = [
      "---",
      "active: true",
      "iteration: 7",
      "maxIterations: 50",
      "sessionId: ses_abc123",
      "---",
    ].join("\n");

    expect(parseState(content)).toEqual({
      active: true,
      iteration: 7,
      maxIterations: 50,
      sessionId: "ses_abc123",
    });
  });

  it("treats `active: anything-but-true` as false", () => {
    const content = "---\nactive: false\niteration: 1\nmaxIterations: 10\n---";
    expect(parseState(content).active).toBe(false);
  });

  it("captures the body as the prompt", () => {
    const content = [
      "---",
      "active: true",
      "iteration: 0",
      "maxIterations: 100",
      "---",
      "",
      "Build a REST API",
    ].join("\n");

    expect(parseState(content).prompt).toBe("Build a REST API");
  });

  it("preserves colons inside session IDs", () => {
    const content = "---\nactive: true\nsessionId: ses:foo:bar\niteration: 0\nmaxIterations: 100\n---";
    expect(parseState(content).sessionId).toBe("ses:foo:bar");
  });

  it("parses CRLF-encoded state files (Windows line endings)", () => {
    const content = "---\r\nactive: true\r\niteration: 5\r\nmaxIterations: 50\r\nsessionId: ses_win\r\n---\r\n\r\nWindows-saved task";
    expect(parseState(content)).toEqual({
      active: true,
      iteration: 5,
      maxIterations: 50,
      sessionId: "ses_win",
      prompt: "Windows-saved task",
    });
  });
});

describe("serializeState", () => {
  it("emits the frontmatter delimiters and required fields", () => {
    const state: RalphState = { active: true, iteration: 3, maxIterations: 100 };
    const out = serializeState(state);

    expect(out).toMatch(/^---\n/);
    expect(out).toContain("active: true");
    expect(out).toContain("iteration: 3");
    expect(out).toContain("maxIterations: 100");
  });

  it("omits sessionId when absent", () => {
    const out = serializeState({ active: false, iteration: 0, maxIterations: 100 });
    expect(out).not.toContain("sessionId");
  });

  it("includes the prompt body when set", () => {
    const out = serializeState({
      active: true,
      iteration: 1,
      maxIterations: 100,
      prompt: "Ship it",
    });
    expect(out).toContain("\nShip it");
  });
});

describe("parseState <-> serializeState round trip", () => {
  it("survives a round trip with all fields set", () => {
    const original: RalphState = {
      active: true,
      iteration: 12,
      maxIterations: 200,
      sessionId: "ses_xyz",
      prompt: "Build a REST API with auth",
    };
    expect(parseState(serializeState(original))).toEqual(original);
  });

  it("survives a round trip with only required fields", () => {
    const original: RalphState = {
      active: false,
      iteration: 0,
      maxIterations: 100,
    };
    expect(parseState(serializeState(original))).toEqual(original);
  });
});

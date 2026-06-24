// State serialization for ralph-loop.local.md.
//
// Lives outside src/index.ts on purpose. opencode's plugin loader iterates
// `Object.values(module)` of the entrypoint and treats every function as a
// plugin initializer — calling it with the plugin context. State helpers
// that take `string` arguments would crash on `undefined.match(...)`. By
// keeping them in a sibling module we (a) avoid the loader tripping on
// them and (b) keep the entrypoint's export surface limited to `default`,
// which is what the loader expects. See #16 for the prior fix of this
// same shape (COMPLETION_TAG → ./completion.ts). See tests/state.test.ts
// for the canonical consumers of these helpers.

export interface RalphState {
  active: boolean;
  iteration: number;
  maxIterations: number;
  sessionId?: string;
  prompt?: string;
}

// Parse markdown frontmatter state. Regex accepts CRLF for cross-platform state files.
export function parseState(content: string): RalphState {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { active: false, iteration: 0, maxIterations: 100 };

  const frontmatter = match[1];
  const state: RalphState = { active: false, iteration: 0, maxIterations: 100 };

  for (const line of frontmatter.split(/\r?\n/)) {
    const [key, ...valueParts] = line.split(":");
    const value = valueParts.join(":").trim();
    if (key === "active") state.active = value === "true";
    if (key === "iteration") state.iteration = parseInt(value) || 0;
    if (key === "maxIterations") state.maxIterations = parseInt(value) || 100;
    if (key === "sessionId") state.sessionId = value || undefined;
  }

  // Get prompt from body (after frontmatter)
  const body = content.slice(match[0].length).trim();
  if (body) state.prompt = body;

  return state;
}

// Serialize state to markdown frontmatter
export function serializeState(state: RalphState): string {
  const lines = [
    "---",
    `active: ${state.active}`,
    `iteration: ${state.iteration}`,
    `maxIterations: ${state.maxIterations}`,
  ];
  if (state.sessionId) lines.push(`sessionId: ${state.sessionId}`);
  lines.push("---");
  if (state.prompt) lines.push("", state.prompt);
  return lines.join("\n");
}

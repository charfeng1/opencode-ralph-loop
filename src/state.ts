// Lives outside src/index.ts on purpose. OpenCode 1.18+ treats every
// function export on the entrypoint as a plugin factory. parseState /
// serializeState must not be named exports of src/index.ts or the loader
// calls parseState(pluginContext) and dies on content.match. See #19 / #20.
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

import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync, readdirSync } from "fs";
import { dirname, join } from "path";

// Types
interface RalphState {
  active: boolean;
  iteration: number;
  maxIterations: number;
  sessionId?: string;
  prompt?: string;
}

// Constants
const STATE_FILENAME = "ralph-loop.local.md";
const MESSAGE_DIR = join(process.env.HOME || "~", ".local/share/opencode/storage/message");
const COMPLETION_TAG = /<promise>\s*DONE\s*<\/promise>/is;

// Get state file path (project-relative)
function getStateFile(directory: string): string {
  return join(directory, ".opencode", STATE_FILENAME);
}

// Parse markdown frontmatter state
function parseState(content: string): RalphState {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { active: false, iteration: 0, maxIterations: 100 };

  const frontmatter = match[1];
  const state: RalphState = { active: false, iteration: 0, maxIterations: 100 };

  for (const line of frontmatter.split("\n")) {
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
function serializeState(state: RalphState): string {
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

// Read state from project directory
function readState(directory: string): RalphState {
  try {
    const stateFile = getStateFile(directory);
    if (existsSync(stateFile)) {
      return parseState(readFileSync(stateFile, "utf-8"));
    }
  } catch {}
  return { active: false, iteration: 0, maxIterations: 100 };
}

// Write state to project directory
function writeState(directory: string, state: RalphState): void {
  try {
    const stateFile = getStateFile(directory);
    mkdirSync(dirname(stateFile), { recursive: true });
    writeFileSync(stateFile, serializeState(state));
  } catch {}
}

// Clear state
function clearState(directory: string): void {
  try {
    const stateFile = getStateFile(directory);
    if (existsSync(stateFile)) unlinkSync(stateFile);
  } catch {}
}

// Check completion by scanning session messages
function isComplete(sessionId?: string): boolean {
  if (!sessionId) return false;

  try {
    const sessionMsgDir = join(MESSAGE_DIR, sessionId);
    if (!existsSync(sessionMsgDir)) return false;

    const files = readdirSync(sessionMsgDir)
      .filter(f => f.endsWith(".json"))
      .sort()
      .reverse();

    for (const file of files.slice(0, 10)) {
      try {
        const content = readFileSync(join(sessionMsgDir, file), "utf-8");
        if (COMPLETION_TAG.test(content)) {
          return true;
        }
      } catch {}
    }
  } catch {}

  return false;
}

// Main plugin
export default async function RalphLoopPlugin(ctx: any) {
  const directory = ctx.directory || process.cwd();

  return {
    // Register tools (slash commands)
    tool: {
      "ralph-loop": {
        description: "Start Ralph Loop - auto-continues until task completion. Use: /ralph-loop <task description>",
        parameters: {
          type: "object",
          properties: {
            task: {
              type: "string",
              description: "The task to work on until completion"
            },
            maxIterations: {
              type: "number",
              description: "Maximum iterations (default: 100)"
            }
          },
          required: ["task"]
        },
        async execute({ task, maxIterations = 100 }: { task: string; maxIterations?: number }) {
          const state: RalphState = {
            active: true,
            iteration: 0,
            maxIterations,
            prompt: task
          };
          writeState(directory, state);

          return `Ralph Loop started (max ${maxIterations} iterations).

Task: ${task}

I will auto-continue until the task is complete. When fully done, I will output \`<promise>DONE</promise>\` to signal completion.

Use /cancel-ralph to stop early.`;
        }
      },

      "cancel-ralph": {
        description: "Cancel active Ralph Loop",
        parameters: {
          type: "object",
          properties: {}
        },
        async execute() {
          const state = readState(directory);
          if (!state.active) {
            return "No active Ralph Loop to cancel.";
          }
          const iterations = state.iteration;
          clearState(directory);
          return `Ralph Loop cancelled after ${iterations} iteration(s).`;
        }
      },

      "ralph-status": {
        description: "Check Ralph Loop status",
        parameters: {
          type: "object",
          properties: {}
        },
        async execute() {
          const state = readState(directory);
          if (!state.active) {
            return "No active Ralph Loop.";
          }
          return `Ralph Loop active:
- Iteration: ${state.iteration}/${state.maxIterations}
- Task: ${state.prompt || "(no prompt)"}`;
        }
      }
    },

    // Event hook for auto-continuation
    event: async ({ event }: { event: { type: string; properties?: { sessionID?: string } } }) => {
      if (event.type === "session.idle") {
        const sessionId = event.properties?.sessionID;
        const state = readState(directory);

        if (!state.active) return;
        if (state.sessionId && state.sessionId !== sessionId) return;

        if (isComplete(sessionId)) {
          console.log("[ralph-loop] Task complete - DONE promise found");
          clearState(directory);
          return;
        }

        if (state.iteration >= state.maxIterations) {
          console.log(`[ralph-loop] Max iterations (${state.maxIterations}) reached`);
          clearState(directory);
          return;
        }

        const newState = { ...state, iteration: state.iteration + 1, sessionId };
        writeState(directory, newState);

        return {
          inject: `Continue from where you left off. (Iteration ${newState.iteration}/${newState.maxIterations})\n\nWhen the task is fully complete, output: <promise>DONE</promise>`
        };
      }

      if (event.type === "session.deleted") {
        clearState(directory);
      }
    }
  };
}

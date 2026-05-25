import { tool } from "@opencode-ai/plugin";
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync, cpSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { COMPLETION_TAG } from "./completion.ts";
import { RALPH_COMMANDS, STATE_FILENAME } from "./commands.ts";

// Types
export interface RalphState {
  active: boolean;
  iteration: number;
  maxIterations: number;
  sessionId?: string;
  prompt?: string;
}

const OPENCODE_CONFIG_DIR = join(homedir(), ".config/opencode");

// Get plugin root directory
function getPluginRoot(): string {
  try {
    // ESM: use import.meta.url
    const __filename = fileURLToPath(import.meta.url);
    return dirname(dirname(__filename)); // Go up from src/ to plugin root
  } catch {
    // Fallback for CJS
    return dirname(__dirname);
  }
}

// Auto-copy skills to opencode config on first run. opencode reads from
// ~/.config/opencode/skills/ (plural). Earlier versions wrote to /skill/
// (singular) — that path is no longer scanned. Slash commands are NOT
// copied here anymore; they self-register via the `config` hook below.
function setupSkills(): void {
  const pluginRoot = getPluginRoot();
  const skillsDir = join(OPENCODE_CONFIG_DIR, "skills");

  const pluginSkillsDir = join(pluginRoot, "skills");
  if (!existsSync(pluginSkillsDir)) return;

  // Skills directories are co-located with command names; deriving from
  // RALPH_COMMANDS keeps the two in lockstep when new commands are added.
  for (const skill of Object.keys(RALPH_COMMANDS)) {
    const srcSkillDir = join(pluginSkillsDir, skill);
    const destSkillDir = join(skillsDir, skill);
    if (existsSync(srcSkillDir) && !existsSync(destSkillDir)) {
      try {
        mkdirSync(destSkillDir, { recursive: true });
        cpSync(srcSkillDir, destSkillDir, { recursive: true });
      } catch {
        // Silent fail
      }
    }
  }
}

// Get state file path (project-relative)
function getStateFile(directory: string): string {
  return join(directory, ".opencode", STATE_FILENAME);
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

// Check completion by fetching session messages via API
async function isComplete(client: any, sessionId: string, directory: string): Promise<boolean> {
  try {
    const response = await client.session.messages({
      path: { id: sessionId },
      query: { directory }
    });

    const messages = (response as { data?: any[] }).data ?? [];

    // Filter for assistant messages
    const assistantMessages = messages.filter(
      (msg: any) => msg.info?.role === "assistant"
    );

    if (assistantMessages.length === 0) return false;

    // Check the last assistant message
    const lastAssistant = assistantMessages[assistantMessages.length - 1];
    const parts = lastAssistant.parts || [];

    // Extract text from all text parts
    const responseText = parts
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text ?? "")
      .join("\n");

    if (COMPLETION_TAG.test(responseText)) {
      return true;
    }
  } catch {
    // Silent fail
  }

  return false;
}

// Main plugin
export default async function RalphLoopPlugin(ctx: any) {
  const directory = ctx.directory || process.cwd();
  const client = ctx.client;

  // Auto-setup skills on first run. Slash commands self-register via the
  // `config` hook below.
  setupSkills();

  return {
    // Self-register slash commands. opencode's `config` hook fires while
    // assembling the runtime config; mutating `input.command` adds entries
    // to the command dict, no file copying needed. User-defined entries in
    // opencode.json take precedence (we only set absent names).
    config: async (input: any) => {
      input.command = input.command ?? {};
      for (const [name, def] of Object.entries(RALPH_COMMANDS)) {
        if (!input.command[name]) input.command[name] = def;
      }
    },

    // Register tools using the @opencode-ai/plugin SDK format.
    // The `args` field (Zod schema shape) is required — opencode calls
    // Object.entries(tool.args) internally. Using the old JSON Schema
    // `parameters` field left `args` undefined and caused a crash:
    //   TypeError: Object.entries requires that input parameter not be null or undefined
    tool: {
      "ralph-loop": tool({
        description: "Start Ralph Loop - auto-continues until task completion. Use: /ralph-loop <task description>",
        args: {
          task: tool.schema.string().describe("The task to work on until completion"),
          maxIterations: tool.schema.number().default(100).describe("Maximum iterations (default: 100)"),
        },
        async execute({ task, maxIterations = 100 }) {
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
      }),

      "cancel-ralph": tool({
        description: "Cancel active Ralph Loop",
        args: {},
        async execute() {
          const state = readState(directory);
          if (!state.active) {
            return "No active Ralph Loop to cancel.";
          }
          const iterations = state.iteration;
          clearState(directory);
          return `Ralph Loop cancelled after ${iterations} iteration(s).`;
        }
      }),

      "help": tool({
        description: "Show Ralph Loop plugin help",
        args: {},
        async execute() {
          return `# Ralph Loop Help

## Available Commands

- \`/ralph-loop <task>\` - Start an auto-continuation loop
- \`/cancel-ralph\` - Stop an active loop

## How It Works

1. Start with: /ralph-loop "Build a REST API"
2. AI works on the task until idle
3. Plugin auto-continues if not complete
4. Loop stops when AI outputs: <promise>DONE</promise>

## State File

Located at: .opencode/ralph-loop.local.md`;
        }
      })
    },

    // Event hook for auto-continuation
    event: async ({ event }: { event: { type: string; properties?: { sessionID?: string } } }) => {
      if (event.type === "session.idle") {
        const sessionId = event.properties?.sessionID;
        const state = readState(directory);

        if (!state.active) return;
        if (!sessionId) return;
        if (state.sessionId && state.sessionId !== sessionId) return;

        if (await isComplete(client, sessionId, directory)) {
          clearState(directory);
          return;
        }

        if (state.iteration >= state.maxIterations) {
          clearState(directory);
          return;
        }

        const newState = { ...state, iteration: state.iteration + 1, sessionId };
        writeState(directory, newState);

        // Inject continuation prompt with original task (like Anthropic's ralph-wiggum)
        const continuationPrompt = `[RALPH LOOP - ITERATION ${newState.iteration}/${newState.maxIterations}]

Your previous attempt did not output the completion promise. Continue working on the task.

IMPORTANT:
- Review your progress so far
- Continue from where you left off
- When FULLY complete, output: <promise>DONE</promise>
- Do not stop until the task is truly done

Original task:
${state.prompt || "(no task specified)"}`;

        try {
          await client.session.prompt({
            path: { id: sessionId },
            body: {
              parts: [{ type: "text", text: continuationPrompt }]
            }
          });
        } catch {
          // Silent fail - don't pollute TUI
        }
      }

      if (event.type === "session.deleted") {
        clearState(directory);
      }
    }
  };
}

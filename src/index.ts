import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync, cpSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

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
const OPENCODE_CONFIG_DIR = join(process.env.HOME || "~", ".config/opencode");
const COMPLETION_TAG = /<promise>\s*DONE\s*<\/promise>/is;

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

// Auto-copy skills and commands to opencode config on first run
function setupSkillsAndCommands(): void {
  const pluginRoot = getPluginRoot();
  const skillsDir = join(OPENCODE_CONFIG_DIR, "skill");
  const commandsDir = join(OPENCODE_CONFIG_DIR, "command");

  // Copy skills
  const pluginSkillsDir = join(pluginRoot, "skills");
  if (existsSync(pluginSkillsDir)) {
    const skills = ["ralph-loop", "cancel-ralph", "help"];
    for (const skill of skills) {
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

  // Copy commands
  const pluginCommandsDir = join(pluginRoot, "commands");
  if (existsSync(pluginCommandsDir)) {
    const commands = ["ralph-loop.md", "cancel-ralph.md", "help.md"];
    for (const cmd of commands) {
      const srcCmd = join(pluginCommandsDir, cmd);
      const destCmd = join(commandsDir, cmd);

      if (existsSync(srcCmd) && !existsSync(destCmd)) {
        try {
          mkdirSync(commandsDir, { recursive: true });
          cpSync(srcCmd, destCmd);
        } catch {
          // Silent fail
        }
      }
    }
  }
}

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

  // Auto-setup skills and commands on first run
  setupSkillsAndCommands();

  return {
    // Register tools (fallback if skills/commands not available)
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

      "help": {
        description: "Show Ralph Loop plugin help",
        parameters: {
          type: "object",
          properties: {}
        },
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
      }
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

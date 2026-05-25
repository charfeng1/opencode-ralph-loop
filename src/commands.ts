// Non-function constants live here (not in index.ts) so opencode's plugin
// loader — which iterates Object.values(module) and rejects anything that
// isn't a function or `{server: fn}` — never sees them as exports of the
// entrypoint. See AGENTS.md gotcha.

export const STATE_FILENAME = "ralph-loop.local.md";
export const STATE_DIR = ".opencode";
export const STATE_PATH = `${STATE_DIR}/${STATE_FILENAME}`;

export interface RalphCommandDef {
  description: string;
  template: string;
  agent: string;
}

// Inline slash-command templates. Mirror what commands/*.md used to be,
// minus the per-file YAML frontmatter. Registered at runtime via the
// `config` hook in index.ts.
export const RALPH_COMMANDS: Record<string, RalphCommandDef> = {
  "ralph-loop": {
    description: "Start Ralph Loop - auto-continues until task completion",
    template: `Start an iterative development loop that automatically continues until the task is complete.

Create the state file in the project directory:

\`\`\`bash
mkdir -p ${STATE_DIR} && cat > ${STATE_PATH} << 'EOF'
---
active: true
iteration: 0
maxIterations: 100
---

$ARGUMENTS
EOF
\`\`\`

Now begin working on the task: **$ARGUMENTS**

When the task is FULLY completed, signal completion by outputting:

\`\`\`
<promise>DONE</promise>
\`\`\`

**IMPORTANT:** ONLY output this when the task is COMPLETELY and VERIFIABLY finished. Do NOT output false promises to escape the loop.

Use \`/cancel-ralph\` to stop early.`,
    agent: "build",
  },
  "cancel-ralph": {
    description: "Cancel active Ralph Loop",
    template: `Cancel the active Ralph Loop.

\`\`\`bash
if [ -f ${STATE_PATH} ]; then
  grep '^iteration:' ${STATE_PATH}
  rm -f ${STATE_PATH}
  echo "Ralph Loop cancelled."
else
  echo "No active Ralph Loop to cancel."
fi
\`\`\`

Report the result to the user.`,
    agent: "build",
  },
  "help": {
    description: "Show Ralph Loop plugin help and available commands",
    template: `# Ralph Loop Help

## Available Commands

- \`/ralph-loop <task>\` - Start an auto-continuation loop for the given task
- \`/cancel-ralph\` - Stop an active Ralph Loop

## Quick Start

\`\`\`
/ralph-loop Build a REST API with user authentication
\`\`\`

The AI will work on your task and automatically continue until it outputs \`<promise>DONE</promise>\` to signal completion.

## How It Works

1. Creates state file at \`${STATE_PATH}\`
2. Works on task until idle
3. If no \`<promise>DONE</promise>\` found, auto-continues
4. Repeats until complete or max iterations (100) reached

For more details, the AI can use the \`help\` skill.`,
    agent: "build",
  },
};

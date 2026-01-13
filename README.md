# opencode-ralph-loop

Minimal Ralph Loop plugin for [opencode](https://opencode.ai) - auto-continues until task completion.

Inspired by Anthropic's Ralph Wiggum technique for iterative, self-referential AI development loops.

## Why this plugin?

[oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) is a fantastic, feature-rich plugin that includes Ralph Loop along with many other powerful capabilities like the Sisyphus orchestrator, background agents, and more.

However, we personally found the full suite a bit heavy for our workflow. We also noticed others in the community expressing interest in specific features without needing the complete package. So we extracted just the Ralph Loop functionality into this standalone, lightweight plugin.

If you want the full-featured experience, definitely check out oh-my-opencode. If you just want auto-continuation loops with minimal overhead, this plugin is for you.

## Installation

Add to your `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["opencode-ralph-loop"]
}
```

Restart opencode. That's it!

On first run, the plugin will automatically install skills and commands to your `~/.config/opencode/` directory.

## Usage

### Start a loop

```
/ralph-loop "Build a REST API with authentication"
```

The AI will work on your task and automatically continue until completion.

### Cancel a loop

```
/cancel-ralph
```

### Get help

```
/help
```

## How it works

1. `/ralph-loop` creates a state file at `.opencode/ralph-loop.local.md`
2. When the AI goes idle, the plugin checks if `<promise>DONE</promise>` was output
3. If not found, it injects "Continue from where you left off"
4. Loop continues until DONE is found or max iterations (100) reached
5. State file is deleted when complete

### Completion Promise

When the AI finishes a task, it outputs:

```
<promise>DONE</promise>
```

**Important:** The AI should ONLY output this when the task is COMPLETELY and VERIFIABLY finished. False promises are not allowed.

## State File

The loop state is stored in your project directory:

```
.opencode/ralph-loop.local.md
```

Format (markdown with YAML frontmatter):

```markdown
---
active: true
iteration: 3
maxIterations: 100
sessionId: ses_abc123
---

Your original task prompt
```

Add `.opencode/ralph-loop.local.md` to your `.gitignore`.

## Features

- **Plug-and-play**: Just add to config and restart - no manual setup
- **Auto-setup**: Skills and commands are automatically installed on first run
- **Minimal**: ~300 lines, no bloat
- **Project-relative**: State file in `.opencode/`, not global
- **Completion detection**: Scans session messages for DONE promise
- **Progressive context**: Skills provide context only when needed
- **Commands**: `/ralph-loop`, `/cancel-ralph`, and `/help`

## Architecture

Following Anthropic's Claude Code plugin pattern:

```
opencode-ralph-loop/
├── src/
│   └── index.ts        # Main plugin with event hooks and tools
├── skills/
│   ├── ralph-loop/     # Progressive context for starting loops
│   ├── cancel-ralph/   # Context for cancellation
│   └── help/           # Plugin documentation
├── commands/
│   ├── ralph-loop.md   # Slash command for starting
│   ├── cancel-ralph.md # Slash command for cancelling
│   └── help.md         # Slash command for help
└── package.json
```

## Credits

- Inspired by [Anthropic's Ralph Wiggum](https://github.com/anthropics/claude-code/tree/main/plugins/ralph-wiggum) plugin for Claude Code
- Implementation pattern from [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode)

## License

MIT

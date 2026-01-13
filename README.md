# opencode-ralph-loop

Minimal Ralph Loop plugin for [opencode](https://opencode.ai) - auto-continues until task completion.

Inspired by Anthropic's Ralph Wiggum technique for iterative, self-referential AI development loops.

## Installation

Add to your `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["opencode-ralph-loop"]
}
```

Restart opencode. That's it!

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

### How it works

1. `/ralph-loop` creates a state file at `.opencode/ralph-loop.local.md`
2. When the AI goes idle, the plugin checks if `<promise>DONE</promise>` was output
3. If not found, it injects "Continue from where you left off"
4. Loop continues until DONE is found or max iterations (100) reached
5. State file is deleted when complete

### Completion

When the AI finishes a task, it outputs:

```
<promise>DONE</promise>
```

This signals the loop to stop.

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

- **Minimal**: ~150 lines, no bloat
- **Project-relative**: State file in `.opencode/`, not global
- **Completion detection**: Scans session messages for DONE promise
- **Slash commands**: `/ralph-loop` and `/cancel-ralph`
- **Skills**: AI can invoke the loop autonomously when appropriate

## Comparison

| Feature | This Plugin | oh-my-opencode |
|---------|-------------|----------------|
| Ralph Loop | Yes | Yes |
| Sisyphus Orchestrator | No | Yes |
| Background Agents | No | Yes |
| Lines of code | ~150 | ~500+ |
| Dependencies | None | Many |

## Credits

- Inspired by [Anthropic's Ralph Wiggum](https://github.com/anthropics/claude-code/tree/main/plugins/ralph-wiggum) plugin for Claude Code
- Implementation pattern from [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode)

## License

MIT

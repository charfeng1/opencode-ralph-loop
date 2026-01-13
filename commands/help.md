---
description: Show Ralph Loop plugin help and available commands
---

# Ralph Loop Help

## Available Commands

- `/ralph-loop <task>` - Start an auto-continuation loop for the given task
- `/cancel-ralph` - Stop an active Ralph Loop

## Quick Start

```
/ralph-loop Build a REST API with user authentication
```

The AI will work on your task and automatically continue until it outputs `<promise>DONE</promise>` to signal completion.

## How It Works

1. Creates state file at `.opencode/ralph-loop.local.md`
2. Works on task until idle
3. If no `<promise>DONE</promise>` found, auto-continues
4. Repeats until complete or max iterations (100) reached

## Cancellation

To stop early:
```
/cancel-ralph
```

For more details, the AI can use the `help` skill.

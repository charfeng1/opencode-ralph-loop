---
name: ralph-loop
description: Start Ralph Loop - auto-continues until task completion
---

# Ralph Loop

Start an iterative development loop that automatically continues until the task is complete.

## How to Use

When you invoke this skill, create the state file in the project directory:

```bash
mkdir -p .opencode && cat > .opencode/ralph-loop.local.md << 'EOF'
---
active: true
iteration: 0
maxIterations: 100
---
EOF
```

Then inform the user:

"Ralph Loop started (max 100 iterations). I will auto-continue until the task is complete. When done, I will output `<promise>DONE</promise>` to signal completion. Use /cancel-ralph to stop early."

## Completion

When you have fully completed the task, output:

```
<promise>DONE</promise>
```

This signals the loop to stop.

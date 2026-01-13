---
description: Start Ralph Loop - auto-continues until task completion
---

# Ralph Loop

Start an iterative development loop that automatically continues until the task is complete.

## Setup

Create the state file in the project directory:

```bash
mkdir -p .opencode && cat > .opencode/ralph-loop.local.md << 'EOF'
---
active: true
iteration: 0
maxIterations: 100
---

$ARGUMENTS
EOF
```

## Task

Now begin working on the task: **$ARGUMENTS**

## Completion

When the task is FULLY completed, signal completion by outputting:

```
<promise>DONE</promise>
```

**IMPORTANT:** ONLY output this when the task is COMPLETELY and VERIFIABLY finished. Do NOT output false promises to escape the loop.

## Cancellation

Use `/cancel-ralph` to stop early.

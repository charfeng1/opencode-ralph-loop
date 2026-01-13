---
description: Start Ralph Loop - auto-continues until task completion
---

Start the Ralph Loop for iterative development.

First, activate the loop by creating the state file in the project directory:

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

Then begin working on the user's task: $ARGUMENTS

When you have FULLY completed the task, signal completion by outputting:

<promise>DONE</promise>

This will stop the auto-continuation loop.

---
name: cancel-ralph
description: Cancel active Ralph Loop
---

# Cancel Ralph

Stop an active Ralph Loop before completion.

## How to Use

When you invoke this skill:

1. First, check if a loop is active:

```bash
test -f .opencode/ralph-loop.local.md && echo "Loop is active" || echo "No active loop"
```

2. If active, read the current iteration count:

```bash
grep '^iteration:' .opencode/ralph-loop.local.md
```

3. Delete the state file to stop the loop:

```bash
rm -f .opencode/ralph-loop.local.md
```

4. Inform the user of the cancellation and which iteration was reached.

## When to Use

Use this command when:
- The task requirements have changed
- You want to restart with different parameters
- The loop appears stuck and you want manual control
- You need to work on something else

Note: Prefer completing tasks properly with `<promise>DONE</promise>` when possible.

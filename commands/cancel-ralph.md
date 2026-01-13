---
description: Cancel active Ralph Loop
---

# Cancel Ralph

Cancel the active Ralph Loop.

## Steps

1. Check if a loop is active and get the iteration count:

```bash
if [ -f .opencode/ralph-loop.local.md ]; then
  grep '^iteration:' .opencode/ralph-loop.local.md
  rm -f .opencode/ralph-loop.local.md
  echo "Ralph Loop cancelled."
else
  echo "No active Ralph Loop to cancel."
fi
```

2. Report the result to the user.

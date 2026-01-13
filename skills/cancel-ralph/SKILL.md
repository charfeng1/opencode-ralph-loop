---
name: cancel-ralph
description: Cancel active Ralph Loop
---

# Cancel Ralph

Stop an active Ralph Loop.

## How to Use

When you invoke this skill, delete the state file to deactivate the loop:

```bash
rm -f .opencode/ralph-loop.local.md
```

Then inform the user: "Ralph Loop cancelled."

---
name: ralph-loop
description: Start Ralph Loop - auto-continues until task completion
---

# Ralph Loop

Start an iterative development loop that automatically continues until the task is complete.

## How It Works

The Ralph Loop creates a continuous feedback cycle for completing complex tasks:

1. You work on the task until you go idle
2. The plugin detects the idle state and checks for completion
3. If not complete, it prompts you to continue where you left off
4. This repeats until you output the completion promise or max iterations reached

Your previous work remains accessible through files and git history, enabling progressive refinement across iterations.

## Starting the Loop

When you invoke this skill, create the state file in the project directory:

```bash
mkdir -p .opencode && cat > .opencode/ralph-loop.local.md << 'EOF'
---
active: true
iteration: 0
maxIterations: 100
---

[The user's task prompt goes here]
EOF
```

Then inform the user and begin working on the task.

## Completion Promise - CRITICAL RULES

When you have FULLY completed the task, signal completion by outputting:

```
<promise>DONE</promise>
```

**IMPORTANT CONSTRAINTS:**

- ONLY output `<promise>DONE</promise>` when the task is COMPLETELY and VERIFIABLY finished
- The statement MUST be completely and unequivocally TRUE
- Do NOT output false promises to escape the loop, even if you think you're stuck
- Do NOT lie even if you think you should exit for other reasons
- If you're blocked, explain the blocker and request help instead of falsely completing

The loop can only be stopped by:
1. Truthful completion promise
2. Max iterations reached
3. User running `/cancel-ralph`

## Checking Status

Check current iteration:
```bash
grep '^iteration:' .opencode/ralph-loop.local.md
```

## State File Format

The state file at `.opencode/ralph-loop.local.md` uses YAML frontmatter:

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

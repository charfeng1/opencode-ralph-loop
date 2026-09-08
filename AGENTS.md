# AGENTS.md

**Keep this file short.** Add only facts that change agent behavior.

**Whenever you write any comment, documentation, or PR body in this repo:** consider what the next human and their coding agent will get out of it. Less prose, more information density. **Do not write your own diary** — in here, in code comments, in PR descriptions, anywhere. Keep it facts only.

`CLAUDE.md` is a symlink to this file at every directory level. Edit `AGENTS.md` only.

## Commands

```bash
npm install
npm run typecheck   # tsc --noEmit, strict
npm test            # vitest run, 23 tests
```

## Layout

- `src/index.ts` — plugin entry; tools, event hooks, state file I/O
- `src/state.ts` — parse/serialize; not re-exported from the entrypoint (#19 / #20)
- `skills/`, `commands/` — auto-copied to `~/.config/opencode` on first run
- `tests/` — vitest; `tests/setup.ts` sandboxes `HOME` to a tmpdir
- `.github/workflows/release.yml` — CI + auto-publish on master

## Gotchas

- Plugin tools MUST use `tool({ args: {...} })` from `@opencode-ai/plugin`. The raw JSON-Schema `parameters: {...}` form crashes opencode 1.14+ (`Object.entries(undefined)`). See #4.
- `tool.schema` is re-exported zod. Use `tool.schema.string()` (function), not `tool.schema.string` (property).
- `src/index.ts` runtime exports must be loader-safe. opencode 1.15+ iterates `Object.values(module)` of the entrypoint and rejects non-functions (`TypeError: Plugin export is not a function`) — put those in sibling modules and import without re-exporting. OpenCode 1.18+ also *invokes* every function export as a plugin factory, so extra functions (`parseState`, `serializeState`) crash load (`content.match is not a function`). The entrypoint's only function export must be `default`. Type-only `export type` / `export interface` is fine. See #14 / #15 / #19 / #20.
- No build step. Ships `src/*.ts` directly via `"main": "src/index.ts"`.
- `engines.node: >=18` is the runtime contract. Tests need Node 20+ (vitest 4 imports `node:util.styleText`).

## Releases

Bump `version` in `package.json` → merge to master → workflow auto-publishes via OIDC trusted publishing with provenance, tags, and creates the GitHub release. Details at top of `.github/workflows/release.yml`.

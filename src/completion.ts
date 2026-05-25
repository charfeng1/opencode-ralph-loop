// Lives outside src/index.ts on purpose. opencode's plugin loader iterates
// `Object.values(module)` of the entrypoint and throws "Plugin export is not
// a function" on any non-function export (including RegExps). Keeping the
// completion regex in a sibling module lets tests import it freely without
// tripping the loader, since the entrypoint imports COMPLETION_TAG without
// re-exporting it. See #14 / #15 for the symptom.
export const COMPLETION_TAG = /<promise>\s*DONE\s*<\/promise>/is;

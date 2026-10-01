# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Token-efficient tool usage

- Prefix supported terminal commands with `rtk`; use `rtk proxy` only when raw output is needed or no formatter exists.
- Before broad source reads, use `/Users/mehdi/.local/bin/graphify query "<question>" --graph ../graphify-out/graph.json --budget 600`; verify relevant findings in current source files. If Graphify is outside PATH, use `/Users/mehdi/.local/bin/graphify`.
- Reuse `../graphify-out/graph.json`. If missing, run `cd .. && rtk proxy /Users/mehdi/.local/bin/graphify extract . --code-only --no-cluster`; after substantial code changes, run `cd .. && rtk proxy /Users/mehdi/.local/bin/graphify update .`.
- Keep graph extraction local and code-only. Use semantic extraction only when needed and the backend and cost are known.
- Search narrowly, batch related reads, preserve existing instructions and local changes, and run focused validation.
- Compare `rtk gain` before and after representative work. Its global output-compression savings are not total session or project-specific token savings.

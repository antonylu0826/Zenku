# Zenku Development — Claude Code

This project uses Zenku P12 Single Source of Truth architecture.
Read `docs/ai-agent-guide.md` for full development guide.
Read `AGENTS.md` for quick reference.

## Claude-specific Notes

- Runtime: Bun (not Node.js)
- Package manager: bun (not npm/yarn)
- `bunx zenstack generate` may fail on Windows — see MEMORY.md for workaround
- Tests: `cd packages/server && bun run test`
- Entity files use `defineEntity()` from `@zenku/core`

## Do NOT

- Edit `packages/server/schema.zmodel` (generated file)
- Edit `prisma/schema.prisma` (generated file)
- Edit i18n locale files for entity-specific translations (use `i18n` in entity files)
- Use `npm` or `npx` — always use `bun` / `bunx`

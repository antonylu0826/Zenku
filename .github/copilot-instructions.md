# Zenku Development

This project uses Zenku P12 Single Source of Truth architecture.
Read `docs/ai-agent-guide.md` for full development guide.
Read `AGENTS.md` for quick reference.

Entity definitions are in `project/entities/*.entity.ts`.
Never edit `schema.zmodel` or `prisma/` directly — they are generated.
Runtime is Bun, not Node.js.

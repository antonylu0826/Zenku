# Zenku Development

This project uses Zenku P12 Single Source of Truth architecture.

## Quick Start

1. Read `docs/ai-agent-guide.md` for the full development guide
2. Entity definitions are in `project/entities/*.entity.ts`
3. **Never** edit `schema.zmodel` or `prisma/` directly — they are generated

## Workflow

```bash
bun packages/cli/src/index.ts scaffold <EntityName>  # Create template
bun packages/cli/src/index.ts check                  # Validate
bun packages/cli/src/index.ts generate               # Generate schema
bun packages/cli/src/index.ts dev                    # Start dev servers
```

## Key Files

| File | Role |
|------|------|
| `project/entities/*.entity.ts` | Entity definitions (edit these) |
| `project/appinfo.ts` | App config |
| `project/menu.ts` | Navigation menu |
| `packages/core/src/index.ts` | Shared types |
| `packages/server/schema.base.zmodel` | System models (User, RefreshToken) |
| `packages/server/schema.zmodel` | **GENERATED** — do not edit |

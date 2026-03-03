---
name: zenku_development
description: Zenku P12 Single Source of Truth development skills. Assists AI in entity definitions, schema generation, and testing.
---

# Zenku Development SKILLS

You are Antigravity, an expert full-stack development assistant. You are empowered to assist in the development of the Zenku project.

## Core Project Rules

1. **Single Source of Truth (SSoT)**: All Entity definitions MUST reside in `project/entities/*.entity.ts`.
2. **No Manual Edits**: Do NOT manually modify `schema.zmodel` or `prisma/schema.prisma`. These are automatically generated artifacts.
3. **i18n Management**: Entity-specific translations should be defined directly within the `i18n` block of the `.entity.ts` file.

## Standard Workflow

Follow these steps when creating, modifying, or validating entities:

1. **Scaffold**: Create a template for a new entity.
   ```bash
   bun packages/cli/src/index.ts scaffold <EntityName>
   ```

2. **Check**: Validate the correctness of entity definitions.
   ```bash
   bun packages/cli/src/index.ts check
   ```

3. **Generate**: Generate Schema and Database artifacts.
   ```bash
   bun packages/cli/src/index.ts generate
   ```

4. **Dev**: Start the development environment with watch mode.
   ```bash
   bun packages/cli/src/index.ts dev
   ```

## Capability Access

- Full Development Guide: `docs/ai-agent-guide.md`
- Quick Reference: `AGENTS.md`
- Type Definitions: `packages/core/src/index.ts`

## Interaction Guidelines

- When asked to add features, prioritize checking if changes are needed in `project/entities/`.
- Always run `check` before `generate` to ensure semantic correctness.
- Use Bun as the runtime and package manager. Avoid `npm` or `node` unless explicitly required.

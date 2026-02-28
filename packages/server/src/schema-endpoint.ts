import { Hono } from "hono";
import { Prisma } from "@prisma/client";
import type { ModelMeta, FieldMeta, FieldType, UiConfig } from "@zenku/core";
import pluralize from "pluralize";
import { join } from "path";

const EXCLUDED_MODELS = ["User", "RefreshToken"];

// Read-only fields: auto-managed by Prisma
const READ_ONLY_FIELD_NAMES = new Set(["createdAt", "updatedAt"]);
const READ_ONLY_DEFAULTS = new Set(["now()", "cuid()", "uuid()", "autoincrement()"]);

function mapPrismaType(type: string): FieldType {
  switch (type) {
    case "String":
      return "String";
    case "Int":
      return "Int";
    case "Float":
    case "Decimal":
      return "Float";
    case "Boolean":
      return "Boolean";
    case "DateTime":
      return "DateTime";
    case "Json":
      return "Json";
    default:
      return "String";
  }
}

function isReadOnly(field: Prisma.DMMF.Field): boolean {
  if (READ_ONLY_FIELD_NAMES.has(field.name)) return true;
  if (field.isUpdatedAt) return true;
  const defaultVal = field.default;
  if (defaultVal && typeof defaultVal === "object" && "name" in defaultVal) {
    return READ_ONLY_DEFAULTS.has((defaultVal as any).name);
  }
  return false;
}

/**
 * Load the UiConfig for a model from schema/<ModelName>.ui.ts (if it exists).
 * Uses dynamic import — Bun caches modules, so this is fast after first load.
 */
async function loadUiConfig(modelName: string): Promise<UiConfig | undefined> {
  try {
    const schemaDir = join(import.meta.dir, "..", "schema");
    const uiModule = await import(`${schemaDir}/${modelName}.ui.ts`);
    return uiModule.default as UiConfig;
  } catch {
    // File doesn't exist — no UI config for this model
    return undefined;
  }
}

// Cache ui configs at startup
const uiConfigCache = new Map<string, UiConfig | undefined>();

async function initUiConfigs() {
  const modelNames = Prisma.dmmf.datamodel.models
    .filter((m) => !EXCLUDED_MODELS.includes(m.name))
    .map((m) => m.name);

  await Promise.all(
    modelNames.map(async (name) => {
      const ui = await loadUiConfig(name);
      uiConfigCache.set(name, ui);
    })
  );

  console.log(
    `[schema] Loaded UI configs for: ${[...uiConfigCache.entries()]
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(", ") || "none"}`
  );
}

// Initialize at module load time (top-level await works in Bun)
await initUiConfigs();

export function createSchemaRoutes() {
  const app = new Hono();

  app.get("/", (c) => {
    const models: ModelMeta[] = Prisma.dmmf.datamodel.models
      .filter((m) => !EXCLUDED_MODELS.includes(m.name))
      .map((model) => {
        const fields: FieldMeta[] = model.fields.map((f) => ({
          name: f.name,
          type: mapPrismaType(f.type),
          isRequired: f.isRequired,
          isList: f.isList,
          isId: f.isId,
          isUnique: f.isUnique,
          isRelation: !!f.relationName,
          isReadOnly: isReadOnly(f),
          documentation: f.documentation,
          ...(f.relationName ? { relationModel: f.type } : {}),
        }));

        const pluralName = pluralize(model.name);
        const ui = uiConfigCache.get(model.name);

        return {
          name: model.name,
          plural: pluralName.charAt(0).toLowerCase() + pluralName.slice(1),
          fields,
          ...(ui ? { ui } : {}),
        };
      });

    c.header("Cache-Control", "max-age=60");
    return c.json({ models });
  });

  return app;
}

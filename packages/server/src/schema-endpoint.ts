import { Hono } from "hono";
import { Prisma } from "@prisma/client";
import type { ModelMeta, FieldMeta, FieldType, UiConfig, EntityDefinition, FormSection, AppInfoDefinition, MenuDefinition } from "@zenku/core";
import pluralize from "pluralize";
import { join } from "path";
import { readdirSync, existsSync } from "fs";

const EXCLUDED_MODELS = ["User", "RefreshToken", "PurchaseOrderItem", "SalesOrderItem"];

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
 * Convert EntityDefinition.ui to legacy UiConfig format for client compatibility.
 */
function entityUiToLegacy(def: EntityDefinition): UiConfig {
  const ui = def.ui;
  if (!ui) return {};

  const result: UiConfig = {};

  if (def.i18n?.en?.caption) result.label = def.i18n.en.caption;
  if (ui.icon) result.icon = ui.icon;

  // List config
  if (ui.list) {
    result.list = {
      columns: ui.list.columns,
      searchableFields: ui.list.searchable,
      defaultSort: ui.list.defaultSort,
    };
  }

  // Form config — support both sections and legacy layout
  if (ui.form) {
    result.form = {};
    if (ui.form.sections) {
      result.form.sections = ui.form.sections;
    }
    if (ui.form.layout) {
      result.form.layout = ui.form.layout;
    }
  }

  // Detail tabs
  if (ui.detail) {
    result.detail = ui.detail;
  }

  // Appearance rules
  if (ui.appearance) {
    result.appearance = ui.appearance;
  }

  // Kanban
  if (ui.kanban) result.kanban = ui.kanban;

  // Calendar
  if (ui.calendar) result.calendar = ui.calendar;

  // Tree
  if (ui.tree) result.tree = ui.tree;

  return result;
}

/**
 * Load entity definitions from project/entities/*.entity.ts (P12 format).
 * Falls back to schema/<Model>.ui.ts (legacy format) if project/entities doesn't exist.
 */
async function loadUiConfig(modelName: string): Promise<UiConfig | undefined> {
  // Try P12 entity file first
  const entitiesDir = join(import.meta.dir, "../../..", "project/entities");
  if (existsSync(entitiesDir)) {
    try {
      const entityModule = await import(`${entitiesDir}/${modelName}.entity.ts`);
      const def = entityModule.default as EntityDefinition;
      if (def) {
        return entityUiToLegacy(def);
      }
    } catch {
      // Entity file doesn't exist for this model
    }
  }

  // Fallback: legacy schema/*.ui.ts
  try {
    const schemaDir = join(import.meta.dir, "..", "schema");
    const uiModule = await import(`${schemaDir}/${modelName}.ui.ts`);
    return uiModule.default as UiConfig;
  } catch {
    return undefined;
  }
}

// Cache ui configs at startup
const uiConfigCache = new Map<string, UiConfig | undefined>();

// Cache entity definitions for i18n and relation metadata
const entityDefCache = new Map<string, EntityDefinition | undefined>();

async function loadEntityDef(modelName: string): Promise<EntityDefinition | undefined> {
  const entitiesDir = join(import.meta.dir, "../../..", "project/entities");
  try {
    const mod = await import(`${entitiesDir}/${modelName}.entity.ts`);
    return mod.default as EntityDefinition;
  } catch {
    return undefined;
  }
}

async function initUiConfigs() {
  const modelNames = Prisma.dmmf.datamodel.models
    .filter((m) => !EXCLUDED_MODELS.includes(m.name))
    .map((m) => m.name);

  await Promise.all(
    modelNames.map(async (name) => {
      const ui = await loadUiConfig(name);
      uiConfigCache.set(name, ui);
      const def = await loadEntityDef(name);
      entityDefCache.set(name, def);
    })
  );

  console.log(
    `[schema] Loaded entity configs for: ${[...uiConfigCache.entries()]
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(", ") || "none"}`
  );
}

// Load appinfo and menu from project/
let cachedAppInfo: AppInfoDefinition | undefined;
let cachedMenu: MenuDefinition | undefined;

async function loadProjectConfig() {
  const projectDir = join(import.meta.dir, "../../..", "project");

  try {
    const appinfoModule = await import(`${projectDir}/appinfo.ts`);
    cachedAppInfo = appinfoModule.default as AppInfoDefinition;
  } catch {
    // No appinfo.ts
  }

  try {
    const menuModule = await import(`${projectDir}/menu.ts`);
    cachedMenu = menuModule.default as MenuDefinition;
  } catch {
    // No menu.ts
  }
}

// Initialize at module load time (top-level await works in Bun)
await initUiConfigs();
await loadProjectConfig();

export function createSchemaRoutes() {
  const app = new Hono();

  app.get("/", (c) => {
    const models: ModelMeta[] = Prisma.dmmf.datamodel.models
      .filter((m) => !EXCLUDED_MODELS.includes(m.name))
      .map((model) => {
        const fields: FieldMeta[] = model.fields.map((f) => {
          // Check if this field represents an Enum type
          const enumType = Prisma.dmmf.datamodel.enums.find((e) => e.name === f.type);
          const isEnum = !!enumType;
          const enumValues = isEnum ? enumType.values.map((v) => v.name) : undefined;

          return {
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
            ...(isEnum ? { isEnum: true, enumValues } : {}),
          };
        });

        const pluralName = pluralize(model.name);
        const ui = uiConfigCache.get(model.name);
        const entityDef = entityDefCache.get(model.name);

        // Build entity metadata including i18n and relation lookups
        const entityMeta: Record<string, unknown> = {};
        if (entityDef?.i18n) {
          entityMeta.i18n = entityDef.i18n;
        }
        if (entityDef?.relations) {
          const relationLookups: Record<string, { lookupField?: string; searchField?: string }> = {};
          for (const [rname, rdef] of Object.entries(entityDef.relations)) {
            if (rdef.lookupField || rdef.searchField) {
              relationLookups[rname] = {
                lookupField: rdef.lookupField,
                searchField: rdef.searchField,
              };
            }
          }
          if (Object.keys(relationLookups).length > 0) {
            entityMeta.relationLookups = relationLookups;
          }
        }

        return {
          name: model.name,
          plural: pluralName.charAt(0).toLowerCase() + pluralName.slice(1),
          fields,
          ...(ui ? { ui } : {}),
          ...(Object.keys(entityMeta).length > 0 ? { entity: entityMeta } : {}),
        };
      });

    c.header("Cache-Control", "max-age=60");
    return c.json({
      models,
      ...(cachedAppInfo ? { appInfo: cachedAppInfo } : {}),
      ...(cachedMenu ? { menu: cachedMenu } : {}),
    });
  });

  return app;
}

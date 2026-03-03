import { Command } from "commander";
import { existsSync, readdirSync } from "fs";
import { join, resolve } from "path";
import type { EntityDefinition, MenuDefinition, AppInfoDefinition } from "@zenku/core";

const ROOT = resolve(import.meta.dirname, "../../..");
const PROJECT_DIR = join(ROOT, "project");
const ENTITIES_DIR = join(PROJECT_DIR, "entities");

interface CheckResult {
  entity: string;
  ok: boolean;
  errors: string[];
}

async function loadEntity(filePath: string): Promise<EntityDefinition | null> {
  try {
    const mod = await import(filePath);
    return mod.default as EntityDefinition;
  } catch (e: any) {
    return null;
  }
}

async function loadAppInfo(): Promise<AppInfoDefinition | null> {
  const filePath = join(PROJECT_DIR, "appinfo.ts");
  if (!existsSync(filePath)) return null;
  try {
    const mod = await import(filePath);
    return mod.default as AppInfoDefinition;
  } catch {
    return null;
  }
}

async function loadMenu(): Promise<MenuDefinition | null> {
  const filePath = join(PROJECT_DIR, "menu.ts");
  if (!existsSync(filePath)) return null;
  try {
    const mod = await import(filePath);
    return mod.default as MenuDefinition;
  } catch {
    return null;
  }
}

function checkEntity(name: string, def: EntityDefinition, allEntityNames: Set<string>): string[] {
  const errors: string[] = [];
  const fieldNames = new Set(Object.keys(def.fields ?? {}));
  const relationNames = new Set(Object.keys(def.relations ?? {}));
  const allNames = new Set([...fieldNames, ...relationNames]);

  // Check fields
  if (fieldNames.size === 0) {
    errors.push("No fields defined");
  }
  for (const [fname, fdef] of Object.entries(def.fields ?? {})) {
    if (!fdef.type) {
      errors.push(`Field '${fname}' missing type`);
    }
    if (fdef.enum && !def.enums?.[fdef.enum]) {
      errors.push(`Field '${fname}' references enum '${fdef.enum}' not defined in enums`);
    }
    if (fdef.computed && !fdef.formula) {
      errors.push(`Computed field '${fname}' missing formula`);
    }
  }

  // Check relations
  for (const [rname, rdef] of Object.entries(def.relations ?? {})) {
    if (!rdef.type) {
      errors.push(`Relation '${rname}' missing type`);
    }
    if (rdef.type && !allEntityNames.has(rdef.type) && rdef.type !== name) {
      // Self-referential OK, also check system models
      const systemModels = new Set(["User", "RefreshToken"]);
      if (!systemModels.has(rdef.type)) {
        errors.push(`Relation '${rname}' references entity '${rdef.type}' not found in entities/`);
      }
    }
    if (rdef.field && !fieldNames.has(rdef.field)) {
      errors.push(`Relation '${rname}' references field '${rdef.field}' not in fields`);
    }
  }

  // Check UI list columns
  const listColumns = def.ui?.list?.columns ?? [];
  for (const col of listColumns) {
    if (!allNames.has(col)) {
      errors.push(`ui.list.columns references '${col}' not in fields/relations`);
    }
  }

  // Check UI form sections
  const sections = def.ui?.form?.sections ?? [];
  for (const section of sections) {
    if (section.detail) {
      if (!relationNames.has(section.detail)) {
        errors.push(`Form section '${section.title}' detail '${section.detail}' not in relations`);
      }
    }
    if (section.fields) {
      for (const row of section.fields) {
        for (const f of row) {
          if (!allNames.has(f)) {
            errors.push(`Form section '${section.title}' references field '${f}' not in fields/relations`);
          }
        }
      }
    }
  }

  // Check UI kanban
  if (def.ui?.kanban) {
    if (!fieldNames.has(def.ui.kanban.statusField)) {
      errors.push(`kanban.statusField '${def.ui.kanban.statusField}' not in fields`);
    }
    if (!allNames.has(def.ui.kanban.cardTitle)) {
      errors.push(`kanban.cardTitle '${def.ui.kanban.cardTitle}' not in fields`);
    }
  }

  // Check UI calendar
  if (def.ui?.calendar) {
    if (!fieldNames.has(def.ui.calendar.dateField)) {
      errors.push(`calendar.dateField '${def.ui.calendar.dateField}' not in fields`);
    }
    if (!allNames.has(def.ui.calendar.titleField)) {
      errors.push(`calendar.titleField '${def.ui.calendar.titleField}' not in fields`);
    }
  }

  // Check UI tree
  if (def.ui?.tree) {
    if (!fieldNames.has(def.ui.tree.parentField)) {
      errors.push(`tree.parentField '${def.ui.tree.parentField}' not in fields`);
    }
    if (!allNames.has(def.ui.tree.labelField)) {
      errors.push(`tree.labelField '${def.ui.tree.labelField}' not in fields`);
    }
  }

  // Check detail tabs
  if (def.ui?.detail?.tabs) {
    for (const tab of def.ui.detail.tabs) {
      if (!relationNames.has(tab.relation)) {
        errors.push(`detail tab '${tab.title}' references relation '${tab.relation}' not in relations`);
      }
    }
  }

  // Check appearance targets
  if (def.ui?.appearance) {
    for (const rule of def.ui.appearance) {
      for (const target of rule.targets) {
        if (target !== "*" && !allNames.has(target)) {
          errors.push(`appearance targets '${target}' not in fields/relations`);
        }
      }
    }
  }

  return errors;
}

export const checkCommand = new Command("check")
  .description("Validate entity definitions for consistency")
  .action(async () => {
    let hasErrors = false;

    // Check project dir exists
    if (!existsSync(PROJECT_DIR)) {
      console.error("  \u274C  project/ directory not found");
      process.exit(1);
    }

    // Check appinfo
    const appinfo = await loadAppInfo();
    if (!appinfo) {
      console.log("  \u26A0\uFE0F   appinfo.ts not found (optional)");
    } else {
      console.log("  \u2705  appinfo.ts OK");
    }

    // Load entities
    if (!existsSync(ENTITIES_DIR)) {
      console.error("  \u274C  project/entities/ directory not found");
      process.exit(1);
    }

    const entityFiles = readdirSync(ENTITIES_DIR).filter((f) => f.endsWith(".entity.ts"));
    if (entityFiles.length === 0) {
      console.error("  \u274C  No .entity.ts files found in project/entities/");
      process.exit(1);
    }

    const allEntityNames = new Set(entityFiles.map((f) => f.replace(".entity.ts", "")));
    const results: CheckResult[] = [];

    for (const file of entityFiles) {
      const name = file.replace(".entity.ts", "");
      const filePath = join(ENTITIES_DIR, file);
      const def = await loadEntity(filePath);

      if (!def) {
        results.push({ entity: name, ok: false, errors: [`Failed to load ${file}`] });
        continue;
      }

      const errors = checkEntity(name, def, allEntityNames);
      results.push({ entity: name, ok: errors.length === 0, errors });
    }

    // Print results
    for (const r of results) {
      if (r.ok) {
        console.log(`  \u2705  ${r.entity} \u2192 entities/${r.entity}.entity.ts OK`);
      } else {
        hasErrors = true;
        console.log(`  \u274C  ${r.entity} \u2192 entities/${r.entity}.entity.ts`);
        for (const e of r.errors) {
          console.log(`      ${e}`);
        }
      }
    }

    // Check menu
    const menu = await loadMenu();
    if (!menu) {
      console.log("  \u26A0\uFE0F   menu.ts not found (optional)");
    } else {
      let menuOk = true;
      for (const group of menu) {
        for (const item of group.items) {
          if (item.entity && !allEntityNames.has(item.entity)) {
            // Check system models too
            const systemModels = new Set(["User", "RefreshToken"]);
            if (!systemModels.has(item.entity)) {
              console.log(`  \u274C  menu.ts references entity '${item.entity}' not in entities/`);
              hasErrors = true;
              menuOk = false;
            }
          }
        }
      }
      if (menuOk) {
        console.log("  \u2705  menu.ts OK");
      }
    }

    console.log("");
    if (hasErrors) {
      console.log("Some checks failed. Fix the errors above and re-run: zenku check");
      process.exit(1);
    } else {
      console.log(`All checks passed (${entityFiles.length} entities)`);
    }
  });

import { Command } from "commander";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import type { EntityDefinition, FieldDefinition, RelationDefinition } from "@zenku/core";

const ROOT = resolve(import.meta.dirname, "../../..");
const PROJECT_DIR = join(ROOT, "project");
const ENTITIES_DIR = join(PROJECT_DIR, "entities");
const SERVER_DIR = join(ROOT, "packages/server");
const SCHEMA_OUTPUT = join(SERVER_DIR, "schema.zmodel");
const SCHEMA_BASE = join(SERVER_DIR, "schema.base.zmodel");

interface EntityEntry {
  name: string;
  def: EntityDefinition;
}

async function loadEntities(): Promise<EntityEntry[]> {
  if (!existsSync(ENTITIES_DIR)) {
    throw new Error("project/entities/ directory not found");
  }

  const files = readdirSync(ENTITIES_DIR).filter((f) => f.endsWith(".entity.ts"));
  const entries: EntityEntry[] = [];

  for (const file of files) {
    const name = file.replace(".entity.ts", "");
    const mod = await import(join(ENTITIES_DIR, file));
    entries.push({ name, def: mod.default as EntityDefinition });
  }

  return entries;
}

function fieldTypeToZmodel(fdef: FieldDefinition): string {
  if (fdef.enum) return fdef.enum;
  return fdef.type;
}

function generateFieldLine(name: string, fdef: FieldDefinition): string {
  const parts: string[] = [];

  // Field name and type
  let typeStr = fieldTypeToZmodel(fdef);

  // Optional/required
  const isOptional = fdef.optional === true || (fdef.required !== true && fdef.type !== "Boolean");
  // Actually be more nuanced: if required is explicitly true, not optional. If optional is explicitly true, optional.
  // If neither set: for most types it's required by default in Prisma
  const shouldBeOptional = fdef.optional === true || (!fdef.required && fdef.computed);
  if (shouldBeOptional) {
    typeStr += "?";
  }

  parts.push(`  ${name}`);
  parts.push(typeStr);

  // Attributes
  const attrs: string[] = [];

  if (fdef.unique) attrs.push("@unique");

  if (fdef.default !== undefined) {
    const val = fdef.default;
    if (typeof val === "string") {
      // Check for Prisma functions
      if (val === "cuid()" || val === "uuid()" || val === "now()" || val === "autoincrement()") {
        attrs.push(`@default(${val})`);
      } else if (fdef.enum) {
        // Enum defaults are bare identifiers (not quoted)
        attrs.push(`@default(${val})`);
      } else {
        attrs.push(`@default("${val}")`);
      }
    } else if (typeof val === "number" || typeof val === "boolean") {
      attrs.push(`@default(${val})`);
    }
  }

  if (fdef.omit) attrs.push("@omit");

  // Documentation comment for computed fields
  let docComment = "";
  if (fdef.computed && fdef.formula) {
    docComment = `  /// @computed: ${fdef.formula}`;
  }

  const line = [parts.join(String.raw`    `.replace(/    /g, " ".repeat(Math.max(1, 16 - name.length)))), ...attrs].join(" ");
  if (docComment) {
    return `${line}${docComment}`;
  }
  return line;
}

function generateRelationLines(
  entityName: string,
  relations: Record<string, RelationDefinition>,
  fields: Record<string, FieldDefinition>
): string[] {
  const lines: string[] = [];

  for (const [rname, rdef] of Object.entries(relations)) {
    if ((rdef.isList || rdef.isDetail) && !rdef.field) {
      // List relation (one-to-many, "many" side has no FK here)
      if (rdef.relationName) {
        lines.push(`  ${rname}  ${rdef.type}[]  @relation("${rdef.relationName}")`);
      } else {
        lines.push(`  ${rname}  ${rdef.type}[]`);
      }
    } else if (rdef.field) {
      // Single relation with FK
      const attrs: string[] = [];
      attrs.push(`@relation(fields: [${rdef.field}], references: [id]`);
      if (rdef.onDelete) {
        attrs[0] += `, onDelete: ${rdef.onDelete}`;
      }
      if (rdef.relationName) {
        attrs[0] = `@relation("${rdef.relationName}", fields: [${rdef.field}], references: [id]`;
        if (rdef.onDelete) {
          attrs[0] += `, onDelete: ${rdef.onDelete}`;
        }
      }
      attrs[0] += ")";
      lines.push(`  ${rname}  ${rdef.type}${fields[rdef.field]?.optional ? "?" : ""}  ${attrs.join(" ")}`);
    } else if (rdef.relationName) {
      // Self-referential reverse relation
      lines.push(`  ${rname}  ${rdef.type}[]  @relation("${rdef.relationName}")`);
    } else {
      // Simple reverse relation (no FK)
      lines.push(`  ${rname}  ${rdef.type}[]`);
    }
  }

  return lines;
}

function generateEnumBlock(enumName: string, values: string[]): string {
  const lines = [`enum ${enumName} {`];
  for (const v of values) {
    lines.push(`  ${v}`);
  }
  lines.push("}");
  return lines.join("\n");
}

function generateAccessLines(access: EntityDefinition["access"]): string[] {
  if (!access) return [];
  const lines: string[] = [];

  if (access.all) {
    lines.push(`  @@allow('all', ${access.all})`);
    return lines;
  }

  // Group same-policy operations
  const policyMap = new Map<string, string[]>();
  for (const op of ["read", "create", "update", "delete"] as const) {
    const policy = access[op];
    if (policy) {
      const existing = policyMap.get(policy);
      if (existing) {
        existing.push(op);
      } else {
        policyMap.set(policy, [op]);
      }
    }
  }

  for (const [policy, ops] of policyMap) {
    lines.push(`  @@allow('${ops.join(",")}', ${policy})`);
  }

  return lines;
}

function generateModelBlock(entry: EntityEntry): string {
  const { name, def } = entry;
  const lines: string[] = [`model ${name} {`];

  // ID field
  lines.push("  id  String  @id @default(cuid())");

  // Regular fields
  for (const [fname, fdef] of Object.entries(def.fields)) {
    lines.push(generateFieldLine(fname, fdef));
  }

  // Relations
  if (def.relations) {
    lines.push(...generateRelationLines(name, def.relations, def.fields));
  }

  // Timestamps
  lines.push("  createdAt  DateTime  @default(now())");
  if (!Object.values(def.fields).some((f) => f.computed)) {
    // Only add updatedAt if entity is mutable
    lines.push("  updatedAt  DateTime  @updatedAt");
  } else {
    lines.push("  updatedAt  DateTime  @updatedAt");
  }

  // Blank line before access
  lines.push("");

  // Access policies
  const accessLines = generateAccessLines(def.access);
  if (accessLines.length > 0) {
    lines.push(...accessLines);
  }

  lines.push("}");
  return lines.join("\n");
}

export function generateSchemaContent(entities: EntityEntry[], baseSchemaPath?: string): string {
  const sections: string[] = [];

  // Header
  sections.push("// AUTO-GENERATED by zenku generate — DO NOT EDIT MANUALLY");
  sections.push("// Source: project/entities/*.entity.ts + schema.base.zmodel");
  sections.push("");

  // Inline base schema (system models: User, RefreshToken, datasource, generator, Role enum)
  const basePath = baseSchemaPath ?? SCHEMA_BASE;
  if (existsSync(basePath)) {
    let baseContent = readFileSync(basePath, "utf-8");
    // Strip leading comments
    baseContent = baseContent.replace(/^\/\/.*\r?\n/gm, "").trim();

    // Inject reverse relations into User model based on entity definitions
    const userReverseRelations: string[] = [];
    for (const entry of entities) {
      if (!entry.def.relations) continue;
      for (const [, rdef] of Object.entries(entry.def.relations)) {
        if (rdef.type === "User" && rdef.field) {
          // This entity has a FK to User → User needs a reverse relation
          const reverseField = `${entry.name.charAt(0).toLowerCase()}${entry.name.slice(1)}s`;
          // Check if already present in base schema
          if (!baseContent.includes(`${reverseField}`)) {
            userReverseRelations.push(`  ${reverseField}     ${entry.name}[]`);
          }
        }
      }
    }

    // Insert reverse relations before the closing of User model
    if (userReverseRelations.length > 0) {
      // Find lines between "model User {" and the next "}" that contains @@
      const userModelMatch = baseContent.match(/(model User \{[\s\S]*?)(  createdAt)/);
      if (userModelMatch) {
        // Remove existing reverse relation lines (lines with [] that reference entity models)
        const entityNames = new Set(entities.map(e => e.name));
        const lines = baseContent.split("\n");
        const filteredLines = lines.filter(line => {
          const match = line.match(/^\s+(\w+)\s+(\w+)\[\]/);
          if (match && entityNames.has(match[2])) {
            return false; // Remove old reverse relation
          }
          return true;
        });
        baseContent = filteredLines.join("\n");

        // Now insert fresh reverse relations before createdAt
        baseContent = baseContent.replace(
          /(model User \{[\s\S]*?)(  createdAt)/,
          `$1${userReverseRelations.join("\n")}\n$2`
        );
      }
    }

    sections.push(baseContent);
    sections.push("");
  }

  // Collect all enums from all entities
  const allEnums = new Map<string, string[]>();
  for (const entry of entities) {
    if (entry.def.enums) {
      for (const [enumName, values] of Object.entries(entry.def.enums)) {
        allEnums.set(enumName, values);
      }
    }
  }

  // Enum blocks
  for (const [enumName, values] of allEnums) {
    sections.push(generateEnumBlock(enumName, values));
    sections.push("");
  }

  // Model blocks
  for (const entry of entities) {
    sections.push(generateModelBlock(entry));
    sections.push("");
  }

  return sections.join("\n");
}

async function runGenerate() {
  console.log("[generate] Loading entities...");
  const entities = await loadEntities();
  console.log(`[generate] Found ${entities.length} entities`);

  // Generate schema.zmodel
  const schemaContent = generateSchemaContent(entities);
  writeFileSync(SCHEMA_OUTPUT, schemaContent, "utf-8");
  console.log(`[generate] Written ${SCHEMA_OUTPUT}`);

  // Check that schema.base.zmodel exists
  if (!existsSync(SCHEMA_BASE)) {
    console.error(`[generate] WARNING: ${SCHEMA_BASE} not found. System models (User, RefreshToken) must be defined there.`);
  }

  // Run zenstack generate
  console.log("[generate] Running zenstack generate...");
  const proc = Bun.spawn(["bunx", "zenstack", "generate"], {
    cwd: SERVER_DIR,
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    console.error("[generate] zenstack generate failed");
    process.exit(exitCode);
  }

  console.log("[generate] Done!");
}

export const generateCommand = new Command("generate")
  .description("Generate schema.zmodel from entity files and run zenstack generate")
  .action(runGenerate);

export { runGenerate, loadEntities };

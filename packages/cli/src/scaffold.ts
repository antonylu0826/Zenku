import { Command } from "commander";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";

const ENTITIES_DIR = resolve(import.meta.dirname, "../../..", "project/entities");

function generateTemplate(entityName: string): string {
  return `import { defineEntity } from '@zenku/core'

export default defineEntity({
  fields: {
    // TODO: define fields
    // Example: name: { type: 'String', required: true, length: 100 },
  },

  relations: {},

  enums: {},

  access: {
    read:   'auth() != null',
    create: "auth().role == 'ADMIN'",
    update: "auth().role == 'ADMIN'",
    delete: "auth().role == 'ADMIN'",
  },

  hooks: {},

  ui: {
    icon: 'File',
    defaultView: 'list',
    list:   { columns: [] },
    form:   { sections: [] },
  },

  i18n: {
    en:      { caption: '${entityName}', fields: {} },
    'zh-TW': { caption: '',              fields: {} },
  },
})
`;
}

export const scaffoldCommand = new Command("scaffold")
  .description("Generate a new entity template file")
  .argument("<name>", "Entity name (PascalCase, e.g. Invoice)")
  .action((name: string) => {
    if (!existsSync(ENTITIES_DIR)) {
      mkdirSync(ENTITIES_DIR, { recursive: true });
    }

    const fileName = `${name}.entity.ts`;
    const filePath = join(ENTITIES_DIR, fileName);

    if (existsSync(filePath)) {
      console.error(`  SKIP  ${fileName} already exists`);
      process.exit(1);
    }

    writeFileSync(filePath, generateTemplate(name), "utf-8");
    console.log(`  CREATE  ${fileName}`);
    console.log(`\nEdit project/entities/${fileName} then run: zenku check`);
  });

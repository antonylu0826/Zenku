import { Command } from "commander";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { generateListPage } from "./templates/list";
import { generateFormPage } from "./templates/form";
import { generateDetailPage } from "./templates/detail";
import type { ModelMeta } from "@zenku/core";

const PAGES_DIR = resolve(
  import.meta.dirname,
  "../../client/src/pages/ejected",
);

async function fetchSchema(): Promise<ModelMeta[]> {
  // Try fetching from running server first
  try {
    const res = await fetch("http://localhost:3001/api/schema");
    if (res.ok) {
      const data = await res.json();
      return data.models;
    }
  } catch {
    // Server not running — fall back to Prisma DMMF
  }

  // Fallback: read from Prisma DMMF directly
  const { Prisma } = await import("@prisma/client");
  return Prisma.dmmf.datamodel.models.map((model: any) => ({
    name: model.name,
    plural: model.name.endsWith("y")
      ? model.name.slice(0, -1) + "ies"
      : model.name + "s",
    fields: model.fields.map((f: any) => ({
      name: f.name,
      type: f.type === "Int" || f.type === "Float" || f.type === "Decimal"
        ? f.type
        : f.type === "Boolean"
          ? "Boolean"
          : f.type === "DateTime"
            ? "DateTime"
            : "String",
      isRequired: f.isRequired,
      isList: f.isList,
      isId: f.isId,
      isUnique: f.isUnique,
      isRelation: !!f.relationName,
      ...(f.relationName ? { relationModel: f.type } : {}),
    })),
  }));
}

type PageType = "list" | "form" | "detail";

const generators: Record<PageType, (model: ModelMeta) => string> = {
  list: generateListPage,
  form: generateFormPage,
  detail: generateDetailPage,
};

const fileSuffix: Record<PageType, string> = {
  list: "ListPage",
  form: "FormPage",
  detail: "DetailPage",
};

export const ejectCommand = new Command("eject")
  .description("Eject a generic page into a concrete React component")
  .argument("<entity>", "Entity name (e.g. Product)")
  .option("--page <type>", "Page type: list, form, detail, or all", "all")
  .action(async (entity: string, opts: { page: string }) => {
    const models = await fetchSchema();
    const model = models.find(
      (m) => m.name.toLowerCase() === entity.toLowerCase(),
    );

    if (!model) {
      console.error(
        `Entity "${entity}" not found. Available: ${models.map((m) => m.name).join(", ")}`,
      );
      process.exit(1);
    }

    const pages: PageType[] =
      opts.page === "all" ? ["list", "form", "detail"] : [opts.page as PageType];

    if (!existsSync(PAGES_DIR)) {
      mkdirSync(PAGES_DIR, { recursive: true });
    }

    for (const pageType of pages) {
      const generator = generators[pageType];
      if (!generator) {
        console.error(`Unknown page type: ${pageType}`);
        continue;
      }

      const code = generator(model);
      const fileName = `${model.name}${fileSuffix[pageType]}.tsx`;
      const filePath = join(PAGES_DIR, fileName);

      if (existsSync(filePath)) {
        console.log(`  SKIP  ${fileName} (already exists)`);
        continue;
      }

      writeFileSync(filePath, code, "utf-8");
      console.log(`  EJECT ${fileName}`);
    }

    console.log(
      `\nDone! Ejected pages are in packages/client/src/pages/ejected/`,
    );
    console.log(
      `The app will automatically use ejected pages instead of generic ones.`,
    );
  });

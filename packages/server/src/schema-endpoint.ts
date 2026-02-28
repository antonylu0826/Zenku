import { Hono } from "hono";
import { Prisma } from "@prisma/client";
import type { ModelMeta, FieldMeta, FieldType } from "@zenku/core";

const EXCLUDED_MODELS = ["User"];

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

function pluralize(name: string): string {
  if (name.endsWith("y")) return name.slice(0, -1) + "ies";
  if (name.endsWith("s")) return name + "es";
  return name + "s";
}

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
          relationModel: f.type !== f.name ? undefined : f.type,
          ...(f.relationName ? { relationModel: f.type } : {}),
        }));

        return {
          name: model.name,
          plural: pluralize(model.name),
          fields,
        };
      });

    c.header("Cache-Control", "max-age=60");
    return c.json({ models });
  });

  return app;
}

import { z } from "zod";
import { Prisma } from "@prisma/client";

/**
 * Map Prisma DMMF field types to Zod validators.
 * Returns undefined for fields that should be skipped (id, relation fields, etc.)
 */
function fieldToZod(
    field: Prisma.DMMF.Field,
    isUpdate = false,
): z.ZodTypeAny | undefined {
    // Skip id, relation fields, managed timestamps
    if (field.isId) return undefined;
    if (field.relationName) return undefined;
    if (["createdAt", "updatedAt"].includes(field.name)) return undefined;

    let schema: z.ZodTypeAny;

    switch (field.type) {
        case "String":
            schema = z.string();
            break;
        case "Int":
            schema = z.number().int();
            break;
        case "Float":
        case "Decimal":
            schema = z.number();
            break;
        case "Boolean":
            schema = z.boolean();
            break;
        case "DateTime":
            // Accept ISO string or Date coercion
            schema = z.coerce.date();
            break;
        case "Json":
            schema = z.unknown();
            break;
        default:
            schema = z.unknown();
    }

    // Optional if not required, has a default value, or if it's an update (all fields optional for PATCH semantics)
    const hasDefault = field.default !== undefined && field.default !== null;
    if (!field.isRequired || hasDefault || isUpdate) {
        schema = schema.nullable().optional();
    }

    return schema;
}

/**
 * Build the Zod schema for creating a model (required fields enforced).
 */
export function getCreateSchema(modelName: string): z.ZodObject<any> {
    const model = Prisma.dmmf.datamodel.models.find((m) => m.name === modelName);
    if (!model) {
        return z.object({});
    }

    const shape: Record<string, z.ZodTypeAny> = {};
    for (const field of model.fields) {
        const schema = fieldToZod(field, false);
        if (schema !== undefined) {
            shape[field.name] = schema;
        }
    }

    return z.object(shape).passthrough();
}

/**
 * Build the Zod schema for updating a model (all fields optional).
 */
export function getUpdateSchema(modelName: string): z.ZodObject<any> {
    const model = Prisma.dmmf.datamodel.models.find((m) => m.name === modelName);
    if (!model) {
        return z.object({});
    }

    const shape: Record<string, z.ZodTypeAny> = {};
    for (const field of model.fields) {
        const schema = fieldToZod(field, true);
        if (schema !== undefined) {
            shape[field.name] = schema;
        }
    }

    return z.object(shape).partial().passthrough();
}

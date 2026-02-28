import { Hono } from "hono";
import type { Context, Next } from "hono";
import { Prisma } from "@prisma/client";
import { getEnhancedPrisma } from "./db";
import { config } from "./config";

// Models excluded from AI tools (internal/sensitive)
const EXCLUDED_MODELS = new Set(["User", "RefreshToken"]);

type ToolDefinition = {
    name: string;
    description: string;
    parameters: {
        type: "object";
        properties: Record<string, { type: string; description: string }>;
        required?: string[];
    };
};

function prismaTypeToJsonSchema(type: string): string {
    switch (type) {
        case "Int":
        case "Float":
        case "Decimal":
            return "number";
        case "Boolean":
            return "boolean";
        default:
            return "string";
    }
}

export function buildToolDefinitions(): ToolDefinition[] {
    const dmmf = Prisma.dmmf;
    const tools: ToolDefinition[] = [];

    for (const model of dmmf.datamodel.models) {
        if (EXCLUDED_MODELS.has(model.name)) continue;

        const modelName = model.name;
        const lowerName = modelName.charAt(0).toLowerCase() + modelName.slice(1);

        // Scalar fields for create/update schemas
        const scalarFields = model.fields.filter(
            (f) => !f.relationName && f.name !== "id" && f.name !== "createdAt" && f.name !== "updatedAt",
        );

        const fieldProps: Record<string, { type: string; description: string }> = {};
        const requiredFields: string[] = [];

        for (const field of scalarFields) {
            fieldProps[field.name] = {
                type: prismaTypeToJsonSchema(field.type),
                description: `${field.name} (${field.type}${field.isRequired ? ", required" : ", optional"})`,
            };
            if (field.isRequired && !field.hasDefaultValue) {
                requiredFields.push(field.name);
            }
        }

        // list_Model
        tools.push({
            name: `list_${modelName}`,
            description: `List all ${modelName} records. Returns an array.`,
            parameters: {
                type: "object",
                properties: {
                    take: { type: "number", description: "Max records to return (default 20)" },
                    skip: { type: "number", description: "Records to skip for pagination" },
                    orderBy: { type: "string", description: "Field name to order by" },
                },
            },
        });

        // get_Model
        tools.push({
            name: `get_${modelName}`,
            description: `Get a single ${modelName} by ID.`,
            parameters: {
                type: "object",
                properties: {
                    id: { type: "string", description: `The ${modelName} ID` },
                },
                required: ["id"],
            },
        });

        // create_Model
        tools.push({
            name: `create_${modelName}`,
            description: `Create a new ${modelName} record.`,
            parameters: {
                type: "object",
                properties: fieldProps,
                ...(requiredFields.length > 0 ? { required: requiredFields } : {}),
            },
        });

        // update_Model
        tools.push({
            name: `update_${modelName}`,
            description: `Update an existing ${modelName} record by ID.`,
            parameters: {
                type: "object",
                properties: {
                    id: { type: "string", description: `The ${modelName} ID` },
                    ...fieldProps,
                },
                required: ["id"],
            },
        });

        // delete_Model
        tools.push({
            name: `delete_${modelName}`,
            description: `Delete a ${modelName} record by ID.`,
            parameters: {
                type: "object",
                properties: {
                    id: { type: "string", description: `The ${modelName} ID` },
                },
                required: ["id"],
            },
        });

        void lowerName; // referenced in executeTool
    }

    return tools;
}

export async function executeTool(
    name: string,
    args: Record<string, unknown>,
    user: { id: string; role: string },
): Promise<unknown> {
    const db = getEnhancedPrisma(user) as any;

    const match = name.match(/^(list|get|create|update|delete)_(.+)$/);
    if (!match) throw new Error(`Unknown tool: ${name}`);

    const [, action, modelName] = match;
    const lowerName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    const model = db[lowerName];
    if (!model) throw new Error(`Unknown model: ${modelName}`);

    switch (action) {
        case "list": {
            const { take = 20, skip = 0, orderBy } = args;
            return model.findMany({
                take: Number(take),
                skip: Number(skip),
                ...(orderBy ? { orderBy: { [String(orderBy)]: "asc" } } : {}),
            });
        }
        case "get":
            return model.findUnique({ where: { id: args.id } });
        case "create":
            return model.create({ data: args });
        case "update": {
            const { id, ...data } = args;
            return model.update({ where: { id }, data });
        }
        case "delete":
            return model.delete({ where: { id: args.id } });
        default:
            throw new Error(`Unknown action: ${action}`);
    }
}

export function apiKeyMiddleware(cfg: { AI_API_KEY?: string }) {
    return async (c: Context, next: Next) => {
        if (!cfg.AI_API_KEY) {
            return c.json({ error: "AI API not configured" }, 503);
        }
        const key = c.req.header("X-API-Key");
        if (key !== cfg.AI_API_KEY) {
            return c.json({ error: "Unauthorized" }, 401);
        }
        await next();
    };
}

// A minimal "system user" for AI tool execution (admin-level)
const AI_SYSTEM_USER = { id: "ai-system", role: "ADMIN" };

export function createAiRoutes() {
    const app = new Hono();

    app.use("*", apiKeyMiddleware(config));

    app.get("/tools", (c) => {
        return c.json(buildToolDefinitions());
    });

    app.post("/execute", async (c) => {
        const body = await c.req.json() as { tool: string; arguments?: Record<string, unknown> };
        if (!body.tool) return c.json({ error: "Missing tool name" }, 400);

        try {
            const result = await executeTool(body.tool, body.arguments ?? {}, AI_SYSTEM_USER);
            return c.json({ result });
        } catch (err: any) {
            return c.json({ error: err.message }, 400);
        }
    });

    return app;
}

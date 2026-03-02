import { Hono } from "hono";
import { Prisma } from "@prisma/client";
import type { Context } from "hono";
import { getEnhancedPrisma } from "./db";
import { authMiddleware } from "./auth";
import { Errors } from "./errors";
import { getCreateSchema, getUpdateSchema } from "./validation";

// Models to exclude from auto CRUD
const EXCLUDED_MODELS = ["User", "RefreshToken"];

// Query params that are not field filters
const RESERVED_PARAMS = new Set([
    "page",
    "pageSize",
    "sort",
    "sortDir",
    "search",
    "fields",
    "include",
    "format",
]);

function getModels() {
    return Prisma.dmmf.datamodel.models.filter(
        (m) => !EXCLUDED_MODELS.includes(m.name),
    );
}

function getModelDelegate(prisma: any, modelName: string) {
    const key = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    return prisma[key];
}

// Parse ?fields=name,price,category.name → Prisma select object (id always included)
function parseFieldsSelect(fields: string): Record<string, unknown> {
    const select: Record<string, unknown> = { id: true };
    for (const f of fields
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)) {
        const dot = f.indexOf(".");
        if (dot === -1) {
            select[f] = true;
        } else {
            const rel = f.slice(0, dot);
            const sub = f.slice(dot + 1);
            if (!select[rel] || select[rel] === true) {
                select[rel] = { select: { id: true } };
            }
            (select[rel] as any).select[sub] = true;
        }
    }
    return select;
}

// Build orderBy: "category.name" → { category: { name: dir } }
function buildOrderBy(sort: string, dir: "asc" | "desc") {
    const dot = sort.indexOf(".");
    return dot === -1
        ? { [sort]: dir }
        : { [sort.slice(0, dot)]: { [sort.slice(dot + 1)]: dir } };
}

// Extract where + orderBy from request — shared by list and export
function buildListWhere(
    c: Context,
    model: (typeof Prisma.dmmf.datamodel.models)[number],
): { where: any; orderBy: any } {
    const sort = c.req.query("sort") || "createdAt";
    const sortDir = c.req.query("sortDir") === "asc" ? "asc" : "desc";
    const search = c.req.query("search");

    let where: any = {};

    // Text search across string fields
    if (search) {
        const stringFields = model.fields.filter(
            (f) => f.type === "String" && !f.isId && !f.relationName,
        );
        if (stringFields.length > 0) {
            where.OR = stringFields.map((f) => ({
                [f.name]: { contains: search },
            }));
        }
    }

    // Field-level filters from query params
    for (const field of model.fields) {
        if (field.relationName || field.isId) continue;
        const val = c.req.query(field.name);
        if (val === undefined || RESERVED_PARAMS.has(field.name)) continue;

        if (field.type === "Boolean") {
            where[field.name] = val === "true";
        } else if (field.type === "Int" || field.type === "Float") {
            where[field.name] = Number(val);
        } else {
            where[field.name] = val;
        }
    }

    // Nested filters: any param key with "." → relation filter
    // e.g. ?category.name=Electronics → where.category = { name: "Electronics" }
    const allParams = c.req.queries();
    for (const [key, vals] of Object.entries(allParams)) {
        if (RESERVED_PARAMS.has(key)) continue;
        const dot = key.indexOf(".");
        if (dot === -1) continue; // flat filters already handled above
        const rel = key.slice(0, dot);
        const field = key.slice(dot + 1);
        const val = vals[0]; // take first value
        where[rel] = { ...(where[rel] ?? {}), [field]: val };
    }

    return { where, orderBy: buildOrderBy(sort, sortDir) };
}

export function createCrudRoutes() {
    const app = new Hono();
    app.use("*", authMiddleware);
    const models = getModels();

    for (const model of models) {
        const name = model.name;
        const path = name.charAt(0).toLowerCase() + name.slice(1);

        // Relation fields for include
        const relationFields = model.fields
            .filter((f) => f.relationName && !f.isList)
            .map((f) => f.name);

        const includeRelations =
            relationFields.length > 0
                ? Object.fromEntries(
                    relationFields.map((f) => {
                        const targetModel = model.fields.find(
                            (mf) => mf.name === f,
                        )?.type;
                        if (targetModel === "User") {
                            return [
                                f,
                                {
                                    select: {
                                        id: true,
                                        email: true,
                                        name: true,
                                        role: true,
                                    },
                                },
                            ];
                        }
                        return [f, true];
                    }),
                )
                : undefined;

        // GET list — /api/:model
        app.get(`/${path}`, async (c) => {
            const user = (c as any).get("user") || null;
            const db = getEnhancedPrisma(user);
            const delegate = getModelDelegate(db, name);

            const page = Math.max(1, Number(c.req.query("page")) || 1);
            const pageSize = Math.min(
                100,
                Math.max(1, Number(c.req.query("pageSize")) || 20),
            );
            const fieldsParam = c.req.query("fields");
            const includeParam = c.req.query("include");

            const { where, orderBy } = buildListWhere(c, model);

            // Determine select vs include
            let prismaQueryExtra: Record<string, unknown>;
            if (fieldsParam) {
                prismaQueryExtra = { select: parseFieldsSelect(fieldsParam) };
            } else if (includeParam) {
                const explicit: Record<string, unknown> = {};
                for (const rel of includeParam
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)) {
                    const relField = model.fields.find(
                        (f) => f.name === rel && f.relationName,
                    );
                    if (relField) {
                        explicit[rel] =
                            relField.type === "User"
                                ? {
                                    select: {
                                        id: true,
                                        email: true,
                                        name: true,
                                        role: true,
                                    },
                                }
                                : true;
                    }
                }
                prismaQueryExtra = { include: explicit };
            } else {
                prismaQueryExtra = { include: includeRelations };
            }

            const [data, total] = await Promise.all([
                delegate.findMany({
                    where,
                    orderBy,
                    skip: (page - 1) * pageSize,
                    take: pageSize,
                    ...prismaQueryExtra,
                }),
                delegate.count({ where }),
            ]);

            return c.json({
                data,
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize),
            });
        });

        // DELETE /api/:model/batch  { ids: string[] }
        app.delete(`/${path}/batch`, async (c) => {
            const user = (c as any).get("user") as
                | { id: string; role: string }
                | undefined;
            const db = getEnhancedPrisma(user);
            const delegate = getModelDelegate(db, name);
            const { ids } = await c.req.json<{ ids: string[] }>();
            if (!Array.isArray(ids) || ids.length === 0)
                throw Errors.badRequest("ids must be a non-empty array");
            const result = await delegate.deleteMany({
                where: { id: { in: ids } },
            });
            return c.json({ deleted: result.count });
        });

        // PATCH /api/:model/batch  { ids: string[], data: {} }
        app.patch(`/${path}/batch`, async (c) => {
            const user = (c as any).get("user") as
                | { id: string; role: string }
                | undefined;
            const db = getEnhancedPrisma(user);
            const delegate = getModelDelegate(db, name);
            const { ids, data } = await c.req.json<{
                ids: string[];
                data: Record<string, unknown>;
            }>();
            if (!Array.isArray(ids) || ids.length === 0)
                throw Errors.badRequest("ids must be a non-empty array");
            const schema = getUpdateSchema(name);
            const parsed = schema.safeParse(data);
            if (!parsed.success)
                throw Errors.validation(parsed.error.flatten().fieldErrors);
            const result = await delegate.updateMany({
                where: { id: { in: ids } },
                data: parsed.data,
            });
            return c.json({ updated: result.count });
        });

        // GET /api/:model/export?format=csv
        app.get(`/${path}/export`, async (c) => {
            if (c.req.query("format") !== "csv")
                throw Errors.badRequest("Use ?format=csv");
            const user = (c as any).get("user") as
                | { id: string; role: string }
                | undefined;
            const db = getEnhancedPrisma(user);
            const delegate = getModelDelegate(db, name);
            const { where, orderBy } = buildListWhere(c, model);
            const rows = await delegate.findMany({
                where,
                orderBy,
                take: 10000,
                include: includeRelations,
            });
            const scalarFields = model.fields
                .filter((f) => !f.isList)
                .map((f) => f.name);
            const escape = (v: unknown) => {
                if (v === null || v === undefined) return "";
                const s =
                    typeof v === "object" ? JSON.stringify(v) : String(v);
                return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
            };
            const csv = [
                scalarFields.join(","),
                ...rows.map((r: any) =>
                    scalarFields.map((f) => escape(r[f])).join(","),
                ),
            ].join("\r\n");
            return new Response(csv, {
                headers: {
                    "Content-Type": "text/csv; charset=utf-8",
                    "Content-Disposition": `attachment; filename="${name.toLowerCase()}.csv"`,
                },
            });
        });

        // GET by id — /api/:model/:id
        app.get(`/${path}/:id`, async (c) => {
            const user = (c as any).get("user") as
                | { id: string; role: string }
                | undefined;
            const db = getEnhancedPrisma(user);
            const delegate = getModelDelegate(db, name);

            // Build include from ?include= query or use default relation includes
            const includeParam = c.req.query("include");
            let includeArg: Record<string, unknown> | undefined;
            if (includeParam) {
                includeArg = {};
                for (const rel of includeParam.split(",").map((s) => s.trim()).filter(Boolean)) {
                    const relField = model.fields.find((f) => f.name === rel && f.relationName);
                    if (relField) {
                        includeArg[rel] = relField.type === "User"
                            ? { select: { id: true, email: true, name: true, role: true } }
                            : true;
                    }
                }
            } else {
                includeArg = includeRelations;
            }

            const item = await delegate.findUnique({
                where: { id: c.req.param("id") },
                include: includeArg,
            });

            if (!item) throw Errors.notFound(name);
            return c.json(item);
        });

        // POST create — /api/:model
        app.post(`/${path}`, async (c) => {
            const user = (c as any).get("user") as
                | { id: string; role: string }
                | undefined;
            const db = getEnhancedPrisma(user);
            const delegate = getModelDelegate(db, name);

            const body = await c.req.json();

            // Zod validation
            const validation = getCreateSchema(name).safeParse(body);
            if (!validation.success) {
                console.error(`[CRUD] ${name} validation failed:`, JSON.stringify(validation.error.flatten().fieldErrors, null, 2));
                console.error(`[CRUD] Received body keys:`, Object.keys(body));
                throw Errors.validation(validation.error.flatten().fieldErrors);
            }

            // Remove relation objects, keep only scalar foreign key fields
            const data: any = {};
            for (const field of model.fields) {
                if (field.relationName) continue;
                if (field.name in body) {
                    data[field.name] = body[field.name];
                }
            }
            // Also pass nested write objects (e.g. items for sub-models)
            const scalarFieldNames = new Set(model.fields.filter(f => !f.relationName).map(f => f.name));
            for (const key of Object.keys(body)) {
                if (!scalarFieldNames.has(key) && typeof body[key] === "object" && body[key] !== null) {
                    data[key] = body[key];
                }
            }

            try {
                const item = await delegate.create({
                    data,
                    include: includeRelations,
                });
                return c.json(item, 201);
            } catch (e: any) {
                if (e.code === "P2002")
                    throw Errors.conflict(
                        "A record with this value already exists",
                    );
                throw Errors.badRequest(e.message);
            }
        });

        // PUT update — /api/:model/:id
        app.put(`/${path}/:id`, async (c) => {
            const user = (c as any).get("user") as
                | { id: string; role: string }
                | undefined;
            const db = getEnhancedPrisma(user);
            const delegate = getModelDelegate(db, name);

            const body = await c.req.json();

            const data: any = {};
            for (const field of model.fields) {
                if (field.relationName) continue;
                if (field.isId) continue;
                if (field.name in body) {
                    data[field.name] = body[field.name];
                }
            }
            // Also pass nested write objects (e.g. items for sub-models)
            const scalarFieldNamesPut = new Set(model.fields.filter(f => !f.relationName).map(f => f.name));
            for (const key of Object.keys(body)) {
                if (!scalarFieldNamesPut.has(key) && typeof body[key] === "object" && body[key] !== null) {
                    data[key] = body[key];
                }
            }

            try {
                const item = await delegate.update({
                    where: { id: c.req.param("id") },
                    data,
                    include: includeRelations,
                });
                return c.json(item);
            } catch (e: any) {
                if (e.code === "P2025") throw Errors.notFound(name);
                if (e.code === "P2002")
                    throw Errors.conflict(
                        "A record with this value already exists",
                    );
                throw Errors.badRequest(e.message);
            }
        });

        // DELETE — /api/:model/:id
        app.delete(`/${path}/:id`, async (c) => {
            const user = (c as any).get("user") as
                | { id: string; role: string }
                | undefined;
            const db = getEnhancedPrisma(user);
            const delegate = getModelDelegate(db, name);

            try {
                await delegate.delete({ where: { id: c.req.param("id") } });
                return c.json({ success: true });
            } catch (e: any) {
                if (e.code === "P2025") throw Errors.notFound(name);
                throw Errors.badRequest(e.message);
            }
        });
    }

    return app;
}

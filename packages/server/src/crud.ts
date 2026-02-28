import { Hono } from "hono";
import { Prisma } from "@prisma/client";
import { getEnhancedPrisma } from "./db";
import { authMiddleware } from "./auth";

// Models to exclude from auto CRUD
const EXCLUDED_MODELS = ["User"];

function getModels() {
  return Prisma.dmmf.datamodel.models.filter(
    (m) => !EXCLUDED_MODELS.includes(m.name),
  );
}

function getModelDelegate(prisma: any, modelName: string) {
  const key = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  return prisma[key];
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

    const includeRelations = relationFields.length > 0
      ? Object.fromEntries(
          relationFields.map((f) => {
            const targetModel = model.fields.find((mf) => mf.name === f)?.type;
            if (targetModel === "User") {
              return [f, { select: { id: true, email: true, name: true, role: true } }];
            }
            return [f, true];
          }),
        )
      : undefined;

    // GET list — /api/:model
    app.get(`/${path}`, async (c) => {
      const user = c.get("user") as
        | { id: string; role: string }
        | undefined;
      const db = getEnhancedPrisma(user);
      const delegate = getModelDelegate(db, name);

      const page = Math.max(1, Number(c.req.query("page")) || 1);
      const pageSize = Math.min(
        100,
        Math.max(1, Number(c.req.query("pageSize")) || 20),
      );
      const sort = c.req.query("sort") || "createdAt";
      const sortDir = c.req.query("sortDir") === "asc" ? "asc" : "desc";
      const search = c.req.query("search");

      // Build where clause
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
        if (val === undefined) continue;

        if (field.type === "Boolean") {
          where[field.name] = val === "true";
        } else if (field.type === "Int" || field.type === "Float") {
          where[field.name] = Number(val);
        } else {
          where[field.name] = val;
        }
      }

      const [data, total] = await Promise.all([
        delegate.findMany({
          where,
          orderBy: { [sort]: sortDir },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: includeRelations,
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

    // GET by id — /api/:model/:id
    app.get(`/${path}/:id`, async (c) => {
      const user = c.get("user") as
        | { id: string; role: string }
        | undefined;
      const db = getEnhancedPrisma(user);
      const delegate = getModelDelegate(db, name);

      const item = await delegate.findUnique({
        where: { id: c.req.param("id") },
        include: includeRelations,
      });

      if (!item) return c.json({ error: "Not found" }, 404);
      return c.json(item);
    });

    // POST create — /api/:model
    app.post(`/${path}`, async (c) => {
      const user = c.get("user") as
        | { id: string; role: string }
        | undefined;
      const db = getEnhancedPrisma(user);
      const delegate = getModelDelegate(db, name);

      const body = await c.req.json();

      // Remove relation objects, keep only foreign key fields
      const data: any = {};
      for (const field of model.fields) {
        if (field.relationName) continue;
        if (field.name in body) {
          data[field.name] = body[field.name];
        }
      }

      try {
        const item = await delegate.create({
          data,
          include: includeRelations,
        });
        return c.json(item, 201);
      } catch (e: any) {
        return c.json({ error: e.message }, 400);
      }
    });

    // PUT update — /api/:model/:id
    app.put(`/${path}/:id`, async (c) => {
      const user = c.get("user") as
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

      try {
        const item = await delegate.update({
          where: { id: c.req.param("id") },
          data,
          include: includeRelations,
        });
        return c.json(item);
      } catch (e: any) {
        if (e.code === "P2025") return c.json({ error: "Not found" }, 404);
        return c.json({ error: e.message }, 400);
      }
    });

    // DELETE — /api/:model/:id
    app.delete(`/${path}/:id`, async (c) => {
      const user = c.get("user") as
        | { id: string; role: string }
        | undefined;
      const db = getEnhancedPrisma(user);
      const delegate = getModelDelegate(db, name);

      try {
        await delegate.delete({ where: { id: c.req.param("id") } });
        return c.json({ success: true });
      } catch (e: any) {
        if (e.code === "P2025") return c.json({ error: "Not found" }, 404);
        return c.json({ error: e.message }, 400);
      }
    });
  }

  return app;
}

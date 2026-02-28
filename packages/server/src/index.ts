import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authRoutes } from "./auth";
import { createCrudRoutes } from "./crud";
import { createSchemaRoutes } from "./schema-endpoint";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

// Routes
app.get("/", (c) => c.json({ name: "Zenku API", version: "0.0.1" }));
app.get("/api/health", (c) => c.json({ status: "ok" }));

app.route("/api/auth", authRoutes);
app.route("/api/schema", createSchemaRoutes());

app.route("/api", createCrudRoutes());

const port = Number(process.env.PORT) || 3001;
console.log(`Zenku server starting on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};

import "./config"; // Validate env vars on startup (fail-fast)
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { authRoutes } from "./auth";
import { createCrudRoutes } from "./crud";
import { createSchemaRoutes } from "./schema-endpoint";
import { createUploadRoutes } from "./upload";
import { createAiRoutes } from "./ai-tools";
import { config } from "./config";
import { createErrorHandler } from "./errors";
import { createRateLimiter } from "./middleware/rate-limit";

const app = new Hono();

// Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
app.use("*", secureHeaders());

// Logging
app.use("*", logger());

// CORS — configured from env, with credentials support for HttpOnly cookies
const allowedOrigins = config.CORS_ORIGIN.split(",").map((o) => o.trim());
app.use(
    "*",
    cors({
        origin: (origin) =>
            !origin || !allowedOrigins.includes(origin) ? null : origin,
        allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"],
        exposeHeaders: [
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
            "X-RateLimit-Reset",
        ],
        credentials: true,
        maxAge: 600,
    }),
);

app.onError(createErrorHandler());

// Routes
app.get("/api/health", async (c) => {
    try {
        await import("./db").then(({ prisma }) => prisma.$queryRaw`SELECT 1`);
        return c.json({ status: "ok", db: "connected" });
    } catch {
        return c.json({ status: "error", db: "disconnected" }, 503);
    }
});

// Auth routes with tight rate limiting (5 req/min per IP across all auth endpoints)
authRoutes.use(
    "*",
    createRateLimiter({
        windowMs: 60_000,
        max: 5,
        keyPrefix: "auth",
        message: "Too many auth attempts, please wait 1 minute.",
    }),
);
app.route("/api/auth", authRoutes);

app.route("/api/schema", createSchemaRoutes());
app.route("/api", createUploadRoutes());
app.route("/api/ai", createAiRoutes());

// CRUD routes with standard rate limiting (100 req/min per IP)
const crudApp = createCrudRoutes();
crudApp.use(
    "*",
    createRateLimiter({ windowMs: 60_000, max: 100, keyPrefix: "api" }),
);
app.route("/api", crudApp);

// Serve static files (production only — Vite dev server handles this in development)
if (config.NODE_ENV === "production") {
    app.get("/*", serveStatic({ root: "./packages/client/dist" }));
    // SPA fallback: serve index.html for all unmatched routes
    app.get("/*", serveStatic({ path: "./packages/client/dist/index.html" }));
}

export { app };

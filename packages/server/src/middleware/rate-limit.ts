import type { MiddlewareHandler } from "hono";

interface RateLimitOptions {
    windowMs: number;
    max: number;
    keyPrefix: string;
    message?: string;
}

const store = new Map<string, { count: number; resetAt: number }>();

// Periodic cleanup to prevent unbounded memory growth
setInterval(() => {
    const now = Date.now();
    for (const [key, rec] of store) {
        if (rec.resetAt <= now) store.delete(key);
    }
}, 5 * 60 * 1000).unref();

function getClientIp(c: any): string {
    return (
        c.req.header("x-forwarded-for")?.split(",")[0].trim() ??
        c.req.header("x-real-ip") ??
        "unknown"
    );
}

export function createRateLimiter(options: RateLimitOptions): MiddlewareHandler {
    const {
        windowMs,
        max,
        keyPrefix,
        message = "Too many requests, please try again later.",
    } = options;

    return async (c, next) => {
        if (process.env.NODE_ENV === "test") return next();

        const key = `${getClientIp(c)}:${keyPrefix}`;
        const now = Date.now();
        let rec = store.get(key);

        if (!rec || rec.resetAt <= now) {
            rec = { count: 1, resetAt: now + windowMs };
            store.set(key, rec);
        } else {
            rec.count++;
        }

        c.header("X-RateLimit-Limit", String(max));
        c.header("X-RateLimit-Remaining", String(Math.max(0, max - rec.count)));
        c.header("X-RateLimit-Reset", String(Math.ceil(rec.resetAt / 1000)));

        if (rec.count > max) {
            c.header(
                "Retry-After",
                String(Math.ceil((rec.resetAt - now) / 1000)),
            );
            return c.json({ error: { code: "RATE_LIMITED", message } }, 429);
        }

        await next();
    };
}

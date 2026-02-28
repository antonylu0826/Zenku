import type { Context } from "hono";

// Structured error class for application errors
export class AppError extends Error {
    constructor(
        public code: string,
        message: string,
        public statusCode: number = 400,
        public details?: unknown,
    ) {
        super(message);
        this.name = "AppError";
    }
}

// Common error factory helpers
export const Errors = {
    notFound: (resource = "Resource") =>
        new AppError("NOT_FOUND", `${resource} not found`, 404),
    badRequest: (message: string, details?: unknown) =>
        new AppError("BAD_REQUEST", message, 400, details),
    conflict: (message: string) => new AppError("CONFLICT", message, 409),
    unauthorized: () =>
        new AppError("UNAUTHORIZED", "Authentication required", 401),
    forbidden: () => new AppError("FORBIDDEN", "Insufficient permissions", 403),
    validation: (details: unknown) =>
        new AppError(
            "VALIDATION_ERROR",
            "Validation failed",
            422,
            details,
        ),
    internal: (message = "Internal server error") =>
        new AppError("INTERNAL_ERROR", message, 500),
};

// Global error handler for Hono — returns { error: { code, message, details? } }
export function createErrorHandler() {
    return (err: Error, c: Context) => {
        if (err instanceof AppError) {
            const body: Record<string, unknown> = {
                error: {
                    code: err.code,
                    message: err.message,
                    ...(err.details !== undefined ? { details: err.details } : {}),
                },
            };
            return c.json(body, err.statusCode as any);
        }

        // Prisma known errors
        if ((err as any).code === "P2025") {
            return c.json(
                { error: { code: "NOT_FOUND", message: "Record not found" } },
                404,
            );
        }

        if ((err as any).code === "P2002") {
            return c.json(
                {
                    error: {
                        code: "CONFLICT",
                        message: "A record with this value already exists",
                    },
                },
                409,
            );
        }

        // Unknown errors
        console.error("[Unhandled Error]", err);
        return c.json(
            { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
            500,
        );
    };
}

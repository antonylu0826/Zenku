import { z } from "zod";

const EnvSchema = z.object({
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    PORT: z.coerce.number().default(3001),
    DATABASE_URL: z.string().optional(),
    NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),
    // Comma-separated allowed CORS origins, e.g. "http://localhost:5173,https://app.example.com"
    CORS_ORIGIN: z.string().default("http://localhost:5173"),
    AI_API_KEY: z.string().optional(),
});

const result = EnvSchema.safeParse(process.env);

if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
}

export const config = result.data;

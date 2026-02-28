import { Hono } from "hono";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { prisma } from "./db";
import { authMiddleware } from "./auth";
import { Errors } from "./errors";

const UPLOAD_DIR = join(import.meta.dir, "..", "uploads");
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function createUploadRoutes() {
    const app = new Hono();
    app.use("*", authMiddleware);

    app.post("/upload", async (c) => {
        const user = (c as any).get("user") as { id: string } | undefined;
        if (!user) throw Errors.unauthorized();

        const formData = await c.req.formData();
        const file = formData.get("file") as File | null;
        if (!file) throw Errors.badRequest("No file provided");
        if (file.size > MAX_SIZE) throw Errors.badRequest("File exceeds 10MB limit");

        await mkdir(UPLOAD_DIR, { recursive: true });

        const ext = file.name.split(".").pop() ?? "";
        const storedName = `${crypto.randomUUID()}${ext ? "." + ext : ""}`;
        await writeFile(join(UPLOAD_DIR, storedName), Buffer.from(await file.arrayBuffer()));

        const attachment = await prisma.attachment.create({
            data: {
                filename: file.name,
                storedName,
                mimeType: file.type || "application/octet-stream",
                size: file.size,
                entityModel: (formData.get("entityModel") as string) || null,
                entityId: (formData.get("entityId") as string) || null,
                url: `/api/uploads/${storedName}`,
            },
        });

        return c.json(attachment, 201);
    });

    app.get("/uploads/:storedName", async (c) => {
        const attachment = await prisma.attachment.findFirst({
            where: { storedName: c.req.param("storedName") },
        });
        if (!attachment) return c.json({ error: "Not found" }, 404);

        const file = Bun.file(join(UPLOAD_DIR, attachment.storedName));
        if (!(await file.exists())) return c.json({ error: "File missing" }, 404);

        return new Response(file, {
            headers: {
                "Content-Type": attachment.mimeType,
                "Cache-Control": "public, max-age=31536000",
            },
        });
    });

    return app;
}

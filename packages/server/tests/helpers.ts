import { app } from "../src/app";
import { prisma } from "../src/db";

export { app, prisma };

/** Build a JSON Request */
export function req(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
): Request {
    return new Request(`http://localhost${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...extraHeaders,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
}

/** Login and return access token + Set-Cookie header value */
export async function loginAs(
    email: string,
    password: string,
): Promise<{ token: string; cookie: string; status: number; user: any }> {
    const res = await app.fetch(
        req("POST", "/api/auth/login", { email, password }),
    );
    const data = (await res.json()) as any;
    const cookie = res.headers.get("Set-Cookie") ?? "";
    return {
        token: data.token as string,
        cookie,
        status: res.status,
        user: data.user,
    };
}

/** Build an authenticated request with Bearer token */
export function authedReq(
    method: string,
    path: string,
    token: string,
    body?: unknown,
): Request {
    return req(method, path, body, { Authorization: `Bearer ${token}` });
}

/** Delete all test entities (products and categories), leave users intact */
export async function clearEntities(): Promise<void> {
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
}

/** Seed accounts (from seed.ts) */
export const ADMIN = { email: "admin@zenku.dev", password: "admin123" };
export const USER = { email: "user@zenku.dev", password: "user123" };

import { describe, test, expect, afterAll } from "bun:test";
import { app, prisma, req, loginAs, ADMIN } from "./helpers";

const TEST_EMAIL_PREFIX = "test-auth-";
const TEST_USER = {
    email: `${TEST_EMAIL_PREFIX}user@example.com`,
    name: "Test Auth User",
    password: "TestPass1",
};

afterAll(async () => {
    await prisma.refreshToken.deleteMany({
        where: { user: { email: { startsWith: TEST_EMAIL_PREFIX } } },
    });
    await prisma.user.deleteMany({
        where: { email: { startsWith: TEST_EMAIL_PREFIX } },
    });
    await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------
describe("POST /api/auth/register", () => {
    test("201 — registers new user and returns token + cookie", async () => {
        const res = await app.fetch(req("POST", "/api/auth/register", TEST_USER));
        expect(res.status).toBe(201);
        const data = (await res.json()) as any;
        expect(data.token).toBeString();
        expect(data.user.email).toBe(TEST_USER.email);
        expect(data.user.role).toBe("USER");
        const cookie = res.headers.get("Set-Cookie") ?? "";
        expect(cookie).toContain("refresh_token=");
        expect(cookie).toContain("HttpOnly");
    });

    test("400 — missing required fields", async () => {
        const res = await app.fetch(
            req("POST", "/api/auth/register", { email: "x@x.com" }),
        );
        expect(res.status).toBe(400);
    });

    test("422 — weak password (no uppercase)", async () => {
        const res = await app.fetch(
            req("POST", "/api/auth/register", {
                email: `${TEST_EMAIL_PREFIX}weak@example.com`,
                name: "Weak",
                password: "weakpass1",
            }),
        );
        expect(res.status).toBe(422);
    });

    test("422 — weak password (no number)", async () => {
        const res = await app.fetch(
            req("POST", "/api/auth/register", {
                email: `${TEST_EMAIL_PREFIX}weak2@example.com`,
                name: "Weak",
                password: "WeakPass",
            }),
        );
        expect(res.status).toBe(422);
    });

    test("409 — duplicate email", async () => {
        const res = await app.fetch(req("POST", "/api/auth/register", TEST_USER));
        expect(res.status).toBe(409);
    });
});

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
describe("POST /api/auth/login", () => {
    test("200 — valid credentials return token + Set-Cookie", async () => {
        const { token, cookie, status, user } = await loginAs(
            ADMIN.email,
            ADMIN.password,
        );
        expect(status).toBe(200);
        expect(token).toBeString();
        expect(user.email).toBe(ADMIN.email);
        expect(cookie).toContain("refresh_token=");
        expect(cookie).toContain("HttpOnly");
    });

    test("401 — wrong password", async () => {
        const res = await app.fetch(
            req("POST", "/api/auth/login", {
                email: ADMIN.email,
                password: "WrongPass1",
            }),
        );
        expect(res.status).toBe(401);
    });

    test("401 — unknown email", async () => {
        const res = await app.fetch(
            req("POST", "/api/auth/login", {
                email: "nobody@example.com",
                password: "SomePass1",
            }),
        );
        expect(res.status).toBe(401);
    });

    test("400 — missing fields", async () => {
        const res = await app.fetch(
            req("POST", "/api/auth/login", { email: ADMIN.email }),
        );
        expect(res.status).toBe(400);
    });
});

// ---------------------------------------------------------------------------
// Refresh
// ---------------------------------------------------------------------------
describe("POST /api/auth/refresh", () => {
    test("200 — valid cookie rotates token and issues new cookie", async () => {
        const { cookie: loginCookie } = await loginAs(
            ADMIN.email,
            ADMIN.password,
        );
        // Extract the raw cookie value to forward
        const cookieHeader = loginCookie.split(";")[0]; // "refresh_token=<value>"

        const res = await app.fetch(
            req("POST", "/api/auth/refresh", undefined, { Cookie: cookieHeader }),
        );
        expect(res.status).toBe(200);
        const data = (await res.json()) as any;
        expect(data.token).toBeString();
        // New cookie must be set
        expect(res.headers.get("Set-Cookie")).toContain("refresh_token=");
    });

    test("401 — no refresh cookie", async () => {
        const res = await app.fetch(req("POST", "/api/auth/refresh"));
        expect(res.status).toBe(401);
    });

    test("401 — invalid/forged token", async () => {
        const res = await app.fetch(
            req("POST", "/api/auth/refresh", undefined, {
                Cookie: "refresh_token=totallyinvalidtoken",
            }),
        );
        expect(res.status).toBe(401);
    });

    test("401 — reuse of old token after rotation", async () => {
        const { cookie: loginCookie } = await loginAs(
            TEST_USER.email,
            TEST_USER.password,
        );
        const cookieHeader = loginCookie.split(";")[0];

        // First refresh — consumes the token
        const res1 = await app.fetch(
            req("POST", "/api/auth/refresh", undefined, { Cookie: cookieHeader }),
        );
        expect(res1.status).toBe(200);

        // Second refresh with same (old) token — should fail
        const res2 = await app.fetch(
            req("POST", "/api/auth/refresh", undefined, { Cookie: cookieHeader }),
        );
        expect(res2.status).toBe(401);
    });
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------
describe("POST /api/auth/logout", () => {
    test("200 — clears the refresh cookie", async () => {
        const { cookie: loginCookie } = await loginAs(
            ADMIN.email,
            ADMIN.password,
        );
        const cookieHeader = loginCookie.split(";")[0];

        const res = await app.fetch(
            req("POST", "/api/auth/logout", undefined, { Cookie: cookieHeader }),
        );
        expect(res.status).toBe(200);
        // Cookie should be cleared (Max-Age=0)
        const setCookie = res.headers.get("Set-Cookie") ?? "";
        expect(setCookie).toMatch(/Max-Age=0/i);
    });

    test("200 — logout without cookie still succeeds", async () => {
        const res = await app.fetch(req("POST", "/api/auth/logout"));
        expect(res.status).toBe(200);
    });
});

// ---------------------------------------------------------------------------
// Me
// ---------------------------------------------------------------------------
describe("GET /api/auth/me", () => {
    test("200 — valid token returns user object", async () => {
        const { token } = await loginAs(ADMIN.email, ADMIN.password);
        const res = await app.fetch(
            req("GET", "/api/auth/me", undefined, {
                Authorization: `Bearer ${token}`,
            }),
        );
        expect(res.status).toBe(200);
        const data = (await res.json()) as any;
        expect(data.user.email).toBe(ADMIN.email);
    });

    test("401 — no Authorization header", async () => {
        const res = await app.fetch(req("GET", "/api/auth/me"));
        expect(res.status).toBe(401);
    });

    test("401 — invalid token", async () => {
        const res = await app.fetch(
            req("GET", "/api/auth/me", undefined, {
                Authorization: "Bearer invalidtoken",
            }),
        );
        expect(res.status).toBe(401);
    });
});

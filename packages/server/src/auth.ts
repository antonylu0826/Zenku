import { Hono } from "hono";
import { sign, verify } from "hono/jwt";
import { getCookie, setCookie } from "hono/cookie";
import { prisma } from "./db";
import { config } from "./config";

export const authRoutes = new Hono();

const ACCESS_TOKEN_TTL_SEC = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const REFRESH_COOKIE_NAME = "refresh_token";

// Password strength: min 8 chars, at least 1 uppercase, at least 1 number
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

async function signAccessToken(user: {
    id: string;
    email: string;
    role: string;
}): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    return sign(
        {
            sub: user.id,
            email: user.email,
            role: user.role,
            iat: now,
            exp: now + ACCESS_TOKEN_TTL_SEC,
        },
        config.JWT_SECRET,
        "HS256",
    );
}

function generateRefreshToken(): string {
    return (
        crypto.randomUUID().replace(/-/g, "") +
        crypto.randomUUID().replace(/-/g, "")
    );
}

function setRefreshCookie(c: any, token: string, maxAgeSec: number): void {
    const isProd = config.NODE_ENV === "production";
    setCookie(c, REFRESH_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "Lax",
        secure: isProd,
        maxAge: maxAgeSec,
        path: "/",
    });
}

function clearRefreshCookie(c: any): void {
    setCookie(c, REFRESH_COOKIE_NAME, "", {
        httpOnly: true,
        sameSite: "Lax",
        secure: config.NODE_ENV === "production",
        maxAge: 0,
        path: "/",
    });
}

// Login
authRoutes.post("/login", async (c) => {
    const body = await c.req.json<{ email: string; password: string }>();
    const { email, password } = body;

    if (!email || !password) {
        return c.json(
            { error: { code: "BAD_REQUEST", message: "Email and password are required" } },
            400,
        );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        return c.json(
            { error: { code: "UNAUTHORIZED", message: "Invalid credentials" } },
            401,
        );
    }

    const valid = await Bun.password.verify(password, user.password);
    if (!valid) {
        return c.json(
            { error: { code: "UNAUTHORIZED", message: "Invalid credentials" } },
            401,
        );
    }

    const accessToken = await signAccessToken(user);
    const rawRefreshToken = generateRefreshToken();

    await prisma.refreshToken.create({
        data: {
            token: rawRefreshToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        },
    });

    // Lazy cleanup: remove expired tokens for this user (fire-and-forget)
    prisma.refreshToken
        .deleteMany({ where: { userId: user.id, expiresAt: { lte: new Date() } } })
        .catch(() => { });

    setRefreshCookie(c, rawRefreshToken, REFRESH_TOKEN_TTL_MS / 1000);

    return c.json({
        token: accessToken,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
});

// Register
authRoutes.post("/register", async (c) => {
    const body = await c.req.json<{
        email: string;
        password: string;
        name: string;
    }>();
    const { email, password, name } = body;

    if (!email || !password || !name) {
        return c.json(
            { error: { code: "BAD_REQUEST", message: "Email, password and name are required" } },
            400,
        );
    }

    if (!PASSWORD_REGEX.test(password)) {
        return c.json(
            {
                error: {
                    code: "VALIDATION_ERROR",
                    message:
                        "Password must be at least 8 characters and contain at least one uppercase letter and one number",
                },
            },
            422,
        );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        return c.json(
            { error: { code: "CONFLICT", message: "Email already registered" } },
            409,
        );
    }

    const hashedPassword = await Bun.password.hash(password);
    const user = await prisma.user.create({
        data: { email, password: hashedPassword, name },
    });

    const accessToken = await signAccessToken(user);
    const rawRefreshToken = generateRefreshToken();

    await prisma.refreshToken.create({
        data: {
            token: rawRefreshToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        },
    });

    setRefreshCookie(c, rawRefreshToken, REFRESH_TOKEN_TTL_MS / 1000);

    return c.json(
        {
            token: accessToken,
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
        },
        201,
    );
});

// Refresh access token using HttpOnly cookie
authRoutes.post("/refresh", async (c) => {
    const rawCookieHeader = c.req.header("Cookie") || "";
    const cookies = rawCookieHeader.split(";").map(s => s.trim());
    const tokenCandidates = cookies
        .filter(s => s.startsWith(`${REFRESH_COOKIE_NAME}=`))
        .map(s => s.split("=")[1]);

    if (tokenCandidates.length === 0) {
        return c.json({ error: { code: "UNAUTHORIZED", message: "No refresh token" } }, 401);
    }

    let stored = null;
    let validToken = null;

    // Try each candidate until one is found in DB
    for (const token of tokenCandidates) {
        stored = await prisma.refreshToken.findUnique({
            where: { token },
            include: { user: { select: { id: true, email: true, name: true, role: true } } },
        });
        if (stored) {
            validToken = token;
            break;
        }
    }

    if (!stored || !validToken) {
        // Token not found — possible reuse attack; clear cookie defensively
        clearRefreshCookie(c);
        return c.json(
            { error: { code: "UNAUTHORIZED", message: "Invalid refresh token" } },
            401,
        );
    }

    if (stored.expiresAt <= new Date()) {
        await prisma.refreshToken.delete({ where: { id: stored.id } });
        clearRefreshCookie(c);
        return c.json(
            { error: { code: "UNAUTHORIZED", message: "Refresh token expired" } },
            401,
        );
    }

    // Token rotation: delete old, create new (atomic)
    const newRawToken = generateRefreshToken();
    await prisma.$transaction([
        prisma.refreshToken.delete({ where: { id: stored.id } }),
        prisma.refreshToken.create({
            data: {
                token: newRawToken,
                userId: stored.userId,
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
            },
        }),
    ]);

    const accessToken = await signAccessToken(stored.user);
    setRefreshCookie(c, newRawToken, REFRESH_TOKEN_TTL_MS / 1000);

    return c.json({
        token: accessToken,
        user: stored.user,
    });
});

// Logout: revoke refresh token and clear cookie
authRoutes.post("/logout", async (c) => {
    const rawToken = getCookie(c, REFRESH_COOKIE_NAME);

    if (rawToken) {
        await prisma.refreshToken
            .deleteMany({ where: { token: rawToken } })
            .catch(() => { });
    }

    clearRefreshCookie(c);
    return c.json({ success: true });
});

// Get current user (validate access token)
authRoutes.get("/me", async (c) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return c.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, 401);
    }

    try {
        const payload = await verify(authHeader.slice(7), config.JWT_SECRET, "HS256");
        const user = await prisma.user.findUnique({
            where: { id: payload.sub as string },
            select: { id: true, email: true, name: true, role: true },
        });
        if (!user) {
            return c.json({ error: { code: "NOT_FOUND", message: "User not found" } }, 404);
        }
        return c.json({ user });
    } catch {
        return c.json({ error: { code: "UNAUTHORIZED", message: "Invalid token" } }, 401);
    }
});

// Middleware to extract user from JWT (non-blocking — unauthenticated requests pass through)
export async function authMiddleware(
    c: any,
    next: () => Promise<void>,
): Promise<void> {
    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
        try {
            const payload = await verify(
                authHeader.slice(7),
                config.JWT_SECRET,
                "HS256",
            );
            c.set("user", {
                id: payload.sub as string,
                email: payload.email as string,
                role: payload.role as string,
            });
        } catch {
            // Expired or invalid token — continue without user
        }
    }
    await next();
}

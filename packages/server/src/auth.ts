import { Hono } from "hono";
import { sign, verify } from "hono/jwt";
import { getCookie, setCookie } from "hono/cookie";
import { prisma } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "zenku-dev-secret";

export const authRoutes = new Hono();

// Login
authRoutes.post("/login", async (c) => {
  const body = await c.req.json<{ email: string; password: string }>();
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ error: "Email and password are required" }, 400);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  // PoC: plain text password comparison
  // Production: use bcrypt/argon2
  const valid = await Bun.password.verify(password, user.password);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = await sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
  );

  return c.json({
    token,
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
    return c.json({ error: "Email, password and name are required" }, 400);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return c.json({ error: "Email already registered" }, 409);
  }

  const hashedPassword = await Bun.password.hash(password);

  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name },
  });

  const token = await sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
  );

  return c.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
});

// Get current user
authRoutes.get("/me", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const payload = await verify(authHeader.slice(7), JWT_SECRET, "HS256");
    const user = await prisma.user.findUnique({
      where: { id: payload.sub as string },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!user) return c.json({ error: "User not found" }, 404);
    return c.json({ user });
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});

// Middleware to extract user from JWT (non-blocking — unauthenticated requests pass through with no user)
export async function authMiddleware(
  c: any,
  next: () => Promise<void>,
) {
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = await verify(authHeader.slice(7), JWT_SECRET, "HS256");
      const user = {
        id: payload.sub as string,
        email: payload.email as string,
        role: payload.role as string,
      };
      c.set("user", user);
    } catch {
      // Invalid token — continue without user
    }
  }
  await next();
}

export { JWT_SECRET };

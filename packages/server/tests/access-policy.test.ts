import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
    app,
    prisma,
    req,
    loginAs,
    authedReq,
    clearEntities,
    ADMIN,
    USER,
} from "./helpers";

let adminToken = "";
let userToken = "";
let testCategoryId = "";
let testProductId = "";

beforeAll(async () => {
    await clearEntities();

    // Login as admin and user
    const admin = await loginAs(ADMIN.email, ADMIN.password);
    adminToken = admin.token;

    const user = await loginAs(USER.email, USER.password);
    userToken = user.token;

    // Create a category (admin only)
    const catRes = await app.fetch(
        authedReq("POST", "/api/category", adminToken, {
            name: "PolicyTest-Category",
        }),
    );
    const cat = (await catRes.json()) as any;
    testCategoryId = cat.id;

    // Create a product
    const prodRes = await app.fetch(
        authedReq("POST", "/api/product", adminToken, {
            name: "PolicyTest-Product",
            price: 99.0,
            sku: "POL-001",
            status: "ACTIVE",
            categoryId: testCategoryId,
        }),
    );
    const prod = (await prodRes.json()) as any;
    testProductId = prod.id;
});

afterAll(async () => {
    await clearEntities();
});

// ---------------------------------------------------------------------------
// Category policies
// ---------------------------------------------------------------------------
describe("Category — ADMIN-only write", () => {
    test("unauthenticated can read categories (200)", async () => {
        const res = await app.fetch(req("GET", "/api/category"));
        expect(res.status).toBe(200);
    });

    test("unauthenticated cannot create category (non-2xx)", async () => {
        const res = await app.fetch(
            req("POST", "/api/category", { name: "Unauthorized" }),
        );
        expect(res.status).not.toBeWithin(200, 299);
    });

    test("USER cannot create category (non-2xx)", async () => {
        const res = await app.fetch(
            authedReq("POST", "/api/category", userToken, {
                name: "UserCategory",
            }),
        );
        expect(res.status).not.toBeWithin(200, 299);
    });

    test("ADMIN can create category (201)", async () => {
        const res = await app.fetch(
            authedReq("POST", "/api/category", adminToken, {
                name: "AdminCategory",
            }),
        );
        expect(res.status).toBe(201);
        // Cleanup
        const { id } = (await res.json()) as any;
        await prisma.category.delete({ where: { id } });
    });

    test("USER cannot delete category (non-2xx)", async () => {
        const res = await app.fetch(
            authedReq(
                "DELETE",
                `/api/category/${testCategoryId}`,
                userToken,
            ),
        );
        expect(res.status).not.toBeWithin(200, 299);
    });
});

// ---------------------------------------------------------------------------
// Product policies
// ---------------------------------------------------------------------------
describe("Product — auth required to read, ADMIN-only write", () => {
    test("unauthenticated list returns 200 with empty data (ZenStack filters all)", async () => {
        const res = await app.fetch(req("GET", "/api/product"));
        expect(res.status).toBe(200);
        const data = (await res.json()) as any;
        expect(data.total).toBe(0);
    });

    test("USER can list products (200)", async () => {
        const res = await app.fetch(authedReq("GET", "/api/product", userToken));
        expect(res.status).toBe(200);
        const data = (await res.json()) as any;
        expect(Array.isArray(data.data)).toBe(true);
    });

    test("ADMIN can list products (200)", async () => {
        const res = await app.fetch(
            authedReq("GET", "/api/product", adminToken),
        );
        expect(res.status).toBe(200);
        const data = (await res.json()) as any;
        const ids: string[] = data.data.map((r: any) => r.id);
        expect(ids).toContain(testProductId);
    });

    test("USER cannot create product (non-2xx)", async () => {
        const res = await app.fetch(
            authedReq("POST", "/api/product", userToken, {
                name: "User Product",
                price: 5.0,
                categoryId: testCategoryId,
            }),
        );
        expect(res.status).not.toBeWithin(200, 299);
    });

    test("ADMIN can create product (201)", async () => {
        const res = await app.fetch(
            authedReq("POST", "/api/product", adminToken, {
                name: "Admin Product 2",
                price: 20.0,
                categoryId: testCategoryId,
            }),
        );
        expect(res.status).toBe(201);
    });

    test("USER cannot delete product (non-2xx)", async () => {
        const res = await app.fetch(
            authedReq(
                "DELETE",
                `/api/product/${testProductId}`,
                userToken,
            ),
        );
        expect(res.status).not.toBeWithin(200, 299);
    });

    test("ADMIN can delete product (200)", async () => {
        // Create a product just to delete it
        const createRes = await app.fetch(
            authedReq("POST", "/api/product", adminToken, {
                name: "Delete Me",
                price: 1.0,
                categoryId: testCategoryId,
            }),
        );
        const { id } = (await createRes.json()) as any;

        const res = await app.fetch(
            authedReq("DELETE", `/api/product/${id}`, adminToken),
        );
        expect(res.status).toBe(200);
    });
});

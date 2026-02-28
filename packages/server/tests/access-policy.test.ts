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
let publicProductId = "";
let privateProductId = "";
let adminUserId = "";
let testUserId = "";

beforeAll(async () => {
    await clearEntities();

    // Login as admin and user
    const admin = await loginAs(ADMIN.email, ADMIN.password);
    adminToken = admin.token;
    adminUserId = admin.user.id;

    const user = await loginAs(USER.email, USER.password);
    userToken = user.token;
    testUserId = user.user.id;

    // Create a category (admin only)
    const catRes = await app.fetch(
        authedReq("POST", "/api/category", adminToken, {
            name: "PolicyTest-Category",
        }),
    );
    const cat = (await catRes.json()) as any;
    testCategoryId = cat.id;

    // Create a public product
    const pubRes = await app.fetch(
        authedReq("POST", "/api/product", adminToken, {
            code: "PUB-001",
            name: "Public Product",
            price: 10.0,
            stockQuantity: 5,
            isPublic: true,
            categoryId: testCategoryId,
            ownerId: adminUserId,
        }),
    );
    const pub = (await pubRes.json()) as any;
    publicProductId = pub.id;

    // Create a private product
    const privRes = await app.fetch(
        authedReq("POST", "/api/product", adminToken, {
            code: "PRV-001",
            name: "Private Product",
            price: 99.0,
            stockQuantity: 1,
            isPublic: false,
            categoryId: testCategoryId,
            ownerId: adminUserId,
        }),
    );
    const priv = (await privRes.json()) as any;
    privateProductId = priv.id;
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
describe("Product — read by policy, ADMIN-only write", () => {
    test("unauthenticated list returns only public products", async () => {
        const res = await app.fetch(req("GET", "/api/product"));
        expect(res.status).toBe(200);
        const data = (await res.json()) as any;
        const ids: string[] = data.data.map((r: any) => r.id);
        expect(ids).toContain(publicProductId);
        expect(ids).not.toContain(privateProductId);
    });

    test("USER list returns only public products (private filtered out)", async () => {
        const res = await app.fetch(authedReq("GET", "/api/product", userToken));
        expect(res.status).toBe(200);
        const data = (await res.json()) as any;
        const ids: string[] = data.data.map((r: any) => r.id);
        expect(ids).toContain(publicProductId);
        expect(ids).not.toContain(privateProductId);
    });

    test("ADMIN list returns all products including private", async () => {
        const res = await app.fetch(
            authedReq("GET", "/api/product", adminToken),
        );
        expect(res.status).toBe(200);
        const data = (await res.json()) as any;
        const ids: string[] = data.data.map((r: any) => r.id);
        expect(ids).toContain(publicProductId);
        expect(ids).toContain(privateProductId);
    });

    test("USER cannot create product (non-2xx)", async () => {
        const res = await app.fetch(
            authedReq("POST", "/api/product", userToken, {
                code: "USR-001",
                name: "User Product",
                price: 5.0,
                stockQuantity: 1,
                isPublic: true,
                categoryId: testCategoryId,
                ownerId: testUserId,
            }),
        );
        expect(res.status).not.toBeWithin(200, 299);
    });

    test("ADMIN can create product (201)", async () => {
        const res = await app.fetch(
            authedReq("POST", "/api/product", adminToken, {
                code: "ADM-002",
                name: "Admin Product 2",
                price: 20.0,
                stockQuantity: 10,
                isPublic: true,
                categoryId: testCategoryId,
                ownerId: adminUserId,
            }),
        );
        expect(res.status).toBe(201);
    });

    test("USER cannot delete product (non-2xx)", async () => {
        const res = await app.fetch(
            authedReq(
                "DELETE",
                `/api/product/${publicProductId}`,
                userToken,
            ),
        );
        expect(res.status).not.toBeWithin(200, 299);
    });

    test("ADMIN can delete product (200)", async () => {
        // Create a product just to delete it
        const createRes = await app.fetch(
            authedReq("POST", "/api/product", adminToken, {
                code: "DEL-001",
                name: "Delete Me",
                price: 1.0,
                stockQuantity: 1,
                isPublic: true,
                categoryId: testCategoryId,
                ownerId: adminUserId,
            }),
        );
        const { id } = (await createRes.json()) as any;

        const res = await app.fetch(
            authedReq("DELETE", `/api/product/${id}`, adminToken),
        );
        expect(res.status).toBe(200);
    });
});

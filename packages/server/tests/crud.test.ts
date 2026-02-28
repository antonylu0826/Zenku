import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
    app,
    req,
    loginAs,
    authedReq,
    clearEntities,
    ADMIN,
} from "./helpers";

let adminToken = "";

beforeAll(async () => {
    await clearEntities();
    const { token } = await loginAs(ADMIN.email, ADMIN.password);
    adminToken = token;
});

afterAll(async () => {
    await clearEntities();
});

// ---------------------------------------------------------------------------
// Category CRUD
// ---------------------------------------------------------------------------
describe("Category CRUD", () => {
    let categoryId = "";

    test("GET /api/category — returns paginated list structure", async () => {
        const res = await app.fetch(
            authedReq("GET", "/api/category", adminToken),
        );
        expect(res.status).toBe(200);
        const data = (await res.json()) as any;
        expect(data).toHaveProperty("data");
        expect(data).toHaveProperty("total");
        expect(data).toHaveProperty("page");
        expect(data).toHaveProperty("totalPages");
        expect(Array.isArray(data.data)).toBe(true);
    });

    test("POST /api/category — creates a category (201)", async () => {
        const res = await app.fetch(
            authedReq("POST", "/api/category", adminToken, {
                name: "Electronics",
                description: "Electronic devices",
            }),
        );
        expect(res.status).toBe(201);
        const data = (await res.json()) as any;
        expect(data.name).toBe("Electronics");
        expect(data.id).toBeString();
        categoryId = data.id;
    });

    test("GET /api/category/:id — returns the record (200)", async () => {
        const res = await app.fetch(
            authedReq("GET", `/api/category/${categoryId}`, adminToken),
        );
        expect(res.status).toBe(200);
        const data = (await res.json()) as any;
        expect(data.id).toBe(categoryId);
        expect(data.name).toBe("Electronics");
    });

    test("GET /api/category/:id — 404 for unknown id", async () => {
        const res = await app.fetch(
            authedReq("GET", "/api/category/nonexistent-id", adminToken),
        );
        expect(res.status).toBe(404);
    });

    test("PUT /api/category/:id — updates the record (200)", async () => {
        const res = await app.fetch(
            authedReq("PUT", `/api/category/${categoryId}`, adminToken, {
                name: "Electronics Updated",
                description: "Updated description",
            }),
        );
        expect(res.status).toBe(200);
        const data = (await res.json()) as any;
        expect(data.name).toBe("Electronics Updated");
    });

    test("GET /api/category?search=Updated — filters by search", async () => {
        const res = await app.fetch(
            authedReq(
                "GET",
                "/api/category?search=Updated",
                adminToken,
            ),
        );
        expect(res.status).toBe(200);
        const data = (await res.json()) as any;
        expect(data.total).toBeGreaterThan(0);
        expect(
            (data.data as any[]).every((r: any) =>
                r.name.includes("Updated"),
            ),
        ).toBe(true);
    });

    test("GET /api/category?sort=name&sortDir=asc — sorts results", async () => {
        // Create a second category to test sorting
        await app.fetch(
            authedReq("POST", "/api/category", adminToken, {
                name: "Appliances",
            }),
        );

        const res = await app.fetch(
            authedReq(
                "GET",
                "/api/category?sort=name&sortDir=asc",
                adminToken,
            ),
        );
        expect(res.status).toBe(200);
        const data = (await res.json()) as any;
        const names: string[] = data.data.map((r: any) => r.name);
        const sorted = [...names].sort();
        expect(names).toEqual(sorted);
    });

    test("GET /api/category?pageSize=1&page=1 — paginates results", async () => {
        const res = await app.fetch(
            authedReq(
                "GET",
                "/api/category?pageSize=1&page=1",
                adminToken,
            ),
        );
        expect(res.status).toBe(200);
        const data = (await res.json()) as any;
        expect(data.data.length).toBeLessThanOrEqual(1);
        expect(data.pageSize).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// Batch operations
// ---------------------------------------------------------------------------
describe("Batch operations", () => {
    let ids: string[] = [];

    beforeAll(async () => {
        // Create 3 categories for batch tests
        ids = [];
        for (const name of ["Batch-A", "Batch-B", "Batch-C"]) {
            const res = await app.fetch(
                authedReq("POST", "/api/category", adminToken, { name }),
            );
            const data = (await res.json()) as any;
            ids.push(data.id);
        }
    });

    test("DELETE /api/category/batch — deletes multiple records", async () => {
        const [id1, id2] = ids;
        const res = await app.fetch(
            authedReq("DELETE", "/api/category/batch", adminToken, {
                ids: [id1, id2],
            }),
        );
        expect(res.status).toBe(200);
        const data = (await res.json()) as any;
        expect(data.deleted).toBe(2);
    });

    test("PATCH /api/category/batch — updates multiple records", async () => {
        const [, , id3] = ids;
        const res = await app.fetch(
            authedReq("PATCH", "/api/category/batch", adminToken, {
                ids: [id3],
                data: { description: "Batch updated" },
            }),
        );
        expect(res.status).toBe(200);
        const data = (await res.json()) as any;
        expect(data.updated).toBe(1);
    });

    test("DELETE /api/category/batch — 400 for empty ids array", async () => {
        const res = await app.fetch(
            authedReq("DELETE", "/api/category/batch", adminToken, { ids: [] }),
        );
        expect(res.status).toBe(400);
    });
});

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------
describe("CSV Export", () => {
    test("GET /api/category/export?format=csv — returns CSV with headers", async () => {
        // Create a known category for the export
        await app.fetch(
            authedReq("POST", "/api/category", adminToken, {
                name: "ExportTest",
            }),
        );

        const res = await app.fetch(
            authedReq(
                "GET",
                "/api/category/export?format=csv",
                adminToken,
            ),
        );
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toContain("text/csv");

        const csv = await res.text();
        const lines = csv.split("\r\n");
        // First line should be column headers
        expect(lines[0]).toContain("id");
        expect(lines[0]).toContain("name");
        // Should have at least one data row
        expect(lines.length).toBeGreaterThan(1);
    });

    test("GET /api/category/export — 400 without ?format=csv", async () => {
        const res = await app.fetch(
            authedReq("GET", "/api/category/export", adminToken),
        );
        expect(res.status).toBe(400);
    });
});

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------
describe("DELETE /api/category/:id", () => {
    test("200 — deletes the record", async () => {
        const created = await app.fetch(
            authedReq("POST", "/api/category", adminToken, {
                name: "ToDelete",
            }),
        );
        const { id } = (await created.json()) as any;

        const res = await app.fetch(
            authedReq("DELETE", `/api/category/${id}`, adminToken),
        );
        expect(res.status).toBe(200);

        // Confirm it's gone
        const check = await app.fetch(
            authedReq("GET", `/api/category/${id}`, adminToken),
        );
        expect(check.status).toBe(404);
    });
});

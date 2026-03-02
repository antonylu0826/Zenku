import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
    app,
    loginAs,
    authedReq,
    clearEntities,
    ADMIN,
} from "./helpers";

let adminToken = "";
let userId = "";

beforeAll(async () => {
    await clearEntities();
    const { token, user } = await loginAs(ADMIN.email, ADMIN.password);
    adminToken = token;
    userId = user.id;
});

afterAll(async () => {
    await clearEntities();
});

describe("Task Enum CRUD", () => {
    let taskId = "";

    test("POST /api/task — creates a task with Enum status (TODO)", async () => {
        const res = await app.fetch(
            authedReq("POST", "/api/task", adminToken, {
                title: "Test Task",
                status: "TODO",
                ownerId: userId
            }),
        );
        expect(res.status).toBe(201);
        const data = (await res.json()) as any;
        expect(data.status).toBe("TODO");
        taskId = data.id;
    });

    test("PUT /api/task/:id — updates status to IN_PROGRESS", async () => {
        const res = await app.fetch(
            authedReq("PUT", `/api/task/${taskId}`, adminToken, {
                status: "IN_PROGRESS",
            }),
        );
        expect(res.status).toBe(200);
        const data = (await res.json()) as any;
        expect(data.status).toBe("IN_PROGRESS");
    });

    test("POST /api/task — fails with invalid Enum value", async () => {
        const res = await app.fetch(
            authedReq("POST", "/api/task", adminToken, {
                title: "Invalid Task",
                status: "INVALID_STATUS",
                ownerId: userId
            }),
        );
        // ZenStack or Prisma should return 400 or 422 for invalid enum
        expect(res.status).not.toBe(201);
    });
});

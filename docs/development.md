# Development Guide

This guide covers how to extend Zenku: adding models, fields, view modes, and custom pages.

---

## Daily Workflow

### Local development (recommended for active development)

```bash
# Terminal 1 — Server (auto-restarts on file change)
cd packages/server && bun run dev

# Terminal 2 — Client (Vite HMR)
cd packages/client && bun run dev
```

Client: http://localhost:5173 | Server: http://localhost:3001

### Docker (for production validation)

```bash
# Start
docker-compose up -d

# Rebuild after schema.zmodel or source code changes
docker-compose up -d --build

# Reload after *.ui.ts changes only (no rebuild needed)
docker-compose restart app
```

---

## Adding a New Model

### 1. Define the model in `schema.zmodel`

```zmodel
model Supplier {
  id        String   @id @default(cuid())
  name      String
  email     String?
  phone     String?
  country   String   @default("TW")
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@allow('all', auth().role == ADMIN)
  @@allow('read', auth() != null)
}
```

Also add the same model to `schema.production.zmodel` (identical, but the datasource block uses PostgreSQL).

### 2. Regenerate the schema

```bash
# Local dev:
bunx zenstack generate
bunx prisma db push   # or: bunx prisma migrate dev --name add_supplier

# Docker (rebuild):
docker-compose up -d --build
```

### 3. Create `packages/server/schema/Supplier.ui.ts`

```typescript
import type { UiConfig } from "@zenku/core";

export default {
  label: "Suppliers",
  icon: "Truck",           // Any Lucide icon name
  list: {
    columns: ["name", "email", "country", "isActive"],
    searchableFields: ["name", "email"],
    defaultSort: { field: "name", dir: "asc" },
  },
  form: {
    layout: [
      { field: "name",     label: "Supplier Name" },
      { field: "email",    label: "Email",   placeholder: "contact@supplier.com" },
      { field: "phone",    label: "Phone" },
      { field: "country",  label: "Country" },
      { field: "isActive", label: "Active" },
    ],
  },
} satisfies UiConfig;
```

The sidebar, list, form, and detail pages appear automatically.

---

## Adding a Field to an Existing Model

1. Add the field in `schema.zmodel` and `schema.production.zmodel`:

```zmodel
model Product {
  // ... existing fields
  weight Float?   // new field
}
```

2. Update the migration. For local dev:

```bash
bunx prisma migrate dev --name add_product_weight
```

> If the migration fails with `duplicate column name: totalValue`, open the generated SQL file in `prisma/migrations/*/migration.sql` and delete the line `ALTER TABLE "Product" ADD COLUMN "totalValue" REAL;`, then re-run.

3. Update `packages/server/schema/Product.ui.ts`:

```typescript
list: { columns: [..., "weight"] },
form: { layout: [..., { field: "weight", label: "Weight (kg)", placeholder: "0.0" }] },
```

4. Rebuild Docker or just restart local server.

---

## UiConfig Reference

```typescript
{
  label: string,          // Sidebar label (e.g., "Products")
  icon: string,           // Lucide icon name (e.g., "Package", "Users", "Tag")

  list: {
    columns: string[],              // Fields to show as columns
    searchableFields: string[],     // Fields used for ?search= queries
    defaultSort: { field: string, dir: "asc" | "desc" },
  },

  form: {
    layout: Array<{
      field: string,
      label?: string,               // Overrides field name as display label
      placeholder?: string,
      component?: "Textarea",       // Use Textarea instead of Input for strings
    }>,
  },

  // Optional view modes:
  defaultView?: "list" | "kanban" | "calendar" | "tree",

  kanban?: {
    statusField: string,            // Field used for column grouping
    columns: string[],              // Enum values in display order
    cardTitle: string,              // Field shown as card title
    cardSubtitle?: string,          // Field shown as card subtitle
  },

  calendar?: {
    dateField: string,              // DateTime field for positioning events
    titleField: string,             // Field shown as event title
    endField?: string,              // Optional end date field
  },

  tree?: {
    parentField: string,            // Self-referencing FK field (e.g., "parentId")
    labelField: string,             // Field shown as tree node label
  },
}
```

**Icon names** come from [Lucide](https://lucide.dev/icons/). Common ones:
`Package`, `Users`, `Tag`, `Truck`, `ShoppingCart`, `Calendar`, `CheckSquare`, `FileText`, `Settings`, `BarChart`, `Globe`, `Star`, `Heart`, `Zap`, `Shield`

---

## Ejecting a Page

Ejecting generates a standalone React page from the generic template. Use this when you need behaviour that UiConfig can't express.

```bash
bun run packages/server/src/eject.ts Product
```

Generated files:
- `packages/client/src/pages/ejected/ProductListPage.tsx`
- `packages/client/src/pages/ejected/ProductFormPage.tsx`
- `packages/client/src/pages/ejected/ProductDetailPage.tsx`

App.tsx automatically uses ejected pages when they exist. Edit freely.

> **Important:** After ejecting, adding new fields to the model won't update the ejected pages automatically. You must update them manually or delete them to revert to the generic pages.

---

## Access Policies

ZenStack access policies control who can read and write each model. Common patterns:

```zmodel
// ADMIN full access, others read-only
@@allow('all', auth().role == ADMIN)
@@allow('read', auth() != null)

// ADMIN full access, owner can read/update their own records
@@allow('all', auth().role == ADMIN)
@@allow('read,update', auth() == owner)

// Public read, ADMIN write
@@allow('read', true)
@@allow('create,update,delete', auth().role == ADMIN)

// Only authenticated users can access
@@allow('all', auth() != null)
@@deny('all', auth() == null)
```

---

## Running Tests

```bash
cd packages/server
bun run test
```

The test suite uses a separate in-memory SQLite database and covers:
- Auth: register, login, refresh, logout, rate limiting, `/me`
- CRUD: create, read, update, delete, pagination, search, sort, batch operations
- Access Policy: ADMIN vs USER vs unauthenticated access differences

To add a test:
- `tests/auth.test.ts` — Auth-related tests
- `tests/crud.test.ts` — CRUD operations for any model
- `tests/access-policy.test.ts` — Permission tests

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | JWT signing secret (min 32 chars) |
| `DATABASE_URL` | `file:./dev.db` for SQLite, `postgresql://...` for PostgreSQL |
| `PORT` | Server port (default: 3001) |
| `NODE_ENV` | `development` / `test` / `production` |
| `CORS_ORIGIN` | Allowed CORS origin |
| `AI_API_KEY` | Key for `/api/ai/*` endpoints (optional) |

---

## Known Issues

### `duplicate column name: totalValue` on new migrations

The `totalValue` field on `Product` is a SQLite `GENERATED ALWAYS AS` computed column, but Prisma schema tracks it as `Float?`. On every new migration, Prisma generates a duplicate `ALTER TABLE` statement.

**Fix:** Open the generated `prisma/migrations/*/migration.sql` and delete this line:
```sql
ALTER TABLE "Product" ADD COLUMN "totalValue" REAL;
```
Then run the migration again.

### `bunx zenstack generate` fails on Windows

ZenStack's exec-utils.js may call `npx` instead of `bunx`. If this happens, patch the file:
```bash
# Path varies by version — check node_modules/.bun/zenstack@*/
node -e "
const fs = require('fs');
const p = 'node_modules/.bun/zenstack@2.22.1/node_modules/zenstack/utils/exec-utils.js';
const c = fs.readFileSync(p, 'utf8').replace(/npx /g, 'bunx ');
fs.writeFileSync(p, c);
"
bunx zenstack generate
```

### Port 3001 conflict

If both Docker and local dev server are running, port 3001 is taken. Stop Docker before running local dev, or change `PORT` in one of them:
```bash
docker-compose stop
```

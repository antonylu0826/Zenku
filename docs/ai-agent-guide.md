# Zenku AI Agent Development Guide

## Project Overview

Zenku is a schema-driven full-stack TypeScript framework. Entity definitions are the **single source of truth** — everything (schema, UI, i18n) is generated from `project/entities/*.entity.ts`.

## Project Structure

```
project/
├── appinfo.ts              ← App name, DB config, languages (SOURCE)
├── menu.ts                 ← Navigation menu structure (SOURCE)
└── entities/
    ├── Product.entity.ts   ← Entity definitions (SOURCE)
    ├── Category.entity.ts
    └── ...

packages/
├── core/src/index.ts       ← Shared types (SOURCE)
├── cli/src/                ← CLI tools (SOURCE)
├── server/
│   ├── schema.base.zmodel  ← System models: User, RefreshToken (SOURCE)
│   ├── schema.zmodel       ← ⚠️ GENERATED — do not edit
│   ├── prisma/             ← ⚠️ GENERATED
│   └── src/                ← Server code (SOURCE)
├── client/src/             ← React client (SOURCE)
└── mcp/src/                ← MCP server (SOURCE)
```

**Rules:**
- ONLY edit files marked SOURCE
- NEVER manually edit `schema.zmodel` or `prisma/schema.prisma`
- Run `zenku generate` after changing entity files

## Standard Workflow

```bash
# 1. Create a new entity
bun packages/cli/src/index.ts scaffold Invoice

# 2. Edit the entity file
#    → project/entities/Invoice.entity.ts

# 3. Validate
bun packages/cli/src/index.ts check

4. **Cleanup / Reset**: Clean artifacts or reset project.
   ```bash
   bun packages/cli/src/index.ts cleanup --all
   bun packages/cli/src/index.ts cleanup --init  # DANGER: Resets project source
   ```

4. **Generate & Sync**: Generate schema and sync database structure.
   ```bash
   bun packages/cli/src/index.ts generate
   # ⚠️ IMPORTANT: Must sync database after modifying entities
   bun x prisma db push --schema=packages/server/prisma/schema.prisma
   ```

5. **Start dev server**
   ```bash
   bun packages/cli/src/index.ts dev
   ```
# → Server: http://localhost:3000
# → Client: http://localhost:5173
```

## defineEntity() Format

```typescript
import { defineEntity } from '@zenku/core'

export default defineEntity({
  // ── Fields ──────────────────────────────────────────────
  fields: {
    name:     { type: 'String', required: true, length: 100 },
    price:    { type: 'Float',  required: true, format: 'C2' },
    quantity: { type: 'Int',    default: 0 },
    status:   { type: 'String', enum: 'ProductStatus' },
    email:    { type: 'String', optional: true, validate: { format: 'email' } },
    notes:    { type: 'String', optional: true },
    ownerId:  { type: 'String', required: true },
  },

  // ── Relations ───────────────────────────────────────────
  relations: {
    category: { type: 'Category', field: 'categoryId', lookupField: 'name' },
    owner:    { type: 'User', field: 'ownerId' },
    items:    { type: 'OrderItem', isDetail: true, cascade: 'delete' },
  },

  // ── Enums (defined per-entity) ──────────────────────────
  enums: {
    ProductStatus: ['ACTIVE', 'INACTIVE', 'DISCONTINUED'],
  },

  // ── Access Policy (ZenStack syntax) ─────────────────────
  access: {
    read:   'auth() != null',
    create: "auth().role == 'ADMIN'",
    update: "auth().role == 'ADMIN'",
    delete: "auth().role == 'ADMIN'",
    // Shorthand: all: 'auth() != null'
  },

  // ── Hooks (server-side) ─────────────────────────────────
  hooks: {
    onValidate: ({ data }) => {
      if (data.price !== undefined && data.price < 0)
        return { price: 'Price must be positive' }
    },
  },

  // ── UI Config ───────────────────────────────────────────
  ui: {
    icon: 'Package',           // Lucide icon name
    defaultView: 'list',       // list | kanban | calendar | tree

    list: {
      columns:    ['name', 'price', 'status', 'category'],
      searchable: ['name'],
      filterable: ['status'],
      defaultSort: { field: 'name', dir: 'asc' },
    },

    form: {
      sections: [
        {
          title: 'Basic Info',
          i18n:  { en: 'Basic Info', 'zh-TW': '基本資料' },
          fields: [['name', 'price'], ['status', 'categoryId']],
        },
        {
          title: 'Notes',
          i18n:  { en: 'Notes', 'zh-TW': '備註' },
          fields: [['notes']],
          collapsible: true,
        },
      ],
    },

    detail: {
      tabs: [
        {
          title: 'Order Items',
          i18n: { en: 'Items', 'zh-TW': '明細' },
          relation: 'items',
          columns: ['product', 'quantity', 'unitPrice'],
        },
      ],
    },

    kanban: {
      statusField: 'status',
      columns: ['ACTIVE', 'INACTIVE'],
      cardTitle: 'name',
    },

    calendar: {
      dateField: 'startDate',
      titleField: 'title',
      endDateField: 'endDate',
    },

    tree: {
      parentField: 'parentId',
      labelField: 'name',
    },
  },

  // ── i18n ────────────────────────────────────────────────
  i18n: {
    en: {
      caption: 'Product',
      plural:  'Products',
      fields: { name: 'Name', price: 'Price', status: 'Status' },
    },
    'zh-TW': {
      caption: '產品',
      plural:  '產品',
      fields: { name: '名稱', price: '價格', status: '狀態' },
    },
  },
})
```

## Field Types

| Type | Prisma Type | Example |
|------|------------|---------|
| `String` | `String` | `{ type: 'String', required: true }` |
| `Int` | `Int` | `{ type: 'Int', default: 0 }` |
| `Float` | `Float` | `{ type: 'Float', format: 'C2' }` |
| `Boolean` | `Boolean` | `{ type: 'Boolean', default: false }` |
| `DateTime` | `DateTime` | `{ type: 'DateTime', optional: true }` |
| `Json` | `Json` | `{ type: 'Json', optional: true }` |

## Field Options

| Option | Type | Description |
|--------|------|-------------|
| `required` | `boolean` | Field is required (default for most types) |
| `optional` | `boolean` | Field is nullable |
| `unique` | `boolean` | Unique constraint |
| `default` | `any` | Default value. Use `'cuid()'`, `'now()'` for Prisma functions |
| `length` | `number` | Max string length |
| `format` | `string` | Display format: `C2` (currency), `N0` (number), `P2` (percent), `date`, `time` |
| `enum` | `string` | Enum type name (must be defined in `enums`) |
| `computed` | `boolean` | UI-only computed field (readonly) |
| `formula` | `string` | Formula for computed fields: `'price * quantity'` |
| `validate` | `object` | `{ min, max, minLength, maxLength, format, regex, message }` |
| `access` | `object` | `{ read: 'policy', update: 'policy' }` |
| `omit` | `boolean` | Prisma @omit (exclude from results) |

## Relation Types

| Pattern | Example |
|---------|---------|
| Many-to-one | `category: { type: 'Category', field: 'categoryId', lookupField: 'name' }` |
| One-to-many | `items: { type: 'OrderItem', isList: true }` |
| Master-detail | `items: { type: 'OrderItem', isDetail: true, cascade: 'delete' }` |
| Self-referential | `parent: { type: 'Category', field: 'parentId', relationName: 'CategoryTree' }` |
| Child back-ref | `order: { type: 'Order', field: 'orderId', parentRelation: true, onDelete: 'Cascade' }` |

## CLI Commands

| Command | Description |
|---------|-------------|
| `zenku scaffold <Name>` | Create entity template |
| `zenku check` | Validate all entities |
| `zenku generate` | Generate schema.zmodel + run zenstack generate |
| `zenku dev` | Watch + generate + start server & client |
| `zenku start` | Production: generate + build + start |
| `zenku cleanup [--db] [--all] [--init]` | Clean generated files / Reset project |

## System Models

`User` and `RefreshToken` are defined in `schema.base.zmodel` (not in entities/).
They are imported by the generated `schema.zmodel` automatically.

## Access Policy Syntax

Uses ZenStack's access policy syntax:
- `auth()` — current authenticated user
- `auth().role == ADMIN` — check role
- `auth() == this` — owner check
- `true` — public access
- `auth() != null` — any authenticated user

## appinfo.ts

```typescript
import { defineAppInfo } from '@zenku/core'

export default defineAppInfo({
  name: 'My App',
  database: { provider: 'sqlite', url: 'env("DATABASE_URL")' },
  defaultLanguage: 'zh-TW',
  availableLanguages: ['en', 'zh-TW'],
})
```

## menu.ts

```typescript
import { defineMenu } from '@zenku/core'

export default defineMenu([
  {
    label: 'Products',
    icon: 'Package',
    i18n: { en: 'Products', 'zh-TW': '產品管理' },
    items: [
      { entity: 'Category' },
      { entity: 'Product' },
    ],
  },
])
```

## zenku check Error Reference

| Error | Cause | Fix |
|-------|-------|-----|
| `No fields defined` | Empty fields object | Add at least one field |
| `Field 'x' references enum 'Y' not defined in enums` | Missing enum | Add to `enums: {}` |
| `Relation 'x' references entity 'Y' not found` | Missing entity file | Create `entities/Y.entity.ts` |
| `ui.list.columns references 'x' not in fields/relations` | Invalid column name | Fix column name |
| `Form section references field 'x' not in fields` | Invalid field in section | Fix field name |
| `menu.ts references entity 'X' not in entities/` | Menu item has invalid entity | Fix entity name or create file |

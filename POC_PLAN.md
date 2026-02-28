# Zenku PoC Plan

## Context

XekuII (D:\Source\Private\XekuII)

XekuII 0.7.x 已驗證 YAML-driven full-stack generator 的方向，但 C# ↔ TypeScript 橋接複雜度高、generator 輸出量龐大、後端變更需重啟。Zenku 是次世代架構 PoC，目標驗證：**全 TypeScript 棧 + runtime schema renderer + ZenStack access policy** 能否取代現有架構，同時保留所有核心功能。

專案位置：`d:\Source\Private\Zenku`
資料庫：SQLite（開發階段）→ PostgreSQL（Docker 化時切換）

---

## Phase 0：專案初始化（Day 1）

### 0.1 專案骨架
- `bun init` 建立 monorepo 結構（Bun workspace）
- 目錄結構：
  ```
  zenku/
  ├── packages/
  │   ├── server/          ← Hono backend
  │   ├── client/          ← React 19 frontend (Vite)
  │   └── core/            ← 共用 types (UiConfig, HookContext, etc.)
  ├── schema/              ← .zmodel + .ui.ts + .hooks.ts
  ├── prisma/              ← generated schema.prisma + migrations
  ├── docker-compose.yml   ← PostgreSQL
  ├── bunfig.toml
  ├── package.json         ← workspace root
  └── tsconfig.json
  ```
- ~~`docker-compose.yml` — PostgreSQL 17 with persistent volume~~（開發階段使用 SQLite，免 Docker）
- `.gitignore`, `tsconfig.json` base config

### 0.2 核心依賴安裝
```
# Server
bun add hono @hono/node-server prisma @prisma/client zenstack @zenstackhq/runtime
bun add -d @zenstackhq/tanstack-query zenstack

# Client
bun create vite packages/client --template react-ts
bun add @tanstack/react-query @tanstack/react-router react-hook-form zod
bun add tailwindcss @tailwindcss/vite shadcn (via shadcn CLI)

# Core
# shared types only, no runtime deps
```

---

## Phase 1：後端基礎（Day 2-4）

### 1.1 ZenStack Schema — 2 個 Entity
建立 `schema/Category.zmodel` 和 `schema/Product.zmodel`：
- Category: id, name, description
- Product: id, code (unique), name, price (Decimal), description, isPublic, categoryId → Category, ownerId → User
- User: id, email, name, password, role (enum: ADMIN, USER)
- Access policy 用 `@@allow` 定義

### 1.2 Schema 合併腳本
- 寫 `scripts/merge-schema.ts`：掃描 `schema/*.zmodel` → 合併成 `prisma/schema.prisma`
- 或用 ZenStack CLI 的 `zenstack generate`（它原生支援 import）

### 1.3 Hono Server 入口
- `packages/server/src/index.ts`：Hono app + Bun serve
- Middleware：CORS, JWT auth (hono/jwt), error handler
- ZenStack enhanced PrismaClient 初始化

### 1.4 自動 CRUD 路由註冊
- `packages/server/src/routes/crud.ts`：
  - 讀取 Prisma DMMF metadata（`Prisma.dmmf.datamodel.models`）
  - 對每個 model 自動註冊：GET list, GET :id, POST, PUT :id, DELETE :id
  - ZenStack enhanced client 自動套用 access policy
  - 支援 query params：`page`, `pageSize`, `sort`, `sortDir`, `search`, field filters

### 1.5 `/api/schema` 端點
- 從 Prisma DMMF + `.ui.ts` 合併輸出 schema JSON
- 包含：model name, fields (name, type, relation info), ui config
- Cache header: `Cache-Control: max-age=60` (dev), `max-age=3600` (prod)

### 1.6 Auth 端點
- `POST /api/auth/login` → 驗證 email/password → 回傳 JWT
- `POST /api/auth/register` → 建立 User（PoC 用，可省略）
- Seed script：建立 Admin user

### 1.7 驗證 Prisma Migrate 流程
- `bunx prisma migrate dev` 走通
- 確認 ZenStack `@@allow` 在 query 時正確過濾

---

## Phase 2：Frontend Renderer（Day 5-8）

### 2.1 React + Vite + TanStack Router 基礎
- `packages/client/` 已由 Vite template 建立
- 安裝 shadcn/ui（via CLI）+ Tailwind CSS
- TanStack Router file-based routing 設定

### 2.2 Schema Fetcher
- `useSchema()` hook：fetch `/api/schema`，用 TanStack Query 快取
- 回傳所有 model 的 metadata + ui config

### 2.3 動態路由產生
- 從 schema 自動產生路由：`/:entity` → list, `/:entity/new` → form, `/:entity/:id` → detail
- 路由判斷邏輯：有 ejected page → 用具體元件；沒有 → GenericPage

### 2.4 GenericEntityListPage
- 從 schema 讀 columns（ui.ts 的 `list.columns` 或 fallback 全部 scalar fields）
- DataTable (shadcn/ui Table)：排序、分頁、搜尋
- 點擊 row → navigate to detail
- Create button → navigate to form

### 2.5 GenericEntityFormPage
- 從 schema 讀 layout（ui.ts 的 `form.layout` 或 fallback 全部 fields）
- React Hook Form + Zod validation
- Field renderer：根據 field type 選擇 input（text, number, select, checkbox, date）
- Reference field：combobox with search（fetch related entity）
- Save → POST/PUT → navigate back

### 2.6 GenericEntityDetailPage
- 從 schema 讀 fields
- Read-only 顯示，格式化（date、currency 等）
- Edit / Delete / Back buttons

### 2.7 Navigation Sidebar
- 從 schema 自動產生 nav items
- Icon 對應（ui.ts 的 `icon` field → Lucide icon）

---

## Phase 3：Eject 機制 + CLI（Day 9-11）

### 3.1 `zenku` CLI 骨架
- `packages/cli/src/index.ts`（Bun executable）
- 使用 `commander` 或 `citty` 做 CLI framework

### 3.2 `zenku eject` 指令
- `zenku eject <Entity> --page list|form|detail|all`
- 讀取 schema + ui.ts → 用 template 生成具體 React 元件
- 輸出到 `packages/client/src/pages/<Entity>ListPage.tsx` 等
- 生成後路由自動切換到具體元件（動態 import 偵測檔案存在）

### 3.3 Eject 後路由接管驗證
- 建立 `ProductListPage.tsx`（eject Product list）
- 確認路由正確 fallback：有具體元件用具體的，沒有用 generic
- 修改 ejected 元件，確認 Vite HMR 即時反映

---

## Phase 4：風險驗證（Day 12-14）

### 4.1 Persistent Calculated Fields
驗證方案：
1. 在 Product 加一個 `totalValue = price * stockQuantity` 欄位
2. 用 Prisma raw SQL migration 建立 computed column（SQLite: `GENERATED ALWAYS AS`；切 PG 後用 PostgreSQL 語法）
3. 確認：可讀取、可排序、可搜尋、Prisma Client 能正確 map
4. 記錄 DX 成本（需要手寫 migration SQL 而不是用 Prisma 自動 migrate）

### 4.2 ZenStack 複雜 Relation Query
驗證：
1. Product 有 Category（many-to-one）和 OrderItems（one-to-many）
2. `@@allow('read', category.isPublic)` — 跨 relation 的 policy
3. Nested create/update（建立 Product 同時建 OrderItems）
4. 確認 ZenStack 在 relation filter 場景的 SQL 效能

### 4.3 Bun Production 穩定性
驗證：
1. `bun build` production bundle
2. 用 `Bun.serve` 跑 Hono app（非 `@hono/node-server`）
3. 簡單壓力測試：`autocannon` 或 `hey` 打 100 concurrent
4. 確認 Prisma Client 在 Bun runtime 下的連線池行為
5. 記錄：如果有問題，fallback 到 `@hono/node-server`（Node compat mode）

### 4.4 Hot Reload 邊界測試
驗證「哪些變更真的不需要重啟」：
1. 改 `.ui.ts` → 前端 schema refetch → ✅ 預期即時生效
2. 改 `.hooks.ts` → Bun watch 偵測 → ✅ 預期熱載入
3. 改 `.zmodel` → 需要 `prisma migrate dev` → ⚠️ 需要重啟 Prisma Client
4. 加新 entity（新 .zmodel）→ 需要 migrate + server 重新掃描 routes → ⚠️

記錄每種變更的實際步驟數和耗時。

---

## 驗收標準

PoC 完成時應能展示：

1. **Zero to CRUD in 1 file**：只建立 `Order.zmodel`，跑 migrate，前端自動出現 Order 的 list/form/detail 頁面
2. **Access Policy 生效**：Admin 可 CRUD 所有 Product，普通 User 只能看 isPublic 的
3. **Eject 流程**：`zenku eject Product --page list` → 修改 ejected 元件 → HMR 即時反映
4. **Computed Column**：Product.totalValue 可排序、可搜尋
5. **壓力測試報告**：Bun + Hono + Prisma 的 RPS 數據

---

## 不在 PoC 範圍

- MCP / AI Chat 整合（Phase 2+ 之後）
- Kanban / Calendar / TreeList renderer
- i18n 多語系
- Attachment / Image upload
- Skill Registry
- Docker production deployment
- 自訂 property editors（RichText 等）

---

## 執行順序總覽

```
Day  1     Phase 0  專案初始化 + Docker PG + 依賴安裝
Day  2-4   Phase 1  Hono server + ZenStack + CRUD routes + /api/schema
Day  5-8   Phase 2  React renderer (List/Form/Detail) + 動態路由
Day  9-11  Phase 3  CLI + Eject 機制
Day 12-14  Phase 4  風險驗證（Computed column, ZenStack relation, Bun perf, Hot reload）
```

## Verification

1. ~~`docker compose up -d` → PG 啟動~~（SQLite 免啟動）
2. `bunx prisma migrate dev` → schema 建立（SQLite file-based）
3. `bun run --filter server dev` → backend on :3001
4. `bun run --filter client dev` → frontend on :5173
5. 瀏覽器開 localhost:5173 → 看到 sidebar 有 Product/Category
6. 建立 Category → 建立 Product → List/Detail/Edit 全流程
7. 切換 User role → 驗證 access policy
8. `zenku eject Product --page list` → 確認路由接管
9. 改 Product.zmodel 加欄位 → migrate → 前端自動出現新欄位

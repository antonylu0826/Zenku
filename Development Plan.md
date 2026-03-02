# Zenku Production Development Plan

## Context

PoC 已完成驗證：schema-driven 架構可行、ZenStack access policies 正常、eject 機制成功、Bun + Hono 壓測通過。現在要從 PoC 轉為正式版，目標是 production-grade 的全 TypeScript schema-driven 應用框架。

**技術決策摘要**：
- Runtime：繼續使用 Bun（Docker 化後在 Linux 上問題會大幅減少）
- UI：shadcn/ui + Tailwind CSS 4
- 認證：JWT + refresh token + rate limiting
- AI：MCP + OpenAI-compatible function calling API（涵蓋 Anthropic/OpenAI/Gemini）
- 測試：Bun test API integration tests
- Docker：最後階段

---

## Phase 0：專案整理 (Housekeeping) ✅

**目標**：PoC → 正式版的過渡整理。

- 將 `POC_PLAN.md` 移到 `docs/POC_PLAN.md` 歸檔
- 將本計畫放到根目錄 `DEVELOPMENT_PLAN.md`
- 清理 PoC 殘留檔案（`prisma/prisma/` 舊 DB、ejected 示範頁面等）
- 清理未使用的依賴（`@tanstack/react-router` 已安裝但未使用）

---

## Phase 1：基礎設施強化 (Foundation Hardening) ✅

**目標**：建立 shadcn/ui、環境設定、結構化錯誤、Zod validation — 所有後續工作的基礎。

### 1.1 shadcn/ui 初始化
- 在 `packages/client/` 執行 shadcn init（Tailwind 4 模式）
- 安裝基礎元件：Button, Input, Label, Select, Checkbox, Table, Card, Dialog, Sheet, Toast (Sonner), DropdownMenu, Badge, Skeleton, Command
- 建立 `lib/utils.ts`（cn helper）+ CSS variables
- **新增/修改檔案**：`components.json`, `lib/utils.ts`, `components/ui/*.tsx`, `index.css`, `package.json`

### 1.2 環境變數管理
- 建立 `packages/server/src/config.ts`（Zod 驗證 env vars）
- 移除 hardcoded JWT_SECRET fallback
- **新增/修改檔案**：`.env.example`, `config.ts`, `auth.ts`, `index.ts`

### 1.3 結構化錯誤處理
- Server：`AppError` class + 全域 error handler（`app.onError`）→ `{ error: { code, message, details? } }`
- Client：`api.ts` parse 結構化錯誤 + `ErrorBoundary.tsx`
- **新增/修改檔案**：`errors.ts`, `ErrorBoundary.tsx`, `index.ts`, `crud.ts`, `api.ts`, `App.tsx`

### 1.4 Server-side Zod Validation
- 從 Prisma DMMF 動態產生 Zod schema（create/update）
- CRUD POST/PUT 加入 validation → 422 + field-level 錯誤
- **新增/修改檔案**：`validation.ts`, `crud.ts`

### 1.5 Pluralization 修正
- 安裝 `pluralize` 替換手寫邏輯
- **修改檔案**：`schema-endpoint.ts`, `eject.ts`

---

## Phase 2：UI 元件升級 (Component Modernization) ✅

**目標**：所有 Generic Pages 遷移至 shadcn/ui，UX 品質大幅提升。

### 2.1 AppLayout 重構
- shadcn Sidebar + 收合功能 + Lucide icons + breadcrumb + UserMenu dropdown
- **重寫**：`AppLayout.tsx` | **新增**：`Breadcrumb.tsx`, `UserMenu.tsx`

### 2.2 GenericEntityListPage 升級
- shadcn Table（或 TanStack Table v8）、AlertDialog 取代 window.confirm、Toast 通知、Skeleton loading、EmptyState
- **重寫**：`GenericEntityListPage.tsx` | **新增**：`DataTable.tsx`, `EmptyState.tsx`, `ConfirmDialog.tsx`

### 2.3 GenericEntityFormPage 升級
- shadcn Form（react-hook-form + Zod）、每個 field type 獨立元件、Combobox 取代 native select、DatePicker
- **重寫**：`GenericEntityFormPage.tsx` | **新增**：`components/fields/` 目錄（StringField, NumberField, BooleanField, DateTimeField, RelationField, TextareaField, FieldRenderer）

### 2.4 GenericEntityDetailPage + LoginPage 升級
- Card 包裹、Badge、AlertDialog、shadcn Form 登入頁
- **重寫**：`GenericEntityDetailPage.tsx`, `LoginPage.tsx`

---

## Phase 3：Schema 擴展與 UiConfig (Schema Enhancement) ✅

**目標**：實作 `.ui.ts` 機制 + 擴展 schema endpoint，為 Kanban/Calendar/TreeList 建立資料基礎。

### 3.1 UiConfig 檔案機制
- 定義 `schema/<Model>.ui.ts` 慣例（export default UiConfig）
- 擴展 `@zenku/core` UiConfig：`defaultView`, `kanban` (statusField, columns, cardTitle...), `calendar` (dateField, titleField...), `tree` (parentField, labelField...)
- Schema endpoint 用 dynamic import 載入 .ui.ts 並合併
- **修改**：`core/index.ts`, `schema-endpoint.ts` | **新增**：`schema/Product.ui.ts`, `schema/Category.ui.ts`

### 3.2 Schema Endpoint 增強
- 輸出 enum 資訊、field-level `isReadOnly`/`isOmitted`、`documentation`（Prisma /// 註解）、relation graph
- **修改**：`core/index.ts`, `schema-endpoint.ts`

### 3.3 Client 端 UiConfig 消費
- List page 讀取 `ui.list.columns`、Form 讀取 `ui.form.layout`、Sidebar 顯示 icons
- **新增**：`icon-resolver.ts` | **修改**：List/Form pages, `AppLayout.tsx`

---

## Phase 4：安全性強化 (Security Hardening) ✅

**目標**：JWT refresh token、rate limiting、CORS 精確設定。

### 4.1 JWT Refresh Token
- Access token 15min + refresh token 7天（HttpOnly cookie）
- 新增 `/api/auth/refresh` + `/api/auth/logout`
- 新增 `RefreshToken` model in schema.zmodel
- Client `api.ts` 自動 refresh（401 → retry）
- **修改**：`schema.zmodel`, `auth.ts`, `config.ts`, `api.ts`, `useAuth.ts`

### 4.2 Rate Limiting + CORS + Security Headers
- Auth endpoints 5 req/min, API 100 req/min
- CORS 從 env 讀取 allowed origins
- Hono `secureHeaders` middleware + 密碼強度驗證
- **新增**：`middleware/rate-limit.ts` | **修改**：`index.ts`, `auth.ts`

---

## Phase 5：API 增強 (API Enhancement) ✅

**目標**：field selection、進階 relation 處理、batch operations、export。

### 5.1 Field Selection + Relation 處理
- `?fields=name,price,category.name` → Prisma `select`
- `?include=category,owner`、nested filter `?category.name=Electronics`、relation sort
- **修改**：`crud.ts`

### 5.2 Batch Operations + Export
- `DELETE /api/:model/batch` + `PUT /api/:model/batch`
- List page multi-select + batch action bar
- `GET /api/:model/export?format=csv` streaming export
- **修改**：`crud.ts`, `GenericEntityListPage.tsx`, `useEntity.ts`, `DataTable.tsx`

---

## Phase 6：進階 Renderers (Advanced Renderers) ✅

**目標**：Kanban + Calendar + TreeList 三種檢視模式。

### 6.1 View Switcher 架構
- List page header 加 view mode toggle（List/Kanban/Calendar/Tree）
- 根據 UiConfig.defaultView + 可用設定決定顯示哪些模式
- **新增**：`ViewSwitcher.tsx`, `renderers/` 目錄

### 6.2 Kanban Renderer
- 安裝 `@dnd-kit/core` + `@dnd-kit/sortable`
- 根據 `UiConfig.kanban.statusField` 分組 column
- Drag card → PATCH 更新 status
- 新增 Task model（含 status enum）作為示範
- **新增**：`renderers/KanbanView.tsx`, `KanbanCard.tsx`, `KanbanColumn.tsx`, `schema/Task.ui.ts`
- **修改**：`schema.zmodel`

### 6.3 Calendar Renderer
- 月/週/日視圖、點擊空白日期 → 新增、點擊事件 → detail
- **新增**：`renderers/CalendarView.tsx`

### 6.4 TreeList Renderer
- 根據 `UiConfig.tree.parentField` 建樹、展開/收合、拖拽改 parent
- Category 加 `parentId` 自引用示範
- **新增**：`renderers/TreeListView.tsx`, `TreeNode.tsx`

### 6.5 Eject 機制更新
- 新增 kanban/calendar/tree page types
- 所有 eject templates 改用 shadcn/ui
- **重寫**：`templates/list.ts`, `form.ts`, `detail.ts` | **新增**：`templates/kanban.ts`, `calendar.ts`, `tree.ts`

---

## Phase 7：Integration Testing ✅

**目標**：Bun test 覆蓋 CRUD + Auth + Access Policy。

### 7.1 測試基礎架構
- `packages/server/tests/` + setup.ts（SQLite in-memory）+ test helpers
- **新增**：`tests/setup.ts`, `tests/helpers.ts`

### 7.2 測試案例
- Auth：register/login/refresh/rate-limit/me（含 edge cases）
- CRUD：每個 model 的 create/read/update/delete + pagination/search/sort/filter + batch
- Access Policy：Admin vs User vs 未認證的權限差異
- **新增**：`tests/auth.test.ts`, `tests/crud.test.ts`, `tests/access-policy.test.ts`

---

## Phase 8：i18n 國際化 ✅

**目標**：多語系切換（en, zh-TW）。

- 安裝 `i18next` + `react-i18next`
- 語系檔 `i18n/locales/en.json`, `zh-TW.json`
- 所有固定文字改用 `t()` 函數
- UiConfig label 支援 i18n key
- 語系切換 UI（UserMenu）+ localStorage 持久化
- **新增**：`i18n/` 目錄 | **修改**：所有頁面和元件

---

## Phase 9：AI Agent Skills + 前端 AI Chat

**目標**：建立 AI skills 後端基礎（MCP + function calling API），並在前端提供內建 AI Chat 界面，讓使用者透過自然語言操作系統資料。MCP / function calling API 是共用後端，同時服務外部 AI agents 與內建 Chat UI。

```
外部 AI Agent（Claude Desktop / Cursor）
    └── MCP protocol ──→ packages/mcp ──→ POST /api/ai/execute

前端 AI Chat UI（AiChat.tsx）
    └── 使用者輸入 ──→ POST /api/ai/chat（server-side LLM call）
                              ├── 呼叫 LLM API（Claude / OpenAI）
                              ├── LLM 回傳 tool_use ──→ POST /api/ai/execute
                              └── 回傳對話結果給前端
```

### 9.1 Skill 定義架構
- 在 `@zenku/core` 定義 `SkillDefinition` 介面（name, description, parameters JSON Schema, handler）
- 自動從 Prisma DMMF 產生每個 model 的 CRUD skills
- 支援自訂 skills（`schema/<Model>.skills.ts`）
- **新增**：`core/skills.ts` | **修改**：`core/index.ts`

### 9.2 MCP Server
- 建立 `packages/mcp/` package
- 實作 MCP protocol（stdio transport）— 讓 Claude Desktop / Cursor 等 MCP client 可連接
- 自動將 CRUD skills 註冊為 MCP tools
- 每個 tool 透過 HTTP 呼叫 Zenku API（帶 auth）
- **新增**：`packages/mcp/src/index.ts`, `packages/mcp/src/tools.ts`

### 9.3 OpenAI-compatible Function Calling API
- 新增 `GET /api/ai/tools` — 回傳 OpenAI function calling 格式的 tool 定義
- 新增 `POST /api/ai/execute` — 接受 `{ tool: string, arguments: {} }` 執行對應 skill
- 新增 `POST /api/ai/chat` — 接受 `{ message: string, history: [...] }`，server-side 呼叫 LLM（帶 tools），回傳對話結果（API key 不暴露給前端）
- 格式相容 OpenAI、Gemini（它們都支援 OpenAI function calling schema）
- 加入 API key 認證（獨立於 JWT，給 AI agent 用）；Chat endpoint 使用一般 JWT auth
- **新增**：`packages/server/src/ai-tools.ts`, `packages/server/src/ai-chat.ts` | **修改**：`index.ts`

### 9.4 前端 AI Chat UI
- AppLayout 側邊或底部加入 Chat 入口（可展開 / 收合的 panel）
- 對話框：使用者輸入 → 呼叫 `POST /api/ai/chat` → 顯示回應
- 支援：純文字回答、tool 執行結果（表格 / 列表呈現）、多輪對話（history 傳遞）
- **新增**：`packages/client/src/components/AiChat.tsx`, `AiChatPanel.tsx`
- **修改**：`AppLayout.tsx`

### 9.5 文件
- 所有文件用 OpenAPI 3.1 格式（各家 AI 都能解析）
- MCP 設定範例（Claude Desktop config.json）
- Chat UI 使用說明 + 自訂 skills 範例
- **新增**：`docs/ai-integration.md`, `docs/openapi.yaml`

---

## Phase 10：檔案上傳 (File Upload)

**目標**：檔案/圖片上傳，與 entity 綁定。

- 新增 `Attachment` model + `POST /api/upload` + `GET /api/uploads/:id`
- 開發用本地 fs、Docker 後可切 S3
- 前端：`FileUploadField.tsx`（drag-drop）、`ImageField.tsx`（縮圖預覽）
- UiConfig field-level `component: "file-upload"` / `"image"`
- **修改**：`schema.zmodel`, `index.ts` | **新增**：`upload.ts`, field 元件

---

## Phase 11：Docker 化與 PostgreSQL (Containerization)

**目標**：最終階段 — Docker 化 + PostgreSQL 切換。

### 11.1 PostgreSQL 切換
- schema.zmodel provider 改 `postgresql`
- 驗證 computed column、access policy 在 PG 下行為
- 重建 migrations

### 11.2 Docker 設定
- `Dockerfile`：multi-stage build（Bun base image）
- `docker-compose.yml`：PostgreSQL 17 + Zenku app + persistent volume
- `docker-compose.dev.yml`：開發用（hot reload volume mounts）
- `.dockerignore`

### 11.3 Production 設定
- Server serve Vite build output（`serveStatic`）
- Structured JSON logging
- Health check + DB connectivity
- CI/CD（`.github/workflows/ci.yml`）

---

## Phase 12：Single Source of Truth 架構重構

**目標**：將分散的描述層整合為單一來源，讓 AI agent 與 Studio 工具能可靠地建立、修改系統定義。詳細規劃見 `P12-SingleSource.md`。

### 專案定義格式
```
project/
├── appinfo.ts          ← 系統名稱、圖示、資料庫、語系設定
├── menu.ts             ← 導覽選單結構
└── entities/
    ├── Product.entity.ts
    └── ...             ← 每個 entity 一個檔案（schema + UI + i18n 全在一起）
```

### P12.1 Core 型別定義
- `defineEntity()`、`defineAppInfo()`、`defineMenu()` 型別設計
- `FieldComponent` union（StringField、DatePicker、PasswordField、CurrencyField...）
- `RendererType` union（list、form、kanban、calendar、tree...）
- **修改**：`packages/core/src/index.ts`

### P12.2 CLI 建立（packages/cli）
- `zenku generate`：entity 檔案 → schema.zmodel → zenstack generate
- `zenku dev`：watch mode，改檔案自動 regenerate + restart
- `zenku check`：驗證完整性與一致性，缺少或不一致立即報錯
- **新增**：`packages/cli/`

### P12.3 遷移現有 entities
- `schema/*.ui.ts` + `.zmodel` model 區塊 + `i18n` entity 區段 → `entities/*.entity.ts`
- `schema.zmodel` 改為 generated artifact（系統模型保留在 `schema.base.zmodel`）
- **新增**：`entities/*.entity.ts`、`appinfo.ts`、`menu.ts`
- **刪除**：`schema/*.ui.ts`

### P12.4 Schema Endpoint 更新
- 從 `entities/*.entity.ts` 讀取（取代 `schema/*.ui.ts` dynamic import）
- **修改**：`packages/server/src/schema-endpoint.ts`

### P12.5 Client 更新
- AppLayout sidebar 從 generated navigation 讀取（由 `menu.ts` 生成）
- App name / icon / 語系設定從 `appinfo.ts` 讀取
- **修改**：`AppLayout.tsx`、`i18n/index.ts`

### P12.6 AI Agent Skills 文件
建立各家 AI agent 都能使用的開發指南，採「單一正典來源 + 各家 adapter」策略：

**文件架構**
```
docs/ai-agent-guide.md        ← 完整正典指南（所有 agent 共用內容）
AGENTS.md                     ← 通用快速參考（ModelContextProtocol 標準，Windsurf / Continue 等讀取）
CLAUDE.md                     ← Claude Code adapter（指向 AGENTS.md + Claude-specific 設定）
.cursorrules                  ← Cursor adapter
.github/copilot-instructions.md  ← GitHub Copilot adapter
.windsurfrules                ← Windsurf adapter
```

**`docs/ai-agent-guide.md`**（正典，所有 adapter 引用此文件）：
- 專案結構總覽（哪些是 source、哪些是 generated 不能碰）
- `defineEntity()` 完整格式速查（fields / relations / access / hooks / ui / i18n 所有選項）
- 標準工作流程：`zenku scaffold` → 填寫 → `zenku check` → `zenku generate` → `zenku dev` 驗證
- 常見欄位類型範例（String / Float / Int / Boolean / DateTime / Enum / Relation）
- `zenku check` 錯誤訊息對照表

**各家 adapter** 內容統一為：
```markdown
# Zenku Development
This project uses Zenku P12 Single Source of Truth architecture.
Read `docs/ai-agent-guide.md` for full development guide.
Read `AGENTS.md` for quick reference.
```
加上各家工具特有的格式需求（Cursor 的 glob 規則、Copilot 的 yaml front-matter 等）。

- **新增**：`docs/ai-agent-guide.md`、`AGENTS.md`、`CLAUDE.md`（更新）、`.cursorrules`、`.github/copilot-instructions.md`、`.windsurfrules`

---

## Phase 13：Studio 視覺化設計工具

**目標**：提供獨立部署的 Web UI，讓業務人員（無需接觸程式碼）視覺化建立 / 編輯 entity 定義，設計完成後一鍵部署 Zenku 系統。Studio 是獨立服務，可運行於 SaaS 雲環境或 Docker，**不限於本地開發**。

> **使用情境對比**
> | 情境 | 工具 |
> |------|------|
> | 本地開發 / 技術人員 | Claude Code + AI Skills → 直接生成 `.entity.ts` |
> | 雲端 / 非技術用戶 | Studio Web UI → 設計定義 → 部署 |
> | Docker 自架 | Studio + Zenku 同一 compose → 內部網路通訊 |

### 13.1 Studio 定位：獨立服務

Studio 是與 Zenku runtime **分離**的服務，有自己的 DB 儲存 project 定義，透過 API 與 Zenku 溝通：

```
┌─────────────────────────────────────────────────────┐
│  Studio Service（packages/studio）                   │
│  ├── Studio DB（PostgreSQL / SQLite）                 │
│  │   └── Project 定義（entities, appinfo, menu）      │
│  ├── Studio REST API（讀寫定義、觸發部署）             │
│  └── Studio Web UI（React app）                       │
└──────────────────┬──────────────────────────────────┘
                   │ 部署觸發（API call / webhook / git push）
                   ▼
┌─────────────────────────────────────────────────────┐
│  Zenku Runtime（packages/server + client）            │
│  ├── zenku generate（entities → schema → build）      │
│  └── zenku start（Hono + static）                     │
└─────────────────────────────────────────────────────┘
```

### 13.2 Studio Web UI 功能

- **Project Manager**：建立 / 切換多個 project
- **Entity Manager**：新增 / 刪除 / 重新命名 entity
- **Field Editor**：拖拽排序、設定 type / required / format / validate / access
- **Relation Editor**：設定 lookupField / searchField / isDetail
- **UI Config Editor**：list columns、form sections（含 master-detail）、detail tabs、kanban / calendar / tree
- **Appearance Editor**：可視化設定 show/hide/enable/disable/styling 規則
- **i18n Editor**：caption + 欄位多語系翻譯
- **Access Policy Editor**：CRUD policy 字串輸入 + 語法高亮
- **Preview 面板**：即時 mock 渲染 list / form 畫面

### 13.3 部署流程

**A. 雲端 SaaS 模式**
```
Studio（雲端）→ 設計完成 → Export entities/*.entity.ts
    → 上傳到目標伺服器 / git push
    → CI/CD 觸發：zenku generate → zenku start
```

**B. Docker 自架模式**
```yaml
# docker-compose.yml
services:
  studio:   # Studio service（獨立 port，例如 :4000）
  zenku:    # Zenku runtime（:3000）
  db:       # 共用或各自 PostgreSQL
```
Studio 儲存操作 → 透過內部 API 呼叫 Zenku，觸發 `zenku generate` + restart

**C. 本地開發（不需要 Studio）**
```
Claude Code + AI Skills → 直接修改 entities/*.entity.ts
    → zenku dev（watch mode 自動 regenerate）
```

### 13.4 新增套件
- **新增**：`packages/studio/` — 獨立 React + Hono app，可單獨 Docker 化
- Studio 的 Dockerfile 與 Zenku 分開，可獨立更新版本

---

## Phase 相依關係

```
P1 Foundation ──→ P2 UI ──→ P3 Schema ──→ P6 Renderers
                    │          │
                    │          └──→ P9 AI Skills
                    │
P4 Security ────────┤ (可與 P2-P3 平行)
                    │
P5 API ─────────────┤ (可與 P3-P4 平行)
                    │
P7 Testing ─────────┤ (依賴 P4+P5，可與 P6 平行)
                    │
P8 i18n ────────────┤ (依賴 P2，可與 P6-P7 平行)
                    │
P10 File Upload ────┤ (依賴 P2+P3)
                    │
P11 Docker ─────────┤ (最後，依賴所有 Phase)
                    │
P12 Single Source ──┤ (依賴 P0–P11 全部完成)
                    │
P13 Studio ─────────┘ (依賴 P12)
```

---

## 驗證方式

每個 Phase 完成後：
1. 所有現有功能不 regression（手動跑 CRUD + auth flow）
2. Phase 7 之後：`bun test` 全部通過
3. Phase 11：`docker compose up` 一鍵啟動，全功能正常

最終驗收：
- `docker compose up` → 瀏覽器開啟 → 登入 → CRUD 全流程
- Kanban 拖拽、Calendar 檢視、TreeList 展開正常
- MCP client 連接成功，AI agent 可查詢/建立資料
- 切換語系 en ↔ zh-TW 正常
- 檔案上傳/下載正常

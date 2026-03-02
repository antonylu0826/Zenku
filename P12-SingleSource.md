# P12：Single Source of Truth 架構重構

## 目標

將現有分散的描述層（`.zmodel` model 區塊 + `schema/*.ui.ts` + `i18n/locales/*.json` entity 區段）整合為單一來源，每個 entity 只有一個 `.entity.ts` 檔案，加上全域的 `appinfo.ts` 與 `menu.ts`，讓 AI agent 與 Studio 工具能可靠地建立、修改系統定義。

---

## 專案定義格式（Project Definition）

```
project/
├── appinfo.ts              ← 系統名稱、圖示、資料庫、語系設定
├── menu.ts                 ← 導覽選單結構
└── entities/
    ├── Product.entity.ts
    ├── Order.entity.ts
    └── ...
```

`schema.zmodel` 改為 **generated artifact**（不再手動編輯）。
系統模型（User、RefreshToken）移至 `schema.base.zmodel`，永不被覆蓋。

---

## 檔案格式設計

### appinfo.ts

```typescript
import { defineAppInfo } from '@zenku/core'

export default defineAppInfo({
  name: 'My ERP',
  icon: '/logo.png',
  i18n: {
    en:      { name: 'My ERP' },
    'zh-TW': { name: '我的 ERP 系統' },
  },
  database: {
    provider: 'sqlite',          // 'sqlite' | 'postgresql'
    url: 'env("DATABASE_URL")',
  },
  defaultLanguage: 'zh-TW',
  availableLanguages: ['en', 'zh-TW'],
})
```

### menu.ts

```typescript
import { defineMenu } from '@zenku/core'

export default defineMenu([
  {
    label: 'Products',
    icon: 'ShoppingBag',
    i18n: { en: 'Products', 'zh-TW': '產品管理' },
    items: [
      { entity: 'ProductCategory' },
      { entity: 'Product' },
    ],
  },
  {
    label: 'Orders',
    icon: 'ClipboardList',
    i18n: { en: 'Orders', 'zh-TW': '訂單管理' },
    items: [
      { entity: 'Order' },
    ],
    roles: ['ADMIN'],             // 選單層級 access control
  },
])
```

### entities/Product.entity.ts

```typescript
import { defineEntity } from '@zenku/core'

export default defineEntity({

  // ── 資料模型（取代 .zmodel model {} 區塊）──────────────────
  fields: {
    name:        { type: 'String', required: true, length: 100 },
    price:       { type: 'Float',  default: 0,    format: 'C2' },  // C2 = 貨幣兩位小數
    quantity:    { type: 'Int',    default: 0,    format: 'N0' },  // N0 = 整數
    status:      { type: 'Enum',   enum: 'ProductStatus' },
    categoryId:  { type: 'String', optional: true },
    imageUrl:    { type: 'String', optional: true },
    description: { type: 'String', optional: true },
    totalValue:  { type: 'Float',  computed: true, formula: 'price * quantity' }, // UI 層計算，readonly
  },

  relations: {
    // lookupField：RelationField 顯示的欄位名稱（取代顯示 id）
    category: { type: 'Category', field: 'categoryId', onDelete: 'SetNull', lookupField: 'name' },
    // isDetail：主從關係，此為 parent 側
    variants:  { type: 'ProductVariant', isDetail: true, cascade: 'delete' },
  },

  enums: {
    ProductStatus: ['ACTIVE', 'INACTIVE', 'DISCONTINUED'],
  },

  // ── Access Policy（ZenStack @@allow 語法字串）──────────────
  access: {
    read:   'auth() != null',
    create: "auth().role == 'ADMIN'",
    update: "auth().role == 'ADMIN'",
    delete: "auth().role == 'ADMIN'",
  },

  // ── Server-side Hooks ──────────────────────────────────────
  hooks: {
    // 簡單邏輯：inline
    onValidate: ({ data }) => {
      if (data.price < 0) return { price: 'Price must be positive' }
    },

    // 複雜邏輯：import 進來，但在此宣告（entity 檔案仍是索引）
    beforeCreate: generateProductCode,

    // 有完整 context（auth、db）
    afterCreate: async ({ record, ctx }) => {
      await ctx.db.auditLog.create({
        data: { entityId: record.id, action: 'CREATE', userId: ctx.auth.userId },
      })
    },

    // 支援的 hook 點：onValidate, beforeCreate, afterCreate,
    //                 beforeUpdate, afterUpdate, beforeDelete, afterDelete
  },

  // ── UI 設定（取代 schema/*.ui.ts）─────────────────────────
  ui: {
    icon: 'Package',
    defaultView: 'list',

    // field-level editor（可擴展）
    fields: {
      price:       { component: 'CurrencyField' },
      status:      { component: 'BadgeField' },
      imageUrl:    { component: 'ImageField' },
      description: { component: 'TextareaField' },
    },

    // Conditional appearance：序列化 DSL，可透過 schema API 傳給 client
    // 每條規則可針對單一或多個欄位（targets 支援 wildcard '*'）
    appearance: [
      // Visibility：show / hide（互為反向）
      {
        targets: ['discountPrice'],
        show: { field: 'status', op: 'eq', value: 'SALE' },
      },
      // State：enable / disable（互為反向）
      {
        targets: ['discountPrice'],
        enable: { field: 'price', op: 'gt', value: 0 },
      },
      // 複合條件（and / or）
      {
        targets: ['shippingNote'],
        show: { and: [
          { field: 'status', op: 'eq', value: 'SALE' },
          { field: 'hasShipping', op: 'eq', value: true },
        ]},
      },
      // Styling：when + 視覺樣式（背景色、字色、字型）
      {
        targets: ['status'],
        when:      { field: 'status', op: 'eq', value: 'DISCONTINUED' },
        backColor: '#fee2e2',
        fontColor: '#dc2626',
        fontStyle: 'bold strikethrough',
      },
      // Wildcard targets：對所有欄位套用樣式
      {
        targets: ['*'],
        when:    { field: 'isLocked', op: 'eq', value: true },
        disable: { field: 'isLocked', op: 'eq', value: true },
      },
    ],

    list: {
      columns:    ['name', 'price', 'quantity', 'status', 'category'],
      searchable: ['name'],
      filterable: ['status', 'categoryId'],
    },

    form: {
      // sections 取代 layout，支援分組標題 + master-detail inline
      sections: [
        {
          title: 'Basic Info',
          i18n:  { en: 'Basic Info', 'zh-TW': '基本資料' },
          fields: [['name', 'price'], ['quantity', 'categoryId'], ['status']],
        },
        {
          title: 'Description',
          i18n:  { en: 'Description', 'zh-TW': '說明' },
          fields: [['description'], ['imageUrl']],
        },
        {
          title:   'Variants',
          i18n:    { en: 'Variants', 'zh-TW': '規格' },
          detail:  'variants',                         // master-detail inline table
          columns: ['sku', 'color', 'size', 'stock'],  // 顯示的子欄位
        },
      ],
    },

    // 進階 renderers（可擴展）
    kanban: {
      statusField: 'status',
      columns:     ['ACTIVE', 'INACTIVE', 'DISCONTINUED'],
      cardTitle:   'name',
    },
  },

  // ── i18n（取代 locales/*.json entity 區段）─────────────────
  i18n: {
    en: {
      caption: 'Product',
      fields: {
        name:        'Name',
        price:       'Price',
        status:      'Status',
        description: 'Description',
        imageUrl:    'Image',
        categoryId:  'Category',
      },
    },
    'zh-TW': {
      caption: '產品',
      fields: {
        name:        '名稱',
        price:       '價格',
        status:      '狀態',
        description: '描述',
        imageUrl:    '圖片',
        categoryId:  '分類',
      },
    },
  },
})
```

---

## TypeScript 型別安全

`defineEntity` 使用泛型確保 compile-time 驗證：

```typescript
// ❌ TS Error：欄位名稱不存在
ui: { fields: { nonExistent: { component: 'CurrencyField' } } }

// ❌ TS Error：columns 引用不存在的欄位
list: { columns: ['name', 'ghost'] }

// ❌ TS Error：statusField 必須是 Enum 型別的欄位
kanban: { statusField: 'price' }

// ❌ TS Error：entity 不在 entities/ 中
menu: [{ entity: 'NonExistent' }]

// ❌ TS Error：appearance targets 引用不存在的欄位
appearance: [{ targets: ['nonExistent'], show: { field: 'status', op: 'eq', value: 'x' } }]

// ❌ TS Error：appearance condition field 必須是有效欄位名稱
appearance: [{ targets: ['price'], show: { field: 'ghost', op: 'eq', value: 'x' } }]

// ❌ TS Error：hooks.onValidate 回傳型別必須是 field 名稱的 Record
onValidate: ({ data }) => ({ nonExistent: 'error' })
```

---

## Conditional Appearance DSL

條件以**序列化物件陣列**表示，可透過 schema API 傳給 client 在 runtime 評估，AI agent 也能讀懂。

### Condition 型別

```typescript
type ConditionOp = 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'notIn'

type ConditionRule =
  | { field: string; op: ConditionOp; value: unknown }   // 單一條件
  | { and: ConditionRule[] }                              // AND 複合
  | { or:  ConditionRule[] }                              // OR 複合
```

### AppearanceRule 型別

```typescript
type FontStyle = 'bold' | 'italic' | 'strikethrough' | 'underline'

type AppearanceRule = {
  targets:   string[]           // 欄位名稱陣列，['*'] 代表全部欄位

  // Visibility（互為反向，二擇一）
  show?:     ConditionRule      // 條件成立時顯示
  hide?:     ConditionRule      // 條件成立時隱藏

  // State（互為反向，二擇一）
  enable?:   ConditionRule      // 條件成立時啟用
  disable?:  ConditionRule      // 條件成立時停用

  // Styling（when 可省略，省略時無條件套用）
  when?:     ConditionRule
  backColor?: string            // CSS color（hex / name / rgb）
  fontColor?: string
  fontStyle?: string            // 空格分隔：'bold italic strikethrough underline'
}
```

### 範例

```typescript
appearance: [
  // 欄位 show/hide
  { targets: ['discountPrice'], show: { field: 'status', op: 'eq', value: 'SALE' } },

  // 欄位 enable/disable
  { targets: ['endTime'], disable: { field: 'isAllDay', op: 'eq', value: true } },

  // 視覺標記（條件成立時套用樣式）
  { targets: ['priority'], when: { field: 'priority', op: 'eq', value: 'URGENT' },
    backColor: '#fee2e2', fontColor: '#dc2626', fontStyle: 'bold' },

  // Wildcard：鎖定時所有欄位停用
  { targets: ['*'], disable: { field: 'isLocked', op: 'eq', value: true } },

  // 複合條件
  { targets: ['shippingNote'], show: { and: [
    { field: 'status', op: 'eq', value: 'SALE' },
    { field: 'hasShipping', op: 'eq', value: true },
  ]}},
]
```

---

## Hooks 設計

純 TypeScript function，永遠 server-side 執行。

### Hook 型別介面

```typescript
type HookContext = {
  db:   PrismaClient          // Prisma client（帶 ZenStack access policy）
  auth: { userId: string; role: string } | null
  req:  Request               // Hono Request
}

type ValidationResult = Partial<Record<FieldName, string>>  // field → error message

type EntityHooks<T> = {
  // 驗證：回傳 field-level 錯誤，有錯誤時中止操作
  onValidate?: (args: { data: Partial<T> }) => ValidationResult | void

  // Create 生命週期
  beforeCreate?: (args: { data: Partial<T>; ctx: HookContext }) => Partial<T> | void
  afterCreate?:  (args: { record: T;        ctx: HookContext }) => Promise<void> | void

  // Update 生命週期
  beforeUpdate?: (args: { data: Partial<T>; existing: T; ctx: HookContext }) => Partial<T> | void
  afterUpdate?:  (args: { record: T;        existing: T; ctx: HookContext }) => Promise<void> | void

  // Delete 生命週期
  beforeDelete?: (args: { existing: T; ctx: HookContext }) => Promise<void> | void
  afterDelete?:  (args: { existing: T; ctx: HookContext }) => Promise<void> | void
}
```

### 使用原則

- **inline 優先**：簡單邏輯直接寫在 entity 檔案內
- **import 複雜邏輯**：複雜邏輯拆至 `hooks/` 目錄，在 entity 檔案中引用宣告，entity 仍是索引
- **before hooks 可修改 data**：回傳修改後的 data 物件即可套用
- **onValidate 有錯誤時中止**：回傳非空物件 → 422 + field-level 錯誤

### 範例

```typescript
import { generateCode } from './hooks/product'

hooks: {
  // 驗證
  onValidate: ({ data }) => {
    if (data.price !== undefined && data.price < 0)
      return { price: 'Price must be positive' }
  },

  // 建立前：修改 data（inline）
  beforeCreate: ({ data }) => ({
    ...data,
    code: generateCode(data.name),  // import 進來的函數
  }),

  // 建立後：side effect（async OK）
  afterCreate: async ({ record, ctx }) => {
    await ctx.db.auditLog.create({
      data: { entityId: record.id, action: 'CREATE', userId: ctx.auth?.userId },
    })
  },

  // 更新前：可比對舊值
  beforeUpdate: ({ data, existing }) => {
    if (data.status === 'CLOSED' && existing.status !== 'APPROVED')
      throw new AppError(400, 'INVALID_TRANSITION', 'Must be APPROVED before CLOSED')
  },
}
```

---

## Field Format

欄位層級的顯示格式，用於 list、form、detail 的數值呈現。

```typescript
// 格式代碼
type FieldFormat =
  | 'C0' | 'C2'          // 貨幣（0/2 位小數），自動加貨幣符號
  | 'N0' | 'N1' | 'N2'  // 數字（0/1/2 位小數）
  | 'P0' | 'P2'          // 百分比
  | 'date'               // 只顯示日期（YYYY-MM-DD）
  | 'time'               // 只顯示時間（HH:mm）
  | 'datetime'           // 日期時間（預設）
  | string               // 自訂（傳給 Intl.NumberFormat / date-fns）

fields: {
  price:      { type: 'Float',    format: 'C2' },
  quantity:   { type: 'Int',      format: 'N0' },
  taxRate:    { type: 'Float',    format: 'P2' },
  expiredAt:  { type: 'DateTime', format: 'date' },
}
```

---

## Relation Lookup Field

指定 RelationField（Combobox / dropdown）顯示的欄位，以及 detail 在 list 中的顯示。

```typescript
relations: {
  category: {
    type:        'Category',
    field:       'categoryId',
    lookupField: 'name',          // Combobox 顯示 category.name，而非 categoryId
    searchField: 'name',          // 可選：搜尋時用哪個欄位（預設同 lookupField）
  },
  supplier: {
    type:        'Supplier',
    field:       'supplierId',
    lookupField: 'companyName',
  },
}

// list columns 中引用 relation 時，顯示 lookupField 的值
list: { columns: ['name', 'price', 'category'] }  // category → category.name
```

---

## Form Sections & Master-Detail

### 一般分組（sections）

```typescript
form: {
  sections: [
    {
      title: 'Basic Info',
      i18n:  { en: 'Basic Info', 'zh-TW': '基本資料' },
      fields: [['name', 'price'], ['status']],   // 同原本的 layout rows
    },
    {
      title: 'Notes',
      i18n:  { en: 'Notes', 'zh-TW': '備註' },
      fields: [['notes']],
      collapsible: true,   // 可折疊
    },
  ],
}
```

### Master-Detail Inline Table

```typescript
// Parent entity（PurchaseOrder）
relations: {
  items: { type: 'PurchaseOrderItem', isDetail: true, cascade: 'delete' },
}

form: {
  sections: [
    { title: 'Order Info', fields: [['orderNo', 'supplier'], ['status']] },
    {
      title:   'Items',
      i18n:    { en: 'Items', 'zh-TW': '明細' },
      detail:  'items',                                  // 對應 relation 名稱
      columns: ['product', 'quantity', 'unitPrice', 'totalValue'],
      // child entity 的欄位，inline 可編輯
    },
  ],
}

// Child entity（PurchaseOrderItem）
// 需標記 parentRelation 讓 form 知道它是 detail 的子端
relations: {
  order: { type: 'PurchaseOrder', field: 'orderId', parentRelation: true },
}
```

**行為：**
- Parent 先儲存，child 在同一頁面 inline 新增/編輯/刪除
- 欄位格式繼承 child entity 的 `fields.format` 設定
- cascade delete 在 parent 刪除時自動清除 children

---

## Detail 頁面 Related Tabs

Form 中的 `detail` section 是可編輯的主從輸入；Detail 頁（唯讀）底部可顯示多個關聯 list。兩者互補。

```typescript
ui: {
  detail: {
    tabs: [
      {
        title:    'Order Items',
        i18n:     { en: 'Items', 'zh-TW': '訂單明細' },
        relation: 'items',                              // 對應 relations 中的名稱
        columns:  ['product', 'quantity', 'unitPrice'], // 顯示欄位
      },
      {
        title:    'Payments',
        i18n:     { en: 'Payments', 'zh-TW': '付款紀錄' },
        relation: 'payments',
        columns:  ['paidAt', 'amount', 'method'],
      },
    ],
  },
}
```

| | Form 中的 `detail` section | Detail 頁面的 `tabs` |
|-|--------------------------|---------------------|
| 操作 | 可新增 / 編輯 / 刪除子項目 | 唯讀瀏覽 |
| 適用 | 主從表單輸入 | 關聯資料查閱 |
| 場景 | 採購單 + 明細行 | 客戶 → 訂單歷史 |

---

## Computed Fields（UI 層）

欄位在 UI 層計算，不儲存到 DB（`readonly`，不進 form POST）。

```typescript
fields: {
  // UI 層計算：在 form/list 中即時顯示，不寫入 DB
  totalValue: {
    type:     'Float',
    computed: true,
    formula:  'price * quantity',   // 支援 +  -  *  /  和欄位名稱
    format:   'C2',
  },
  // 注意：若需要 DB 層計算（GENERATED ALWAYS AS），在 zmodel 中定義即可
  // 兩者可並存：DB 算好後前端直接讀，不需 UI 公式
}
```

**限制：** formula 目前只支援基本四則運算 + 欄位引用，複雜邏輯仍需 DB GENERATED 或 hook。

---

## 宣告式欄位驗證（Declarative Field Validation）

簡單規則直接在 field 定義中宣告；複雜跨欄位驗證留給 `onValidate` hook。

```typescript
fields: {
  email:    { type: 'String', validate: { format: 'email' } },
  phone:    { type: 'String', validate: { regex: /^\+?\d{8,15}$/ } },
  price:    { type: 'Float',  validate: { min: 0, max: 999999 } },
  quantity: { type: 'Int',    validate: { min: 1 } },
  code:     { type: 'String', validate: { regex: /^[A-Z]{2}\d{4}$/, message: 'Format: XX0000' } },
  name:     { type: 'String', validate: { minLength: 2, maxLength: 100 } },
}
```

```typescript
type FieldValidation = {
  min?:       number                   // 數值最小值
  max?:       number                   // 數值最大值
  minLength?: number                   // 字串最小長度
  maxLength?: number                   // 字串最大長度（同 field.length）
  format?:    'email' | 'url' | 'uuid' // 格式驗證
  regex?:     RegExp                   // 自訂正則
  message?:   string                   // 自訂錯誤訊息（覆蓋預設）
}
```

宣告式驗證**同時**用於：
- **Server-side**：在 `onValidate` hook 之前執行，有錯誤回傳 422 + field-level 訊息
- **Client-side**：form submit 前即時驗證，不需等 API 回應

`onValidate` hook 保留給**跨欄位邏輯**或需要查詢 DB 的複雜驗證。

---

## 欄位層級權限（Field-level Access）

在 field 定義中設定讀寫存取條件，由 ZenStack `@allow` 強制 server-side 執行，UI 負責客戶端顯示。

```typescript
fields: {
  cost:         { type: 'Float',  access: { update: "auth().role == 'ADMIN'" } },
  // 條件不符時 form 欄位設為 readonly（可見但不可改）

  internalNote: { type: 'String', optional: true, access: { read: "auth().role == 'ADMIN'" } },
  // 條件不符時 list / detail / form 中完全隱藏此欄位
}
```

| `access` key | 效果（條件不符時） |
|--------------|-----------------|
| `read`       | list / detail / form 中隱藏此欄位 |
| `update`     | form 中此欄位設為 readonly |

---

## Soft Delete（考慮中）

在 entity 層級開啟軟刪除，`generate` 時自動加入相關 schema 與 API 行為。

```typescript
export default defineEntity({
  softDelete: true,
  // generate 時自動加入：
  // - deletedAt DateTime? 欄位
  // - @@deny('read', deletedAt != null)（自動過濾軟刪除記錄）
  // - DELETE /api/[entity]/:id → 設 deletedAt，不物理刪除
  ...
})
```

管理端可補充查閱已刪除記錄：
```typescript
access: {
  readDeleted: "auth().role == 'ADMIN'",  // ADMIN 可查含軟刪除的紀錄
}
```

> **狀態：考慮中** — P12 規劃階段列入，實作細節待確認後補充。

---

## CLI 工具（packages/cli）

### `zenku scaffold <EntityName>`
為新 entity 產生標準模板，讓 agent 或開發者填空而非從頭撰寫：
```bash
zenku scaffold Invoice
# → 建立 entities/Invoice.entity.ts（帶完整結構的空白模板）
```
```typescript
// entities/Invoice.entity.ts（generated template）
import { defineEntity } from '@zenku/core'

export default defineEntity({
  fields: {
    // TODO: define fields
    // 範例: name: { type: 'String', required: true, length: 100 },
  },
  relations: {},
  access: {
    read:   'auth() != null',
    create: "auth().role == 'ADMIN'",
    update: "auth().role == 'ADMIN'",
    delete: "auth().role == 'ADMIN'",
  },
  hooks: {},
  ui: {
    icon: 'File',
    list:   { columns: [] },
    form:   { sections: [] },
  },
  i18n: {
    en:      { caption: 'Invoice', fields: {} },
    'zh-TW': { caption: '',        fields: {} },
  },
})
```
> 對 AI agent 的價值：不需記憶格式，只需填空，`zenku check` 會提示缺少什麼。

### `zenku generate`
一次性生成，CI/CD 與手動執行用：
```
1. 讀取 appinfo.ts → 生成資料庫 provider 設定
2. 讀取 entities/*.entity.ts → 生成 schema.zmodel
3. 執行 bunx zenstack generate → prisma/schema.prisma + .zenstack/
4. 讀取 menu.ts → 生成 client navigation 設定
5. 執行 zenku check → 驗證完整性，有問題立即報錯
```

### `zenku dev`
Watch mode，本地開發用——**同時啟動前端與後端**：
```
1. 執行 zenku check → 有錯誤立即中止並提示
2. 執行 zenku generate → 生成 schema.zmodel + prisma schema
3. 並行啟動：
   ├── Hono server  (packages/server)  → http://localhost:3000
   └── Vite dev server (packages/client) → http://localhost:5173
4. 監聽 appinfo.ts / menu.ts / entities/*.entity.ts
   有變動 → generate → 重啟 Hono server（Vite 自動 HMR 不需重啟）
```

**前後端 log 合流輸出**，並加上 prefix 區分來源：
```
[server] Server listening on http://localhost:3000
[client] VITE v6.x ready in 312ms
[client]  ➜ Local: http://localhost:5173
[watch]  entities/Product.entity.ts changed → regenerating...
[watch]  Done. Restarting server...
[server] Server listening on http://localhost:3000
```

> 對 AI agent 的價值：一個指令啟動完整環境，不需管理多個 process，
> 工作流程變成 `zenku generate → zenku dev → 驗證 http://localhost:5173`。

### `zenku start`
Production 模式啟動（不含 watch）：
```
1. 執行 zenku check → 有錯誤立即中止
2. 執行 zenku generate
3. 執行 vite build → packages/client/dist/
4. 啟動 Hono server（NODE_ENV=production，伺服 static + API）
   → http://localhost:3000
```

適用於：Docker 外的裸機部署、staging 環境快速驗證、agent 驗收測試。

### `zenku check`
獨立驗證指令：
```
✅ Product    → entities/Product.entity.ts OK，所有欄位有效
❌ Order      → entities/Order.entity.ts 缺少，請建立
❌ OrderItem  → ui.list.columns 引用欄位 'qty' 不存在於 schema
❌ menu.ts    → 引用 entity 'Invoice' 不在 entities/ 中
```

### `zenku cleanup`
清理環境，分三個層級：

```bash
# 清 generated artifacts（安全，可隨時跑）
zenku cleanup
# 清除：schema.zmodel、prisma/schema.prisma、.zenstack/

# 清 artifacts + 重置資料庫（dev 環境常用）
zenku cleanup --db
# 清除：以上 + prisma/dev.db（SQLite）或 DROP/CREATE schema（PostgreSQL）

# 清一切，回到 fresh state（完整重建前）
zenku cleanup --all
# 清除：以上 + node_modules/.prisma/、Bun 相關快取
```

| 層級 | 適用場景 |
|------|---------|
| `cleanup` | schema 改動後重新 generate 前 |
| `cleanup --db` | 測試資料重建、migration 出問題時 |
| `cleanup --all` | 環境損壞、切換 DB provider、完整重建 |

`--db` 和 `--all` 為破壞性操作，執行前顯示確認提示。

---

## 遷移策略（Migration Strategy）

`zenku generate` 更新 schema 後的 DB 遷移行為，依環境而異。

### 開發環境（SQLite）

```bash
zenku generate
# → 內部執行 bunx prisma migrate dev --name auto
# → Prisma 比對 schema 差異，自動產生 migration SQL
# → 保留現有資料（加欄位、加 table 不影響）
```

### Production 環境

```bash
# Deploy 流程（Docker CMD 範例）
bunx prisma migrate deploy   # 執行 migrations/ 中已有的 migration
bun run seed.ts              # 初始資料（idempotent）
bun run index.ts             # 啟動 server
```

`zenku generate` 在 production 只生成 schema 檔案，**不執行 migrate**，由 deploy 流程負責。

### 破壞性變更（zenku check 偵測並警告）

| 變更類型 | 風險 | 處理方式 |
|---------|------|---------|
| 欄位重新命名 | Prisma 視為刪除+新增，資料 loss | 手動修改 migration SQL |
| 欄位型別變更 | 可能資料 loss | 手動確認並測試 |
| 移除 required 欄位 | 現有 null 資料需處理 | 先設 optional，再處理資料 |
| 新增 required 欄位 | 需提供 default 值 | 加 `default` 或先 migrate 後填值 |

```
⚠️  Product.entity.ts → field 'sku' 新增為 required，現有記錄需提供預設值
    建議：加 default: '' 或設 optional: true 再逐步遷移
```

---

## 實作計畫

### P12.1 — Core 型別定義
- 在 `packages/core/src/` 定義 `defineEntity()`、`defineAppInfo()`、`defineMenu()`
- `FieldDefinition`：type、required、optional、length、default、**format**、**computed**、**formula**、**validate**、**access**
- `FieldValidation`：min、max、minLength、maxLength、format、regex、message
- `FieldAccess`：read（ZenStack policy string）、update（ZenStack policy string）
- `RelationDefinition`：type、field、onDelete、**lookupField**、**searchField**、**isDetail**、**parentRelation**、cascade
- `FieldComponent` union（StringField、NumberField、BooleanField、DatePicker、TimePicker、DateTimePicker、PasswordField、TextareaField、CurrencyField、BadgeField、ImageField、FileUploadField...）
- `RendererType` union（list、form、detail、kanban、calendar、tree...）
- `FormSection`：title、i18n、fields（rows）、**detail**（master-detail）、**columns**、**collapsible**
- `DetailTab`：title、i18n、relation、columns
- `UiConfig.detail.tabs`：DetailTab[]
- Condition DSL 型別（ConditionRule、AppearanceRule）
- Hooks 型別（EntityHooks、HookContext）
- **修改**：`packages/core/src/index.ts`

### P12.2 — CLI 建立
- 建立 `packages/cli/` package
- 實作 `zenku scaffold <EntityName>`（生成標準空白模板）
- 實作 `zenku check`（驗證完整性與一致性，含破壞性遷移警告）
- 實作 `zenku generate`（entity → schema.zmodel → zenstack generate → prisma migrate dev）
- 實作 `zenku dev`（check → generate → 並行啟動 Hono + Vite → chokidar watch → auto-regenerate + server restart）
- 實作 `zenku start`（check → generate → vite build → Hono production server）
- 實作 `zenku cleanup [--db] [--all]`（清理 generated artifacts，`--db` 重置資料庫，`--all` 清快取）
- **新增**：`packages/cli/src/index.ts`、`scaffold.ts`、`generate.ts`、`check.ts`、`dev.ts`、`start.ts`、`cleanup.ts`

### P12.3 — 遷移現有 entities
- 將 `schema.zmodel` model 區塊拆分到 `entities/*.entity.ts`
- 將 `schema/*.ui.ts` 內容合併進對應 entity 檔案
- 將 `i18n/locales/en.json` + `zh-TW.json` 的 entity 區段移入 entity 檔案
- 保留 `schema.base.zmodel`（User、RefreshToken 系統模型）
- `schema.zmodel` 改為 generated，加入 .gitignore（或保留但標註 auto-generated）
- **新增**：`entities/` 目錄、各 `.entity.ts`
- **修改**：`schema.zmodel`（變 generated）、`i18n/locales/*.json`（移除 entity 區段）
- **刪除**：`schema/*.ui.ts`

### P12.4 — Schema Endpoint 更新
- `schema-endpoint.ts` 改從 `entities/*.entity.ts` 讀取（取代動態 import `schema/*.ui.ts`）
- 合併 DMMF + entity 定義，輸出統一 schema API
- **修改**：`packages/server/src/schema-endpoint.ts`

### P12.5 — Client 更新
- AppLayout sidebar 從 generated navigation（由 `menu.ts` 生成）讀取
- App name / icon 從 generated appinfo 讀取
- 語系設定從 appinfo 讀取（取代 hardcoded languages）
- i18n locale 檔案改為 base（共用文字）+ entity 區段由 generate 注入
- **修改**：`packages/client/src/components/AppLayout.tsx`、`i18n/index.ts`

### P12.6 — 新功能 Renderer 實作
- **Field Format**：NumberField / DateTimeField 根據 `format` 套用 Intl.NumberFormat / date-fns 格式化
- **Relation Lookup**：RelationField Combobox 改用 `lookupField` 顯示文字，list column 顯示 relation 的 lookupField
- **Form Sections**：GenericEntityFormPage 由 flat layout 改為 sections，支援 title、i18n、collapsible
- **Master-Detail Inline Table**：FormPage 中的 `detail` section 顯示可編輯子表格，支援新增/編輯/刪除子項目
- **Computed Fields**：FormPage 中 computed 欄位 readonly，根據 formula 即時計算顯示值
- **Declarative Validation**：client-side 即時驗證（format、regex、min/max/minLength/maxLength）
- **Field-level Access**：form 中依 access.update 設 readonly；list/detail 依 access.read 隱藏欄位
- **Detail Tabs**：GenericEntityDetailPage 底部顯示 `ui.detail.tabs` 關聯 list
- **新增**：`components/MasterDetailTable.tsx`、`components/EntityDetailTabs.tsx`
- **修改**：`GenericEntityFormPage.tsx`、`GenericEntityDetailPage.tsx`、`components/fields/RelationField.tsx`、`components/fields/NumberField.tsx`、`components/fields/DateTimeField.tsx`

### P12.7 — AI Agent Skills 文件
「單一正典來源 + 各家 adapter」策略，讓 Claude Code / Cursor / Copilot / Windsurf 等各家 agent 都能讀取：

```
docs/ai-agent-guide.md              ← 完整正典指南（所有 agent 共用）
AGENTS.md                           ← 通用快速參考（ModelContextProtocol 標準）
CLAUDE.md                           ← Claude Code adapter
.cursorrules                        ← Cursor adapter
.github/copilot-instructions.md     ← GitHub Copilot adapter
.windsurfrules                      ← Windsurf adapter
```

**`docs/ai-agent-guide.md`** 內容：
- 專案結構圖（source vs generated，哪些不能手動編輯）
- `defineEntity()` 所有選項速查（fields、relations、access、hooks、ui、i18n）
- 標準工作流程：`scaffold → 填寫 → check → generate → dev → 驗證`
- 欄位類型範例（String/Float/Int/Boolean/DateTime/Enum/Relation）
- `zenku check` 錯誤訊息對照表

**各 adapter** 統一格式：指向正典 + 各工具特有格式需求（Cursor glob 規則、Copilot yaml front-matter 等）

- **新增**：`docs/ai-agent-guide.md`、`AGENTS.md`、`CLAUDE.md`（或更新）、`.cursorrules`、`.github/copilot-instructions.md`、`.windsurfrules`

### P12.8 — 驗證
- 所有現有 44 tests 通過（不 regression）
- `zenku check` 在乾淨狀態輸出全 ✅
- `zenku dev` 改 entity 後自動 regenerate + server 重啟正常
- 手動測試：CRUD、Kanban、Calendar、TreeList、i18n 全功能正常
- AI agent 依照 `AGENTS.md` 流程可從零建立新 entity 且 `zenku check` 全通過

---

## 相依關係

P12 依賴 P0–P11 全部完成（已完成）。

```
P12.1 Core 型別
    ↓
P12.2 CLI
    ↓
P12.3 遷移 entities    ← 最大工作量
    ↓
P12.4 Schema Endpoint
    ↓
P12.5 Client 更新
    ↓
P12.6 新功能 Renderer
    ↓
P12.7 AI Agent Skills 文件   ← P12 完成後才能寫（需已知所有格式細節）
    ↓
P12.8 驗證
```

---

## 檔案異動總覽

| 動作 | 檔案 |
|------|------|
| 新增 | `packages/cli/` package |
| 新增 | `entities/*.entity.ts`（每個 model 一個） |
| 新增 | `appinfo.ts` |
| 新增 | `menu.ts` |
| 保留 | `schema.base.zmodel`（系統模型） |
| 變為 generated | `schema.zmodel` |
| 刪除 | `schema/*.ui.ts` |
| 修改 | `packages/core/src/index.ts` |
| 修改 | `packages/server/src/schema-endpoint.ts` |
| 修改 | `packages/client/src/components/AppLayout.tsx` |
| 修改 | `packages/client/src/i18n/index.ts` + `locales/*.json` |
| 新增 | `packages/client/src/components/MasterDetailTable.tsx` |
| 新增 | `packages/client/src/components/EntityDetailTabs.tsx` |
| 修改 | `packages/client/src/pages/GenericEntityFormPage.tsx` |
| 修改 | `packages/client/src/pages/GenericEntityDetailPage.tsx` |
| 修改 | `packages/client/src/components/fields/RelationField.tsx` |
| 修改 | `packages/client/src/components/fields/NumberField.tsx` |
| 修改 | `packages/client/src/components/fields/DateTimeField.tsx` |
| 新增 | `docs/ai-agent-guide.md` |
| 新增 | `AGENTS.md`（根目錄，通用快速參考） |
| 新增/修改 | `CLAUDE.md`（Claude Code adapter） |
| 新增 | `.cursorrules`（Cursor adapter） |
| 新增 | `.github/copilot-instructions.md`（GitHub Copilot adapter） |
| 新增 | `.windsurfrules`（Windsurf adapter） |

---

## 未來擴展（P13+）

- **Soft Delete 完整實作**：softDelete flag + readDeleted access policy + UI 顯示已刪除記錄（考慮中）
- **Studio（P13）**：**獨立部署的 SaaS / Docker 服務**（非 dev-only），供業務人員視覺化設計 entity，設計完成後觸發 CI/CD 或直接呼叫 Zenku API 部署；本地開發改用 Claude Code + AI Skills 直接操作。詳見 `Development Plan.md` Phase 13
- **AI Agent**：自然語言需求 → AI Skills 直接生成 `entities/*.entity.ts` → `zenku generate` → 系統起來
- **Plugin 系統**：自訂 `FieldComponent` 與 `RendererType` 可從外部套件注入
- **Workflow / State Machine**：狀態流轉規則、審批流程

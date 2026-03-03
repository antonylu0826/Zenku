// @zenku/core — shared types & entity definition helpers

// ═══════════════════════════════════════════════════════════════════════════════
// P12: Entity Definition Types (Single Source of Truth)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Field Types ─────────────────────────────────────────────────────────────

export type FieldType =
  | "String"
  | "Int"
  | "Float"
  | "Decimal"
  | "Boolean"
  | "DateTime"
  | "Json";

export type FieldFormat =
  | "C0" | "C2"           // Currency (0/2 decimal places)
  | "N0" | "N1" | "N2"    // Number (0/1/2 decimal places)
  | "P0" | "P2"           // Percentage
  | "date"                 // Date only (YYYY-MM-DD)
  | "time"                 // Time only (HH:mm)
  | "datetime"             // Date + Time (default)
  | (string & {});         // Custom format string

export type FieldComponent =
  | "StringField"
  | "NumberField"
  | "BooleanField"
  | "DatePicker"
  | "TimePicker"
  | "DateTimePicker"
  | "PasswordField"
  | "TextareaField"
  | "CurrencyField"
  | "BadgeField"
  | "ImageField"
  | "FileUploadField"
  | "RelationField"
  | "EnumField"
  | (string & {});         // Custom component name

export type RendererType =
  | "list"
  | "form"
  | "detail"
  | "kanban"
  | "calendar"
  | "tree";

// ─── Field Validation ────────────────────────────────────────────────────────

export interface FieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  format?: "email" | "url" | "uuid";
  regex?: RegExp;
  message?: string;
}

// ─── Field Access ────────────────────────────────────────────────────────────

export interface FieldAccess {
  /** ZenStack policy string — field hidden when condition not met */
  read?: string;
  /** ZenStack policy string — field readonly when condition not met */
  update?: string;
}

// ─── Field Definition ────────────────────────────────────────────────────────

export interface FieldDefinition {
  type: FieldType;
  required?: boolean;
  optional?: boolean;
  unique?: boolean;
  length?: number;
  default?: unknown;
  format?: FieldFormat;
  /** UI-layer computed field (readonly, not stored in DB) */
  computed?: boolean;
  /** Simple formula: supports +, -, *, / and field names */
  formula?: string;
  /** Enum type name (for type: 'String' with enum values) */
  enum?: string;
  validate?: FieldValidation;
  access?: FieldAccess;
  /** Prisma @omit — exclude from query results */
  omit?: boolean;
}

// ─── Relation Definition ─────────────────────────────────────────────────────

export type OnDeleteAction = "Cascade" | "SetNull" | "Restrict" | "NoAction";

export interface RelationDefinition {
  /** Target model name */
  type: string;
  /** Foreign key field name in this model */
  field?: string;
  /** Prisma onDelete behavior */
  onDelete?: OnDeleteAction;
  /** Field to display in RelationField combobox (instead of id) */
  lookupField?: string;
  /** Field to search in RelationField combobox (defaults to lookupField) */
  searchField?: string;
  /** Master-detail: this is the "many" side (parent has isDetail children) */
  isDetail?: boolean;
  /** Master-detail: this is the child side pointing back to parent */
  parentRelation?: boolean;
  /** Cascade behavior for detail children */
  cascade?: "delete";
  /** Whether this is a list relation (one-to-many) */
  isList?: boolean;
  /** Self-referential relation name (e.g. "CategoryTree") */
  relationName?: string;
}

// ─── Enum Definition ─────────────────────────────────────────────────────────

export type EnumDefinition = Record<string, string[]>;

// ─── Access Policy ───────────────────────────────────────────────────────────

export interface AccessPolicy {
  read?: string;
  create?: string;
  update?: string;
  delete?: string;
  /** Shorthand: sets all CRUD to the same policy */
  all?: string;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export interface HookContext {
  db: unknown;               // PrismaClient (typed as unknown to avoid import)
  auth: { userId: string; role: string } | null;
  req: unknown;              // Hono Request
}

export interface EntityHooks<T = Record<string, unknown>> {
  onValidate?: (args: { data: Partial<T> }) => Partial<Record<keyof T, string>> | void;
  beforeCreate?: (args: { data: Partial<T>; ctx: HookContext }) => Partial<T> | void;
  afterCreate?: (args: { record: T; ctx: HookContext }) => Promise<void> | void;
  beforeUpdate?: (args: { data: Partial<T>; existing: T; ctx: HookContext }) => Partial<T> | void;
  afterUpdate?: (args: { record: T; existing: T; ctx: HookContext }) => Promise<void> | void;
  beforeDelete?: (args: { existing: T; ctx: HookContext }) => Promise<void> | void;
  afterDelete?: (args: { existing: T; ctx: HookContext }) => Promise<void> | void;
}

// ─── Conditional Appearance DSL ──────────────────────────────────────────────

export type ConditionOp = "eq" | "ne" | "gt" | "lt" | "gte" | "lte" | "in" | "notIn";

export type ConditionRule =
  | { field: string; op: ConditionOp; value: unknown }
  | { and: ConditionRule[] }
  | { or: ConditionRule[] };

export interface AppearanceRule {
  /** Field names to apply rule to. ['*'] means all fields. */
  targets: string[];
  /** Show field when condition is met */
  show?: ConditionRule;
  /** Hide field when condition is met */
  hide?: ConditionRule;
  /** Enable field when condition is met */
  enable?: ConditionRule;
  /** Disable field when condition is met */
  disable?: ConditionRule;
  /** Styling condition (when omitted, always applies) */
  when?: ConditionRule;
  /** CSS background color */
  backColor?: string;
  /** CSS font color */
  fontColor?: string;
  /** Space-separated: 'bold italic strikethrough underline' */
  fontStyle?: string;
}

// ─── UI Config (Entity-level) ────────────────────────────────────────────────

export interface EntityFieldUi {
  component?: FieldComponent;
}

export interface FormSection {
  title: string;
  i18n?: Record<string, string>;
  /** Field rows: each inner array is a row of field names */
  fields?: string[][];
  /** Master-detail: relation name for inline child table */
  detail?: string;
  /** Columns to show in detail inline table */
  columns?: string[];
  /** Whether this section can be collapsed */
  collapsible?: boolean;
}

export interface DetailTab {
  title: string;
  i18n?: Record<string, string>;
  /** Relation name to display */
  relation: string;
  /** Columns to show in the tab's table */
  columns: string[];
}

export interface EntityUiConfig {
  icon?: string;
  defaultView?: RendererType;

  /** Per-field UI component overrides */
  fields?: Record<string, EntityFieldUi>;

  /** Conditional appearance rules */
  appearance?: AppearanceRule[];

  list?: {
    columns?: string[];
    searchable?: string[];
    filterable?: string[];
    defaultSort?: { field: string; dir: "asc" | "desc" };
  };

  form?: {
    /** Grouped sections (replaces flat layout) */
    sections?: FormSection[];
    /** Legacy flat layout (backward compat, prefer sections) */
    layout?: FormLayoutItem[];
  };

  detail?: {
    tabs?: DetailTab[];
  };

  kanban?: {
    statusField: string;
    columns: string[];
    cardTitle: string;
    cardSubtitle?: string;
  };

  calendar?: {
    dateField: string;
    titleField: string;
    endDateField?: string;
  };

  tree?: {
    parentField: string;
    labelField: string;
  };
}

// ─── i18n ────────────────────────────────────────────────────────────────────

export interface EntityI18n {
  caption: string;
  plural?: string;
  fields?: Record<string, string>;
}

// ─── Entity Definition (main type) ──────────────────────────────────────────

export interface EntityDefinition {
  fields: Record<string, FieldDefinition>;
  relations?: Record<string, RelationDefinition>;
  enums?: EnumDefinition;
  access?: AccessPolicy;
  hooks?: EntityHooks;
  ui?: EntityUiConfig;
  i18n?: Record<string, EntityI18n>;
  /** Enable soft delete (adds deletedAt field automatically) */
  softDelete?: boolean;
}

// ─── App Info Definition ─────────────────────────────────────────────────────

export interface AppInfoDefinition {
  name: string;
  icon?: string;
  i18n?: Record<string, { name: string }>;
  defaultLanguage?: string;
  availableLanguages?: string[];
}

// ─── Menu Definition ─────────────────────────────────────────────────────────

export interface MenuItemDefinition {
  /** Entity name — auto-resolves label, icon, route */
  entity?: string;
  /** Direct label (for non-entity items) */
  label?: string;
  /** Direct icon name */
  icon?: string;
  /** Direct route path */
  path?: string;
  i18n?: Record<string, string>;
}

export interface MenuGroupDefinition {
  label: string;
  icon?: string;
  i18n?: Record<string, string>;
  items: MenuItemDefinition[];
  /** Role-based access for the entire group */
  roles?: string[];
}

export type MenuDefinition = MenuGroupDefinition[];

// ─── Define Helpers (identity functions with type inference) ─────────────────

export function defineEntity(config: EntityDefinition): EntityDefinition {
  return config;
}

export function defineAppInfo(config: AppInfoDefinition): AppInfoDefinition {
  return config;
}

export function defineMenu(config: MenuDefinition): MenuDefinition {
  return config;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Legacy Types (backward compatibility — used by schema endpoint & client)
// ═══════════════════════════════════════════════════════════════════════════════

export interface FieldMeta {
  name: string;
  type: FieldType;
  isRequired: boolean;
  isList: boolean;
  isId: boolean;
  isUnique: boolean;
  isRelation: boolean;
  /** Whether this field is auto-managed by Prisma (createdAt/updatedAt/@default) */
  isReadOnly?: boolean;
  /** Prisma triple-slash documentation comment */
  documentation?: string;
  relationModel?: string;
  default?: unknown;
  isEnum?: boolean;
  enumValues?: string[];
}

export interface ModelMeta {
  name: string;
  plural: string;
  fields: FieldMeta[];
  ui?: UiConfig;
}

/** Legacy UiConfig — used by schema endpoint output (client reads this) */
export interface UiConfig {
  label?: string;
  icon?: string;

  list?: {
    columns?: string[];
    searchableFields?: string[];
    defaultSort?: { field: string; dir: "asc" | "desc" };
  };

  form?: {
    layout?: FormLayoutItem[];
    sections?: FormSection[];
  };

  detail?: {
    tabs?: DetailTab[];
  };

  appearance?: AppearanceRule[];

  kanban?: {
    statusField: string;
    columns: string[];
    cardTitle: string;
    cardSubtitle?: string;
  };

  calendar?: {
    dateField: string;
    titleField: string;
    endDateField?: string;
  };

  tree?: {
    parentField: string;
    labelField: string;
  };
}

export interface FormLayoutItem {
  field: string;
  label?: string;
  placeholder?: string;
  component?: string;
  colSpan?: 1 | 2;
}

// ─── API Types ────────────────────────────────────────────────────────────

export interface ModelEntityMeta {
  i18n?: Record<string, EntityI18n>;
  relationLookups?: Record<string, { lookupField?: string; searchField?: string }>;
}

export interface ExtendedModelMeta extends ModelMeta {
  entity?: ModelEntityMeta;
}

export interface SchemaResponse {
  models: ExtendedModelMeta[];
  appInfo?: AppInfoDefinition;
  menu?: MenuDefinition;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

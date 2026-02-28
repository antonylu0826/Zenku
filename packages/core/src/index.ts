// @zenku/core — shared types

export type FieldType =
  | "String"
  | "Int"
  | "Float"
  | "Decimal"
  | "Boolean"
  | "DateTime"
  | "Json";

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
}

export interface ModelMeta {
  name: string;
  plural: string;
  fields: FieldMeta[];
  ui?: UiConfig;
}

// ─── UiConfig ─────────────────────────────────────────────────────────────

export interface UiConfig {
  /** Display label override (default: model name) */
  label?: string;
  /** Lucide icon name for sidebar (e.g. "Tag", "Package", "ShoppingCart") */
  icon?: string;

  list?: {
    /** Ordered list of field names to show as table columns */
    columns?: string[];
    /** Fields included in server-side search */
    searchableFields?: string[];
    /** Initial sort */
    defaultSort?: { field: string; dir: "asc" | "desc" };
  };

  form?: {
    /** Override field order and per-field options */
    layout?: FormLayoutItem[];
  };

  /** For Phase 6: Kanban view configuration */
  kanban?: {
    /** Field name whose values define swim-lane columns */
    statusField: string;
    /** Ordered list of status values */
    columns: string[];
    /** Field to show as card title */
    cardTitle: string;
    /** Optional field to show as card subtitle */
    cardSubtitle?: string;
  };

  /** For Phase 6: Calendar view configuration */
  calendar?: {
    /** DateTime field used for positioning on calendar */
    dateField: string;
    /** Field used as event title */
    titleField: string;
    /** Optional end date field */
    endDateField?: string;
  };

  /** For Phase 6: Tree/hierarchy view configuration */
  tree?: {
    /** Self-referential FK field (e.g. "parentId") */
    parentField: string;
    /** Field to display as node label */
    labelField: string;
  };
}

export interface FormLayoutItem {
  field: string;
  label?: string;
  placeholder?: string;
  /** Custom component override (e.g. "Textarea", "RichText") */
  component?: string;
  /** Grid column span (1 or 2, default: 1) */
  colSpan?: 1 | 2;
}

// ─── API Types ────────────────────────────────────────────────────────────

export interface SchemaResponse {
  models: ModelMeta[];
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

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
  relationModel?: string;
  default?: unknown;
}

export interface ModelMeta {
  name: string;
  plural: string;
  fields: FieldMeta[];
  ui?: UiConfig;
}

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
  };
}

export interface FormLayoutItem {
  field: string;
  label?: string;
  placeholder?: string;
  component?: string;
  colSpan?: number;
}

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

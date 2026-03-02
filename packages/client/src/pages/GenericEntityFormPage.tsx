import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useModelMeta } from "../hooks/useSchema";
import { useEntityDetail, useEntityCreate, useEntityUpdate } from "../hooks/useEntity";
import { useEntityList } from "../hooks/useEntity";
import { useAuth } from "../hooks/useAuth";
import type { FieldMeta } from "@zenku/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AlertCircle, Save, X } from "lucide-react";
import { ApiError } from "@/lib/api";

interface Props {
  entityName: string;
  entityId?: string;
  onNavigate: (path: string) => void;
}

function FieldInput({
  field,
  value,
  onChange,
  error,
  placeholder,
}: {
  field: FieldMeta;
  value: unknown;
  onChange: (val: unknown) => void;
  error?: string;
  placeholder?: string;
}) {
  if (field.type === "Boolean") {
    const { t } = useTranslation();
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          id={field.name}
          checked={!!value}
          onCheckedChange={(checked) => onChange(checked)}
        />
        <Label htmlFor={field.name} className="font-normal text-muted-foreground">
          {value ? t("common.yes") : t("common.no")}
        </Label>
      </div>
    );
  }

  if (field.type === "Int" || field.type === "Float" || field.type === "Decimal") {
    return (
      <Input
        type="number"
        step={field.type === "Int" ? "1" : "0.01"}
        value={(value as number) ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? "" : Number(e.target.value))
        }
        className={error ? "border-destructive" : ""}
      />
    );
  }

  if (field.type === "DateTime") {
    const dateVal = value
      ? new Date(value as string).toISOString().slice(0, 16)
      : "";
    return (
      <Input
        type="datetime-local"
        value={dateVal}
        onChange={(e) =>
          onChange(e.target.value ? new Date(e.target.value).toISOString() : "")
        }
        className={error ? "border-destructive" : ""}
      />
    );
  }

  return (
    <Input
      type="text"
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={error ? "border-destructive" : ""}
      placeholder={placeholder}
    />
  );
}

function RelationSelect({
  modelName,
  value,
  onChange,
  error,
}: {
  modelName: string;
  value?: string;
  onChange: (val: string) => void;
  error?: string;
  t: (key: string) => string;
}) {
  const path = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const { data } = useEntityList(path, { pageSize: 100 });

  const options = (data?.data || []).map((item) => ({
    id: item.id as string,
    label:
      (item.name as string) ||
      (item.email as string) ||
      (item.code as string) ||
      (item.id as string),
  }));

  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger className={error ? "border-destructive" : ""}>
        <SelectValue placeholder={`${t("common.selectOption")} ${modelName}...`} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.id} value={opt.id}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function GenericEntityFormPage({
  entityName,
  entityId,
  onNavigate,
}: Props) {
  const { t } = useTranslation();
  const meta = useModelMeta(entityName);
  const entityPath = entityName.charAt(0).toLowerCase() + entityName.slice(1);
  const isEdit = !!entityId;
  const { user } = useAuth();

  const { data: existing } = useEntityDetail(entityPath, entityId || "");
  const createMutation = useEntityCreate(entityPath);
  const updateMutation = useEntityUpdate(entityPath);

  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [globalError, setGlobalError] = useState("");

  useEffect(() => {
    if (isEdit && existing) {
      setFormData({ ...existing });
    }
  }, [isEdit, existing]);

  if (!meta) return null;

  // Build editable fields list:
  // If UiConfig specifies form.layout, use that order (skipping id/auto fields)
  // Otherwise: fallback to all non-id, non-relation, non-auto fields
  const uiLayout = meta.ui?.form?.layout;
  const editableFields = uiLayout
    ? uiLayout
      .map((item) => meta.fields.find((f) => f.name === item.field))
      .filter(
        (f): f is NonNullable<typeof f> =>
          f !== undefined &&
          !f.isId &&
          !f.isList &&
          f.name !== "createdAt" &&
          f.name !== "updatedAt" &&
          !f.isRelation
      )
    : meta.fields.filter(
      (f) =>
        !f.isId &&
        !f.isList &&
        f.name !== "createdAt" &&
        f.name !== "updatedAt" &&
        !f.isRelation
    );

  // Helper to get ui layout config for a field
  const getFieldLayout = (fieldName: string) =>
    uiLayout?.find((item) => item.field === fieldName);

  const relationSelectors = meta.fields
    .filter((f) => f.isRelation && !f.isList && f.relationModel)
    .map((f) => ({
      fkField: f.name + "Id",
      relationModel: f.relationModel!,
      label: f.name,
    }));

  const handleChange = (fieldName: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    // Clear field error on change
    if (fieldErrors[fieldName]) {
      setFieldErrors((prev) => { const n = { ...prev }; delete n[fieldName]; return n; });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");
    setFieldErrors({});

    const data: Record<string, unknown> = {};
    for (const field of editableFields) {
      if (field.name in formData) {
        data[field.name] = formData[field.name];
      }
    }

    if (editableFields.some((f) => f.name === "ownerId") && !data.ownerId && user) {
      data.ownerId = user.id;
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: entityId!, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      onNavigate(`/${entityPath}`);
    } catch (err: any) {
      if (err instanceof ApiError && err.statusCode === 422 && err.details) {
        setFieldErrors(err.details as Record<string, string[]>);
        setGlobalError(t("form.validationError"));
      } else {
        setGlobalError(err.message || t("toast.error"));
      }
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">
          {isEdit ? t("form.editTitle", { entity: entityName }) : t("form.createTitle", { entity: entityName })}
        </h2>
      </div>

      {globalError && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive mb-4">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{globalError}</span>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("form.editTitle", { entity: "" }).replace(/ /g, "")}</CardTitle>
          <CardDescription>
            {t("form.required")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {editableFields.map((field) => {
              const relSelector = relationSelectors.find((r) => r.fkField === field.name);
              const errs = fieldErrors[field.name];

              return (
                <div key={field.name} className="space-y-1.5">
                  <Label
                    htmlFor={field.name}
                    className={field.type === "Boolean" ? "sr-only" : ""}
                  >
                    {relSelector
                      ? (getFieldLayout(field.name)?.label ?? relSelector.label)
                      : (getFieldLayout(field.name)?.label ?? field.name)}
                    {field.isRequired && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>

                  {relSelector ? (
                    <RelationSelect
                      modelName={relSelector.relationModel}
                      value={formData[field.name] as string}
                      onChange={(val) => handleChange(field.name, val)}
                      error={errs?.[0]}
                      t={t}
                    />
                  ) : (
                    <FieldInput
                      field={field}
                      value={formData[field.name]}
                      onChange={(val) => handleChange(field.name, val)}
                      error={errs?.[0]}
                      placeholder={getFieldLayout(field.name)?.placeholder}
                    />
                  )}

                  {errs && (
                    <p className="text-xs text-destructive">{errs[0]}</p>
                  )}
                </div>
              );
            })}

            <div className="flex gap-2 pt-2 border-t">
              <Button type="submit" disabled={isSubmitting} className="gap-1.5">
                <Save className="h-4 w-4" />
                {isSubmitting ? t("form.saving") : t("common.save")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onNavigate(`/${entityPath}`)}
                className="gap-1.5"
              >
                <X className="h-4 w-4" />
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

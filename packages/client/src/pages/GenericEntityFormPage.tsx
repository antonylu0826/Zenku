import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEntityTranslation } from "@/hooks/useEntityTranslation";
import { useModelMeta } from "../hooks/useSchema";
import { useEntityDetail, useEntityCreate, useEntityUpdate } from "../hooks/useEntity";
import { useEntityList } from "../hooks/useEntity";
import { useAuth } from "../hooks/useAuth";
import type { FieldMeta } from "@zenku/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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

  if (field.isEnum && field.enumValues) {
    const { t } = useTranslation();
    const strValue = (value as string) || "";
    const valueExists = field.enumValues.includes(strValue);

    return (
      <Select value={strValue} onValueChange={onChange}>
        <SelectTrigger className={error ? "border-destructive" : ""}>
          <SelectValue placeholder={`${t("common.selectOption")}...`} />
        </SelectTrigger>
        <SelectContent>
          {strValue && !valueExists && (
            <SelectItem key={strValue} value={strValue} className="hidden">
              {strValue}
            </SelectItem>
          )}
          {field.enumValues.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
  t,
}: {
  modelName: string;
  value?: string;
  onChange: (val: string) => void;
  error?: string;
  t: (key: string) => string;
}) {
  const path = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const { data } = useEntityList(path, { pageSize: 100 });
  const meta = useModelMeta(modelName);
  const { tEntityName } = useEntityTranslation();

  const options = (data?.data || []).map((item) => ({
    id: item.id as string,
    label:
      (item.name as string) ||
      (item.email as string) ||
      (item.code as string) ||
      (item.id as string),
  }));

  // Ensure the currently selected value always exists in the DOM
  // so Radix UI doesn't reset it when options are still loading
  const valueExistsInOptions = options.some((opt) => opt.id === value);

  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger className={error ? "border-destructive" : ""}>
        <SelectValue placeholder={`${t("common.selectOption")}...`} />
      </SelectTrigger>
      <SelectContent>
        {value && !valueExistsInOptions && (
          <SelectItem key={value} value={value} className="hidden">
            {value}
          </SelectItem>
        )}
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
  const { t, i18n } = useTranslation();
  const { tEntityName, tEntityField } = useEntityTranslation();
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
      // Create a shallow copy to manipulate foreign key values
      const initialData = { ...existing };

      // If a foreign key field has a corresponding object populated (via Prisma include),
      // or if it's already a string, ensure formData[fkField] is set to the bare string ID.
      // Ensure foreign key fields (like categoryId) are set to string IDs.
      // We look for both endsWith("Id") and fields marked as isRelation in meta.
      meta?.fields.forEach(f => {
        if (f.isRelation && !f.isList) {
          const fkName = f.name + "Id";
          const relatedObj = existing[f.name] as Record<string, unknown> | undefined;
          if (relatedObj && relatedObj.id) {
            initialData[fkName] = relatedObj.id;
          }
        }
      });

      setFormData(initialData);
    }
  }, [isEdit, existing, meta]);

  if (!meta) return null;

  // Prevent form render before data is populated to avoid uncontrolled input issues
  if (isEdit && (!existing || Object.keys(formData).length === 0)) {
    return (
      <div className="p-6 max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // P12: Support form sections from entity definitions
  const uiSections = meta.ui?.form?.sections;
  const uiLayout = meta.ui?.form?.layout;

  // Collect all field names referenced in sections for the submit handler
  const sectionFieldNames = new Set<string>();
  if (uiSections) {
    for (const section of uiSections) {
      if (section.fields) {
        for (const row of section.fields) {
          for (const fname of row) {
            sectionFieldNames.add(fname);
          }
        }
      }
    }
  }

  // Build editable fields list (flat):
  // If sections exist, collect from sections; else use layout or auto-detect
  const editableFields = uiSections
    ? meta.fields.filter(
        (f) =>
          sectionFieldNames.has(f.name) &&
          !f.isId &&
          !f.isList &&
          f.name !== "createdAt" &&
          f.name !== "updatedAt" &&
          !f.isRelation
      )
    : uiLayout
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
        let value = formData[field.name];

        // Ensure we don't send back the whole relation object if it leaked into formData
        if (value && typeof value === 'object' && 'id' in value) {
          data[field.name] = (value as any).id;
        } else {
          data[field.name] = value;
        }
      }
    }

    // Also include relation IDs that might be in formData but not in editableFields
    // (though editableFields should include them if they are relations)
    relationSelectors.forEach(rel => {
      if (formData[rel.fkField]) {
        data[rel.fkField] = formData[rel.fkField];
      }
    });

    if (meta.fields.some((f) => f.name === "ownerId") && !data.ownerId && user) {
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
          {isEdit ? t("form.editTitle", { entity: tEntityName(meta) }) : t("form.createTitle", { entity: tEntityName(meta) })}
        </h2>
      </div>

      {globalError && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive mb-4">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{globalError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {uiSections ? (
          /* P12: Render form as sections */
          uiSections.filter(s => !s.detail).map((section, si) => {
            const sectionTitle = section.i18n?.[i18n.language] ?? section.i18n?.en ?? section.title;
            return (
              <Card key={si}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{sectionTitle}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {section.fields?.map((row, ri) => (
                    <div key={ri} className={`grid gap-4 ${row.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {row.map((fname) => {
                        const field = meta.fields.find(f => f.name === fname);
                        if (!field) return null;
                        const relSelector = relationSelectors.find((r) => r.fkField === fname);
                        const errs = fieldErrors[fname];

                        return (
                          <div key={fname} className="space-y-1.5">
                            <Label
                              htmlFor={fname}
                              className={field.type === "Boolean" ? "sr-only" : ""}
                            >
                              {tEntityField(meta, fname)}
                              {field.isRequired && (
                                <span className="text-destructive ml-1">*</span>
                              )}
                            </Label>

                            {relSelector ? (
                              <RelationSelect
                                modelName={relSelector.relationModel}
                                value={formData[fname] as string}
                                onChange={(val) => handleChange(fname, val)}
                                error={errs?.[0]}
                                t={t}
                              />
                            ) : (
                              <FieldInput
                                field={field}
                                value={formData[fname]}
                                onChange={(val) => handleChange(fname, val)}
                                error={errs?.[0]}
                                placeholder={t("form.enterField", { field: tEntityField(meta, fname) })}
                              />
                            )}

                            {errs && (
                              <p className="text-xs text-destructive">{errs[0]}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })
        ) : (
          /* Legacy: flat field list */
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {isEdit
                  ? t("form.editTitle", { entity: tEntityName(meta) })
                  : t("form.createTitle", { entity: tEntityName(meta) })}
              </CardTitle>
              <CardDescription>{t("form.required")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {editableFields.map((field) => {
                const relSelector = relationSelectors.find((r) => r.fkField === field.name);
                const errs = fieldErrors[field.name];

                return (
                  <div key={field.name} className="space-y-1.5">
                    <Label
                      htmlFor={field.name}
                      className={field.type === "Boolean" ? "sr-only" : ""}
                    >
                      {tEntityField(meta, field.name)}
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
                        placeholder={
                          getFieldLayout(field.name)?.placeholder
                            ? t(getFieldLayout(field.name)!.placeholder!)
                            : t("form.enterField", { field: tEntityField(meta, field.name) })
                        }
                      />
                    )}

                    {errs && (
                      <p className="text-xs text-destructive">{errs[0]}</p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2 pt-2">
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
    </div>
  );
}

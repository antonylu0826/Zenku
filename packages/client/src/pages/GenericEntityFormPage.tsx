import { useEffect, useState } from "react";
import { useModelMeta } from "../hooks/useSchema";
import { useEntityDetail, useEntityCreate, useEntityUpdate } from "../hooks/useEntity";
import { useEntityList } from "../hooks/useEntity";
import { useAuth } from "../hooks/useAuth";
import type { FieldMeta } from "@zenku/core";

interface Props {
  entityName: string;
  entityId?: string; // undefined = create mode
  onNavigate: (path: string) => void;
}

function FieldInput({
  field,
  value,
  onChange,
  relationOptions,
}: {
  field: FieldMeta;
  value: unknown;
  onChange: (val: unknown) => void;
  relationOptions?: { id: string; label: string }[];
}) {
  if (field.isRelation && relationOptions) {
    return (
      <select
        value={(value as string) || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded px-3 py-2 text-sm"
      >
        <option value="">Select...</option>
        {relationOptions.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "Boolean") {
    return (
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4"
      />
    );
  }

  if (field.type === "Int" || field.type === "Float" || field.type === "Decimal") {
    return (
      <input
        type="number"
        step={field.type === "Int" ? "1" : "0.01"}
        value={value as number ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        className="w-full border rounded px-3 py-2 text-sm"
      />
    );
  }

  if (field.type === "DateTime") {
    const dateVal = value ? new Date(value as string).toISOString().slice(0, 16) : "";
    return (
      <input
        type="datetime-local"
        value={dateVal}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : "")}
        className="w-full border rounded px-3 py-2 text-sm"
      />
    );
  }

  return (
    <input
      type="text"
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border rounded px-3 py-2 text-sm"
    />
  );
}

export default function GenericEntityFormPage({
  entityName,
  entityId,
  onNavigate,
}: Props) {
  const meta = useModelMeta(entityName);
  const entityPath = entityName.charAt(0).toLowerCase() + entityName.slice(1);
  const isEdit = !!entityId;
  const { user } = useAuth();

  const { data: existing } = useEntityDetail(entityPath, entityId || "");
  const createMutation = useEntityCreate(entityPath);
  const updateMutation = useEntityUpdate(entityPath);

  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [error, setError] = useState("");

  // Populate form with existing data
  useEffect(() => {
    if (isEdit && existing) {
      setFormData({ ...existing });
    }
  }, [isEdit, existing]);

  if (!meta) return <div className="p-6">Loading schema...</div>;

  // Editable fields: non-id, non-relation-object, non-auto
  const editableFields = meta.fields.filter(
    (f) =>
      !f.isId &&
      !f.isList &&
      f.name !== "createdAt" &&
      f.name !== "updatedAt" &&
      // Show FK fields as the relation selector
      !f.isRelation,
  );

  // Find relation fields that have a corresponding FK field
  const relationSelectors = meta.fields
    .filter((f) => f.isRelation && !f.isList && f.relationModel)
    .map((f) => ({
      fkField: f.name + "Id",
      relationModel: f.relationModel!,
      label: f.name,
    }));

  const handleChange = (fieldName: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Build submit data — only scalar fields
    const data: Record<string, unknown> = {};
    for (const field of editableFields) {
      if (field.name in formData) {
        data[field.name] = formData[field.name];
      }
    }

    // Auto-fill ownerId if present
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
      setError(err.message || "Save failed");
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-bold mb-4">
        {isEdit ? `Edit ${entityName}` : `New ${entityName}`}
      </h2>

      {error && (
        <div className="text-red-600 bg-red-50 p-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border p-6 space-y-4">
        {editableFields.map((field) => {
          // Check if this is a FK field with a relation selector
          const relSelector = relationSelectors.find((r) => r.fkField === field.name);

          return (
            <div key={field.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {relSelector ? relSelector.label : field.name}
                {field.isRequired && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              {relSelector ? (
                <RelationSelect
                  modelName={relSelector.relationModel}
                  value={formData[field.name] as string}
                  onChange={(val) => handleChange(field.name, val)}
                />
              ) : (
                <FieldInput
                  field={field}
                  value={formData[field.name]}
                  onChange={(val) => handleChange(field.name, val)}
                />
              )}
            </div>
          );
        })}

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-gray-900 text-white px-4 py-2 rounded text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => onNavigate(`/${entityPath}`)}
            className="border px-4 py-2 rounded text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function RelationSelect({
  modelName,
  value,
  onChange,
}: {
  modelName: string;
  value?: string;
  onChange: (val: string) => void;
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
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border rounded px-3 py-2 text-sm"
    >
      <option value="">Select {modelName}...</option>
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

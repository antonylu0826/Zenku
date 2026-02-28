import type { ModelMeta } from "@zenku/core";

export function generateFormPage(model: ModelMeta): string {
  const entityPath =
    model.name.charAt(0).toLowerCase() + model.name.slice(1);

  const editableFields = model.fields.filter(
    (f) =>
      !f.isId &&
      !f.isList &&
      f.name !== "createdAt" &&
      f.name !== "updatedAt" &&
      !f.isRelation,
  );

  const relationSelectors = model.fields
    .filter((f) => f.isRelation && !f.isList && f.relationModel)
    .map((f) => ({
      fkField: f.name + "Id",
      relationModel: f.relationModel!,
      label: f.name,
    }));

  const fieldInputs = editableFields
    .map((field) => {
      const rel = relationSelectors.find((r) => r.fkField === field.name);
      if (rel) {
        return `        <div key="${field.name}">
          <label className="block text-sm font-medium text-gray-700 mb-1">${rel.label}${field.isRequired ? ' <span className="text-red-400">*</span>' : ""}</label>
          <RelationSelect modelName="${rel.relationModel}" value={formData.${field.name} as string} onChange={(v) => handleChange("${field.name}", v)} />
        </div>`;
      }

      if (field.type === "Boolean") {
        return `        <div key="${field.name}">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" checked={!!formData.${field.name}} onChange={(e) => handleChange("${field.name}", e.target.checked)} className="w-4 h-4" />
            ${field.name}
          </label>
        </div>`;
      }

      const inputType =
        field.type === "Int" || field.type === "Float" || field.type === "Decimal"
          ? "number"
          : field.type === "DateTime"
            ? "datetime-local"
            : "text";

      const step =
        field.type === "Int" ? ' step="1"' : field.type === "Float" || field.type === "Decimal" ? ' step="0.01"' : "";

      return `        <div key="${field.name}">
          <label className="block text-sm font-medium text-gray-700 mb-1">${field.name}${field.isRequired ? ' <span className="text-red-400">*</span>' : ""}</label>
          <input type="${inputType}"${step} value={(formData.${field.name} as string) ?? ""} onChange={(e) => handleChange("${field.name}", ${inputType === "number" ? "Number(e.target.value)" : "e.target.value"})} className="w-full border rounded px-3 py-2 text-sm" />
        </div>`;
    })
    .join("\n");

  return `// Ejected from: ${model.name} Form Page
// Feel free to customize this file — it won't be overwritten.

import { useEffect, useState } from "react";
import { useEntityDetail, useEntityCreate, useEntityUpdate, useEntityList } from "../../hooks/useEntity";
import { useAuth } from "../../hooks/useAuth";

interface Props {
  entityId?: string;
  onNavigate: (path: string) => void;
}

function RelationSelect({ modelName, value, onChange }: { modelName: string; value?: string; onChange: (val: string) => void }) {
  const path = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const { data } = useEntityList(path, { pageSize: 100 });
  const options = (data?.data || []).map((item: any) => ({
    id: item.id,
    label: item.name || item.email || item.code || item.id,
  }));
  return (
    <select value={value || ""} onChange={(e) => onChange(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
      <option value="">Select {modelName}...</option>
      {options.map((opt: any) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
    </select>
  );
}

export default function ${model.name}FormPage({ entityId, onNavigate }: Props) {
  const isEdit = !!entityId;
  const { user } = useAuth();
  const { data: existing } = useEntityDetail("${entityPath}", entityId || "");
  const createMutation = useEntityCreate("${entityPath}");
  const updateMutation = useEntityUpdate("${entityPath}");
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (isEdit && existing) setFormData({ ...existing });
  }, [isEdit, existing]);

  const handleChange = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const data: Record<string, unknown> = {};
${editableFields.map((f) => `    if ("${f.name}" in formData) data["${f.name}"] = formData["${f.name}"];`).join("\n")}
${editableFields.some((f) => f.name === "ownerId") ? '    if (!data.ownerId && user) data.ownerId = user.id;' : ""}
    try {
      if (isEdit) await updateMutation.mutateAsync({ id: entityId!, data });
      else await createMutation.mutateAsync(data);
      onNavigate("/${entityPath}");
    } catch (err: any) {
      setError(err.message || "Save failed");
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-bold mb-4">{isEdit ? "Edit" : "New"} ${model.name}</h2>
      {error && <div className="text-red-600 bg-red-50 p-3 rounded mb-4 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border p-6 space-y-4">
${fieldInputs}
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={isSubmitting} className="bg-gray-900 text-white px-4 py-2 rounded text-sm hover:bg-gray-800 disabled:opacity-50">
            {isSubmitting ? "Saving..." : "Save"}
          </button>
          <button type="button" onClick={() => onNavigate("/${entityPath}")} className="border px-4 py-2 rounded text-sm hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
`;
}

// Ejected from: Product Form Page
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

export default function ProductFormPage({ entityId, onNavigate }: Props) {
  const isEdit = !!entityId;
  const { user } = useAuth();
  const { data: existing } = useEntityDetail("product", entityId || "");
  const createMutation = useEntityCreate("product");
  const updateMutation = useEntityUpdate("product");
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
    if ("code" in formData) data["code"] = formData["code"];
    if ("name" in formData) data["name"] = formData["name"];
    if ("price" in formData) data["price"] = formData["price"];
    if ("description" in formData) data["description"] = formData["description"];
    if ("isPublic" in formData) data["isPublic"] = formData["isPublic"];
    if ("categoryId" in formData) data["categoryId"] = formData["categoryId"];
    if ("ownerId" in formData) data["ownerId"] = formData["ownerId"];
    if (!data.ownerId && user) data.ownerId = user.id;
    try {
      if (isEdit) await updateMutation.mutateAsync({ id: entityId!, data });
      else await createMutation.mutateAsync(data);
      onNavigate("/product");
    } catch (err: any) {
      setError(err.message || "Save failed");
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-bold mb-4">{isEdit ? "Edit" : "New"} Product</h2>
      {error && <div className="text-red-600 bg-red-50 p-3 rounded mb-4 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border p-6 space-y-4">
        <div key="code">
          <label className="block text-sm font-medium text-gray-700 mb-1">code <span className="text-red-400">*</span></label>
          <input type="text" value={(formData.code as string) ?? ""} onChange={(e) => handleChange("code", e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div key="name">
          <label className="block text-sm font-medium text-gray-700 mb-1">name <span className="text-red-400">*</span></label>
          <input type="text" value={(formData.name as string) ?? ""} onChange={(e) => handleChange("name", e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div key="price">
          <label className="block text-sm font-medium text-gray-700 mb-1">price <span className="text-red-400">*</span></label>
          <input type="number" step="0.01" value={(formData.price as string) ?? ""} onChange={(e) => handleChange("price", Number(e.target.value))} className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div key="description">
          <label className="block text-sm font-medium text-gray-700 mb-1">description</label>
          <input type="text" value={(formData.description as string) ?? ""} onChange={(e) => handleChange("description", e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div key="isPublic">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" checked={!!formData.isPublic} onChange={(e) => handleChange("isPublic", e.target.checked)} className="w-4 h-4" />
            isPublic
          </label>
        </div>
        <div key="categoryId">
          <label className="block text-sm font-medium text-gray-700 mb-1">category <span className="text-red-400">*</span></label>
          <RelationSelect modelName="Category" value={formData.categoryId as string} onChange={(v) => handleChange("categoryId", v)} />
        </div>
        <div key="ownerId">
          <label className="block text-sm font-medium text-gray-700 mb-1">owner <span className="text-red-400">*</span></label>
          <RelationSelect modelName="User" value={formData.ownerId as string} onChange={(v) => handleChange("ownerId", v)} />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={isSubmitting} className="bg-gray-900 text-white px-4 py-2 rounded text-sm hover:bg-gray-800 disabled:opacity-50">
            {isSubmitting ? "Saving..." : "Save"}
          </button>
          <button type="button" onClick={() => onNavigate("/product")} className="border px-4 py-2 rounded text-sm hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

import { useModelMeta } from "../hooks/useSchema";
import { useEntityDetail, useEntityDelete } from "../hooks/useEntity";
import type { FieldMeta } from "@zenku/core";

interface Props {
  entityName: string;
  entityId: string;
  onNavigate: (path: string) => void;
}

function formatValue(value: unknown, field: FieldMeta): string {
  if (value === null || value === undefined) return "-";
  if (field.type === "Boolean") return value ? "Yes" : "No";
  if (field.type === "DateTime") {
    return new Date(value as string).toLocaleString();
  }
  if (field.type === "Float" || field.type === "Decimal") {
    return Number(value).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return (obj.name as string) || (obj.email as string) || (obj.id as string) || JSON.stringify(value);
  }
  return String(value);
}

export default function GenericEntityDetailPage({
  entityName,
  entityId,
  onNavigate,
}: Props) {
  const meta = useModelMeta(entityName);
  const entityPath = entityName.charAt(0).toLowerCase() + entityName.slice(1);
  const { data, isLoading, error } = useEntityDetail(entityPath, entityId);
  const deleteMutation = useEntityDelete(entityPath);

  if (!meta) return <div className="p-6">Loading schema...</div>;
  if (isLoading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error.message}</div>;
  if (!data) return <div className="p-6">Not found</div>;

  const visibleFields = meta.fields.filter((f) => !f.isList);

  const handleDelete = async () => {
    if (!confirm("Delete this item?")) return;
    await deleteMutation.mutateAsync(entityId);
    onNavigate(`/${entityPath}`);
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">{entityName} Detail</h2>
        <div className="flex gap-2">
          <button
            onClick={() => onNavigate(`/${entityPath}/${entityId}/edit`)}
            className="bg-gray-900 text-white px-4 py-2 rounded text-sm hover:bg-gray-800"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="border border-red-300 text-red-600 px-4 py-2 rounded text-sm hover:bg-red-50"
          >
            Delete
          </button>
          <button
            onClick={() => onNavigate(`/${entityPath}`)}
            className="border px-4 py-2 rounded text-sm hover:bg-gray-50"
          >
            Back
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border divide-y">
        {visibleFields.map((field) => (
          <div key={field.name} className="flex px-4 py-3">
            <dt className="w-40 text-sm font-medium text-gray-500 shrink-0">
              {field.name}
            </dt>
            <dd className="text-sm text-gray-900">
              {formatValue(data[field.name], field)}
            </dd>
          </div>
        ))}
      </div>
    </div>
  );
}

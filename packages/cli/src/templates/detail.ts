import type { ModelMeta } from "@zenku/core";

export function generateDetailPage(model: ModelMeta): string {
  const entityPath =
    model.name.charAt(0).toLowerCase() + model.name.slice(1);

  const visibleFields = model.fields.filter((f) => !f.isList);

  const fieldRenderers = visibleFields
    .map((f) => {
      let render: string;
      if (f.isRelation) {
        render = `typeof val === "object" && val ? ((val as any).name || (val as any).email || (val as any).id) : "-"`;
      } else if (f.type === "Boolean") {
        render = `val ? "Yes" : "No"`;
      } else if (f.type === "DateTime") {
        render = `val ? new Date(val as string).toLocaleString() : "-"`;
      } else if (f.type === "Float" || f.type === "Decimal") {
        render = `val != null ? Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"`;
      } else {
        render = `String(val ?? "-")`;
      }
      return `    { name: "${f.name}", render: (val: unknown) => ${render} },`;
    })
    .join("\n");

  return `// Ejected from: ${model.name} Detail Page
// Feel free to customize this file — it won't be overwritten.

import { useEntityDetail, useEntityDelete } from "../../hooks/useEntity";

interface Props {
  entityId: string;
  onNavigate: (path: string) => void;
}

const fields = [
${fieldRenderers}
];

export default function ${model.name}DetailPage({ entityId, onNavigate }: Props) {
  const { data, isLoading, error } = useEntityDetail("${entityPath}", entityId);
  const deleteMutation = useEntityDelete("${entityPath}");

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error.message}</div>;
  if (!data) return <div className="p-6">Not found</div>;

  const handleDelete = async () => {
    if (!confirm("Delete this ${model.name}?")) return;
    await deleteMutation.mutateAsync(entityId);
    onNavigate("/${entityPath}");
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">${model.name} Detail</h2>
        <div className="flex gap-2">
          <button onClick={() => onNavigate(\`/${entityPath}/\${entityId}/edit\`)} className="bg-gray-900 text-white px-4 py-2 rounded text-sm hover:bg-gray-800">
            Edit
          </button>
          <button onClick={handleDelete} className="border border-red-300 text-red-600 px-4 py-2 rounded text-sm hover:bg-red-50">
            Delete
          </button>
          <button onClick={() => onNavigate("/${entityPath}")} className="border px-4 py-2 rounded text-sm hover:bg-gray-50">
            Back
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border divide-y">
        {fields.map((field) => (
          <div key={field.name} className="flex px-4 py-3">
            <dt className="w-40 text-sm font-medium text-gray-500 shrink-0">{field.name}</dt>
            <dd className="text-sm text-gray-900">{field.render((data as any)[field.name])}</dd>
          </div>
        ))}
      </div>
    </div>
  );
}
`;
}

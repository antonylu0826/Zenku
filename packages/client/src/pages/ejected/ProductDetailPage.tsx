// Ejected from: Product Detail Page
// Feel free to customize this file — it won't be overwritten.

import { useEntityDetail, useEntityDelete } from "../../hooks/useEntity";

interface Props {
  entityId: string;
  onNavigate: (path: string) => void;
}

const fields = [
    { name: "id", render: (val: unknown) => String(val ?? "-") },
    { name: "code", render: (val: unknown) => String(val ?? "-") },
    { name: "name", render: (val: unknown) => String(val ?? "-") },
    { name: "price", render: (val: unknown) => val != null ? Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-" },
    { name: "description", render: (val: unknown) => String(val ?? "-") },
    { name: "isPublic", render: (val: unknown) => val ? "Yes" : "No" },
    { name: "category", render: (val: unknown) => typeof val === "object" && val ? ((val as any).name || (val as any).email || (val as any).id) : "-" },
    { name: "categoryId", render: (val: unknown) => String(val ?? "-") },
    { name: "owner", render: (val: unknown) => typeof val === "object" && val ? ((val as any).name || (val as any).email || (val as any).id) : "-" },
    { name: "ownerId", render: (val: unknown) => String(val ?? "-") },
    { name: "createdAt", render: (val: unknown) => val ? new Date(val as string).toLocaleString() : "-" },
    { name: "updatedAt", render: (val: unknown) => val ? new Date(val as string).toLocaleString() : "-" },
];

export default function ProductDetailPage({ entityId, onNavigate }: Props) {
  const { data, isLoading, error } = useEntityDetail("product", entityId);
  const deleteMutation = useEntityDelete("product");

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error.message}</div>;
  if (!data) return <div className="p-6">Not found</div>;

  const handleDelete = async () => {
    if (!confirm("Delete this Product?")) return;
    await deleteMutation.mutateAsync(entityId);
    onNavigate("/product");
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Product Detail</h2>
        <div className="flex gap-2">
          <button onClick={() => onNavigate(`/product/${entityId}/edit`)} className="bg-gray-900 text-white px-4 py-2 rounded text-sm hover:bg-gray-800">
            Edit
          </button>
          <button onClick={handleDelete} className="border border-red-300 text-red-600 px-4 py-2 rounded text-sm hover:bg-red-50">
            Delete
          </button>
          <button onClick={() => onNavigate("/product")} className="border px-4 py-2 rounded text-sm hover:bg-gray-50">
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

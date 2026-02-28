// Ejected from: Product List Page
// Feel free to customize this file — it won't be overwritten.

import { useState } from "react";
import { useEntityList, useEntityDelete } from "../../hooks/useEntity";

interface Props {
  onNavigate: (path: string) => void;
}

const columns = [
    { name: "code", render: (val: unknown) => String(val ?? "-") },
    { name: "name", render: (val: unknown) => String(val ?? "-") },
    { name: "price", render: (val: unknown) => val != null ? Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-" },
    { name: "description", render: (val: unknown) => String(val ?? "-") },
    { name: "isPublic", render: (val: unknown) => val ? "Yes" : "No" },
    { name: "category", render: (val: unknown) => typeof val === "object" && val ? ((val as any).name || (val as any).email || (val as any).id) : String(val ?? "-") },
    { name: "owner", render: (val: unknown) => typeof val === "object" && val ? ((val as any).name || (val as any).email || (val as any).id) : String(val ?? "-") },
];

export default function ProductListPage({ onNavigate }: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data, isLoading, error } = useEntityList("product", {
    page,
    pageSize: 20,
    sort,
    sortDir,
    search: search || undefined,
  });

  const deleteMutation = useEntityDelete("product");

  const handleSort = (field: string) => {
    if (sort === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSort(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this Product?")) return;
    deleteMutation.mutate(id);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Products</h2>
        <button
          onClick={() => onNavigate("/product/new")}
          className="bg-gray-900 text-white px-4 py-2 rounded text-sm hover:bg-gray-800"
        >
          + New Product
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border rounded px-3 py-1.5 text-sm w-64"
        />
      </div>

      {error && (
        <div className="text-red-600 bg-red-50 p-3 rounded mb-4 text-sm">
          {error.message}
        </div>
      )}

      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.name}
                  className="text-left px-4 py-2 font-medium text-gray-600 cursor-pointer hover:text-gray-900 select-none"
                  onClick={() => handleSort(col.name)}
                >
                  {col.name}
                  {sort === col.name && (
                    <span className="ml-1">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>
                  )}
                </th>
              ))}
              <th className="px-4 py-2 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-gray-400">
                  No records found
                </td>
              </tr>
            ) : (
              data?.data.map((row: any) => (
                <tr
                  key={row.id}
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => onNavigate(`/product/${row.id}`)}
                >
                  {columns.map((col) => (
                    <td key={col.name} className="px-4 py-2">
                      {col.render(row[col.name])}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); onNavigate(`/product/${row.id}/edit`); }}
                      className="text-gray-500 hover:text-gray-700 mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(row.id); }}
                      className="text-red-400 hover:text-red-600"
                    >
                      Del
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center gap-2 mt-4 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1 border rounded disabled:opacity-30"
          >
            Prev
          </button>
          <span className="text-gray-500">
            Page {data.page} of {data.totalPages} ({data.total} total)
          </span>
          <button
            disabled={page >= data.totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1 border rounded disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

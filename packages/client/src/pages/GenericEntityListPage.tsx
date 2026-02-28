import { useState } from "react";
import { useModelMeta } from "../hooks/useSchema";
import { useEntityList, useEntityDelete } from "../hooks/useEntity";
import type { FieldMeta } from "@zenku/core";

interface Props {
  entityName: string;
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
    // Relation object — show name or id
    const obj = value as Record<string, unknown>;
    return (obj.name as string) || (obj.email as string) || (obj.id as string) || JSON.stringify(value);
  }
  return String(value);
}

export default function GenericEntityListPage({ entityName, onNavigate }: Props) {
  const meta = useModelMeta(entityName);
  const entityPath = entityName.charAt(0).toLowerCase() + entityName.slice(1);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data, isLoading, error } = useEntityList(entityPath, {
    page,
    pageSize: 20,
    sort,
    sortDir,
    search: search || undefined,
  });

  const deleteMutation = useEntityDelete(entityPath);

  if (!meta) return <div className="p-6">Loading schema...</div>;

  // Determine visible columns: scalar non-id, non-timestamps, plus relation objects
  const columns = meta.fields.filter(
    (f) =>
      !f.isId &&
      f.name !== "createdAt" &&
      f.name !== "updatedAt" &&
      // Hide foreign key fields (show relation object instead)
      !meta.fields.some(
        (rel) => rel.isRelation && !rel.isList && f.name === rel.name + "Id",
      ) &&
      // Hide list relations
      !f.isList,
  );

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
    if (!confirm("Delete this item?")) return;
    deleteMutation.mutate(id);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">{meta.plural}</h2>
        <button
          onClick={() => onNavigate(`/${entityPath}/new`)}
          className="bg-gray-900 text-white px-4 py-2 rounded text-sm hover:bg-gray-800"
        >
          + New {entityName}
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="border rounded px-3 py-1.5 text-sm w-64"
        />
      </div>

      {error && (
        <div className="text-red-600 bg-red-50 p-3 rounded mb-4 text-sm">
          {error.message}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.name}
                  className="text-left px-4 py-2 font-medium text-gray-600 cursor-pointer hover:text-gray-900 select-none"
                  onClick={() => !col.isRelation && handleSort(col.name)}
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
              data?.data.map((row) => (
                <tr
                  key={row.id as string}
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => onNavigate(`/${entityPath}/${row.id}`)}
                >
                  {columns.map((col) => (
                    <td key={col.name} className="px-4 py-2">
                      {formatValue(row[col.name], col)}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(`/${entityPath}/${row.id}/edit`);
                      }}
                      className="text-gray-500 hover:text-gray-700 mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(row.id as string);
                      }}
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

      {/* Pagination */}
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

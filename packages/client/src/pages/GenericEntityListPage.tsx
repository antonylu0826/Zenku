import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useModelMeta } from "../hooks/useSchema";
import {
    useEntityList,
    useEntityDelete,
    useEntityBatchDelete,
    useEntityUpdate,
} from "../hooks/useEntity";
import type { FieldMeta } from "@zenku/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import DataTable from "@/components/DataTable";
import ViewSwitcher, { type ViewMode } from "@/components/ViewSwitcher";
import KanbanView from "@/components/renderers/KanbanView";
import CalendarView from "@/components/renderers/CalendarView";
import TreeListView from "@/components/renderers/TreeListView";

interface Props {
    entityName: string;
    onNavigate: (path: string) => void;
}

function formatValue(value: unknown, field: FieldMeta): React.ReactNode {
    if (value === null || value === undefined)
        return <span className="text-muted-foreground">—</span>;
    if (field.type === "Boolean") {
        return (
            <Badge variant={value ? "default" : "secondary"}>
                {value ? "Yes" : "No"}
            </Badge>
        );
    }
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
        return (
            (obj.name as string) ||
            (obj.email as string) ||
            (obj.id as string) ||
            "—"
        );
    }
    return String(value);
}

export default function GenericEntityListPage({
    entityName,
    onNavigate,
}: Props) {
    const { t } = useTranslation();
    const meta = useModelMeta(entityName);
    const entityPath =
        entityName.charAt(0).toLowerCase() + entityName.slice(1);

    // ─── Available view modes from UiConfig ───────────────────────────────────
    const availableViews = useMemo<ViewMode[]>(() => {
        const views: ViewMode[] = ["list"];
        if (meta?.ui?.kanban) views.push("kanban");
        if (meta?.ui?.calendar) views.push("calendar");
        if (meta?.ui?.tree) views.push("tree");
        return views;
    }, [meta]);

    const storageKey = `zenku-view-${entityName}`;
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        const saved = sessionStorage.getItem(storageKey) as ViewMode | null;
        return saved && availableViews.includes(saved) ? saved : "list";
    });

    // Sync viewMode if availableViews changes (e.g. after meta loads)
    useEffect(() => {
        if (!availableViews.includes(viewMode)) {
            setViewMode(availableViews[0]);
        }
    }, [availableViews, viewMode]);

    const isNonListView = viewMode !== "list";

    // ─── List view state ──────────────────────────────────────────────────────
    const uiDefaultSort = meta?.ui?.list?.defaultSort;

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState(uiDefaultSort?.field ?? "createdAt");
    const [sortDir, setSortDir] = useState<"asc" | "desc">(
        uiDefaultSort?.dir ?? "desc",
    );
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Multi-select state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);

    // Clear selection when filters or page change
    useEffect(() => {
        setSelectedIds(new Set());
    }, [page, search, sort, sortDir]);

    // ─── Data fetching ────────────────────────────────────────────────────────
    const { data, isLoading } = useEntityList(entityPath, {
        page,
        pageSize: 20,
        sort,
        sortDir,
        search: search || undefined,
    });

    // For non-list views: fetch all records (up to 500)
    const { data: allData, isLoading: allDataLoading } = useEntityList(
        entityPath,
        { page: 1, pageSize: 500 },
        { enabled: isNonListView },
    );

    // ─── Mutations ────────────────────────────────────────────────────────────
    const deleteMutation = useEntityDelete(entityPath);
    const batchDeleteMutation = useEntityBatchDelete(entityPath);
    const updateMutation = useEntityUpdate(entityPath);

    if (!meta) return null;

    // ─── Column resolution ────────────────────────────────────────────────────
    const uiColumns = meta.ui?.list?.columns;
    const columns = uiColumns
        ? uiColumns
              .map((colName) => meta.fields.find((f) => f.name === colName))
              .filter((f): f is NonNullable<typeof f> => f !== undefined)
        : meta.fields.filter(
              (f) =>
                  !f.isId &&
                  f.name !== "createdAt" &&
                  f.name !== "updatedAt" &&
                  !meta.fields.some(
                      (rel) =>
                          rel.isRelation &&
                          !rel.isList &&
                          f.name === rel.name + "Id",
                  ) &&
                  !f.isList,
          );

    // ─── Handlers ─────────────────────────────────────────────────────────────
    const handleSort = (field: string) => {
        if (sort === field) {
            setSortDir(sortDir === "asc" ? "desc" : "asc");
        } else {
            setSort(field);
            setSortDir("asc");
        }
        setPage(1);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteMutation.mutateAsync(deleteId);
            toast.success(t("toast.deleted", { entity: entityName }));
        } catch {
            toast.error(t("toast.deleteError", { entity: entityName }));
        } finally {
            setDeleteId(null);
        }
    };

    const handleBatchDelete = async () => {
        const ids = Array.from(selectedIds);
        try {
            const result = await batchDeleteMutation.mutateAsync(ids);
            toast.success(t("toast.deletedMany", { count: (result as any).deleted }));
            setSelectedIds(new Set());
        } catch {
            toast.error(t("toast.error"));
        } finally {
            setShowBatchDeleteDialog(false);
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        const allIds = (data?.data ?? []).map((r) => r.id as string);
        setSelectedIds((prev) =>
            prev.size === allIds.length ? new Set() : new Set(allIds),
        );
    };

    const handleViewChange = (mode: ViewMode) => {
        setViewMode(mode);
        sessionStorage.setItem(storageKey, mode);
    };

    const handleKanbanUpdate = (id: string, newStatus: string) => {
        const kanbanConfig = meta.ui?.kanban;
        if (!kanbanConfig) return;
        updateMutation.mutate(
            { id, data: { [kanbanConfig.statusField]: newStatus } },
            {
                onSuccess: () =>
                    toast.success(t("toast.statusUpdated")),
                onError: () =>
                    toast.error(t("toast.error")),
            },
        );
    };

    const exportUrl = `/api/${entityPath}/export?format=csv${search ? `&search=${encodeURIComponent(search)}` : ""}&sort=${sort}&sortDir=${sortDir}`;

    return (
        <div className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                        {meta.plural}
                    </h2>
                    {data && viewMode === "list" && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {t("list.records", { count: data.total })}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <ViewSwitcher
                        available={availableViews}
                        current={viewMode}
                        onChange={handleViewChange}
                    />
                    {viewMode === "list" && (
                        <Button variant="outline" size="sm" asChild>
                            <a href={exportUrl} download>
                                <Download className="h-4 w-4 mr-1.5" />
                                {t("common.export")}
                            </a>
                        </Button>
                    )}
                    <Button
                        onClick={() => onNavigate(`/${entityPath}/new`)}
                        size="sm"
                        className="gap-1.5"
                    >
                        <Plus className="h-4 w-4" />
                        {t("list.newRecord", { entity: entityName })}
                    </Button>
                </div>
            </div>

            {/* Search — list view only */}
            {viewMode === "list" && (
                <Input
                    placeholder={`${t("common.search")} ${meta.plural.toLowerCase()}...`}
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    className="max-w-sm"
                />
            )}

            {/* Batch action bar — list view only */}
            {viewMode === "list" && selectedIds.size > 0 && (
                <div className="flex items-center gap-3 px-3 py-2 bg-muted rounded-md border">
                    <span className="text-sm font-medium">
                        {t("list.selected", { count: selectedIds.size })}
                    </span>
                    <Button
                        variant="destructive"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setShowBatchDeleteDialog(true)}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("list.deleteSelected")}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedIds(new Set())}
                    >
                        {t("list.deselectAll")}
                    </Button>
                </div>
            )}

            {/* ── Renderer ─────────────────────────────────────────────────── */}

            {viewMode === "kanban" && meta.ui?.kanban && (
                <KanbanView
                    rows={allData?.data ?? []}
                    kanbanConfig={meta.ui.kanban}
                    entityPath={entityPath}
                    onNavigate={onNavigate}
                    isLoading={allDataLoading}
                    onUpdate={handleKanbanUpdate}
                />
            )}

            {viewMode === "calendar" && meta.ui?.calendar && (
                <CalendarView
                    rows={allData?.data ?? []}
                    calendarConfig={meta.ui.calendar}
                    entityPath={entityPath}
                    onNavigate={onNavigate}
                    isLoading={allDataLoading}
                />
            )}

            {viewMode === "tree" && meta.ui?.tree && (
                <TreeListView
                    rows={allData?.data ?? []}
                    treeConfig={meta.ui.tree}
                    entityPath={entityPath}
                    onNavigate={onNavigate}
                    isLoading={allDataLoading}
                />
            )}

            {viewMode === "list" && (
                <>
                    <DataTable
                        entityName={entityName}
                        entityPath={entityPath}
                        columns={columns}
                        rows={data?.data ?? []}
                        isLoading={isLoading}
                        selectedIds={selectedIds}
                        onToggleSelect={toggleSelect}
                        onToggleSelectAll={toggleSelectAll}
                        sortField={sort}
                        sortDir={sortDir}
                        onSort={handleSort}
                        formatValue={formatValue}
                        deleteId={deleteId}
                        onDeleteRequest={setDeleteId}
                        onDeleteCancel={() => setDeleteId(null)}
                        onDeleteConfirm={handleDelete}
                        onNavigate={onNavigate}
                    />

                    {/* Pagination */}
                    {data && data.totalPages > 1 && (
                        <div className="flex items-center gap-2 text-sm justify-end">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage(page - 1)}
                            >
                                {t("list.previous")}
                            </Button>
                            <span className="text-muted-foreground px-2">
                                {t("list.page", { page: data.page, total: data.totalPages })}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= data.totalPages}
                                onClick={() => setPage(page + 1)}
                            >
                                {t("list.next")}
                            </Button>
                        </div>
                    )}
                </>
            )}

            {/* Batch delete confirmation dialog */}
            <AlertDialog
                open={showBatchDeleteDialog}
                onOpenChange={setShowBatchDeleteDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {t("list.confirmDeleteMany", { count: selectedIds.size, entity: selectedIds.size === 1 ? entityName : meta.plural })}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("list.confirmDeleteManyDesc", { count: selectedIds.size })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleBatchDelete}
                        >
                            {t("list.deleteCount", { count: selectedIds.size })}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

import { useTranslation } from "react-i18next";
import type { FieldMeta } from "@zenku/core";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Inbox,
    Pencil,
    Trash2,
} from "lucide-react";

interface DataTableProps {
    entityName: string;
    entityPath: string;
    columns: FieldMeta[];
    rows: Record<string, unknown>[];
    isLoading: boolean;
    selectedIds: Set<string>;
    onToggleSelect: (id: string) => void;
    onToggleSelectAll: () => void;
    sortField: string;
    sortDir: "asc" | "desc";
    onSort: (field: string) => void;
    formatValue: (val: unknown, field: FieldMeta) => React.ReactNode;
    deleteId: string | null;
    onDeleteRequest: (id: string) => void;
    onDeleteCancel: () => void;
    onDeleteConfirm: () => void;
    onNavigate: (path: string) => void;
}

export default function DataTable({
    entityName,
    entityPath,
    columns,
    rows,
    isLoading,
    selectedIds,
    onToggleSelect,
    onToggleSelectAll,
    sortField,
    sortDir,
    onSort,
    formatValue,
    deleteId,
    onDeleteRequest,
    onDeleteCancel,
    onDeleteConfirm,
    onNavigate,
}: DataTableProps) {
    const { t } = useTranslation();
    const allSelected = rows.length > 0 && selectedIds.size === rows.length;
    const someSelected = selectedIds.size > 0 && selectedIds.size < rows.length;

    const SortIcon = ({ field }: { field: string }) => {
        if (sortField !== field)
            return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
        return sortDir === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5" />
        ) : (
            <ArrowDown className="h-3.5 w-3.5" />
        );
    };

    return (
        <div className="rounded-md border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-10">
                            <Checkbox
                                checked={allSelected}
                                data-state={
                                    someSelected ? "indeterminate" : undefined
                                }
                                onCheckedChange={onToggleSelectAll}
                                aria-label="Select all"
                            />
                        </TableHead>
                        {columns.map((col) => (
                            <TableHead key={col.name}>
                                {!col.isRelation ? (
                                    <button
                                        className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                                        onClick={() => onSort(col.name)}
                                    >
                                        <span className="capitalize">
                                            {col.name}
                                        </span>
                                        <SortIcon field={col.name} />
                                    </button>
                                ) : (
                                    <span className="capitalize">{col.name}</span>
                                )}
                            </TableHead>
                        ))}
                        <TableHead className="w-[100px]" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell>
                                    <Skeleton className="h-4 w-4" />
                                </TableCell>
                                {columns.map((col) => (
                                    <TableCell key={col.name}>
                                        <Skeleton className="h-4 w-full max-w-[120px]" />
                                    </TableCell>
                                ))}
                                <TableCell>
                                    <Skeleton className="h-4 w-16" />
                                </TableCell>
                            </TableRow>
                        ))
                    ) : rows.length === 0 ? (
                        <TableRow>
                            <TableCell
                                colSpan={columns.length + 2}
                                className="py-16 text-center"
                            >
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                    <Inbox className="h-8 w-8" />
                                    <p className="text-sm">
                                        {t("common.noRecords")}
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            onNavigate(`/${entityPath}/new`)
                                        }
                                    >
                                        {t("common.create")}
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        rows.map((row) => {
                            const id = row.id as string;
                            return (
                                <TableRow
                                    key={id}
                                    className="cursor-pointer"
                                    data-selected={
                                        selectedIds.has(id) || undefined
                                    }
                                    onClick={() =>
                                        onNavigate(`/${entityPath}/${id}`)
                                    }
                                >
                                    <TableCell
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Checkbox
                                            checked={selectedIds.has(id)}
                                            onCheckedChange={() =>
                                                onToggleSelect(id)
                                            }
                                            aria-label={`Select row ${id}`}
                                        />
                                    </TableCell>
                                    {columns.map((col) => (
                                        <TableCell key={col.name}>
                                            {formatValue(row[col.name], col)}
                                        </TableCell>
                                    ))}
                                    <TableCell className="text-right">
                                        <div
                                            className="flex items-center justify-end gap-1"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() =>
                                                    onNavigate(
                                                        `/${entityPath}/${id}/edit`,
                                                    )
                                                }
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <AlertDialog
                                                open={deleteId === id}
                                                onOpenChange={(open) =>
                                                    !open && onDeleteCancel()
                                                }
                                            >
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                        onClick={() =>
                                                            onDeleteRequest(id)
                                                        }
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>
                                                            {t("detail.confirmDelete", { entity: entityName })}
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            {t("detail.confirmDeleteDesc")}
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>
                                                            {t("common.cancel")}
                                                        </AlertDialogCancel>
                                                        <AlertDialogAction
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            onClick={
                                                                onDeleteConfirm
                                                            }
                                                        >
                                                            {t("common.delete")}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

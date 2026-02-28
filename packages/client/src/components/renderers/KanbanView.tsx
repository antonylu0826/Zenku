import { useDraggable, useDroppable, DndContext, type DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface KanbanConfig {
    statusField: string;
    columns: string[];
    cardTitle: string;
    cardSubtitle?: string;
}

interface Props {
    rows: Record<string, unknown>[];
    kanbanConfig: KanbanConfig;
    onUpdate: (id: string, newStatus: string) => void;
    onNavigate: (path: string) => void;
    entityPath: string;
    isLoading: boolean;
}

const COLUMN_LABELS: Record<string, string> = {
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    DONE: "Done",
};

function formatColumnLabel(value: string): string {
    return COLUMN_LABELS[value] ?? value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── KanbanCard ──────────────────────────────────────────────────────────────

interface CardProps {
    row: Record<string, unknown>;
    kanbanConfig: KanbanConfig;
    onNavigate: (path: string) => void;
    entityPath: string;
}

function KanbanCard({ row, kanbanConfig, onNavigate, entityPath }: CardProps) {
    const id = String(row.id);
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });

    const style = {
        transform: CSS.Translate.toString(transform),
    };

    const title = String(row[kanbanConfig.cardTitle] ?? "");
    const subtitleRaw = kanbanConfig.cardSubtitle ? row[kanbanConfig.cardSubtitle] : undefined;
    const subtitleStr =
        subtitleRaw != null
            ? typeof subtitleRaw === "string" && !isNaN(Date.parse(subtitleRaw))
                ? format(new Date(subtitleRaw), "MMM d, yyyy")
                : String(subtitleRaw)
            : null;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={cn(
                "bg-background border rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing select-none",
                isDragging && "opacity-50 shadow-lg ring-2 ring-primary",
            )}
        >
            <p
                className="text-sm font-medium leading-snug hover:text-primary cursor-pointer"
                onClick={(e) => {
                    e.stopPropagation();
                    onNavigate(`/${entityPath}/${id}`);
                }}
            >
                {title}
            </p>
            {subtitleStr && (
                <p className="text-xs text-muted-foreground mt-1">{subtitleStr}</p>
            )}
        </div>
    );
}

// ─── KanbanColumn ─────────────────────────────────────────────────────────────

interface ColumnProps {
    columnValue: string;
    rows: Record<string, unknown>[];
    kanbanConfig: KanbanConfig;
    onNavigate: (path: string) => void;
    entityPath: string;
}

function KanbanColumn({ columnValue, rows, kanbanConfig, onNavigate, entityPath }: ColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id: columnValue });

    const cards = rows.filter((r) => r[kanbanConfig.statusField] === columnValue);

    return (
        <div className="flex flex-col min-w-[240px] max-w-[300px] flex-1">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">{formatColumnLabel(columnValue)}</h3>
                <Badge variant="secondary" className="text-xs">
                    {cards.length}
                </Badge>
            </div>
            <div
                ref={setNodeRef}
                className={cn(
                    "flex flex-col gap-2 rounded-lg p-2 min-h-[120px] transition-colors",
                    isOver ? "bg-primary/10 ring-2 ring-primary/30" : "bg-muted/40",
                )}
            >
                {cards.map((row) => (
                    <KanbanCard
                        key={String(row.id)}
                        row={row}
                        kanbanConfig={kanbanConfig}
                        onNavigate={onNavigate}
                        entityPath={entityPath}
                    />
                ))}
            </div>
        </div>
    );
}

// ─── KanbanView ──────────────────────────────────────────────────────────────

export default function KanbanView({ rows, kanbanConfig, onUpdate, onNavigate, entityPath, isLoading }: Props) {
    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over) return;
        const newStatus = String(over.id);
        const row = rows.find((r) => String(r.id) === String(active.id));
        if (!row || row[kanbanConfig.statusField] === newStatus) return;
        onUpdate(String(active.id), newStatus);
    }

    if (isLoading) {
        return (
            <div className="flex gap-4 overflow-x-auto pb-4">
                {kanbanConfig.columns.map((col) => (
                    <div key={col} className="flex flex-col min-w-[240px] flex-1 gap-2">
                        <Skeleton className="h-5 w-24" />
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-16 w-full rounded-lg" />
                        ))}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <DndContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4">
                {kanbanConfig.columns.map((columnValue) => (
                    <KanbanColumn
                        key={columnValue}
                        columnValue={columnValue}
                        rows={rows}
                        kanbanConfig={kanbanConfig}
                        onNavigate={onNavigate}
                        entityPath={entityPath}
                    />
                ))}
            </div>
        </DndContext>
    );
}

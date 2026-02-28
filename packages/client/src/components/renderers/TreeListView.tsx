import { useState } from "react";
import { ChevronRight, File } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TreeConfig {
    parentField: string;
    labelField: string;
}

interface Props {
    rows: Record<string, unknown>[];
    treeConfig: TreeConfig;
    onNavigate: (path: string) => void;
    entityPath: string;
    isLoading: boolean;
}

interface TreeNode {
    row: Record<string, unknown>;
    children: TreeNode[];
}

function buildTree(rows: Record<string, unknown>[], parentField: string, parentId: unknown = null): TreeNode[] {
    return rows
        .filter((r) => (r[parentField] ?? null) === parentId)
        .map((r) => ({
            row: r,
            children: buildTree(rows, parentField, r.id),
        }));
}

// ─── TreeNodeComponent ────────────────────────────────────────────────────────

interface NodeProps {
    node: TreeNode;
    depth: number;
    labelField: string;
    onNavigate: (path: string) => void;
    entityPath: string;
}

function TreeNodeComponent({ node, depth, labelField, onNavigate, entityPath }: NodeProps) {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = node.children.length > 0;
    const label = String(node.row[labelField] ?? node.row.id);

    return (
        <div>
            <div
                className="flex items-center gap-1 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer group"
                style={{ paddingLeft: `${depth * 20 + 8}px` }}
            >
                {hasChildren ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setExpanded(!expanded);
                        }}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                        <ChevronRight
                            className={cn(
                                "h-4 w-4 transition-transform duration-150",
                                expanded && "rotate-90",
                            )}
                        />
                    </button>
                ) : (
                    <File className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                )}
                <span
                    className="text-sm hover:text-primary"
                    onClick={() => onNavigate(`/${entityPath}/${node.row.id}`)}
                >
                    {label}
                </span>
                {hasChildren && (
                    <span className="ml-auto text-xs text-muted-foreground opacity-0 group-hover:opacity-100">
                        {node.children.length}
                    </span>
                )}
            </div>
            {expanded &&
                node.children.map((child) => (
                    <TreeNodeComponent
                        key={String(child.row.id)}
                        node={child}
                        depth={depth + 1}
                        labelField={labelField}
                        onNavigate={onNavigate}
                        entityPath={entityPath}
                    />
                ))}
        </div>
    );
}

// ─── TreeListView ─────────────────────────────────────────────────────────────

export default function TreeListView({ rows, treeConfig, onNavigate, entityPath, isLoading }: Props) {
    if (isLoading) {
        return (
            <div className="space-y-1">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-8 w-full rounded-md" style={{ width: `${100 - i * 5}%` }} />
                ))}
            </div>
        );
    }

    const roots = buildTree(rows, treeConfig.parentField);

    if (roots.length === 0) {
        return (
            <div className="py-12 text-center text-muted-foreground text-sm">
                No items to display
            </div>
        );
    }

    return (
        <div className="border rounded-lg p-2">
            {roots.map((node) => (
                <TreeNodeComponent
                    key={String(node.row.id)}
                    node={node}
                    depth={0}
                    labelField={treeConfig.labelField}
                    onNavigate={onNavigate}
                    entityPath={entityPath}
                />
            ))}
        </div>
    );
}

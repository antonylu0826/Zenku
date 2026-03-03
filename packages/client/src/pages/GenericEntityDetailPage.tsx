import { useTranslation } from "react-i18next";
import { useEntityTranslation } from "@/hooks/useEntityTranslation";
import { useModelMeta } from "../hooks/useSchema";
import { useEntityDetail, useEntityDelete, useEntityList } from "../hooks/useEntity";
import type { FieldMeta, DetailTab } from "@zenku/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Pencil, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Props {
  entityName: string;
  entityId: string;
  onNavigate: (path: string) => void;
}

function formatValue(
  value: unknown,
  field: FieldMeta,
  t: (key: string) => string
): React.ReactNode {
  if (value === null || value === undefined)
    return <span className="text-muted-foreground">—</span>;

  if (field.isId)
    return <span className="font-mono text-xs text-muted-foreground">{String(value)}</span>;
  if (field.type === "Boolean")
    return (
      <Badge variant={value ? "default" : "secondary"}>
        {value ? t("common.yes") : t("common.no")}
      </Badge>
    );
  if (field.type === "DateTime")
    return new Date(value as string).toLocaleString();
  if (field.type === "Float" || field.type === "Decimal")
    return Number(value).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return (
      <span className="font-medium">
        {(obj.name as string) || (obj.email as string) || (obj.title as string) || (obj.id as string) || "—"}
      </span>
    );
  }
  return String(value);
}

export default function GenericEntityDetailPage({
  entityName,
  entityId,
  onNavigate,
}: Props) {
  const { t, i18n } = useTranslation();
  const { tEntityName, tEntityField } = useEntityTranslation();
  const meta = useModelMeta(entityName);
  const entityPath = entityName.charAt(0).toLowerCase() + entityName.slice(1);
  const { data, isLoading, error } = useEntityDetail(entityPath, entityId);
  const deleteMutation = useEntityDelete(entityPath);

  if (!meta || isLoading) {
    return (
      <div className="p-6 max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="pt-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-4 w-28 shrink-0" />
                <Skeleton className="h-4 w-full max-w-xs" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error)
    return (
      <div className="p-6 text-sm text-destructive">
        Error: {error.message}
      </div>
    );
  if (!data)
    return <div className="p-6 text-sm text-muted-foreground">{t("common.noRecords")}</div>;

  const fkFieldNames = meta.fields
    .filter((f) => f.isRelation && !f.isList)
    .map((f) => f.name + "Id");

  const visibleFields = meta.fields.filter((f) => !f.isList && !fkFieldNames.includes(f.name));

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(entityId);
      toast.success(t("toast.deleted", { entity: tEntityName(meta) }));
      onNavigate(`/${entityPath}`);
    } catch {
      toast.error(t("toast.deleteError", { entity: tEntityName(meta) }));
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <CardTitle className="text-2xl flex items-center gap-2">
            {tEntityName(meta)} {t("common.details")}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1 font-mono">
            {entityId}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate(`/${entityPath}`)}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </Button>
          <Button
            size="sm"
            onClick={() => onNavigate(`/${entityPath}/${entityId}/edit`)}
            className="gap-1.5"
          >
            <Pencil className="h-4 w-4" />
            {t("common.edit")}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="destructive"
                className="gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                {t("common.delete")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("detail.confirmDelete", { entity: tEntityName(meta) })}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("detail.confirmDeleteDesc")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleDelete}
                >
                  {t("common.delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("common.details")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <dl className="divide-y">
            {visibleFields.map((field) => (
              <div key={field.name} className="flex items-start px-6 py-3">
                <dt className="w-40 text-sm font-medium text-muted-foreground shrink-0 pt-0.5 capitalize">
                  {tEntityField(meta, field.name)}
                </dt>
                <dd className="text-sm flex-1">
                  {formatValue(data[field.name], field, t)}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {/* P12: Detail Tabs — related entity lists */}
      {meta.ui?.detail?.tabs?.map((tab, ti) => (
        <DetailTabPanel
          key={ti}
          tab={tab}
          parentId={entityId}
          parentEntity={entityName}
          language={i18n.language}
        />
      ))}
    </div>
  );
}

/** Renders a single detail tab showing related records */
function DetailTabPanel({
  tab,
  parentId,
  parentEntity,
  language,
}: {
  tab: DetailTab;
  parentId: string;
  parentEntity: string;
  language: string;
}) {
  const tabTitle = tab.i18n?.[language] ?? tab.i18n?.en ?? tab.title;

  // Find the related model by looking at the relation
  // The relation name maps to a field on the parent model with relationModel
  const parentMeta = useModelMeta(parentEntity);
  const relationField = parentMeta?.fields.find(
    (f) => f.name === tab.relation && f.isList && f.relationModel
  );

  if (!relationField?.relationModel) return null;

  const relatedModelName = relationField.relationModel;
  const relatedPath = relatedModelName.charAt(0).toLowerCase() + relatedModelName.slice(1);

  // Build filter to find related records (the FK on the child side)
  // Convention: child has parentEntity + "Id" or "orderId" etc.
  const fkFieldGuesses = [
    parentEntity.charAt(0).toLowerCase() + parentEntity.slice(1) + "Id",
    "orderId",
  ];

  return (
    <DetailTabTable
      title={tabTitle}
      relatedPath={relatedPath}
      relatedModelName={relatedModelName}
      parentId={parentId}
      columns={tab.columns}
      fkFieldGuesses={fkFieldGuesses}
    />
  );
}

function DetailTabTable({
  title,
  relatedPath,
  relatedModelName,
  parentId,
  columns,
  fkFieldGuesses,
}: {
  title: string;
  relatedPath: string;
  relatedModelName: string;
  parentId: string;
  columns: string[];
  fkFieldGuesses: string[];
}) {
  const { tEntityField } = useEntityTranslation();
  const relatedMeta = useModelMeta(relatedModelName);

  // Filter related records by FK
  const filterField = fkFieldGuesses[0];
  const { data } = useEntityList(relatedPath, {
    pageSize: 50,
    [filterField]: parentId,
  });

  const records = data?.data ?? [];

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {title} ({records.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {records.length === 0 ? (
          <div className="px-6 py-4 text-sm text-muted-foreground">—</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {columns.map((col) => (
                    <th key={col} className="text-left px-4 py-2 font-medium text-muted-foreground">
                      {relatedMeta ? tEntityField(relatedMeta, col) : col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {records.map((record: Record<string, unknown>, ri: number) => (
                  <tr key={ri}>
                    {columns.map((col) => {
                      const val = record[col];
                      // Handle relation objects
                      if (val && typeof val === "object" && "name" in (val as any)) {
                        return <td key={col} className="px-4 py-2">{(val as any).name}</td>;
                      }
                      if (val && typeof val === "object" && "code" in (val as any)) {
                        return <td key={col} className="px-4 py-2">{(val as any).code}</td>;
                      }
                      return (
                        <td key={col} className="px-4 py-2">
                          {val !== null && val !== undefined ? String(val) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

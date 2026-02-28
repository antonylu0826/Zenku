import { useTranslation } from "react-i18next";
import { useModelMeta } from "../hooks/useSchema";
import { useEntityDetail, useEntityDelete } from "../hooks/useEntity";
import type { FieldMeta } from "@zenku/core";
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

function formatValue(value: unknown, field: FieldMeta): React.ReactNode {
  if (value === null || value === undefined)
    return <span className="text-muted-foreground">—</span>;
  if (field.isId)
    return <span className="font-mono text-xs text-muted-foreground">{String(value)}</span>;
  if (field.type === "Boolean")
    return (
      <Badge variant={value ? "default" : "secondary"}>
        {value ? "Yes" : "No"}
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
        {(obj.name as string) || (obj.email as string) || (obj.id as string) || "—"}
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
  const { t } = useTranslation();
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
    return <div className="p-6 text-sm text-muted-foreground">Not found</div>;

  const visibleFields = meta.fields.filter((f) => !f.isList);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(entityId);
      toast.success(t("toast.deleted", { entity: entityName }));
      onNavigate(`/${entityPath}`);
    } catch {
      toast.error(t("toast.deleteError", { entity: entityName }));
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {entityName}
          </h2>
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
                <AlertDialogTitle>{t("detail.confirmDelete", { entity: entityName })}</AlertDialogTitle>
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
          <CardTitle className="text-base">Record Information</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <dl className="divide-y">
            {visibleFields.map((field) => (
              <div key={field.name} className="flex items-start px-6 py-3">
                <dt className="w-40 text-sm font-medium text-muted-foreground shrink-0 pt-0.5 capitalize">
                  {field.name}
                </dt>
                <dd className="text-sm flex-1">
                  {formatValue(data[field.name], field)}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

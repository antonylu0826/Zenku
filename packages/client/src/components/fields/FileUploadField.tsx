import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload, X, FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAccessToken } from "@/lib/api";

interface Attachment {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    url: string;
}

interface Props {
    entityModel?: string;
    entityId?: string;
    onUploaded?: (attachment: Attachment) => void;
    accept?: string;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileUploadField({ entityModel, entityId, onUploaded, accept }: Props) {
    const { t } = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploaded, setUploaded] = useState<Attachment | null>(null);
    const [error, setError] = useState<string | null>(null);

    const upload = async (file: File) => {
        setError(null);
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            if (entityModel) formData.append("entityModel", entityModel);
            if (entityId) formData.append("entityId", entityId);

            const token = getAccessToken();
            const res = await fetch("/api/upload", {
                method: "POST",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                credentials: "include",
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error((data as any)?.error?.message ?? t("toast.uploadError"));
            }

            const attachment = await res.json() as Attachment;
            setUploaded(attachment);
            onUploaded?.(attachment);
        } catch (err: any) {
            setError(err.message || t("toast.uploadError"));
        } finally {
            setIsUploading(false);
        }
    };

    const handleFiles = (files: FileList | null) => {
        if (!files || files.length === 0) return;
        upload(files[0]);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFiles(e.dataTransfer.files);
    };

    const clear = () => {
        setUploaded(null);
        setError(null);
        if (inputRef.current) inputRef.current.value = "";
    };

    if (uploaded) {
        const isImage = uploaded.mimeType.startsWith("image/");
        return (
            <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/40">
                {isImage ? (
                    <img
                        src={uploaded.url}
                        alt={uploaded.filename}
                        className="h-12 w-12 rounded object-cover shrink-0"
                    />
                ) : (
                    <FileIcon className="h-8 w-8 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{uploaded.filename}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(uploaded.size)}</p>
                </div>
                <button
                    type="button"
                    onClick={clear}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                    aria-label="Remove"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        );
    }

    return (
        <div>
            <div
                className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors",
                    isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50",
                    isUploading && "pointer-events-none opacity-60",
                )}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
            >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div>
                    <p className="text-sm font-medium">
                        {isUploading ? t("upload.uploading") : t("upload.dragDrop")}
                    </p>
                    <p className="text-xs text-muted-foreground">{t("upload.maxSize")}</p>
                </div>
            </div>
            <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept={accept}
                onChange={(e) => handleFiles(e.target.files)}
            />
            {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
    );
}

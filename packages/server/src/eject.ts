#!/usr/bin/env bun
/**
 * Zenku Eject CLI
 * Usage: bun run packages/server/src/eject.ts [ModelName]
 *
 * Generates standalone React page components for the given model
 * (or all ejectable models if none specified) into:
 *   packages/client/src/pages/ejected/
 */

import { Prisma } from "@prisma/client";
import { join } from "path";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import type { UiConfig } from "@zenku/core";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EXCLUDED_MODELS = ["User", "RefreshToken"];

const dmmf = Prisma.dmmf;
const models = dmmf.datamodel.models.filter(
    (m) => !EXCLUDED_MODELS.includes(m.name),
);

async function loadUiConfig(modelName: string): Promise<UiConfig | undefined> {
    try {
        const schemaDir = join(import.meta.dir, "..", "schema");
        const mod = await import(`${schemaDir}/${modelName}.ui.ts`);
        return mod.default as UiConfig;
    } catch {
        return undefined;
    }
}

function entityPath(modelName: string): string {
    return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

const OUT_DIR = join(
    import.meta.dir,
    "..",
    "..",
    "..",
    "packages",
    "client",
    "src",
    "pages",
    "ejected",
);

// ─── Templates ────────────────────────────────────────────────────────────────

function listTemplate(modelName: string, ui: UiConfig | undefined): string {
    const label = ui?.label ?? `${modelName}s`;
    const path = entityPath(modelName);
    return `import GenericEntityListPage from "../GenericEntityListPage";

export default function ${modelName}ListPage() {
    return (
        <GenericEntityListPage
            entityName="${modelName}"
            onNavigate={(path) => (window.location.href = path)}
        />
    );
}
// Ejected from Zenku — model: ${modelName} (${label})
// You can now customise this component independently.
`;
}

function formTemplate(modelName: string, ui: UiConfig | undefined): string {
    const label = ui?.label ?? `${modelName}s`;
    const path = entityPath(modelName);
    return `import GenericEntityFormPage from "../GenericEntityFormPage";

export default function ${modelName}FormPage() {
    const id = new URLSearchParams(window.location.search).get("id") ?? undefined;
    return (
        <GenericEntityFormPage
            entityName="${modelName}"
            id={id}
            onNavigate={(path) => (window.location.href = path)}
        />
    );
}
// Ejected from Zenku — model: ${modelName} (${label})
// You can now customise this component independently.
`;
}

function detailTemplate(modelName: string, ui: UiConfig | undefined): string {
    const label = ui?.label ?? `${modelName}s`;
    const path = entityPath(modelName);
    return `import GenericEntityDetailPage from "../GenericEntityDetailPage";

export default function ${modelName}DetailPage() {
    const id = new URLSearchParams(window.location.search).get("id") ?? "";
    return (
        <GenericEntityDetailPage
            entityName="${modelName}"
            id={id}
            onNavigate={(path) => (window.location.href = path)}
        />
    );
}
// Ejected from Zenku — model: ${modelName} (${label})
// You can now customise this component independently.
`;
}

function kanbanTemplate(modelName: string, ui: UiConfig): string {
    const kanban = ui.kanban!;
    const path = entityPath(modelName);
    return `import KanbanView from "@/components/renderers/KanbanView";
import { useEntityList, useEntityUpdate } from "@/hooks/useEntity";
import { toast } from "sonner";

const KANBAN_CONFIG = ${JSON.stringify(kanban, null, 4)};

export default function ${modelName}KanbanPage() {
    const { data, isLoading } = useEntityList("${path}", { page: 1, pageSize: 500 });
    const updateMutation = useEntityUpdate("${path}");

    return (
        <div className="p-6 space-y-4">
            <h2 className="text-2xl font-semibold">${ui.label ?? modelName}</h2>
            <KanbanView
                rows={data?.data ?? []}
                kanbanConfig={KANBAN_CONFIG}
                entityPath="${path}"
                onNavigate={(path) => (window.location.href = path)}
                isLoading={isLoading}
                onUpdate={(id, newStatus) =>
                    updateMutation.mutate(
                        { id, data: { ${kanban.statusField}: newStatus } },
                        {
                            onSuccess: () => toast.success("Status updated"),
                            onError: () => toast.error("Failed to update status"),
                        },
                    )
                }
            />
        </div>
    );
}
// Ejected from Zenku — model: ${modelName} (Kanban view)
// You can now customise this component independently.
`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function ejectModel(modelName: string) {
    const model = models.find((m) => m.name === modelName);
    if (!model) {
        console.error(`❌ Model "${modelName}" not found. Available: ${models.map((m) => m.name).join(", ")}`);
        process.exit(1);
    }

    const ui = await loadUiConfig(modelName);
    const outDir = join(OUT_DIR, modelName);
    mkdirSync(outDir, { recursive: true });

    const files: [string, string][] = [
        [`${modelName}ListPage.tsx`, listTemplate(modelName, ui)],
        [`${modelName}FormPage.tsx`, formTemplate(modelName, ui)],
        [`${modelName}DetailPage.tsx`, detailTemplate(modelName, ui)],
    ];

    if (ui?.kanban) {
        files.push([`${modelName}KanbanPage.tsx`, kanbanTemplate(modelName, ui)]);
    }

    for (const [filename, content] of files) {
        const filepath = join(outDir, filename);
        writeFileSync(filepath, content, "utf8");
        console.log(`  ✔ ${filepath.replace(process.cwd(), ".")}`);
    }
}

async function main() {
    const args = process.argv.slice(2);

    if (!existsSync(OUT_DIR)) {
        mkdirSync(OUT_DIR, { recursive: true });
    }

    if (args.length === 0) {
        // Eject all models
        console.log(`🚀 Ejecting all models into packages/client/src/pages/ejected/\n`);
        for (const model of models) {
            console.log(`📦 ${model.name}`);
            await ejectModel(model.name);
        }
    } else {
        const modelName = args[0];
        console.log(`🚀 Ejecting ${modelName}...\n`);
        await ejectModel(modelName);
    }

    console.log(`\n✅ Eject complete. Edit the files in packages/client/src/pages/ejected/ to customise.`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});

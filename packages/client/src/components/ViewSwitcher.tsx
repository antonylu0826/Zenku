import { Table2, Columns, CalendarDays, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export type ViewMode = "list" | "kanban" | "calendar" | "tree";

interface Props {
    available: ViewMode[];
    current: ViewMode;
    onChange: (mode: ViewMode) => void;
}

const ICONS: Record<ViewMode, React.ElementType> = {
    list: Table2,
    kanban: Columns,
    calendar: CalendarDays,
    tree: GitBranch,
};

export default function ViewSwitcher({ available, current, onChange }: Props) {
    const { t } = useTranslation();
    if (available.length <= 1) return null;
    return (
        <div className="flex gap-0.5 border rounded-md p-0.5 bg-muted/30">
            {available.map((mode) => {
                const Icon = ICONS[mode];
                return (
                    <Button
                        key={mode}
                        variant={current === mode ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => onChange(mode)}
                        className="gap-1.5 h-7 px-2"
                    >
                        <Icon className="h-3.5 w-3.5" />
                        {t(`list.view.${mode}`)}
                    </Button>
                );
            })}
        </div>
    );
}

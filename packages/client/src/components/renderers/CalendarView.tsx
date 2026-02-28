import { useMemo } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Skeleton } from "@/components/ui/skeleton";

interface CalendarConfig {
    dateField: string;
    titleField: string;
    endDateField?: string;
}

interface Props {
    rows: Record<string, unknown>[];
    calendarConfig: CalendarConfig;
    onNavigate: (path: string) => void;
    entityPath: string;
    isLoading: boolean;
}

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { locale: enUS }),
    getDay,
    locales: { "en-US": enUS },
});

interface CalEvent {
    id: unknown;
    title: string;
    start: Date;
    end: Date;
    allDay?: boolean;
}

export default function CalendarView({ rows, calendarConfig, onNavigate, entityPath, isLoading }: Props) {
    const events = useMemo<CalEvent[]>(() => {
        return rows.map((row) => {
            const start = new Date(row[calendarConfig.dateField] as string);
            const end =
                calendarConfig.endDateField && row[calendarConfig.endDateField]
                    ? new Date(row[calendarConfig.endDateField] as string)
                    : start;
            return {
                id: row.id,
                title: String(row[calendarConfig.titleField] ?? ""),
                start,
                end,
                allDay: Boolean(row.allDay),
            };
        });
    }, [rows, calendarConfig]);

    if (isLoading) {
        return (
            <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-[500px] w-full rounded-lg" />
            </div>
        );
    }

    return (
        <div className="h-[600px] [&_.rbc-calendar]:font-sans [&_.rbc-event]:bg-primary [&_.rbc-event]:border-primary [&_.rbc-today]:bg-primary/5 [&_.rbc-selected]:bg-primary/80 [&_.rbc-btn-group_button]:text-sm [&_.rbc-toolbar-label]:font-semibold">
            <Calendar
                localizer={localizer}
                events={events}
                defaultView="month"
                views={["month", "week", "day"]}
                selectable
                onSelectEvent={(event: CalEvent) => {
                    onNavigate(`/${entityPath}/${event.id}`);
                }}
                onSelectSlot={() => {
                    onNavigate(`/${entityPath}/new`);
                }}
                style={{ height: "100%" }}
            />
        </div>
    );
}

import { useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS, zhTW } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

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

const locales = {
    "en-US": enUS,
    "zh-TW": zhTW,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { locale: locales["zh-TW"] }), // Default, will change dynamically inside component if needed or we rely on culture
    getDay,
    locales,
});

export default function CalendarView({ rows, calendarConfig, onNavigate, entityPath, isLoading }: Props) {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language === "zh-TW" ? "zh-TW" : "en-US";

    const [date, setDate] = useState(new Date());
    const [view, setView] = useState<View>("month");

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

    const messages = useMemo(() => ({
        today: t("calendar.today"),
        previous: t("calendar.previous"),
        next: t("calendar.next"),
        month: t("calendar.month"),
        week: t("calendar.week"),
        day: t("calendar.day"),
        agenda: t("calendar.agenda"),
        date: t("calendar.date"),
        time: t("calendar.time"),
        event: t("calendar.event"),
        noEventsInRange: t("calendar.noEventsInRange"),
    }), [t]);

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
                view={view}
                views={["month", "week", "day"]}
                date={date}
                onView={(newView) => setView(newView)}
                onNavigate={(newDate) => setDate(newDate)}
                culture={currentLang}
                messages={messages}
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

interface CalEvent {
    id: unknown;
    title: string;
    start: Date;
    end: Date;
    allDay?: boolean;
}

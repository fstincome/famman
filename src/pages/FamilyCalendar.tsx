import { useState, useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Heart, Rocket, CreditCard, PartyPopper } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, getDay, isToday } from "date-fns";
import { fr, enUS } from "date-fns/locale";

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: "event" | "debt" | "project" | "health";
  color: string;
  detail?: string;
}

const formatBIF = (n: number) => n.toLocaleString("fr-BI") + " BIF";

const FamilyCalendar = () => {
  const { t, language } = useLanguage();
  const locale = language === "fr" ? fr : enUS;
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["calendar-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("company_id").eq("user_id", user.id).single();
      return data;
    },
  });

  const companyId = profile?.company_id;

  const { data: events = [] } = useQuery({
    queryKey: ["calendar-events", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("family_events").select("*").eq("company_id", companyId);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: debts = [] } = useQuery({
    queryKey: ["calendar-debts", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("family_debts").select("*").eq("company_id", companyId).not("due_date", "is", null);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["calendar-projects", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("family_projects").select("*").eq("company_id", companyId).not("deadline", "is", null);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: healthRecords = [] } = useQuery({
    queryKey: ["calendar-health", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("family_health").select("*").eq("company_id", companyId);
      return data || [];
    },
    enabled: !!companyId,
  });

  const calendarEvents: CalendarEvent[] = useMemo(() => {
    const items: CalendarEvent[] = [];

    events.forEach(e => {
      items.push({ id: e.id, title: e.title, date: new Date(e.start_date), type: "event", color: "bg-blue-500", detail: e.location || undefined });
      if (e.end_date && e.end_date !== e.start_date) {
        items.push({ id: e.id + "-end", title: `${e.title} (${language === "fr" ? "fin" : "end"})`, date: new Date(e.end_date), type: "event", color: "bg-blue-400" });
      }
    });

    debts.forEach(d => {
      if (d.due_date) {
        items.push({ id: d.id, title: d.name, date: new Date(d.due_date), type: "debt", color: "bg-red-500", detail: formatBIF(Number(d.remaining_balance)) });
      }
    });

    projects.forEach(p => {
      if (p.deadline) {
        items.push({ id: p.id, title: p.name, date: new Date(p.deadline), type: "project", color: "bg-purple-500", detail: `${p.progress || 0}%` });
      }
    });

    healthRecords.forEach(h => {
      items.push({ id: h.id, title: h.title, date: new Date(h.date), type: "health", color: "bg-green-500", detail: h.person_name || undefined });
    });

    return items;
  }, [events, debts, projects, healthRecords, language]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start (Monday = 0)
  const startDayOfWeek = (getDay(monthStart) + 6) % 7;
  const paddingDays = Array.from({ length: startDayOfWeek }, (_, i) => i);

  const getEventsForDay = (day: Date) => calendarEvents.filter(e => isSameDay(e.date, day));

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  const typeIcon = (type: string) => {
    switch (type) {
      case "event": return <PartyPopper className="w-4 h-4" />;
      case "debt": return <CreditCard className="w-4 h-4" />;
      case "project": return <Rocket className="w-4 h-4" />;
      case "health": return <Heart className="w-4 h-4" />;
      default: return <CalendarIcon className="w-4 h-4" />;
    }
  };

  const typeLabel = (type: string) => {
    const labels: Record<string, Record<string, string>> = {
      fr: { event: "Événement", debt: "Échéance dette", project: "Deadline projet", health: "Santé" },
      en: { event: "Event", debt: "Debt due", project: "Project deadline", health: "Health" },
    };
    return labels[language]?.[type] || type;
  };

  const weekDays = language === "fr"
    ? ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const upcomingEvents = calendarEvents
    .filter(e => e.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 8);

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t.calendar.title}</h1>
        <p className="text-muted-foreground">{t.calendar.subtitle}</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        <Badge variant="outline" className="gap-1"><div className="w-3 h-3 rounded-full bg-blue-500" />{t.calendar.events}</Badge>
        <Badge variant="outline" className="gap-1"><div className="w-3 h-3 rounded-full bg-red-500" />{t.calendar.debtDue}</Badge>
        <Badge variant="outline" className="gap-1"><div className="w-3 h-3 rounded-full bg-purple-500" />{t.calendar.projectDeadline}</Badge>
        <Badge variant="outline" className="gap-1"><div className="w-3 h-3 rounded-full bg-green-500" />{t.calendar.healthAppt}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="w-5 h-5" /></Button>
            <CardTitle className="text-lg capitalize">{format(currentMonth, "MMMM yyyy", { locale })}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="w-5 h-5" /></Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
              ))}
              {paddingDays.map(i => <div key={`pad-${i}`} />)}
              {daysInMonth.map(day => {
                const dayEvents = getEventsForDay(day);
                const selected = selectedDate && isSameDay(day, selectedDate);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`relative p-1 min-h-[56px] rounded-lg text-sm transition-colors
                      ${isToday(day) ? "ring-2 ring-primary" : ""}
                      ${selected ? "bg-primary/10" : "hover:bg-muted"}
                      ${!isSameMonth(day, currentMonth) ? "text-muted-foreground/40" : ""}
                    `}
                  >
                    <span className={`block text-xs font-medium ${isToday(day) ? "text-primary font-bold" : ""}`}>
                      {format(day, "d")}
                    </span>
                    <div className="flex flex-wrap gap-0.5 mt-0.5 justify-center">
                      {dayEvents.slice(0, 3).map(e => (
                        <div key={e.id} className={`w-2 h-2 rounded-full ${e.color}`} />
                      ))}
                      {dayEvents.length > 3 && <span className="text-[9px] text-muted-foreground">+{dayEvents.length - 3}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Selected day */}
          {selectedDate && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{format(selectedDate, "EEEE d MMMM yyyy", { locale })}</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDayEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t.calendar.noEvents}</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayEvents.map(e => (
                      <div key={e.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted">
                        <div className={`w-2 h-2 mt-1.5 rounded-full ${e.color} flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{e.title}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {typeIcon(e.type)}
                            <span>{typeLabel(e.type)}</span>
                          </div>
                          {e.detail && <p className="text-xs text-muted-foreground">{e.detail}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Upcoming */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t.calendar.upcoming}</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.calendar.noUpcoming}</p>
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.map(e => (
                    <div key={e.id} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                      <div className={`w-2 h-2 rounded-full ${e.color} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{e.title}</p>
                        <p className="text-[10px] text-muted-foreground">{format(e.date, "d MMM", { locale })}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] px-1.5">{typeLabel(e.type)}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FamilyCalendar;

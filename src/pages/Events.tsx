import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, MapPin, Trash2 } from "lucide-react";
import { format, isPast, isToday, isFuture } from "date-fns";

const EVENT_TYPES = ["birthday", "holiday", "celebration", "appointment", "reminder", "other"] as const;

export default function Events() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", event_type: "other", description: "", start_date: "", end_date: "", location: "", budget: "" });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["family-events"],
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", (await supabase.auth.getUser()).data.user!.id).single();
      if (!profile?.company_id) return [];
      const { data, error } = await supabase.from("family_events").select("*").eq("company_id", profile.company_id).order("start_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (event: typeof form) => {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", (await supabase.auth.getUser()).data.user!.id).single();
      if (!profile?.company_id) throw new Error("No company");
      const { error } = await supabase.from("family_events").insert({
        company_id: profile.company_id,
        title: event.title,
        event_type: event.event_type,
        description: event.description || null,
        start_date: event.start_date,
        end_date: event.end_date || null,
        location: event.location || null,
        budget: parseFloat(event.budget) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-events"] });
      setOpen(false);
      setForm({ title: "", event_type: "other", description: "", start_date: "", end_date: "", location: "", budget: "" });
      toast({ title: t.common.save, description: "✓" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("family_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["family-events"] }),
  });

  const eventTypeLabels: Record<string, string> = {
    birthday: t.events.birthday,
    holiday: t.events.holiday,
    celebration: t.events.celebration,
    appointment: t.events.appointment,
    reminder: t.events.reminder,
    other: t.income.other,
  };

  const upcomingEvents = events.filter(e => isFuture(new Date(e.start_date)) || isToday(new Date(e.start_date)));
  const pastEvents = events.filter(e => isPast(new Date(e.start_date)) && !isToday(new Date(e.start_date)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t.events.title}</h1>
          <p className="text-muted-foreground">{t.events.subtitle}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />{t.events.addEvent}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.events.addEvent}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder={t.common.name} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              <Select value={form.event_type} onValueChange={v => setForm({ ...form, event_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(type => <SelectItem key={type} value={type}>{eventTypeLabels[type]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder={t.common.description} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm text-muted-foreground">{t.events.startDate}</label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><label className="text-sm text-muted-foreground">{t.events.endDate}</label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
              </div>
              <Input placeholder={t.events.location} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              <Input type="number" placeholder={t.events.budget} value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} />
              <Button className="w-full" onClick={() => addMutation.mutate(form)} disabled={!form.title || !form.start_date || addMutation.isPending}>
                {t.common.save}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t.events.upcoming}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{upcomingEvents.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t.events.today}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{events.filter(e => isToday(new Date(e.start_date))).length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t.events.past}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{pastEvents.length}</p></CardContent></Card>
      </div>

      {/* Events list */}
      <div className="space-y-3">
        {isLoading ? (
          <Card><CardContent className="py-8 text-center">{t.common.loading}</CardContent></Card>
        ) : events.length === 0 ? (
          <Card><CardContent className="py-8 text-center">{t.common.noData}</CardContent></Card>
        ) : events.map(event => (
          <Card key={event.id} className={isPast(new Date(event.start_date)) && !isToday(new Date(event.start_date)) ? "opacity-60" : ""}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">{event.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{format(new Date(event.start_date), "dd/MM/yyyy")}</span>
                    {event.location && <><MapPin className="w-3 h-3" /><span>{event.location}</span></>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{eventTypeLabels[event.event_type] || event.event_type}</Badge>
                {Number(event.budget) > 0 && <span className="text-sm font-medium">${Number(event.budget).toLocaleString()}</span>}
                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(event.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

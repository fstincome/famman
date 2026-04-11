import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Plus, Pill, Stethoscope, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logAndNotify } from "@/hooks/useActivityLogger";

const formatBIF = (amount: number) => `${Math.round(amount).toLocaleString('fr-FR')} BIF`;

export default function Health() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", health_type: "medication", person_name: "", amount: "",
    priority: "medium", pharmacy: "", description: "", date: new Date().toISOString().split("T")[0],
  });

  const { data: records, isLoading } = useQuery({
    queryKey: ["health-records"],
    queryFn: async () => {
      const { data: cid } = await supabase.rpc("get_user_company_id");
      if (!cid) return [];
      const { data } = await supabase.from("family_health").select("*").eq("company_id", cid).order("date", { ascending: false });
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data: cid } = await supabase.rpc("get_user_company_id");
      if (!cid) throw new Error("No company");
      const { error } = await supabase.from("family_health").insert({
        company_id: cid, title: form.title, health_type: form.health_type,
        person_name: form.person_name || null, amount: Number(form.amount) || 0,
        priority: form.priority, pharmacy: form.pharmacy || null,
        description: form.description || null, date: form.date,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["health-records"] });
      queryClient.invalidateQueries({ queryKey: ["stats-health"] });
      logAndNotify(
        { action: "create", entity_type: "health", entity_name: form.title, details: { type: form.health_type, person: form.person_name } },
        { title: "💊 Santé ajoutée", message: `${form.title}${form.person_name ? ` (${form.person_name})` : ""}`, type: "info" }
      );
      setOpen(false);
      setForm({ title: "", health_type: "medication", person_name: "", amount: "", priority: "medium", pharmacy: "", description: "", date: new Date().toISOString().split("T")[0] });
      toast({ title: t.health.added });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("family_health").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (_data, id) => {
      const record = (records || []).find(r => r.id === id);
      queryClient.invalidateQueries({ queryKey: ["health-records"] });
      queryClient.invalidateQueries({ queryKey: ["stats-health"] });
      logAndNotify(
        { action: "delete", entity_type: "health", entity_id: id, entity_name: record?.title },
        { title: "🗑️ Santé supprimée", message: record?.title || "Entrée supprimée", type: "warning" }
      );
    },
  });

  const markTreated = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("family_health").update({ status: "treated" }).eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (_data, id) => {
      const record = (records || []).find(r => r.id === id);
      queryClient.invalidateQueries({ queryKey: ["health-records"] });
      queryClient.invalidateQueries({ queryKey: ["stats-health"] });
      logAndNotify(
        { action: "update", entity_type: "health", entity_id: id, entity_name: record?.title, details: { status: "treated" } },
        { title: "✅ Traitement terminé", message: record?.title || "Traitement marqué comme terminé", type: "success" }
      );
    },
  });

  const totalCost = (records || []).reduce((s, r) => s + Number(r.amount), 0);
  const ongoingCost = (records || []).filter(r => r.status === "ongoing").reduce((s, r) => s + Number(r.amount), 0);
  const treatedCount = (records || []).filter(r => r.status === "treated").length;

  const priorityLabel: Record<string, string> = { urgent: t.health.urgent, high: t.health.high, medium: t.health.medium, low: t.health.low };
  const typeLabel: Record<string, string> = { medication: t.health.medication, illness: t.health.illness, consultation: t.health.consultation, other: t.common.type };
  const priorityColor: Record<string, string> = { urgent: "text-red-600 bg-red-50", high: "text-orange-600 bg-orange-50", medium: "text-amber-600 bg-amber-50", low: "text-green-600 bg-green-50" };
  const typeIcon: Record<string, any> = { medication: Pill, illness: Heart, consultation: Stethoscope, other: AlertTriangle };

  if (isLoading) return <div className="flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">{t.common.loading}</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Heart className="w-6 h-6 text-red-500" />{t.health.title}</h1>
          <p className="text-muted-foreground">{t.health.subtitle}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />{t.health.addRecord}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{t.health.addRecord}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>{t.health.recordName}</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div><Label>{t.common.type}</Label>
                <Select value={form.health_type} onValueChange={v => setForm(f => ({ ...f, health_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medication">{t.health.medication}</SelectItem>
                    <SelectItem value="illness">{t.health.illness}</SelectItem>
                    <SelectItem value="consultation">{t.health.consultation}</SelectItem>
                    <SelectItem value="other">{t.common.type}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{t.health.person}</Label><Input value={form.person_name} onChange={e => setForm(f => ({ ...f, person_name: e.target.value }))} /></div>
              <div><Label>{t.common.amount} (BIF)</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <div><Label>{t.health.priority}</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">{t.health.urgent}</SelectItem>
                    <SelectItem value="high">{t.health.high}</SelectItem>
                    <SelectItem value="medium">{t.health.medium}</SelectItem>
                    <SelectItem value="low">{t.health.low}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{t.health.pharmacy}</Label><Input value={form.pharmacy} onChange={e => setForm(f => ({ ...f, pharmacy: e.target.value }))} /></div>
              <div><Label>{t.common.date}</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
              <div><Label>{t.common.description}</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => addMutation.mutate()} disabled={!form.title || addMutation.isPending}>{t.common.save}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t.health.totalCost}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatBIF(totalCost)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t.health.ongoingCost}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{formatBIF(ongoingCost)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t.health.treatedCount}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{treatedCount}</p></CardContent></Card>
      </div>

      {/* Records */}
      <div className="space-y-3">
        {(records || []).length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">{t.common.noData}</Card>
        ) : (records || []).map(r => {
          const Icon = typeIcon[r.health_type] || Heart;
          return (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2 rounded-lg ${priorityColor[r.priority] || "bg-muted"}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{r.title}</span>
                      <Badge variant="outline" className="text-xs">{typeLabel[r.health_type] || r.health_type}</Badge>
                      <Badge className={`text-xs ${priorityColor[r.priority]}`}>{priorityLabel[r.priority] || r.priority}</Badge>
                      {r.status === "treated" && <Badge className="bg-green-100 text-green-700 text-xs">{t.health.treated}</Badge>}
                    </div>
                    {r.person_name && <p className="text-sm text-muted-foreground">{t.health.person}: {r.person_name}</p>}
                    {r.pharmacy && <p className="text-sm text-muted-foreground">{t.health.pharmacy}: {r.pharmacy}</p>}
                    {r.description && <p className="text-sm text-muted-foreground mt-1">{r.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{r.date}</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <span className="font-bold text-lg">{formatBIF(Number(r.amount))}</span>
                  <div className="flex gap-1">
                    {r.status === "ongoing" && (
                      <Button size="sm" variant="outline" className="text-green-600" onClick={() => markTreated.mutate(r.id)}>{t.health.markTreated}</Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(r.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

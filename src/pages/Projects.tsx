import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function Projects() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", status: "not_started", priority: "medium", budget: "", deadline: "" });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["family-projects"],
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", (await supabase.auth.getUser()).data.user!.id).single();
      if (!profile?.company_id) return [];
      const { data, error } = await supabase.from("family_projects").select("*").eq("company_id", profile.company_id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (project: typeof form) => {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", (await supabase.auth.getUser()).data.user!.id).single();
      if (!profile?.company_id) throw new Error("No company");
      const { error } = await supabase.from("family_projects").insert({
        company_id: profile.company_id,
        name: project.name,
        description: project.description || null,
        status: project.status,
        priority: project.priority,
        budget: parseFloat(project.budget) || 0,
        deadline: project.deadline || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-projects"] });
      setOpen(false);
      setForm({ name: "", description: "", status: "not_started", priority: "medium", budget: "", deadline: "" });
      toast({ title: t.common.save, description: "✓" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("family_projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["family-projects"] }),
  });

  const statusLabels: Record<string, string> = {
    not_started: t.projects.notStarted,
    in_progress: t.projects.inProgress,
    completed: t.projects.completed,
    on_hold: t.projects.onHold,
  };

  const priorityLabels: Record<string, string> = {
    high: t.projects.high,
    medium: t.projects.medium,
    low: t.projects.low,
  };

  const statusColors: Record<string, string> = {
    not_started: "secondary",
    in_progress: "default",
    completed: "outline",
    on_hold: "destructive",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t.projects.title}</h1>
          <p className="text-muted-foreground">{t.projects.subtitle}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />{t.projects.addProject}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.projects.addProject}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder={t.common.name} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <Textarea placeholder={t.common.description} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Input type="number" placeholder={t.projects.budget} value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} />
              <div><label className="text-sm text-muted-foreground">{t.projects.deadline}</label><Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} /></div>
              <Button className="w-full" onClick={() => addMutation.mutate(form)} disabled={!form.name || addMutation.isPending}>{t.common.save}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <Card className="col-span-full"><CardContent className="py-8 text-center">{t.common.loading}</CardContent></Card>
        ) : projects.length === 0 ? (
          <Card className="col-span-full"><CardContent className="py-8 text-center">{t.common.noData}</CardContent></Card>
        ) : projects.map(project => (
          <Card key={project.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(project.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Badge variant={statusColors[project.status] as any}>{statusLabels[project.status] || project.status}</Badge>
                <Badge variant="outline">{priorityLabels[project.priority] || project.priority}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>{t.projects.progress}</span>
                  <span>{project.progress}%</span>
                </div>
                <Progress value={project.progress || 0} />
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{t.projects.budget}: ${Number(project.budget).toLocaleString()}</span>
                {project.deadline && <span>{t.projects.deadline}: {format(new Date(project.deadline), "dd/MM/yyyy")}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

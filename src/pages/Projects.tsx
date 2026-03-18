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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, PauseCircle, PlayCircle, ChevronDown, ChevronUp, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { format, isPast, isAfter, isBefore, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

const formatBIF = (n: number) => n.toLocaleString("fr-BI") + " BIF";

const DEFAULT_TASKS = [
  "Définir les objectifs et le périmètre",
  "Établir le budget détaillé",
  "Planifier les étapes clés",
  "Identifier les ressources nécessaires",
  "Valider le plan avec la famille",
];

type ProjectTask = {
  id: string;
  project_id: string;
  company_id: string;
  task_name: string;
  task_order: number;
  is_completed: boolean;
  completed_at: string | null;
};

function getComputedStatus(project: any, tasks: ProjectTask[]): { status: string; label: string; color: string } {
  if (project.status === "suspended") {
    return { status: "suspended", label: "Suspendu", color: "bg-yellow-500 text-white" };
  }

  const allDone = tasks.length > 0 && tasks.every(t => t.is_completed);
  if (allDone) {
    return { status: "completed", label: "Terminé", color: "bg-green-600 text-white" };
  }

  const today = new Date();
  const deadline = project.deadline ? new Date(project.deadline) : null;
  const startDate = project.start_date ? new Date(project.start_date) : null;

  if (deadline && isPast(deadline) && !allDone) {
    return { status: "late", label: "En retard", color: "bg-destructive text-white" };
  }

  const someDone = tasks.some(t => t.is_completed);
  if (someDone) {
    // Check if we're past 75% of timeline but less than 50% tasks done
    if (startDate && deadline) {
      const totalDays = differenceInDays(deadline, startDate);
      const elapsed = differenceInDays(today, startDate);
      const completedCount = tasks.filter(t => t.is_completed).length;
      const taskPercent = completedCount / tasks.length;
      const timePercent = totalDays > 0 ? elapsed / totalDays : 0;
      if (timePercent > 0.75 && taskPercent < 0.5) {
        return { status: "at_risk", label: "À risque", color: "bg-orange-500 text-white" };
      }
    }
    return { status: "in_progress", label: "En cours", color: "bg-primary text-primary-foreground" };
  }

  if (startDate && isBefore(today, startDate)) {
    return { status: "not_started", label: "Planifié", color: "bg-muted text-muted-foreground" };
  }

  if (startDate && isAfter(today, startDate)) {
    return { status: "in_progress", label: "En cours", color: "bg-primary text-primary-foreground" };
  }

  return { status: "not_started", label: "Non démarré", color: "bg-muted text-muted-foreground" };
}

export default function Projects() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", priority: "medium", budget: "", start_date: "", deadline: "" });

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

  const { data: allTasks = [] } = useQuery({
    queryKey: ["project-tasks"],
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", (await supabase.auth.getUser()).data.user!.id).single();
      if (!profile?.company_id) return [];
      const { data, error } = await supabase.from("project_tasks").select("*").eq("company_id", profile.company_id).order("task_order", { ascending: true });
      if (error) throw error;
      return data as ProjectTask[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (project: typeof form) => {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", (await supabase.auth.getUser()).data.user!.id).single();
      if (!profile?.company_id) throw new Error("No company");

      // Create project
      const { data: newProject, error } = await supabase.from("family_projects").insert({
        company_id: profile.company_id,
        name: project.name,
        description: project.description || null,
        status: "not_started",
        priority: project.priority,
        budget: parseFloat(project.budget) || 0,
        start_date: project.start_date || null,
        deadline: project.deadline || null,
        currency: "BIF",
        progress: 0,
      }).select().single();
      if (error) throw error;

      // Create 5 default tasks
      const tasks = DEFAULT_TASKS.map((name, i) => ({
        project_id: newProject.id,
        company_id: profile.company_id,
        task_name: name,
        task_order: i + 1,
        is_completed: false,
      }));
      const { error: taskError } = await supabase.from("project_tasks").insert(tasks);
      if (taskError) throw taskError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      setOpen(false);
      setForm({ name: "", description: "", priority: "medium", budget: "", start_date: "", deadline: "" });
      toast({ title: "✓", description: "Projet créé avec 5 tâches initiales" });
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed, projectId, totalTasks, completedCount }: { taskId: string; completed: boolean; projectId: string; totalTasks: number; completedCount: number }) => {
      const { error } = await supabase.from("project_tasks").update({
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
      }).eq("id", taskId);
      if (error) throw error;

      // Update project progress
      const newCompleted = completed ? completedCount + 1 : completedCount - 1;
      const progress = Math.round((newCompleted / totalTasks) * 100);
      const status = newCompleted === totalTasks ? "completed" : "in_progress";
      await supabase.from("family_projects").update({ progress, status }).eq("id", projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === "suspended" ? "in_progress" : "suspended";
      const { error } = await supabase.from("family_projects").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-projects"] });
      toast({ title: "✓", description: "Statut mis à jour" });
    },
  });

  const priorityLabels: Record<string, string> = {
    high: t.projects.high,
    medium: t.projects.medium,
    low: t.projects.low,
  };

  const getTasksForProject = (projectId: string) => allTasks.filter(t => t.project_id === projectId);

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
              <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue placeholder="Priorité" /></SelectTrigger>
                <SelectContent>{Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" placeholder="Budget (BIF)" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm text-muted-foreground">Date début</label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><label className="text-sm text-muted-foreground">Date fin</label><Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} /></div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">5 tâches initiales seront créées :</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  {DEFAULT_TASKS.map((task, i) => <li key={i}>{task}</li>)}
                </ol>
              </div>
              <Button className="w-full" onClick={() => addMutation.mutate(form)} disabled={!form.name || addMutation.isPending}>{t.common.save}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{projects.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">En cours</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-primary">{projects.filter(p => {
          const tasks = getTasksForProject(p.id);
          const s = getComputedStatus(p, tasks);
          return s.status === "in_progress";
        }).length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">En retard</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-destructive">{projects.filter(p => {
          const tasks = getTasksForProject(p.id);
          const s = getComputedStatus(p, tasks);
          return s.status === "late" || s.status === "at_risk";
        }).length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Terminés</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{projects.filter(p => {
          const tasks = getTasksForProject(p.id);
          const s = getComputedStatus(p, tasks);
          return s.status === "completed";
        }).length}</p></CardContent></Card>
      </div>

      {/* Project Cards */}
      <div className="space-y-4">
        {isLoading ? (
          <Card><CardContent className="py-8 text-center">{t.common.loading}</CardContent></Card>
        ) : projects.length === 0 ? (
          <Card><CardContent className="py-8 text-center">{t.common.noData}</CardContent></Card>
        ) : projects.map(project => {
          const tasks = getTasksForProject(project.id);
          const completedCount = tasks.filter(t => t.is_completed).length;
          const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
          const computed = getComputedStatus(project, tasks);
          const isExpanded = expandedProject === project.id;
          const isSuspended = project.status === "suspended";

          return (
            <Card key={project.id} className={isSuspended ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <Badge className={computed.color}>
                      {computed.status === "late" && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {computed.status === "at_risk" && <Clock className="w-3 h-3 mr-1" />}
                      {computed.status === "completed" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {computed.label}
                    </Badge>
                    <Badge variant="outline">{priorityLabels[project.priority] || project.priority}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => suspendMutation.mutate({ id: project.id, currentStatus: project.status })}
                      title={isSuspended ? "Reprendre" : "Suspendre"}
                    >
                      {isSuspended ? <PlayCircle className="w-4 h-4 text-green-600" /> : <PauseCircle className="w-4 h-4 text-yellow-600" />}
                      <span className="ml-1 text-xs">{isSuspended ? "Reprendre" : "Suspendre"}</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setExpandedProject(isExpanded ? null : project.id)}>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}

                {/* Progress */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Avancement: {completedCount}/{tasks.length} tâches</span>
                    <span className="font-semibold">{progress}%</span>
                  </div>
                  <Progress value={progress} className={computed.status === "late" ? "[&>div]:bg-destructive" : ""} />
                </div>

                {/* Meta */}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {project.budget > 0 && <span>Budget: {formatBIF(Number(project.budget))}</span>}
                  {project.start_date && <span>Début: {format(new Date(project.start_date), "dd/MM/yyyy")}</span>}
                  {project.deadline && (
                    <span className={computed.status === "late" ? "text-destructive font-medium" : ""}>
                      Fin: {format(new Date(project.deadline), "dd/MM/yyyy")}
                      {computed.status === "late" && ` (${differenceInDays(new Date(), new Date(project.deadline))}j de retard)`}
                    </span>
                  )}
                </div>

                {/* Tasks (expanded) */}
                {isExpanded && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3">
                    <h4 className="font-semibold text-sm">Tâches du projet</h4>
                    {tasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucune tâche</p>
                    ) : tasks.map(task => (
                      <div key={task.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted">
                        <Checkbox
                          checked={task.is_completed}
                          disabled={isSuspended}
                          onCheckedChange={(checked) => {
                            toggleTaskMutation.mutate({
                              taskId: task.id,
                              completed: !!checked,
                              projectId: project.id,
                              totalTasks: tasks.length,
                              completedCount,
                            });
                          }}
                        />
                        <span className={`text-sm flex-1 ${task.is_completed ? "line-through text-muted-foreground" : ""}`}>
                          {task.task_order}. {task.task_name}
                        </span>
                        {task.is_completed && task.completed_at && (
                          <span className="text-xs text-muted-foreground">
                            ✓ {format(new Date(task.completed_at), "dd/MM", { locale: fr })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import { Plus, PiggyBank, Target, TrendingUp, Trash2, Edit, HandCoins } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { logAndNotify } from "@/hooks/useActivityLogger";

type Goal = {
  id: string;
  name: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  currency: string;
  target_date: string | null;
  category: string;
  status: string;
  priority: string;
  created_at: string;
};

type Contribution = {
  id: string;
  goal_id: string;
  amount: number;
  date: string;
  note: string | null;
  contributor: string | null;
};

const categories = [
  { v: "general", l: "Général" },
  { v: "education", l: "Éducation" },
  { v: "housing", l: "Logement" },
  { v: "vehicle", l: "Véhicule" },
  { v: "health", l: "Santé" },
  { v: "travel", l: "Voyage" },
  { v: "emergency", l: "Fonds d'urgence" },
  { v: "event", l: "Événement / Fête" },
  { v: "business", l: "Projet / Business" },
];

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "En cours", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  completed: { label: "Atteint", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  paused: { label: "En pause", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  cancelled: { label: "Annulé", color: "bg-muted text-muted-foreground" },
};

const priorityConfig: Record<string, { label: string; color: string; rank: number }> = {
  urgent: { label: "🔴 Urgente", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", rank: 0 },
  high: { label: "🟠 Haute", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", rank: 1 },
  medium: { label: "🟡 Moyenne", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", rank: 2 },
  low: { label: "🟢 Basse", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", rank: 3 },
};

const defaultGoalForm = {
  name: "",
  description: "",
  target_amount: 0,
  target_date: "",
  category: "general",
  status: "active",
  priority: "medium",
};

const defaultContribForm = {
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  note: "",
  contributor: "",
};

const fmt = (n: number) => Number(n || 0).toLocaleString("fr-FR");

export default function SavingsGoals() {
  const queryClient = useQueryClient();
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalForm, setGoalForm] = useState(defaultGoalForm);
  const [contribGoal, setContribGoal] = useState<Goal | null>(null);
  const [contribForm, setContribForm] = useState(defaultContribForm);
  const [selectedGoalId, setSelectedGoalId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("priority");

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      return data;
    },
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["savings_goals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("savings_goals" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Goal[];
    },
    enabled: !!profile,
  });

  const { data: contributions = [] } = useQuery({
    queryKey: ["savings_contributions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("savings_contributions" as any)
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Contribution[];
    },
    enabled: !!profile,
  });

  const upsertGoal = useMutation({
    mutationFn: async (values: typeof goalForm & { id?: string }) => {
      const payload: any = {
        name: values.name,
        description: values.description || null,
        target_amount: values.target_amount,
        target_date: values.target_date || null,
        category: values.category,
        priority: values.priority,
        status: values.status,
        currency: "BIF",
        company_id: profile?.company_id,
      };
      if (values.id) {
        const { error } = await supabase.from("savings_goals" as any).update(payload).eq("id", values.id as any);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("savings_goals" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings_goals"] });
      const action = editingGoal ? "update" : "create";
      logAndNotify(
        { action, entity_type: "savings_goal", entity_name: goalForm.name, details: { target: goalForm.target_amount } },
        {
          title: action === "create" ? "🎯 Objectif d'épargne créé" : "✏️ Objectif d'épargne modifié",
          message: `${goalForm.name} — cible ${fmt(goalForm.target_amount)} BIF`,
          type: "info",
        }
      );
      setGoalDialogOpen(false);
      setEditingGoal(null);
      setGoalForm(defaultGoalForm);
      toast({ title: editingGoal ? "Objectif mis à jour" : "Objectif créé" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("savings_goals" as any).delete().eq("id", id as any);
      if (error) throw error;
    },
    onSuccess: (_d, id) => {
      const item = goals.find(g => g.id === id);
      queryClient.invalidateQueries({ queryKey: ["savings_goals"] });
      queryClient.invalidateQueries({ queryKey: ["savings_contributions"] });
      logAndNotify(
        { action: "delete", entity_type: "savings_goal", entity_id: id, entity_name: item?.name },
        { title: "🗑️ Objectif d'épargne supprimé", message: item?.name || "Supprimé", type: "warning" }
      );
      toast({ title: "Objectif supprimé" });
    },
  });

  const addContribution = useMutation({
    mutationFn: async (values: typeof defaultContribForm & { goal: Goal }) => {
      const { error } = await supabase.from("savings_contributions" as any).insert({
        company_id: profile?.company_id,
        goal_id: values.goal.id,
        amount: values.amount,
        date: values.date,
        note: values.note || null,
        contributor: values.contributor || null,
      } as any);
      if (error) throw error;

      const newTotal = Number(values.goal.current_amount) + Number(values.amount);
      const { error: upErr } = await supabase
        .from("savings_goals" as any)
        .update({
          current_amount: newTotal,
          status: newTotal >= Number(values.goal.target_amount) ? "completed" : values.goal.status,
        } as any)
        .eq("id", values.goal.id as any);
      if (upErr) throw upErr;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["savings_goals"] });
      queryClient.invalidateQueries({ queryKey: ["savings_contributions"] });
      logAndNotify(
        { action: "create", entity_type: "savings_contribution", entity_name: vars.goal.name, details: { amount: vars.amount } },
        { title: "💰 Contribution d'épargne", message: `${fmt(vars.amount)} BIF vers ${vars.goal.name}`, type: "success" }
      );
      setContribGoal(null);
      setContribForm(defaultContribForm);
      toast({ title: "Contribution enregistrée" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const deleteContribution = useMutation({
    mutationFn: async (c: Contribution) => {
      const { error } = await supabase.from("savings_contributions" as any).delete().eq("id", c.id as any);
      if (error) throw error;
      const goal = goals.find(g => g.id === c.goal_id);
      if (goal) {
        const newTotal = Math.max(0, Number(goal.current_amount) - Number(c.amount));
        await supabase.from("savings_goals" as any).update({ current_amount: newTotal } as any).eq("id", goal.id as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings_goals"] });
      queryClient.invalidateQueries({ queryKey: ["savings_contributions"] });
      toast({ title: "Contribution supprimée" });
    },
  });

  const openEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalForm({
      name: goal.name,
      description: goal.description || "",
      target_amount: Number(goal.target_amount),
      target_date: goal.target_date || "",
      category: goal.category,
      status: goal.status,
      priority: goal.priority || "medium",
    });
    setGoalDialogOpen(true);
  };

  const openNew = () => {
    setEditingGoal(null);
    setGoalForm(defaultGoalForm);
    setGoalDialogOpen(true);
  };

  const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0);
  const totalSaved = goals.reduce((s, g) => s + Number(g.current_amount), 0);
  const globalPct = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0;
  const activeCount = goals.filter(g => g.status === "active").length;

  const visibleGoals = goals
    .filter(g => statusFilter === "all" || g.status === statusFilter)
    .filter(g => priorityFilter === "all" || (g.priority || "medium") === priorityFilter)
    .filter(g => categoryFilter === "all" || g.category === categoryFilter)
    .filter(g => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return g.name.toLowerCase().includes(q) || (g.description || "").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === "priority") {
        return (priorityConfig[a.priority || "medium"]?.rank ?? 2) - (priorityConfig[b.priority || "medium"]?.rank ?? 2);
      }
      if (sortBy === "progress") {
        const pa = Number(a.target_amount) > 0 ? Number(a.current_amount) / Number(a.target_amount) : 0;
        const pb = Number(b.target_amount) > 0 ? Number(b.current_amount) / Number(b.target_amount) : 0;
        return pb - pa;
      }
      if (sortBy === "target_date") {
        return (a.target_date || "9999").localeCompare(b.target_date || "9999");
      }
      if (sortBy === "amount") return Number(b.target_amount) - Number(a.target_amount);
      return b.created_at.localeCompare(a.created_at);
    });

  const filteredContributions =
    selectedGoalId === "all" ? contributions : contributions.filter(c => c.goal_id === selectedGoalId);


  const goalName = (id: string) => goals.find(g => g.id === id)?.name || "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Objectifs d'épargne</h1>
          <p className="text-muted-foreground">Définissez vos cibles et suivez la progression des contributions</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nouvel objectif</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900"><Target className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Cible totale</p>
                <p className="text-xl font-bold">{fmt(totalTarget)} BIF</p>
                <p className="text-xs text-muted-foreground">{activeCount} objectif(s) en cours</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900"><PiggyBank className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total épargné</p>
                <p className="text-xl font-bold">{fmt(totalSaved)} BIF</p>
                <p className="text-xs text-muted-foreground">{contributions.length} contribution(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900"><TrendingUp className="w-5 h-5 text-purple-600" /></div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Progression globale</p>
                <p className="text-xl font-bold">{globalPct.toFixed(1)}%</p>
                <Progress value={globalPct} className="h-2 mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 flex flex-wrap gap-3 items-center">
          <Input
            placeholder="Rechercher un objectif..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-64"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Priorité" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes priorités</SelectItem>
              {Object.entries(priorityConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[190px]"><SelectValue placeholder="Catégorie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {categories.map(c => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[190px]"><SelectValue placeholder="Trier par" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Trier : priorité</SelectItem>
              <SelectItem value="progress">Trier : progression</SelectItem>
              <SelectItem value="target_date">Trier : échéance</SelectItem>
              <SelectItem value="amount">Trier : montant cible</SelectItem>
              <SelectItem value="created">Trier : plus récents</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{visibleGoals.length} / {goals.length} objectif(s)</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(""); setStatusFilter("all"); setPriorityFilter("all"); setCategoryFilter("all"); setSortBy("priority"); }}
            >
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Goals cards with visual progress */}
      {visibleGoals.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          {goals.length === 0 ? "Aucun objectif d'épargne pour le moment" : "Aucun objectif ne correspond aux filtres"}
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleGoals.map(goal => {
            const target = Number(goal.target_amount);
            const current = Number(goal.current_amount);
            const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
            const remaining = Math.max(0, target - current);
            const stat = statusConfig[goal.status] || statusConfig.active;
            return (
              <Card key={goal.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{goal.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {categories.find(c => c.v === goal.category)?.l || goal.category}
                        {goal.target_date && ` • échéance ${new Date(goal.target_date).toLocaleDateString("fr-FR")}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={stat.color}>{stat.label}</Badge>
                      <Badge variant="outline" className={priorityConfig[goal.priority || "medium"]?.color}>
                        {priorityConfig[goal.priority || "medium"]?.label}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 flex-1 flex flex-col">
                  {goal.description && <p className="text-sm text-muted-foreground line-clamp-2">{goal.description}</p>}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold">{fmt(current)} BIF</span>
                      <span className="text-muted-foreground">/ {fmt(target)} BIF</span>
                    </div>
                    <Progress value={pct} className="h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{pct.toFixed(1)}%</span>
                      <span>Reste {fmt(remaining)} BIF</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-auto pt-2">
                    <Button size="sm" className="flex-1" onClick={() => { setContribGoal(goal); setContribForm(defaultContribForm); }}>
                      <HandCoins className="w-4 h-4 mr-1" />Contribuer
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(goal)}><Edit className="w-4 h-4" /></Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => deleteGoal.mutate(goal.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Contributions list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-base">Contributions</CardTitle>
          <Select value={selectedGoalId} onValueChange={setSelectedGoalId}>
            <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les objectifs</SelectItem>
              {goals.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredContributions}
            columns={[
              { key: "date", header: "Date", render: (c) => new Date(c.date).toLocaleDateString("fr-FR"), getValue: (c) => c.date },
              { key: "goal_id", header: "Objectif", render: (c) => goalName(c.goal_id), getValue: (c) => goalName(c.goal_id) },
              { key: "amount", header: "Montant", className: "text-right", render: (c) => <span className="font-semibold">{fmt(Number(c.amount))} BIF</span> },
              { key: "contributor", header: "Contributeur", render: (c) => c.contributor || "—" },
              { key: "note", header: "Note", render: (c) => c.note || "—" },
              {
                key: "actions", header: "Actions", sortable: false, searchable: false, className: "text-right",
                render: (c) => (
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteContribution.mutate(c)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                ),
              },
            ] as DataTableColumn<Contribution>[]}
            pageSize={5}
            searchPlaceholder="Rechercher une contribution..."
            emptyMessage="Aucune contribution enregistrée"
          />
        </CardContent>
      </Card>

      {/* Goal dialog */}
      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGoal ? "Modifier l'objectif" : "Nouvel objectif d'épargne"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom de l'objectif *</Label>
              <Input placeholder="Ex: Frais scolaires 2027" value={goalForm.name} onChange={e => setGoalForm({ ...goalForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea placeholder="Détails..." value={goalForm.description} onChange={e => setGoalForm({ ...goalForm, description: e.target.value })} />
            </div>
            <div>
              <Label>Montant cible (BIF) *</Label>
              <Input type="number" min={0} value={goalForm.target_amount} onChange={e => setGoalForm({ ...goalForm, target_amount: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Date cible</Label>
              <Input type="date" value={goalForm.target_date} onChange={e => setGoalForm({ ...goalForm, target_date: e.target.value })} />
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select value={goalForm.category} onValueChange={v => setGoalForm({ ...goalForm, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priorité</Label>
              <Select value={goalForm.priority} onValueChange={v => setGoalForm({ ...goalForm, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {editingGoal && (
              <div>
                <Label>Statut</Label>
                <Select value={goalForm.status} onValueChange={v => setGoalForm({ ...goalForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">En cours</SelectItem>
                    <SelectItem value="completed">Atteint</SelectItem>
                    <SelectItem value="paused">En pause</SelectItem>
                    <SelectItem value="cancelled">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGoalDialogOpen(false)}>Annuler</Button>
            <Button disabled={!goalForm.name || goalForm.target_amount <= 0} onClick={() => upsertGoal.mutate({ ...goalForm, id: editingGoal?.id })}>
              {editingGoal ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contribution dialog */}
      <Dialog open={!!contribGoal} onOpenChange={(o) => !o && setContribGoal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Contribuer — {contribGoal?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Montant (BIF) *</Label>
              <Input type="number" min={0} value={contribForm.amount} onChange={e => setContribForm({ ...contribForm, amount: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={contribForm.date} onChange={e => setContribForm({ ...contribForm, date: e.target.value })} />
            </div>
            <div>
              <Label>Contributeur</Label>
              <Input placeholder="Nom" value={contribForm.contributor} onChange={e => setContribForm({ ...contribForm, contributor: e.target.value })} />
            </div>
            <div>
              <Label>Note</Label>
              <Textarea placeholder="Origine des fonds, remarque..." value={contribForm.note} onChange={e => setContribForm({ ...contribForm, note: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContribGoal(null)}>Annuler</Button>
            <Button
              disabled={contribForm.amount <= 0}
              onClick={() => contribGoal && addContribution.mutate({ ...contribForm, goal: contribGoal })}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

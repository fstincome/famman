import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, CheckCircle2, Clock, AlertTriangle, ShoppingCart, Trash2, Edit } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

const priorityConfig = {
  urgent: { label: "Urgent", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: AlertTriangle },
  high: { label: "Haute", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", icon: AlertTriangle },
  medium: { label: "Moyenne", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", icon: Clock },
  low: { label: "Basse", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: Clock },
};

const statusConfig = {
  pending: { label: "En attente", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  validated: { label: "Validé / Fait", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  cancelled: { label: "Annulé", color: "bg-muted text-muted-foreground" },
};

type Need = {
  id: string;
  title: string;
  description: string | null;
  estimated_price: number;
  currency: string;
  priority: string;
  status: string;
  requested_by: string | null;
  validated_at: string | null;
  validated_by: string | null;
  created_at: string;
};

const defaultForm = { title: "", description: "", estimated_price: 0, priority: "medium", requested_by: "", status: "pending" };

export default function Needs() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNeed, setEditingNeed] = useState<Need | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [filter, setFilter] = useState<string>("all");

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      return data;
    },
  });

  const { data: needs = [], isLoading } = useQuery({
    queryKey: ["family_needs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("family_needs" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Need[];
    },
    enabled: !!profile,
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      const payload = {
        title: values.title,
        description: values.description || null,
        estimated_price: values.estimated_price,
        priority: values.priority,
        requested_by: values.requested_by || null,
        status: values.status,
        company_id: profile?.company_id,
      } as any;

      if (values.id) {
        if (values.status === "validated" && editingNeed?.status !== "validated") {
          payload.validated_at = new Date().toISOString();
          payload.validated_by = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();
        }
        const { error } = await supabase.from("family_needs" as any).update(payload).eq("id", values.id as any);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("family_needs" as any).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family_needs"] });
      setDialogOpen(false);
      setEditingNeed(null);
      setForm(defaultForm);
      toast({ title: editingNeed ? "Besoin mis à jour" : "Besoin ajouté" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("family_needs" as any).delete().eq("id", id as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family_needs"] });
      toast({ title: "Besoin supprimé" });
    },
  });

  const validateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("family_needs" as any).update({
        status: "validated",
        validated_at: new Date().toISOString(),
        validated_by: `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim(),
      } as any).eq("id", id as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family_needs"] });
      toast({ title: "Besoin validé ✓" });
    },
  });

  const openEdit = (need: Need) => {
    setEditingNeed(need);
    setForm({
      title: need.title,
      description: need.description || "",
      estimated_price: need.estimated_price,
      priority: need.priority,
      requested_by: need.requested_by || "",
      status: need.status,
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingNeed(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const filtered = filter === "all" ? needs : needs.filter(n => n.status === filter);
  const totalPending = needs.filter(n => n.status === "pending").reduce((s, n) => s + Number(n.estimated_price), 0);
  const totalValidated = needs.filter(n => n.status === "validated").reduce((s, n) => s + Number(n.estimated_price), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Besoins identifiés</h1>
          <p className="text-muted-foreground">Gérez les besoins ménagers et suivez leur exécution</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nouveau besoin</Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900"><Clock className="w-5 h-5 text-yellow-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-xl font-bold">{needs.filter(n => n.status === "pending").length}</p>
                <p className="text-xs text-muted-foreground">{totalPending.toLocaleString()} BIF estimé</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900"><CheckCircle2 className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Validés / Faits</p>
                <p className="text-xl font-bold">{needs.filter(n => n.status === "validated").length}</p>
                <p className="text-xs text-muted-foreground">{totalValidated.toLocaleString()} BIF dépensé</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900"><ShoppingCart className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Reste à acheter</p>
                <p className="text-xl font-bold">{totalPending.toLocaleString()} BIF</p>
                <p className="text-xs text-muted-foreground">{needs.filter(n => n.status === "pending").length} besoin(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[{ v: "all", l: "Tous" }, { v: "pending", l: "En attente" }, { v: "validated", l: "Faits" }, { v: "cancelled", l: "Annulés" }].map(f => (
          <Button key={f.v} size="sm" variant={filter === f.v ? "default" : "outline"} onClick={() => setFilter(f.v)}>
            {f.l}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Besoin</TableHead>
                <TableHead>Prix estimé</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>Demandé par</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucun besoin enregistré</TableCell></TableRow>
              ) : filtered.map(need => {
                const prio = priorityConfig[need.priority as keyof typeof priorityConfig] || priorityConfig.medium;
                const stat = statusConfig[need.status as keyof typeof statusConfig] || statusConfig.pending;
                return (
                  <TableRow key={need.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{need.title}</p>
                        {need.description && <p className="text-xs text-muted-foreground line-clamp-1">{need.description}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">{Number(need.estimated_price).toLocaleString()} BIF</TableCell>
                    <TableCell><Badge className={prio.color}>{prio.label}</Badge></TableCell>
                    <TableCell>{need.requested_by || "—"}</TableCell>
                    <TableCell><Badge className={stat.color}>{stat.label}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(need.created_at).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {need.status === "pending" && (
                          <Button size="sm" variant="ghost" className="text-green-600" onClick={() => validateMutation.mutate(need.id)} title="Valider">
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => openEdit(need)}><Edit className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(need.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingNeed ? "Modifier le besoin" : "Nouveau besoin"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titre du besoin *</Label>
              <Input placeholder="Ex: Sac de riz 25kg" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea placeholder="Détails supplémentaires..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Prix estimé (BIF) *</Label>
              <Input type="number" min={0} value={form.estimated_price} onChange={e => setForm({ ...form, estimated_price: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Priorité</Label>
              <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">🔴 Urgent</SelectItem>
                  <SelectItem value="high">🟠 Haute</SelectItem>
                  <SelectItem value="medium">🟡 Moyenne</SelectItem>
                  <SelectItem value="low">🟢 Basse</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Demandé par</Label>
              <Input placeholder="Nom du demandeur" value={form.requested_by} onChange={e => setForm({ ...form, requested_by: e.target.value })} />
            </div>
            {editingNeed && (
              <div>
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="validated">Validé / Fait</SelectItem>
                    <SelectItem value="cancelled">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button disabled={!form.title || form.estimated_price <= 0} onClick={() => upsertMutation.mutate({ ...form, id: editingNeed?.id })}>
              {editingNeed ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

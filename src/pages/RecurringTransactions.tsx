import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, RefreshCw, Trash2, Repeat, Calendar } from "lucide-react";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { logAndNotify } from "@/hooks/useActivityLogger";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface RecurringTransaction {
  id: string;
  company_id: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  transaction_type: string;
  frequency: string;
  next_due_date: string;
  day_of_month: number;
  is_active: boolean;
  description: string | null;
  last_generated_at: string | null;
  created_at: string;
}

const categories = [
  "Loyer", "Électricité", "Eau", "Internet", "Téléphone",
  "Scolarité", "Transport", "Assurance", "Abonnement",
  "Épargne", "Salaire", "Autre"
];

const frequencies = [
  { value: "weekly", label: "Hebdomadaire" },
  { value: "monthly", label: "Mensuel" },
  { value: "quarterly", label: "Trimestriel" },
  { value: "yearly", label: "Annuel" },
];

export default function RecurringTransactions() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const [form, setForm] = useState({
    title: "",
    amount: "",
    category: "Loyer",
    transaction_type: "expense",
    frequency: "monthly",
    day_of_month: "1",
    description: "",
  });

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["recurring-transactions"],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", (await supabase.auth.getUser()).data.user!.id)
        .single();
      if (!profile?.company_id) return [];
      const { data, error } = await supabase
        .from("recurring_transactions")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("next_due_date", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as RecurringTransaction[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();
      if (!profile?.company_id) throw new Error("No company");

      const today = new Date();
      const day = parseInt(form.day_of_month) || 1;
      let nextDue = new Date(today.getFullYear(), today.getMonth(), day);
      if (nextDue <= today) nextDue.setMonth(nextDue.getMonth() + 1);

      const { error } = await supabase.from("recurring_transactions").insert({
        company_id: profile.company_id,
        title: form.title,
        amount: parseFloat(form.amount),
        category: form.category,
        transaction_type: form.transaction_type,
        frequency: form.frequency,
        day_of_month: day,
        next_due_date: nextDue.toISOString().split("T")[0],
        description: form.description || null,
      } as any);
      if (error) throw error;

      await logAndNotify(
        { action: "create", entity_type: "recurring_transaction", entity_name: form.title },
        { title: "Transaction récurrente créée", message: `${form.title} — ${form.amount} BIF / ${form.frequency}`, type: "success" }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
      setDialogOpen(false);
      setForm({ title: "", amount: "", category: "Loyer", transaction_type: "expense", frequency: "monthly", day_of_month: "1", description: "" });
      toast({ title: "Transaction récurrente ajoutée" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await supabase.from("recurring_transactions").update({ is_active } as any).eq("id", id as any);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("recurring_transactions").delete().eq("id", id as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
      toast({ title: "Transaction supprimée" });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (tx: RecurringTransaction) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not auth");
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", user.id).single();
      if (!profile?.company_id) throw new Error("No company");

      const today = new Date().toISOString().split("T")[0];

      if (tx.transaction_type === "expense") {
        await supabase.from("expense_records").insert({
          company_id: profile.company_id,
          amount: tx.amount,
          currency: tx.currency,
          category: tx.category,
          subcategory: tx.title,
          description: `Récurrent : ${tx.title}`,
          date: today,
        });
      } else {
        await supabase.from("income_records").insert({
          company_id: profile.company_id,
          amount: tx.amount,
          currency: tx.currency,
          source: tx.category,
          description: `Récurrent : ${tx.title}`,
          date: today,
        });
      }

      // Advance next_due_date
      const next = new Date(tx.next_due_date);
      if (tx.frequency === "weekly") next.setDate(next.getDate() + 7);
      else if (tx.frequency === "monthly") next.setMonth(next.getMonth() + 1);
      else if (tx.frequency === "quarterly") next.setMonth(next.getMonth() + 3);
      else next.setFullYear(next.getFullYear() + 1);

      await supabase.from("recurring_transactions").update({
        next_due_date: next.toISOString().split("T")[0],
        last_generated_at: new Date().toISOString(),
      } as any).eq("id", tx.id as any);

      await logAndNotify(
        { action: "generate", entity_type: "recurring_transaction", entity_name: tx.title },
        { title: "Transaction générée", message: `${tx.title} — ${tx.amount} BIF enregistré`, type: "info" }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["expense-records"] });
      queryClient.invalidateQueries({ queryKey: ["income-records"] });
      toast({ title: "Transaction générée avec succès" });
    },
  });

  const dueTransactions = transactions.filter(
    (tx) => tx.is_active && new Date(tx.next_due_date) <= new Date()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Transactions récurrentes</h1>
          <p className="text-muted-foreground">Gérez vos dépenses et revenus automatiques</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Ajouter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle transaction récurrente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Titre (ex: Loyer maison)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Input type="number" placeholder="Montant" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              <Select value={form.transaction_type} onValueChange={(v) => setForm({ ...form, transaction_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Dépense</SelectItem>
                  <SelectItem value="income">Revenu</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {frequencies.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="number" min="1" max="28" placeholder="Jour du mois (1-28)" value={form.day_of_month} onChange={(e) => setForm({ ...form, day_of_month: e.target.value })} />
              <Input placeholder="Description (optionnel)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Button className="w-full" onClick={() => addMutation.mutate()} disabled={!form.title || !form.amount}>
                Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Due alerts */}
      {dueTransactions.length > 0 && (
        <Card className="border-warning/50 bg-warning-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-warning" />
              {dueTransactions.length} transaction(s) à générer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dueTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-card rounded-lg">
                  <div>
                    <span className="font-medium">{tx.title}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {tx.amount.toLocaleString()} {tx.currency}
                    </span>
                  </div>
                  <Button size="sm" onClick={() => generateMutation.mutate(tx)} disabled={generateMutation.isPending}>
                    <RefreshCw className="w-4 h-4 mr-1" />Générer
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Repeat className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Aucune transaction récurrente</p>
            </div>
          ) : (
            <DataTable
              data={transactions}
              columns={[
                { key: "title", header: "Titre", render: (tx) => <span className="font-medium">{tx.title}</span> },
                {
                  key: "transaction_type", header: "Type", render: (tx) => (
                    <Badge variant={tx.transaction_type === "income" ? "default" : "secondary"}>
                      {tx.transaction_type === "income" ? "Revenu" : "Dépense"}
                    </Badge>
                  ),
                },
                { key: "category", header: "Catégorie" },
                { key: "amount", header: "Montant", render: (tx) => <span className="font-semibold">{tx.amount.toLocaleString()} {tx.currency}</span>, className: "text-right" },
                { key: "frequency", header: "Fréquence", render: (tx) => frequencies.find((f) => f.value === tx.frequency)?.label || tx.frequency },
                {
                  key: "next_due_date", header: "Prochaine échéance", render: (tx) => {
                    const isOverdue = new Date(tx.next_due_date) <= new Date();
                    return (
                      <>
                        <span className={isOverdue ? "text-destructive font-medium" : ""}>
                          {format(new Date(tx.next_due_date), "dd MMM yyyy", { locale: fr })}
                        </span>
                        {isOverdue && <Badge variant="destructive" className="ml-2 text-xs">Échue</Badge>}
                      </>
                    );
                  },
                },
                {
                  key: "is_active", header: "Actif", sortable: false, render: (tx) => (
                    <Switch checked={tx.is_active} onCheckedChange={(v) => toggleMutation.mutate({ id: tx.id, is_active: v })} />
                  ),
                },
                {
                  key: "actions", header: "Actions", sortable: false, searchable: false, render: (tx) => {
                    const isOverdue = new Date(tx.next_due_date) <= new Date();
                    return (
                      <div className="flex gap-1">
                        {isOverdue && tx.is_active && (
                          <Button variant="outline" size="sm" onClick={() => generateMutation.mutate(tx)}>
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(tx.id)}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    );
                  },
                },
              ] as DataTableColumn<RecurringTransaction>[]}
              pageSize={5}
              searchPlaceholder="Rechercher une récurrence..."
              emptyMessage="Aucune transaction récurrente"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, MinusCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { logAndNotify } from "@/hooks/useActivityLogger";

const formatBIF = (n: number) => n.toLocaleString("fr-BI") + " BIF";

export default function Debts() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [debtType, setDebtType] = useState<"debt" | "credit">("debt");
  const [payTarget, setPayTarget] = useState<any>(null);
  const [payAmount, setPayAmount] = useState("");
  const [form, setForm] = useState({ name: "", counterparty: "", original_amount: "", due_date: "" });

  const { data: debts = [], isLoading } = useQuery({
    queryKey: ["family-debts"],
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", (await supabase.auth.getUser()).data.user!.id).single();
      if (!profile?.company_id) return [];
      const { data, error } = await supabase.from("family_debts").select("*").eq("company_id", profile.company_id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: typeof form & { debt_type: string }) => {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", (await supabase.auth.getUser()).data.user!.id).single();
      if (!profile?.company_id) throw new Error("No company");
      const amount = parseFloat(data.original_amount) || 0;
      const { error } = await supabase.from("family_debts").insert({
        company_id: profile.company_id,
        name: data.name,
        debt_type: data.debt_type,
        counterparty: data.counterparty,
        original_amount: amount,
        remaining_balance: amount,
        due_date: data.due_date || null,
        currency: "BIF",
        status: "unpaid",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-debts"] });
      const amount = parseFloat(form.original_amount) || 0;
      logAndNotify(
        { action: "create", entity_type: "debt", entity_name: form.name, details: { counterparty: form.counterparty, amount, type: debtType } },
        { title: debtType === "debt" ? "📋 Dette ajoutée" : "📋 Créance ajoutée", message: `${form.name} — ${amount.toLocaleString()} BIF (${form.counterparty})`, type: "info" }
      );
      setOpen(false);
      setForm({ name: "", counterparty: "", original_amount: "", due_date: "" });
      toast({ title: "✓", description: t.debts.title });
    },
  });

  const payMutation = useMutation({
    mutationFn: async ({ id, amount, currentBalance, name }: { id: string; amount: number; currentBalance: number; name?: string }) => {
      const newBalance = Math.max(0, currentBalance - amount);
      const newStatus = newBalance <= 0 ? "paid" : "unpaid";
      const { error } = await supabase.from("family_debts").update({ remaining_balance: newBalance, status: newStatus }).eq("id", id);
      if (error) throw error;
      return { newStatus, name, amount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["family-debts"] });
      logAndNotify(
        { action: "payment", entity_type: "debt", entity_name: result.name, details: { amount: result.amount, status: result.newStatus } },
        { title: result.newStatus === "paid" ? "✅ Dette soldée" : "💸 Paiement effectué", message: `${result.name} — ${result.amount.toLocaleString()} BIF`, type: result.newStatus === "paid" ? "success" : "info" }
      );
      setPayOpen(false);
      setPayAmount("");
      setPayTarget(null);
      toast({ title: "✓", description: "Paiement enregistré" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const item = debts.find(d => d.id === id);
      const { error } = await supabase.from("family_debts").delete().eq("id", id);
      if (error) throw error;
      return item;
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ["family-debts"] });
      logAndNotify(
        { action: "delete", entity_type: "debt", entity_id: item?.id, entity_name: item?.name },
        { title: "🗑️ Dette supprimée", message: item?.name || "Supprimée", type: "warning" }
      );
    },
  });

  const debtItems = debts.filter(d => d.debt_type === "debt");
  const creditItems = debts.filter(d => d.debt_type === "credit");
  const totalDebts = debtItems.reduce((s, d) => s + Number(d.remaining_balance), 0);
  const totalCredits = creditItems.reduce((s, d) => s + Number(d.remaining_balance), 0);

  const openPayDialog = (item: any) => {
    setPayTarget(item);
    setPayAmount("");
    setPayOpen(true);
  };

  const renderTable = (items: typeof debts, type: "debt" | "credit") => (
    <DataTable
      data={items}
      columns={[
        { key: "name", header: t.common.name, render: (item) => <span className="font-medium">{item.name}</span> },
        { key: "counterparty", header: type === "debt" ? t.debts.creditor : t.debts.debtor },
        { key: "original_amount", header: t.debts.originalAmount, render: (item) => formatBIF(Number(item.original_amount)), className: "text-right" },
        { key: "remaining_balance", header: t.debts.remainingBalance, render: (item) => <span className="font-semibold">{formatBIF(Number(item.remaining_balance))}</span>, className: "text-right" },
        { key: "due_date", header: t.debts.dueDate, render: (item) => item.due_date ? format(new Date(item.due_date), "dd/MM/yyyy") : "—" },
        {
          key: "status", header: "Statut", render: (item) => {
            const isPaid = item.status === "paid" || Number(item.remaining_balance) <= 0;
            const paidPercent = Number(item.original_amount) > 0
              ? Math.round(((Number(item.original_amount) - Number(item.remaining_balance)) / Number(item.original_amount)) * 100) : 0;
            return isPaid
              ? <Badge className="bg-green-600 text-white"><CheckCircle2 className="w-3 h-3 mr-1" />Payé</Badge>
              : <Badge variant="secondary">{paidPercent}% payé</Badge>;
          },
        },
        {
          key: "actions", header: t.common.actions, sortable: false, searchable: false, render: (item) => {
            const isPaid = item.status === "paid" || Number(item.remaining_balance) <= 0;
            return (
              <div className="flex gap-1">
                {!isPaid && (
                  <Button variant="outline" size="sm" onClick={() => openPayDialog(item)}>
                    <MinusCircle className="w-4 h-4 mr-1" />Payer
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            );
          },
        },
      ] as DataTableColumn<any>[]}
      pageSize={5}
      searchPlaceholder="Rechercher..."
      emptyMessage={t.common.noData}
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t.debts.title}</h1>
          <p className="text-muted-foreground">{t.debts.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setDebtType("debt"); setOpen(true); }}><Plus className="w-4 h-4 mr-2" />{t.debts.addDebt}</Button>
          <Button variant="outline" onClick={() => { setDebtType("credit"); setOpen(true); }}><Plus className="w-4 h-4 mr-2" />{t.debts.addCredit}</Button>
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{debtType === "debt" ? t.debts.addDebt : t.debts.addCredit}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder={t.common.name} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input placeholder={debtType === "debt" ? t.debts.creditor : t.debts.debtor} value={form.counterparty} onChange={e => setForm({ ...form, counterparty: e.target.value })} />
            <Input type="number" placeholder="Montant (BIF)" value={form.original_amount} onChange={e => setForm({ ...form, original_amount: e.target.value })} />
            <div><label className="text-sm text-muted-foreground">{t.debts.dueDate}</label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
            <Button className="w-full" onClick={() => addMutation.mutate({ ...form, debt_type: debtType })} disabled={!form.name || !form.counterparty || !form.original_amount || addMutation.isPending}>{t.common.save}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enregistrer un paiement</DialogTitle></DialogHeader>
          {payTarget && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                <strong>{payTarget.name}</strong> — Reste: <strong>{formatBIF(Number(payTarget.remaining_balance))}</strong>
              </p>
              <Input
                type="number"
                placeholder="Montant payé (BIF)"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                max={Number(payTarget.remaining_balance)}
              />
              <Button
                className="w-full"
                disabled={!payAmount || parseFloat(payAmount) <= 0 || parseFloat(payAmount) > Number(payTarget.remaining_balance) || payMutation.isPending}
                onClick={() => payMutation.mutate({ id: payTarget.id, amount: parseFloat(payAmount), currentBalance: Number(payTarget.remaining_balance), name: payTarget.name })}
              >
                Confirmer le paiement
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Dettes</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-destructive">{formatBIF(totalDebts)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Créances</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{formatBIF(totalCredits)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Solde Net</CardTitle></CardHeader><CardContent><p className={`text-2xl font-bold ${totalCredits - totalDebts >= 0 ? 'text-green-600' : 'text-destructive'}`}>{formatBIF(totalCredits - totalDebts)}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="debts">
        <TabsList>
          <TabsTrigger value="debts">{t.debts.debtsTab} ({debtItems.length})</TabsTrigger>
          <TabsTrigger value="credits">{t.debts.creditsTab} ({creditItems.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="debts"><Card><CardContent className="p-0">{renderTable(debtItems, "debt")}</CardContent></Card></TabsContent>
        <TabsContent value="credits"><Card><CardContent className="p-0">{renderTable(creditItems, "credit")}</CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}

import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

const DEBT_CATEGORIES = ["mortgage", "personal_loan", "credit_card", "family_loan", "other"] as const;

export default function Debts() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [debtType, setDebtType] = useState<"debt" | "credit">("debt");
  const [form, setForm] = useState({ name: "", category: "other", counterparty: "", original_amount: "", remaining_balance: "", interest_rate: "", monthly_payment: "", due_date: "" });

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
      const { error } = await supabase.from("family_debts").insert({
        company_id: profile.company_id,
        name: data.name,
        debt_type: data.debt_type,
        category: data.category,
        counterparty: data.counterparty,
        original_amount: parseFloat(data.original_amount) || 0,
        remaining_balance: parseFloat(data.remaining_balance) || 0,
        interest_rate: parseFloat(data.interest_rate) || 0,
        monthly_payment: parseFloat(data.monthly_payment) || 0,
        due_date: data.due_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-debts"] });
      setOpen(false);
      setForm({ name: "", category: "other", counterparty: "", original_amount: "", remaining_balance: "", interest_rate: "", monthly_payment: "", due_date: "" });
      toast({ title: t.common.save, description: "✓" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("family_debts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["family-debts"] }),
  });

  const categoryLabels: Record<string, string> = {
    mortgage: t.debts.mortgage,
    personal_loan: t.debts.personalLoan,
    credit_card: t.debts.creditCard,
    family_loan: t.debts.familyLoan,
    other: t.income.other,
  };

  const debtItems = debts.filter(d => d.debt_type === "debt");
  const creditItems = debts.filter(d => d.debt_type === "credit");
  const totalDebts = debtItems.reduce((s, d) => s + Number(d.remaining_balance), 0);
  const totalCredits = creditItems.reduce((s, d) => s + Number(d.remaining_balance), 0);

  const renderTable = (items: typeof debts, type: "debt" | "credit") => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t.common.name}</TableHead>
          <TableHead>{t.common.category}</TableHead>
          <TableHead>{type === "debt" ? t.debts.creditor : t.debts.debtor}</TableHead>
          <TableHead>{t.debts.originalAmount}</TableHead>
          <TableHead>{t.debts.remainingBalance}</TableHead>
          <TableHead>{t.debts.monthlyPayment}</TableHead>
          <TableHead>{t.debts.dueDate}</TableHead>
          <TableHead>{t.common.actions}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow><TableCell colSpan={8} className="text-center py-8">{t.common.noData}</TableCell></TableRow>
        ) : items.map(item => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.name}</TableCell>
            <TableCell><Badge variant="secondary">{categoryLabels[item.category || "other"]}</Badge></TableCell>
            <TableCell>{item.counterparty}</TableCell>
            <TableCell>${Number(item.original_amount).toLocaleString()}</TableCell>
            <TableCell className="font-medium">${Number(item.remaining_balance).toLocaleString()}</TableCell>
            <TableCell>${Number(item.monthly_payment).toLocaleString()}</TableCell>
            <TableCell>{item.due_date ? format(new Date(item.due_date), "dd/MM/yyyy") : "—"}</TableCell>
            <TableCell>
              <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t.debts.title}</h1>
          <p className="text-muted-foreground">{t.debts.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setDebtType("debt")}><Plus className="w-4 h-4 mr-2" />{t.debts.addDebt}</Button>
            </DialogTrigger>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => setDebtType("credit")}><Plus className="w-4 h-4 mr-2" />{t.debts.addCredit}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{debtType === "debt" ? t.debts.addDebt : t.debts.addCredit}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder={t.common.name} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEBT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{categoryLabels[c]}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder={debtType === "debt" ? t.debts.creditor : t.debts.debtor} value={form.counterparty} onChange={e => setForm({ ...form, counterparty: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                  <Input type="number" placeholder={t.debts.originalAmount} value={form.original_amount} onChange={e => setForm({ ...form, original_amount: e.target.value })} />
                  <Input type="number" placeholder={t.debts.remainingBalance} value={form.remaining_balance} onChange={e => setForm({ ...form, remaining_balance: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input type="number" placeholder={t.debts.interestRate + " (%)"} value={form.interest_rate} onChange={e => setForm({ ...form, interest_rate: e.target.value })} />
                  <Input type="number" placeholder={t.debts.monthlyPayment} value={form.monthly_payment} onChange={e => setForm({ ...form, monthly_payment: e.target.value })} />
                </div>
                <div><label className="text-sm text-muted-foreground">{t.debts.dueDate}</label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
                <Button className="w-full" onClick={() => addMutation.mutate({ ...form, debt_type: debtType })} disabled={!form.name || !form.counterparty || addMutation.isPending}>{t.common.save}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t.dashboard.totalDebts}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-destructive">${totalDebts.toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t.dashboard.totalCredits}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">${totalCredits.toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t.dashboard.netBalance}</CardTitle></CardHeader><CardContent><p className={`text-2xl font-bold ${totalCredits - totalDebts >= 0 ? 'text-green-600' : 'text-destructive'}`}>${(totalCredits - totalDebts).toLocaleString()}</p></CardContent></Card>
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

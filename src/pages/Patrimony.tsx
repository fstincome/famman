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
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, Car, PiggyBank, TrendingUp, Gem, Trash2 } from "lucide-react";
import { format } from "date-fns";

const ASSET_TYPES = ["real_estate", "vehicle", "savings", "investment", "valuable"] as const;

const assetIcons: Record<string, any> = {
  real_estate: Building2,
  vehicle: Car,
  savings: PiggyBank,
  investment: TrendingUp,
  valuable: Gem,
};

export default function Patrimony() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", asset_type: "real_estate", description: "", purchase_price: "", current_value: "", currency: "BIF", location: "", purchase_date: "" });

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["family-assets"],
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", (await supabase.auth.getUser()).data.user!.id).single();
      if (!profile?.company_id) return [];
      const { data, error } = await supabase.from("family_assets").select("*").eq("company_id", profile.company_id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (asset: typeof form) => {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", (await supabase.auth.getUser()).data.user!.id).single();
      if (!profile?.company_id) throw new Error("No company");
      const { error } = await supabase.from("family_assets").insert({
        company_id: profile.company_id,
        name: asset.name,
        asset_type: asset.asset_type,
        description: asset.description || null,
        purchase_price: parseFloat(asset.purchase_price) || 0,
        current_value: parseFloat(asset.current_value) || 0,
        currency: asset.currency,
        location: asset.location || null,
        purchase_date: asset.purchase_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-assets"] });
      setOpen(false);
      setForm({ name: "", asset_type: "real_estate", description: "", purchase_price: "", current_value: "", currency: "BIF", location: "", purchase_date: "" });
      toast({ title: t.common.save, description: "✓" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("family_assets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["family-assets"] }),
  });

  const totalValue = assets.reduce((sum, a) => sum + Number(a.current_value || 0), 0);
  const assetTypeLabels: Record<string, string> = {
    real_estate: t.patrimony.realEstate,
    vehicle: t.patrimony.vehicles,
    savings: t.patrimony.savings,
    investment: t.patrimony.investments,
    valuable: t.patrimony.valuables,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t.patrimony.title}</h1>
          <p className="text-muted-foreground">{t.patrimony.subtitle}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />{t.patrimony.addAsset}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.patrimony.addAsset}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder={t.common.name} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <Select value={form.asset_type} onValueChange={v => setForm({ ...form, asset_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map(type => <SelectItem key={type} value={type}>{assetTypeLabels[type]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder={t.common.description} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <Input type="number" placeholder={t.patrimony.purchasePrice} value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: e.target.value })} />
                <Input type="number" placeholder={t.patrimony.currentValue} value={form.current_value} onChange={e => setForm({ ...form, current_value: e.target.value })} />
              </div>
              <Input type="date" placeholder={t.patrimony.purchaseDate} value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} />
              <Input placeholder={t.patrimony.location} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              <Button className="w-full" onClick={() => addMutation.mutate(form)} disabled={!form.name || addMutation.isPending}>
                {t.common.save}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t.patrimony.totalValue}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">${totalValue.toLocaleString()}</p></CardContent>
        </Card>
        {ASSET_TYPES.map(type => {
          const Icon = assetIcons[type];
          const typeAssets = assets.filter(a => a.asset_type === type);
          const typeValue = typeAssets.reduce((s, a) => s + Number(a.current_value || 0), 0);
          return (
            <Card key={type}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <Icon className="w-4 h-4" />{assetTypeLabels[type]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold">${typeValue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{typeAssets.length} {typeAssets.length === 1 ? "actif" : "actifs"}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Assets table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.common.name}</TableHead>
                <TableHead>{t.common.type}</TableHead>
                <TableHead>{t.patrimony.purchasePrice}</TableHead>
                <TableHead>{t.patrimony.currentValue}</TableHead>
                <TableHead>{t.patrimony.location}</TableHead>
                <TableHead>{t.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">{t.common.loading}</TableCell></TableRow>
              ) : assets.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">{t.common.noData}</TableCell></TableRow>
              ) : assets.map(asset => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.name}</TableCell>
                  <TableCell><Badge variant="secondary">{assetTypeLabels[asset.asset_type] || asset.asset_type}</Badge></TableCell>
                  <TableCell>${Number(asset.purchase_price).toLocaleString()}</TableCell>
                  <TableCell className="font-medium">${Number(asset.current_value).toLocaleString()}</TableCell>
                  <TableCell>{asset.location || "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(asset.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

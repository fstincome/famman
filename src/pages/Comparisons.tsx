import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import { TrendingUp, TrendingDown, Minus, ArrowLeftRight, Wallet, Receipt, Heart, ClipboardList, Calendar as CalIcon, Rocket } from "lucide-react";
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears, format, isWithinInterval, eachDayOfInterval, eachMonthOfInterval } from "date-fns";
import { fr, enUS } from "date-fns/locale";

const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} BIF`;

type Granularity = "month" | "quarter" | "year";

interface Range { start: Date; end: Date; label: string; }

function computeRanges(g: Granularity, locale: typeof fr): { current: Range; previous: Range } {
  const now = new Date();
  if (g === "month") {
    const cs = startOfMonth(now), ce = endOfMonth(now);
    const ps = startOfMonth(subMonths(now, 1)), pe = endOfMonth(subMonths(now, 1));
    return {
      current: { start: cs, end: ce, label: format(cs, "MMMM yyyy", { locale }) },
      previous: { start: ps, end: pe, label: format(ps, "MMMM yyyy", { locale }) },
    };
  }
  if (g === "quarter") {
    const cs = startOfQuarter(now), ce = endOfQuarter(now);
    const ps = startOfQuarter(subQuarters(now, 1)), pe = endOfQuarter(subQuarters(now, 1));
    return {
      current: { start: cs, end: ce, label: `T${Math.floor(cs.getMonth()/3)+1} ${cs.getFullYear()}` },
      previous: { start: ps, end: pe, label: `T${Math.floor(ps.getMonth()/3)+1} ${ps.getFullYear()}` },
    };
  }
  const cs = startOfYear(now), ce = endOfYear(now);
  const ps = startOfYear(subYears(now, 1)), pe = endOfYear(subYears(now, 1));
  return {
    current: { start: cs, end: ce, label: `${cs.getFullYear()}` },
    previous: { start: ps, end: pe, label: `${ps.getFullYear()}` },
  };
}

function sumIn<T extends { date?: string | null; start_date?: string | null; deadline?: string | null; created_at?: string }>(
  items: T[], range: Range, dateKey: keyof T, amountKey: keyof T
): { total: number; count: number } {
  let total = 0, count = 0;
  for (const it of items) {
    const raw = it[dateKey] as unknown as string | null;
    if (!raw) continue;
    const d = new Date(raw);
    if (isWithinInterval(d, { start: range.start, end: range.end })) {
      total += Number(it[amountKey] ?? 0);
      count += 1;
    }
  }
  return { total, count };
}

function Delta({ current, previous, invert = false }: { current: number; previous: number; invert?: boolean }) {
  if (previous === 0 && current === 0) return <span className="text-muted-foreground text-xs flex items-center gap-1"><Minus className="w-3 h-3" />0%</span>;
  if (previous === 0) return <span className="text-xs text-blue-500">{current > 0 ? "+∞" : "0"}</span>;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const positive = pct >= 0;
  // For expenses we invert: increase = bad
  const good = invert ? !positive : positive;
  const Icon = pct === 0 ? Minus : positive ? TrendingUp : TrendingDown;
  const color = pct === 0 ? "text-muted-foreground" : good ? "text-green-500" : "text-red-500";
  return (
    <span className={`text-xs font-medium flex items-center gap-1 ${color}`}>
      <Icon className="w-3 h-3" />
      {positive ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

interface KPIProps { title: string; icon: any; current: number; previous: number; invert?: boolean; formatter?: (n: number) => string; }
function KPI({ title, icon: Icon, current, previous, invert, formatter = fmt }: KPIProps) {
  const diff = current - previous;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-2xl font-bold">{formatter(current)}</div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Préc.: {formatter(previous)}</span>
          <Delta current={current} previous={previous} invert={invert} />
        </div>
        <div className="text-xs text-muted-foreground">
          Écart: <span className={diff >= 0 ? (invert ? "text-red-500" : "text-green-500") : (invert ? "text-green-500" : "text-red-500")}>
            {diff >= 0 ? "+" : ""}{formatter(diff)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Comparisons() {
  const { language } = useLanguage();
  const locale = language === "fr" ? fr : enUS;
  const [gran, setGran] = useState<Granularity>("month");

  const { current, previous } = useMemo(() => computeRanges(gran, locale), [gran, locale]);

  const { data: income = [] } = useQuery({
    queryKey: ["cmp-income"],
    queryFn: async () => {
      const { data: cid } = await supabase.rpc("get_user_company_id");
      if (!cid) return [];
      const { data } = await supabase.from("income_records").select("*").eq("company_id", cid);
      return data || [];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["cmp-expenses"],
    queryFn: async () => {
      const { data: cid } = await supabase.rpc("get_user_company_id");
      if (!cid) return [];
      const { data } = await supabase.from("expense_records").select("*").eq("company_id", cid);
      return data || [];
    },
  });

  const { data: needs = [] } = useQuery({
    queryKey: ["cmp-needs"],
    queryFn: async () => {
      const { data: cid } = await supabase.rpc("get_user_company_id");
      if (!cid) return [];
      const { data } = await supabase.from("family_needs").select("*").eq("company_id", cid);
      return data || [];
    },
  });

  const { data: health = [] } = useQuery({
    queryKey: ["cmp-health"],
    queryFn: async () => {
      const { data: cid } = await supabase.rpc("get_user_company_id");
      if (!cid) return [];
      const { data } = await supabase.from("family_health").select("*").eq("company_id", cid);
      return data || [];
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["cmp-events"],
    queryFn: async () => {
      const { data: cid } = await supabase.rpc("get_user_company_id");
      if (!cid) return [];
      const { data } = await supabase.from("family_events").select("*").eq("company_id", cid);
      return data || [];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["cmp-projects"],
    queryFn: async () => {
      const { data: cid } = await supabase.rpc("get_user_company_id");
      if (!cid) return [];
      const { data } = await supabase.from("family_projects").select("*").eq("company_id", cid);
      return data || [];
    },
  });

  const incCur = sumIn(income as any, current, "date", "amount");
  const incPrev = sumIn(income as any, previous, "date", "amount");
  const expCur = sumIn(expenses as any, current, "date", "amount");
  const expPrev = sumIn(expenses as any, previous, "date", "amount");
  const needCur = sumIn(needs as any, current, "created_at", "estimated_price");
  const needPrev = sumIn(needs as any, previous, "created_at", "estimated_price");
  const heaCur = sumIn(health as any, current, "date", "amount");
  const heaPrev = sumIn(health as any, previous, "date", "amount");
  const evCur = sumIn(events as any, current, "start_date", "actual_cost");
  const evPrev = sumIn(events as any, previous, "start_date", "actual_cost");
  const prjCur = sumIn(projects as any, current, "deadline", "spent");
  const prjPrev = sumIn(projects as any, previous, "deadline", "spent");

  const savingsCur = incCur.total - expCur.total;
  const savingsPrev = incPrev.total - expPrev.total;

  // Side-by-side category breakdown for expenses
  const categoryData = useMemo(() => {
    const cats = new Map<string, { current: number; previous: number }>();
    for (const e of expenses as any[]) {
      if (!e.date) continue;
      const d = new Date(e.date);
      const cat = e.category || "Autre";
      if (!cats.has(cat)) cats.set(cat, { current: 0, previous: 0 });
      const bucket = cats.get(cat)!;
      if (isWithinInterval(d, { start: current.start, end: current.end })) bucket.current += Number(e.amount || 0);
      if (isWithinInterval(d, { start: previous.start, end: previous.end })) bucket.previous += Number(e.amount || 0);
    }
    return Array.from(cats.entries())
      .map(([category, v]) => ({ category, ...v }))
      .filter(r => r.current > 0 || r.previous > 0)
      .sort((a, b) => (b.current + b.previous) - (a.current + a.previous))
      .slice(0, 10);
  }, [expenses, current, previous]);

  // Timeline within period (daily for month, monthly for year, weekly-ish for quarter)
  const timelineData = useMemo(() => {
    const buckets = gran === "year"
      ? eachMonthOfInterval({ start: current.start, end: current.end })
      : eachDayOfInterval({ start: current.start, end: current.end });

    return buckets.map((d, idx) => {
      const next = idx < buckets.length - 1 ? buckets[idx + 1] : current.end;
      const offsetMs = d.getTime() - current.start.getTime();
      const prevDate = new Date(previous.start.getTime() + offsetMs);
      const prevNext = idx < buckets.length - 1
        ? new Date(previous.start.getTime() + (buckets[idx + 1].getTime() - current.start.getTime()))
        : previous.end;

      const sumExp = (records: any[], a: Date, b: Date) => records
        .filter(r => r.date && new Date(r.date) >= a && new Date(r.date) < b)
        .reduce((s, r) => s + Number(r.amount || 0), 0);

      return {
        label: gran === "year" ? format(d, "MMM", { locale }) : format(d, "d MMM", { locale }),
        current: sumExp(expenses as any[], d, next),
        previous: sumExp(expenses as any[], prevDate, prevNext),
      };
    });
  }, [expenses, current, previous, gran, locale]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-primary" />
            Comparaisons période sur période
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            <Badge variant="outline" className="mr-2">{current.label}</Badge>
            vs
            <Badge variant="outline" className="ml-2">{previous.label}</Badge>
          </p>
        </div>
        <Select value={gran} onValueChange={(v) => setGran(v as Granularity)}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Mois vs mois précédent</SelectItem>
            <SelectItem value="quarter">Trimestre vs précédent</SelectItem>
            <SelectItem value="year">Année N vs N-1</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI title="Revenus" icon={Wallet} current={incCur.total} previous={incPrev.total} />
        <KPI title="Dépenses" icon={Receipt} current={expCur.total} previous={expPrev.total} invert />
        <KPI title="Épargne nette" icon={TrendingUp} current={savingsCur} previous={savingsPrev} />
        <KPI title="Coût santé" icon={Heart} current={heaCur.total} previous={heaPrev.total} invert />
        <KPI title="Besoins enregistrés" icon={ClipboardList} current={needCur.total} previous={needPrev.total} invert />
        <KPI title="Coût événements" icon={CalIcon} current={evCur.total} previous={evPrev.total} invert />
        <KPI title="Dépenses projets" icon={Rocket} current={prjCur.total} previous={prjPrev.total} invert />
        <KPI title="Nb transactions" icon={Receipt} current={expCur.count + incCur.count} previous={expPrev.count + incPrev.count} formatter={(n) => `${n}`} />
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Évolution des dépenses — {gran === "year" ? "par mois" : "par jour"}</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="label" className="text-xs" />
              <YAxis className="text-xs" tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Line type="monotone" dataKey="current" name={current.label} stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="previous" name={previous.label} stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dépenses par catégorie — comparaison</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px]">
          {categoryData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Aucune dépense sur les deux périodes.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" className="text-xs" tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <YAxis dataKey="category" type="category" className="text-xs" width={100} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend />
                <Bar dataKey="previous" name={previous.label} fill="#94a3b8" radius={[0, 4, 4, 0]} />
                <Bar dataKey="current" name={current.label} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Summary table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tableau récapitulatif</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs uppercase">
                  <th className="text-left py-2 px-2">Indicateur</th>
                  <th className="text-right py-2 px-2">{previous.label}</th>
                  <th className="text-right py-2 px-2">{current.label}</th>
                  <th className="text-right py-2 px-2">Écart</th>
                  <th className="text-right py-2 px-2">Variation</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Revenus", cur: incCur.total, prev: incPrev.total, invert: false },
                  { label: "Dépenses", cur: expCur.total, prev: expPrev.total, invert: true },
                  { label: "Épargne nette", cur: savingsCur, prev: savingsPrev, invert: false },
                  { label: "Santé", cur: heaCur.total, prev: heaPrev.total, invert: true },
                  { label: "Besoins", cur: needCur.total, prev: needPrev.total, invert: true },
                  { label: "Événements", cur: evCur.total, prev: evPrev.total, invert: true },
                  { label: "Projets", cur: prjCur.total, prev: prjPrev.total, invert: true },
                ].map((row) => (
                  <tr key={row.label} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 px-2 font-medium">{row.label}</td>
                    <td className="py-2 px-2 text-right text-muted-foreground">{fmt(row.prev)}</td>
                    <td className="py-2 px-2 text-right font-semibold">{fmt(row.cur)}</td>
                    <td className={`py-2 px-2 text-right ${(row.cur - row.prev) >= 0 ? (row.invert ? "text-red-500" : "text-green-500") : (row.invert ? "text-green-500" : "text-red-500")}`}>
                      {row.cur - row.prev >= 0 ? "+" : ""}{fmt(row.cur - row.prev)}
                    </td>
                    <td className="py-2 px-2 text-right"><Delta current={row.cur} previous={row.prev} invert={row.invert} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

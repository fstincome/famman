import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import { HandCoins, Edit, Target, CalendarClock, TrendingUp, CheckCircle2, Circle, Trash2 } from "lucide-react";

export type DetailGoal = {
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

export type DetailContribution = {
  id: string;
  goal_id: string;
  amount: number;
  date: string;
  note: string | null;
  contributor: string | null;
};

interface Props {
  goal: DetailGoal | null;
  contributions: DetailContribution[];
  categoryLabel: string;
  statusBadge: { label: string; color: string };
  priorityBadge: { label: string; color: string };
  onClose: () => void;
  onContribute: (goal: DetailGoal) => void;
  onEdit: (goal: DetailGoal) => void;
  onDeleteContribution: (c: DetailContribution) => void;
}

const fmt = (n: number) => Number(n || 0).toLocaleString("fr-FR");
const dt = (d: string) => new Date(d).toLocaleDateString("fr-FR");

export function SavingsGoalDetail({
  goal,
  contributions,
  categoryLabel,
  statusBadge,
  priorityBadge,
  onClose,
  onContribute,
  onEdit,
  onDeleteContribution,
}: Props) {
  const target = Number(goal?.target_amount || 0);
  const current = Number(goal?.current_amount || 0);
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const remaining = Math.max(0, target - current);

  const list = goal ? contributions.filter((c) => c.goal_id === goal.id) : [];
  const accumulated = list.reduce((s, c) => s + Number(c.amount), 0);
  const avg = list.length ? accumulated / list.length : 0;
  const lastDate = list.length
    ? list.map((c) => c.date).sort((a, b) => b.localeCompare(a))[0]
    : null;

  // Prochaines étapes
  const today = new Date();
  let monthsLeft: number | null = null;
  if (goal?.target_date) {
    const td = new Date(goal.target_date);
    monthsLeft = Math.max(
      0,
      (td.getFullYear() - today.getFullYear()) * 12 + (td.getMonth() - today.getMonth())
    );
  }
  const monthlyNeeded = monthsLeft && monthsLeft > 0 ? remaining / monthsLeft : remaining;
  const isLate = goal?.target_date ? new Date(goal.target_date) < today && remaining > 0 : false;

  const milestones = [25, 50, 75, 100].map((m) => ({
    m,
    amount: (target * m) / 100,
    reached: pct >= m,
  }));

  return (
    <Sheet open={!!goal} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {goal && (
          <>
            <SheetHeader className="text-left">
              <SheetTitle className="text-xl">{goal.name}</SheetTitle>
              <SheetDescription>
                {categoryLabel}
                {goal.target_date && ` • échéance ${dt(goal.target_date)}`}
                {` • créé le ${dt(goal.created_at)}`}
              </SheetDescription>
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge className={statusBadge.color}>{statusBadge.label}</Badge>
                <Badge variant="outline" className={priorityBadge.color}>{priorityBadge.label}</Badge>
                {isLate && <Badge variant="destructive">En retard</Badge>}
              </div>
            </SheetHeader>

            {goal.description && (
              <p className="text-sm text-muted-foreground mt-4">{goal.description}</p>
            )}

            {/* Progression */}
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">{fmt(current)} {goal.currency}</span>
                <span className="text-muted-foreground">/ {fmt(target)} {goal.currency}</span>
              </div>
              <Progress value={pct} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{pct.toFixed(1)}% atteint</span>
                <span>Reste {fmt(remaining)} {goal.currency}</span>
              </div>
            </div>

            {/* Totaux */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Target className="w-3.5 h-3.5" />Total accumulé
                </div>
                <p className="text-lg font-bold mt-1">{fmt(accumulated)} {goal.currency}</p>
                <p className="text-xs text-muted-foreground">{list.length} contribution(s)</p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <TrendingUp className="w-3.5 h-3.5" />Contribution moyenne
                </div>
                <p className="text-lg font-bold mt-1">{fmt(Math.round(avg))} {goal.currency}</p>
                <p className="text-xs text-muted-foreground">
                  {lastDate ? `Dernière : ${dt(lastDate)}` : "Aucune contribution"}
                </p>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Prochaines étapes */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <CalendarClock className="w-4 h-4" />Prochaines étapes
              </h3>
              {remaining === 0 ? (
                <p className="text-sm text-green-600 dark:text-green-400">
                  🎉 Objectif atteint ! Vous pouvez le marquer comme « Atteint » ou en créer un nouveau.
                </p>
              ) : (
                <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                  <li>
                    Il reste <strong className="text-foreground">{fmt(remaining)} {goal.currency}</strong> à épargner.
                  </li>
                  {monthsLeft !== null && monthsLeft > 0 && (
                    <li>
                      Épargnez <strong className="text-foreground">{fmt(Math.ceil(monthlyNeeded))} {goal.currency}</strong>/mois
                      pendant {monthsLeft} mois pour tenir l'échéance.
                    </li>
                  )}
                  {monthsLeft === 0 && goal.target_date && (
                    <li>L'échéance est atteinte : ajustez la date cible ou versez le solde restant.</li>
                  )}
                  {monthsLeft === null && (
                    <li>Aucune date cible définie — ajoutez-en une pour calculer un rythme mensuel.</li>
                  )}
                  {avg > 0 && (
                    <li>
                      À votre rythme actuel ({fmt(Math.round(avg))} {goal.currency}/contribution), il faut environ{" "}
                      <strong className="text-foreground">{Math.ceil(remaining / avg)}</strong> contribution(s).
                    </li>
                  )}
                </ul>
              )}

              <div className="space-y-2 pt-2">
                {milestones.map((ms) => (
                  <div key={ms.m} className="flex items-center gap-2 text-sm">
                    {ms.reached ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className={ms.reached ? "text-foreground" : "text-muted-foreground"}>
                      Palier {ms.m}% — {fmt(Math.round(ms.amount))} {goal.currency}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="my-6" />

            {/* Historique */}
            <div className="space-y-3">
              <h3 className="font-semibold">Historique des contributions</h3>
              <DataTable
                data={list}
                columns={[
                  { key: "date", header: "Date", render: (c) => dt(c.date), getValue: (c) => c.date },
                  {
                    key: "amount",
                    header: "Montant",
                    className: "text-right",
                    render: (c) => <span className="font-semibold">{fmt(Number(c.amount))}</span>,
                    getValue: (c) => Number(c.amount),
                  },
                  { key: "contributor", header: "Par", render: (c) => c.contributor || "—" },
                  { key: "note", header: "Note", render: (c) => c.note || "—" },
                  {
                    key: "actions",
                    header: "",
                    sortable: false,
                    searchable: false,
                    className: "text-right",
                    render: (c) => (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDeleteContribution(c)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    ),
                  },
                ] as DataTableColumn<DetailContribution>[]}
                pageSize={5}
                searchPlaceholder="Rechercher..."
                emptyMessage="Aucune contribution pour cet objectif"
              />
            </div>

            <div className="flex gap-2 mt-6">
              <Button className="flex-1" onClick={() => onContribute(goal)}>
                <HandCoins className="w-4 h-4 mr-2" />Contribuer
              </Button>
              <Button variant="outline" onClick={() => onEdit(goal)}>
                <Edit className="w-4 h-4 mr-2" />Modifier
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

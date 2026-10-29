import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { CheckCircle2, XCircle, RefreshCw, Mail } from "lucide-react";

type Delivery = {
  id: string;
  batch_id: string;
  subject: string;
  recipient_email: string;
  recipient_name: string | null;
  status: string;
  error_message: string | null;
  triggered_by: string | null;
  created_at: string;
};

const PAGE = 5;

export function NotificationDeliveryLog() {
  const [filter, setFilter] = useState<"all" | "sent" | "failed">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["notification-deliveries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_deliveries")
        .select("id, batch_id, subject, recipient_email, recipient_name, status, error_message, triggered_by, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as Delivery[];
    },
    refetchInterval: 30000,
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter(
      (d) =>
        (filter === "all" || d.status === filter) &&
        (!q || [d.subject, d.recipient_email, d.recipient_name, d.triggered_by].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [data, filter, search]);

  const sent = data.filter((d) => d.status === "sent").length;
  const failed = data.length - sent;
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const view = rows.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5" />Journal d'envoi des notifications</CardTitle>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />Actualiser
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(["all", "sent", "failed"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => { setFilter(f); setPage(0); }}>
              {f === "all" ? `Tous (${data.length})` : f === "sent" ? `Reçus (${sent})` : `Échecs (${failed})`}
            </Button>
          ))}
          <Input className="max-w-xs ml-auto" placeholder="Rechercher…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Notification</TableHead>
                <TableHead>Destinataire</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Chargement…</TableCell></TableRow>
              ) : view.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Aucun envoi enregistré</TableCell></TableRow>
              ) : view.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="whitespace-nowrap text-sm">{format(new Date(d.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                  <TableCell className="text-sm">
                    <div className="font-medium">{d.subject}</div>
                    {d.triggered_by && <div className="text-xs text-muted-foreground">par {d.triggered_by}</div>}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{d.recipient_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{d.recipient_email}</div>
                  </TableCell>
                  <TableCell>
                    {d.status === "sent" ? (
                      <Badge variant="secondary" className="gap-1"><CheckCircle2 className="w-3 h-3 text-primary" />Reçu</Badge>
                    ) : (
                      <div className="space-y-1">
                        <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Échec</Badge>
                        {d.error_message && <div className="text-xs text-destructive max-w-xs break-words">{d.error_message}</div>}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page + 1} / {pages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Précédent</Button>
            <Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Suivant</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

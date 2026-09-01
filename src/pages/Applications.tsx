import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import { Plus, Trash2, Edit, FileText, Eye, Upload, Download, CheckCircle2, Clock, XCircle, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { logAndNotify } from "@/hooks/useActivityLogger";

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Brouillon", color: "bg-muted text-muted-foreground" },
  submitted: { label: "Soumis", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  in_review: { label: "En cours d'examen", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  interview: { label: "Entretien / Test", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  accepted: { label: "Accepté ✓", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  rejected: { label: "Refusé", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  expired: { label: "Expiré / Sans réponse", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
};

const applicantTypeConfig: Record<string, { label: string; short: string }> = {
  self: { label: "À titre personnel (moi-même)", short: "Personnel" },
  organization: { label: "Au nom d'une organisation", short: "Organisation" },
  company: { label: "Au nom d'une entreprise", short: "Entreprise" },
};

type Application = {
  id: string;
  company_id: string;
  title: string;
  organization: string | null;
  applicant_type: string;
  applicant_name: string | null;
  submission_date: string;
  deadline: string | null;
  status: string;
  result_note: string | null;
  description: string | null;
  created_at: string;
};

type AppDoc = {
  id: string;
  application_id: string;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
};

const defaultForm = {
  title: "",
  organization: "",
  applicant_type: "self",
  applicant_name: "",
  submission_date: new Date().toISOString().slice(0, 10),
  deadline: "",
  status: "submitted",
  result_note: "",
  description: "",
};


export default function Applications() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [filter, setFilter] = useState("all");
  const [detail, setDetail] = useState<Application | null>(null);
  const [preview, setPreview] = useState<{ url: string; doc: AppDoc } | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      return data;
    },
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications" as any)
        .select("*")
        .order("submission_date", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Application[];
    },
    enabled: !!profile,
  });

  const { data: docs = [] } = useQuery({
    queryKey: ["application_documents", detail?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_documents" as any)
        .select("*")
        .eq("application_id", detail!.id as any)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as AppDoc[];
    },
    enabled: !!detail?.id,
  });

  const { data: docCounts = {} } = useQuery({
    queryKey: ["application_documents_counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("application_documents" as any).select("application_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of (data || []) as any[]) counts[row.application_id] = (counts[row.application_id] || 0) + 1;
      return counts;
    },
    enabled: !!profile,
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      const payload: any = {
        title: values.title,
        organization: values.organization || null,
        applicant_type: values.applicant_type,
        applicant_name: values.applicant_type === "self" ? null : values.applicant_name || null,
        submission_date: values.submission_date,
        deadline: values.deadline || null,

        status: values.status,
        result_note: values.result_note || null,
        description: values.description || null,
        company_id: profile?.company_id,
      };
      if (values.id) {
        const { error } = await supabase.from("applications" as any).update(payload).eq("id", values.id as any);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("applications" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      const action = editing ? "update" : "create";
      logAndNotify(
        { action, entity_type: "application", entity_id: editing?.id, entity_name: form.title, details: { status: form.status } },
        {
          title: action === "create" ? "📄 Candidature enregistrée" : "✏️ Candidature modifiée",
          message: `${form.title} — ${statusConfig[form.status]?.label || form.status}`,
          type: "info",
        }
      );
      toast({ title: editing ? "Candidature mise à jour" : "Candidature enregistrée" });
      setDialogOpen(false);
      setEditing(null);
      setForm(defaultForm);
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("applications" as any).update({ status } as any).eq("id", id as any);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      const item = applications.find(a => a.id === vars.id);
      setDetail(d => (d && d.id === vars.id ? { ...d, status: vars.status } : d));
      logAndNotify(
        { action: "update", entity_type: "application", entity_id: vars.id, entity_name: item?.title, details: { status: vars.status } },
        { title: "🔄 Statut mis à jour", message: `${item?.title} → ${statusConfig[vars.status]?.label}`, type: "info" }
      );
      toast({ title: "Statut mis à jour" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: files } = await supabase.from("application_documents" as any).select("file_path").eq("application_id", id as any);
      const paths = ((files || []) as any[]).map(f => f.file_path);
      if (paths.length) await supabase.storage.from("application-docs").remove(paths);
      const { error } = await supabase.from("applications" as any).delete().eq("id", id as any);
      if (error) throw error;
    },
    onSuccess: (_d, id) => {
      const item = applications.find(a => a.id === id);
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["application_documents_counts"] });
      setDetail(null);
      logAndNotify(
        { action: "delete", entity_type: "application", entity_id: id, entity_name: item?.title },
        { title: "🗑️ Candidature supprimée", message: item?.title || "Supprimée", type: "warning" }
      );
      toast({ title: "Candidature supprimée" });
    },
  });

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length || !detail || !profile?.company_id) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const safeName = file.name.replace(/[^\w.\-]/g, "_");
        const path = `${profile.company_id}/${detail.id}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage.from("application-docs").upload(path, file);
        if (upErr) throw upErr;
        const { error } = await supabase.from("application_documents" as any).insert({
          application_id: detail.id,
          company_id: profile.company_id,
          file_name: file.name,
          file_path: path,
          mime_type: file.type || null,
          file_size: file.size,
        } as any);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["application_documents", detail.id] });
      queryClient.invalidateQueries({ queryKey: ["application_documents_counts"] });
      logAndNotify(
        { action: "create", entity_type: "application_document", entity_id: detail.id, entity_name: detail.title, details: { files: files.length } },
        { title: "📎 Document(s) ajouté(s)", message: `${files.length} fichier(s) — ${detail.title}`, type: "success" }
      );
      toast({ title: "Document(s) téléversé(s)" });
    } catch (e: any) {
      toast({ title: "Erreur de téléversement", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const deleteDoc = async (doc: AppDoc) => {
    await supabase.storage.from("application-docs").remove([doc.file_path]);
    const { error } = await supabase.from("application_documents" as any).delete().eq("id", doc.id as any);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["application_documents", detail?.id] });
    queryClient.invalidateQueries({ queryKey: ["application_documents_counts"] });
    toast({ title: "Document supprimé" });
  };

  const openPreview = async (doc: AppDoc) => {
    const { data, error } = await supabase.storage.from("application-docs").createSignedUrl(doc.file_path, 600);
    if (error || !data) {
      toast({ title: "Impossible d'ouvrir le document", variant: "destructive" });
      return;
    }
    setPreview({ url: data.signedUrl, doc });
  };

  const openEdit = (app: Application) => {
    setEditing(app);
    setForm({
      title: app.title,
      organization: app.organization || "",
      applicant_type: app.applicant_type || "self",
      applicant_name: app.applicant_name || "",
      submission_date: app.submission_date,
      deadline: app.deadline || "",
      status: app.status,
      result_note: app.result_note || "",
      description: app.description || "",
    });

    setDialogOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  
  const deadlineStatus = (a: Application) => {
    if (!a.deadline) return "none";
    const days = Math.ceil((new Date(a.deadline).getTime() - Date.now()) / 86400000);
    if (days < 0) return "overdue";
    if (days <= 14) return "soon";
    return "later";
  };

  const applicantOptions = Array.from(
    new Set(applications.filter(a => a.applicant_type !== "self" && a.applicant_name).map(a => a.applicant_name as string))
  ).sort();

  const filtered = applications.filter(a => {
    if (filter !== "all" && a.status !== filter) return false;
    if (dateFrom && a.submission_date < dateFrom) return false;
    if (dateTo && a.submission_date > dateTo) return false;
    if (deadlineFilter !== "all" && deadlineStatus(a) !== deadlineFilter) return false;
    if (applicantFilter === "self" && a.applicant_type !== "self") return false;
    if (applicantFilter !== "all" && applicantFilter !== "self" && a.applicant_name !== applicantFilter) return false;
    return true;
  });

  const sortedData = [...filtered].sort((a, b) => {
    if (sortMode === "deadline_asc") {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    }
    if (sortMode === "submission_asc") return a.submission_date.localeCompare(b.submission_date);
    return b.submission_date.localeCompare(a.submission_date);
  });

  const advancedActive = !!dateFrom || !!dateTo || deadlineFilter !== "all" || applicantFilter !== "all";
  const resetAdvanced = () => {
    setDateFrom("");
    setDateTo("");
    setDeadlineFilter("all");
    setApplicantFilter("all");
    setSortMode("submission_desc");
  };

  const count = (s: string) => applications.filter(a => a.status === s).length;

  const pendingCount = applications.filter(a => ["submitted", "in_review", "interview"].includes(a.status)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Candidatures & dossiers soumis</h1>
          <p className="text-muted-foreground">Historique de vos soumissions, documents joints et suivi des résultats</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nouvelle candidature</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { icon: Send, label: "Total soumis", value: applications.length, wrap: "bg-blue-100 dark:bg-blue-900", ic: "text-blue-600" },
          { icon: Clock, label: "En attente de réponse", value: pendingCount, wrap: "bg-yellow-100 dark:bg-yellow-900", ic: "text-yellow-600" },
          { icon: CheckCircle2, label: "Acceptées", value: count("accepted"), wrap: "bg-green-100 dark:bg-green-900", ic: "text-green-600" },
          { icon: XCircle, label: "Refusées", value: count("rejected"), wrap: "bg-red-100 dark:bg-red-900", ic: "text-red-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${s.wrap}`}>
                  <s.icon className={`w-5 h-5 ${s.ic}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold">{s.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>Toutes</Button>
        {Object.entries(statusConfig).map(([k, v]) => (
          <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}>{v.label}</Button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            data={filtered}
            columns={[
              {
                key: "title", header: "Titre", render: (a) => (
                  <div>
                    <p className="font-medium">{a.title}</p>
                    {a.organization && <p className="text-xs text-muted-foreground">{a.organization}</p>}
                  </div>
                ),
              },
              { key: "submission_date", header: "Soumission", render: (a) => new Date(a.submission_date).toLocaleDateString("fr-FR"), getValue: (a) => a.submission_date },
              {
                key: "deadline", header: "Deadline", getValue: (a) => a.deadline || "",
                render: (a) => a.deadline
                  ? <span className={new Date(a.deadline) < new Date() ? "text-destructive" : ""}>{new Date(a.deadline).toLocaleDateString("fr-FR")}</span>
                  : "—",
              },
              {
                key: "documents", header: "Documents", sortable: false, searchable: false,
                render: (a) => (
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4" />{docCounts[a.id] || 0}
                  </span>
                ),
              },
              {
                key: "status", header: "Statut", render: (a) => (
                  <Select value={a.status} onValueChange={(v) => statusMutation.mutate({ id: a.id, status: v })}>
                    <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ),
              },
              {
                key: "actions", header: "Actions", sortable: false, searchable: false, className: "text-right",
                render: (a) => (
                  <div className="flex gap-1 justify-end">
                    <Button size="sm" variant="ghost" title="Voir / documents" onClick={() => setDetail(a)}><Eye className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(a)}><Edit className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(a.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ),
              },
            ] as DataTableColumn<Application>[]}
            pageSize={5}
            searchPlaceholder="Rechercher une candidature..."
            emptyMessage="Aucune candidature enregistrée"
          />
        </CardContent>
      </Card>

      {/* Form dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la candidature" : "Nouvelle candidature"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titre *</Label>
              <Input placeholder="Ex: Bourse Mastercard Foundation" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Organisme / Institution</Label>
              <Input placeholder="Ex: Université de Nairobi" value={form.organization} onChange={e => setForm({ ...form, organization: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date de soumission *</Label>
                <Input type="date" value={form.submission_date} onChange={e => setForm({ ...form, submission_date: e.target.value })} />
              </div>
              <div>
                <Label>Deadline</Label>
                <Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea placeholder="Détails de la candidature..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Note de résultat / suivi</Label>
              <Textarea placeholder="Réponse reçue, prochaines étapes..." value={form.result_note} onChange={e => setForm({ ...form, result_note: e.target.value })} />
            </div>
            {!editing && <p className="text-xs text-muted-foreground">Les documents pourront être téléversés après l'enregistrement, via le bouton « Voir ».</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button disabled={!form.title || !form.submission_date} onClick={() => upsertMutation.mutate({ ...form, id: editing?.id })}>
              {editing ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail + documents dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.title}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Organisme</p><p className="font-medium">{detail.organization || "—"}</p></div>
                <div><p className="text-muted-foreground">Statut</p><Badge className={statusConfig[detail.status]?.color}>{statusConfig[detail.status]?.label}</Badge></div>
                <div><p className="text-muted-foreground">Soumis le</p><p className="font-medium">{new Date(detail.submission_date).toLocaleDateString("fr-FR")}</p></div>
                <div><p className="text-muted-foreground">Deadline</p><p className="font-medium">{detail.deadline ? new Date(detail.deadline).toLocaleDateString("fr-FR") : "—"}</p></div>
              </div>
              {detail.description && <div><p className="text-sm text-muted-foreground">Description</p><p className="text-sm">{detail.description}</p></div>}
              {detail.result_note && <div><p className="text-sm text-muted-foreground">Note de résultat</p><p className="text-sm">{detail.result_note}</p></div>}

              <div>
                <Label>Changer le statut</Label>
                <Select value={detail.status} onValueChange={(v) => statusMutation.mutate({ id: detail.id, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Documents soumis ({docs.length})</p>
                  <label>
                    <input type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
                    <Button size="sm" variant="outline" disabled={uploading} asChild>
                      <span className="cursor-pointer"><Upload className="w-4 h-4 mr-2" />{uploading ? "Envoi..." : "Téléverser"}</span>
                    </Button>
                  </label>
                </div>
                {docs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun document joint.</p>
                ) : (
                  <div className="space-y-2">
                    {docs.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between gap-2 border rounded-md p-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm truncate">{doc.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} Ko` : ""} · {new Date(doc.created_at).toLocaleDateString("fr-FR")}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => openPreview(doc)} title="Visualiser"><Eye className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteDoc(doc)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Document preview modal */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{preview?.doc.file_name}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-3">
              <div className="h-[65vh] w-full rounded-md border overflow-hidden bg-muted/30 flex items-center justify-center">
                {preview.doc.mime_type?.startsWith("image/") ? (
                  <img src={preview.url} alt={preview.doc.file_name} className="max-h-full max-w-full object-contain" />
                ) : preview.doc.mime_type === "application/pdf" ? (
                  <iframe src={preview.url} title={preview.doc.file_name} className="w-full h-full" />
                ) : (
                  <div className="text-center p-6 space-y-3">
                    <FileText className="w-10 h-10 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Aperçu non disponible pour ce type de fichier.</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <Button asChild variant="outline">
                  <a href={preview.url} target="_blank" rel="noreferrer" download={preview.doc.file_name}>
                    <Download className="w-4 h-4 mr-2" />Télécharger
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

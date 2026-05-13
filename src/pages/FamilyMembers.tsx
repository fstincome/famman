import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2, Eye, Users } from "lucide-react";
import { useFamilyMembers, FamilyMember } from "@/hooks/useFamilyMembers";
import { FamilyMemberForm } from "@/components/FamilyMemberForm";
import { FamilyMemberDetails } from "@/components/FamilyMemberDetails";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function FamilyMembers() {
  const { members, isLoading, create, update, remove } = useFamilyMembers();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editing, setEditing] = useState<FamilyMember | undefined>();
  const [viewing, setViewing] = useState<FamilyMember | null>(null);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return [m.first_name, m.last_name, m.nickname, m.profession, m.family_role]
      .filter(Boolean).some((v) => (v as string).toLowerCase().includes(q));
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6" />Membres de la famille</h1>
          <p className="text-sm text-muted-foreground">Annuaire complet : identité, diplômes, parcours, dates importantes</p>
        </div>
        <Button onClick={() => { setEditing(undefined); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />Nouveau membre
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-12">Chargement...</p>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">Aucun membre enregistré</p>
          <Button onClick={() => setFormOpen(true)}><Plus className="w-4 h-4 mr-2" />Ajouter le premier membre</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <Card key={m.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                     style={{ backgroundColor: m.avatar_color || "#6366f1" }}>
                  {m.first_name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{m.first_name} {m.last_name}</div>
                  {m.nickname && <div className="text-xs text-muted-foreground truncate">« {m.nickname} »</div>}
                  <div className="text-xs text-muted-foreground mt-1">
                    {m.family_role && <span className="capitalize">{m.family_role}</span>}
                    {m.profession && <> • {m.profession}</>}
                  </div>
                  {m.birth_date && <div className="text-xs text-muted-foreground">Né(e) le {m.birth_date}</div>}
                  {!m.is_alive && <div className="text-xs text-destructive mt-1">✝ Décédé(e)</div>}
                </div>
              </div>
              <div className="flex justify-end gap-1 mt-3 pt-3 border-t">
                <Button size="icon" variant="ghost" onClick={() => { setViewing(m); setDetailsOpen(true); }}>
                  <Eye className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditing(m); setFormOpen(true); }}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setToDelete(m.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <FamilyMemberForm
        open={formOpen}
        onOpenChange={setFormOpen}
        member={editing}
        onSubmit={(data) => editing ? update.mutate({ id: editing.id, input: data }) : create.mutate(data)}
      />
      <FamilyMemberDetails open={detailsOpen} onOpenChange={setDetailsOpen} member={viewing} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce membre ?</AlertDialogTitle>
            <AlertDialogDescription>Toutes ses données (diplômes, parcours, dates clés) seront définitivement supprimées.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (toDelete) { remove.mutate(toDelete); setToDelete(null); } }}
                               className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

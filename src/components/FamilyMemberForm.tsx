import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FamilyMember, FamilyMemberInput } from "@/hooks/useFamilyMembers";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  member?: FamilyMember;
  onSubmit: (data: Partial<FamilyMemberInput>) => void;
}

const empty: Partial<FamilyMemberInput> = {
  first_name: "", last_name: "", nickname: "", gender: "", family_role: "",
  birth_date: null, birth_place: "", marital_status: "", nationality: "", religion: "",
  blood_type: "", national_id: "", passport_number: "", phone: "", email: "",
  address: "", current_city: "", current_country: "", profession: "", employer: "",
  father_name: "", mother_name: "", spouse_name: "", children_count: 0,
  photo_url: "", biography: "", hobbies: "", notes: "", is_alive: true,
  avatar_color: "#6366f1",
};

export function FamilyMemberForm({ open, onOpenChange, member, onSubmit }: Props) {
  const [data, setData] = useState<Partial<FamilyMemberInput>>(empty);

  useEffect(() => {
    if (open) setData(member ? { ...member } as Partial<FamilyMemberInput> : empty);
  }, [open, member]);

  const set = (k: keyof FamilyMemberInput, v: unknown) => setData((d) => ({ ...d, [k]: v }));

  const handleSubmit = () => {
    if (!data.first_name?.trim()) return;
    onSubmit(data);
    onOpenChange(false);
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{member ? "Modifier le membre" : "Nouveau membre"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          <section>
            <h3 className="text-sm font-semibold mb-3">Identité</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Prénom *"><Input value={data.first_name || ""} onChange={(e) => set("first_name", e.target.value)} /></Field>
              <Field label="Nom"><Input value={data.last_name || ""} onChange={(e) => set("last_name", e.target.value)} /></Field>
              <Field label="Surnom"><Input value={data.nickname || ""} onChange={(e) => set("nickname", e.target.value)} /></Field>
              <Field label="Sexe">
                <Select value={data.gender || ""} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculin</SelectItem>
                    <SelectItem value="female">Féminin</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Rôle familial">
                <Select value={data.family_role || ""} onValueChange={(v) => set("family_role", v)}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {["father","mother","son","daughter","brother","sister","uncle","aunt","grandfather","grandmother","cousin","other"].map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Statut civil">
                <Select value={data.marital_status || ""} onValueChange={(v) => set("marital_status", v)}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Célibataire</SelectItem>
                    <SelectItem value="married">Marié(e)</SelectItem>
                    <SelectItem value="divorced">Divorcé(e)</SelectItem>
                    <SelectItem value="widowed">Veuf/Veuve</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-3">Naissance & origine</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Date de naissance"><Input type="date" value={data.birth_date || ""} onChange={(e) => set("birth_date", e.target.value || null)} /></Field>
              <Field label="Lieu de naissance"><Input value={data.birth_place || ""} onChange={(e) => set("birth_place", e.target.value)} /></Field>
              <Field label="Nationalité"><Input value={data.nationality || ""} onChange={(e) => set("nationality", e.target.value)} /></Field>
              <Field label="Religion"><Input value={data.religion || ""} onChange={(e) => set("religion", e.target.value)} /></Field>
              <Field label="Groupe sanguin"><Input value={data.blood_type || ""} onChange={(e) => set("blood_type", e.target.value)} /></Field>
              <div className="flex items-center justify-between border rounded-md px-3">
                <Label className="text-xs">En vie</Label>
                <Switch checked={data.is_alive ?? true} onCheckedChange={(v) => set("is_alive", v)} />
              </div>
              {!data.is_alive && (
                <Field label="Date de décès"><Input type="date" value={data.death_date || ""} onChange={(e) => set("death_date", e.target.value || null)} /></Field>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-3">Documents officiels</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="N° pièce d'identité"><Input value={data.national_id || ""} onChange={(e) => set("national_id", e.target.value)} /></Field>
              <Field label="N° passeport"><Input value={data.passport_number || ""} onChange={(e) => set("passport_number", e.target.value)} /></Field>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-3">Contact & résidence</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Téléphone"><Input value={data.phone || ""} onChange={(e) => set("phone", e.target.value)} /></Field>
              <Field label="Email"><Input type="email" value={data.email || ""} onChange={(e) => set("email", e.target.value)} /></Field>
              <Field label="Ville actuelle"><Input value={data.current_city || ""} onChange={(e) => set("current_city", e.target.value)} /></Field>
              <Field label="Pays actuel"><Input value={data.current_country || ""} onChange={(e) => set("current_country", e.target.value)} /></Field>
              <div className="md:col-span-3"><Field label="Adresse"><Input value={data.address || ""} onChange={(e) => set("address", e.target.value)} /></Field></div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-3">Profession</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Profession"><Input value={data.profession || ""} onChange={(e) => set("profession", e.target.value)} /></Field>
              <Field label="Employeur"><Input value={data.employer || ""} onChange={(e) => set("employer", e.target.value)} /></Field>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-3">Famille</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Nom du père"><Input value={data.father_name || ""} onChange={(e) => set("father_name", e.target.value)} /></Field>
              <Field label="Nom de la mère"><Input value={data.mother_name || ""} onChange={(e) => set("mother_name", e.target.value)} /></Field>
              <Field label="Nom du conjoint"><Input value={data.spouse_name || ""} onChange={(e) => set("spouse_name", e.target.value)} /></Field>
              <Field label="Nombre d'enfants"><Input type="number" min={0} value={data.children_count ?? 0} onChange={(e) => set("children_count", parseInt(e.target.value) || 0)} /></Field>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-3">Biographie & notes</h3>
            <div className="space-y-3">
              <Field label="Photo (URL)"><Input value={data.photo_url || ""} onChange={(e) => set("photo_url", e.target.value)} /></Field>
              <Field label="Biographie"><Textarea rows={3} value={data.biography || ""} onChange={(e) => set("biography", e.target.value)} /></Field>
              <Field label="Loisirs"><Textarea rows={2} value={data.hobbies || ""} onChange={(e) => set("hobbies", e.target.value)} /></Field>
              <Field label="Notes"><Textarea rows={2} value={data.notes || ""} onChange={(e) => set("notes", e.target.value)} /></Field>
            </div>
          </section>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button onClick={handleSubmit}>{member ? "Mettre à jour" : "Créer"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

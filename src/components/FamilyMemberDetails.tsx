import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Trash2, Plus, GraduationCap, Briefcase, Calendar, User } from "lucide-react";
import { FamilyMember, useMemberEducation, useMemberCareer, useMemberMilestones } from "@/hooks/useFamilyMembers";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  member: FamilyMember | null;
}

export function FamilyMemberDetails({ open, onOpenChange, member }: Props) {
  if (!member) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: member.avatar_color || "#6366f1" }}>
              {member.first_name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div>{member.first_name} {member.last_name}</div>
              {member.nickname && <div className="text-xs text-muted-foreground font-normal">« {member.nickname} »</div>}
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="mt-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="profile"><User className="w-4 h-4 mr-1" />Profil</TabsTrigger>
            <TabsTrigger value="education"><GraduationCap className="w-4 h-4 mr-1" />Diplômes</TabsTrigger>
            <TabsTrigger value="career"><Briefcase className="w-4 h-4 mr-1" />Parcours</TabsTrigger>
            <TabsTrigger value="milestones"><Calendar className="w-4 h-4 mr-1" />Dates clés</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileTab member={member} />
          </TabsContent>
          <TabsContent value="education">
            <EducationTab memberId={member.id} />
          </TabsContent>
          <TabsContent value="career">
            <CareerTab memberId={member.id} />
          </TabsContent>
          <TabsContent value="milestones">
            <MilestonesTab memberId={member.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-right">{value}</span>
    </div>
  );
}

function ProfileTab({ member }: { member: FamilyMember }) {
  return (
    <div className="grid md:grid-cols-2 gap-4 mt-4">
      <Card className="p-4">
        <h4 className="text-sm font-semibold mb-2">Identité</h4>
        <Row label="Sexe" value={member.gender} />
        <Row label="Rôle familial" value={member.family_role} />
        <Row label="Statut civil" value={member.marital_status} />
        <Row label="Nationalité" value={member.nationality} />
        <Row label="Religion" value={member.religion} />
        <Row label="Groupe sanguin" value={member.blood_type} />
        <Row label="En vie" value={member.is_alive ? "Oui" : "Non"} />
        {!member.is_alive && <Row label="Date de décès" value={member.death_date} />}
      </Card>
      <Card className="p-4">
        <h4 className="text-sm font-semibold mb-2">Naissance</h4>
        <Row label="Date" value={member.birth_date} />
        <Row label="Lieu" value={member.birth_place} />
        <h4 className="text-sm font-semibold mt-4 mb-2">Documents</h4>
        <Row label="Pièce d'identité" value={member.national_id} />
        <Row label="Passeport" value={member.passport_number} />
      </Card>
      <Card className="p-4">
        <h4 className="text-sm font-semibold mb-2">Contact</h4>
        <Row label="Téléphone" value={member.phone} />
        <Row label="Email" value={member.email} />
        <Row label="Adresse" value={member.address} />
        <Row label="Ville" value={member.current_city} />
        <Row label="Pays" value={member.current_country} />
      </Card>
      <Card className="p-4">
        <h4 className="text-sm font-semibold mb-2">Profession & famille</h4>
        <Row label="Profession" value={member.profession} />
        <Row label="Employeur" value={member.employer} />
        <Row label="Père" value={member.father_name} />
        <Row label="Mère" value={member.mother_name} />
        <Row label="Conjoint" value={member.spouse_name} />
        <Row label="Enfants" value={member.children_count} />
      </Card>
      {(member.biography || member.hobbies || member.notes) && (
        <Card className="p-4 md:col-span-2">
          {member.biography && <><h4 className="text-sm font-semibold mb-1">Biographie</h4><p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">{member.biography}</p></>}
          {member.hobbies && <><h4 className="text-sm font-semibold mb-1">Loisirs</h4><p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">{member.hobbies}</p></>}
          {member.notes && <><h4 className="text-sm font-semibold mb-1">Notes</h4><p className="text-sm text-muted-foreground whitespace-pre-wrap">{member.notes}</p></>}
        </Card>
      )}
    </div>
  );
}

function EducationTab({ memberId }: { memberId: string }) {
  const { items, add, remove } = useMemberEducation(memberId);
  const [form, setForm] = useState({ institution: "", degree: "", field_of_study: "", start_year: "", end_year: "", grade: "", location: "", description: "" });
  const submit = () => {
    if (!form.institution.trim()) return;
    add.mutate({
      member_id: memberId,
      institution: form.institution,
      degree: form.degree || null,
      field_of_study: form.field_of_study || null,
      start_year: form.start_year ? parseInt(form.start_year) : null,
      end_year: form.end_year ? parseInt(form.end_year) : null,
      grade: form.grade || null,
      location: form.location || null,
      description: form.description || null,
    });
    setForm({ institution: "", degree: "", field_of_study: "", start_year: "", end_year: "", grade: "", location: "", description: "" });
  };
  return (
    <div className="space-y-4 mt-4">
      <Card className="p-4 space-y-3">
        <h4 className="text-sm font-semibold">Ajouter un diplôme</h4>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Institution *" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} />
          <Input placeholder="Diplôme (Licence, Master...)" value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })} />
          <Input placeholder="Domaine d'étude" value={form.field_of_study} onChange={(e) => setForm({ ...form, field_of_study: e.target.value })} />
          <Input placeholder="Mention" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
          <Input placeholder="Année début" type="number" value={form.start_year} onChange={(e) => setForm({ ...form, start_year: e.target.value })} />
          <Input placeholder="Année fin" type="number" value={form.end_year} onChange={(e) => setForm({ ...form, end_year: e.target.value })} />
          <Input placeholder="Lieu" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </div>
        <Textarea placeholder="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Button size="sm" onClick={submit}><Plus className="w-4 h-4 mr-1" />Ajouter</Button>
      </Card>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucun diplôme</p>}
        {items.map((it) => (
          <Card key={it.id} className="p-3 flex justify-between items-start">
            <div>
              <div className="font-medium text-sm">{it.degree || "Diplôme"} {it.field_of_study && `— ${it.field_of_study}`}</div>
              <div className="text-xs text-muted-foreground">{it.institution}{it.location && `, ${it.location}`}</div>
              <div className="text-xs text-muted-foreground">{it.start_year}{it.end_year ? ` - ${it.end_year}` : ""} {it.grade && `• ${it.grade}`}</div>
              {it.description && <div className="text-xs mt-1">{it.description}</div>}
            </div>
            <Button size="icon" variant="ghost" onClick={() => remove.mutate(it.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CareerTab({ memberId }: { memberId: string }) {
  const { items, add, remove } = useMemberCareer(memberId);
  const [form, setForm] = useState({ position: "", organization: "", start_date: "", end_date: "", is_current: false, location: "", description: "" });
  const submit = () => {
    if (!form.position.trim()) return;
    add.mutate({
      member_id: memberId,
      position: form.position,
      organization: form.organization || null,
      start_date: form.start_date || null,
      end_date: form.is_current ? null : (form.end_date || null),
      is_current: form.is_current,
      location: form.location || null,
      description: form.description || null,
    });
    setForm({ position: "", organization: "", start_date: "", end_date: "", is_current: false, location: "", description: "" });
  };
  return (
    <div className="space-y-4 mt-4">
      <Card className="p-4 space-y-3">
        <h4 className="text-sm font-semibold">Ajouter une expérience</h4>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Poste *" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          <Input placeholder="Organisation" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
          <Input placeholder="Date début" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          <Input placeholder="Date fin" type="date" value={form.end_date} disabled={form.is_current} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          <Input placeholder="Lieu" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <div className="flex items-center gap-2 border rounded-md px-3"><Switch checked={form.is_current} onCheckedChange={(v) => setForm({ ...form, is_current: v })} /><Label className="text-xs">Poste actuel</Label></div>
        </div>
        <Textarea placeholder="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Button size="sm" onClick={submit}><Plus className="w-4 h-4 mr-1" />Ajouter</Button>
      </Card>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucune expérience</p>}
        {items.map((it) => (
          <Card key={it.id} className="p-3 flex justify-between items-start">
            <div>
              <div className="font-medium text-sm">{it.position} {it.organization && `— ${it.organization}`}</div>
              <div className="text-xs text-muted-foreground">{it.start_date || ""}{it.is_current ? " — En cours" : it.end_date ? ` — ${it.end_date}` : ""}{it.location && ` • ${it.location}`}</div>
              {it.description && <div className="text-xs mt-1">{it.description}</div>}
            </div>
            <Button size="icon" variant="ghost" onClick={() => remove.mutate(it.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MilestonesTab({ memberId }: { memberId: string }) {
  const { items, add, remove } = useMemberMilestones(memberId);
  const [form, setForm] = useState({ title: "", milestone_type: "", date: "", location: "", description: "" });
  const submit = () => {
    if (!form.title.trim()) return;
    add.mutate({
      member_id: memberId,
      title: form.title,
      milestone_type: form.milestone_type || null,
      date: form.date || null,
      location: form.location || null,
      description: form.description || null,
    });
    setForm({ title: "", milestone_type: "", date: "", location: "", description: "" });
  };
  return (
    <div className="space-y-4 mt-4">
      <Card className="p-4 space-y-3">
        <h4 className="text-sm font-semibold">Ajouter une date importante</h4>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Titre * (ex: Mariage)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input placeholder="Type (baptême, mariage...)" value={form.milestone_type} onChange={(e) => setForm({ ...form, milestone_type: e.target.value })} />
          <Input placeholder="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Input placeholder="Lieu" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </div>
        <Textarea placeholder="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Button size="sm" onClick={submit}><Plus className="w-4 h-4 mr-1" />Ajouter</Button>
      </Card>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucun événement</p>}
        {items.map((it) => (
          <Card key={it.id} className="p-3 flex justify-between items-start">
            <div>
              <div className="font-medium text-sm">{it.title}{it.milestone_type && ` • ${it.milestone_type}`}</div>
              <div className="text-xs text-muted-foreground">{it.date || ""}{it.location && ` — ${it.location}`}</div>
              {it.description && <div className="text-xs mt-1">{it.description}</div>}
            </div>
            <Button size="icon" variant="ghost" onClick={() => remove.mutate(it.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

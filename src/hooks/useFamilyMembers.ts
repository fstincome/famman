import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FamilyMember {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string | null;
  nickname: string | null;
  gender: string | null;
  family_role: string | null;
  birth_date: string | null;
  birth_place: string | null;
  death_date: string | null;
  marital_status: string | null;
  nationality: string | null;
  religion: string | null;
  languages: string[] | null;
  blood_type: string | null;
  national_id: string | null;
  passport_number: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  current_city: string | null;
  current_country: string | null;
  profession: string | null;
  employer: string | null;
  father_name: string | null;
  mother_name: string | null;
  spouse_name: string | null;
  children_count: number | null;
  photo_url: string | null;
  biography: string | null;
  hobbies: string | null;
  notes: string | null;
  is_alive: boolean;
  avatar_color: string | null;
  created_at: string;
  updated_at: string;
}

export type FamilyMemberInput = Omit<FamilyMember, "id" | "company_id" | "created_at" | "updated_at">;

export interface MemberEducation {
  id: string;
  member_id: string;
  company_id: string;
  institution: string;
  degree: string | null;
  field_of_study: string | null;
  start_year: number | null;
  end_year: number | null;
  grade: string | null;
  location: string | null;
  description: string | null;
}

export interface MemberCareer {
  id: string;
  member_id: string;
  company_id: string;
  position: string;
  organization: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  location: string | null;
  description: string | null;
}

export interface MemberMilestone {
  id: string;
  member_id: string;
  company_id: string;
  title: string;
  milestone_type: string | null;
  date: string | null;
  location: string | null;
  description: string | null;
}

async function getCompanyId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data } = await supabase.from("profiles").select("company_id").eq("user_id", user.id).single();
  if (!data?.company_id) throw new Error("No company");
  return data.company_id as string;
}

export function useFamilyMembers() {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["family_members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("family_members")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FamilyMember[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: Partial<FamilyMemberInput>) => {
      const company_id = await getCompanyId();
      const { data, error } = await supabase
        .from("family_members")
        .insert({ ...input, company_id, first_name: input.first_name || "Sans nom" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family_members"] });
      toast.success("Membre ajouté");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<FamilyMemberInput> }) => {
      const { data, error } = await supabase.from("family_members").update(input).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family_members"] });
      toast.success("Membre mis à jour");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("family_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family_members"] });
      toast.success("Membre supprimé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { members: list.data ?? [], isLoading: list.isLoading, create, update, remove };
}

function useChildList<T>(table: "member_education" | "member_career" | "member_milestones", memberId?: string) {
  return useQuery({
    queryKey: [table, memberId],
    enabled: !!memberId,
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").eq("member_id", memberId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as T[];
    },
  });
}

export function useMemberEducation(memberId?: string) {
  const qc = useQueryClient();
  const list = useChildList<MemberEducation>("member_education", memberId);
  const add = useMutation({
    mutationFn: async (input: Omit<MemberEducation, "id" | "company_id">) => {
      const company_id = await getCompanyId();
      const { error } = await supabase.from("member_education").insert({ ...input, company_id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["member_education", memberId] }); toast.success("Diplôme ajouté"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("member_education").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["member_education", memberId] }),
  });
  return { items: list.data ?? [], add, remove };
}

export function useMemberCareer(memberId?: string) {
  const qc = useQueryClient();
  const list = useChildList<MemberCareer>("member_career", memberId);
  const add = useMutation({
    mutationFn: async (input: Omit<MemberCareer, "id" | "company_id">) => {
      const company_id = await getCompanyId();
      const { error } = await supabase.from("member_career").insert({ ...input, company_id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["member_career", memberId] }); toast.success("Expérience ajoutée"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("member_career").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["member_career", memberId] }),
  });
  return { items: list.data ?? [], add, remove };
}

export function useMemberMilestones(memberId?: string) {
  const qc = useQueryClient();
  const list = useChildList<MemberMilestone>("member_milestones", memberId);
  const add = useMutation({
    mutationFn: async (input: Omit<MemberMilestone, "id" | "company_id">) => {
      const company_id = await getCompanyId();
      const { error } = await supabase.from("member_milestones").insert({ ...input, company_id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["member_milestones", memberId] }); toast.success("Événement ajouté"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("member_milestones").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["member_milestones", memberId] }),
  });
  return { items: list.data ?? [], add, remove };
}

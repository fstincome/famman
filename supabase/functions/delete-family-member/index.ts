import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Unauthorized");

    const { data: isAdmin } = await callerClient.rpc("has_role", {
      _user_id: caller.id, _role: "admin",
    });
    if (!isAdmin) throw new Error("Only admins can delete members");

    const { data: callerProfile } = await callerClient
      .from("profiles").select("company_id").eq("user_id", caller.id).single();
    if (!callerProfile?.company_id) throw new Error("No company found");

    const { userId } = await req.json();
    if (!userId) throw new Error("userId required");
    if (userId === caller.id) throw new Error("You cannot delete your own account");

    const { data: targetProfile } = await supabaseAdmin
      .from("profiles").select("company_id").eq("user_id", userId).single();
    if (!targetProfile || targetProfile.company_id !== callerProfile.company_id) {
      throw new Error("User not in your family");
    }

    // Clean up related rows (profiles/user_roles will cascade via auth delete if FK set up,
    // but we delete explicitly to be safe).
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("user_id", userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

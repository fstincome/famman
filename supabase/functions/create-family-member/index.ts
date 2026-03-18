import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify the caller is authenticated and is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Unauthorized");

    // Check if caller is admin via the has_role function
    const { data: isAdmin } = await callerClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });

    if (!isAdmin) throw new Error("Only admins can create users");

    // Get caller's company_id
    const { data: callerProfile } = await callerClient
      .from("profiles")
      .select("company_id")
      .eq("user_id", caller.id)
      .single();

    if (!callerProfile?.company_id) throw new Error("No company found");

    const { email, password, firstName, lastName, role } = await req.json();

    if (!email || !password) throw new Error("Email and password are required");

    // Create the user with admin client
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    });

    if (createError) throw createError;

    // Update the profile to link to the same company
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        company_id: callerProfile.company_id,
        first_name: firstName,
        last_name: lastName,
        email,
        role: role || "viewer",
      })
      .eq("user_id", newUser.user.id);

    if (profileError) throw profileError;

    // Add user role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: newUser.user.id,
        company_id: callerProfile.company_id,
        role: role === "admin" ? "admin" : "viewer",
      });

    if (roleError) throw roleError;

    return new Response(
      JSON.stringify({ success: true, userId: newUser.user.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

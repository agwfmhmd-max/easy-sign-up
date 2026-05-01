import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Self-promotion to admin allowed only when there are zero admins yet.
// Useful to bootstrap the first admin account.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const SUPER_ADMIN_EMAIL = "agwfmhmd@gmail.com";
    const isSuperAdmin = userData.user.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

    if (!isSuperAdmin) {
      const { count } = await adminClient
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");

      if ((count ?? 0) > 0) {
        return new Response(JSON.stringify({ error: "Un administrateur existe déjà. Demandez à un admin de vous promouvoir." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Idempotent: skip insert if already admin
    const { data: existing } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ success: true, alreadyAdmin: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { error: insertErr } = await adminClient
      .from("user_roles")
      .insert({ user_id: userData.user.id, role: "admin" });

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

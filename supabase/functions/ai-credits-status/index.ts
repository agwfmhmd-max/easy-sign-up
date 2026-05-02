import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Coût moyen estimé (en crédits) d'une génération complète de PFE.
// Basé sur une utilisation moyenne d'environ 0,02 USD par génération
// avec google/gemini-2.5-flash. Ajustable si nécessaire.
const CREDITS_PER_GENERATION = 0.02;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Vérifier que l'utilisateur est admin
    const { data: roleRow } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Réservé aux administrateurs" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Clé IA non configurée" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Appel minimal pour lire les en-têtes de quota du gateway IA
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      }),
    });

    const headers = aiResp.headers;
    const remainingCredits = parseFloat(
      headers.get("x-ratelimit-remaining-credits") ||
        headers.get("x-credits-remaining") ||
        "0",
    );
    const limitCredits = parseFloat(
      headers.get("x-ratelimit-limit-credits") ||
        headers.get("x-credits-limit") ||
        "0",
    );

    let outOfCredits = false;
    if (aiResp.status === 402) outOfCredits = true;

    // Estimation du nombre d'idées restantes
    const remainingIdeas = remainingCredits > 0
      ? Math.floor(remainingCredits / CREDITS_PER_GENERATION)
      : 0;

    return new Response(
      JSON.stringify({
        remainingCredits: isNaN(remainingCredits) ? null : remainingCredits,
        limitCredits: isNaN(limitCredits) ? null : limitCredits,
        remainingIdeas,
        creditsPerGeneration: CREDITS_PER_GENERATION,
        outOfCredits,
        rechargeUrl: "https://lovable.dev/projects",
        status: aiResp.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
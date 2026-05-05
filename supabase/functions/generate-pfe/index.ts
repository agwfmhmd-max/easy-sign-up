import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SPECIALTIES: Record<string, string> = {
  BA: "Banque & Assurance",
  FC: "Finance & Comptabilité",
  IG: "Informatique de Gestion",
  GRH: "Gestion des Ressources Humaines",
  TCM: "Techniques de Commercialisation & Marketing",
  SAE: "Statistiques Appliquées à l'Économie",
  DI: "Développement Informatique",
  RT: "Réseaux & Télécommunications",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const user = userData.user;

    const body = await req.json();
    const paymentId = body.paymentId;
    const ideaTypeInput = body.ideaType as string | undefined;
    if (!paymentId) {
      return new Response(JSON.stringify({ error: "paymentId requis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify payment is approved & belongs to user
    const { data: payment, error: payErr } = await adminClient
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .eq("user_id", user.id)
      .eq("status", "approved")
      .single();

    if (payErr || !payment) {
      return new Response(JSON.stringify({ error: "Paiement non approuvé ou introuvable" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check if a project already exists for this payment
    const { data: existing } = await adminClient
      .from("projects")
      .select("id")
      .eq("payment_id", paymentId)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ error: "Un projet existe déjà pour ce paiement", projectId: existing.id }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get all existing titles for this specialty (anti-duplication)
    const { data: existingProjects } = await adminClient
      .from("projects")
      .select("title")
      .eq("specialty", payment.specialty);
    const existingTitles = (existingProjects ?? []).map((p) => p.title);

    const specialtyLabel = SPECIALTIES[payment.specialty] ?? payment.specialty;
    const userDescription = payment.description || "Aucune description fournie.";
    const ideaType = ideaTypeInput || payment.idea_type || "mauritanie_application";

    let orientationPrompt = "";
    if (ideaType === "mauritanie_probleme" || ideaType === "afrique_probleme") {
      orientationPrompt = `ORIENTATION OBLIGATOIRE : Le sujet doit traiter une PROBLÉMATIQUE RÉELLE (économique, sociale, managériale ou sectorielle) de la MAURITANIE, parfaitement alignée avec la spécialité "${specialtyLabel}". Le projet doit analyser un problème mauritanien concret dont la société a besoin de résoudre, et proposer des recommandations applicables. Ce N'EST PAS forcément une application logicielle.`;
    } else if (ideaType === "mauritanie_entreprise") {
      orientationPrompt = `ORIENTATION OBLIGATOIRE : Le sujet doit être un PROJET DE CRÉATION D'ENTREPRISE en MAURITANIE qui répond à un BESOIN RÉEL et un MARCHÉ CONCRET du pays, parfaitement aligné avec la spécialité "${specialtyLabel}".

Le PFE doit présenter de manière TRÈS DÉTAILLÉE :
1. L'idée d'entreprise (produit/service, mission, valeur ajoutée, positionnement)
2. Le besoin du marché mauritanien et la justification de sa nécessité (chiffres, contexte local, clientèle cible, concurrence)
3. UNE ÉTUDE TECHNIQUE complète : processus de production/prestation, ressources matérielles & humaines nécessaires, localisation, équipements, fournisseurs, organisation opérationnelle, contraintes réglementaires mauritaniennes
4. UNE ÉTUDE FINANCIÈRE complète : investissement initial estimé en MRU (Ouguiya), structure de coûts, plan de financement (apports, emprunts), prévisions de chiffre d'affaires sur 3-5 ans, compte de résultat prévisionnel, seuil de rentabilité, retour sur investissement (ROI), indicateurs (VAN, TRI si pertinent)
5. UNE ÉTUDE COMMERCIALE & MARKETING : stratégie de commercialisation, mix marketing (4P) adapté au contexte mauritanien, canaux de distribution
6. Analyse SWOT et risques
7. Impact socio-économique sur la Mauritanie (emplois créés, contribution au PIB, etc.)

Les chapitres et sections du document DOIVENT couvrir explicitement ces volets : Étude technique, Étude financière, Étude commerciale, Plan d'affaires, Analyse des risques.`;
    } else {
      orientationPrompt = `ORIENTATION OBLIGATOIRE : Le sujet doit être la conception d'une APPLICATION (logicielle, mobile, web ou plateforme numérique) qui résout un problème CONCRET de la société ou de l'économie MAURITANIENNE, en lien direct avec la spécialité "${specialtyLabel}". L'application doit répondre à un besoin réel observé en Mauritanie.`;
    }

    const systemPrompt = `Tu es un expert académique mauritanien spécialisé dans la conception de projets de fin d'études (PFE) pour les étudiants des instituts supérieurs de Mauritanie. Tu génères des sujets innovants, réalistes, utiles pour le développement économique et social de la Mauritanie. Tu écris exclusivement en français professionnel et académique. Les titres que tu produis sont COURTS, PRÉCIS et PERCUTANTS (entre 6 et 12 mots maximum), jamais longs ni descriptifs.`;

    const userPrompt = `Génère un sujet de PFE COMPLET et UNIQUE pour un étudiant en spécialité "${specialtyLabel}".

${orientationPrompt}

Description/intérêts de l'étudiant : ${userDescription}

CONTRAINTE D'UNICITÉ — Tu DOIS proposer un titre TOTALEMENT différent des sujets déjà existants ci-dessous :
${existingTitles.length ? existingTitles.map((t, i) => `${i + 1}. ${t}`).join("\n") : "(aucun sujet existant pour cette spécialité)"}

Le sujet doit :
- Respecter STRICTEMENT l'orientation imposée ci-dessus
- Avoir un TITRE COURT, PRÉCIS et CIBLÉ (6 à 12 mots MAXIMUM, pas de phrases longues, pas de sous-titres avec ":")
- Être ancré exclusivement dans le contexte MAURITANIEN (ne mentionne pas l'Afrique en général)
- Être innovant, réalisable par un étudiant en fin de cycle
- Avoir un impact social ou économique réel
- Inclure un diagramme visuel d'architecture/fonctionnement de la solution (acteurs, modules, flux)
- Inclure un sondage en français comprenant :
  * Une section "informations démographiques" (intro_questions) : 5 à 7 questions sur le profil du répondant (âge, sexe, profession/situation, niveau d'étude, lieu de résidence, revenu approximatif si pertinent, etc.)
  * Une section principale (survey) : 10-15 questions adaptées au sujet (mélange de questions à choix unique, choix multiple, échelle et ouvertes), avec leurs options de réponse.

Retourne le résultat via l'outil submit_pfe.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "submit_pfe",
          description: "Soumet le PFE généré sous forme structurée",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Titre COURT, précis et percutant du PFE (6 à 12 mots MAXIMUM, sans deux-points ni sous-titre)" },
              idea: { type: "string", description: "Présentation de l'idée et du concept (200-300 mots)" },
              problematique: { type: "string", description: "Problématique détaillée (200-300 mots)" },
              objectifs: {
                type: "array",
                items: { type: "string" },
                description: "Liste de 5-7 objectifs spécifiques",
              },
              solution: { type: "string", description: "Solution proposée détaillée (300-400 mots)" },
              technologies: {
                type: "array",
                items: { type: "string" },
                description: "Liste des technologies/méthodes/outils recommandés (6-10 éléments)",
              },
              plan: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    phase: { type: "string" },
                    description: { type: "string" },
                    duree: { type: "string" },
                  },
                  required: ["phase", "description", "duree"],
                  additionalProperties: false,
                },
                description: "Plan de réalisation en 5-7 phases",
              },
              chapters: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    content: { type: "string", description: "Contenu détaillé du chapitre (400-600 mots)" },
                  },
                  required: ["title", "content"],
                  additionalProperties: false,
                },
                description: "6 chapitres : Introduction, État de l'art, Analyse & Conception, Implémentation, Tests & Résultats, Conclusion & Perspectives",
              },
              diagram: {
                type: "object",
                description: "Diagramme d'architecture/fonctionnement de l'application ou solution proposée",
                properties: {
                  title: { type: "string", description: "Titre du diagramme" },
                  description: { type: "string", description: "Brève description du fonctionnement global (2-3 phrases)" },
                  nodes: {
                    type: "array",
                    description: "Liste de 5 à 9 nœuds représentant les acteurs / modules / composants du système",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "Identifiant court unique (ex: user, api, db)" },
                        label: { type: "string", description: "Nom affiché du nœud" },
                        type: { type: "string", enum: ["acteur", "interface", "module", "service", "donnees", "externe"], description: "Catégorie du nœud" },
                        description: { type: "string", description: "Rôle du nœud (1 phrase)" },
                      },
                      required: ["id", "label", "type", "description"],
                      additionalProperties: false,
                    },
                  },
                  edges: {
                    type: "array",
                    description: "Liste de 5 à 12 connexions/flux entre les nœuds",
                    items: {
                      type: "object",
                      properties: {
                        from: { type: "string", description: "id du nœud source" },
                        to: { type: "string", description: "id du nœud cible" },
                        label: { type: "string", description: "Action / flux (ex: 'envoie requête', 'consulte')" },
                      },
                      required: ["from", "to", "label"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["title", "description", "nodes", "edges"],
                additionalProperties: false,
              },
              intro_questions: {
                type: "array",
                description: "Questions démographiques d'introduction du sondage (5-7 questions)",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    type: { type: "string", enum: ["choix_unique", "choix_multiple", "ouverte"] },
                    options: { type: "array", items: { type: "string" } },
                  },
                  required: ["question", "type", "options"],
                  additionalProperties: false,
                },
              },
              survey: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    type: { type: "string", enum: ["choix_unique", "choix_multiple", "echelle", "ouverte"] },
                    options: { type: "array", items: { type: "string" } },
                  },
                  required: ["question", "type", "options"],
                  additionalProperties: false,
                },
                description: "Questionnaire principal de sondage de 10-15 questions adapté au sujet",
              },
            },
            required: ["title", "idea", "problematique", "objectifs", "solution", "technologies", "plan", "chapters", "diagram", "intro_questions", "survey"],
            additionalProperties: false,
          },
        },
      },
    ];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY manquant");

    let attempt = 0;
    let pfeData: any = null;
    let lastTitle = "";

    while (attempt < 3) {
      attempt++;
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: attempt === 1 ? userPrompt : `${userPrompt}\n\nLe titre "${lastTitle}" a été refusé car déjà utilisé. Propose un sujet COMPLÈTEMENT différent.` },
          ],
          tools,
          tool_choice: { type: "function", function: { name: "submit_pfe" } },
        }),
      });

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite IA atteinte. Réessayez dans quelques instants." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés. Contactez l'administrateur." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!aiResponse.ok) {
        const txt = await aiResponse.text();
        console.error("AI error:", aiResponse.status, txt);
        return new Response(JSON.stringify({ error: "Erreur du service IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const aiJson = await aiResponse.json();
      const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        console.error("No tool call:", JSON.stringify(aiJson));
        return new Response(JSON.stringify({ error: "Format IA invalide" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      try {
        pfeData = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Parse error:", e);
        continue;
      }

      lastTitle = pfeData.title;
      // Check uniqueness in DB
      const { data: dup } = await adminClient
        .from("projects")
        .select("id")
        .eq("title", pfeData.title)
        .maybeSingle();
      if (!dup) break;
      pfeData = null;
    }

    if (!pfeData) {
      return new Response(JSON.stringify({ error: "Impossible de générer un titre unique. Réessayez." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Insert project
    const { data: project, error: insertErr } = await adminClient
      .from("projects")
      .insert({
        user_id: user.id,
        payment_id: paymentId,
        title: pfeData.title,
        specialty: payment.specialty,
        idea: pfeData.idea,
        problematique: pfeData.problematique,
        objectifs: pfeData.objectifs,
        solution: pfeData.solution,
        technologies: pfeData.technologies,
        plan: pfeData.plan,
        chapters: pfeData.chapters,
        diagram: pfeData.diagram ?? {},
        survey: { intro: pfeData.intro_questions ?? [], questions: pfeData.survey ?? [] },
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(JSON.stringify({ error: "Erreur enregistrement projet" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, project }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Erreur:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle2, Lightbulb, Smartphone, Building2 } from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  "Analyse de votre spécialité",
  "Recherche d'idée unique",
  "Conception de la problématique",
  "Rédaction du contenu détaillé",
  "Création du questionnaire",
  "Finalisation",
];

type IdeaType = "mauritanie_probleme" | "mauritanie_application" | "mauritanie_entreprise" | null;

const Generate = () => {
  const { paymentId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const [ideaType, setIdeaType] = useState<IdeaType>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading]);

  const start = async () => {
    if (!paymentId || !user || !ideaType) return;
    setGenerating(true);
    setStepIndex(0);

    // Persist idea_type on the payment so the edge function can read it
    await supabase.from("payments").update({ idea_type: ideaType }).eq("id", paymentId);

    const progressInterval = setInterval(() => {
      setStepIndex((s) => Math.min(s + 1, STEPS.length - 2));
    }, 2500);

    try {
      const { data, error } = await supabase.functions.invoke("generate-pfe", {
        body: { paymentId, ideaType },
      });
      clearInterval(progressInterval);

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setStepIndex(STEPS.length);
      toast.success("PFE généré avec succès !");
      setTimeout(() => navigate(`/project/${data.project.id}`), 800);
    } catch (e: any) {
      clearInterval(progressInterval);
      setGenerating(false);
      setStepIndex(-1);
      toast.error(e.message || "Erreur de génération");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 sm:py-12 max-w-3xl">
        <div className="card-elegant p-5 sm:p-8 md:p-10 animate-slide-up">
          {!generating && !confirmed && (
            <>
              <div className="text-center mb-6 sm:mb-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full mx-auto mb-4 sm:mb-6 flex items-center justify-center text-3xl sm:text-4xl" style={{ background: "var(--gradient-primary)" }}>
                  ✨
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold mb-3">Paiement confirmé !</h1>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Avant de générer votre PFE, choisissez l'orientation de votre sujet.
                </p>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                <button
                  onClick={() => setIdeaType("mauritanie_probleme")}
                  className={`text-left p-4 sm:p-6 rounded-2xl border-2 transition-all hover:shadow-lg ${
                    ideaType === "mauritanie_probleme"
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <Lightbulb className="w-7 h-7 sm:w-8 sm:h-8 text-primary mb-2 sm:mb-3" />
                  <h3 className="font-bold text-base sm:text-lg mb-2">Problématique mauritanienne</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Une idée liée à votre spécialité qui traite une <strong>problématique économique, sociale ou managériale</strong> concrète de la Mauritanie.
                  </p>
                </button>

                <button
                  onClick={() => setIdeaType("mauritanie_application")}
                  className={`text-left p-4 sm:p-6 rounded-2xl border-2 transition-all hover:shadow-lg ${
                    ideaType === "mauritanie_application"
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <Smartphone className="w-7 h-7 sm:w-8 sm:h-8 text-primary mb-2 sm:mb-3" />
                  <h3 className="font-bold text-base sm:text-lg mb-2">Application pour la Mauritanie</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Une idée d'<strong>application concrète</strong> répondant à un besoin réel de la société ou de l'économie mauritanienne.
                  </p>
                </button>

                <button
                  onClick={() => setIdeaType("mauritanie_entreprise")}
                  className={`text-left p-4 sm:p-6 rounded-2xl border-2 transition-all hover:shadow-lg ${
                    ideaType === "mauritanie_entreprise"
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <Building2 className="w-7 h-7 sm:w-8 sm:h-8 text-primary mb-2 sm:mb-3" />
                  <h3 className="font-bold text-base sm:text-lg mb-2">Création d'entreprise en Mauritanie</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Un projet de <strong>création d'entreprise</strong> répondant à un besoin du marché mauritanien, avec étude technique, financière et commerciale détaillées.
                  </p>
                </button>
              </div>

              <div className="text-center">
                <Button
                  className="btn-hero py-5 sm:py-6 px-8 sm:px-10 rounded-2xl text-base w-full sm:w-auto"
                  onClick={() => setConfirmed(true)}
                  disabled={!ideaType}
                >
                  Confirmer mon choix
                </Button>
              </div>
            </>
          )}

          {!generating && confirmed && (
            <div className="text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full mx-auto mb-4 sm:mb-6 flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
                <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2">Prêt à générer</h2>
              <p className="text-muted-foreground mb-6 text-sm sm:text-base">
                Orientation choisie :{" "}
                <strong className="text-primary">
                  {ideaType === "mauritanie_probleme"
                    ? "Problématique mauritanienne"
                    : ideaType === "mauritanie_entreprise"
                    ? "Création d'entreprise en Mauritanie"
                    : "Application pour la Mauritanie"}
                </strong>
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" onClick={() => setConfirmed(false)} className="w-full sm:w-auto">
                  ← Modifier
                </Button>
                <Button className="btn-hero py-5 sm:py-6 px-8 sm:px-10 rounded-2xl w-full sm:w-auto" onClick={start}>
                  <Sparkles className="w-5 h-5 mr-2" /> Lancer la génération
                </Button>
              </div>
            </div>
          )}

          {generating && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <h2 className="text-2xl font-bold mb-2">Génération de votre PFE...</h2>
              <p className="text-muted-foreground mb-8">Cela peut prendre 30 à 60 secondes.</p>
              <div className="space-y-3 text-left max-w-sm mx-auto">
                {STEPS.map((s, i) => {
                  const done = i < stepIndex;
                  const current = i === stepIndex;
                  return (
                    <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${current ? "bg-primary/10" : ""}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        done ? "bg-success text-white" : current ? "bg-primary text-white animate-pulse" : "bg-muted text-muted-foreground"
                      }`}>
                        {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                      </div>
                      <span className={`text-sm ${done || current ? "font-semibold" : "text-muted-foreground"}`}>{s}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Generate;

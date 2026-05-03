import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Sparkles, FileText, ShieldCheck, Zap, BookOpen, Users } from "lucide-react";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main>
        {/* Hero */}
        <section className="container mx-auto px-4 pt-10 sm:pt-16 pb-16 sm:pb-24 text-center relative">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-semibold mb-6 sm:mb-8 animate-fade-in max-w-full">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="whitespace-normal">Plateforme intelligente — Mauritanie</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tighter mb-6 animate-slide-up break-words">
            Votre <span className="gradient-text">PFE complet</span>
            <br />en quelques minutes.
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 animate-slide-up px-2">
            Idée unique, problématique, plan, rapport académique de qualité, et questionnaire de sondage.
            Le tout généré par IA et adapté au contexte mauritanien.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 animate-slide-up max-w-md sm:max-w-none mx-auto">
            <Button
              size="lg"
              className="btn-hero text-base px-6 sm:px-8 py-5 sm:py-6 rounded-2xl w-full sm:w-auto"
              onClick={() => navigate(user ? "/dashboard" : "/auth")}
            >
              Démarrer mon projet
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base px-6 sm:px-8 py-5 sm:py-6 rounded-2xl w-full sm:w-auto"
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            >
              Comment ça marche ?
            </Button>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="container mx-auto px-4 py-14 sm:py-20">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold mb-3 sm:mb-4">Tout ce qu'il vous faut</h2>
            <p className="text-muted-foreground text-base sm:text-lg">Un parcours simple, un résultat professionnel.</p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              { icon: Sparkles, title: "Idée 100% unique", desc: "Notre IA garantit qu'aucun étudiant ne reçoit la même idée. Chaque PFE est conçu pour vous." },
              { icon: BookOpen, title: "Rapport académique", desc: "Téléchargez un rapport PDF structuré et professionnel : intro, état de l'art, conception, etc." },
              { icon: FileText, title: "Questionnaire prêt", desc: "Un sondage adapté à votre sujet, copiable et utilisable directement pour votre mémoire." },
              { icon: Zap, title: "Génération rapide", desc: "Quelques minutes après validation du paiement, votre PFE est prêt." },
              { icon: ShieldCheck, title: "Validation sécurisée", desc: "Paiement vérifié manuellement par notre équipe pour garantir le service." },
              { icon: Users, title: "Contexte local", desc: "Sujets pensés pour la Mauritanie, avec un impact réel." },
            ].map((f, i) => (
              <div key={i} className="card-elegant p-6 hover:shadow-lg transition-all hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "var(--gradient-primary)" }}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-14 sm:py-20">
          <div className="rounded-3xl p-8 sm:p-12 md:p-16 text-center text-white" style={{ background: "var(--gradient-hero)" }}>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold mb-3 sm:mb-4">Prêt à commencer ?</h2>
            <p className="text-base sm:text-lg mb-6 sm:mb-8 opacity-90">Rejoignez les étudiants qui ont déjà sécurisé leur PFE.</p>
            <Button
              size="lg"
              variant="secondary"
              className="text-base px-6 sm:px-8 py-5 sm:py-6 rounded-2xl font-bold w-full sm:w-auto"
              onClick={() => navigate(user ? "/dashboard" : "/auth")}
            >
              Démarrer maintenant
            </Button>
          </div>
        </section>

        <footer className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground border-t mt-10">
          © {new Date().getFullYear()} Mon PFE — Plateforme académique
        </footer>
      </main>
    </div>
  );
};

export default Index;

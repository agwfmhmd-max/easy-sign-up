import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Clock, CheckCircle2, XCircle, Sparkles, FileText, Settings } from "lucide-react";

type Payment = { id: string; status: string; specialty: string; created_at: string };
type Project = { id: string; title: string; specialty: string; created_at: string; payment_id: string | null };

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    void loadData();
  }, [user, authLoading]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: prof }, { data: pays }, { data: projs }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("projects").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setProfile(prof);
    setPayments(pays || []);
    setProjects(projs || []);
    setLoading(false);
  };

  const profileComplete = profile?.full_name && profile?.matricule && profile?.whatsapp;
  const approvedWithoutProject = payments.find(
    (p) => p.status === "approved" && !projects.some((pr) => pr.payment_id === p.id)
  );
  const pendingPayment = payments.find((p) => p.status === "pending");

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 sm:py-10 max-w-5xl">
        <div className="mb-6 sm:mb-8 animate-slide-up">
          <h1 className="text-2xl sm:text-4xl font-extrabold mb-1">Tableau de bord</h1>
          <p className="text-muted-foreground text-sm sm:text-base break-all">Bienvenue, {profile?.full_name || user?.email}</p>
        </div>

        {!profileComplete && (
          <div className="card-elegant p-6 mb-6 border-l-4 border-warning animate-slide-up">
            <div className="flex items-start gap-4">
              <Settings className="w-6 h-6 text-warning shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-bold mb-1">Complétez votre profil</h3>
                <p className="text-sm text-muted-foreground mb-3">Renseignez vos informations étudiant pour commencer.</p>
                <Button size="sm" onClick={() => navigate("/profile")}>Compléter</Button>
              </div>
            </div>
          </div>
        )}

        {/* Approved → Generate */}
        {approvedWithoutProject && (
          <div className="card-elegant p-4 sm:p-6 mb-6 border-l-4 border-success animate-slide-up">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span className="font-bold">Paiement validé !</span>
                </div>
                <p className="text-sm text-muted-foreground">Spécialité : {approvedWithoutProject.specialty}</p>
              </div>
              <Button className="btn-hero w-full sm:w-auto" onClick={() => navigate(`/generate/${approvedWithoutProject.id}`)}>
                <Sparkles className="w-4 h-4 mr-1.5" /> Générer mon PFE
              </Button>
            </div>
          </div>
        )}

        {/* Pending */}
        {pendingPayment && (
          <div className="card-elegant p-6 mb-6 border-l-4 border-warning animate-slide-up">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-warning" />
              <div>
                <p className="font-bold">Vérification de votre paiement en cours</p>
                <p className="text-sm text-muted-foreground">Notre équipe valide votre paiement, vous serez notifié bientôt.</p>
              </div>
            </div>
          </div>
        )}

        {/* New PFE button */}
        {profileComplete && !pendingPayment && !approvedWithoutProject && (
          <div className="card-elegant p-6 sm:p-10 text-center mb-6 animate-slide-up">
            <div className="text-5xl sm:text-6xl mb-3">🎓</div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Démarrez un nouveau PFE</h2>
            <p className="text-muted-foreground mb-5 text-sm sm:text-base">Choisissez votre spécialité et soumettez votre paiement.</p>
            <Button className="btn-hero py-5 sm:py-6 px-6 sm:px-8 rounded-xl w-full sm:w-auto" onClick={() => navigate("/payment")}>
              <Plus className="w-4 h-4 mr-1.5" /> Nouvelle demande
            </Button>
          </div>
        )}

        {/* Projects history */}
        {projects.length > 0 && (
          <div className="animate-slide-up">
            <h2 className="text-xl font-bold mb-4">Vos projets</h2>
            <div className="space-y-3">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="card-elegant p-4 flex items-center justify-between cursor-pointer hover:border-primary/50 transition"
                  onClick={() => navigate(`/project/${p.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-semibold">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.specialty} · {new Date(p.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <span className="text-primary">→</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment history */}
        {payments.filter((p) => p.status === "rejected").length > 0 && (
          <div className="mt-8 animate-slide-up">
            <h2 className="text-xl font-bold mb-4">Demandes refusées</h2>
            <div className="space-y-2">
              {payments.filter((p) => p.status === "rejected").map((p) => (
                <div key={p.id} className="card-elegant p-3 flex items-center gap-3 text-sm">
                  <XCircle className="w-4 h-4 text-destructive" />
                  <span>{p.specialty} — {new Date(p.created_at).toLocaleDateString("fr-FR")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;

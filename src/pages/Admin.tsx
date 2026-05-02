import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, Eye, Shield, Trash2, Plus, Tag, Users, Lightbulb, CreditCard, Sparkles, Zap, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const PAYMENT_AMOUNT = 10000;

const Admin = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<any[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, any>>({});
  const [profiles, setProfiles] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [discountCodes, setDiscountCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);

  // Solde IA
  const [aiStatus, setAiStatus] = useState<{
    remainingCredits: number | null;
    limitCredits: number | null;
    remainingIdeas: number;
    creditsPerGeneration: number;
    outOfCredits: boolean;
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // New code form
  const [newCode, setNewCode] = useState("");
  const [newPct, setNewPct] = useState<number>(10);
  const [newExpires, setNewExpires] = useState("");
  const [newMaxUses, setNewMaxUses] = useState<number>(0);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    void load();
    void loadAiStatus();
  }, [user, authLoading, isAdmin]);

  const load = async () => {
    setLoading(true);
    if (isAdmin) {
      const [{ data: pays }, { data: profs }, { data: projs }, { data: codes }] = await Promise.all([
        supabase.from("payments").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("projects").select("*").order("created_at", { ascending: false }),
        supabase.from("discount_codes").select("*").order("created_at", { ascending: false }),
      ]);
      const profMap: Record<string, any> = Object.fromEntries((profs || []).map((p) => [p.id, p]));
      setPayments(pays || []);
      setProfilesMap(profMap);
      setProfiles(profs || []);
      setProjects(projs || []);
      setDiscountCodes(codes || []);
    }
    setLoading(false);
  };

  const loadAiStatus = async () => {
    if (!isAdmin) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-credits-status");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiStatus(data);
    } catch (e: any) {
      // Ne pas spammer l'utilisateur, le widget affichera l'état d'erreur
      console.error("ai-credits-status:", e);
    } finally {
      setAiLoading(false);
    }
  };

  const promoteSelf = async () => {
    setPromoting(true);
    try {
      const { data, error } = await supabase.functions.invoke("bootstrap-admin");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Vous êtes maintenant administrateur. Reconnexion...");
      setTimeout(() => window.location.reload(), 1000);
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setPromoting(false);
    }
  };

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("payments").update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user!.id,
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "approved" ? "Paiement approuvé" : "Paiement refusé");
    void load();
  };

  const viewProof = async (path: string) => {
    const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 60);
    if (error || !data) { toast.error("Impossible de charger l'image"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const createDiscountCode = async () => {
    if (!user) return;
    const code = newCode.trim().toUpperCase();
    if (!code) { toast.error("Code requis"); return; }
    if (newPct <= 0 || newPct > 100) { toast.error("Pourcentage entre 1 et 100"); return; }
    if (!newExpires) { toast.error("Date d'expiration requise"); return; }
    setCreating(true);
    const { error } = await supabase.from("discount_codes").insert({
      code,
      percentage: newPct,
      expires_at: new Date(newExpires).toISOString(),
      max_uses: newMaxUses || 0,
      created_by: user.id,
      active: true,
    });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Code créé");
    setNewCode(""); setNewPct(10); setNewExpires(""); setNewMaxUses(0);
    void load();
  };

  const toggleCode = async (id: string, active: boolean) => {
    const { error } = await supabase.from("discount_codes").update({ active: !active }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    void load();
  };

  const deleteCode = async (id: string) => {
    if (!confirm("Supprimer ce code ?")) return;
    const { error } = await supabase.from("discount_codes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Code supprimé");
    void load();
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });

  if (authLoading) return <div className="min-h-screen bg-background"><Navbar /></div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 max-w-md">
          <div className="card-elegant p-8 text-center animate-slide-up">
            <Shield className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h1 className="text-2xl font-bold mb-2">Accès administrateur requis</h1>
            <p className="text-muted-foreground mb-6 text-sm">
              Si vous êtes le premier utilisateur, vous pouvez vous promouvoir administrateur.
              Sinon, demandez à un admin existant de vous donner les droits.
            </p>
            <Button className="btn-hero" onClick={promoteSelf} disabled={promoting}>
              {promoting ? "..." : "Devenir administrateur (premier compte)"}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const stats = {
    pending: payments.filter((p) => p.status === "pending").length,
    approved: payments.filter((p) => p.status === "approved").length,
    rejected: payments.filter((p) => p.status === "rejected").length,
    users: profiles.length,
    projects: projects.length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 sm:py-10 max-w-7xl">
        <div className="flex items-center justify-between mb-6 sm:mb-8 animate-slide-up flex-wrap gap-3">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold">Panel Administrateur</h1>
            <p className="text-muted-foreground text-sm">Gestion complète de la plateforme</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>← Retour</Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6 sm:mb-8 animate-slide-up">
          <StatCard label="Utilisateurs" value={stats.users} color="primary" icon={<Users className="w-4 h-4" />} />
          <StatCard label="Projets PFE" value={stats.projects} color="primary" icon={<Lightbulb className="w-4 h-4" />} />
          <StatCard label="En attente" value={stats.pending} color="warning" icon={<CreditCard className="w-4 h-4" />} />
          <StatCard label="Approuvés" value={stats.approved} color="success" icon={<Check className="w-4 h-4" />} />
          <StatCard label="Refusés" value={stats.rejected} color="destructive" icon={<X className="w-4 h-4" />} />
        </div>

        {/* Solde Intelligence Artificielle */}
        <div className="card-elegant p-5 sm:p-6 mb-6 sm:mb-8 animate-slide-up border-l-4 border-primary">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-lg sm:text-xl">Solde Intelligence Artificielle</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Nombre estimé d'idées de PFE pouvant encore être générées avant épuisement du crédit IA.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={loadAiStatus} disabled={aiLoading}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${aiLoading ? "animate-spin" : ""}`} />
                Actualiser
              </Button>
              <Button
                size="sm"
                className="btn-hero"
                onClick={() => window.open("https://lovable.dev/projects", "_blank")}
              >
                <Zap className="w-3.5 h-3.5 mr-1" />
                Recharger
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
            <div className="rounded-xl p-4" style={{ background: "var(--gradient-soft)" }}>
              <p className="text-xs text-muted-foreground font-semibold mb-1">Idées restantes (estimation)</p>
              <p className={`text-3xl font-extrabold ${
                aiStatus?.outOfCredits || (aiStatus && aiStatus.remainingIdeas === 0)
                  ? "text-destructive"
                  : aiStatus && aiStatus.remainingIdeas < 50
                  ? "text-warning"
                  : "text-primary"
              }`}>
                {aiLoading && !aiStatus ? "..." : aiStatus ? aiStatus.remainingIdeas.toLocaleString() : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                ≈ {aiStatus ? aiStatus.creditsPerGeneration : 0.02} crédit/idée
              </p>
            </div>

            <div className="rounded-xl p-4 bg-muted/30">
              <p className="text-xs text-muted-foreground font-semibold mb-1">Crédits IA restants</p>
              <p className="text-2xl font-extrabold">
                {aiStatus?.remainingCredits != null ? `$${aiStatus.remainingCredits.toFixed(2)}` : "—"}
              </p>
              {aiStatus?.limitCredits != null && aiStatus.limitCredits > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  sur ${aiStatus.limitCredits.toFixed(2)} alloués
                </p>
              )}
            </div>

            <div className="rounded-xl p-4 bg-muted/30">
              <p className="text-xs text-muted-foreground font-semibold mb-1">Statut</p>
              {aiStatus?.outOfCredits ? (
                <span className="inline-block text-sm font-bold px-3 py-1.5 rounded-full bg-destructive/10 text-destructive">
                  Crédit épuisé
                </span>
              ) : aiStatus && aiStatus.remainingIdeas < 50 ? (
                <span className="inline-block text-sm font-bold px-3 py-1.5 rounded-full bg-warning/10 text-warning">
                  Faible — pensez à recharger
                </span>
              ) : aiStatus ? (
                <span className="inline-block text-sm font-bold px-3 py-1.5 rounded-full bg-success/10 text-success">
                  Opérationnel
                </span>
              ) : (
                <span className="inline-block text-sm font-bold px-3 py-1.5 rounded-full bg-muted text-muted-foreground">
                  {aiLoading ? "Vérification..." : "Indisponible"}
                </span>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="payments" className="animate-slide-up">
          <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 h-auto">
            <TabsTrigger value="payments" className="text-xs sm:text-sm py-2">Paiements</TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm py-2">Utilisateurs</TabsTrigger>
            <TabsTrigger value="projects" className="text-xs sm:text-sm py-2">Idées PFE</TabsTrigger>
            <TabsTrigger value="discounts" className="text-xs sm:text-sm py-2">Codes promo</TabsTrigger>
          </TabsList>

          {/* PAIEMENTS */}
          <TabsContent value="payments">
            <div className="card-elegant p-4 sm:p-6 overflow-x-auto">
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Chargement...</p>
              ) : payments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucune demande reçue.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Étudiant</TableHead>
                      <TableHead>Spécialité</TableHead>
                      <TableHead>Méthode</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Date & heure</TableHead>
                      <TableHead>Preuve</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => {
                      const prof = profilesMap[p.user_id];
                      const finalAmt = p.final_amount ?? p.amount;
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className="font-semibold">{prof?.full_name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{prof?.matricule} · {prof?.whatsapp}</div>
                            <div className="text-xs text-muted-foreground">{prof?.email}</div>
                          </TableCell>
                          <TableCell><span className="font-bold text-primary">{p.specialty}</span></TableCell>
                          <TableCell className="text-sm">{p.method}</TableCell>
                          <TableCell className="text-sm">
                            {p.discount_code ? (
                              <div>
                                <div className="line-through text-muted-foreground text-xs">{p.amount?.toLocaleString()} UM</div>
                                <div className="font-bold text-success">{finalAmt?.toLocaleString()} UM</div>
                                <div className="text-xs text-primary">{p.discount_code} (−{p.discount_percentage}%)</div>
                              </div>
                            ) : (
                              <div className="font-bold">{finalAmt?.toLocaleString()} UM</div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{fmtDate(p.created_at)}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => viewProof(p.proof_url)}>
                              <Eye className="w-3.5 h-3.5 mr-1" /> Voir
                            </Button>
                          </TableCell>
                          <TableCell>
                            {p.status === "pending" ? (
                              <div className="flex gap-2">
                                <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => updateStatus(p.id, "approved")}>
                                  <Check className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => updateStatus(p.id, "rejected")}>
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <div>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${p.status === "approved" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                                  {p.status === "approved" ? "Approuvé ✓" : "Refusé ✕"}
                                </span>
                                {p.reviewed_at && (
                                  <div className="text-[10px] text-muted-foreground mt-1">{fmtDate(p.reviewed_at)}</div>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          {/* UTILISATEURS */}
          <TabsContent value="users">
            <div className="card-elegant p-4 sm:p-6 overflow-x-auto">
              {profiles.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucun utilisateur.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Matricule</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Projets</TableHead>
                      <TableHead>Inscrit le</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.map((u) => {
                      const userProjects = projects.filter((pr) => pr.user_id === u.id).length;
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="font-semibold">{u.full_name || "—"}</TableCell>
                          <TableCell className="text-sm">{u.email || "—"}</TableCell>
                          <TableCell className="text-sm">{u.matricule || "—"}</TableCell>
                          <TableCell className="text-sm">{u.whatsapp || "—"}</TableCell>
                          <TableCell><span className="font-bold text-primary">{userProjects}</span></TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{fmtDate(u.created_at)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          {/* PROJETS */}
          <TabsContent value="projects">
            <div className="card-elegant p-4 sm:p-6 overflow-x-auto">
              {projects.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucune idée PFE générée.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titre du projet</TableHead>
                      <TableHead>Étudiant</TableHead>
                      <TableHead>Spécialité</TableHead>
                      <TableHead>Date de génération</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((pr) => {
                      const prof = profilesMap[pr.user_id];
                      return (
                        <TableRow key={pr.id}>
                          <TableCell>
                            <div className="font-bold max-w-md">{pr.title}</div>
                            <div className="text-xs text-muted-foreground line-clamp-2 max-w-md">{pr.idea}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold">{prof?.full_name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{prof?.email}</div>
                          </TableCell>
                          <TableCell><span className="font-bold text-primary">{pr.specialty}</span></TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{fmtDate(pr.created_at)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          {/* CODES PROMO */}
          <TabsContent value="discounts">
            <div className="card-elegant p-4 sm:p-6 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-lg">Créer un code de réduction</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <Label htmlFor="code">Code</Label>
                  <Input id="code" value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} placeholder="PROMO20" />
                </div>
                <div>
                  <Label htmlFor="pct">Pourcentage (%)</Label>
                  <Input id="pct" type="number" min={1} max={100} value={newPct} onChange={(e) => setNewPct(Number(e.target.value))} />
                </div>
                <div>
                  <Label htmlFor="exp">Date d'expiration</Label>
                  <Input id="exp" type="datetime-local" value={newExpires} onChange={(e) => setNewExpires(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="max">Max utilisateurs (0 = illimité)</Label>
                  <Input id="max" type="number" min={0} value={newMaxUses} onChange={(e) => setNewMaxUses(Number(e.target.value))} />
                </div>
              </div>
              <Button className="mt-4 btn-hero w-full sm:w-auto" onClick={createDiscountCode} disabled={creating}>
                <Plus className="w-4 h-4 mr-1" /> {creating ? "Création..." : "Créer le code"}
              </Button>
            </div>

            <div className="card-elegant p-4 sm:p-6 overflow-x-auto">
              <h2 className="font-bold text-lg mb-3">Codes existants</h2>
              {discountCodes.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">Aucun code créé.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Réduction</TableHead>
                      <TableHead>Expire le</TableHead>
                      <TableHead>Utilisations</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discountCodes.map((c) => {
                      const expired = new Date(c.expires_at) < new Date();
                      const exhausted = c.max_uses > 0 && c.uses_count >= c.max_uses;
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-bold">{c.code}</TableCell>
                          <TableCell><span className="font-bold text-primary">−{c.percentage}%</span></TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{fmtDate(c.expires_at)}</TableCell>
                          <TableCell className="text-sm">
                            {c.uses_count} {c.max_uses > 0 ? `/ ${c.max_uses}` : "/ ∞"}
                          </TableCell>
                          <TableCell>
                            {!c.active ? (
                              <span className="text-xs font-bold px-2 py-1 rounded-full bg-muted text-muted-foreground">Inactif</span>
                            ) : expired ? (
                              <span className="text-xs font-bold px-2 py-1 rounded-full bg-destructive/10 text-destructive">Expiré</span>
                            ) : exhausted ? (
                              <span className="text-xs font-bold px-2 py-1 rounded-full bg-warning/10 text-warning">Épuisé</span>
                            ) : (
                              <span className="text-xs font-bold px-2 py-1 rounded-full bg-success/10 text-success">Actif</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => toggleCode(c.id, c.active)}>
                                {c.active ? "Désactiver" : "Activer"}
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => deleteCode(c.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const StatCard = ({ label, value, color, icon }: { label: string; value: number; color: string; icon?: React.ReactNode }) => (
  <div className="card-elegant p-4">
    <div className="flex items-center gap-2 text-muted-foreground">
      {icon}
      <p className="text-xs sm:text-sm font-semibold">{label}</p>
    </div>
    <p className={`text-2xl sm:text-3xl font-extrabold mt-1 text-${color}`}>{value}</p>
  </div>
);

export default Admin;

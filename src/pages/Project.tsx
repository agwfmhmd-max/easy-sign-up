import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generatePFEPdf } from "@/lib/pdf";
import { Download, Copy, Network } from "lucide-react";
import { toast } from "sonner";

type SurveyQ = { question: string; type: string; options?: string[] };
type DiagramNode = { id: string; label: string; type: string; description: string };
type DiagramEdge = { from: string; to: string; label: string };
type Diagram = { title?: string; description?: string; nodes?: DiagramNode[]; edges?: DiagramEdge[] };

const TYPE_COLORS: Record<string, string> = {
  acteur: "hsl(238 83% 67%)",
  interface: "hsl(262 83% 67%)",
  module: "hsl(160 84% 39%)",
  service: "hsl(38 92% 50%)",
  donnees: "hsl(0 84% 60%)",
  externe: "hsl(215 20% 50%)",
};

function normalizeSurvey(survey: any): { intro: SurveyQ[]; questions: SurveyQ[] } {
  if (Array.isArray(survey)) return { intro: [], questions: survey };
  if (survey && typeof survey === "object") {
    return {
      intro: Array.isArray(survey.intro) ? survey.intro : [],
      questions: Array.isArray(survey.questions) ? survey.questions : [],
    };
  }
  return { intro: [], questions: [] };
}

const Project = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    void load();
  }, [user, authLoading, id]);

  const load = async () => {
    if (!id || !user) return;
    setLoading(true);
    const [{ data: p }, { data: prof }, { data: gm }] = await Promise.all([
      supabase.from("projects").select("*").eq("id", id).maybeSingle(),
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("group_members").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
    ]);
    setProject(p);
    setProfile(prof);
    setGroupMembers(gm || []);
    setLoading(false);
  };

  const downloadPdf = () => {
    if (!project) return;
    try {
      generatePFEPdf(project, profile || {}, groupMembers);
      toast.success("PDF téléchargé");
    } catch (e: any) {
      toast.error("Erreur de génération PDF");
    }
  };

  const copySurvey = () => {
    if (!project) return;
    const { intro, questions } = normalizeSurvey(project.survey);
    const fmt = (q: SurveyQ, i: number) => {
      const opts = q.options?.length ? "\n" + q.options.map((o) => `   - ${o}`).join("\n") : "";
      return `Q${i + 1}. ${q.question}${opts}`;
    };
    const parts: string[] = [];
    if (intro.length) {
      parts.push("=== INFORMATIONS DÉMOGRAPHIQUES ===\n" + intro.map(fmt).join("\n\n"));
    }
    if (questions.length) {
      parts.push("=== QUESTIONS PRINCIPALES ===\n" + questions.map(fmt).join("\n\n"));
    }
    navigator.clipboard.writeText(parts.join("\n\n"));
    toast.success("Sondage copié");
  };

  if (loading || authLoading) return <div className="min-h-screen bg-background"><Navbar /><div className="container mx-auto py-20 text-center text-muted-foreground">Chargement...</div></div>;
  if (!project) return <div className="min-h-screen bg-background"><Navbar /><div className="container mx-auto py-20 text-center">Projet introuvable</div></div>;

  const survey = normalizeSurvey(project.survey);
  const diagram: Diagram = project.diagram || {};
  const hasDiagram = diagram.nodes && diagram.nodes.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 sm:py-10 max-w-4xl">
        <div className="flex items-start justify-between flex-wrap gap-3 sm:gap-4 mb-6 animate-slide-up">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">{project.specialty}</div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-1 break-words">{project.title}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Généré le {new Date(project.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <Button className="btn-hero w-full sm:w-auto" onClick={downloadPdf}>
            <Download className="w-4 h-4 mr-1.5" /> Télécharger PDF
          </Button>
        </div>

        <Tabs defaultValue="overview" className="animate-slide-up">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 mb-6 h-auto gap-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm py-2">Vue</TabsTrigger>
            <TabsTrigger value="details" className="text-xs sm:text-sm py-2">Détails</TabsTrigger>
            <TabsTrigger value="diagram" className="text-xs sm:text-sm py-2">Schéma</TabsTrigger>
            <TabsTrigger value="report" className="text-xs sm:text-sm py-2">Rapport</TabsTrigger>
            <TabsTrigger value="survey" className="text-xs sm:text-sm py-2">Sondage</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-5">
            <Card title="💡 Idée et concept">{project.idea}</Card>
            <Card title="❓ Problématique">{project.problematique}</Card>
            <Card title="🎯 Objectifs">
              <ul className="space-y-2">
                {(project.objectifs as string[]).map((o, i) => (
                  <li key={i} className="flex gap-2"><span className="text-primary font-bold">{i + 1}.</span><span>{o}</span></li>
                ))}
              </ul>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-5">
            <Card title="🚀 Solution proposée">{project.solution}</Card>
            <Card title="⚙️ Technologies recommandées">
              <div className="flex flex-wrap gap-2">
                {(project.technologies as string[]).map((t, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">{t}</span>
                ))}
              </div>
            </Card>
            <Card title="📅 Plan de réalisation">
              <div className="space-y-4">
                {(project.plan as any[]).map((p, i) => (
                  <div key={i} className="border-l-4 border-primary pl-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="font-bold">Phase {i + 1} — {p.phase}</h4>
                      <span className="text-xs bg-secondary px-2 py-1 rounded-full font-semibold">{p.duree}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="diagram">
            {hasDiagram ? (
              <div className="card-elegant p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Network className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-bold">{diagram.title || "Schéma fonctionnel"}</h3>
                </div>
                {diagram.description && (
                  <p className="text-sm text-muted-foreground mb-5">{diagram.description}</p>
                )}
                <DiagramSvg diagram={diagram} />

                <div className="grid sm:grid-cols-2 gap-3 mt-6">
                  {diagram.nodes!.map((n) => (
                    <div key={n.id} className="flex gap-3 p-3 rounded-xl border bg-card">
                      <div className="w-3 h-3 rounded-full mt-1.5 shrink-0" style={{ background: TYPE_COLORS[n.type] || "hsl(238 83% 67%)" }} />
                      <div>
                        <p className="font-bold text-sm">{n.label} <span className="text-xs text-muted-foreground font-normal">({n.type})</span></p>
                        <p className="text-xs text-muted-foreground">{n.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {diagram.edges && diagram.edges.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-bold text-sm mb-2">Flux principaux</h4>
                    <ul className="space-y-1.5 text-sm">
                      {diagram.edges.map((e, i) => {
                        const from = diagram.nodes!.find((n) => n.id === e.from)?.label ?? e.from;
                        const to = diagram.nodes!.find((n) => n.id === e.to)?.label ?? e.to;
                        return (
                          <li key={i} className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{from}</span>
                            <span className="text-primary">→</span>
                            <span className="font-semibold">{to}</span>
                            <span className="text-muted-foreground">: {e.label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="card-elegant p-10 text-center text-muted-foreground">
                Aucun schéma disponible pour ce projet.
              </div>
            )}
          </TabsContent>

          <TabsContent value="report" className="space-y-5">
            {(project.chapters as any[]).map((c, i) => (
              <Card key={i} title={`Chapitre ${i + 1} — ${c.title}`}>
                <p className="whitespace-pre-line">{c.content}</p>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="survey">
            <div className="card-elegant p-6">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <h3 className="text-xl font-bold">Questionnaire de sondage</h3>
                <Button variant="outline" size="sm" onClick={copySurvey}>
                  <Copy className="w-4 h-4 mr-1.5" /> Copier
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-5">
                Le sondage n'est pas inclus dans le PDF. Vous pouvez le copier et le diffuser séparément.
              </p>

              {survey.intro.length > 0 && (
                <>
                  <div className="bg-primary/5 border-l-4 border-primary px-4 py-2 rounded-r-lg mb-4">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-primary">Informations démographiques</h4>
                    <p className="text-xs text-muted-foreground">À remplir par le répondant en début de sondage.</p>
                  </div>
                  <div className="space-y-5 mb-8">
                    {survey.intro.map((q, i) => (
                      <QItem key={`intro-${i}`} q={q} idx={i + 1} />
                    ))}
                  </div>
                </>
              )}

              {survey.questions.length > 0 && (
                <>
                  <div className="bg-secondary px-4 py-2 rounded-lg mb-4">
                    <h4 className="font-bold text-sm uppercase tracking-wider">Questions principales</h4>
                  </div>
                  <div className="space-y-5">
                    {survey.questions.map((q, i) => (
                      <QItem key={`q-${i}`} q={q} idx={i + 1} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const QItem = ({ q, idx }: { q: SurveyQ; idx: number }) => (
  <div className="border-b pb-4 last:border-0">
    <p className="font-semibold mb-2">Q{idx}. {q.question}</p>
    <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">{q.type}</p>
    {q.options && q.options.length > 0 && (
      <ul className="space-y-1">
        {q.options.map((o, j) => (
          <li key={j} className="text-sm flex gap-2"><span>☐</span> {o}</li>
        ))}
      </ul>
    )}
  </div>
);

const DiagramSvg = ({ diagram }: { diagram: Diagram }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(700);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) setW(containerRef.current.clientWidth);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const nodes = diagram.nodes ?? [];
  const edges = diagram.edges ?? [];
  const h = Math.max(380, w * 0.7);
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2 - 70;

  const pos: Record<string, { x: number; y: number }> = {};
  nodes.forEach((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    pos[n.id] = { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  });

  return (
    <div ref={containerRef} className="w-full overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="hsl(238 60% 60%)" />
          </marker>
        </defs>
        {edges.map((e, i) => {
          const a = pos[e.from];
          const b = pos[e.to];
          if (!a || !b) return null;
          const angle = Math.atan2(b.y - a.y, b.x - a.x);
          const x2 = b.x - Math.cos(angle) * 36;
          const y2 = b.y - Math.sin(angle) * 36;
          const mx = (a.x + x2) / 2;
          const my = (a.y + y2) / 2;
          return (
            <g key={i}>
              <line x1={a.x} y1={a.y} x2={x2} y2={y2} stroke="hsl(238 30% 70%)" strokeWidth={1.5} markerEnd="url(#arrow)" />
              <text x={mx} y={my} fontSize={10} fill="hsl(238 40% 40%)" textAnchor="middle" dy={-4}
                style={{ paintOrder: "stroke", stroke: "white", strokeWidth: 3, strokeLinejoin: "round" }}>
                {e.label.length > 22 ? e.label.slice(0, 21) + "…" : e.label}
              </text>
            </g>
          );
        })}
        {nodes.map((n) => {
          const p = pos[n.id];
          const color = TYPE_COLORS[n.type] || "hsl(238 83% 67%)";
          return (
            <g key={n.id}>
              <circle cx={p.x} cy={p.y} r={32} fill={color} stroke="white" strokeWidth={3} opacity={0.95} />
              <text x={p.x} y={p.y} fontSize={11} fontWeight="bold" fill="white" textAnchor="middle" dy={4}>
                {n.label.length > 12 ? n.label.slice(0, 11) + "…" : n.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="card-elegant p-4 sm:p-6">
    <h3 className="text-base sm:text-lg font-bold mb-3">{title}</h3>
    <div className="text-foreground/90 leading-relaxed text-sm sm:text-base break-words">{children}</div>
  </div>
);

export default Project;

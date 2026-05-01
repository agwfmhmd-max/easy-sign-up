import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Users } from "lucide-react";

const schema = z.object({
  full_name: z.string().trim().min(2, "Nom requis").max(120),
  matricule: z.string().trim().min(2, "Matricule requis").max(50),
  whatsapp: z.string().trim().min(6, "Numéro WhatsApp invalide").max(30),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
});

type Member = { id?: string; full_name: string; matricule: string };

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", matricule: "", whatsapp: "", email: "" });
  const [members, setMembers] = useState<Member[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    void (async () => {
      const [{ data }, { data: gm }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("group_members").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
      ]);
      if (data) {
        setForm({
          full_name: data.full_name || "",
          matricule: data.matricule || "",
          whatsapp: data.whatsapp || "",
          email: data.email || user.email || "",
        });
      } else {
        setForm((f) => ({ ...f, email: user.email || "" }));
      }
      if (gm) setMembers(gm.map((m) => ({ id: m.id, full_name: m.full_name, matricule: m.matricule || "" })));
    })();
  }, [user, authLoading]);

  const addMember = () => {
    if (members.length >= 6) { toast.error("Maximum 6 membres"); return; }
    setMembers([...members, { full_name: "", matricule: "" }]);
  };
  const removeMember = (idx: number) => setMembers(members.filter((_, i) => i !== idx));
  const updateMember = (idx: number, key: "full_name" | "matricule", value: string) => {
    const copy = [...members];
    copy[idx] = { ...copy[idx], [key]: value };
    setMembers(copy);
  };

  const save = async () => {
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        ...parsed.data,
        email: parsed.data.email || user.email,
      });
      if (error) throw error;

      // Replace group members
      await supabase.from("group_members").delete().eq("user_id", user.id);
      const valid = members
        .map((m) => ({ full_name: m.full_name.trim(), matricule: m.matricule.trim() }))
        .filter((m) => m.full_name.length > 0);
      if (valid.length) {
        const { error: gErr } = await supabase.from("group_members").insert(
          valid.map((m) => ({ user_id: user.id, full_name: m.full_name, matricule: m.matricule || null }))
        );
        if (gErr) throw gErr;
      }
      toast.success("Profil enregistré");
      navigate("/dashboard");
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-10 max-w-2xl">
        <div className="card-elegant p-6 sm:p-8 animate-slide-up">
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-2">Informations étudiant</h1>
          <p className="text-muted-foreground mb-6 text-sm">Ces informations apparaîtront sur votre rapport.</p>

          <div className="space-y-4">
            <div>
              <Label htmlFor="full_name">Nom complet *</Label>
              <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Mohamed Ahmed" />
            </div>
            <div>
              <Label htmlFor="matricule">Numéro de matricule *</Label>
              <Input id="matricule" value={form.matricule} onChange={(e) => setForm({ ...form, matricule: e.target.value })} placeholder="2024-XXXX" />
            </div>
            <div>
              <Label htmlFor="whatsapp">Numéro WhatsApp *</Label>
              <Input id="whatsapp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+222 XX XX XX XX" />
            </div>
            <div>
              <Label htmlFor="email">Email (optionnel)</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>

            {/* Membres du groupe */}
            <div className="rounded-2xl border-2 border-dashed border-border p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <Label className="text-base font-bold">Membres du groupe (optionnel)</Label>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addMember}>
                  <Plus className="w-4 h-4 mr-1" /> Ajouter
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Ajoutez les noms et matricules de votre groupe. Ils apparaîtront dans votre PDF.
              </p>
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Aucun membre ajouté.</p>
              ) : (
                <div className="space-y-2">
                  {members.map((m, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-2">
                      <Input
                        value={m.full_name}
                        onChange={(e) => updateMember(idx, "full_name", e.target.value)}
                        placeholder="Nom complet du membre"
                        className="flex-1"
                      />
                      <Input
                        value={m.matricule}
                        onChange={(e) => updateMember(idx, "matricule", e.target.value)}
                        placeholder="Matricule"
                        className="sm:w-40"
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeMember(idx)} className="shrink-0 text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button className="w-full btn-hero py-6 rounded-xl" onClick={save} disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer & continuer"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;

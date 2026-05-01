import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(6, "Mot de passe : 6 caractères minimum").max(100),
});

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [user, loading, navigate]);

  const handleSubmit = async () => {
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "signup") {
        // Email confirmation is intentionally disabled for this project.
        // We do NOT pass emailRedirectTo so Supabase will not try to send a
        // confirmation link. After signUp we ensure the user is signed in
        // immediately, even if server-side confirmation is somehow still on.
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;

        // If no session was returned (e.g. confirmations still enabled on the
        // server), force a sign-in right away so the user is never blocked.
        if (!signUpData.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: parsed.data.email,
            password: parsed.data.password,
          });
          if (signInError) throw signInError;
        }
        toast.success("Compte créé ! Connexion en cours...");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        toast.success("Bienvenue !");
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur d'authentification");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-md">
        <div className="card-elegant p-8 animate-slide-up">
          <h1 className="text-3xl font-extrabold mb-2">
            {mode === "login" ? "Bon retour" : "Créer un compte"}
          </h1>
          <p className="text-muted-foreground mb-6 text-sm">
            {mode === "login" ? "Connectez-vous pour accéder à votre PFE." : "Quelques secondes pour démarrer."}
          </p>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" />
            </div>
            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
            </div>
            <Button className="w-full btn-hero py-6 rounded-xl text-base" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Chargement..." : mode === "login" ? "Se connecter" : "S'inscrire"}
            </Button>
            <button
              className="w-full text-sm font-semibold text-primary hover:underline"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Pas de compte ? Créer un compte" : "Déjà inscrit ? Se connecter"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Auth;

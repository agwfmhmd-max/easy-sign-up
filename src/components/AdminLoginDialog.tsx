import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import { toast } from "sonner";

/**
 * Translate raw Supabase auth errors into accurate, user-friendly messages.
 * IMPORTANT: do not collapse different errors into one generic message —
 * the user must know exactly why login failed.
 */
const translateAuthError = (raw: string): string => {
  const msg = (raw || "").toLowerCase();

  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
    return "Email ou mot de passe incorrect. Vérifiez vos identifiants.";
  }
  if (msg.includes("email not confirmed") || msg.includes("email_not_confirmed")) {
    return "Email non confirmé. Vérifiez votre boîte mail pour le lien de confirmation.";
  }
  if (msg.includes("user not found")) {
    return "Aucun compte n'existe avec cet email.";
  }
  if (msg.includes("too many requests") || msg.includes("rate limit")) {
    return "Trop de tentatives. Veuillez patienter quelques minutes.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Erreur de connexion réseau. Vérifiez votre connexion internet.";
  }
  return raw || "Échec de la connexion.";
};

export const AdminLoginDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password; // do NOT trim password — spaces may be intentional

    if (!cleanEmail || !cleanPassword) {
      toast.error("Email et mot de passe requis");
      return;
    }

    // Hardcoded super-admin email — must match SUPER_ADMIN_EMAIL in
    // supabase/functions/bootstrap-admin/index.ts. Used to auto-create the
    // account on first login if it doesn't exist yet.
    const SUPER_ADMIN_EMAIL = "agwfmhmd@gmail.com";

    setSubmitting(true);
    try {
      // Step 1: ensure no stale session interferes with the new sign-in.
      await supabase.auth.signOut().catch(() => {});

      // Step 2: attempt sign-in.
      let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      // Step 2b: if super-admin and the account doesn't exist yet,
      // create it on the fly then retry sign-in. This removes the manual
      // "create user in dashboard" step that often blocks first login.
      if (
        signInError &&
        cleanEmail === SUPER_ADMIN_EMAIL &&
        /invalid login credentials|invalid_credentials|user not found/i.test(signInError.message)
      ) {
        // Email confirmation is disabled for this project — do NOT pass
        // emailRedirectTo so Supabase will not attempt to send a verification link.
        const { error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (signUpError && !/already registered|already exists/i.test(signUpError.message)) {
          toast.error(translateAuthError(signUpError.message));
          return;
        }

        // Retry sign-in after sign-up.
        const retry = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });
        signInData = retry.data;
        signInError = retry.error;
      }

      if (signInError) {
        toast.error(translateAuthError(signInError.message));
        return;
      }

      if (!signInData.session || !signInData.user) {
        toast.error(
          "Compte créé mais la session n'a pas démarré. Si la confirmation par email est activée, vérifiez votre boîte mail."
        );
        return;
      }

      // Step 3: try to promote to admin if eligible (super admin email or first admin).
      // We surface bootstrap errors instead of swallowing them, but only as warnings —
      // login itself has already succeeded.
      try {
        const { data: bootstrapData, error: bootstrapError } = await supabase.functions.invoke("bootstrap-admin");
        if (bootstrapError) {
          console.warn("[bootstrap-admin] error:", bootstrapError);
        } else if (bootstrapData?.error) {
          console.warn("[bootstrap-admin] returned error:", bootstrapData.error);
        }
      } catch (bootstrapEx) {
        console.warn("[bootstrap-admin] exception:", bootstrapEx);
      }

      // Step 4: verify the user actually has the admin role before redirecting.
      const { data: roleRow, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", signInData.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError) {
        console.warn("[user_roles] check error:", roleError);
      }

      if (!roleRow) {
        toast.error(
          "Connexion réussie, mais ce compte n'a pas le rôle administrateur. Contactez un administrateur existant."
        );
        return;
      }

      toast.success("Connexion administrateur réussie");
      onOpenChange(false);
      setTimeout(() => {
        navigate("/admin");
        window.location.reload();
      }, 400);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erreur inattendue";
      toast.error(translateAuthError(message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <DialogTitle>Accès administrateur</DialogTitle>
          </div>
          <DialogDescription>
            Connexion réservée à l'administrateur du site.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="admin@exemple.com"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="admin-password">Mot de passe</Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="••••••••"
            />
          </div>
          <Button className="w-full btn-hero" onClick={handleLogin} disabled={submitting}>
            {submitting ? "Connexion..." : "Se connecter"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

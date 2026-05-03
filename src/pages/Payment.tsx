import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  SPECIALTIES,
  PAYMENT_METHODS_PRIMARY,
  PAYMENT_METHODS_SECONDARY,
  PAYMENT_NUMBER,
  PAYMENT_NUMBER_SECONDARY,
  PAYMENT_AMOUNT,
  getPaymentNumberForMethod,
} from "@/lib/constants";
import { toast } from "sonner";
import { Upload, CheckCircle2, Copy, Tag, Loader2 } from "lucide-react";

const Payment = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [specialty, setSpecialty] = useState("");
  const [description, setDescription] = useState("");
  const [method, setMethod] = useState<string>("Bankily");
  const activeNumber = getPaymentNumberForMethod(method);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Discount code
  const [discountInput, setDiscountInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<{ code: string; percentage: number } | null>(null);
  const [verifying, setVerifying] = useState(false);

  const finalAmount = appliedCode
    ? Math.round(PAYMENT_AMOUNT * (1 - appliedCode.percentage / 100))
    : PAYMENT_AMOUNT;

  useEffect(() => {
    if (!authLoading && !user) { navigate("/auth"); return; }
    if (!user) return;
    void (async () => {
      const { data: pays } = await supabase
        .from("payments")
        .select("id, status")
        .eq("user_id", user.id);
      const pending = pays?.find((p) => p.status === "pending");
      if (pending) {
        toast.info("Vous avez déjà une demande en attente de validation.");
        navigate("/dashboard");
        return;
      }
      const approved = pays?.filter((p) => p.status === "approved").map((p) => p.id) ?? [];
      if (approved.length) {
        const { data: projs } = await supabase
          .from("projects")
          .select("payment_id")
          .in("payment_id", approved);
        const usedIds = new Set((projs ?? []).map((p) => p.payment_id));
        const unused = approved.find((id) => !usedIds.has(id));
        if (unused) {
          toast.info("Vous avez déjà un paiement validé. Générez d'abord votre PFE.");
          navigate("/dashboard");
        }
      }
    })();
  }, [user, authLoading]);

  const verifyDiscount = async () => {
    const code = discountInput.trim().toUpperCase();
    if (!code) { toast.error("Entrez un code"); return; }
    setVerifying(true);
    try {
      const { data, error } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("code", code)
        .eq("active", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) { toast.error("Code invalide"); return; }
      if (new Date(data.expires_at) < new Date()) { toast.error("Code expiré"); return; }
      if (data.max_uses > 0 && data.uses_count >= data.max_uses) {
        toast.error("Code épuisé : nombre maximum d'utilisations atteint");
        return;
      }
      setAppliedCode({ code: data.code, percentage: data.percentage });
      toast.success(`Code appliqué : -${data.percentage}%`);
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setVerifying(false);
    }
  };

  const removeDiscount = () => {
    setAppliedCode(null);
    setDiscountInput("");
  };

  const submit = async () => {
    if (!user) return;
    if (!specialty) { toast.error("Choisissez une spécialité"); return; }
    if (!file) { toast.error("Téléversez la preuve de paiement"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image trop lourde (max 5 Mo)"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Fichier image requis"); return; }

    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("payments").insert({
        user_id: user.id,
        amount: PAYMENT_AMOUNT,
        final_amount: finalAmount,
        discount_code: appliedCode?.code || null,
        discount_percentage: appliedCode?.percentage || 0,
        method,
        proof_url: path,
        specialty,
        description: description.trim() || null,
        status: "pending",
      });
      if (insErr) throw insErr;

      // Increment usage counter (best-effort; admins can also see this in their dashboard)
      if (appliedCode) {
        await supabase.rpc as any; // no-op placeholder
        const { data: codeRow } = await supabase
          .from("discount_codes")
          .select("id, uses_count")
          .eq("code", appliedCode.code)
          .maybeSingle();
        if (codeRow) {
          // best-effort, may fail due to RLS for non-admins; admin will see real-world usage from payments table
          await supabase.from("discount_codes").update({ uses_count: (codeRow.uses_count || 0) + 1 }).eq("id", codeRow.id);
        }
      }

      toast.success("Paiement soumis. Vérification en cours.");
      navigate("/dashboard");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'envoi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 sm:py-10 max-w-2xl">
        <div className="card-elegant p-5 sm:p-8 animate-slide-up">
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-6">Nouvelle demande</h1>

          <div className="space-y-6">
            <div>
              <Label className="text-base mb-3 block">1. Choisissez votre spécialité *</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SPECIALTIES.map((sp) => (
                  <button
                    key={sp.code}
                    type="button"
                    onClick={() => setSpecialty(sp.code)}
                    className={`p-3 rounded-xl border-2 text-sm font-bold transition ${
                      specialty === sp.code
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/40"
                    }`}
                    title={sp.label}
                  >
                    {sp.code}
                  </button>
                ))}
              </div>
              {specialty && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {SPECIALTIES.find((s) => s.code === specialty)?.label}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="desc" className="text-base mb-2 block">2. Vos intérêts (optionnel)</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                placeholder="Décrivez vos centres d'intérêt ou une idée de projet..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">{description.length}/500</p>
            </div>

            {/* Code promo */}
            <div className="rounded-2xl border-2 border-dashed border-primary/30 p-4 sm:p-5 bg-primary/5">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-5 h-5 text-primary" />
                <Label className="text-base font-bold">Code de réduction (optionnel)</Label>
              </div>
              {appliedCode ? (
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-bold text-success">✓ {appliedCode.code}</p>
                    <p className="text-sm text-muted-foreground">Réduction appliquée : −{appliedCode.percentage}%</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={removeDiscount}>Retirer</Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                    placeholder="Entrez votre code"
                    className="flex-1"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), verifyDiscount())}
                  />
                  <Button type="button" variant="outline" onClick={verifyDiscount} disabled={verifying}>
                    {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Vérifier"}
                  </Button>
                </div>
              )}
            </div>

            <div className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--gradient-soft)" }}>
              <h3 className="font-bold text-lg mb-3">Informations de paiement</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Montant initial :</span>
                  <span className={appliedCode ? "line-through text-muted-foreground" : "font-bold"}>
                    {PAYMENT_AMOUNT.toLocaleString()} UM
                  </span>
                </div>
                {appliedCode && (
                  <>
                    <div className="flex justify-between text-success">
                      <span>Réduction ({appliedCode.percentage}%) :</span>
                      <span className="font-bold">−{(PAYMENT_AMOUNT - finalAmount).toLocaleString()} UM</span>
                    </div>
                    <div className="flex justify-between text-base pt-2 border-t border-border">
                      <span className="font-bold">Montant à payer :</span>
                      <span className="font-extrabold text-primary text-lg">{finalAmount.toLocaleString()} UM</span>
                    </div>
                  </>
                )}
                {!appliedCode && (
                  <div className="flex justify-between text-base pt-2 border-t border-border">
                    <span className="font-bold">À payer :</span>
                    <span className="font-extrabold text-primary text-lg">{finalAmount.toLocaleString()} UM</span>
                  </div>
                )}
                <div className="pt-2 space-y-2 border-t border-border">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <span className="text-muted-foreground text-xs">
                      Bankily / Sedad / Masrvi / Click / Bimbank / Gaza pay / Rassidy / Amanaty / BAMIS :
                    </span>
                    <button
                      className="font-bold text-primary inline-flex items-center gap-1.5"
                      onClick={() => { navigator.clipboard.writeText(PAYMENT_NUMBER); toast.success("Numéro copié"); }}
                    >
                      {PAYMENT_NUMBER} <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <span className="text-muted-foreground text-xs">Moov Money / BCI Pay :</span>
                    <button
                      className="font-bold text-primary inline-flex items-center gap-1.5"
                      onClick={() => { navigator.clipboard.writeText(PAYMENT_NUMBER_SECONDARY); toast.success("Numéro copié"); }}
                    >
                      {PAYMENT_NUMBER_SECONDARY} <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border/60">
                    <span className="text-muted-foreground text-sm">Numéro pour votre méthode :</span>
                    <span className="font-extrabold text-primary">{activeNumber}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-base mb-2 block">3. Méthode utilisée *</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1 text-xs font-bold text-muted-foreground">
                    Sur {PAYMENT_NUMBER}
                  </div>
                  {PAYMENT_METHODS_PRIMARY.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                  <div className="px-2 py-1 mt-1 text-xs font-bold text-muted-foreground border-t">
                    Sur {PAYMENT_NUMBER_SECONDARY}
                  </div>
                  {PAYMENT_METHODS_SECONDARY.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-base mb-2 block">4. Preuve de paiement *</Label>
              <input id="proof" type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <label htmlFor="proof" className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition">
                {file ? (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-success mb-2" />
                    <span className="font-bold text-success">{file.name}</span>
                    <span className="text-xs text-muted-foreground mt-1">Cliquez pour changer</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="font-bold">Téléverser une image</span>
                    <span className="text-xs text-muted-foreground mt-1">JPG, PNG (max 5 Mo)</span>
                  </>
                )}
              </label>
            </div>

            <Button className="w-full btn-hero py-6 rounded-xl text-base" onClick={submit} disabled={submitting}>
              {submitting ? "Envoi..." : "Envoyer la demande"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Payment;

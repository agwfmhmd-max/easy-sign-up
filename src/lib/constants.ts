export const SPECIALTIES = [
  { code: "BA", label: "Banque & Assurance" },
  { code: "FC", label: "Finance & Comptabilité" },
  { code: "IG", label: "Informatique de Gestion" },
  { code: "GRH", label: "Gestion des Ressources Humaines" },
  { code: "TCM", label: "Techniques de Commercialisation & Marketing" },
  { code: "SAE", label: "Statistiques Appliquées à l'Économie" },
  { code: "DI", label: "Développement Informatique" },
  { code: "RT", label: "Réseaux & Télécommunications" },
] as const;

// Méthodes payant sur le numéro principal
export const PAYMENT_METHODS_PRIMARY = [
  "Bankily",
  "Sedad",
  "Masrvi",
  "Click",
  "Bimbank",
  "Ghazna Abi",
  "Rasidi",
  "Amanaty",
] as const;

// Méthodes payant sur le numéro secondaire
export const PAYMENT_METHODS_SECONDARY = ["Moov Money", "BCI Pay"] as const;

// Pour rétro-compatibilité (toutes les méthodes confondues)
export const PAYMENT_METHODS = [
  ...PAYMENT_METHODS_PRIMARY,
  ...PAYMENT_METHODS_SECONDARY,
] as const;

export const PAYMENT_NUMBER = "20479962";
export const PAYMENT_NUMBER_SECONDARY = "46154399";

export const SECONDARY_METHODS: readonly string[] = PAYMENT_METHODS_SECONDARY;

export const getPaymentNumberForMethod = (method: string): string =>
  SECONDARY_METHODS.includes(method) ? PAYMENT_NUMBER_SECONDARY : PAYMENT_NUMBER;

export const PAYMENT_AMOUNT = 10000;

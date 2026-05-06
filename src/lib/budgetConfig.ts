export interface BudgetSubcategory {
  name: string;
  percentage: number;
}

export interface BudgetCategory {
  name: string;
  totalPercentage: number;
  subcategories: BudgetSubcategory[];
}

export const BUDGET_CATEGORIES: BudgetCategory[] = [
  {
    name: "Charges essentielles",
    totalPercentage: 52,
    subcategories: [
      { name: "Alimentation", percentage: 28.33 },
      { name: "Logement", percentage: 11.67 },
      { name: "Eau + Électricité", percentage: 4.17 },
      { name: "Transport", percentage: 3.33 },
      { name: "Communication", percentage: 1.67 },
      { name: "Imprévus", percentage: 2.83 },
    ],
  },
  {
    name: "Famille & stabilité",
    totalPercentage: 28,
    subcategories: [
      { name: "Scolarité", percentage: 11.67 },
      { name: "Santé", percentage: 8.00 },
      { name: "Vêtements", percentage: 3.33 },
      { name: "Solidarité", percentage: 5.00 },
    ],
  },
  {
    name: "Épargne & progression",
    totalPercentage: 20,
    subcategories: [
      { name: "Fonds d'urgence", percentage: 11.67 },
      { name: "Projets", percentage: 8.33 },
    ],
  },
];

export const ALL_SUBCATEGORIES = BUDGET_CATEGORIES.flatMap(cat =>
  cat.subcategories.map(sub => ({
    category: cat.name,
    subcategory: sub.name,
    percentage: sub.percentage,
  }))
);

export function getCategoryForSubcategory(subcategory: string): string | undefined {
  for (const cat of BUDGET_CATEGORIES) {
    if (cat.subcategories.some(s => s.name === subcategory)) {
      return cat.name;
    }
  }
  return undefined;
}

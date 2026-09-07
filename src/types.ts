export interface SMAEGroup {
  id: string;
  name: string;
  shortName: string;
  category: 'verduras' | 'frutas' | 'cereales' | 'leguminosas' | 'aoa' | 'leche' | 'grasas' | 'azucares';
  kcal: number;
  protein: number;
  lipids: number;
  carbs: number;
  icon?: string;
  badgeColor: string;
}

export type MealKey = 'desayuno' | 'colacion1' | 'comida' | 'colacion2' | 'cena';

export interface MealColumn {
  key: MealKey;
  label: string;
  shortLabel: string;
  timeHint: string;
  iconName: string;
}

export interface SMAEIngredient {
  foodName: string;
  exactPortion: string;
  smaeGroup: string;
  equivalentsCount: number;
}

export interface MenuOption {
  title: string;
  description?: string;
  ingredients: SMAEIngredient[];
  preparation: string;
  nutritionistTip?: string;
}

export interface MealMenu {
  mealName: string;
  isFallback?: boolean;
  totalEquivalentsSummary: {
    group: string;
    quantity: number;
  }[];
  optionA: MenuOption;
  optionB: MenuOption;
  optionC: MenuOption;
}

export interface GeneratedPlan {
  patientNotes?: string;
  isFallback?: boolean;
  meals: MealMenu[];
  generatedAt: string;
}

export interface MealPreference {
  likes: string;
  dislikes: string;
}

export interface MealPreferences {
  desayuno: MealPreference;
  colacion1: MealPreference;
  comida: MealPreference;
  colacion2: MealPreference;
  cena: MealPreference;
}

export interface PatientInfo {
  name: string;
  date: string;
  goal: string;
  notes: string;
  preferredFoods?: string;
  dislikedFoods?: string;
  mealPreferences?: MealPreferences;
}

export interface MacroNutrientSummary {
  totalKcal: number;
  totalProteinGrams: number;
  totalLipidsGrams: number;
  totalCarbsGrams: number;
  proteinKcalPercent: number;
  lipidsKcalPercent: number;
  carbsKcalPercent: number;
  totalEquivalents: number;
}

export type MealOptionLetter = 'A' | 'B' | 'C';
export type MealOptionsSelection = MealOptionLetter[];

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
  netGrams?: number;
  preparationNotes?: string;
  isPreferred?: boolean;
  role?: 'coccion' | 'topping' | 'sazon' | 'principal' | 'guarnicion';
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
  generatedAt?: string;
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

export interface SkinfoldMeasurements {
  triceps?: string | number;
  subescapular?: string | number;
  biceps?: string | number;
  pectoral?: string | number;
  axilar?: string | number;
  crestaIliaca?: string | number;
  supraespinal?: string | number;
  abdominal?: string | number;
  musloFrontal?: string | number;
  pantorrillaMedial?: string | number;
}

export interface GirthMeasurements {
  brazoRelajado?: string | number;
  brazoContraido?: string | number;
  cinturaMinima?: string | number;
  caderasMaximo?: string | number;
  pantorrillaMaximo?: string | number;
}

export interface BreadthMeasurements {
  humeral?: string | number;
  biestiloideo?: string | number;
  femoral?: string | number;
}

export interface SomatotypeData {
  endomorphy: number;
  mesomorphy: number;
  ectomorphy: number;
  classification: string;
  categoryDescription?: string;
  x: number;
  y: number;
  isComplete: boolean;
}

export interface ManualNutrientEntry {
  enabled: boolean;
  name?: string;
  proteinGrams?: number | string;
  kcal?: number | string;
  lipidsGrams?: number | string;
  carbsGrams?: number | string;
  timing?: 'desayuno' | 'colacion1' | 'comida' | 'colacion2' | 'cena' | 'any';
  includeInMenu: boolean;
  notes?: string;
}

export interface ProteinSupplementInfo {
  enabled: boolean;
  brandOrType?: string; // ej. "Proteína de suero de leche (Whey Isolate / Concentrate)"
  scoops?: number; // ej. 1 medida
  proteinGramsPerServing?: number; // ej. 24 o 25g
  totalProteinGrams?: number; // scoops * proteinGramsPerServing
  timing?: 'desayuno' | 'colacion1' | 'comida' | 'colacion2' | 'cena' | 'post-entreno' | 'any';
  includeInMenu: boolean; // Contabilizar e incorporar en el menú generado por IA
  notes?: string;
}

export interface PatientInfo {
  name: string;
  date: string;
  goal: string;
  notes: string;
  gender?: 'Hombre' | 'Mujer' | '' | string;
  height?: string | number;
  weight?: string | number;
  age?: string | number;
  // Composición corporal (4 componentes)
  fatPercent?: string | number;
  fatKg?: string | number;
  musclePercent?: string | number;
  muscleKg?: string | number;
  bonePercent?: string | number;
  boneKg?: string | number;
  residualPercent?: string | number;
  residualKg?: string | number;
  // Pliegues cutáneos, circunferencias y diámetros
  skinfolds?: SkinfoldMeasurements;
  sumSkinfold3?: string | number;
  sumSkinfold6?: string | number;
  girths?: GirthMeasurements;
  breadths?: BreadthMeasurements;
  // Somatotipo ISAK (Heath-Carter)
  somatotype?: SomatotypeData;
  preferredFoods?: string;
  dislikedFoods?: string;
  mealPreferences?: MealPreferences;
  // Aporte manual de nutrientes (Proteína, Kcal, Lípidos, HC)
  manualNutrientEntry?: ManualNutrientEntry;
  // Suplemento de proteína (Suero de leche / Whey Protein)
  proteinSupplement?: ProteinSupplementInfo;
  // Conteo calórico y gasto energético
  caloricFormula?: 'harris-benedict' | 'mifflin-st-jeor' | 'katch-mcardle' | 'cunningham' | 'none';
  activityFactor?: number;
  weightStrategy?: 'real' | 'ideal' | 'adjusted';
  customCaloricTarget?: number;
  caloricAdjustment?: number;
  // Prescripción y distribución manual de macronutrientes
  macroPrescription?: ManualMacroPrescription;
}

export interface ManualMacroPrescription {
  enabled: boolean;
  targetKcal?: number;
  caloricAdjustment?: number;
  proteinPercent: number;
  lipidsPercent: number;
  carbsPercent: number;
  proteinGPerKg?: number;
  proteinBaseWeight?: 'real' | 'ideal' | 'lean' | 'adjusted';
  targetProteinGrams?: number;
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

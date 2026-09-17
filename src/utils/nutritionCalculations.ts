import { TableGridState, SMAE_GROUPS, MEAL_COLUMNS } from '../data/smaeData';
import { MealKey, MacroNutrientSummary, MealOptionLetter, PatientInfo, SkinfoldMeasurements } from '../types';

export function calculateRowTotal(groupId: string, tableState: TableGridState): number {
  const row = tableState[groupId];
  if (!row) return 0;
  return MEAL_COLUMNS.reduce((sum, col) => sum + (Number(row[col.key]) || 0), 0);
}

export function calculateColumnTotal(mealKey: MealKey, tableState: TableGridState): number {
  return SMAE_GROUPS.reduce((sum, group) => {
    const val = Number(tableState[group.id]?.[mealKey]) || 0;
    return sum + val;
  }, 0);
}

export function calculateGrandTotalEquivalents(tableState: TableGridState): number {
  return SMAE_GROUPS.reduce((sum, group) => {
    return sum + calculateRowTotal(group.id, tableState);
  }, 0);
}

export interface BmiInfo {
  value: number;
  formatted: string;
  category: string;
  colorClass: string;
}

export function calculateBmiInfo(heightStr?: string, weightStr?: string): BmiInfo | null {
  if (!heightStr || !weightStr) return null;
  const weightMatch = weightStr.replace(',', '.').match(/\d+(\.\d+)?/);
  const heightMatch = heightStr.replace(',', '.').match(/\d+(\.\d+)?/);
  if (!weightMatch || !heightMatch) return null;
  const w = parseFloat(weightMatch[0]);
  let h = parseFloat(heightMatch[0]);
  if (h > 3) h = h / 100;
  if (h <= 0.5 || h >= 2.6 || w <= 15 || w >= 350) return null;
  const imc = Math.round((w / (h * h)) * 10) / 10;
  let category = 'Normal';
  let colorClass = 'text-emerald-800 bg-emerald-100 border-emerald-300';
  if (imc < 18.5) {
    category = 'Bajo peso';
    colorClass = 'text-amber-800 bg-amber-100 border-amber-300';
  } else if (imc >= 25 && imc < 30) {
    category = 'Sobrepeso';
    colorClass = 'text-amber-800 bg-amber-100 border-amber-300';
  } else if (imc >= 30) {
    category = 'Obesidad';
    colorClass = 'text-rose-800 bg-rose-100 border-rose-300';
  }
  return {
    value: imc,
    formatted: `${imc.toFixed(1)} kg/m²`,
    category,
    colorClass,
  };
}

export interface SkinfoldSums {
  sum3: string | null;
  sum6: string | null;
  sum3Value: number | null;
  sum6Value: number | null;
  count3: number;
  count6: number;
  isComplete3: boolean;
  isComplete6: boolean;
  hasAny3: boolean;
  hasAny6: boolean;
}

export function calculateSkinfoldSums(skinfolds?: SkinfoldMeasurements): SkinfoldSums {
  if (!skinfolds) {
    return {
      sum3: null,
      sum6: null,
      sum3Value: null,
      sum6Value: null,
      count3: 0,
      count6: 0,
      isComplete3: false,
      isComplete6: false,
      hasAny3: false,
      hasAny6: false,
    };
  }

  const parseNum = (val?: string): number | null => {
    if (!val || typeof val !== 'string') return null;
    const clean = val.replace(',', '.').trim();
    const n = parseFloat(clean);
    return isNaN(n) || n <= 0 ? null : n;
  };

  // Σ3 Pliegues: Subescapular + Supraespinal + Abdominal
  const sub = parseNum(skinfolds.subescapular);
  const supra = parseNum(skinfolds.supraespinal);
  const abd = parseNum(skinfolds.abdominal);

  // Σ6 Pliegues: Tríceps + Subescapular + Supraespinal + Abdominal + Muslo frontal + Pantorrilla medial
  const tri = parseNum(skinfolds.triceps);
  const muslo = parseNum(skinfolds.musloFrontal);
  const pant = parseNum(skinfolds.pantorrillaMedial);

  const count3 = (sub !== null ? 1 : 0) + (supra !== null ? 1 : 0) + (abd !== null ? 1 : 0);
  const hasAny3 = count3 > 0;
  const isComplete3 = count3 === 3;
  const sum3Val = hasAny3 ? Math.round(((sub || 0) + (supra || 0) + (abd || 0)) * 10) / 10 : null;
  const sum3 = sum3Val !== null ? `${sum3Val.toFixed(1)} mm` : null;

  const count6 = count3 + (tri !== null ? 1 : 0) + (muslo !== null ? 1 : 0) + (pant !== null ? 1 : 0);
  const hasAny6 = count6 > 0;
  const isComplete6 = count6 === 6;
  const sum6Val = hasAny6
    ? Math.round(((sub || 0) + (supra || 0) + (abd || 0) + (tri || 0) + (muslo || 0) + (pant || 0)) * 10) / 10
    : null;
  const sum6 = sum6Val !== null ? `${sum6Val.toFixed(1)} mm` : null;

  return {
    sum3,
    sum6,
    sum3Value: sum3Val,
    sum6Value: sum6Val,
    count3,
    count6,
    isComplete3,
    isComplete6,
    hasAny3,
    hasAny6,
  };
}

export function calculateMacros(tableState: TableGridState): MacroNutrientSummary {
  let totalKcal = 0;
  let totalProteinGrams = 0;
  let totalLipidsGrams = 0;
  let totalCarbsGrams = 0;
  let totalEquivalents = 0;

  SMAE_GROUPS.forEach((group) => {
    const rowSum = calculateRowTotal(group.id, tableState);
    totalEquivalents += rowSum;
    totalKcal += rowSum * group.kcal;
    totalProteinGrams += rowSum * group.protein;
    totalLipidsGrams += rowSum * group.lipids;
    totalCarbsGrams += rowSum * group.carbs;
  });

  const proteinKcal = totalProteinGrams * 4;
  const lipidsKcal = totalLipidsGrams * 9;
  const carbsKcal = totalCarbsGrams * 4;
  const calculatedTotalKcal = proteinKcal + lipidsKcal + carbsKcal || 1;

  const proteinKcalPercent = Math.round((proteinKcal / calculatedTotalKcal) * 100);
  const lipidsKcalPercent = Math.round((lipidsKcal / calculatedTotalKcal) * 100);
  const carbsKcalPercent = Math.max(0, 100 - proteinKcalPercent - lipidsKcalPercent);

  return {
    totalKcal: Math.round(totalKcal),
    totalProteinGrams: Math.round(totalProteinGrams * 10) / 10,
    totalLipidsGrams: Math.round(totalLipidsGrams * 10) / 10,
    totalCarbsGrams: Math.round(totalCarbsGrams * 10) / 10,
    proteinKcalPercent,
    lipidsKcalPercent,
    carbsKcalPercent,
    totalEquivalents: Math.round(totalEquivalents * 10) / 10,
  };
}

export function normalizeOptionSelection(selection?: MealOptionLetter[] | string): MealOptionLetter[] {
  if (!selection) return ['A', 'B', 'C'];
  if (Array.isArray(selection)) {
    return selection.length > 0 ? selection : ['A', 'B', 'C'];
  }
  if (selection === 'all' || selection === 'both') return ['A', 'B', 'C'];
  if (selection === 'A') return ['A'];
  if (selection === 'B') return ['B'];
  if (selection === 'C') return ['C'];
  if (typeof selection === 'string') {
    const letters = (selection.match(/[ABC]/gi) || []).map((l) => l.toUpperCase() as MealOptionLetter);
    if (letters.length > 0) return Array.from(new Set(letters));
  }
  return ['A', 'B', 'C'];
}

export function formatClipboardMenu(
  plan: any,
  patientInfoOrName?: PatientInfo | string,
  selectedOptions: Record<string, MealOptionLetter[] | string> = {}
): string {
  if (!plan || !plan.meals) return '';

  const isObj = typeof patientInfoOrName === 'object' && patientInfoOrName !== null;
  const patientName = isObj ? patientInfoOrName.name : patientInfoOrName;
  const age = isObj ? patientInfoOrName.age : undefined;
  const weight = isObj ? patientInfoOrName.weight : undefined;
  const height = isObj ? patientInfoOrName.height : undefined;
  const bmi = isObj ? calculateBmiInfo(height, weight) : null;

  let text = `========================================================\n`;
  text += `🥗 PLAN DE ALIMENTACIÓN PERSONALIZADO (SMAE 5ta Edición)\n`;
  if (patientName) {
    text += `👤 Paciente: ${patientName}\n`;
  }
  const anthroParts = [
    age ? `Edad: ${age}` : '',
    weight ? `Masa Corporal: ${weight}` : '',
    height ? `Estatura: ${height}` : '',
    bmi ? `IMC: ${bmi.formatted} (${bmi.category})` : '',
  ].filter(Boolean);
  if (anthroParts.length > 0) {
    text += `📊 Datos Antropométricos: ${anthroParts.join(' | ')}\n`;
  }
  text += `📅 Fecha: ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}\n`;
  text += `========================================================\n\n`;

  if (plan.patientNotes) {
    text += `📌 RECOMENDACIONES GENERALES:\n${plan.patientNotes}\n\n`;
  }

  plan.meals.forEach((meal: any, idx: number) => {
    const hasEquivalents = Boolean(
      meal.totalEquivalentsSummary &&
        meal.totalEquivalentsSummary.length > 0 &&
        meal.totalEquivalentsSummary.some((eq: any) => (Number(eq.quantity) || 0) > 0)
    );

    const hasIngredientsA = Boolean(
      meal.optionA &&
        meal.optionA.ingredients &&
        meal.optionA.ingredients.length > 0
    );

    const hasIngredientsB = Boolean(
      meal.optionB &&
        meal.optionB.ingredients &&
        meal.optionB.ingredients.length > 0
    );

    const hasIngredientsC = Boolean(
      meal.optionC &&
        meal.optionC.ingredients &&
        meal.optionC.ingredients.length > 0
    );

    const hasMealValues = hasEquivalents || hasIngredientsA || hasIngredientsB || hasIngredientsC;

    // Skip empty meal
    if (!hasMealValues) return;

    text += `--------------------------------------------------------\n`;
    text += `⏰ ${meal.mealName.toUpperCase()}\n`;
    text += `--------------------------------------------------------\n`;

    // Porciones asignadas
    if (hasEquivalents) {
      const summaryList = meal.totalEquivalentsSummary
        .filter((s: any) => (Number(s.quantity) || 0) > 0)
        .map((s: any) => `${s.quantity} eq ${s.group}`)
        .join(', ');
      if (summaryList) {
        text += `📊 Equivalentes asignados: ${summaryList}\n\n`;
      }
    }

    const currentSelection = normalizeOptionSelection(selectedOptions[meal.mealName]);

    // Opcion A
    if (meal.optionA && currentSelection.includes('A') && hasIngredientsA) {
      text += `👉 OPCIÓN A: ${meal.optionA.title}\n`;
      if (meal.optionA.description) text += `   ${meal.optionA.description}\n`;
      text += `   Ingredientes (SMAE):\n`;
      meal.optionA.ingredients.forEach((ing: any) => {
        text += `   • ${ing.exactPortion} ${ing.foodName} (${ing.equivalentsCount} eq ${ing.smaeGroup})\n`;
      });
      if (meal.optionA.preparation) {
        text += `   Preparación: ${meal.optionA.preparation}\n`;
      }
      if (meal.optionA.nutritionistTip) {
        text += `   Tip: ${meal.optionA.nutritionistTip}\n`;
      }
      text += `\n`;
    }

    // Opcion B
    if (meal.optionB && currentSelection.includes('B') && hasIngredientsB) {
      text += `👉 OPCIÓN B: ${meal.optionB.title}\n`;
      if (meal.optionB.description) text += `   ${meal.optionB.description}\n`;
      text += `   Ingredientes (SMAE):\n`;
      meal.optionB.ingredients.forEach((ing: any) => {
        text += `   • ${ing.exactPortion} ${ing.foodName} (${ing.equivalentsCount} eq ${ing.smaeGroup})\n`;
      });
      if (meal.optionB.preparation) {
        text += `   Preparación: ${meal.optionB.preparation}\n`;
      }
      if (meal.optionB.nutritionistTip) {
        text += `   Tip: ${meal.optionB.nutritionistTip}\n`;
      }
      text += `\n`;
    }

    // Opcion C
    if (meal.optionC && currentSelection.includes('C') && hasIngredientsC) {
      text += `👉 OPCIÓN C: ${meal.optionC.title}\n`;
      if (meal.optionC.description) text += `   ${meal.optionC.description}\n`;
      text += `   Ingredientes (SMAE):\n`;
      meal.optionC.ingredients.forEach((ing: any) => {
        text += `   • ${ing.exactPortion} ${ing.foodName} (${ing.equivalentsCount} eq ${ing.smaeGroup})\n`;
      });
      if (meal.optionC.preparation) {
        text += `   Preparación: ${meal.optionC.preparation}\n`;
      }
      if (meal.optionC.nutritionistTip) {
        text += `   Tip: ${meal.optionC.nutritionistTip}\n`;
      }
      text += `\n`;
    }
  });

  text += `========================================================\n`;
  text += `Generado con Generador de Menús SMAE Pro | Nutrición de Precisión\n`;
  return text;
}

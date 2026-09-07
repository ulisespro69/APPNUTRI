import { TableGridState, SMAE_GROUPS, MEAL_COLUMNS } from '../data/smaeData';
import { MealKey, MacroNutrientSummary, MealOptionLetter } from '../types';

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
  patientName?: string,
  selectedOptions: Record<string, MealOptionLetter[] | string> = {}
): string {
  if (!plan || !plan.meals) return '';

  let text = `========================================================\n`;
  text += `🥗 PLAN DE ALIMENTACIÓN PERSONALIZADO (SMAE 5ta Edición)\n`;
  if (patientName) {
    text += `👤 Paciente: ${patientName}\n`;
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

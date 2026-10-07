import { MealMenu, MenuOption, SMAEIngredient, GeneratedPlan, ProteinSupplementInfo, ManualNutrientEntry } from '../types';
import { SMAE_FOODS_DATABASE, normalizeSearchString, SMAEFoodItem } from '../data/smaeFoodsDatabase';
import { SMAE_GROUPS } from '../data/smaeData';
import { reconcileOptionTitleAndPrep } from './smaeDishComposer';

// Canonical SMAE 5th Edition Group Names
export const CANONICAL_SMAE_GROUPS = [
  'Verdura',
  'Fruta',
  'Cereales sin grasa',
  'Cereales con grasa',
  'Leguminosas',
  'Alimento de origen animal muy bajo aporte de grasa',
  'Alimento de origen animal bajo aporte de grasa',
  'Alimento de origen animal moderado aporte de grasa',
  'Alimento de origen animal alto aporte de grasa',
  'Leche descremada',
  'Leche semidescremada',
  'Leche entera',
  'Leche con azúcar',
  'Aceites y grasas sin proteína',
  'Aceites y grasas con proteína',
  'Azúcares sin grasa',
  'Azúcares con grasa',
  'Alimentos libres de energía',
] as const;

export type CanonicalSMAEGroupName = typeof CANONICAL_SMAE_GROUPS[number];

/**
 * Normalizes and removes extraneous/abnormal whitespace between letters, words, and punctuation.
 * Eliminates spaces before commas, periods, colons, brackets, and collapses multiple spaces.
 * Fixes spaced-out letters (e.g. "p e c h u g a" -> "pechuga") while preserving legitimate single-letter Spanish words.
 * Guarantees space after comma, colon, semicolon, and period (punto y seguido).
 */
export function cleanSpacing(str?: string): string {
  if (!str) return '';
  let cleaned = str
    // Normalize special unicode spaces (non-breaking, zero-width, etc.)
    .replace(/[\u00A0\u2000-\u200B\u202F\u205F]/g, ' ')
    // Collapse internal tabs/carriage returns to space, preserving standard newlines
    .replace(/[\t\r]+/g, ' ')
    // Fix spaced out fractions like "1 / 2" -> "1/2", "3 / 4" -> "3/4"
    .replace(/(\d+)\s*\/\s*(\d+)/g, '$1/$2')
    // Fix spaced decimals like "1 . 5" -> "1.5"
    .replace(/(\d+)\s*\.\s*(\d+)/g, '$1.$2')
    // Collapse multiple horizontal spaces
    .replace(/[ ]{2,}/g, ' ')
    // Remove space before punctuation marks (comma, period, colon, semicolon, question, exclamation, brackets)
    .replace(/\s+([,.:;?!)\]%])/g, '$1')
    // Remove space after opening brackets/parentheses
    .replace(/([(\[])\s+/g, '$1')
    // Ensure space after comma, semicolon, colon when followed by a non-space, non-digit
    .replace(/([,;:])([^\s\d])/g, '$1 $2')
    // Ensure space after period when followed by a letter (punto y seguido)
    .replace(/(\.)([A-Za-zÁ-Úá-ú])/g, '$1 $2');

  // Fix spaced-out words where single letters are separated by single spaces (e.g. "p e c h u g a" -> "pechuga")
  cleaned = cleaned.replace(/(?:(?<=\s|^)[A-Za-zÁ-Úá-úñÑ]\s+){2,}[A-Za-zÁ-Úá-úñÑ](?=\s|$)/g, (match) => {
    // If it's a sequence of letters separated by spaces like "p e c h u g a" or "m a n z a n a"
    // collapse the spaces
    return match.replace(/\s+/g, '');
  });

  // Final collapse of any multiple spaces
  cleaned = cleaned.replace(/[ ]{2,}/g, ' ');

  return cleaned.trim();
}

/**
 * Normalizes any variations of SMAE group names into the exact canonical SMAE 5th Edition name.
 */
export function normalizeSMAEGroupName(rawGroup?: string): CanonicalSMAEGroupName {
  if (!rawGroup) return 'Verdura';
  const clean = normalizeSearchString(rawGroup);

  if (clean.includes('verdura')) return 'Verdura';
  if (clean.includes('fruta')) return 'Fruta';

  if (clean.includes('cereal')) {
    if (clean.includes('con grasa') || clean.includes('c/g') || clean.includes('cg')) {
      return 'Cereales con grasa';
    }
    return 'Cereales sin grasa';
  }

  if (clean.includes('leguminosa') || clean.includes('legumbre') || clean.includes('frijol') || clean.includes('lenteja')) {
    return 'Leguminosas';
  }

  if (clean.includes('animal') || clean.includes('aoa') || clean.includes('origen animal')) {
    if (clean.includes('muy bajo') || clean.includes('mb') || clean.includes('muy magro')) {
      return 'Alimento de origen animal muy bajo aporte de grasa';
    }
    if (clean.includes('bajo') || clean.includes('b')) {
      return 'Alimento de origen animal bajo aporte de grasa';
    }
    if (clean.includes('moderado') || clean.includes('mod') || clean.includes('medio')) {
      return 'Alimento de origen animal moderado aporte de grasa';
    }
    if (clean.includes('alto') || clean.includes('a')) {
      return 'Alimento de origen animal alto aporte de grasa';
    }
    return 'Alimento de origen animal muy bajo aporte de grasa';
  }

  if (clean.includes('leche')) {
    if (clean.includes('azucar') || clean.includes('azúcar') || clean.includes('sabor')) {
      return 'Leche con azúcar';
    }
    if (clean.includes('semi') || clean.includes('semidescremada')) {
      return 'Leche semidescremada';
    }
    if (clean.includes('entera')) {
      return 'Leche entera';
    }
    return 'Leche descremada';
  }

  if (clean.includes('aceite') || clean.includes('grasa') || clean.includes('lipido')) {
    if (clean.includes('con prote') || clean.includes('c/p') || clean.includes('cp')) {
      return 'Aceites y grasas con proteína';
    }
    return 'Aceites y grasas sin proteína';
  }

  if (clean.includes('azucar') || clean.includes('azúcar') || clean.includes('miel')) {
    if (clean.includes('con grasa') || clean.includes('c/g')) {
      return 'Azúcares con grasa';
    }
    return 'Azúcares sin grasa';
  }

  if (clean.includes('libre')) {
    return 'Alimentos libres de energía';
  }

  // Fallback to match exact name in list
  const match = CANONICAL_SMAE_GROUPS.find((g) => normalizeSearchString(g) === clean);
  return match || 'Verdura';
}

/**
 * Detects the true, authentic SMAE group of a food item.
 * Explicitly distinguishes without ambiguity:
 * 1) Aceites y grasas sin proteína (Aceites puros, aguacate, aceitunas, crema, mayonesa, mantequilla, queso crema) -> 45 kcal, 0g Prot, 5g Líp
 * 2) Aceites y grasas con proteína (Oleaginosas, semillas, frutos secos, cremas de frutos secos) -> 70 kcal, 3g Prot, 5g Líp
 * 3) Azúcares sin grasa (Miel de abeja, mermelada, azúcar mascabado, gelatina) -> 40 kcal, 0g Prot, 0g Líp, 10g HCO
 * 4) Azúcares con grasa (Chocolate, nutella, nieve de crema, pastel, donas, mazapán) -> 85 kcal, 0g Prot, 5g Líp, 10g HCO
 * 5) Jamón y derivados de carne (AOA bajo/moderado aporte de grasa, NUNCA libre/sazón)
 * 6) Alimentos libres de energía (Ajo, especias, condimentos, hierbas aromáticas, sazón) -> 0 kcal
 * 7) Cereales con grasa vs Cereales sin grasa
 * 8) Leguminosas, AOA, Leche, Verduras y Frutas
 */
export function detectTrueSMAEGroup(foodName: string, declaredGroup?: string): CanonicalSMAEGroupName {
  const clean = normalizeSearchString(foodName || '');

  // 0. MEAT & COLD CUTS GUARDS (El jamón y derivados NUNCA se consideran libre/sazón ni verdura)
  const isMeatOrHam =
    clean.includes('jamon') ||
    clean.includes('salchicha') ||
    clean.includes('embutido') ||
    clean.includes('pechuga de pavo') ||
    clean.includes('bistec') ||
    clean.includes('pollo') ||
    clean.includes('res ') ||
    clean.includes('cerdo') ||
    clean.includes('pescado') ||
    clean.includes('atun') ||
    clean.includes('salmon');

  if (isMeatOrHam) {
    if (clean.includes('jamon') || clean.includes('pechuga de pavo')) {
      return 'Alimento de origen animal bajo aporte de grasa';
    }
    if (clean.includes('salchicha')) {
      return 'Alimento de origen animal moderado aporte de grasa';
    }
    if (clean.includes('pollo') || clean.includes('pescado') || clean.includes('atun')) {
      return 'Alimento de origen animal muy bajo aporte de grasa';
    }
  }

  // 1. FREE FOODS / SEASONINGS / CONDIMENTS (Alimentos libres de energía - 0 kcal)
  // Ajo, especias, condimentos y sazón de cocción nunca deben computar como verdura calórica
  const isFreeSeasoning =
    !isMeatOrHam &&
    (clean.includes('especias') ||
      clean.includes('hierbas de olor') ||
      clean.includes('hierbas aromaticas') ||
      clean.includes('oregano') ||
      clean.includes('pimienta') ||
      clean.includes('canela') ||
      clean.includes('clavo') ||
      clean.includes('comino') ||
      clean.includes('paprika') ||
      clean.includes('pimenton') ||
      clean.includes('curcuma') ||
      clean.includes('laurel') ||
      clean.includes('epazote') ||
      clean.includes('sal marina') ||
      clean.includes('sal con ajo') ||
      clean.includes('cafe negro') ||
      clean.includes('infusion') ||
      clean.includes('te verde') ||
      clean.includes('te de manzanilla') ||
      clean.includes('agua natural') ||
      clean.includes('sazon libre') ||
      clean.includes('al gusto libre') ||
      (clean.includes('ajo') && !clean.includes('jitomate') && !clean.includes('arroz con')));

  if (isFreeSeasoning) {
    return 'Alimentos libres de energía';
  }

  // 2. OLEAGINOSAS Y SEMILLAS CON PROTEÍNA (Aceites y grasas con proteína - 70 kcal, 3g Prot, 5g Líp)
  // Almendras, nueces, cacahuates, pistaches, chía, ajonjolí, pepitas, linaza, piñones, avellanas, mantequilla de maní
  // Éstas son TOPPINGS crujientes o agregados para tazón; nunca grasas puras de cocción
  const isOilWithProtein =
    (!clean.includes('aceite de ') && !clean.includes('aceite vegetal')) &&
    (clean.includes('almendra') ||
      clean.includes('nuez') ||
      clean.includes('nueces') ||
      clean.includes('cacahuate') ||
      clean.includes('cacahuates') ||
      clean.includes('pistache') ||
      clean.includes('pistaches') ||
      clean.includes('chia') ||
      clean.includes('chía') ||
      clean.includes('pepita') ||
      clean.includes('pepitas') ||
      clean.includes('ajonjoli') ||
      clean.includes('ajonjolí') ||
      clean.includes('sesamo') ||
      clean.includes('sésamo') ||
      clean.includes('linaza') ||
      clean.includes('avellana') ||
      clean.includes('avellanas') ||
      clean.includes('pinon') ||
      clean.includes('piñon') ||
      clean.includes('piñones') ||
      clean.includes('macadamia') ||
      (clean.includes('girasol') && !clean.includes('aceite')) ||
      clean.includes('crema de cacahuate') ||
      clean.includes('mantequilla de mani') ||
      clean.includes('mantequilla de cacahuate') ||
      clean.includes('crema de almendra') ||
      clean.includes('mantequilla de almendra') ||
      clean.includes('tahini'));

  if (isOilWithProtein) {
    return 'Aceites y grasas con proteína';
  }

  // 3. ACEITES PUROS Y GRASAS SIN PROTEÍNA (45 kcal, 0g Prot, 5g Líp)
  // Aceites para cocinar, de mesa, aguacate, aceitunas, crema, mayonesa, mantequilla, queso crema, tocino
  // NOTA CLAVE: Cualquier aceite líquido (incluso aceite de ajonjolí o aguacate) tiene 0g de proteína
  const isPureOilOrFatWithoutProtein =
    clean.includes('aceite') ||
    clean.includes('aguacate') ||
    clean.includes('aceituna') ||
    clean.includes('aceitunas') ||
    clean.includes('crema de vaca') ||
    clean.includes('media crema') ||
    clean.includes('crema acida') ||
    clean.includes('crema fresca') ||
    clean.includes('mayonesa') ||
    clean.includes('mantequilla') ||
    clean.includes('margarina') ||
    clean.includes('queso crema') ||
    clean.includes('philadelphia') ||
    clean.includes('guacamole') ||
    clean.includes('tocino') ||
    clean.includes('manteca') ||
    (clean.includes('aderezo') && !clean.includes('tahini'));

  if (isPureOilOrFatWithoutProtein) {
    return 'Aceites y grasas sin proteína';
  }

  // 4. AZÚCARES CON GRASA (85 kcal, 0g Prot, 5g Líp, 10g HCO)
  // Chocolates, nutella, repostería con grasa, helado/nieve de crema, donas, mazapán dulce
  const isSugarWithFat =
    clean.includes('chocolate') ||
    clean.includes('chocolates') ||
    clean.includes('nutella') ||
    clean.includes('crema de avellana con cacao') ||
    clean.includes('cocoa con azucar') ||
    clean.includes('pastel') ||
    clean.includes('pastelito') ||
    clean.includes('gansito') ||
    clean.includes('chocoroles') ||
    clean.includes('pingüino') ||
    clean.includes('submarino') ||
    clean.includes('pay ') ||
    clean.includes('pays') ||
    clean.includes('flan con caramelo') ||
    clean.includes('flan casero con azucar') ||
    clean.includes('dona ') ||
    clean.includes('donas') ||
    clean.includes('nieve de crema') ||
    clean.includes('helado de crema') ||
    clean.includes('helado de leche') ||
    clean.includes('helado de vainilla') ||
    clean.includes('helado de chocolate') ||
    clean.includes('mazapan') ||
    clean.includes('mazapán') ||
    clean.includes('chantilly') ||
    clean.includes('crema batida');

  if (isSugarWithFat) {
    return 'Azúcares con grasa';
  }

  // 5. AZÚCARES SIN GRASA (40 kcal, 0g Prot, 0g Líp, 10g HCO)
  // Miel de abeja, mermelada, azúcar mascabado, piloncillo, gelatina, gomitas, jarabe puro
  const isSugarWithoutFat =
    clean.includes('miel') ||
    clean.includes('mermelada') ||
    clean.includes('jalea') ||
    clean.includes('azucar') ||
    clean.includes('azúcar') ||
    clean.includes('mascabado') ||
    clean.includes('piloncillo') ||
    clean.includes('gelatina') ||
    clean.includes('gomita') ||
    clean.includes('gomitas') ||
    clean.includes('caramelo macizo') ||
    clean.includes('paleta helada de agua') ||
    clean.includes('nieve de limon') ||
    clean.includes('nieve de agua') ||
    clean.includes('refresco') ||
    clean.includes('jarabe de maple puro') ||
    clean.includes('cajeta sin grasa');

  if (isSugarWithoutFat) {
    return 'Azúcares sin grasa';
  }

  // 6. CEREALES CON GRASA (115 kcal, 2g Prot, 5g Líp, 15g HCO)
  const isCerealWithFat =
    clean.includes('granola') ||
    clean.includes('galleta con chispas') ||
    clean.includes('galleta dulce') ||
    clean.includes('galletas dulces') ||
    clean.includes('galleta oreo') ||
    clean.includes('galleta de avena con pasas') ||
    clean.includes('galleta de avena casera') ||
    clean.includes('papas fritas') ||
    clean.includes('papa frita') ||
    clean.includes('papas a la francesa') ||
    clean.includes('pan dulce') ||
    clean.includes('concha ') ||
    clean.includes('bisquet') ||
    clean.includes('cuernito') ||
    clean.includes('croissant') ||
    clean.includes('tamal') ||
    clean.includes('pizza') ||
    clean.includes('totopos fritos') ||
    clean.includes('totopo frito') ||
    clean.includes('pure de papa preparado') ||
    clean.includes('pure de papa con mantequilla') ||
    clean.includes('barrita con chocolate');

  if (isCerealWithFat) {
    return 'Cereales con grasa';
  }

  // 7. CEREALES SIN GRASA (70 kcal, 2g Prot, 0g Líp, 15g HCO)
  // NOTA: Papa cocida o al vapor con piel es Cereal sin grasa según SMAE 5ta Edición
  const isCerealWithoutFat =
    clean.includes('tortilla de maiz') ||
    clean.includes('tortilla nixtamalizada') ||
    clean.includes('tortilla azul') ||
    clean.includes('arroz') ||
    clean.includes('avena') ||
    clean.includes('papa cocida') ||
    clean.includes('papa al vapor') ||
    clean.includes('papa hervida') ||
    clean.includes('papas cocidas') ||
    (clean.includes('papa') && !clean.includes('frita') && !clean.includes('pure') && !clean.includes('francesa')) ||
    clean.includes('camote') ||
    clean.includes('pan integral') ||
    clean.includes('pan de caja') ||
    clean.includes('pan blanco') ||
    clean.includes('pasta') ||
    clean.includes('espagueti') ||
    clean.includes('fideo') ||
    clean.includes('elote') ||
    clean.includes('quinoa') ||
    clean.includes('tostada horneada') ||
    clean.includes('bolillo') ||
    clean.includes('telera') ||
    clean.includes('galleta habanera') ||
    clean.includes('galletas habaneras') ||
    clean.includes('galletas saladas') ||
    clean.includes('corn flakes') ||
    clean.includes('amaranto') ||
    clean.includes('palomitas de maiz naturales');

  if (isCerealWithoutFat) {
    return 'Cereales sin grasa';
  }

  // 8. Check in SMAE Foods database
  const dbMatch = SMAE_FOODS_DATABASE.find((item) => {
    const norm = normalizeSearchString(item.name);
    return norm === clean || norm.includes(clean) || clean.includes(norm);
  });
  if (dbMatch) {
    return normalizeSMAEGroupName(dbMatch.groupName);
  }

  return normalizeSMAEGroupName(declaredGroup);
}

/**
 * Detects the specific culinary role of an ingredient in the menu.
 * - 'coccion': Fats or oils used for sautéing or cooking.
 * - 'topping': Nuts, seeds, avocado slices, or decorative toppings.
 * - 'sazon': Free seasonings (garlic, herbs, spices).
 * - 'principal': Primary protein (meat, fish, poultry, eggs).
 * - 'guarnicion': Base carbohydrates, legumes, or side vegetables.
 */
export function detectIngredientRole(
  foodName: string,
  smaeGroup?: string
): 'coccion' | 'topping' | 'sazon' | 'principal' | 'guarnicion' {
  const normName = normalizeSearchString(foodName || '');
  const normGrp = normalizeSMAEGroupName(smaeGroup);

  if (
    normGrp === 'Alimentos libres de energía' ||
    normName.includes('especias') ||
    normName.includes('hierbas') ||
    normName.includes('oregano') ||
    normName.includes('pimienta') ||
    normName.includes('canela') ||
    normName.includes('comino') ||
    normName.includes('laurel') ||
    normName.includes('epazote') ||
    normName.includes('sazon') ||
    normName.includes('condimento') ||
    normName.includes('al gusto libre') ||
    (normName.includes('ajo') && !normName.includes('jitomate') && !normName.includes('arroz con'))
  ) {
    return 'sazon';
  }

  if (
    normGrp === 'Aceites y grasas sin proteína' &&
    (normName.includes('aceite') || normName.includes('cocinar') || normName.includes('preparacion') || normName.includes('mantequilla'))
  ) {
    return 'coccion';
  }

  if (
    normGrp === 'Aceites y grasas con proteína' ||
    normName.includes('topping') ||
    normName.includes('almendra') ||
    normName.includes('nuez') ||
    normName.includes('cacahuate') ||
    normName.includes('pistache') ||
    normName.includes('chia') ||
    normName.includes('pepita') ||
    normName.includes('ajonjoli') ||
    normName.includes('linaza') ||
    normName.includes('girasol') ||
    normName.includes('aguacate') ||
    normName.includes('aceituna') ||
    normName.includes('crema de vaca')
  ) {
    return 'topping';
  }

  if (
    normGrp.includes('Alimento de origen animal') ||
    normName.includes('pollo') ||
    normName.includes('pechuga') ||
    normName.includes('pescado') ||
    normName.includes('atun') ||
    normName.includes('huevo') ||
    normName.includes('claras') ||
    normName.includes('bistec') ||
    normName.includes('res') ||
    normName.includes('lomo') ||
    normName.includes('panela') ||
    normName.includes('oaxaca')
  ) {
    return 'principal';
  }

  return 'guarnicion';
}

/**
 * Returns badge styling and clean label matching the official SMAE category colors.
 */
export function getGroupBadgeConfig(groupName?: string): {
  shortName: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
} {
  const norm = normalizeSMAEGroupName(groupName);
  switch (norm) {
    case 'Verdura':
      return { shortName: 'Verdura', badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-800', badgeBorder: 'border-emerald-300', dotColor: 'bg-emerald-500' };
    case 'Fruta':
      return { shortName: 'Fruta', badgeBg: 'bg-amber-50', badgeText: 'text-amber-800', badgeBorder: 'border-amber-300', dotColor: 'bg-amber-500' };
    case 'Cereales sin grasa':
      return { shortName: 'Cereales s/g', badgeBg: 'bg-yellow-50', badgeText: 'text-yellow-800', badgeBorder: 'border-yellow-300', dotColor: 'bg-yellow-500' };
    case 'Cereales con grasa':
      return { shortName: 'Cereales c/g', badgeBg: 'bg-amber-100', badgeText: 'text-amber-900', badgeBorder: 'border-amber-400', dotColor: 'bg-amber-600' };
    case 'Leguminosas':
      return { shortName: 'Leguminosas', badgeBg: 'bg-stone-100', badgeText: 'text-stone-800', badgeBorder: 'border-stone-300', dotColor: 'bg-stone-600' };
    case 'Alimento de origen animal muy bajo aporte de grasa':
      return { shortName: 'AOA Muy Bajo', badgeBg: 'bg-rose-50', badgeText: 'text-rose-800', badgeBorder: 'border-rose-300', dotColor: 'bg-rose-500' };
    case 'Alimento de origen animal bajo aporte de grasa':
      return { shortName: 'AOA Bajo', badgeBg: 'bg-rose-100', badgeText: 'text-rose-900', badgeBorder: 'border-rose-400', dotColor: 'bg-rose-600' };
    case 'Alimento de origen animal moderado aporte de grasa':
      return { shortName: 'AOA Moderado', badgeBg: 'bg-orange-100', badgeText: 'text-orange-900', badgeBorder: 'border-orange-400', dotColor: 'bg-orange-500' };
    case 'Alimento de origen animal alto aporte de grasa':
      return { shortName: 'AOA Alto', badgeBg: 'bg-red-100', badgeText: 'text-red-900', badgeBorder: 'border-red-400', dotColor: 'bg-red-600' };
    case 'Leche descremada':
      return { shortName: 'Leche Descremada', badgeBg: 'bg-sky-50', badgeText: 'text-sky-800', badgeBorder: 'border-sky-300', dotColor: 'bg-sky-500' };
    case 'Leche semidescremada':
      return { shortName: 'Leche Semidescr.', badgeBg: 'bg-sky-100', badgeText: 'text-sky-900', badgeBorder: 'border-sky-400', dotColor: 'bg-sky-600' };
    case 'Leche entera':
      return { shortName: 'Leche Entera', badgeBg: 'bg-blue-100', badgeText: 'text-blue-900', badgeBorder: 'border-blue-400', dotColor: 'bg-blue-600' };
    case 'Leche con azúcar':
      return { shortName: 'Leche c/ Azúcar', badgeBg: 'bg-indigo-50', badgeText: 'text-indigo-900', badgeBorder: 'border-indigo-300', dotColor: 'bg-indigo-600' };
    case 'Aceites y grasas sin proteína':
      return { shortName: 'Grasas s/ Prot', badgeBg: 'bg-lime-50', badgeText: 'text-lime-900', badgeBorder: 'border-lime-300', dotColor: 'bg-lime-600' };
    case 'Aceites y grasas con proteína':
      return { shortName: 'Grasas c/ Prot', badgeBg: 'bg-teal-50', badgeText: 'text-teal-900', badgeBorder: 'border-teal-300', dotColor: 'bg-teal-600' };
    case 'Azúcares sin grasa':
      return { shortName: 'Azúcar s/ Grasa', badgeBg: 'bg-purple-50', badgeText: 'text-purple-900', badgeBorder: 'border-purple-300', dotColor: 'bg-purple-600' };
    case 'Azúcares con grasa':
      return { shortName: 'Azúcar c/ Grasa', badgeBg: 'bg-fuchsia-50', badgeText: 'text-fuchsia-900', badgeBorder: 'border-fuchsia-300', dotColor: 'bg-fuchsia-600' };
    case 'Alimentos libres de energía':
      return { shortName: 'Libre / Sazón', badgeBg: 'bg-slate-100', badgeText: 'text-slate-700', badgeBorder: 'border-slate-300', dotColor: 'bg-slate-500' };
    default:
      return { shortName: 'SMAE', badgeBg: 'bg-slate-100', badgeText: 'text-slate-700', badgeBorder: 'border-slate-300', dotColor: 'bg-slate-400' };
  }
}

/**
 * Varied, high-quality, authentic SMAE 5th Edition reference foods by canonical group.
 * Used for rotation, anti-repetition, and automatic rectification of missing equivalents.
 */
export const SMAE_CANONICAL_FOODS_BY_GROUP: Record<
  CanonicalSMAEGroupName,
  Array<{ name: string; household: string; netGrams: number; unit: string; tip?: string }>
> = {
  'Verdura': [
    { name: 'Espinacas cocidas al vapor', household: '1/2 taza', netGrams: 90, unit: 'g' },
    { name: 'Nopales cocidos o al comal', household: '1 taza', netGrams: 150, unit: 'g' },
    { name: 'Jitomate bola o guajillo picado', household: '1 pieza mediana', netGrams: 120, unit: 'g' },
    { name: 'Calabacitas tiernas en cubos', household: '1 taza', netGrams: 110, unit: 'g' },
    { name: 'Chayote cocido al vapor', household: '1/2 taza', netGrams: 80, unit: 'g' },
    { name: 'Flor de calabaza limpia', household: '1 taza', netGrams: 80, unit: 'g' },
    { name: 'Pepino rebanado con cáscara', household: '1 1/2 taza', netGrams: 156, unit: 'g' },
    { name: 'Brócoli al vapor', household: '1 taza', netGrams: 92, unit: 'g' },
    { name: 'Champiñones rebanados cocidos', household: '1/2 taza', netGrams: 78, unit: 'g' },
    { name: 'Pimiento morrón en tiras', household: '1 pieza', netGrams: 120, unit: 'g' },
    { name: 'Ejotes tiernos cocidos', household: '1/2 taza', netGrams: 75, unit: 'g' },
    { name: 'Zanahoria rallada fresca o cocida', household: '1/2 taza', netGrams: 55, unit: 'g' },
    { name: 'Acelgas cocidas al vapor', household: '1/2 taza', netGrams: 75, unit: 'g' },
    { name: 'Jícama picada en bastones', household: '1 taza', netGrams: 130, unit: 'g' },
    { name: 'Tomatillo verde de cáscara', household: '2 piezas medianas', netGrams: 100, unit: 'g' },
    { name: 'Espárragos cocidos al vapor', household: '6 piezas', netGrams: 90, unit: 'g' },
    { name: 'Huitlacoche cocido', household: '1/3 taza', netGrams: 50, unit: 'g' },
  ],
  'Fruta': [
    { name: 'Manzana fresca con cáscara', household: '1 pieza chica', netGrams: 106, unit: 'g' },
    { name: 'Fresas frescas rebanadas', household: '1 taza colmada', netGrams: 152, unit: 'g' },
    { name: 'Papaya picada en cubos', household: '1 taza', netGrams: 140, unit: 'g' },
    { name: 'Plátano tabasco o dominico', household: '1/2 pieza', netGrams: 60, unit: 'g' },
    { name: 'Melón picado fresco', household: '1 taza', netGrams: 160, unit: 'g' },
    { name: 'Sandía picada fresca', household: '1 taza', netGrams: 160, unit: 'g' },
    { name: 'Moras o arándanos frescos', household: '3/4 taza', netGrams: 110, unit: 'g' },
    { name: 'Guayaba fresca en cuartos', household: '3 piezas medianas', netGrams: 135, unit: 'g' },
    { name: 'Mandarina fresca en gajos', household: '2 piezas chicas', netGrams: 130, unit: 'g' },
    { name: 'Kiwi en rodajas', household: '1 1/2 pieza', netGrams: 114, unit: 'g' },
    { name: 'Piña fresca picada', household: '3/4 taza', netGrams: 124, unit: 'g' },
    { name: 'Naranja fresca en gajos', household: '2 piezas chicas', netGrams: 150, unit: 'g' },
    { name: 'Mango picado en cubos', household: '1/2 taza', netGrams: 82, unit: 'g' },
    { name: 'Pera fresca en rebanadas', household: '1/2 pieza mediana', netGrams: 90, unit: 'g' },
    { name: 'Durazno fresco', household: '2 piezas medianas', netGrams: 130, unit: 'g' },
    { name: 'Toronja fresca en gajos', household: '1 pieza mediana', netGrams: 200, unit: 'g' },
  ],
  'Cereales sin grasa': [
    { name: 'Tortilla de maíz nixtamalizado comaleada', household: '1 pieza', netGrams: 30, unit: 'g' },
    { name: 'Avena integral en hojuelas', household: '1/3 taza', netGrams: 20, unit: 'g' },
    { name: 'Arroz blanco o integral al vapor', household: '1/3 taza', netGrams: 48, unit: 'g' },
    { name: 'Papa cocida o al vapor con cáscara', household: '1/2 pieza', netGrams: 90, unit: 'g' },
    { name: 'Tostada horneada de maíz (ej. Saníssimo)', household: '2 piezas', netGrams: 24, unit: 'g' },
    { name: 'Pan integral de caja', household: '1 rebanada', netGrams: 25, unit: 'g' },
    { name: 'Quinoa cocida al vapor', household: '1/3 taza', netGrams: 62, unit: 'g' },
    { name: 'Elote blanco o amarillo desgranado cocido', household: '1/2 taza', netGrams: 83, unit: 'g' },
    { name: 'Amaranto tostado natural', household: '1/4 taza', netGrams: 20, unit: 'g' },
    { name: 'Pasta integral cocida al dente', household: '1/3 taza', netGrams: 47, unit: 'g' },
    { name: 'Camote cocido al vapor o al horno', household: '1/3 pieza', netGrams: 50, unit: 'g' },
    { name: 'Bolillo o telera sin migajón', household: '1/2 pieza', netGrams: 30, unit: 'g' },
    { name: 'Galletas habaneras integrales', household: '4 piezas', netGrams: 28, unit: 'g' },
    { name: 'Palomitas de maíz naturales caseras', household: '2 1/2 tazas', netGrams: 20, unit: 'g' },
  ],
  'Cereales con grasa': [
    { name: 'Galleta de avena casera con pasas', household: '1 pieza pequeña', netGrams: 25, unit: 'g' },
    { name: 'Barra de amaranto con cacao amargo', household: '1 pieza', netGrams: 20, unit: 'g' },
    { name: 'Granola natural de avena con miel', household: '3 cucharadas', netGrams: 20, unit: 'g' },
    { name: 'Papas en gajos horneadas con pimentón', household: '1/2 taza', netGrams: 70, unit: 'g' },
    { name: 'Puré de papa con mantequilla y leche', household: '1/2 taza', netGrams: 100, unit: 'g' },
    { name: 'Tostada frita casera escurrida', household: '1 pieza', netGrams: 15, unit: 'g' },
    { name: 'Pan dulce tradicional (concha o cuernito)', household: '1/3 pieza', netGrams: 25, unit: 'g' },
    { name: 'Tamal tradicional de pollo o verduras', household: '1/4 pieza', netGrams: 45, unit: 'g' },
  ],
  'Leguminosas': [
    { name: 'Frijoles negros enteros de la olla', household: '1/2 taza', netGrams: 86, unit: 'g' },
    { name: 'Frijoles bayos o peruanos machacados', household: '1/2 taza', netGrams: 86, unit: 'g' },
    { name: 'Lentejas cocidas con recaudo casero', household: '1/2 taza', netGrams: 100, unit: 'g' },
    { name: 'Garbanzos cocidos al pimentón', household: '1/2 taza', netGrams: 82, unit: 'g' },
    { name: 'Habas cocidas tiernas al vapor', household: '1/2 taza', netGrams: 85, unit: 'g' },
    { name: 'Soya cocida texturizada o en grano', household: '1/3 taza', netGrams: 60, unit: 'g' },
    { name: 'Alubias blancas cocidas', household: '1/2 taza', netGrams: 90, unit: 'g' },
  ],
  'Alimento de origen animal muy bajo aporte de grasa': [
    { name: 'Pechuga de pollo cocida y deshebrada sin piel', household: '30g cocida (40g cruda)', netGrams: 30, unit: 'g' },
    { name: 'Filete de pescado blanco (tilapia o merluza)', household: '40g cocido (50g crudo)', netGrams: 40, unit: 'g' },
    { name: 'Atún en agua drenado bajo en sodio', household: '1/3 lata', netGrams: 40, unit: 'g' },
    { name: 'Claras de huevo frescas al comal', household: '2 piezas', netGrams: 66, unit: 'g' },
    { name: 'Camarón cocido al vapor o pacotilla', household: '4 piezas medianas', netGrams: 35, unit: 'g' },
    { name: 'Queso cottage descremado / light', household: '3 cucharadas soperas', netGrams: 45, unit: 'g' },
    { name: 'Salmón fresco a la plancha', household: '30g cocido', netGrams: 30, unit: 'g' },
    { name: 'Pulpo tierno cocido', household: '35g cocido', netGrams: 35, unit: 'g' },
    { name: 'Huachinango o róbalo al comal', household: '40g cocido', netGrams: 40, unit: 'g' },
  ],
  'Alimento de origen animal bajo aporte de grasa': [
    { name: 'Queso panela fresco artesanal en cubos', household: '40g', netGrams: 40, unit: 'g' },
    { name: 'Bistec de res magro asado', household: '30g cocido (40g crudo)', netGrams: 30, unit: 'g' },
    { name: 'Jamón de pechuga de pavo bajo en sodio', household: '2 rebanadas delgadas', netGrams: 42, unit: 'g' },
    { name: 'Requesón artesanal descremado', household: '3 cucharadas soperas', netGrams: 45, unit: 'g' },
    { name: 'Lomo de cerdo magro a la plancha', household: '30g cocido', netGrams: 30, unit: 'g' },
    { name: 'Falda de res magra deshebrada (salpicón)', household: '30g cocido', netGrams: 30, unit: 'g' },
    { name: 'Atún fresco sellado en medallón', household: '35g cocido', netGrams: 35, unit: 'g' },
    { name: 'Queso canasto o fresco bajo en grasa', household: '35g', netGrams: 35, unit: 'g' },
  ],
  'Alimento de origen animal moderado aporte de grasa': [
    { name: 'Huevo fresco de gallina entero revuelto', household: '1 pieza', netGrams: 50, unit: 'g' },
    { name: 'Salchicha de pavo cocida', household: '1 pieza', netGrams: 45, unit: 'g' },
    { name: 'Queso Oaxaca artesanal deshebrado', household: '30g', netGrams: 30, unit: 'g' },
    { name: 'Queso fresco de rancho artesanal', household: '35g', netGrams: 35, unit: 'g' },
    { name: 'Sardina en salsa de jitomate drenada', household: '1 pieza pequeña', netGrams: 30, unit: 'g' },
    { name: 'Carne molida magra de res 90/10 cocida', household: '30g cocido', netGrams: 30, unit: 'g' },
    { name: 'Queso cotija artesanal molido', household: '20g', netGrams: 20, unit: 'g' },
  ],
  'Alimento de origen animal alto aporte de grasa': [
    { name: 'Queso manchego artesanal en rebanadas', household: '25g', netGrams: 25, unit: 'g' },
    { name: 'Salchicha de cerdo o viena', household: '3/4 pieza', netGrams: 34, unit: 'g' },
    { name: 'Queso gouda artesanal en láminas', household: '25g', netGrams: 25, unit: 'g' },
    { name: 'Queso amarillo tipo americano', household: '1 rebanada', netGrams: 25, unit: 'g' },
    { name: 'Chilorio de cerdo tradicional', household: '2 cucharadas', netGrams: 30, unit: 'g' },
  ],
  'Leche descremada': [
    { name: 'Leche descremada (light o deslactosada light)', household: '1 taza', netGrams: 240, unit: 'ml' },
    { name: 'Yogur natural descremado sin azúcar (0% grasa)', household: '3/4 taza', netGrams: 150, unit: 'g' },
    { name: 'Yogur griego natural 0% grasa sin endulzar', household: '4 cucharadas soperas', netGrams: 100, unit: 'g' },
    { name: 'Kéfir natural descremado bebible', household: '3/4 taza', netGrams: 180, unit: 'ml' },
  ],
  'Leche semidescremada': [
    { name: 'Leche semidescremada (1-2% grasa)', household: '1 taza', netGrams: 240, unit: 'ml' },
    { name: 'Yogur semidescremado natural sin azúcar', household: '3/4 taza', netGrams: 150, unit: 'g' },
  ],
  'Leche entera': [
    { name: 'Leche entera pasteurizada', household: '1 taza', netGrams: 240, unit: 'ml' },
    { name: 'Yogur natural entero sin azúcar', household: '1/2 taza', netGrams: 125, unit: 'g' },
  ],
  'Leche con azúcar': [
    { name: 'Yogur bebible con fruta', household: '1/2 taza', netGrams: 120, unit: 'ml' },
    { name: 'Leche con chocolate baja en grasa', household: '3/4 taza', netGrams: 180, unit: 'ml' },
  ],
  'Aceites y grasas sin proteína': [
    { name: 'Aceite de oliva extra virgen (en la preparación / para cocinar)', household: '1 cucharadita', netGrams: 5, unit: 'ml' },
    { name: 'Aguacate Hass en rebanadas (topping de mesa)', household: '1/3 pieza', netGrams: 45, unit: 'g' },
    { name: 'Aceite vegetal para cocinar (en la preparación)', household: '1 cucharadita', netGrams: 5, unit: 'ml' },
    { name: 'Aceitunas verdes o negras deshuesadas (topping / botana)', household: '6 piezas medianas', netGrams: 30, unit: 'g' },
    { name: 'Crema de vaca fresca (topping)', household: '1 cucharada sopera', netGrams: 15, unit: 'g' },
    { name: 'Mayonesa reducida en grasa', household: '1 cucharada sopera', netGrams: 15, unit: 'g' },
    { name: 'Mantequilla pura sin sal', household: '1 1/2 cucharaditas', netGrams: 8, unit: 'g' },
    { name: 'Queso crema tipo Philadelphia (topping)', household: '1 cucharada sopera', netGrams: 14, unit: 'g' },
    { name: 'Guacamole natural con limón (topping de mesa)', household: '2 cucharadas soperas', netGrams: 30, unit: 'g' },
    { name: 'Aceite de aguacate virgen (en la preparación)', household: '1 cucharadita', netGrams: 5, unit: 'ml' },
    { name: 'Media crema fresca (topping)', household: '1 cucharada sopera', netGrams: 15, unit: 'g' },
  ],
  'Aceites y grasas con proteína': [
    { name: 'Almendras naturales fileteadas tostadas (topping)', household: '10 piezas', netGrams: 12, unit: 'g' },
    { name: 'Nuez pecana en trozos crujiente (topping)', household: '3 piezas en mitades', netGrams: 12, unit: 'g' },
    { name: 'Cacahuates naturales tostados sin sal (topping)', household: '14 piezas', netGrams: 14, unit: 'g' },
    { name: 'Semillas de chía (topping)', household: '2 cucharaditas', netGrams: 10, unit: 'g' },
    { name: 'Pepitas de calabaza tostadas sin sal (topping)', household: '2 cucharaditas', netGrams: 10, unit: 'g' },
    { name: 'Semillas de ajonjolí tostado (topping)', household: '1 1/2 cucharada sopera', netGrams: 11, unit: 'g' },
    { name: 'Semillas de linaza entera o molida (topping)', household: '2 cucharaditas', netGrams: 10, unit: 'g' },
    { name: 'Crema de cacahuate 100% natural sin azúcar (topping)', household: '2 cucharaditas', netGrams: 10, unit: 'g' },
    { name: 'Pistaches tostados sin cáscara (topping)', household: '18 piezas', netGrams: 15, unit: 'g' },
    { name: 'Nuez de la India natural (topping)', household: '8 piezas', netGrams: 12, unit: 'g' },
    { name: 'Crema de almendra 100% natural sin azúcar (topping)', household: '2 cucharaditas', netGrams: 10, unit: 'g' },
  ],
  'Azúcares sin grasa': [
    { name: 'Miel de abeja pura mexicana', household: '2 cucharaditas', netGrams: 10, unit: 'g' },
    { name: 'Mermelada de fruta sin azúcar añadido', household: '2 1/2 cucharaditas', netGrams: 15, unit: 'g' },
    { name: 'Azúcar morena mascabado', household: '2 cucharaditas', netGrams: 10, unit: 'g' },
    { name: 'Gelatina baja en azúcar preparada', household: '1/3 taza', netGrams: 80, unit: 'g' },
  ],
  'Azúcares con grasa': [
    { name: 'Chocolate amargo 70-85% cacao artesanal', household: '1 cuadrito', netGrams: 15, unit: 'g' },
    { name: 'Mazapán tradicional de cacahuate', household: '1/3 pieza', netGrams: 10, unit: 'g' },
    { name: 'Cajeta artesanal de leche de cabra', household: '1 cucharadita', netGrams: 10, unit: 'g' },
  ],
  'Alimentos libres de energía': [
    { name: 'Hierbas finas de olor y sazón natural (cilantro, epazote, orégano, laurel, pimienta)', household: 'Al gusto libre', netGrams: 0, unit: 'g' },
    { name: 'Salsa mexicana martajada verde o roja casera', household: 'Al gusto libre', netGrams: 0, unit: 'g' },
    { name: 'Jugo de limón recién exprimido', household: 'Al gusto libre', netGrams: 0, unit: 'ml' },
    { name: 'Café negro sin azúcar recién colado', household: '1 taza', netGrams: 240, unit: 'ml' },
    { name: 'Té de manzanilla, menta, hierbabuena o verde', household: '1 taza', netGrams: 240, unit: 'ml' },
    { name: 'Agua natural con infusión de limón y hierbabuena', household: 'Libre (mín. 2 L)', netGrams: 0, unit: 'ml' },
  ],
};

/**
 * Searches the SMAE database for the best matching food item based on foodName and group hint.
 */
export function findMatchingSMAEFood(foodName: string, groupHint?: string): SMAEFoodItem | null {
  const normName = normalizeSearchString(foodName);
  const normGroup = groupHint ? normalizeSMAEGroupName(groupHint) : null;

  // 1. Direct search by keywords and tokens
  const candidates = SMAE_FOODS_DATABASE.filter((item) => {
    if (normGroup && item.groupName !== normGroup && normalizeSMAEGroupName(item.groupName) !== normGroup) {
      return false;
    }
    const normItemName = normalizeSearchString(item.name);
    if (normItemName.includes(normName) || normName.includes(normItemName)) return true;
    return item.keywords?.some((k) => normName.includes(normalizeSearchString(k)));
  });

  if (candidates.length > 0) {
    return candidates[0];
  }

  // 2. Relaxed group check
  const anyCandidates = SMAE_FOODS_DATABASE.filter((item) => {
    const normItemName = normalizeSearchString(item.name);
    return item.keywords?.some((k) => normName.includes(normalizeSearchString(k))) || normItemName.includes(normName);
  });

  if (anyCandidates.length > 0) {
    return anyCandidates[0];
  }

  return null;
}

/**
 * Converts a numeric value into a clean culinary fraction representation.
 * If 1.5 -> "1 1/2", 0.5 -> "1/2", 2.5 -> "2 1/2", 1.25 -> "1 1/4", 0.75 -> "3/4", etc.
 */
export function formatNumberToFraction(num: number): string {
  if (num <= 0) return '0';
  const rounded = Math.round(num * 100) / 100;
  const whole = Math.floor(rounded);
  const remainder = rounded - whole;

  if (remainder < 0.05 || remainder > 0.95) {
    return Math.round(num).toString();
  }

  let fraction = '';
  if (Math.abs(remainder - 0.5) <= 0.07) {
    fraction = '1/2';
  } else if (Math.abs(remainder - 0.25) <= 0.05) {
    fraction = '1/4';
  } else if (Math.abs(remainder - 0.75) <= 0.05) {
    fraction = '3/4';
  } else if (Math.abs(remainder - 0.333) <= 0.06) {
    fraction = '1/3';
  } else if (Math.abs(remainder - 0.667) <= 0.06) {
    fraction = '2/3';
  } else if (Math.abs(remainder - 0.2) <= 0.05) {
    fraction = '1/5';
  } else if (Math.abs(remainder - 0.125) <= 0.04) {
    fraction = '1/8';
  } else if (Math.abs(remainder - 0.375) <= 0.04) {
    fraction = '3/8';
  } else if (Math.abs(remainder - 0.625) <= 0.04) {
    fraction = '5/8';
  } else if (Math.abs(remainder - 0.875) <= 0.04) {
    fraction = '7/8';
  } else {
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
  }

  if (whole > 0) {
    return `${whole} ${fraction}`;
  }
  return fraction;
}

/**
 * Normalizes noun pluralization based on whether the amount is strictly greater than 1.
 * As requested: "si es mas de una agregar también una 's' si es mas de una taza o pieza"
 * (e.g. > 1: tazas, piezas, rebanadas, cdas. <= 1: taza, pieza, rebanada, cda).
 */
export function formatHouseholdUnitName(unitName: string, amount: number): string {
  let u = unitName.trim();
  if (amount > 1) {
    u = u.replace(/\b(taza)\b/gi, 'tazas');
    u = u.replace(/\b(tza)\b/gi, 'tzas');
    u = u.replace(/\b(pieza)\b/gi, 'piezas');
    u = u.replace(/\b(pza)\b/gi, 'pzas');
    u = u.replace(/\b(rebanada)\b/gi, 'rebanadas');
    u = u.replace(/\b(cucharada)\b/gi, 'cucharadas');
    u = u.replace(/\b(cda)\b/gi, 'cdas');
    u = u.replace(/\b(cucharadita)\b/gi, 'cucharaditas');
    u = u.replace(/\b(cdita)\b/gi, 'cditas');
    u = u.replace(/\b(porción)\b/gi, 'porciones');
    u = u.replace(/\b(porcion)\b/gi, 'porciones');
    u = u.replace(/\b(vaso)\b/gi, 'vasos');
  } else {
    u = u.replace(/\b(tazas)\b/gi, 'taza');
    u = u.replace(/\b(tzas)\b/gi, 'tza');
    u = u.replace(/\b(piezas)\b/gi, 'pieza');
    u = u.replace(/\b(pzas)\b/gi, 'pza');
    u = u.replace(/\b(rebanadas)\b/gi, 'rebanada');
    u = u.replace(/\b(cucharadas)\b/gi, 'cucharada');
    u = u.replace(/\b(cdas)\b/gi, 'cda');
    u = u.replace(/\b(cucharaditas)\b/gi, 'cucharadita');
    u = u.replace(/\b(cditas)\b/gi, 'cdita');
    u = u.replace(/\b(porciones)\b/gi, 'porción');
    u = u.replace(/\b(vasos)\b/gi, 'vaso');
  }
  return u;
}

/**
 * Calculates and formats mathematically exact household portions and grams
 * according to the total number of equivalents (SMAE 5th Edition).
 * - Total grams only (no single portion grams)
 * - Fractions for taza, pieza, etc. (e.g. 1.5 -> 1 1/2)
 * - Plural 's' only if quantity > 1 (e.g. 1 1/2 tazas, 1/2 taza)
 */
export function formatScaledPortion(
  baseHousehold: string,
  baseNetGrams: number,
  equivalentsCount: number,
  unit: string = 'g'
): string {
  const count = Math.max(0.1, equivalentsCount || 1);
  const totalGrams = Math.round((baseNetGrams || 0) * count);

  let clean = (baseHousehold || '').trim();

  // If base is purely a gram/ml weight (e.g. "30 g", "40g", "40 g cocido", "30g cocida")
  if (/^\d+\s*(g|ml)\b/i.test(clean)) {
    const suffix = clean.replace(/^\d+\s*(g|ml)\s*/i, '').trim();
    const finalGrams = totalGrams > 0 ? totalGrams : Math.round(parseFloat(clean) * count);
    return suffix ? `${finalGrams}${unit} ${suffix}` : `${finalGrams}${unit}`;
  }

  // Parse leading fraction or number from baseHousehold
  let baseAmount = 1;
  let remainingText = clean;
  
  const fractionMatch = clean.match(/^(\d+)\/(\d+)\s+(.+)$/);
  const wholeAndFractionMatch = clean.match(/^(\d+)\s+(\d+)\/(\d+)\s+(.+)$/);
  const wholeMatch = clean.match(/^(\d+(\.\d+)?)\s+(.+)$/);

  if (wholeAndFractionMatch) {
    baseAmount = parseInt(wholeAndFractionMatch[1], 10) + (parseInt(wholeAndFractionMatch[2], 10) / parseInt(wholeAndFractionMatch[3], 10));
    remainingText = wholeAndFractionMatch[4];
  } else if (fractionMatch) {
    baseAmount = parseInt(fractionMatch[1], 10) / parseInt(fractionMatch[2], 10);
    remainingText = fractionMatch[3];
  } else if (wholeMatch) {
    baseAmount = parseFloat(wholeMatch[1]);
    remainingText = wholeMatch[3];
  } else {
    baseAmount = 1;
  }

  const calculatedAmount = baseAmount * count;
  const formattedAmount = formatNumberToFraction(calculatedAmount);
  const itemText = formatHouseholdUnitName(remainingText, calculatedAmount);

  if (totalGrams > 0) {
    return `${formattedAmount} ${itemText} (${totalGrams}${unit})`;
  }
  return `${formattedAmount} ${itemText}`;
}

/**
 * Universal formatter for any ingredient portion string:
 * - Eliminates "2x 1 taza (240ml)" -> scales to "2 tazas (480ml)"
 * - Eliminates "2x 1/2 pieza (60g)" -> scales to "1 pieza (120g)"
 * - Replaces decimals with fractions (e.g. "1.5 taza" -> "1 1/2 tazas")
 * - Adds 's' if > 1 (e.g. "1 1/2 tazas", "1 1/2 piezas", "2 tazas")
 * - Keeps singular if <= 1 (e.g. "1/2 taza", "1 taza", "1/2 pieza", "1 pieza")
 * - Displays total grams according to equivalents, never 1-portion grams
 */
export function parseAndScalePortion(rawPortion: string, equivalentsCount?: number): string {
  if (!rawPortion) return '';
  const str = rawPortion.trim();

  // 1. Detect and unpack multiplier prefixes like "2x 1 taza (240ml)" or "2x 30g"
  const multiMatch = str.match(/^(\d+(\.\d+)?)x\s+(.+)$/i);
  if (multiMatch) {
    const multiplier = parseFloat(multiMatch[1]);
    const innerText = multiMatch[3].trim();

    // Check if inner text has (grams)
    const gramsInParens = innerText.match(/^(.+?)\s*\((?:(\d+(\.\d+)?)\s*(g|ml))\)$/i);
    if (gramsInParens) {
      const household = gramsInParens[1].trim();
      const baseG = parseFloat(gramsInParens[2]);
      const u = gramsInParens[4] || 'g';
      return formatScaledPortion(household, baseG, multiplier, u);
    }

    // Pure grams inner text: "30g"
    const pureGMatch = innerText.match(/^(\d+(\.\d+)?)\s*(g|ml)\b(.*)$/i);
    if (pureGMatch) {
      const baseG = parseFloat(pureGMatch[1]);
      const u = pureGMatch[3];
      const suffix = pureGMatch[4].trim();
      const totG = Math.round(baseG * multiplier);
      return suffix ? `${totG}${u} ${suffix}` : `${totG}${u}`;
    }

    return formatScaledPortion(innerText, 0, multiplier, 'g');
  }

  // 2. Detect already formatted string with grams: "1.5 taza (360ml)" or "1.5 pieza (45g)" or "1 taza (240ml)"
  const withGramsMatch = str.match(/^(.+?)\s*\((?:(\d+(\.\d+)?)\s*(g|ml))\)$/i);
  if (withGramsMatch) {
    const household = withGramsMatch[1].trim();
    const g = parseFloat(withGramsMatch[2]);
    const u = withGramsMatch[4] || 'g';

    // Check if household has leading decimal, like "1.5 taza" or "0.5 pieza"
    const decMatch = household.match(/^(\d+(\.\d+)?)\s+(.+)$/);
    if (decMatch) {
      const amt = parseFloat(decMatch[1]);
      const unitPart = decMatch[3];
      const frac = formatNumberToFraction(amt);
      const pluralizedUnit = formatHouseholdUnitName(unitPart, amt);
      return `${frac} ${pluralizedUnit} (${g}${u})`;
    }

    // Check if household has fraction already e.g. "1 1/2 taza"
    const wholeFracMatch = household.match(/^(\d+)\s+(\d+\/\d+)\s+(.+)$/);
    if (wholeFracMatch) {
      const whole = parseInt(wholeFracMatch[1], 10);
      const frac = wholeFracMatch[2];
      const unitPart = wholeFracMatch[3];
      const pluralizedUnit = formatHouseholdUnitName(unitPart, whole + 0.5);
      return `${whole} ${frac} ${pluralizedUnit} (${g}${u})`;
    }

    const singleFracMatch = household.match(/^(\d+\/\d+)\s+(.+)$/);
    if (singleFracMatch) {
      const frac = singleFracMatch[1];
      const unitPart = singleFracMatch[2];
      const pluralizedUnit = formatHouseholdUnitName(unitPart, 0.5);
      return `${frac} ${pluralizedUnit} (${g}${u})`;
    }

    return `${household} (${g}${u})`;
  }

  // 3. Decimal without parentheses: "1.5 taza" or "1.5 pieza"
  const decOnlyMatch = str.match(/^(\d+(\.\d+)?)\s+(.+)$/);
  if (decOnlyMatch) {
    const amt = parseFloat(decOnlyMatch[1]);
    const unitPart = decOnlyMatch[3];
    const frac = formatNumberToFraction(amt);
    const pluralizedUnit = formatHouseholdUnitName(unitPart, amt);
    return `${frac} ${pluralizedUnit}`;
  }

  return str;
}

/**
 * Helper to parse food preference strings into clean normalized search tokens
 */
export function parseFoodTokens(text?: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .split(/[,\s+;/]+/)
    .map(normalizeSearchString)
    .filter((w) => w.length > 2);
}

/**
 * Checks if a given food name matches any token in the token list
 */
export function matchesFoodTokens(foodName: string, tokens: string[]): boolean {
  if (!tokens || tokens.length === 0 || !foodName) return false;
  const norm = normalizeSearchString(foodName);
  return tokens.some((tok) => norm.includes(tok));
}

/**
 * Rectifies a single ingredient against SMAE 5th Edition standards:
 * - Checks exact canonical group name
 * - Computes exact net grams
 * - Scales household measurement according to equivalentsCount
 * - Replaces disliked foods if encountered
 * - Flags preferred foods
 */
export function rectifyIngredient(
  ing: SMAEIngredient,
  preferredFoods?: string,
  dislikedFoods?: string
): SMAEIngredient {
  const canonicalGroup = normalizeSMAEGroupName(ing.smaeGroup);
  const detectedGroup = detectTrueSMAEGroup(ing.foodName, canonicalGroup);
  const finalGroup = detectedGroup === 'Alimentos libres de energía' ? 'Alimentos libres de energía' : canonicalGroup;

  const isFreeEnergy = finalGroup === 'Alimentos libres de energía';
  const eqCount = isFreeEnergy ? 0 : Number(ing.equivalentsCount) || 1;

  const dislikedTokens = parseFoodTokens(dislikedFoods);
  const preferredTokens = parseFoodTokens(preferredFoods);

  let currentFoodName = ing.foodName;

  // USER REQUIREMENT: EXCLUDE SUNFLOWER SEEDS ("semillas de girasol" / "pipas") unless explicitly requested
  const userWantsGirasol = preferredTokens.some((t) => t.includes('girasol') || t.includes('pipas'));
  const normFood = normalizeSearchString(currentFoodName);
  const isSunflower = (normFood.includes('girasol') || normFood.includes('pipas')) && !normFood.includes('aceite');
  if (isSunflower && !userWantsGirasol) {
    const candidates = getCandidatesForGroup(finalGroup, preferredFoods, dislikedFoods);
    if (candidates.length > 0) {
      currentFoodName = candidates[0].name;
    }
  }

  // If the food matches disliked foods, replace it with a non-disliked candidate
  if (matchesFoodTokens(currentFoodName, dislikedTokens)) {
    const candidates = getCandidatesForGroup(finalGroup, preferredFoods, dislikedFoods);
    if (candidates.length > 0) {
      currentFoodName = candidates[0].name;
    }
  }

  // Attempt to find in database or canonical list
  const dbMatch = findMatchingSMAEFood(currentFoodName, finalGroup);
  const canonicalList = SMAE_CANONICAL_FOODS_BY_GROUP[finalGroup] || [];
  const canonMatch = canonicalList.find((c) =>
    normalizeSearchString(currentFoodName).includes(normalizeSearchString(c.name))
  );

  const matched = dbMatch || canonMatch;

  let exactPortion = ing.exactPortion;

  if (isFreeEnergy) {
    if (!exactPortion || exactPortion.includes('1 porción') || exactPortion.includes('0 porción')) {
      exactPortion = 'Al gusto libre';
    }
  } else if (matched) {
    const baseHousehold = 'portionHousehold' in matched ? matched.portionHousehold : matched.household;
    const baseGrams = typeof matched.netGrams === 'number' ? matched.netGrams : parseFloat(String(matched.netGrams)) || 30;
    const unit = matched.unit || 'g';

    exactPortion = formatScaledPortion(baseHousehold, baseGrams, eqCount, unit);
  } else {
    // If not matched, ensure grams are stated if possible
    if (!/\(\d+\s*(g|ml)\)/i.test(exactPortion) && !/\b\d+\s*(g|ml)\b/i.test(exactPortion)) {
      // Estimate canonical base grams by group
      const fallbackBase = canonicalList[0];
      if (fallbackBase) {
        exactPortion = formatScaledPortion(fallbackBase.household, fallbackBase.netGrams, eqCount, fallbackBase.unit);
      }
    }
  }

  const isPref = matchesFoodTokens(currentFoodName, preferredTokens);
  const role = detectIngredientRole(currentFoodName, finalGroup);

  return {
    foodName: currentFoodName,
    exactPortion,
    smaeGroup: finalGroup,
    equivalentsCount: eqCount,
    isPreferred: isPref || Boolean(ing.isPreferred),
    role,
  };
}

/**
 * Rectifies a single menu option against prescribed equivalents:
 * - Normalizes all ingredients
 * - Verifies mathematical equivalence against prescribed portions
 * - Injects missing groups if omitted by the AI (prioritizing preferred foods)
 * - Substitutes any disliked foods with preferred or authentic alternatives
 * - Caps or scales excess portions
 */
export function rectifyMenuOption(
  option: MenuOption,
  prescribedPortions?: Record<string, number>,
  optionIndex: number = 0,
  mealName: string = 'Comida',
  preferredFoods?: string,
  dislikedFoods?: string
): MenuOption {
  if (!option || !Array.isArray(option.ingredients)) {
    return option;
  }

  const dislikedTokens = parseFoodTokens(dislikedFoods);
  const preferredTokens = parseFoodTokens(preferredFoods);

  // 1. Rectify each ingredient individually (swapping dislikes & tagging preferred)
  let rectifiedIngredients = option.ingredients.map((ing) =>
    rectifyIngredient(ing, preferredFoods, dislikedFoods)
  );

  // 2. If prescribed portions exist, enforce mathematical precision
  if (prescribedPortions && Object.keys(prescribedPortions).length > 0) {
    const prescribedGroupMap: Record<CanonicalSMAEGroupName, number> = {} as any;

    Object.entries(prescribedPortions).forEach(([grp, qty]) => {
      if (qty > 0) {
        const canon = normalizeSMAEGroupName(grp);
        prescribedGroupMap[canon] = (prescribedGroupMap[canon] || 0) + qty;
      }
    });

    // 2. Resolve Group Confusions and Misclassifications (Crucial for Aceites con/sin proteína, Ajo/Especias, and Cereales con/sin grasa)
    rectifiedIngredients = rectifiedIngredients.map((ing) => {
      const declaredGroup = normalizeSMAEGroupName(ing.smaeGroup);
      const trueGroup = detectTrueSMAEGroup(ing.foodName, declaredGroup);

      // 0) Special handling for Garlic, Spices, Seasonings, Herbs:
      // Must ALWAYS remain as free energy seasonings with 0 equivalents!
      // Must NEVER consume or replace the authentic vegetable (Verdura) equivalent!
      if (trueGroup === 'Alimentos libres de energía') {
        let cleanSeasoningName = ing.foodName;
        if (!cleanSeasoningName.includes('preparación') && !cleanSeasoningName.includes('sazón') && !cleanSeasoningName.includes('gusto')) {
          cleanSeasoningName = `${cleanSeasoningName} (en la preparación / sazón libre)`;
        }
        return {
          ...ing,
          foodName: cleanSeasoningName,
          smaeGroup: 'Alimentos libres de energía',
          exactPortion: ing.exactPortion && !ing.exactPortion.includes('1 porción') ? ing.exactPortion : 'Al gusto libre',
          equivalentsCount: 0,
          role: 'sazon' as const,
        };
      }

      const targetForTrueGroup = prescribedGroupMap[trueGroup] || 0;
      const targetForDeclaredGroup = prescribedGroupMap[declaredGroup] || 0;

      // 1) If trueGroup has prescribed equivalents > 0, align it directly to its true authentic group!
      if (targetForTrueGroup > 0) {
        return {
          ...ing,
          smaeGroup: trueGroup,
          role: detectIngredientRole(ing.foodName, trueGroup),
        };
      }

      // 2) If trueGroup has 0 equivalents prescribed, but declaredGroup HAS equivalents > 0:
      // The AI or generator picked a food from the wrong group (e.g., almonds when only oil was prescribed, or oil when only nuts were prescribed).
      // Replace it immediately with an authentic candidate from declaredGroup!
      if (targetForTrueGroup === 0 && targetForDeclaredGroup > 0) {
        const pool = getCandidatesForGroup(declaredGroup, preferredFoods, dislikedFoods);
        const rep = pool[optionIndex % (pool.length || 1)] || pool[0];
        if (rep) {
          return {
            foodName: rep.name,
            exactPortion: formatScaledPortion(
              rep.household,
              rep.netGrams,
              ing.equivalentsCount || 1,
              rep.unit
            ),
            smaeGroup: declaredGroup,
            equivalentsCount: ing.equivalentsCount || 1,
            isPreferred: matchesFoodTokens(rep.name, preferredTokens),
            role: detectIngredientRole(rep.name, declaredGroup),
          };
        }
      }

      return {
        ...ing,
        smaeGroup: trueGroup,
        role: detectIngredientRole(ing.foodName, trueGroup),
      };
    });

    // Group the current ingredients by canonical group
    const currentByGroup: Record<CanonicalSMAEGroupName, SMAEIngredient[]> = {} as any;
    rectifiedIngredients.forEach((ing) => {
      const g = ing.smaeGroup as CanonicalSMAEGroupName;
      if (!currentByGroup[g]) currentByGroup[g] = [];
      currentByGroup[g].push(ing);
    });

    // Check for each prescribed group
    Object.entries(prescribedGroupMap).forEach(([canonGrpStr, targetQty]) => {
      const canonGrp = canonGrpStr as CanonicalSMAEGroupName;
      const currentList = currentByGroup[canonGrp] || [];
      const currentSum = currentList.reduce((sum, item) => sum + (Number(item.equivalentsCount) || 0), 0);

      if (currentList.length === 0) {
        // AI completely missed this group! Inject an authentic food (preferring patient preferences)
        const candidates = getCandidatesForGroup(canonGrp, preferredFoods, dislikedFoods);
        const mealOffset = mealName ? mealName.charCodeAt(0) + mealName.length : 0;
        // Prioritize preferred foods first, or rotate candidates
        const preferredCandidate = candidates.find((c) => matchesFoodTokens(c.name, preferredTokens));
        const chosen = preferredCandidate || candidates[(optionIndex * 3 + mealOffset) % (candidates.length || 1)] || candidates[0];

        if (chosen) {
          const newIng: SMAEIngredient = {
            foodName: chosen.name,
            exactPortion: formatScaledPortion(chosen.household, chosen.netGrams, targetQty, chosen.unit),
            smaeGroup: canonGrp,
            equivalentsCount: targetQty,
            isPreferred: matchesFoodTokens(chosen.name, preferredTokens),
            role: detectIngredientRole(chosen.name, canonGrp),
          };
          rectifiedIngredients.push(newIng);
        }
      } else if (currentSum !== targetQty) {
        // Adjust proportionally so the sum equals targetQty
        if (currentList.length === 1) {
          const single = currentList[0];
          single.equivalentsCount = targetQty;
          const rect = rectifyIngredient(single, preferredFoods, dislikedFoods);
          single.exactPortion = rect.exactPortion;
          single.foodName = rect.foodName;
          single.isPreferred = rect.isPreferred;
        } else {
          // Distribute targetQty across items
          let remaining = targetQty;
          currentList.forEach((item, i) => {
            if (i === currentList.length - 1) {
              item.equivalentsCount = Math.max(0.5, remaining);
            } else {
              const share = Math.max(0.5, Math.round((item.equivalentsCount / currentSum) * targetQty * 2) / 2);
              item.equivalentsCount = share;
              remaining -= share;
            }
            const rect = rectifyIngredient(item, preferredFoods, dislikedFoods);
            item.exactPortion = rect.exactPortion;
            item.foodName = rect.foodName;
            item.isPreferred = rect.isPreferred;
          });
        }
      }
    });

    // Filter out ingredients for groups that have 0 prescribed equivalents (if prescribed map was explicitly provided)
    rectifiedIngredients = rectifiedIngredients.filter((ing) => {
      const g = ing.smaeGroup as CanonicalSMAEGroupName;
      // If group is free energy or has prescribed quantity > 0, keep it
      if (g === 'Alimentos libres de energía') return true;
      return (prescribedGroupMap[g] || 0) > 0;
    });
  }

  // Double check that no disliked food or sunflower seeds slipped through
  const userWantsGirasol = preferredTokens.some((t) => t.includes('girasol') || t.includes('pipas'));
  rectifiedIngredients = rectifiedIngredients.map((ing) => {
    const norm = normalizeSearchString(ing.foodName);
    const isSunflower = (norm.includes('girasol') || norm.includes('pipas')) && !norm.includes('aceite');
    const isDisliked = matchesFoodTokens(ing.foodName, dislikedTokens);

    if (isDisliked || (isSunflower && !userWantsGirasol)) {
      const canonicalGroup = normalizeSMAEGroupName(ing.smaeGroup);
      const candidates = getCandidatesForGroup(canonicalGroup, preferredFoods, dislikedFoods, mealName);
      if (candidates.length > 0) {
        const replacement = candidates[0];
        return {
          ...ing,
          foodName: replacement.name,
          exactPortion: formatScaledPortion(
            replacement.household,
            replacement.netGrams,
            ing.equivalentsCount,
            replacement.unit
          ),
          isPreferred: matchesFoodTokens(replacement.name, preferredTokens),
        };
      }
    }
    return ing;
  });

  // If patient explicitly requested garlic or spices in preferences, ensure they are present as preparation seasoning
  const prefersGarlic = preferredTokens.some((t) => t.includes('ajo'));
  const prefersSpices = preferredTokens.some((t) =>
    ['especias', 'oregano', 'pimienta', 'comino', 'canela', 'hierbas', 'sazon', 'cilantro', 'epazote'].includes(t)
  );

  if (prefersGarlic) {
    const alreadyHasSeasoning = rectifiedIngredients.some((i) =>
      matchesFoodTokens(i.foodName, ['ajo'])
    );
    if (!alreadyHasSeasoning) {
      rectifiedIngredients.push({
        foodName: 'Ajo picado y especias naturales al gusto (en la preparación)',
        exactPortion: 'Al gusto libre',
        smaeGroup: 'Alimentos libres de energía',
        equivalentsCount: 0,
        isPreferred: true,
      });
    }
  } else if (prefersSpices) {
    const alreadyHasSeasoning = rectifiedIngredients.some((i) =>
      matchesFoodTokens(i.foodName, ['especias', 'oregano', 'pimienta', 'canela', 'comino', 'hierbas', 'cilantro', 'epazote'])
    );
    if (!alreadyHasSeasoning) {
      rectifiedIngredients.push({
        foodName: 'Hierbas finas y especias naturales al gusto (cilantro, orégano, pimienta, canela)',
        exactPortion: 'Al gusto libre',
        smaeGroup: 'Alimentos libres de energía',
        equivalentsCount: 0,
        isPreferred: true,
      });
    }
  }

  const updatedOption: MenuOption = {
    ...option,
    ingredients: rectifiedIngredients,
  };

  return reconcileOptionTitleAndPrep(updatedOption, mealName, optionIndex);
}

/**
 * Identifies the core culinary base/root of a food item to prevent repetition across meal options.
 * E.g., 'Tortilla de maíz nixtamalizada comaleada' -> 'tortilla'
 *       'Jitomate bola o guajillo picado' -> 'jitomate'
 *       'Aceite de oliva extra virgen' -> 'aceite_oliva'
 */
export function getFoodBaseIdentifier(foodName: string, smaeGroup?: string): string {
  const norm = normalizeSearchString(foodName);

  const roots: [RegExp, string][] = [
    [/\btortilla\b/, 'tortilla'],
    [/\btostada\b/, 'tostada'],
    [/\barroz\b/, 'arroz'],
    [/\bavena\b/, 'avena'],
    [/\b(papa|papas)\b/, 'papa'],
    [/\bcamote\b/, 'camote'],
    [/\b(pan\s+de\s+caja|pan\s+integral|pan\s+blanco|bolillo|telera)\b/, 'pan'],
    [/\bquinoa\b/, 'quinoa'],
    [/\bamaranto\b/, 'amaranto'],
    [/\b(pasta|espagueti|sopa\s+de\s+fideo|coditos)\b/, 'pasta'],
    [/\belote\b/, 'elote'],
    [/\b(frijol|frijoles)\b/, 'frijol'],
    [/\b(lenteja|lentejas)\b/, 'lenteja'],
    [/\b(garbanzo|garbanzos)\b/, 'garbanzo'],
    [/\b(haba|habas)\b/, 'haba'],
    [/\b(soya|tofu)\b/, 'soya'],
    [/\bclaras?\b/, 'clara_huevo'],
    [/\bhuevo\b/, 'huevo'],
    [/\b(pollo|pechuga)\b/, 'pollo'],
    [/\b(pavo|jamon\s+de\s+pavo)\b/, 'pavo'],
    [/\b(res|bistec|ternera|molida\s+de\s+res|carne\s+de\s+res)\b/, 'res'],
    [/\b(cerdo|lomo|chuleta|chilorio)\b/, 'cerdo'],
    [/\b(pescado|tilapia|merluza|robalo|salmon)\b/, 'pescado'],
    [/\batun\b/, 'atun'],
    [/\bcamaron\b/, 'camaron'],
    [/\bsardina\b/, 'sardina'],
    [/\bqueso\s+panela\b/, 'queso_panela'],
    [/\bqueso\s+oaxaca\b/, 'queso_oaxaca'],
    [/\bqueso\s+manchego\b/, 'queso_manchego'],
    [/\bqueso\s+gouda\b/, 'queso_gouda'],
    [/\bqueso\s+cottage\b/, 'queso_cottage'],
    [/\brequeson\b/, 'requeson'],
    [/\bqueso\s+(fresco|de\s+rancho|canasto)\b/, 'queso_fresco'],
    [/\b(jitomate|tomate\s+rojo)\b/, 'jitomate'],
    [/\b(tomate\s+verde|tomate\s+de\s+cascara|tomatillo)\b/, 'tomate_verde'],
    [/\b(espinaca|espinacas)\b/, 'espinaca'],
    [/\b(nopal|nopales)\b/, 'nopal'],
    [/\b(calabacita|calabacitas|calabaza)\b/, 'calabacita'],
    [/\bchayote\b/, 'chayote'],
    [/\bpepino\b/, 'pepino'],
    [/\bbrocoli\b/, 'brocoli'],
    [/\bcoliflor\b/, 'coliflor'],
    [/\blechuga\b/, 'lechuga'],
    [/\b(champinon|champinones|setas|hongos)\b/, 'champinon'],
    [/\bpimiento\b/, 'pimiento'],
    [/\bzanahoria\b/, 'zanahoria'],
    [/\bejote\b/, 'ejote'],
    [/\bflor\s+de\s+calabaza\b/, 'flor_calabaza'],
    [/\bacelga\b/, 'acelga'],
    [/\bapio\b/, 'apio'],
    [/\bmanzana\b/, 'manzana'],
    [/\b(fresa|fresas)\b/, 'fresa'],
    [/\bpapaya\b/, 'papaya'],
    [/\bplatano\b/, 'platano'],
    [/\bmelon\b/, 'melon'],
    [/\bsandia\b/, 'sandia'],
    [/\bguayaba\b/, 'guayaba'],
    [/\bmandarina\b/, 'mandarina'],
    [/\bnaranja\b/, 'naranja'],
    [/\bkiwi\b/, 'kiwi'],
    [/\bmango\b/, 'mango'],
    [/\bpera\b/, 'pera'],
    [/\btoronja\b/, 'toronja'],
    [/\b(arandano|arandanos|mora|moras|zarzamora|frambuesa|frambuesas)\b/, 'berries'],
    [/\b(leche|leche\s+descremada|leche\s+entera|leche\s+semidescremada)\b/, 'leche'],
    [/\b(yogur|yogurt)\b/, 'yogur'],
    [/\bkefir\b/, 'kefir'],
    [/\baguacate\b/, 'aguacate'],
    [/\baceite\s+de\s+oliva\b/, 'aceite_oliva'],
    [/\baceite\s+(de\s+canola|de\s+aguacate|vegetal|en\s+spray)\b/, 'aceite_vegetal'],
    [/\baceituna\b/, 'aceituna'],
    [/\bmayonesa\b/, 'mayonesa'],
    [/\balmendra\b/, 'almendra'],
    [/\bnuez\b/, 'nuez'],
    [/\bcacahuate\b/, 'cacahuate'],
    [/\bpepitas?\b/, 'pepitas'],
    [/\bchia\b/, 'chia'],
    [/\blinaza\b/, 'linaza'],
    [/\bmiel\b/, 'miel'],
    [/\bmermelada\b/, 'mermelada'],
    [/\bchocolate\b/, 'chocolate'],
    [/\bcajeta\b/, 'cajeta'],
  ];

  for (const [regex, key] of roots) {
    if (regex.test(norm)) {
      return key;
    }
  }

  // Fallback to matching SMAE database ID if matched
  const matched = findMatchingSMAEFood(foodName, smaeGroup);
  if (matched) {
    return matched.id;
  }

  const words = norm.split(/\s+/).filter((w) => w.length > 2);
  return words.slice(0, 2).join('_') || norm;
}

/**
 * Calculates a culinary congruency score for a food item given a specific meal time.
 * Promotes breakfast staples for breakfast, snacks for morning/afternoon snacks,
 * hearty hot dishes for lunch, and light digestible dishes for dinner.
 */
function getMealCongruenceScore(name: string, canonicalGroup: string, mealType?: string): number {
  if (!mealType) return 0;
  const m = normalizeSearchString(mealType);
  const n = normalizeSearchString(name);

  // Desayuno (Breakfast)
  if (m.includes('desayuno')) {
    if (n.includes('huevo') || n.includes('claras') || n.includes('panela') || n.includes('requeson') || n.includes('frijol')) return 30;
    if (n.includes('tortilla') || n.includes('avena') || n.includes('pan integral') || n.includes('tostada horneada') || n.includes('bolillo')) return 25;
    if (n.includes('papaya') || n.includes('fresa') || n.includes('manzana') || n.includes('melon') || n.includes('platano') || n.includes('naranja') || n.includes('toronja')) return 25;
    if (n.includes('nopal') || n.includes('espinaca') || n.includes('jitomate') || n.includes('champinon') || n.includes('flor de calabaza') || n.includes('calabacita')) return 22;
    if (n.includes('leche') || n.includes('yogur') || n.includes('kefir') || n.includes('aguacate')) return 20;
    // Lower score for heavy dinner/lunch meats or side dishes uncommon at breakfast
    if (n.includes('bistec') || n.includes('pescado') || n.includes('salpic') || n.includes('arroz') || n.includes('pasta') || n.includes('quinoa') || n.includes('calamar') || n.includes('camaron')) return -20;
  }

  // Colación 1 (Matutina) o Colación 2 (Vespertina) / Snacks
  if (m.includes('colacion') || m.includes('snack')) {
    // Fruits, nuts/seeds, yogurt, cottage cheese, fresh raw crunchy veggies, crackers
    if (n.includes('manzana') || n.includes('fresa') || n.includes('mora') || n.includes('kiwi') || n.includes('mandarina') || n.includes('pina') || n.includes('sandia') || n.includes('durazno') || n.includes('uva') || n.includes('pera')) return 35;
    if (n.includes('almendra') || n.includes('nuez') || n.includes('cacahuate') || n.includes('pistache') || n.includes('pepita') || n.includes('chia') || n.includes('semilla')) return 30;
    if (n.includes('cottage') || n.includes('requeson') || n.includes('yogur') || n.includes('kefir')) return 30;
    if (n.includes('jicama') || n.includes('pepino') || n.includes('zanahoria') || n.includes('apio')) return 28;
    if (n.includes('galletas habaneras') || n.includes('palomitas') || n.includes('amaranto') || n.includes('tostada horneada')) return 25;
    // Heavily penalize hot stews, raw meats or lunch staples in snacks
    if (n.includes('pollo cocido') || n.includes('bistec') || n.includes('pescado') || n.includes('lenteja') || n.includes('frijol') || n.includes('arroz') || n.includes('pasta') || n.includes('papa')) return -40;
  }

  // Comida (Lunch / Main Dish)
  if (m.includes('comida') && !m.includes('colacion')) {
    if (n.includes('pollo') || n.includes('pescado') || n.includes('tilapia') || n.includes('bistec') || n.includes('res') || n.includes('lomo') || n.includes('salmon') || n.includes('camaron')) return 35;
    if (n.includes('lenteja') || n.includes('frijol') || n.includes('garbanzo') || n.includes('haba')) return 30;
    if (n.includes('arroz') || n.includes('quinoa') || n.includes('papa') || n.includes('pasta') || n.includes('tortilla') || n.includes('elote')) return 28;
    if (n.includes('calabacita') || n.includes('chayote') || n.includes('lechuga') || n.includes('pepino') || n.includes('brocoli') || n.includes('ejote') || n.includes('nopal') || n.includes('pimiento')) return 25;
    if (n.includes('aguacate') || n.includes('aceite de oliva')) return 25;
  }

  // Cena (Dinner)
  if (m.includes('cena')) {
    if (n.includes('panela') || n.includes('claras') || n.includes('requeson') || n.includes('atun') || n.includes('pechuga de pavo') || n.includes('queso canasto') || n.includes('queso oaxaca')) return 35;
    if (n.includes('tostada horneada') || n.includes('tortilla') || n.includes('pan integral') || n.includes('avena')) return 28;
    if (n.includes('espinaca') || n.includes('champinon') || n.includes('nopal') || n.includes('calabacita') || n.includes('lechuga') || n.includes('jitomate')) return 25;
    if (n.includes('aguacate')) return 25;
    // Lower score for heavy beef or stews for dinner
    if (n.includes('bistec') || n.includes('cerdo') || n.includes('salchicha') || n.includes('arroz') || n.includes('pasta')) return -20;
  }

  return 0;
}

/**
 * Retrieves valid candidate replacement foods for a given canonical SMAE group.
 * If preferredFoods or dislikedFoods are provided:
 * - Completely filters out any candidates matching disliked tokens.
 * - Enforces strict avoidance of garlic ("ajo") and "piloncillo" unless specifically preferred.
 * - Orders by patient preference and meal congruency (breakfast, snack, lunch, dinner).
 */
export function getCandidatesForGroup(
  canonicalGroup: CanonicalSMAEGroupName,
  preferredFoods?: string,
  dislikedFoods?: string,
  mealNameOrType?: string
): Array<{
  name: string;
  household: string;
  netGrams: number;
  unit: string;
  isPreferred?: boolean;
}> {
  const canonicalList = SMAE_CANONICAL_FOODS_BY_GROUP[canonicalGroup] || [];
  const dbList = SMAE_FOODS_DATABASE.filter(
    (item) => normalizeSMAEGroupName(item.groupName) === canonicalGroup
  ).map((item) => ({
    name: item.name,
    household: item.portionHousehold,
    netGrams: typeof item.netGrams === 'number' ? item.netGrams : parseFloat(String(item.netGrams)) || 0,
    unit: item.unit || 'g',
  }));

  const seen = new Set<string>();
  const combined: Array<{ name: string; household: string; netGrams: number; unit: string; isPreferred?: boolean }> = [];

  const dislikedTokens = parseFoodTokens(dislikedFoods);
  const preferredTokens = parseFoodTokens(preferredFoods);

  const userWantsGarlic = preferredTokens.some((t) => t.includes('ajo'));
  const userWantsPiloncillo = preferredTokens.some((t) => t.includes('piloncillo'));

  for (const c of [...canonicalList, ...dbList]) {
    const key = normalizeSearchString(c.name);
    if (!seen.has(key)) {
      seen.add(key);

      // Exclude disliked candidates completely
      if (matchesFoodTokens(c.name, dislikedTokens)) {
        continue;
      }

      // USER REQUIREMENT: AVOID GARLIC ("ajo") unless explicitly preferred
      if (!userWantsGarlic) {
        const isGarlic = key.includes('ajo') && !key.includes('jitomate') && !key.includes('arroz con');
        if (isGarlic) continue;
      }

      // USER REQUIREMENT: AVOID PILONCILLO unless explicitly preferred
      if (!userWantsPiloncillo) {
        const isPiloncillo = key.includes('piloncillo');
        if (isPiloncillo) continue;
      }

      // USER REQUIREMENT: AVOID SUNFLOWER SEEDS ("semillas de girasol" / "pipas") unless explicitly preferred
      const userWantsGirasol = preferredTokens.some((t) => t.includes('girasol') || t.includes('pipas'));
      if (!userWantsGirasol) {
        const isSunflower = (key.includes('girasol') || key.includes('pipas')) && !key.includes('aceite');
        if (isSunflower) continue;
      }

      // CRITICAL COMMON SENSE 1:
      // If canonicalGroup === 'Verdura', pure garlic/seasoning items ("Ajo fresco en dientes")
      // must NOT be used as the primary standalone vegetable dish!
      if (canonicalGroup === 'Verdura' && (key.includes('ajo') || key.includes('diente de ajo'))) {
        continue;
      }

      // CRITICAL COMMON SENSE 2 FOR FATS:
      // If canonicalGroup === 'Aceites y grasas sin proteína', NEVER allow nuts, seeds, chia, ajonjolí!
      if (canonicalGroup === 'Aceites y grasas sin proteína') {
        const isNutOrSeed =
          key.includes('almendra') ||
          key.includes('nuez') ||
          key.includes('cacahuate') ||
          key.includes('pistache') ||
          key.includes('chia') ||
          key.includes('chía') ||
          key.includes('pepita') ||
          key.includes('ajonjoli') ||
          key.includes('ajonjolí') ||
          key.includes('linaza') ||
          key.includes('semilla');
        if (isNutOrSeed) continue;
      }

      // If canonicalGroup === 'Aceites y grasas con proteína', NEVER allow cooking oils, avocado, mayonnaise!
      if (canonicalGroup === 'Aceites y grasas con proteína') {
        const isOilOrAvocado =
          key.includes('aceite') ||
          key.includes('aguacate') ||
          key.includes('aceituna') ||
          key.includes('mayonesa') ||
          key.includes('mantequilla') ||
          key.includes('crema');
        if (isOilOrAvocado) continue;
      }

      // CRITICAL COMMON SENSE 3 FOR SUGARS:
      // If canonicalGroup === 'Azúcares sin grasa', NEVER allow chocolate, nutella, cakes, ice cream, pastries, donuts, mazapán!
      if (canonicalGroup === 'Azúcares sin grasa') {
        const hasFat =
          key.includes('chocolate') ||
          key.includes('nutella') ||
          key.includes('cacao') ||
          key.includes('pastel') ||
          key.includes('helado') ||
          key.includes('nieve de crema') ||
          key.includes('pay') ||
          key.includes('dona') ||
          key.includes('mazapan') ||
          key.includes('crema');
        if (hasFat) continue;
      }

      // If canonicalGroup === 'Azúcares con grasa', NEVER allow pure sugars, honey, fat-free jams, or gelatin!
      if (canonicalGroup === 'Azúcares con grasa') {
        const isPureSugar =
          (key.includes('miel') && !key.includes('chocolate')) ||
          (key.includes('azucar') && !key.includes('chocolate') && !key.includes('pastel')) ||
          (key.includes('mermelada') && !key.includes('chocolate')) ||
          key.includes('gelatina') ||
          key.includes('gomita') ||
          key.includes('piloncillo');
        if (isPureSugar) continue;
      }

      // CRITICAL COMMON SENSE 4 FOR FREE FOODS:
      // Jamón, embutidos y carnes NEVER allowed in Alimentos libres de energía!
      if (canonicalGroup === 'Alimentos libres de energía') {
        const isMeatOrHam =
          key.includes('jamon') ||
          key.includes('salchicha') ||
          key.includes('embutido') ||
          key.includes('pechuga de pavo') ||
          key.includes('carne') ||
          key.includes('pollo') ||
          key.includes('res') ||
          key.includes('cerdo') ||
          key.includes('pescado');
        if (isMeatOrHam) continue;
      }

      const isPref = matchesFoodTokens(c.name, preferredTokens);
      combined.push({
        ...c,
        isPreferred: isPref,
      });
    }
  }

  // Sort: First by patient preferred items, then by meal congruence score
  combined.sort((a, b) => {
    if (a.isPreferred && !b.isPreferred) return -1;
    if (!a.isPreferred && b.isPreferred) return 1;

    if (mealNameOrType) {
      const scoreB = getMealCongruenceScore(b.name, canonicalGroup, mealNameOrType);
      const scoreA = getMealCongruenceScore(a.name, canonicalGroup, mealNameOrType);
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
    }
    return 0;
  });

  return combined;
}

/**
 * Ensures strict culinary variety and non-repetition across Option A, Option B, and Option C:
 * RULE: In each meal time, NO base ingredient may repeat more than TWO times across the 3 options.
 * If any ingredient would appear a 3rd time (or more), it is swapped with an authentic alternative
 * from the same SMAE group that has appeared less than 2 times (preferably 0), respecting preferred and disliked foods.
 * Finally, reconciles option titles and cooking preparations to match the final verified ingredients.
 */
export function ensureMealVariety(
  meal: MealMenu,
  dislikedFoods?: string,
  preferredFoods?: string
): MealMenu {
  if (!meal) return meal;

  const rawOptions = [meal.optionA, meal.optionB, meal.optionC].filter(Boolean) as MenuOption[];
  if (rawOptions.length <= 1) return meal;

  const dislikedTokens = parseFoodTokens(dislikedFoods);
  const preferredTokens = parseFoodTokens(preferredFoods);

  const isDisliked = (name: string) => {
    return matchesFoodTokens(name, dislikedTokens);
  };

  // 1. Primary protein rotation for culinary excellence
  const getPrimaryProtein = (opt?: MenuOption): SMAEIngredient | null => {
    if (!opt || !opt.ingredients) return null;
    return (
      opt.ingredients.find((i) => i.smaeGroup.includes('Alimento de origen animal')) ||
      opt.ingredients.find((i) => i.smaeGroup.includes('Leguminosas')) ||
      null
    );
  };

  const proteinA = getPrimaryProtein(meal.optionA);
  if (meal.optionB && proteinA) {
    const proteinB = getPrimaryProtein(meal.optionB);
    if (proteinB && getFoodBaseIdentifier(proteinA.foodName) === getFoodBaseIdentifier(proteinB.foodName)) {
      const canonGroup = normalizeSMAEGroupName(proteinB.smaeGroup);
      const candidates = getCandidatesForGroup(canonGroup, preferredFoods, dislikedFoods, meal.mealName);
      const alt = candidates.find(
        (c) =>
          !isDisliked(c.name) &&
          getFoodBaseIdentifier(c.name, canonGroup) !== getFoodBaseIdentifier(proteinA.foodName, canonGroup)
      );
      if (alt) {
        proteinB.foodName = alt.name;
        proteinB.exactPortion = formatScaledPortion(
          alt.household,
          alt.netGrams,
          proteinB.equivalentsCount,
          alt.unit
        );
        proteinB.isPreferred = matchesFoodTokens(alt.name, preferredTokens);
      }
    }
  }

  // 2. Comprehensive check: NO base food may repeat more than TWO times across the 3 options
  const baseUsageCount = new Map<string, number>();

  rawOptions.forEach((opt, optIndex) => {
    if (!opt.ingredients || !Array.isArray(opt.ingredients)) return;

    opt.ingredients.forEach((ing) => {
      const canonicalGroup = normalizeSMAEGroupName(ing.smaeGroup);
      const key = getFoodBaseIdentifier(ing.foodName, canonicalGroup);
      const currentCount = baseUsageCount.get(key) || 0;

      // If already used 2 times in earlier options/entries of this meal, CANNOT be used a 3rd time!
      if (currentCount >= 2) {
        const candidates = getCandidatesForGroup(canonicalGroup, preferredFoods, dislikedFoods, meal.mealName);

        // Find candidate from same group whose base identifier has been used LESS than 2 times
        // 1. Try candidates with 0 uses first
        let selectedAlt = candidates.find((cand) => {
          if (isDisliked(cand.name)) return false;
          const altKey = getFoodBaseIdentifier(cand.name, canonicalGroup);
          return altKey !== key && (baseUsageCount.get(altKey) || 0) === 0;
        });

        // 2. Try candidates with 1 use (still <= 2 total)
        if (!selectedAlt) {
          selectedAlt = candidates.find((cand) => {
            if (isDisliked(cand.name)) return false;
            const altKey = getFoodBaseIdentifier(cand.name, canonicalGroup);
            return altKey !== key && (baseUsageCount.get(altKey) || 0) < 2;
          });
        }

        if (selectedAlt) {
          ing.foodName = selectedAlt.name;
          ing.exactPortion = formatScaledPortion(
            selectedAlt.household,
            selectedAlt.netGrams,
            ing.equivalentsCount,
            selectedAlt.unit
          );
          ing.isPreferred = matchesFoodTokens(selectedAlt.name, preferredTokens);
          const newKey = getFoodBaseIdentifier(selectedAlt.name, canonicalGroup);
          baseUsageCount.set(newKey, (baseUsageCount.get(newKey) || 0) + 1);
        } else {
          baseUsageCount.set(key, currentCount + 1);
        }
      } else {
        baseUsageCount.set(key, currentCount + 1);
      }

      // Check preference flag
      if (matchesFoodTokens(ing.foodName, preferredTokens)) {
        ing.isPreferred = true;
      }
    });

    // Reconcile option title and culinary preparation with the verified ingredients
    rawOptions[optIndex] = reconcileOptionTitleAndPrep(opt, meal.mealName, optIndex);
  });

  if (meal.optionA && rawOptions[0]) meal.optionA = rawOptions[0];
  if (meal.optionB && rawOptions[1]) meal.optionB = rawOptions[1];
  if (meal.optionC && rawOptions[2]) meal.optionC = rawOptions[2];

  return meal;
}

/**
 * Rectifies an entire MealMenu (Options A, B and C):
 * - Normalizes exact portions and net grams
 * - Reconciles equivalents counts
 * - Enforces extreme variety and anti-repetition
 * - Applies patient preferred and disliked foods
 */
export function rectifyMealMenu(
  meal: MealMenu,
  prescribedPortions?: Record<string, number>,
  dislikedFoods?: string,
  preferredFoods?: string,
  proteinSupplement?: ProteinSupplementInfo,
  manualNutrientEntry?: ManualNutrientEntry
): MealMenu {
  if (!meal) return meal;

  const rectified: MealMenu = {
    ...meal,
    optionA: rectifyMenuOption(meal.optionA, prescribedPortions, 0, meal.mealName, preferredFoods, dislikedFoods),
    optionB: rectifyMenuOption(meal.optionB, prescribedPortions, 1, meal.mealName, preferredFoods, dislikedFoods),
    optionC: rectifyMenuOption(meal.optionC, prescribedPortions, 2, meal.mealName, preferredFoods, dislikedFoods),
  };

  // Si el aporte manual de nutrientes está activo y configurado para incluirse en el menú
  if (manualNutrientEntry?.enabled && manualNutrientEntry?.includeInMenu) {
    const mealKeyMap: Record<string, string> = {
      desayuno: 'desayuno',
      'colación 1': 'colacion1',
      'colacion 1': 'colacion1',
      colacion1: 'colacion1',
      comida: 'comida',
      'colación 2': 'colacion2',
      'colacion 2': 'colacion2',
      colacion2: 'colacion2',
      cena: 'cena',
    };
    const curKey = mealKeyMap[meal.mealName.toLowerCase()] || meal.mealName.toLowerCase();
    const timing = manualNutrientEntry.timing || 'colacion2';
    const isTarget = timing === 'any' ? curKey === 'colacion2' : curKey === timing;

    if (isTarget) {
      const pGrams = Number(manualNutrientEntry.proteinGrams) || 0;
      const directKcal = Number(manualNutrientEntry.kcal) || 0;
      const lGrams = Number(manualNutrientEntry.lipidsGrams) || 0;
      const cGrams = Number(manualNutrientEntry.carbsGrams) || 0;
      const totalKcal = directKcal > 0 ? directKcal : (pGrams * 4 + lGrams * 9 + cGrams * 4);
      const name = manualNutrientEntry.name?.trim() || (pGrams > 0 ? 'Aporte manual / Suplemento' : 'Aporte nutricional manual');
      const eqCount = pGrams > 0 ? Number((pGrams / 7).toFixed(1)) : 1;

      const injectManualToOption = (opt: MenuOption) => {
        if (!opt || !Array.isArray(opt.ingredients)) return;
        const hasManual = opt.ingredients.some(
          (ing) => ing.preparationNotes?.includes('Aporte manual contabilizado') || ing.foodName.toLowerCase().includes('aporte manual')
        );
        if (!hasManual && (pGrams > 0 || totalKcal > 0 || lGrams > 0 || cGrams > 0)) {
          opt.ingredients.push({
            foodName: name,
            exactPortion: `${pGrams > 0 ? `${pGrams}g proteína, ` : ''}${totalKcal} kcal (${lGrams}g grasa, ${cGrams}g HC)`,
            smaeGroup: pGrams > 0 ? 'Alimento de origen animal muy bajo aporte de grasa' : 'Otros',
            equivalentsCount: eqCount,
            role: 'principal',
            isPreferred: true,
            preparationNotes: `Aporte manual contabilizado: ${pGrams}g proteína, ${totalKcal} kcal, ${lGrams}g lípidos, ${cGrams}g carbohidratos`,
          });
        }
      };

      injectManualToOption(rectified.optionA);
      injectManualToOption(rectified.optionB);
      injectManualToOption(rectified.optionC);
    }
  }

  // Si el suplemento de proteína de suero está activo y configurado para incluirse en el menú
  if (proteinSupplement?.enabled && proteinSupplement?.includeInMenu) {
    const mealKeyMap: Record<string, string> = {
      desayuno: 'desayuno',
      'colación 1': 'colacion1',
      'colacion 1': 'colacion1',
      colacion1: 'colacion1',
      comida: 'comida',
      'colación 2': 'colacion2',
      'colacion 2': 'colacion2',
      colacion2: 'colacion2',
      cena: 'cena',
    };
    const curKey = mealKeyMap[meal.mealName.toLowerCase()] || meal.mealName.toLowerCase();
    const timing = proteinSupplement.timing || 'colacion2';
    const isTarget = timing === 'any' ? curKey === 'colacion2' : curKey === timing;

    if (isTarget) {
      const brand = proteinSupplement.brandOrType || 'Proteína de suero de leche (Whey Protein)';
      const scoops = proteinSupplement.scoops || 1;
      const pGrams = proteinSupplement.totalProteinGrams || (scoops * (proteinSupplement.proteinGramsPerServing || 25));
      const eqCount = Number((pGrams / 7).toFixed(1));

      const injectToOption = (opt: MenuOption) => {
        if (!opt || !Array.isArray(opt.ingredients)) return;
        const hasProtein = opt.ingredients.some(
          (ing) =>
            ing.foodName.toLowerCase().includes('suero') ||
            ing.foodName.toLowerCase().includes('whey') ||
            ing.foodName.toLowerCase().includes('proteína en polvo') ||
            ing.foodName.toLowerCase().includes('proteina en polvo') ||
            ing.foodName.toLowerCase().includes('proteína de suero') ||
            ing.foodName.toLowerCase().includes('proteina de suero')
        );
        if (!hasProtein) {
          opt.ingredients.push({
            foodName: brand,
            exactPortion: `${scoops} ${scoops === 1 ? 'medida (scoop)' : 'medidas (scoops)'} (${Math.round(scoops * 30)}g polvo con ${pGrams}g proteína)`,
            smaeGroup: 'Alimento de origen animal muy bajo aporte de grasa',
            equivalentsCount: eqCount,
            role: 'principal',
            isPreferred: true,
            preparationNotes: `${pGrams}g de proteína de suero de leche contabilizada en el menú`,
          });
        }
        if (
          !opt.preparation.toLowerCase().includes('suero') &&
          !opt.preparation.toLowerCase().includes('whey') &&
          !opt.preparation.toLowerCase().includes('proteína') &&
          !opt.preparation.toLowerCase().includes('proteina')
        ) {
          opt.preparation += ` • Suplementación: Disolver o licuar ${scoops} medida(s) de ${brand} (${pGrams}g proteína) con agua fresca o leche descremada hasta obtener una consistencia cremosa y homogénea.`;
        }
      };

      injectToOption(rectified.optionA);
      injectToOption(rectified.optionB);
      injectToOption(rectified.optionC);
    }
  }

  // Reconcile totalEquivalentsSummary with canonical groups
  if (prescribedPortions) {
    rectified.totalEquivalentsSummary = Object.entries(prescribedPortions)
      .filter(([_, qty]) => (Number(qty) || 0) > 0)
      .map(([group, qty]) => ({
        group: normalizeSMAEGroupName(group),
        quantity: Number(qty),
      }));
  } else if (rectified.totalEquivalentsSummary) {
    rectified.totalEquivalentsSummary = rectified.totalEquivalentsSummary.map((s) => ({
      ...s,
      group: normalizeSMAEGroupName(s.group),
    }));
  }

  return ensureMealVariety(rectified, dislikedFoods, preferredFoods);
}

/**
 * Rectifies a full GeneratedPlan:
 * - Rectifies all 5 meals against the prescribed tableData
 * - Ensures global non-repetition across meals throughout the day
 * - Integrates general and meal-specific preferred and disliked foods
 * - Incorporates manual nutrient entry and protein supplement if enabled and marked for inclusion
 */
export function rectifyFullPlan(
  plan: GeneratedPlan,
  tableData?: Record<string, Record<string, number>>,
  dislikedFoods?: string,
  preferredFoods?: string,
  mealPreferences?: any,
  proteinSupplement?: ProteinSupplementInfo,
  manualNutrientEntry?: ManualNutrientEntry
): GeneratedPlan {
  if (!plan || !Array.isArray(plan.meals)) return plan;

  const mealColKeys: Record<string, string> = {
    desayuno: 'Desayuno',
    'colación 1': 'Colación 1',
    'colacion 1': 'Colación 1',
    colacion1: 'Colación 1',
    comida: 'Comida',
    'colación 2': 'Colación 2',
    'colacion 2': 'Colación 2',
    colacion2: 'Colación 2',
    cena: 'Cena',
  };

  const mealKeyMap: Record<string, string> = {
    desayuno: 'desayuno',
    'colación 1': 'colacion1',
    'colacion 1': 'colacion1',
    colacion1: 'colacion1',
    comida: 'comida',
    'colación 2': 'colacion2',
    'colacion 2': 'colacion2',
    colacion2: 'colacion2',
    cena: 'cena',
  };

  const rectifiedMeals = plan.meals.map((meal) => {
    let mealPortions: Record<string, number> | undefined;

    if (tableData) {
      const colName = mealColKeys[meal.mealName.toLowerCase()] || meal.mealName;
      mealPortions = {};
      Object.entries(tableData).forEach(([groupName, cols]) => {
        const qty = cols[colName] || cols[meal.mealName] || 0;
        if (qty > 0) {
          mealPortions![groupName] = qty;
        }
      });
    }

    const key = mealKeyMap[meal.mealName.toLowerCase()] || meal.mealName.toLowerCase();
    const mealPref = mealPreferences?.[key];

    // Combine general and specific preferences for this meal
    const mealDislikes = [dislikedFoods, mealPref?.dislikes].filter(Boolean).join(', ');
    const mealPreferred = [preferredFoods, mealPref?.likes].filter(Boolean).join(', ');

    return rectifyMealMenu(meal, mealPortions, mealDislikes, mealPreferred, proteinSupplement, manualNutrientEntry);
  });

  return {
    ...plan,
    meals: rectifiedMeals,
  };
}

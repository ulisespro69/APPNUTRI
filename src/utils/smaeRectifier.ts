import { MealMenu, MenuOption, SMAEIngredient, GeneratedPlan } from '../types';
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
 * Varied, high-quality, authentic SMAE 5th Edition reference foods by canonical group.
 * Used for rotation, anti-repetition, and automatic rectification of missing equivalents.
 */
export const SMAE_CANONICAL_FOODS_BY_GROUP: Record<
  CanonicalSMAEGroupName,
  Array<{ name: string; household: string; netGrams: number; unit: string; tip?: string }>
> = {
  'Verdura': [
    { name: 'Espinacas cocidas', household: '1/2 taza', netGrams: 90, unit: 'g' },
    { name: 'Nopales cocidos al vapor', household: '1 taza', netGrams: 150, unit: 'g' },
    { name: 'Jitomate bola o guajillo picado', household: '1 pieza mediana', netGrams: 120, unit: 'g' },
    { name: 'Calabacitas tiernas en cubos', household: '1 taza', netGrams: 110, unit: 'g' },
    { name: 'Chayote cocido al vapor', household: '1/2 taza', netGrams: 80, unit: 'g' },
    { name: 'Flor de calabaza limpia', household: '1 taza', netGrams: 80, unit: 'g' },
    { name: 'Pepino rebanado con cáscara', household: '1 1/2 taza', netGrams: 156, unit: 'g' },
    { name: 'Brócoli al vapor', household: '1 taza', netGrams: 92, unit: 'g' },
    { name: 'Champiñones rebanados cocidos', household: '1/2 taza', netGrams: 78, unit: 'g' },
    { name: 'Pimiento morrón en tiras', household: '1 pieza', netGrams: 120, unit: 'g' },
  ],
  'Fruta': [
    { name: 'Manzana fresca con cáscara', household: '1 pieza chica', netGrams: 106, unit: 'g' },
    { name: 'Fresas frescas rebanadas', household: '1 taza colmada', netGrams: 152, unit: 'g' },
    { name: 'Papaya picada en cubos', household: '1 taza', netGrams: 140, unit: 'g' },
    { name: 'Plátano tabasco o dominico', household: '1/2 pieza', netGrams: 60, unit: 'g' },
    { name: 'Melón picado fresco', household: '1 taza', netGrams: 160, unit: 'g' },
    { name: 'Moras o arándanos frescos', household: '3/4 taza', netGrams: 110, unit: 'g' },
    { name: 'Guayaba fresca', household: '3 piezas medianas', netGrams: 135, unit: 'g' },
    { name: 'Mandarina fresca', household: '2 piezas chicas', netGrams: 130, unit: 'g' },
    { name: 'Kiwi en rodajas', household: '1 1/2 pieza', netGrams: 114, unit: 'g' },
  ],
  'Cereales sin grasa': [
    { name: 'Tortilla de maíz nixtamalizado', household: '1 pieza', netGrams: 30, unit: 'g' },
    { name: 'Avena en hojuelas', household: '1/3 taza', netGrams: 20, unit: 'g' },
    { name: 'Arroz blanco o integral cocido', household: '1/3 taza', netGrams: 48, unit: 'g' },
    { name: 'Papa cocida o al vapor con cáscara', household: '1/2 pieza', netGrams: 90, unit: 'g' },
    { name: 'Tostada horneada de maíz (ej. Saníssimo)', household: '2 piezas', netGrams: 24, unit: 'g' },
    { name: 'Pan integral de caja', household: '1 rebanada', netGrams: 25, unit: 'g' },
    { name: 'Quinoa cocida al vapor', household: '1/3 taza', netGrams: 62, unit: 'g' },
    { name: 'Elote blanco o amarillo desgranado cocido', household: '1/2 taza', netGrams: 83, unit: 'g' },
    { name: 'Amaranto tostado natural', household: '1/4 taza', netGrams: 20, unit: 'g' },
    { name: 'Pasta integral cocida', household: '1/3 taza', netGrams: 47, unit: 'g' },
  ],
  'Cereales con grasa': [
    { name: 'Galleta de avena casera', household: '1 pieza pequeña', netGrams: 25, unit: 'g' },
    { name: 'Barra de amaranto con miel y cacao', household: '1 pieza', netGrams: 20, unit: 'g' },
    { name: 'Papas en gajos horneadas con aceite y páprika', household: '1/2 taza', netGrams: 70, unit: 'g' },
    { name: 'Tostada frita casera escurrida', household: '1 pieza', netGrams: 15, unit: 'g' },
  ],
  'Leguminosas': [
    { name: 'Frijoles negros o bayos cocidos de la olla', household: '1/2 taza', netGrams: 86, unit: 'g' },
    { name: 'Lentejas cocidas con recaudo', household: '1/2 taza', netGrams: 100, unit: 'g' },
    { name: 'Garbanzos cocidos', household: '1/2 taza', netGrams: 82, unit: 'g' },
    { name: 'Habas cocidas tiernas', household: '1/2 taza', netGrams: 85, unit: 'g' },
    { name: 'Soya cocida texturizada o en grano', household: '1/3 taza', netGrams: 60, unit: 'g' },
  ],
  'Alimento de origen animal muy bajo aporte de grasa': [
    { name: 'Pechuga de pollo cocida y deshebrada sin piel', household: '30g cocida (40g cruda)', netGrams: 30, unit: 'g' },
    { name: 'Filete de pescado blanco (tilapia, merluza o róbalo)', household: '40g cocido (50g crudo)', netGrams: 40, unit: 'g' },
    { name: 'Atún en agua drenado bajo en sodio', household: '1/3 lata', netGrams: 40, unit: 'g' },
    { name: 'Claras de huevo frescas', household: '2 piezas', netGrams: 66, unit: 'g' },
    { name: 'Camarón cocido o pacotilla', household: '4 piezas medianas', netGrams: 35, unit: 'g' },
    { name: 'Queso cottage descremado / light', household: '3 cucharadas soperas', netGrams: 45, unit: 'g' },
  ],
  'Alimento de origen animal bajo aporte de grasa': [
    { name: 'Queso panela fresco artesanal', household: '40g', netGrams: 40, unit: 'g' },
    { name: 'Bistec de res magro asado', household: '30g cocido (40g crudo)', netGrams: 30, unit: 'g' },
    { name: 'Jamón de pechuga de pavo bajo en sodio', household: '2 rebanadas delgadas', netGrams: 42, unit: 'g' },
    { name: 'Requesón artesanal descremado', household: '3 cucharadas soperas', netGrams: 45, unit: 'g' },
    { name: 'Lomo de cerdo magro horneado o a la plancha', household: '30g cocido', netGrams: 30, unit: 'g' },
    { name: 'Salmón fresco a la plancha', household: '30g cocido', netGrams: 30, unit: 'g' },
  ],
  'Alimento de origen animal moderado aporte de grasa': [
    { name: 'Huevo fresco de gallina entero', household: '1 pieza', netGrams: 50, unit: 'g' },
    { name: 'Salchicha de pavo', household: '1 pieza', netGrams: 45, unit: 'g' },
    { name: 'Queso Oaxaca artesanal deshebrado', household: '30g', netGrams: 30, unit: 'g' },
    { name: 'Queso fresco de rancho o canasto', household: '35g', netGrams: 35, unit: 'g' },
    { name: 'Sardina en salsa de jitomate drenada', household: '1 pieza pequeña', netGrams: 30, unit: 'g' },
  ],
  'Alimento de origen animal alto aporte de grasa': [
    { name: 'Queso manchego en rebanadas', household: '25g', netGrams: 25, unit: 'g' },
    { name: 'Salchicha de cerdo o viena', household: '3/4 pieza', netGrams: 34, unit: 'g' },
    { name: 'Queso gouda artesanal', household: '25g', netGrams: 25, unit: 'g' },
    { name: 'Chilorio de cerdo', household: '2 cucharadas', netGrams: 30, unit: 'g' },
  ],
  'Leche descremada': [
    { name: 'Leche descremada (light o deslactosada light)', household: '1 taza', netGrams: 240, unit: 'ml' },
    { name: 'Yogur natural descremado sin azúcar (0% grasa)', household: '3/4 taza', netGrams: 150, unit: 'g' },
    { name: 'Yogur griego natural 0% grasa sin endulzar', household: '3/4 taza', netGrams: 150, unit: 'g' },
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
    { name: 'Aguacate Hass', household: '1/3 pieza', netGrams: 45, unit: 'g' },
    { name: 'Aceite de oliva extra virgen', household: '1 cucharadita', netGrams: 5, unit: 'ml' },
    { name: 'Aceite de canola o aguacate para cocinar', household: '1 cucharadita', netGrams: 5, unit: 'ml' },
    { name: 'Aceitunas verdes o negras deshuesadas', household: '6 piezas medianas', netGrams: 30, unit: 'g' },
    { name: 'Mayonesa reducida en grasa', household: '1 cucharada', netGrams: 15, unit: 'g' },
  ],
  'Aceites y grasas con proteína': [
    { name: 'Almendras naturales enteras tostadas', household: '10 piezas', netGrams: 12, unit: 'g' },
    { name: 'Nuez pecana en mitades crujiente', household: '3 piezas en mitades', netGrams: 12, unit: 'g' },
    { name: 'Cacahuates naturales tostados sin sal', household: '14 piezas', netGrams: 14, unit: 'g' },
    { name: 'Pepitas de calabaza tostadas', household: '2 cucharaditas', netGrams: 10, unit: 'g' },
    { name: 'Crema de cacahuate 100% natural sin azúcar', household: '2 cucharaditas', netGrams: 10, unit: 'g' },
    { name: 'Semillas de chía o linaza molida', household: '2 cucharadas soperas', netGrams: 15, unit: 'g' },
  ],
  'Azúcares sin grasa': [
    { name: 'Miel de abeja pura mexicana', household: '2 cucharaditas', netGrams: 10, unit: 'g' },
    { name: 'Mermelada de fruta sin azúcar añadido', household: '2 1/2 cucharaditas', netGrams: 15, unit: 'g' },
    { name: 'Azúcar morena mascabado', household: '2 cucharaditas', netGrams: 10, unit: 'g' },
  ],
  'Azúcares con grasa': [
    { name: 'Chocolate amargo sin azúcar (70-85% cacao)', household: '1 cuadrito', netGrams: 15, unit: 'g' },
    { name: 'Cajeta de leche de cabra', household: '1 cucharadita', netGrams: 10, unit: 'g' },
  ],
  'Alimentos libres de energía': [
    { name: 'Café negro sin azúcar', household: 'Libre', netGrams: 0, unit: 'ml' },
    { name: 'Té de manzanilla, menta o verde', household: 'Libre', netGrams: 0, unit: 'ml' },
    { name: 'Agua natural con infusión de limón y hierbabuena', household: 'Libre', netGrams: 0, unit: 'ml' },
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
 * Calculates and formats mathematically exact household portions and grams
 * according to the number of equivalents (SMAE 5th Edition).
 */
export function formatScaledPortion(
  baseHousehold: string,
  baseNetGrams: number,
  equivalentsCount: number,
  unit: string = 'g'
): string {
  const count = Math.max(0.25, equivalentsCount || 1);
  const totalGrams = Math.round(baseNetGrams * count);

  let clean = baseHousehold.trim().toLowerCase();

  // If base is purely a gram/ml weight (e.g. "30 g", "40g", "40 g cocido", "30g cocida")
  if (/^\d+\s*(g|ml)\b/i.test(clean)) {
    const suffix = clean.replace(/^\d+\s*(g|ml)\s*/i, '').trim();
    return suffix ? `${totalGrams}${unit} ${suffix}` : `${totalGrams}${unit}`;
  }

  // Parse leading fraction or number from baseHousehold
  let baseAmount = 1;
  let remainingText = clean;
  
  const fractionMatch = clean.match(/^(\d+)\/(\d+)\s+(.+)$/);
  const wholeAndFractionMatch = clean.match(/^(\d+)\s+(\d+)\/(\d+)\s+(.+)$/);
  const wholeMatch = clean.match(/^(\d+)\s+(.+)$/);

  if (wholeAndFractionMatch) {
     baseAmount = parseInt(wholeAndFractionMatch[1], 10) + (parseInt(wholeAndFractionMatch[2], 10) / parseInt(wholeAndFractionMatch[3], 10));
     remainingText = wholeAndFractionMatch[4];
  } else if (fractionMatch) {
     baseAmount = parseInt(fractionMatch[1], 10) / parseInt(fractionMatch[2], 10);
     remainingText = fractionMatch[3];
  } else if (wholeMatch) {
     baseAmount = parseInt(wholeMatch[1], 10);
     remainingText = wholeMatch[2];
  } else {
     baseAmount = 1;
  }

  const calculatedAmount = baseAmount * count;
  
  // Format calculatedAmount: if it's a whole number, don't show decimals. Otherwise 1 decimal.
  const formattedAmount = calculatedAmount % 1 === 0 
    ? calculatedAmount.toString() 
    : calculatedAmount.toFixed(1);

  // Pluralization logic for common words based on calculatedAmount
  let itemText = remainingText;
  if (calculatedAmount !== 1) {
    itemText = itemText.replace(/\b(taza)\b/i, 'tazas');
    itemText = itemText.replace(/\b(tza)\b/i, 'tzas');
    itemText = itemText.replace(/\b(pieza)\b/i, 'piezas');
    itemText = itemText.replace(/\b(pza)\b/i, 'pzas');
    itemText = itemText.replace(/\b(rebanada)\b/i, 'rebanadas');
    itemText = itemText.replace(/\b(cucharada)\b/i, 'cucharadas');
    itemText = itemText.replace(/\b(cda)\b/i, 'cdas');
    itemText = itemText.replace(/\b(cucharadita)\b/i, 'cucharaditas');
    itemText = itemText.replace(/\b(cdita)\b/i, 'cditas');
  } else {
    itemText = itemText.replace(/\b(tazas)\b/i, 'taza');
    itemText = itemText.replace(/\b(tzas)\b/i, 'tza');
    itemText = itemText.replace(/\b(piezas)\b/i, 'pieza');
    itemText = itemText.replace(/\b(pzas)\b/i, 'pza');
    itemText = itemText.replace(/\b(rebanadas)\b/i, 'rebanada');
    itemText = itemText.replace(/\b(cucharadas)\b/i, 'cucharada');
    itemText = itemText.replace(/\b(cdas)\b/i, 'cda');
    itemText = itemText.replace(/\b(cucharaditas)\b/i, 'cucharadita');
    itemText = itemText.replace(/\b(cditas)\b/i, 'cdita');
  }

  return `${formattedAmount} ${itemText} (${totalGrams}${unit})`;
}

/**
 * Rectifies a single ingredient against SMAE 5th Edition standards:
 * - Checks exact canonical group name
 * - Computes exact net grams
 * - Scales household measurement according to equivalentsCount
 */
export function rectifyIngredient(ing: SMAEIngredient): SMAEIngredient {
  const canonicalGroup = normalizeSMAEGroupName(ing.smaeGroup);
  const eqCount = Number(ing.equivalentsCount) || 1;

  // Attempt to find in database or canonical list
  const dbMatch = findMatchingSMAEFood(ing.foodName, canonicalGroup);
  const canonicalList = SMAE_CANONICAL_FOODS_BY_GROUP[canonicalGroup] || [];
  const canonMatch = canonicalList.find((c) =>
    normalizeSearchString(ing.foodName).includes(normalizeSearchString(c.name))
  );

  const matched = dbMatch || canonMatch;

  let exactPortion = ing.exactPortion;

  if (matched) {
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

  return {
    foodName: ing.foodName,
    exactPortion,
    smaeGroup: canonicalGroup,
    equivalentsCount: eqCount,
  };
}

/**
 * Rectifies a single menu option against prescribed equivalents:
 * - Normalizes all ingredients
 * - Verifies mathematical equivalence against prescribed portions
 * - Injects missing groups if omitted by the AI
 * - Caps or scales excess portions
 */
export function rectifyMenuOption(
  option: MenuOption,
  prescribedPortions?: Record<string, number>,
  optionIndex: number = 0,
  mealName: string = 'Comida'
): MenuOption {
  if (!option || !Array.isArray(option.ingredients)) {
    return option;
  }

  // 1. Rectify each ingredient individually
  let rectifiedIngredients = option.ingredients.map(rectifyIngredient);

  // 2. If prescribed portions exist, enforce mathematical precision
  if (prescribedPortions && Object.keys(prescribedPortions).length > 0) {
    const prescribedGroupMap: Record<CanonicalSMAEGroupName, number> = {} as any;

    Object.entries(prescribedPortions).forEach(([grp, qty]) => {
      if (qty > 0) {
        const canon = normalizeSMAEGroupName(grp);
        prescribedGroupMap[canon] = (prescribedGroupMap[canon] || 0) + qty;
      }
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
        // AI completely missed this group! Inject a canonical food from that group
        const availableCanonical = SMAE_CANONICAL_FOODS_BY_GROUP[canonGrp] || [];
        const chosen = availableCanonical[optionIndex % availableCanonical.length] || availableCanonical[0];
        if (chosen) {
          const newIng: SMAEIngredient = {
            foodName: chosen.name,
            exactPortion: formatScaledPortion(chosen.household, chosen.netGrams, targetQty, chosen.unit),
            smaeGroup: canonGrp,
            equivalentsCount: targetQty,
          };
          rectifiedIngredients.push(newIng);
        }
      } else if (currentSum !== targetQty) {
        // Adjust proportionally so the sum equals targetQty
        if (currentList.length === 1) {
          const single = currentList[0];
          single.equivalentsCount = targetQty;
          const rect = rectifyIngredient(single);
          single.exactPortion = rect.exactPortion;
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
            const rect = rectifyIngredient(item);
            item.exactPortion = rect.exactPortion;
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
 * Retrieves valid candidate replacement foods for a given canonical SMAE group.
 */
export function getCandidatesForGroup(canonicalGroup: CanonicalSMAEGroupName): Array<{
  name: string;
  household: string;
  netGrams: number;
  unit: string;
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
  const combined: Array<{ name: string; household: string; netGrams: number; unit: string }> = [];

  for (const c of [...canonicalList, ...dbList]) {
    const key = normalizeSearchString(c.name);
    if (!seen.has(key)) {
      seen.add(key);
      combined.push(c);
    }
  }

  return combined;
}

/**
 * Ensures strict culinary variety and non-repetition across Option A, Option B, and Option C:
 * RULE: In each meal time, NO base ingredient may repeat more than TWO times across the 3 options.
 * If any ingredient would appear a 3rd time (or more), it is swapped with an authentic alternative
 * from the same SMAE group that has appeared less than 2 times (preferably 0).
 * Finally, reconciles option titles and cooking preparations to match the final verified ingredients.
 */
export function ensureMealVariety(meal: MealMenu, dislikedFoods?: string): MealMenu {
  if (!meal) return meal;

  const rawOptions = [meal.optionA, meal.optionB, meal.optionC].filter(Boolean) as MenuOption[];
  if (rawOptions.length <= 1) return meal;

  const dislikedTokens = dislikedFoods
    ? dislikedFoods
        .toLowerCase()
        .split(/[,\s+;/]+/)
        .map((w) => normalizeSearchString(w))
        .filter((w) => w.length > 2)
    : [];

  const isDisliked = (name: string) => {
    if (dislikedTokens.length === 0) return false;
    const norm = normalizeSearchString(name);
    return dislikedTokens.some((tok) => norm.includes(tok));
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
      const candidates = getCandidatesForGroup(canonGroup);
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
        const candidates = getCandidatesForGroup(canonicalGroup);

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
          const newKey = getFoodBaseIdentifier(selectedAlt.name, canonicalGroup);
          baseUsageCount.set(newKey, (baseUsageCount.get(newKey) || 0) + 1);
        } else {
          baseUsageCount.set(key, currentCount + 1);
        }
      } else {
        baseUsageCount.set(key, currentCount + 1);
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
 * Rectifies an entire MealMenu (Options A, B, and C):
 * - Normalizes exact portions and net grams
 * - Reconciles equivalents counts
 * - Enforces extreme variety and anti-repetition
 */
export function rectifyMealMenu(
  meal: MealMenu,
  prescribedPortions?: Record<string, number>,
  dislikedFoods?: string
): MealMenu {
  if (!meal) return meal;

  const rectified: MealMenu = {
    ...meal,
    optionA: rectifyMenuOption(meal.optionA, prescribedPortions, 0, meal.mealName),
    optionB: rectifyMenuOption(meal.optionB, prescribedPortions, 1, meal.mealName),
    optionC: rectifyMenuOption(meal.optionC, prescribedPortions, 2, meal.mealName),
  };

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

  return ensureMealVariety(rectified, dislikedFoods);
}

/**
 * Rectifies a full GeneratedPlan:
 * - Rectifies all 5 meals against the prescribed tableData
 * - Ensures global non-repetition across meals throughout the day
 */
export function rectifyFullPlan(
  plan: GeneratedPlan,
  tableData?: Record<string, Record<string, number>>,
  dislikedFoods?: string
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

    return rectifyMealMenu(meal, mealPortions, dislikedFoods);
  });

  return {
    ...plan,
    meals: rectifiedMeals,
  };
}

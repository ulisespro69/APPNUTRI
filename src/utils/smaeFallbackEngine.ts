import { MealMenu, MenuOption, SMAEIngredient, ProteinSupplementInfo, ManualNutrientEntry } from '../types';
import {
  rectifyMealMenu,
  getCandidatesForGroup,
  parseFoodTokens,
  matchesFoodTokens,
  normalizeSMAEGroupName,
  formatScaledPortion,
  parseAndScalePortion,
  getFoodBaseIdentifier,
} from './smaeRectifier';
import { synthesizeDishTitle, synthesizePreparation } from './smaeDishComposer';

// Standard portions dictionary matching SMAE 5ta Edición with diverse options
export const SMAE_PORTIONS_MAP: Record<
  string,
  {
    foodA: string;
    foodB: string;
    foodC: string;
    foodD?: string;
    foodAlt?: string;
    portionA: string;
    portionB: string;
    portionC: string;
    portionD?: string;
    portionAlt?: string;
  }
> = {
  'Verdura': {
    foodA: 'Espinacas cocidas y jitomate picado',
    foodB: 'Nopales cocidos y ensalada de pepino con lechuga',
    foodC: 'Calabacitas tiernas salteadas con flor de calabaza',
    foodD: 'Chayote al vapor con pimentón y brócoli fresco',
    foodAlt: 'Zanahoria rallada con limón y apio fresco',
    portionA: '1/2 tza espinacas (90g) y 1/2 pza jitomate (60g)',
    portionB: '1 tza nopales cocidos (130g) y 1 tza pepino con lechuga (100g)',
    portionC: '1/2 tza calabacita (55g) y 1 tza flor de calabaza (80g)',
    portionD: '1/2 tza chayote cocido (80g) y 1/2 tza brócoli (75g)',
    portionAlt: '1/2 tza zanahoria (55g) y 1 tza apio picado (100g)',
  },
  'Fruta': {
    foodA: 'Manzana roja fresca en gajos',
    foodB: 'Fresas frescas rebanadas con menta',
    foodC: 'Papaya picada con gotas de limón',
    foodD: 'Plátano dominico o pera fresca en gajos',
    foodAlt: 'Durazno en almíbar o Puré de manzana',
    portionA: '1 pza (106g)',
    portionB: '1 taza rebanada (152g)',
    portionC: '1 taza picada (140g)',
    portionD: '1/2 pieza (80g)',
    portionAlt: '2 mitades (126g) o 1/2 taza puré (120g)',
  },
  'Cereales sin grasa': {
    foodA: 'Tortilla de maíz nixtamalizada comaleada',
    foodB: 'Arroz blanco o integral cocido al vapor',
    foodC: 'Papa cocida o al vapor con cáscara (cereal sin grasa)',
    foodD: 'Avena integral en hojuelas cocida con canela',
    foodAlt: 'Pan integral de caja o tostadas horneadas sin freír',
    portionA: '1 pieza (30g)',
    portionB: '1/3 taza cocido (48g)',
    portionC: '1/2 pieza mediana (90g)',
    portionD: '1/3 taza cruda (20g)',
    portionAlt: '1 rebanada (25g) o 2 tostadas (24g)',
  },
  'Cereales con grasa': {
    foodA: 'Granola natural tostada de avena y miel',
    foodB: 'Galleta de avena con pasas o chispas casera',
    foodC: 'Barra de amaranto con miel y cacao amargo',
    foodD: 'Puré de papa preparado con mantequilla y leche',
    foodAlt: 'Pan dulce tradicional o cuernito pequeño',
    portionA: '3 cucharadas (20g)',
    portionB: '1 pieza pequeña (25g)',
    portionC: '1 pieza (20g)',
    portionD: '1/2 taza (100g)',
    portionAlt: '1/3 pieza (25g)',
  },
  'Leguminosas': {
    foodA: 'Frijoles negros de la olla machacados con epazote',
    foodB: 'Lentejas cocidas con recaudo casero de jitomate',
    foodC: 'Garbanzos cocidos salteados con pimentón',
    foodD: 'Habas tiernas cocidas al vapor con hierbas',
    foodAlt: 'Frijoles bayos enteros de la olla',
    portionA: '1/2 taza cocidos (86g)',
    portionB: '1/2 taza cocidas (99g)',
    portionC: '1/2 taza cocidos (82g)',
    portionD: '1/2 taza cocidas (85g)',
    portionAlt: '1/2 taza cocidos (86g)',
  },
  'Alimento de origen animal muy bajo aporte de grasa': {
    foodA: 'Pechuga de pollo cocida y deshebrada sin piel',
    foodB: 'Filete de pescado blanco (tilapia o merluza) al cilantro',
    foodC: 'Claras de huevo cocidas al vapor o al comal',
    foodD: 'Atún en agua drenado bajo en sodio',
    foodAlt: 'Camarón cocido al vapor',
    portionA: '30g cocido',
    portionB: '40g cocido',
    portionC: '2 piezas (66g)',
    portionD: '1/3 lata (40g)',
    portionAlt: '5 piezas medianas (35g)',
  },
  'Alimento de origen animal bajo aporte de grasa': {
    foodA: 'Queso panela fresco en cubos',
    foodB: 'Bistec de res magro a la plancha con limón',
    foodC: 'Jamón de pechuga de pavo bajo en sodio',
    foodD: 'Requesón artesanal descremado',
    foodAlt: 'Lomo de cerdo magro asado',
    portionA: '40g',
    portionB: '30g cocido',
    portionC: '2 rebanadas delgadas (42g)',
    portionD: '3 cucharadas soperas (45g)',
    portionAlt: '30g cocido',
  },
  'Alimento de origen animal moderado aporte de grasa': {
    foodA: 'Huevo entero revuelto con jitomate',
    foodB: 'Queso Oaxaca deshebrado artesanal',
    foodC: 'Queso fresco de rancho o canasto en cubos',
    foodD: 'Sardina en salsa de jitomate casera',
    foodAlt: 'Salchicha de pavo cocida',
    portionA: '1 pieza (50g)',
    portionB: '30g',
    portionC: '35g',
    portionD: '30g',
    portionAlt: '1 pieza (45g)',
  },
  'Alimento de origen animal alto aporte de grasa': {
    foodA: 'Queso manchego artesanal en rebanada',
    foodB: 'Salchicha de pavo asada en rodajas',
    foodC: 'Queso gouda en finas láminas',
    foodD: 'Queso amarillo fundido con verduras',
    portionA: '25g',
    portionB: '1 pieza (45g)',
    portionC: '25g',
    portionD: '1 rebanada (25g)',
  },
  'Leche Descremada': {
    foodA: 'Leche descremada / light tibia',
    foodB: 'Yogur natural descremado sin azúcar',
    foodC: 'Kéfir natural bebible descremado',
    foodD: 'Yogur griego descremado natural sin azúcar',
    portionA: '1 taza (240ml)',
    portionB: '3/4 taza (150g)',
    portionC: '3/4 taza (180ml)',
    portionD: '4 cucharadas (100g)',
  },
  'Leche Semi Descremada': {
    foodA: 'Leche semidescremada espumada con café',
    foodB: 'Yogur semidescremado natural',
    foodC: 'Kéfir semidescremado natural',
    foodD: 'Leche semidescremada tibia con canela',
    portionA: '1 taza (240ml)',
    portionB: '3/4 taza (150g)',
    portionC: '3/4 taza (180ml)',
    portionD: '1 taza (240ml)',
  },
  'Leche Entera': {
    foodA: 'Leche entera pasteurizada',
    foodB: 'Yogur griego entero sin azúcar',
    foodC: 'Kéfir entero natural con canela',
    foodD: 'Leche entera con canela',
    portionA: '1 taza (240ml)',
    portionB: '1/2 taza (125g)',
    portionC: '1/2 taza (125ml)',
    portionD: '1 taza (240ml)',
  },
  'Leche con Azúcar': {
    foodA: 'Yogur bebible de fresa natural',
    foodB: 'Leche sabor chocolate light',
    foodC: 'Yogur con fruta endulzado',
    foodD: 'Licuado bebible con leche descremada y fruta',
    portionA: '1/2 taza (120ml)',
    portionB: '3/4 taza (180ml)',
    portionC: '1/2 taza (120g)',
    portionD: '3/4 taza (180ml)',
  },
  'Aceite sin Proteína': {
    foodA: 'Aguacate Hass en rebanadas (topping de mesa)',
    foodB: 'Aceite de oliva extra virgen (en la preparación)',
    foodC: 'Aceitunas verdes o negras deshuesadas',
    foodD: 'Crema de vaca fresca (topping)',
    portionA: '1/3 pieza (45g)',
    portionB: '1 cdita (5ml)',
    portionC: '6 piezas medianas (30g)',
    portionD: '1 cda (15g)',
  },
  'Aceites con Proteína': {
    foodA: 'Almendras naturales fileteadas tostadas (topping)',
    foodB: 'Nuez pecana en trozos crujiente (topping)',
    foodC: 'Cacahuates naturales tostados sin sal',
    foodD: 'Semillas de chía (topping)',
    foodAlt: 'Pepitas de calabaza o ajonjolí tostado (topping)',
    portionA: '10 piezas (12g)',
    portionB: '3 piezas en mitades (12g)',
    portionC: '14 piezas (14g)',
    portionD: '2 cucharaditas (10g)',
    portionAlt: '18 piezas (15g)',
  },
  'Azúcar sin Grasa': {
    foodA: 'Miel de abeja pura mexicana',
    foodB: 'Mermelada de fresa o zarzamora casera',
    foodC: 'Azúcar morena mascabado',
    foodD: 'Gelatina preparada baja en azúcar',
    portionA: '2 cditas (10g)',
    portionB: '2.5 cditas (15g)',
    portionC: '2 cditas (10g)',
    portionD: '1/3 taza (80g)',
  },
  'Azúcar con Grasa': {
    foodA: 'Mazapán de cacahuate',
    foodB: 'Chocolate amargo 70% cacao artesanal',
    foodC: 'Cajeta de leche de cabra',
    foodD: 'Chocolate con leche artesanal',
    portionA: '1/3 pieza (10g)',
    portionB: '1 cuadrito (15g)',
    portionC: '1 cdita (10g)',
    portionD: '10g',
  },
};

function matchesText(food: string, query?: string): boolean {
  if (!query) return false;
  const words = query.toLowerCase().split(/[,\s+;/]+/).filter((w) => w.length > 2);
  const f = food.toLowerCase();
  return words.some((w) => f.includes(w));
}

// Builds a fallback single meal with 3 distinct non-repeating options, taking into account preferred and disliked foods, meal congruency, and global variety
export function buildFallbackMeal(
  mealName: string,
  portions: Record<string, number>,
  preferredFoods?: string,
  dislikedFoods?: string,
  mealIndex: number = 0,
  usedGlobalFoods?: Set<string>,
  proteinSupplement?: ProteinSupplementInfo,
  manualNutrientEntry?: ManualNutrientEntry
): MealMenu {
  const summary: { group: string; quantity: number }[] = [];
  const ingredientsA: SMAEIngredient[] = [];
  const ingredientsB: SMAEIngredient[] = [];
  const ingredientsC: SMAEIngredient[] = [];

  const preferredTokens = parseFoodTokens(preferredFoods);
  const dislikedTokens = parseFoodTokens(dislikedFoods);

  Object.entries(portions).forEach(([group, qty]) => {
    if (qty > 0) {
      summary.push({ group, quantity: qty });
      const canonGroup = normalizeSMAEGroupName(group);
      const candidates = getCandidatesForGroup(canonGroup, preferredFoods, dislikedFoods, mealName);

      // Select 3 distinct candidates across Option A, B, and C that harmonize with this meal time
      // and haven't been saturated across earlier meals in the day
      let candA = candidates.find((c) => !usedGlobalFoods?.has(getFoodBaseIdentifier(c.name, canonGroup))) || candidates[0];
      let baseA = getFoodBaseIdentifier(candA.name, canonGroup);

      let candB =
        candidates.find((c) => {
          const b = getFoodBaseIdentifier(c.name, canonGroup);
          return b !== baseA && !usedGlobalFoods?.has(b);
        }) ||
        candidates.find((c) => getFoodBaseIdentifier(c.name, canonGroup) !== baseA) ||
        candA;
      let baseB = getFoodBaseIdentifier(candB.name, canonGroup);

      let candC =
        candidates.find((c) => {
          const b = getFoodBaseIdentifier(c.name, canonGroup);
          return b !== baseA && b !== baseB && !usedGlobalFoods?.has(b);
        }) ||
        candidates.find((c) => {
          const b = getFoodBaseIdentifier(c.name, canonGroup);
          return b !== baseA && b !== baseB;
        }) ||
        candB;
      let baseC = getFoodBaseIdentifier(candC.name, canonGroup);

      // Register used base foods for whole-day variety tracking
      if (usedGlobalFoods) {
        usedGlobalFoods.add(baseA);
        usedGlobalFoods.add(baseB);
        usedGlobalFoods.add(baseC);
      }

      let fA = candA.name;
      let pA = formatScaledPortion(candA.household, candA.netGrams, qty, candA.unit);
      let fB = candB.name;
      let pB = formatScaledPortion(candB.household, candB.netGrams, qty, candB.unit);
      let fC = candC.name;
      let pC = formatScaledPortion(candC.household, candC.netGrams, qty, candC.unit);

      // Special handling for Aceites y grasas sin proteína (Grasas puras de cocción y mesa)
      if (canonGroup === 'Aceites y grasas sin proteína') {
        if (qty >= 2) {
          const restQty = qty - 1;

          // 1 eq for preparation/sautéing in pan
          ingredientsA.push({
            foodName: 'Aceite de oliva extra virgen (en la preparación / para cocinar)',
            exactPortion: '1 cdita (5ml)',
            smaeGroup: canonGroup,
            equivalentsCount: 1,
            isPreferred: matchesFoodTokens('Aceite de oliva', preferredTokens),
            role: 'coccion',
          });
          ingredientsB.push({
            foodName: 'Aceite vegetal para cocinar (en la preparación)',
            exactPortion: '1 cdita (5ml)',
            smaeGroup: canonGroup,
            equivalentsCount: 1,
            isPreferred: matchesFoodTokens('Aceite vegetal', preferredTokens),
            role: 'coccion',
          });
          ingredientsC.push({
            foodName: 'Aceite de aguacate virgen (en la preparación)',
            exactPortion: '1 cdita (5ml)',
            smaeGroup: canonGroup,
            equivalentsCount: 1,
            isPreferred: matchesFoodTokens('Aceite de aguacate', preferredTokens),
            role: 'coccion',
          });

          // Rest of eq as delicious table ingredient with exact total grams and scaled portions
          const isAvocadoDisliked = matchesFoodTokens('Aguacate Hass', dislikedTokens);
          const avoName = isAvocadoDisliked ? 'Aceitunas verdes (topping)' : 'Aguacate Hass en rebanadas (topping de mesa)';
          const avoPortion = isAvocadoDisliked
            ? formatScaledPortion('6 piezas', 30, restQty, 'g')
            : formatScaledPortion('1/3 pieza', 45, restQty, 'g');

          ingredientsA.push({
            foodName: avoName,
            exactPortion: avoPortion,
            smaeGroup: canonGroup,
            equivalentsCount: restQty,
            isPreferred: matchesFoodTokens(avoName, preferredTokens),
            role: 'topping',
          });
          ingredientsB.push({
            foodName: 'Crema de vaca fresca (topping)',
            exactPortion: formatScaledPortion('1 cda', 15, restQty, 'g'),
            smaeGroup: canonGroup,
            equivalentsCount: restQty,
            isPreferred: matchesFoodTokens('Crema de vaca', preferredTokens),
            role: 'topping',
          });
          ingredientsC.push({
            foodName: 'Aceitunas negras o verdes deshuesadas (topping / botana)',
            exactPortion: formatScaledPortion('6 piezas', 30, restQty, 'g'),
            smaeGroup: canonGroup,
            equivalentsCount: restQty,
            isPreferred: matchesFoodTokens('Aceitunas', preferredTokens),
            role: 'topping',
          });
        } else {
          // Exactly 1 equivalent of fat without protein
          ingredientsA.push({
            foodName: 'Aceite de oliva extra virgen (en la preparación / para cocinar)',
            exactPortion: '1 cdita (5ml)',
            smaeGroup: canonGroup,
            equivalentsCount: 1,
            isPreferred: matchesFoodTokens('Aceite de oliva', preferredTokens),
            role: 'coccion',
          });
          ingredientsB.push({
            foodName: 'Aguacate Hass en rebanadas (topping de mesa)',
            exactPortion: '1/3 pieza (45g)',
            smaeGroup: canonGroup,
            equivalentsCount: 1,
            isPreferred: matchesFoodTokens('Aguacate Hass', preferredTokens),
            role: 'topping',
          });
          ingredientsC.push({
            foodName: 'Aceite vegetal para cocinar (en la preparación)',
            exactPortion: '1 cdita (5ml)',
            smaeGroup: canonGroup,
            equivalentsCount: 1,
            isPreferred: matchesFoodTokens('Aceite vegetal', preferredTokens),
            role: 'coccion',
          });
        }
      } else if (canonGroup === 'Aceites y grasas con proteína') {
        // Oleaginosas y semillas con proteína: ALWAYS toppings!
        ingredientsA.push({
          foodName: fA.includes('topping') ? fA : `${fA} (topping)`,
          exactPortion: pA,
          smaeGroup: canonGroup,
          equivalentsCount: qty,
          isPreferred: matchesFoodTokens(fA, preferredTokens),
          role: 'topping',
        });
        ingredientsB.push({
          foodName: fB.includes('topping') ? fB : `${fB} (topping)`,
          exactPortion: pB,
          smaeGroup: canonGroup,
          equivalentsCount: qty,
          isPreferred: matchesFoodTokens(fB, preferredTokens),
          role: 'topping',
        });
        ingredientsC.push({
          foodName: fC.includes('topping') ? fC : `${fC} (topping)`,
          exactPortion: pC,
          smaeGroup: canonGroup,
          equivalentsCount: qty,
          isPreferred: matchesFoodTokens(fC, preferredTokens),
          role: 'topping',
        });
      } else {
        ingredientsA.push({
          foodName: fA,
          exactPortion: pA,
          smaeGroup: canonGroup,
          equivalentsCount: qty,
          isPreferred: matchesFoodTokens(fA, preferredTokens),
        });

        ingredientsB.push({
          foodName: fB,
          exactPortion: pB,
          smaeGroup: canonGroup,
          equivalentsCount: qty,
          isPreferred: matchesFoodTokens(fB, preferredTokens),
        });

        ingredientsC.push({
          foodName: fC,
          exactPortion: pC,
          smaeGroup: canonGroup,
          equivalentsCount: qty,
          isPreferred: matchesFoodTokens(fC, preferredTokens),
        });
      }
    }
  });

  // USER REQUIREMENT: AVOID GARLIC ("ajo") unless explicitly preferred
  const userWantsGarlic = preferredTokens.some((t) => t.includes('ajo'));
  const prefersHerbs = preferredTokens.some((t) =>
    ['especias', 'oregano', 'pimienta', 'comino', 'canela', 'hierbas', 'sazon', 'cilantro', 'epazote'].includes(t)
  );

  if (userWantsGarlic) {
    const seasoningIng: SMAEIngredient = {
      foodName: 'Ajo picado y especias al gusto (en la preparación / sazón libre)',
      exactPortion: 'Al gusto libre',
      smaeGroup: 'Alimentos libres de energía',
      equivalentsCount: 0,
      isPreferred: true,
      role: 'sazon',
    };
    ingredientsA.push(seasoningIng);
    ingredientsB.push(seasoningIng);
    ingredientsC.push(seasoningIng);
  } else if (prefersHerbs) {
    const seasoningIng: SMAEIngredient = {
      foodName: 'Hierbas finas de olor al gusto (cilantro, orégano, epazote, laurel, pimienta)',
      exactPortion: 'Al gusto libre',
      smaeGroup: 'Alimentos libres de energía',
      equivalentsCount: 0,
      isPreferred: true,
      role: 'sazon',
    };
    ingredientsA.push(seasoningIng);
    ingredientsB.push(seasoningIng);
    ingredientsC.push(seasoningIng);
  }

  const titleA = synthesizeDishTitle(mealName, ingredientsA, 0);
  const titleB = synthesizeDishTitle(mealName, ingredientsB, 1);
  const titleC = synthesizeDishTitle(mealName, ingredientsC, 2);

  const optionA: MenuOption = {
    title: titleA,
    description: `Opción tradicional mexicana balanceada que cubre con precisión matemática los ${summary.map((s) => `${s.quantity} eq ${s.group}`).join(', ')}.`,
    ingredients: ingredientsA,
    preparation: synthesizePreparation(titleA, ingredientsA),
    nutritionistTip: 'Sazona con hierbas naturales aromáticas (orégano, cilantro, epazote, perejil, comino o limón) para realzar el sabor sin añadir sodio innecesario.',
  };

  const optionB: MenuOption = {
    title: titleB,
    description: `Opción fresca, práctica y alternativa que respeta al 100% la cuadratura del SMAE 5ta edición.`,
    ingredients: ingredientsB,
    preparation: synthesizePreparation(titleB, ingredientsB),
    nutritionistTip: 'La combinación de fibra y proteína magra brinda saciedad prolongada y mantiene estables los niveles de glucosa.',
  };

  const optionC: MenuOption = {
    title: titleC,
    description: `Tercera opción creativa e innovadora con técnica culinaria diferenciada para ofrecer máxima variedad alimentaria.`,
    ingredients: ingredientsC,
    preparation: synthesizePreparation(titleC, ingredientsC),
    nutritionistTip: 'Recuerda que puedes intercambiar libremente cualquiera de los ingredientes por otro del mismo grupo equivalente según tu lista del SMAE.',
  };

  const rawMeal: MealMenu = {
    mealName,
    isFallback: true,
    totalEquivalentsSummary: summary,
    optionA,
    optionB,
    optionC,
  };

  return rectifyMealMenu(rawMeal, portions, dislikedFoods, preferredFoods, proteinSupplement, manualNutrientEntry);
}

export function buildFallbackFullPlan(
  tableData: Record<string, Record<string, number>>,
  patientNotes?: string,
  preferredFoods?: string,
  dislikedFoods?: string,
  mealPreferences?: any,
  proteinSupplement?: ProteinSupplementInfo,
  manualNutrientEntry?: ManualNutrientEntry
) {
  const mealNames = ['Desayuno', 'Colación 1', 'Comida', 'Colación 2', 'Cena'];
  const mealKeyMap: Record<string, string> = {
    'desayuno': 'desayuno',
    'colación 1': 'colacion1',
    'colacion 1': 'colacion1',
    'comida': 'comida',
    'colación 2': 'colacion2',
    'colacion 2': 'colacion2',
    'cena': 'cena',
  };

  const meals: MealMenu[] = [];
  const usedGlobalFoods = new Set<string>();

  mealNames.forEach((mName, idx) => {
    const mealPortions: Record<string, number> = {};
    Object.entries(tableData).forEach(([groupName, mealDict]) => {
      const count = mealDict[mName] || 0;
      if (count > 0) {
        mealPortions[groupName] = count;
      }
    });

    const key = mealKeyMap[mName.toLowerCase()] || mName.toLowerCase();
    const mealPref = mealPreferences?.[key];

    // Combine general and specific preferences
    const mealDislikes = [dislikedFoods, mealPref?.dislikes].filter(Boolean).join(', ');
    const mealPreferred = [preferredFoods, mealPref?.likes].filter(Boolean).join(', ');

    meals.push(buildFallbackMeal(mName, mealPortions, mealPreferred, mealDislikes, idx, usedGlobalFoods, proteinSupplement, manualNutrientEntry));
  });

  return {
    patientNotes:
      patientNotes ||
      'Plan calculado bajo el Sistema Mexicano de Alimentos Equivalentes (SMAE 5ta Ed.). Hidratación recomendada: 2 a 2.5 litros de agua natural al día.',
    isFallback: true,
    meals,
  };
}

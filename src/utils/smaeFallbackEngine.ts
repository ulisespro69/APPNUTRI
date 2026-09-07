import { MealMenu, MenuOption, SMAEIngredient } from '../types';

// Standard portions dictionary matching SMAE 5ta Edición with diverse options
export const SMAE_PORTIONS_MAP: Record<
  string,
  {
    foodA: string;
    foodB: string;
    foodC: string;
    foodAlt?: string;
    portionA: string;
    portionB: string;
    portionC: string;
    portionAlt?: string;
  }
> = {
  'Verdura': {
    foodA: 'Espinacas cocidas y jitomate picado',
    foodB: 'Nopales cocidos y ensalada de pepino con lechuga',
    foodC: 'Calabacitas tiernas salteadas con orégano y jitomate cherry',
    foodAlt: 'Chayote al vapor con pimentón y flor de calabaza',
    portionA: '1/2 tza espinacas (90g) y 1/2 pza jitomate (60g)',
    portionB: '1 tza nopales cocidos (130g) y 1 tza pepino con lechuga (100g)',
    portionC: '1 tza calabacita en cubos (110g) y 4 pzas jitomate cherry (60g)',
    portionAlt: '1/2 tza chayote cocido (80g) y 1 tza flor de calabaza (80g)',
  },
  'Fruta': {
    foodA: 'Manzana roja fresca en gajos',
    foodB: 'Fresas frescas rebanadas con menta',
    foodC: 'Papaya picada con gotas de limón',
    foodAlt: 'Plátano dominico en rodajas o melón fresco',
    portionA: '1 pza (106g)',
    portionB: '1 taza rebanada (152g)',
    portionC: '1 taza picada (140g)',
    portionAlt: '1/2 pza plátano (80g) o 1 taza melón (160g)',
  },
  'Cereales sin grasa': {
    foodA: 'Tortilla de maíz nixtamalizada comaleada',
    foodB: 'Arroz integral cocido al vapor',
    foodC: 'Avena integral en hojuelas cocida con canela',
    foodAlt: 'Pan de caja tostado integral o 2 tostadas horneadas',
    portionA: '1 pieza (30g)',
    portionB: '1/3 taza cocido (48g)',
    portionC: '1/3 taza en hojuelas (20g)',
    portionAlt: '1 rebanada (25g) o 2 tostadas horneadas (24g)',
  },
  'Cereales con grasa': {
    foodA: 'Galleta de avena casera',
    foodB: 'Papas horneadas con paprika y finas hierbas',
    foodC: 'Barra de amaranto con cacao y miel',
    foodAlt: 'Tostada frita casera escurrida',
    portionA: '1 pieza pequeña (25g)',
    portionB: '1/2 taza (70g)',
    portionC: '1 pieza pequeña (20g)',
    portionAlt: '1 pieza (15g)',
  },
  'Leguminosas': {
    foodA: 'Frijoles negros de la olla machacados con epazote',
    foodB: 'Lentejas cocidas con recaudo casero de jitomate',
    foodC: 'Garbanzos cocidos salteados con pimentón',
    foodAlt: 'Habas tiernas cocidas al vapor',
    portionA: '1/2 taza cocidos (86g)',
    portionB: '1/2 taza cocidas (99g)',
    portionC: '1/2 taza cocidos (82g)',
    portionAlt: '1/2 taza cocidas (85g)',
  },
  'Alimento de origen animal muy bajo aporte de grasa': {
    foodA: 'Pechuga de pollo cocida y deshebrada sin piel',
    foodB: 'Filete de pescado blanco (tilapia o merluza) al cilantro',
    foodC: 'Claras de huevo cocidas al vapor',
    foodAlt: 'Atún en agua drenado bajo en sodio',
    portionA: '30g cocido',
    portionB: '40g cocido',
    portionC: '2 piezas (66g)',
    portionAlt: '1/3 lata (40g)',
  },
  'Alimento de origen animal bajo aporte de grasa': {
    foodA: 'Queso panela fresco en cubos',
    foodB: 'Bistec de res magro a la plancha con limón',
    foodC: 'Jamón de pechuga de pavo bajo en sodio',
    foodAlt: 'Requesón artesanal descremado',
    portionA: '40g',
    portionB: '30g cocido',
    portionC: '2 rebanadas delgadas (42g)',
    portionAlt: '3 cucharadas soperas (45g)',
  },
  'Alimento de origen animal moderado aporte de grasa': {
    foodA: 'Huevo entero revuelto con jitomate',
    foodB: 'Queso Oaxaca deshebrado artesanal',
    foodC: 'Huevo estrellado en sartén antiadherente',
    foodAlt: 'Sardina en salsa de jitomate',
    portionA: '1 pieza (50g)',
    portionB: '30g',
    portionC: '1 pieza (50g)',
    portionAlt: '30g',
  },
  'Alimento de origen animal alto aporte de grasa': {
    foodA: 'Queso manchego artesanal en rebanada',
    foodB: 'Huevo cocido con queso derretido',
    foodC: 'Queso gouda en finas láminas',
    portionA: '25g',
    portionB: '1 pieza (50g) y 10g queso',
    portionC: '25g',
  },
  'Leche Descremada': {
    foodA: 'Leche descremada / light tibia',
    foodB: 'Yogur natural descremado sin azúcar',
    foodC: 'Kéfir natural bebible descremado',
    portionA: '1 taza (240ml)',
    portionB: '3/4 taza (150g)',
    portionC: '3/4 taza (180ml)',
  },
  'Leche Semi Descremada': {
    foodA: 'Leche semidescremada espumada con café',
    foodB: 'Yogur semidescremado natural',
    foodC: 'Leche semidescremada natural',
    portionA: '1 taza (240ml)',
    portionB: '3/4 taza (150g)',
    portionC: '1 taza (240ml)',
  },
  'Leche Entera': {
    foodA: 'Leche entera pasteurizada',
    foodB: 'Yogur griego entero sin azúcar',
    foodC: 'Leche entera para café con canela',
    portionA: '1 taza (240ml)',
    portionB: '1/2 taza (125g)',
    portionC: '1 taza (240ml)',
  },
  'Leche con Azúcar': {
    foodA: 'Yogur bebible de fresa natural',
    foodB: 'Leche sabor chocolate light',
    foodC: 'Yogur con fruta endulzado',
    portionA: '1/2 taza (120ml)',
    portionB: '3/4 taza (180ml)',
    portionC: '1/2 taza (120g)',
  },
  'Aceite sin Proteína': {
    foodA: 'Aguacate Hass en rebanadas cremosas',
    foodB: 'Aceite de oliva extra virgen para saltear',
    foodC: 'Aceite de canola o aguacate en spray/gotas',
    portionA: '1/3 pieza (45g)',
    portionB: '1 cdita (5ml)',
    portionC: '1 cdita (5ml)',
  },
  'Aceites con Proteína': {
    foodA: 'Almendras enteras naturales tostadas',
    foodB: 'Nuez pecana en mitades crujiente',
    foodC: 'Cacahuates tostados sin sal',
    foodAlt: 'Semillas de chía o pepitas de calabaza tostadas',
    portionA: '10 piezas (12g)',
    portionB: '3 piezas en mitades (12g)',
    portionC: '14 piezas (14g)',
    portionAlt: '2 cucharaditas (10g)',
  },
  'Azúcar sin Grasa': {
    foodA: 'Miel de abeja pura mexicana',
    foodB: 'Mermelada de fresa o zarzamora casera',
    foodC: 'Azúcar morena mascabado',
    portionA: '2 cditas (10g)',
    portionB: '2.5 cditas (15g)',
    portionC: '2 cditas (10g)',
  },
  'Azúcar con Grasa': {
    foodA: 'Chocolate amargo 70% cacao artesanal',
    foodB: 'Cajeta de leche de cabra',
    foodC: 'Crema de avellana con cacao sin azúcar añadida',
    portionA: '1 cuadrito (15g)',
    portionB: '1 cdita (10g)',
    portionC: '1 cdita (12g)',
  },
};

function matchesText(food: string, query?: string): boolean {
  if (!query) return false;
  const words = query.toLowerCase().split(/[,\s+;/]+/).filter((w) => w.length > 2);
  const f = food.toLowerCase();
  return words.some((w) => f.includes(w));
}

// Builds a fallback single meal with 3 distinct non-repeating options
export function buildFallbackMeal(
  mealName: string,
  portions: Record<string, number>,
  preferredFoods?: string,
  dislikedFoods?: string,
  mealIndex: number = 0
): MealMenu {
  const summary: { group: string; quantity: number }[] = [];
  const ingredientsA: SMAEIngredient[] = [];
  const ingredientsB: SMAEIngredient[] = [];
  const ingredientsC: SMAEIngredient[] = [];

  Object.entries(portions).forEach(([group, qty]) => {
    if (qty > 0) {
      summary.push({ group, quantity: qty });
      const ref = SMAE_PORTIONS_MAP[group] || {
        foodA: group,
        foodB: group,
        foodC: group,
        portionA: `${qty} porción`,
        portionB: `${qty} porción`,
        portionC: `${qty} porción`,
      };

      const multiplierText = qty === 1 ? '' : `${qty}x `;

      // Check dislikes and replace if needed
      let fA = ref.foodA;
      let pA = ref.portionA;
      if (matchesText(fA, dislikedFoods)) {
        fA = ref.foodAlt || ref.foodC;
        pA = ref.portionAlt || ref.portionC;
      }

      let fB = ref.foodB;
      let pB = ref.portionB;
      if (matchesText(fB, dislikedFoods)) {
        fB = ref.foodAlt || ref.foodA;
        pB = ref.portionAlt || ref.portionA;
      }

      let fC = ref.foodC;
      let pC = ref.portionC;
      if (matchesText(fC, dislikedFoods)) {
        fC = ref.foodAlt || ref.foodB;
        pC = ref.portionAlt || ref.portionB;
      }

      // Check likes to boost favorite foods
      if (preferredFoods && ref.foodAlt && matchesText(ref.foodAlt, preferredFoods)) {
        fC = ref.foodAlt;
        pC = ref.portionAlt || ref.portionC;
      }

      ingredientsA.push({
        foodName: fA,
        exactPortion: `${multiplierText}${pA}`,
        smaeGroup: group,
        equivalentsCount: qty,
      });

      ingredientsB.push({
        foodName: fB,
        exactPortion: `${multiplierText}${pB}`,
        smaeGroup: group,
        equivalentsCount: qty,
      });

      ingredientsC.push({
        foodName: fC,
        exactPortion: `${multiplierText}${pC}`,
        smaeGroup: group,
        equivalentsCount: qty,
      });
    }
  });

  // Unique, non-repeating recipe titles per meal time
  const getDishTitleA = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes('desayuno')) return 'Huevos Revueltos a la Mexicana con Frijolitos y Tortilla Comaleada';
    if (n.includes('comida')) return 'Guisado de Pechuga Deshebrada en Salsa Verde con Arroz y Frijoles';
    if (n.includes('cena')) return 'Quesadillas Ligeras de Queso Panela con Guacamole y Ensalada';
    if (n.includes('1') || n.includes('colación 1')) return 'Bowl Energético de Manzana y Fruta Fresca con Almendras';
    return 'Snack Balanceado de Fruta con Semillas Tostadas';
  };

  const getDishTitleB = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes('desayuno')) return 'Omelette Ligero de Espinacas con Queso Panela y Pan Integral';
    if (n.includes('comida')) return 'Bistec de Res Magro Asado al Limón con Nopales y Arroz Integral';
    if (n.includes('cena')) return 'Tostadas Horneadas con Pescado o Atún al Cilantro y Aguacate';
    if (n.includes('1') || n.includes('colación 1')) return 'Porción de Fresas Frescas con Mix de Nueces Tostadas';
    return 'Colación Saludable de Papaya con Yogur y Semillas';
  };

  const getDishTitleC = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes('desayuno')) return 'Bowl Cálido de Avena con Canela, Manzana en Cubos y Claras';
    if (n.includes('comida')) return 'Filete de Pescado Empapelado con Calabacitas y Garbanzos Salteados';
    if (n.includes('cena')) return 'Sincronizada Ligera de Jamón de Pavo con Ensalada Fresca de Pepino';
    if (n.includes('1') || n.includes('colación 1')) return 'Mix Crocante de Frutas Tropicales con Cacahuates Tostados';
    return 'Snack Rápido de Yogur Descremado con Fruta y Chía';
  };

  const optionA: MenuOption = {
    title: getDishTitleA(mealName),
    description: `Opción tradicional mexicana balanceada que cubre con precisión matemática los ${summary.map((s) => `${s.quantity} eq ${s.group}`).join(', ')}.`,
    ingredients: ingredientsA,
    preparation: 'Cocinar los alimentos a la plancha o comal con la porción de grasa o aceite vegetal asignada. Servir caliente con agua natural o infusión sin azúcar.',
    nutritionistTip: 'Sazona con hierbas naturales (orégano, cilantro, epazote, ajo y cebolla) para realzar el sabor sin añadir sodio innecesario.',
  };

  const optionB: MenuOption = {
    title: getDishTitleB(mealName),
    description: `Opción fresca, práctica y alternativa que respeta al 100% la cuadratura del SMAE 5ta edición.`,
    ingredients: ingredientsB,
    preparation: 'Pesar o medir los ingredientes con tazas medidoras estándar en crudo o cocido según la especificación del SMAE. Emplatar de forma vistosa.',
    nutritionistTip: 'La combinación de fibra y proteína magra brinda saciedad prolongada y mantiene estables los niveles de glucosa.',
  };

  const optionC: MenuOption = {
    title: getDishTitleC(mealName),
    description: `Tercera opción creativa e innovadora con técnica culinaria diferenciada para ofrecer máxima variedad alimentaria.`,
    ingredients: ingredientsC,
    preparation: 'Preparar en sartén antiadherente o al vapor para conservar al máximo micronutrientes y frescura.',
    nutritionistTip: 'Recuerda que puedes intercambiar libremente cualquiera de los ingredientes por otro del mismo grupo equivalente según tu lista del SMAE.',
  };

  return {
    mealName,
    isFallback: true,
    totalEquivalentsSummary: summary,
    optionA,
    optionB,
    optionC,
  };
}

export function buildFallbackFullPlan(
  tableData: Record<string, Record<string, number>>,
  patientNotes?: string,
  preferredFoods?: string,
  dislikedFoods?: string
) {
  const mealNames = ['Desayuno', 'Colación 1', 'Comida', 'Colación 2', 'Cena'];
  const meals: MealMenu[] = [];

  mealNames.forEach((mName, idx) => {
    const mealPortions: Record<string, number> = {};
    Object.entries(tableData).forEach(([groupName, mealDict]) => {
      const count = mealDict[mName] || 0;
      if (count > 0) {
        mealPortions[groupName] = count;
      }
    });
    meals.push(buildFallbackMeal(mName, mealPortions, preferredFoods, dislikedFoods, idx));
  });

  return {
    patientNotes:
      patientNotes ||
      'Plan calculado bajo el Sistema Mexicano de Alimentos Equivalentes (SMAE 5ta Ed.). Hidratación recomendada: 2 a 2.5 litros de agua natural al día.',
    isFallback: true,
    meals,
  };
}

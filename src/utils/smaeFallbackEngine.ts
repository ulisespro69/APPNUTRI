import { MealMenu, MenuOption, SMAEIngredient } from '../types';
import { rectifyMealMenu } from './smaeRectifier';
import { synthesizeDishTitle, synthesizePreparation } from './smaeDishComposer';

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
    foodC: 'Calabacitas tiernas salteadas con flor de calabaza',
    foodAlt: 'Chayote al vapor con pimentón y brócoli fresco',
    portionA: '1/2 tza espinacas (90g) y 1/2 pza jitomate (60g)',
    portionB: '1 tza nopales cocidos (130g) y 1 tza pepino con lechuga (100g)',
    portionC: '1/2 tza calabacita (55g) y 1 tza flor de calabaza (80g)',
    portionAlt: '1/2 tza chayote cocido (80g) y 1/2 tza brócoli (75g)',
  },
  'Fruta': {
    foodA: 'Manzana roja fresca en gajos',
    foodB: 'Fresas frescas rebanadas con menta',
    foodC: 'Papaya picada con gotas de limón',
    foodAlt: 'Durazno en almíbar o Puré de manzana',
    portionA: '1 pza (106g)',
    portionB: '1 taza rebanada (152g)',
    portionC: '1 taza picada (140g)',
    portionAlt: '2 mitades (126g) o 1/2 taza puré (120g)',
  },
  'Cereales sin grasa': {
    foodA: 'Tortilla de maíz nixtamalizada comaleada',
    foodB: 'Arroz integral cocido al vapor',
    foodC: 'Pasta integral cocida al dente',
    foodAlt: 'Avena integral en hojuelas cocida',
    portionA: '1 pieza (30g)',
    portionB: '1/3 taza cocido (48g)',
    portionC: '1/2 taza (65g)',
    portionAlt: '1/3 taza (20g)',
  },
  'Cereales con grasa': {
    foodA: 'Granola natural tostada',
    foodB: 'Papas horneadas con paprika y finas hierbas',
    foodC: 'Barra de amaranto con cacao y miel',
    foodAlt: 'Puré de papa preparado',
    portionA: '3 cucharadas (20g)',
    portionB: '1/2 taza (70g)',
    portionC: '1 pieza pequeña (20g)',
    portionAlt: '1/2 taza (105g)',
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
    foodC: 'Queso fresco de rancho o canasto en cubos',
    foodAlt: 'Sardina en salsa de jitomate',
    portionA: '1 pieza (50g)',
    portionB: '30g',
    portionC: '35g',
    portionAlt: '30g',
  },
  'Alimento de origen animal alto aporte de grasa': {
    foodA: 'Queso manchego artesanal en rebanada',
    foodB: 'Salchicha de pavo asada en rodajas',
    foodC: 'Queso gouda en finas láminas',
    portionA: '25g',
    portionB: '1 pieza (45g)',
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
    foodC: 'Kéfir semidescremado natural',
    portionA: '1 taza (240ml)',
    portionB: '3/4 taza (150g)',
    portionC: '3/4 taza (180ml)',
  },
  'Leche Entera': {
    foodA: 'Leche entera pasteurizada',
    foodB: 'Yogur griego entero sin azúcar',
    foodC: 'Kéfir entero natural con canela',
    portionA: '1 taza (240ml)',
    portionB: '1/2 taza (125g)',
    portionC: '1/2 taza (125ml)',
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
    foodC: 'Aceitunas verdes o negras deshuesadas',
    portionA: '1/3 pieza (45g)',
    portionB: '1 cdita (5ml)',
    portionC: '6 piezas medianas (30g)',
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
    foodA: 'Mazapán de cacahuate',
    foodB: 'Chocolate amargo 70% cacao artesanal',
    foodC: 'Cajeta de leche de cabra',
    portionA: '1/3 pieza (10g)',
    portionB: '1 cuadrito (15g)',
    portionC: '1 cdita (10g)',
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

      if (group === 'Aceite sin Proteína' && qty >= 2) {
        const restQty = qty - 1;
        const multiplierRest = restQty === 1 ? '' : `${restQty}x `;
        
        // 1 eq for preparation
        ingredientsA.push({ foodName: 'Aceite de oliva (preparación)', exactPortion: '1 cdita (5ml)', smaeGroup: group, equivalentsCount: 1 });
        ingredientsB.push({ foodName: 'Aceite vegetal (preparación)', exactPortion: '1 cdita (5ml)', smaeGroup: group, equivalentsCount: 1 });
        ingredientsC.push({ foodName: 'Aceite de aguacate (preparación)', exactPortion: '1 cdita (5ml)', smaeGroup: group, equivalentsCount: 1 });
        
        // Rest of eq as ingredient
        ingredientsA.push({ foodName: 'Aguacate Hass', exactPortion: `${multiplierRest}1/3 pieza (45g)`, smaeGroup: group, equivalentsCount: restQty });
        ingredientsB.push({ foodName: 'Crema de vaca (ingrediente)', exactPortion: `${multiplierRest}1 cda (15g)`, smaeGroup: group, equivalentsCount: restQty });
        ingredientsC.push({ foodName: 'Mayonesa (ingrediente)', exactPortion: `${multiplierRest}1 cdita (5g)`, smaeGroup: group, equivalentsCount: restQty });
      } else {
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
    }
  });

  const titleA = synthesizeDishTitle(mealName, ingredientsA, 0);
  const titleB = synthesizeDishTitle(mealName, ingredientsB, 1);
  const titleC = synthesizeDishTitle(mealName, ingredientsC, 2);

  const optionA: MenuOption = {
    title: titleA,
    description: `Opción tradicional mexicana balanceada que cubre con precisión matemática los ${summary.map((s) => `${s.quantity} eq ${s.group}`).join(', ')}.`,
    ingredients: ingredientsA,
    preparation: synthesizePreparation(titleA, ingredientsA),
    nutritionistTip: 'Sazona con hierbas naturales (orégano, cilantro, epazote, ajo y cebolla) para realzar el sabor sin añadir sodio innecesario.',
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

  return rectifyMealMenu(rawMeal, portions);
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

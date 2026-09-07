import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { buildFallbackFullPlan, buildFallbackMeal } from './src/utils/smaeFallbackEngine';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initialize Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set. Requests will fail if key is missing.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// SMAE Menu Generation Prompt & Schema definition
const mealMenuSchema = {
  type: Type.OBJECT,
  properties: {
    mealName: {
      type: Type.STRING,
      description: "Nombre del tiempo de comida (Desayuno, Colación 1, Comida, Colación 2, Cena)",
    },
    totalEquivalentsSummary: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          group: { type: Type.STRING, description: "Grupo de alimento SMAE" },
          quantity: { type: Type.NUMBER, description: "Cantidad de equivalentes asignados" },
        },
        required: ["group", "quantity"],
      },
      description: "Lista de grupos y cantidades de equivalentes que debían incluirse",
    },
    optionA: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Nombre atractivo y descriptivo del platillo o preparación para la Opción A" },
        description: { type: Type.STRING, description: "Breve descripción general del menú" },
        ingredients: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              foodName: { type: Type.STRING, description: "Nombre del alimento según SMAE 5ta edición" },
              exactPortion: { type: Type.STRING, description: "Porción exacta en medidas caseras y gramaje según SMAE (ej. 1/3 tza (48g), 1 pza (30g), 40g)" },
              smaeGroup: { type: Type.STRING, description: "Grupo exacto de SMAE al que pertenece" },
              equivalentsCount: { type: Type.NUMBER, description: "Número de equivalentes que representa (ej. 1, 0.5, 2)" },
            },
            required: ["foodName", "exactPortion", "smaeGroup", "equivalentsCount"],
          },
        },
        preparation: {
          type: Type.STRING,
          description: "Instrucciones claras y concisas de preparación culinaria",
        },
        nutritionistTip: {
          type: Type.STRING,
          description: "Consejo nutricional práctico o sugerencia de sazón/hidratación",
        },
      },
      required: ["title", "ingredients", "preparation"],
    },
    optionB: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Nombre atractivo y descriptivo del platillo o preparación para la Opción B (completamente diferente a la Opción A)" },
        description: { type: Type.STRING, description: "Breve descripción general del menú" },
        ingredients: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              foodName: { type: Type.STRING, description: "Nombre del alimento según SMAE 5ta edición" },
              exactPortion: { type: Type.STRING, description: "Porción exacta en medidas caseras y gramaje según SMAE (ej. 1/2 pza (80g), 2 rebanadas (42g))" },
              smaeGroup: { type: Type.STRING, description: "Grupo exacto de SMAE al que pertenece" },
              equivalentsCount: { type: Type.NUMBER, description: "Número de equivalentes que representa (ej. 1, 0.5, 2)" },
            },
            required: ["foodName", "exactPortion", "smaeGroup", "equivalentsCount"],
          },
        },
        preparation: {
          type: Type.STRING,
          description: "Instrucciones claras y concisas de preparación culinaria",
        },
        nutritionistTip: {
          type: Type.STRING,
          description: "Consejo nutricional práctico o sugerencia de sazón/hidratación",
        },
      },
      required: ["title", "ingredients", "preparation"],
    },
    optionC: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Nombre atractivo y descriptivo del platillo o preparación para la Opción C (completamente diferente e innovador frente a A y B)" },
        description: { type: Type.STRING, description: "Breve descripción general del menú" },
        ingredients: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              foodName: { type: Type.STRING, description: "Nombre del alimento según SMAE 5ta edición" },
              exactPortion: { type: Type.STRING, description: "Porción exacta en medidas caseras y gramaje según SMAE" },
              smaeGroup: { type: Type.STRING, description: "Grupo exacto de SMAE al que pertenece" },
              equivalentsCount: { type: Type.NUMBER, description: "Número de equivalentes que representa" },
            },
            required: ["foodName", "exactPortion", "smaeGroup", "equivalentsCount"],
          },
        },
        preparation: {
          type: Type.STRING,
          description: "Instrucciones claras y concisas de preparación culinaria",
        },
        nutritionistTip: {
          type: Type.STRING,
          description: "Consejo nutricional práctico o sugerencia de sazón/hidratación",
        },
      },
      required: ["title", "ingredients", "preparation"],
    },
  },
  required: ["mealName", "totalEquivalentsSummary", "optionA", "optionB", "optionC"],
};

const singleOptionSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Nombre atractivo y descriptivo del platillo o preparación" },
    description: { type: Type.STRING, description: "Breve descripción general del menú" },
    ingredients: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          foodName: { type: Type.STRING, description: "Nombre del alimento según SMAE 5ta edición" },
          exactPortion: { type: Type.STRING, description: "Porción exacta en medidas caseras y gramaje según SMAE" },
          smaeGroup: { type: Type.STRING, description: "Grupo exacto de SMAE al que pertenece" },
          equivalentsCount: { type: Type.NUMBER, description: "Número de equivalentes que representa" },
        },
        required: ["foodName", "exactPortion", "smaeGroup", "equivalentsCount"],
      },
    },
    preparation: {
      type: Type.STRING,
      description: "Instrucciones claras y concisas de preparación culinaria",
    },
    nutritionistTip: {
      type: Type.STRING,
      description: "Consejo nutricional práctico o sugerencia de sazón/hidratación",
    },
  },
  required: ["title", "ingredients", "preparation"],
};

const fullMenuResponseSchema = {
  type: Type.OBJECT,
  properties: {
    patientNotes: {
      type: Type.STRING,
      description: "Mensaje general de bienvenida, recomendaciones generales de hidratación y apego al plan",
    },
    meals: {
      type: Type.ARRAY,
      items: mealMenuSchema,
      description: "Lista de 5 tiempos de comida con sus 3 opciones de menú cada uno (Opción A, Opción B y Opción C)",
    },
  },
  required: ["meals"],
};

// Helper for resilient Gemini API calls with backoff and model fallbacks
const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateWithRetryAndFallback(params: {
  contents: string;
  systemInstruction: string;
  responseSchema: any;
  temperature?: number;
}): Promise<any> {
  const ai = getGeminiClient();
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    // Up to 2 attempts per candidate model to absorb momentary 503 spikes
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Gemini] Attempting generation with model ${model} (intento ${attempt})...`);
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: {
            systemInstruction: params.systemInstruction,
            temperature: params.temperature ?? 0.4,
            responseMimeType: 'application/json',
            responseSchema: params.responseSchema,
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.LOW,
            },
          },
        });

        const text = response.text;
        if (!text) {
          throw new Error('El modelo retornó una respuesta vacía.');
        }

        console.log(`[Gemini] Generación exitosa con el modelo ${model}.`);
        return JSON.parse(text);
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const isTemporarySpike =
          errMsg.includes('503') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('high demand') ||
          errMsg.includes('overloaded');

        if (isTemporarySpike && attempt === 1) {
          console.log(`[Gemini] Demanda alta temporal en ${model}. Reintentando en 1 segundo...`);
          await sleep(1000);
          continue;
        }

        console.log(`[Gemini] Modelo ${model} no disponible en este instante. Probando siguiente opción...`);
        await sleep(300);
        break; // Break inner loop to try next model
      }
    }
  }

  throw lastError || new Error('No fue posible generar el menú con los modelos disponibles.');
}

// API Endpoint to generate all 5 meals
app.post('/api/generate-menus', async (req, res) => {
  try {
    const { tableData, patientName, dietNotes, preferredFoods, dislikedFoods, mealPreferences } = req.body;

    if (!tableData || typeof tableData !== 'object') {
      return res.status(400).json({ error: 'tableData es requerido' });
    }

    const systemInstruction = `Eres un nutriólogo clínico experto mexicano de alta especialidad en el Sistema Mexicano de Alimentos Equivalentes (SMAE 5ta Edición).
Tu labor es recibir la distribución de equivalentes por tiempo de comida calculada por una nutrióloga clínica y transformarla en menús sumamente apetecibles, balanceados, económicos y con auténtica gastronomía mexicana cotidiana y saludable.

DEBES GENERAR OBLIGATORIAMENTE TRES OPCIONES (Opción A, Opción B y Opción C) PARA CADA TIEMPO DE COMIDA QUE TENGA EQUIVALENTES ASIGNADOS.

REGLAS CRÍTICAS DE CALIDAD Y VARIEDAD:
1. PROHIBICIÓN ESTRICTA DE REPETICIÓN:
   - Las tres opciones (Opción A, Opción B y Opción C) dentro de cada tiempo de comida DEBEN SER TOTALMENTE DISTINTAS entre sí (diferente técnica culinaria, sazón, combinación de ingredientes y estilo).
   - NUNCA repitas el mismo platillo o ingrediente principal entre los distintos tiempos del día (ej. si se usó huevo en el Desayuno, no uses huevo en la Comida ni en la Cena; si en la comida hay pechuga de pollo, en la cena ofrece queso panela, pescado, atún o leguminosas; rota las frutas y verduras para que no se repitan).

2. INCORPORACIÓN RIGUROSA DE ALIMENTOS PREFERIDOS Y NO PREFERIDOS:
   - ALIMENTOS PREFERIDOS (FAVORITOS): Incorpóralos con máxima prioridad en las opciones donde los equivalentes del grupo correspondiente lo permitan.
   - ALIMENTOS NO PREFERIDOS (A EVITAR / AVERSIÓN): QUEDA ESTRICTAMENTE PROHIBIDO incluir cualquier ingrediente mencionado en esta lista. Sustitúyelo siempre por otro alimento equivalente del mismo grupo SMAE.

3. UTILIZA EXCLUSIVAMENTE ALIMENTOS Y GRAMAJES DEL SMAE 5TA EDICIÓN:
   - Cada ingrediente DEBE indicar su medida casera y gramaje exacto de acuerdo al SMAE oficial.
   - Ejemplos canónicos del SMAE:
     * "1/3 tza Arroz cocido (48g) = 1 Cereal sin grasa"
     * "1 pza Tortilla de maíz (30g) = 1 Cereal sin grasa"
     * "1/3 tza Avena en hojuelas (20g) = 1 Cereal sin grasa"
     * "1 rebanada Pan integral (25g) = 1 Cereal sin grasa"
     * "2 pzas Tostada horneada (24g) = 1 Cereal sin grasa"
     * "1/2 tza Frijoles cocidos (86g) = 1 Leguminosa"
     * "1/2 tza Lentejas cocidas (99g) = 1 Leguminosa"
     * "30g Pechuga de pollo cocida sin piel = 1 AOA muy bajo aporte de grasa"
     * "40g Filete de pescado blanco (tilapia/merluza) = 1 AOA muy bajo aporte de grasa"
     * "1/3 lata Atún en agua drenado (40g) = 1 AOA muy bajo aporte de grasa"
     * "2 pzas Claras de huevo (66g) = 1 AOA muy bajo aporte de grasa"
     * "40g Queso panela / canasto = 1 AOA bajo aporte de grasa"
     * "2 rebanadas Jamón de pavo bajo en sodio (42g) = 1 AOA bajo aporte de grasa"
     * "30g Bistec de res magro = 1 AOA bajo aporte de grasa"
     * "1 pza Huevo entero (50g) = 1 AOA moderado aporte de grasa"
     * "30g Queso Oaxaca deshebrado = 1 AOA moderado aporte de grasa"
     * "1 tza Leche descremada / light (240ml) = 1 Leche descremada"
     * "3/4 tza Yogur natural sin azúcar (150g) = 1 Leche descremada"
     * "1 cdita Aceite de oliva / vegetal (5ml) = 1 Aceite sin proteína"
     * "1/3 pza Aguacate Hass (45g) = 1 Aceite sin proteína"
     * "10 pzas Almendras (12g) = 1 Aceites con proteína"
     * "3 pzas Nuez en mitades (12g) = 1 Aceites con proteína"
     * "1/2 pza Plátano (80g) = 1 Fruta"
     * "1 pza Manzana (106g) = 1 Fruta"
     * "1 tza Fresas rebanadas (152g) = 1 Fruta"
     * "1/2 tza Espinaca cocida (90g) o 2 tzas cruda = 1 Verdura"
     * "1 tza Nopal cocido (150g) = 1 Verdura"
     * "1 pza Jitomate bola (120g) = 1 Verdura"
     * "1 1/2 tza Pepino rebanado (156g) = 1 Verdura"

4. CUADRATURA MATEMÁTICA EXACTA:
   - Para cada tiempo de comida, tanto la Opción A, la Opción B como la Opción C DEBEN CUBRIR EXACTAMENTE LA MISMA SUMA DE EQUIVALENTES asignados en la tabla por la nutrióloga.
   - Si un grupo tiene 0 equivalentes para un tiempo, NO agregues alimentos calóricos de ese grupo.

5. SI UN TIEMPO TIENE 0 EQUIVALENTES TOTALES:
   - Genera una nota indicando que este tiempo no tiene porciones asignadas según el plan.`;

    let preferencesText = '';
    if (preferredFoods) {
      preferencesText += `\nALIMENTOS PREFERIDOS / FAVORITOS DEL PACIENTE (INCLUIR CON PRIORIDAD): ${preferredFoods}`;
    }
    if (dislikedFoods) {
      preferencesText += `\nALIMENTOS NO PREFERIDOS / AVERSIONES DEL PACIENTE (ESTRICTAMENTE PROHIBIDO INCLUIR): ${dislikedFoods}`;
    }

    if (mealPreferences) {
      preferencesText += `\n\nPREFERENCIAS DETALLADAS POR TIEMPO DE COMIDA:
- Desayuno: Preferidos (${mealPreferences.desayuno?.likes || 'N/A'}) | Evitar (${mealPreferences.desayuno?.dislikes || 'N/A'})
- Colación 1: Preferidos (${mealPreferences.colacion1?.likes || 'N/A'}) | Evitar (${mealPreferences.colacion1?.dislikes || 'N/A'})
- Comida: Preferidos (${mealPreferences.comida?.likes || 'N/A'}) | Evitar (${mealPreferences.comida?.dislikes || 'N/A'})
- Colación 2: Preferidos (${mealPreferences.colacion2?.likes || 'N/A'}) | Evitar (${mealPreferences.colacion2?.dislikes || 'N/A'})
- Cena: Preferidos (${mealPreferences.cena?.likes || 'N/A'}) | Evitar (${mealPreferences.cena?.dislikes || 'N/A'})`;
    }

    const prompt = `Calcula y genera las 3 opciones de menú (Opción A, Opción B y Opción C) para los siguientes tiempos de comida con sus porciones exactas del SMAE 5ta edición:

DATOS DEL PACIENTE: ${patientName ? patientName : 'Paciente General'}
NOTAS / INDICACIONES CLÍNICAS: ${dietNotes ? dietNotes : 'Menús mexicanos balanceados, deliciosos, fáciles de preparar y económicos.'}
${preferencesText}

TABLA DE EQUIVALENTES SMAE:
${JSON.stringify(tableData, null, 2)}

Por favor genera las 3 OPCIONES COMPLETAS (Opción A, Opción B y Opción C) para cada uno de los 5 tiempos de comida (Desayuno, Colación 1, Comida, Colación 2, Cena) respetando estrictamente la no repetición de recetas, la integración de comidas preferidas y la exclusión de comidas no preferidas.`;

    const data = await generateWithRetryAndFallback({
      contents: prompt,
      systemInstruction,
      responseSchema: fullMenuResponseSchema,
      temperature: 0.5,
    });

    // If client requested to preserve specific options for printing, merge them back
    if (req.body.preservedMeals && data.meals) {
      const preserved = req.body.preservedMeals;
      data.meals = data.meals.map((m: any) => {
        const p = preserved[m.mealName];
        if (!p || !Array.isArray(p.keptLetters)) return m;
        return {
          ...m,
          optionA: p.keptLetters.includes('A') && p.optionA ? p.optionA : m.optionA,
          optionB: p.keptLetters.includes('B') && p.optionB ? p.optionB : m.optionB,
          optionC: p.keptLetters.includes('C') && p.optionC ? p.optionC : m.optionC,
        };
      });
    }

    return res.json(data);
  } catch (error: any) {
    console.log('[Gemini] Modelos de IA saturados temporalmente. Activando motor determinista SMAE de respaldo.');
    const fallbackData = buildFallbackFullPlan(
      req.body.tableData,
      req.body.dietNotes,
      req.body.preferredFoods,
      req.body.dislikedFoods
    );

    if (req.body.preservedMeals && fallbackData.meals) {
      const preserved = req.body.preservedMeals;
      fallbackData.meals = fallbackData.meals.map((m: any) => {
        const p = preserved[m.mealName];
        if (!p || !Array.isArray(p.keptLetters)) return m;
        return {
          ...m,
          optionA: p.keptLetters.includes('A') && p.optionA ? p.optionA : m.optionA,
          optionB: p.keptLetters.includes('B') && p.optionB ? p.optionB : m.optionB,
          optionC: p.keptLetters.includes('C') && p.optionC ? p.optionC : m.optionC,
        };
      });
    }

    return res.json(fallbackData);
  }
});

// API Endpoint to regenerate a single meal (with option to maintain selected options for printing)
app.post('/api/regenerate-meal', async (req, res) => {
  try {
    const {
      mealName,
      portions,
      patientName,
      dietNotes,
      preferredFoods,
      dislikedFoods,
      specificPreferences,
      existingMenuTitles,
      keptOptions,
      keepLetters,
    } = req.body;

    if (!mealName || !portions) {
      return res.status(400).json({ error: 'mealName y portions son requeridos' });
    }

    let keptInstruction = '';
    if (Array.isArray(keepLetters) && keepLetters.length > 0) {
      keptInstruction = `\nNOTA ESPECIAL: El paciente ya seleccionó para imprimir la(s) Opción(es) ${keepLetters.join(', ')}. Genera opciones totalmente novedosas, variadas y diferentes para las opciones restantes sin duplicar alimentos ni recetas.`;
    }

    const systemInstruction = `Eres un nutriólogo experto mexicano de alta especialidad en el Sistema Mexicano de Alimentos Equivalentes (SMAE 5ta Edición).
Genera 3 OPCIONES TOTALMENTE NUEVAS, CREATIVAS Y VARIADAS (Opción A, Opción B y Opción C) para el tiempo de comida "${mealName}" cumpliendo estrictamente con las porciones y gramajes de SMAE 5ta edición asignadas.
${keptInstruction}

REGLAS CRÍTICAS:
1. NO REPETIR RECETAS: Las opciones deben ser completamente diferentes entre sí y distintas a recetas previas (${existingMenuTitles ? existingMenuTitles.join(', ') : 'ninguna'}).
2. PREFERENCIAS: Incorpora los alimentos preferidos del paciente y EXCLUYE COMPLETAMENTE cualquier alimento no preferido o que deba evitarse.
3. UTILIZA EXCLUSIVAMENTE los alimentos, ingredientes y porciones listados en el SMAE 5ta Edición con sus gramajes exactos.`;

    let specificPrefsText = '';
    if (preferredFoods) specificPrefsText += `\nAlimentos preferidos generales: ${preferredFoods}`;
    if (dislikedFoods) specificPrefsText += `\nAlimentos no preferidos / a evitar: ${dislikedFoods}`;
    if (specificPreferences && (specificPreferences.likes || specificPreferences.dislikes)) {
      specificPrefsText += `\nPreferencias específicas para ${mealName}: Preferidos (${specificPreferences.likes || 'N/A'}) | Evitar (${specificPreferences.dislikes || 'N/A'})`;
    }

    const prompt = `Genera 3 opciones de menú (Opción A, Opción B y Opción C) para ${mealName}.
Equivalentes asignados:
${JSON.stringify(portions, null, 2)}

Notas: ${dietNotes || 'Alta variedad gastronómica, platillo creativo mexicano, saludable y apetecible.'}${specificPrefsText}`;

    const data = await generateWithRetryAndFallback({
      contents: prompt,
      systemInstruction,
      responseSchema: mealMenuSchema,
      temperature: 0.5,
    });

    // Merge back any kept options selected for printing
    if (keptOptions && Array.isArray(keepLetters)) {
      if (keepLetters.includes('A') && keptOptions.optionA) data.optionA = keptOptions.optionA;
      if (keepLetters.includes('B') && keptOptions.optionB) data.optionB = keptOptions.optionB;
      if (keepLetters.includes('C') && keptOptions.optionC) data.optionC = keptOptions.optionC;
    }

    return res.json(data);
  } catch (error: any) {
    console.log('[Gemini] Regeneración por IA saturada temporalmente. Usando motor determinista SMAE de respaldo.');
    const fallbackMeal = buildFallbackMeal(
      req.body.mealName,
      req.body.portions,
      req.body.preferredFoods,
      req.body.dislikedFoods
    );

    if (req.body.keptOptions && Array.isArray(req.body.keepLetters)) {
      if (req.body.keepLetters.includes('A') && req.body.keptOptions.optionA) fallbackMeal.optionA = req.body.keptOptions.optionA;
      if (req.body.keepLetters.includes('B') && req.body.keptOptions.optionB) fallbackMeal.optionB = req.body.keptOptions.optionB;
      if (req.body.keepLetters.includes('C') && req.body.keptOptions.optionC) fallbackMeal.optionC = req.body.keptOptions.optionC;
    }

    return res.json(fallbackMeal);
  }
});

// API Endpoint to regenerate a single specific option (e.g. Option A, B or C)
app.post('/api/regenerate-option', async (req, res) => {
  try {
    const {
      mealName,
      optionLetter,
      portions,
      patientName,
      dietNotes,
      preferredFoods,
      dislikedFoods,
      specificPreferences,
      existingMenuTitles,
    } = req.body;

    if (!mealName || !portions || !optionLetter) {
      return res.status(400).json({ error: 'mealName, portions y optionLetter son requeridos' });
    }

    const systemInstruction = `Eres un nutriólogo experto mexicano de alta especialidad en el Sistema Mexicano de Alimentos Equivalentes (SMAE 5ta Edición).
Genera UNA ÚNICA OPCIÓN TOTALMENTE NUEVA, CREATIVA Y DELICIOSA (Opción ${optionLetter}) para el tiempo de comida "${mealName}" cumpliendo exactamente con las porciones y gramajes de SMAE 5ta edición asignados.

REGLAS CRÍTICAS:
1. NO REPETIR RECETAS: La receta debe ser completamente diferente a las existentes (${existingMenuTitles ? existingMenuTitles.join(', ') : 'ninguna'}).
2. PREFERENCIAS: Incorpora los alimentos preferidos del paciente y EXCLUYE COMPLETAMENTE los alimentos a evitar.
3. UTILIZA EXCLUSIVAMENTE los alimentos, ingredientes y porciones listados en el SMAE 5ta Edición con sus gramajes exactos.`;

    let specificPrefsText = '';
    if (preferredFoods) specificPrefsText += `\nAlimentos preferidos generales: ${preferredFoods}`;
    if (dislikedFoods) specificPrefsText += `\nAlimentos no preferidos / a evitar: ${dislikedFoods}`;
    if (specificPreferences && (specificPreferences.likes || specificPreferences.dislikes)) {
      specificPrefsText += `\nPreferencias para ${mealName}: Preferidos (${specificPreferences.likes || 'N/A'}) | Evitar (${specificPreferences.dislikes || 'N/A'})`;
    }

    const prompt = `Genera un nuevo menú para la Opción ${optionLetter} de ${mealName}.
Equivalentes asignados:
${JSON.stringify(portions, null, 2)}

Notas: ${dietNotes || 'Menú balanceado, sazón mexicana, fácil de preparar.'}${specificPrefsText}`;

    const optionData = await generateWithRetryAndFallback({
      contents: prompt,
      systemInstruction,
      responseSchema: singleOptionSchema,
      temperature: 0.5,
    });

    return res.json({ option: optionData });
  } catch (error: any) {
    console.log('[Gemini] Regeneración de opción individual saturada. Usando motor determinista SMAE de respaldo.');
    const fallbackMeal = buildFallbackMeal(
      req.body.mealName,
      req.body.portions,
      req.body.preferredFoods,
      req.body.dislikedFoods
    );
    const letter = (req.body.optionLetter || 'A').toUpperCase();
    const fallbackOpt = letter === 'B' ? fallbackMeal.optionB : letter === 'C' ? fallbackMeal.optionC : fallbackMeal.optionA;
    return res.json({ option: fallbackOpt, isFallback: true });
  }
});

// Vite middleware in dev or static serving in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor SMAE Pro activo en http://localhost:${PORT}`);
  });
}

startServer();

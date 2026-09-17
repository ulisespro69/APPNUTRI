import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { buildFallbackFullPlan, buildFallbackMeal } from './src/utils/smaeFallbackEngine';
import { rectifyFullPlan, rectifyMealMenu, rectifyMenuOption, ensureMealVariety } from './src/utils/smaeRectifier';

dotenv.config();

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
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateWithTimeout<T>(promiseFn: () => Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Tiempo de espera de IA agotado (${timeoutMs}ms)`)), timeoutMs);
  });
  try {
    return await Promise.race([promiseFn(), timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}

async function generateWithRetryAndFallback(params: {
  contents: string;
  systemInstruction: string;
  responseSchema: any;
  temperature?: number;
}): Promise<any> {
  const ai = getGeminiClient();
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[Gemini] Attempting generation with model ${model} (attempt ${attempt}/${maxAttempts})...`);
        
        const config: any = {
          systemInstruction: params.systemInstruction,
          temperature: params.temperature ?? 0.4,
          responseMimeType: 'application/json',
          responseSchema: params.responseSchema,
        };

        // thinkingConfig is supported on Gemini 3 series models
        if (model.startsWith('gemini-3')) {
          config.thinkingConfig = {
            thinkingLevel: model.includes('lite') ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW,
          };
        }

        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config,
        });

        const text = response.text;
        if (!text) {
          throw new Error('Respuesta vacía.');
        }

        console.log(`[Gemini] Generación exitosa con el modelo ${model}.`);
        return JSON.parse(text);
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const is503OrRateLimit =
          errMsg.includes('503') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('high demand') ||
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('quota');

        // Note: We avoid using the word "Error" here to prevent the AI Studio environment
        // from treating this gracefully handled retry as an application crash.
        console.log(`[Gemini] Aviso: el modelo ${model} no está disponible temporalmente (intento ${attempt}/${maxAttempts}). Detalle: ${is503OrRateLimit ? 'Alta demanda / Cuota' : 'Fallo en solicitud'}.`);

        if (is503OrRateLimit && attempt < maxAttempts) {
          const waitTime = attempt * 2000;
          console.log(`[Gemini] Reintentando modelo ${model} tras pausa de ${waitTime}ms...`);
          await sleep(waitTime);
        } else {
          // Proceed to test next candidate model
          break;
        }
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

    const systemInstruction = `Eres un nutriólogo clínico especialista de primer nivel en el Sistema Mexicano de Alimentos Equivalentes (SMAE 5ta Edición).
Tu labor es recibir la distribución de equivalentes por tiempo de comida calculada por una nutrióloga clínica y transformarla en menús extraordinariamente variados, deliciosos, apetecibles, económicos y con auténtica cocina mexicana cotidiana y saludable.

DEBES GENERAR OBLIGATORIAMENTE TRES OPCIONES (Opción A, Opción B y Opción C) PARA CADA TIEMPO DE COMIDA QUE TENGA EQUIVALENTES ASIGNADOS.

REGLAS CRÍTICAS DE CALIDAD, VARIEDAD Y NO REPETICIÓN (MÁXIMA PRIORIDAD):
1. ROTACIÓN ESTRICTA Y EXCLUSIÓN DE OPCIONES PREVIAS:
   - Cada una de las 3 opciones (Opción A, Opción B y Opción C) dentro de un mismo tiempo de comida DEBE utilizar un ingrediente proteico principal distinto, un cereal base distinto, una fruta distinta, una verdura distinta y una grasa distinta.
   - NUNCA pongas pollo en Opción A y pollo en Opción B.
   - Comienza SIEMPRE con menús y recetas que NO hayan sido mostrados previamente como opciones al paciente. (Ver lista de exclusiones si aplica).
2. COHERENCIA CULINARIA HUMANA (ARMONÍA Y SENTIDO COMÚN):
   - Trata que los menús tengan una coherencia lógica y armonía culinaria real entre cada grupo de alimento, como si el platillo fuera pensado y cocinado por una persona (un chef o nutriólogo humano).
   - No mezcles ingredientes al azar o que no combinan (por ejemplo, no combines pescado con frutas incongruentes en un mismo taco). Construye platillos con sentido común gastronómico y buen sabor.
3. INSPIRACIÓN EN INTERNET Y ADAPTACIÓN ESTRICTA AL SMAE:
   - Toma en cuenta más opciones y recetas creativas de internet para aportar mayor variedad.
   - OBLIGATORIO: Ajusta minuciosamente estas recetas al GRUPO DE ALIMENTOS correspondiente que tomas como referencia según el documento del SMAE (Sistema Mexicano de Alimentos Equivalentes, 5ta Ed.) y al NÚMERO DE EQUIVALENTES dados por el usuario.
4. VERIFICACIÓN MINUCIOSA (DOBLE CHEQUEO):
   - Eres extremadamente minucioso. ANTES de mostrar la respuesta, revisa mentalmente y asegúrate de que cada ingrediente corresponda ESTRICTAMENTE al grupo de alimento solicitado y al equivalente dado.
   - Evita errores graves de clasificación (ej. no clasifiques aguacate en frutas ni la papa en verduras).
5. ROTACIÓN INTEGRAL A LO LARGO DEL DÍA:
   - NUNCA repitas el mismo ingrediente proteico principal entre los distintos tiempos del día.
6. RESPETO DE PREFERENCIAS Y AVERSIONES:
   - ALIMENTOS PREFERIDOS (FAVORITOS): Incorpóralos con máxima prioridad.
   - ALIMENTOS NO PREFERIDOS (A EVITAR / AVERSIÓN): QUEDA TERMINANTEMENTE PROHIBIDO incluir cualquier ingrediente mencionado.
7. CONSULTA Y RECTIFICACIÓN EXACTA DEL SMAE 5TA EDICIÓN:
   - Cada ingrediente DEBE indicar su medida casera y gramaje neto exacto según el SMAE oficial multiplicado por el número de equivalentes (equivalentsCount):
     * Cereales sin grasa: 1 eq Tortilla de maíz = 1 pza (30g) | 1 eq Arroz cocido = 1/3 tza (48g) | 1 eq Avena en hojuelas = 1/3 tza (20g) | 1 eq Papa cocida = 1/2 pza (90g) | 1 eq Pan integral = 1 rebanada (25g).
     * Leguminosas: 1 eq Frijoles cocidos = 1/2 tza (86g) | 1 eq Lentejas cocidas = 1/2 tza (100g).
     * AOA Muy Bajo en Grasa: 1 eq Pechuga de pollo = 30g | 1 eq Pescado blanco = 40g | 1 eq Atún = 1/3 lata (40g) | 1 eq Claras = 2 pzas (66g).
     * AOA Bajo en Grasa: 1 eq Queso panela = 40g | 1 eq Bistec de res = 30g | 1 eq Jamón de pavo = 2 rebanadas (42g).
     * AOA Moderado en Grasa: 1 eq Huevo entero = 1 pza (50g) | 1 eq Queso Oaxaca = 30g | 1 eq Salchicha de pavo = 1 pza (45g).
     * Leche: 1 eq Leche descremada = 1 tza (240ml) | 1 eq Yogur natural = 3/4 tza (150g).
     * Aceites sin proteína: 1 eq Aguacate Hass = 1/3 pza (45g) | 1 eq Aceite de oliva = 1 cdita (5ml).
     * Aceites con proteína: 1 eq Almendras = 10 pzas (12g) | 1 eq Nuez = 3 pzas (12g).
     * Frutas: 1 eq Manzana = 1 pza (106g) | 1 eq Plátano = 1/2 pza (60g) | 1 eq Fresas = 1 tza (152g) | 1 eq Papaya = 1 tza (140g).
     * Verduras: 1 eq Espinaca = 1/2 tza (90g) | 1 eq Nopal = 1 tza (150g) | 1 eq Jitomate = 1 pza (120g) | 1 eq Calabacita = 1 tza (110g).
8. FORMATO DE FRACCIONES Y MULTIPLICACIÓN MATEMÁTICA (IMPORTANTE):
   - Cuando la porción base de un alimento en el SMAE sea una fracción (ej. 1/2 taza, 1/3 pieza, 3/4 taza) y el usuario te pida varios equivalentes, DEBES MULTIPLICAR LA FRACCIÓN matemáticamente.
   - NUNCA dejes la fracción sin resolver (no digas "3/2 tazas" ni "1/2 taza x 3").
   - Muestra el resultado final SIEMPRE como un número entero o con un solo decimal (ej. "1.5 tazas" o "0.6 tazas").
9. CUADRATURA MATEMÁTICA Y NOMBRES CANÓNICOS:
   - Para cada tiempo de comida, Opción A, B y C DEBEN CUBRIR EXACTAMENTE LA MISMA SUMA DE EQUIVALENTES asignados en la tabla por la nutrióloga.
   - En 'smaeGroup', usa los nombres oficiales (ej. "Verdura", "Fruta", "Cereales sin grasa").
10. COHERENCIA ABSOLUTA ENTRE EL NOMBRE DEL PLATILLO Y SUS INGREDIENTES:
   - El título (title) de cada opción DEBE reflejar fiel y exactamente los ingredientes reales asignados a esa opción.
   - NUNCA llames a un platillo 'Omelette', 'Huevos revueltos' o similar si la opción no contiene huevo o claras (por ejemplo, si el ingrediente proteico asignado es pechuga de pollo, el platillo debe titularse 'Pechuga de pollo a la plancha...', 'Fajitas de pollo...', etc., NUNCA 'Omelette').
   - Si el ingrediente es pescado o atún, el título debe reflejar pescado o atún.
   - Si el ingrediente es bistec o res, el título debe reflejar bistec o res.
   - Si el ingrediente es queso o requesón, el título debe reflejar queso o quesadillas.
   - Las instrucciones de preparación culinaria (preparation) deben detallar la preparación de esos mismos ingredientes con total sentido gastronómico.
11. REGLA ESTRICTA DE VARIEDAD (MÁXIMO 2 VECES POR TIEMPO DE COMIDA):
   - En cada tiempo de comida (ej. Desayuno, Comida o Cena), NINGÚN ingrediente o alimento base puede repetirse más de dos veces entre las tres opciones (Opción A, Opción B y Opción C).
   - Si un alimento (ej. tortilla de maíz, huevo, jitomate, pechuga de pollo, aceite de oliva) ya se usó en la Opción A y en la Opción B, ESTÁ PROHIBIDO usarlo una 3ra vez en la Opción C. En la Opción C debes seleccionar otro ingrediente del mismo grupo equivalente del SMAE (ej. arroz, papa, avena o pan integral en lugar de tortilla; calabacita en lugar de jitomate; pescado o claras en lugar de pollo; aguacate o aceitunas en lugar de aceite).
   - Usa los alimentos e ingredientes del SMAE 5ta Edición y sus cantidades exactas multiplicadas por el número de equivalentes.
12. MANEJO DE GRASAS SIN PROTEÍNA ("Aceite sin Proteína"):
   - Si se asignan 2 o más equivalentes de "Aceite sin Proteína" a un tiempo de comida, OBLIGATORIAMENTE DEBES:
     a) Usar UN equivalente (ej. "Aceite de oliva", "Aceite vegetal") EXCLUSIVAMENTE para la preparación/cocción del platillo.
     b) Usar el RESTO de equivalentes como un ingrediente diferente que NO sea aceite (ej. "Crema de vaca", "Aguacate Hass", "Mayonesa").
   - MANTÉN LA COHERENCIA CULINARIA: Si el platillo es un sándwich o similar, y tienes equivalentes de grasa disponibles para ingrediente, usa opciones lógicas y coherentes como "Crema de vaca" o "Mayonesa", NUNCA agregues cucharadas de aceite crudo al pan.
13. USO DE NUEVOS ALIMENTOS (MAZAPÁN, GRANOLA, CEREALES DE CAJA, PANES, PIZZA, PURÉS Y ALMÍBARES): De acuerdo al SMAE y fuentes añadidas:
   - "Azúcares con grasa": PUEDES incluir "Mazapán" o "Mazapán de cacahuate" (1/3 pieza = 1 eq) como postre o snack.
   - "Cereales sin grasa": PUEDES incluir cereales comerciales ("Zucaritas", "Choco Krispis", "Froot Loops" 1/3 taza = 1 eq, o "Corn Flakes" 1/2 taza = 1 eq); o "Pan para hamburguesa" (1/2 pieza = 1 eq) y "Pan para hot dog" (1/2 pieza = 1 eq) para platillos de comida rápida saludable.
   - "Cereales con grasa": PUEDES incluir "Granola natural o con miel" o "Granola baja en grasa" (3 cucharadas = 1 eq), "Puré de papa preparado" (1/2 taza = 1 eq), o "Pizza de queso o tradicional" (2/3 de rebanada = 1 eq).
   - "Frutas": PUEDES incluir "Durazno en almíbar" (2 mitades = 1 eq), "Piña en almíbar" (1 rebanada = 1 eq), "Cóctel de frutas en almíbar" (1/4 taza = 1 eq) o "Puré de manzana" (1/2 taza = 1 eq).
14. EXCLUSIÓN ESTRICTA DE POZOLE: NUNCA sugieras ni incluyas "Pozole" ni "Maíz pozolero / Cacahuazintle" en las opciones generadas automáticamente por IA. Este alimento queda EXCLUSIVAMENTE reservado para adición manual en el buscador por parte del usuario o nutriólogo, o únicamente si el usuario lo solicita explícitamente en sus notas.`;

    let preferencesText = '';
    if (req.body.previousOptionHistory) {
      // Extract titles to avoid passing huge objects
      const historySummary: Record<string, string[]> = {};
      Object.entries(req.body.previousOptionHistory).forEach(([meal, options]: [string, any]) => {
        historySummary[meal] = [];
        if (options.A) options.A.forEach((o: any) => historySummary[meal].push(o.title));
        if (options.B) options.B.forEach((o: any) => historySummary[meal].push(o.title));
        if (options.C) options.C.forEach((o: any) => historySummary[meal].push(o.title));
      });
      preferencesText += `\n\nLISTA DE EXCLUSIONES (MENÚS MOSTRADOS ANTERIORMENTE - ESTRICTAMENTE PROHIBIDO REPETIR):\n${JSON.stringify(historySummary, null, 2)}`;
    }

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

    let data = await generateWithTimeout(
      () =>
        generateWithRetryAndFallback({
          contents: prompt,
          systemInstruction,
          responseSchema: fullMenuResponseSchema,
          temperature: 0.5,
        }),
      45000
    );

    // Rectify generated data rigorously according to SMAE 5th Edition
    data = rectifyFullPlan(data, tableData, req.body.dislikedFoods);

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
    let fallbackData: any = buildFallbackFullPlan(
      req.body.tableData,
      req.body.dietNotes,
      req.body.preferredFoods,
      req.body.dislikedFoods
    );

    // Rectify fallback data rigorously according to SMAE 5th Edition
    fallbackData = rectifyFullPlan(fallbackData, req.body.tableData, req.body.dislikedFoods);

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
2. COHERENCIA CULINARIA HUMANA (ARMONÍA Y SENTIDO COMÚN): Trata que los menús tengan una coherencia lógica y armonía culinaria real entre cada grupo de alimento, como si el platillo fuera pensado y cocinado por una persona (un chef o nutriólogo humano). No mezcles ingredientes al azar o que no combinan.
3. INSPIRACIÓN EN INTERNET Y ADAPTACIÓN ESTRICTA AL SMAE: Busca inspiración en internet de recetas novedosas y sabrosas, pero ajústalas OBLIGATORIAMENTE al número exacto de equivalentes y a los grupos de alimentos del SMAE 5ta Edición indicados.
4. VERIFICACIÓN MINUCIOSA (DOBLE CHEQUEO): Eres extremadamente minucioso. ANTES de mostrar la respuesta, revisa mentalmente y asegúrate de que cada ingrediente corresponda ESTRICTAMENTE al grupo de alimento solicitado y al equivalente dado. Evita errores graves de clasificación (ej. no clasifiques aguacate en frutas ni la papa en verduras).
5. PREFERENCIAS: Incorpora los alimentos preferidos del paciente y EXCLUYE COMPLETAMENTE cualquier alimento no preferido o que deba evitarse.
6. UTILIZA EXCLUSIVAMENTE los alimentos, ingredientes y porciones listados en el SMAE 5ta Edición con sus gramajes exactos.
7. FORMATO DE FRACCIONES Y MULTIPLICACIÓN MATEMÁTICA: Cuando la porción base de un alimento sea una fracción (ej. 1/2, 1/3, 3/4) y debas multiplicarla por el número de equivalentes, resuelve matemáticamente y muestra el resultado OBLIGATORIAMENTE en número entero o con un solo decimal (ej. en lugar de "3/2 tazas" escribe "1.5 tazas"). NUNCA dejes la fracción sin multiplicar.
8. REGLA ESTRICTA DE VARIEDAD (MÁXIMO 2 VECES POR TIEMPO DE COMIDA): En este tiempo de comida, NINGÚN ingrediente o alimento base puede repetirse más de dos veces entre Opción A, B y C. Si un alimento ya está en A y B, en C debe usarse otro alimento del mismo grupo del SMAE.
9. MANEJO DE GRASAS SIN PROTEÍNA ("Aceite sin Proteína"): Si se asignan 2 o más equivalentes a este tiempo de comida, OBLIGATORIAMENTE DEBES usar UN equivalente para la preparación/cocción (ej. Aceite) y el RESTO como un ingrediente diferente y coherente (ej. Crema de vaca, Aguacate, Mayonesa). NUNCA eches aceite crudo como aderezo incongruente (ej. en un sándwich usar crema o mayonesa, no aceite).
10. USO DE NUEVOS ALIMENTOS (MAZAPÁN, GRANOLA, CEREALES DE CAJA, PANES, PIZZA, PURÉS Y ALMÍBARES): De acuerdo al SMAE y fuentes añadidas:
   - "Azúcares con grasa": PUEDES incluir "Mazapán" o "Mazapán de cacahuate" (1/3 pieza = 1 eq) como postre o snack.
   - "Cereales sin grasa": PUEDES incluir cereales comerciales ("Zucaritas", "Choco Krispis", "Froot Loops" 1/3 taza = 1 eq, o "Corn Flakes" 1/2 taza = 1 eq); o "Pan para hamburguesa" (1/2 pieza = 1 eq) y "Pan para hot dog" (1/2 pieza = 1 eq) para platillos de comida rápida saludable.
   - "Cereales con grasa": PUEDES incluir "Granola natural o con miel" o "Granola baja en grasa" (3 cucharadas = 1 eq), "Puré de papa preparado" (1/2 taza = 1 eq), o "Pizza de queso o tradicional" (2/3 de rebanada = 1 eq).
   - "Frutas": PUEDES incluir "Durazno en almíbar" (2 mitades = 1 eq), "Piña en almíbar" (1 rebanada = 1 eq), "Cóctel de frutas en almíbar" (1/4 taza = 1 eq) o "Puré de manzana" (1/2 taza = 1 eq).
11. EXCLUSIÓN ESTRICTA DE POZOLE: NUNCA sugieras ni incluyas "Pozole" ni "Maíz pozolero / Cacahuazintle" en las opciones generadas automáticamente por IA. Este alimento queda EXCLUSIVAMENTE reservado para adición manual en el buscador por parte del usuario o nutriólogo, o únicamente si el usuario lo solicita explícitamente en sus notas.`;

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

    let data = await generateWithTimeout(
      () =>
        generateWithRetryAndFallback({
          contents: prompt,
          systemInstruction,
          responseSchema: mealMenuSchema,
          temperature: 0.5,
        }),
      28000
    );

    // Rectify generated meal against SMAE 5th Edition standards
    data = rectifyMealMenu(data, portions, dislikedFoods);

    // Merge back any kept options selected for printing
    if (keptOptions && Array.isArray(keepLetters)) {
      if (keepLetters.includes('A') && keptOptions.optionA) data.optionA = keptOptions.optionA;
      if (keepLetters.includes('B') && keptOptions.optionB) data.optionB = keptOptions.optionB;
      if (keepLetters.includes('C') && keptOptions.optionC) data.optionC = keptOptions.optionC;
      data = ensureMealVariety(data, dislikedFoods);
    }

    return res.json(data);
  } catch (error: any) {
    console.log('[Gemini] Regeneración por IA saturada temporalmente. Usando motor determinista SMAE de respaldo.');
    let fallbackMeal = buildFallbackMeal(
      req.body.mealName,
      req.body.portions,
      req.body.preferredFoods,
      req.body.dislikedFoods
    );

    fallbackMeal = rectifyMealMenu(fallbackMeal, req.body.portions, req.body.dislikedFoods);

    if (req.body.keptOptions && Array.isArray(req.body.keepLetters)) {
      if (req.body.keepLetters.includes('A') && req.body.keptOptions.optionA) fallbackMeal.optionA = req.body.keptOptions.optionA;
      if (req.body.keepLetters.includes('B') && req.body.keptOptions.optionB) fallbackMeal.optionB = req.body.keptOptions.optionB;
      if (req.body.keepLetters.includes('C') && req.body.keptOptions.optionC) fallbackMeal.optionC = req.body.keptOptions.optionC;
      fallbackMeal = ensureMealVariety(fallbackMeal, req.body.dislikedFoods);
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
2. COHERENCIA CULINARIA HUMANA (ARMONÍA Y SENTIDO COMÚN): Trata que los menús tengan una coherencia lógica y armonía culinaria real entre cada grupo de alimento, como si el platillo fuera pensado y cocinado por una persona (un chef o nutriólogo humano). No mezcles ingredientes al azar o que no combinan.
3. INSPIRACIÓN EN INTERNET Y ADAPTACIÓN ESTRICTA AL SMAE: Busca inspiración en internet de recetas novedosas y sabrosas, pero ajústalas OBLIGATORIAMENTE al número exacto de equivalentes y a los grupos de alimentos del SMAE 5ta Edición indicados.
4. VERIFICACIÓN MINUCIOSA (DOBLE CHEQUEO): Eres extremadamente minucioso. ANTES de mostrar la respuesta, revisa mentalmente y asegúrate de que cada ingrediente corresponda ESTRICTAMENTE al grupo de alimento solicitado y al equivalente dado. Evita errores graves de clasificación (ej. no clasifiques aguacate en frutas ni la papa en verduras).
5. PREFERENCIAS: Incorpora los alimentos preferidos del paciente y EXCLUYE COMPLETAMENTE los alimentos a evitar.
6. UTILIZA EXCLUSIVAMENTE los alimentos, ingredientes y porciones listados en el SMAE 5ta Edición con sus gramajes exactos.
7. FORMATO DE FRACCIONES Y MULTIPLICACIÓN MATEMÁTICA: Cuando la porción base de un alimento sea una fracción (ej. 1/2, 1/3, 3/4) y debas multiplicarla por el número de equivalentes, resuelve matemáticamente y muestra el resultado OBLIGATORIAMENTE en número entero o con un solo decimal (ej. en lugar de "3/2 tazas" escribe "1.5 tazas"). NUNCA dejes la fracción sin multiplicar.
8. COHERENCIA ABSOLUTA ENTRE EL NOMBRE DEL PLATILLO Y SUS INGREDIENTES: El título (title) DEBE reflejar con fidelidad el ingrediente proteico asignado. NUNCA llames a un platillo 'Omelette' si no lleva huevo (si lleva pollo debe llamarse Pechuga de pollo, si lleva res Bistec, etc.).
9. MÁXIMO 2 REPETICIONES: Ningún ingrediente base puede repetirse más de dos veces en las 3 opciones de este tiempo de comida.
10. MANEJO DE GRASAS SIN PROTEÍNA ("Aceite sin Proteína"): Si se asignan 2 o más equivalentes a este tiempo de comida, OBLIGATORIAMENTE DEBES usar UN equivalente para la preparación/cocción (ej. Aceite) y el RESTO como un ingrediente diferente y coherente (ej. Crema de vaca, Aguacate, Mayonesa). NUNCA eches aceite crudo como aderezo incongruente (ej. en un sándwich usar crema o mayonesa, no aceite).
11. USO DE NUEVOS ALIMENTOS (MAZAPÁN, GRANOLA, CEREALES DE CAJA, PANES, PIZZA, PURÉS Y ALMÍBARES): De acuerdo al SMAE y fuentes añadidas:
   - "Azúcares con grasa": PUEDES incluir "Mazapán" o "Mazapán de cacahuate" (1/3 pieza = 1 eq) como postre o snack.
   - "Cereales sin grasa": PUEDES incluir cereales comerciales ("Zucaritas", "Choco Krispis", "Froot Loops" 1/3 taza = 1 eq, o "Corn Flakes" 1/2 taza = 1 eq); o "Pan para hamburguesa" (1/2 pieza = 1 eq) y "Pan para hot dog" (1/2 pieza = 1 eq) para platillos de comida rápida saludable.
   - "Cereales con grasa": PUEDES incluir "Granola natural o con miel" o "Granola baja en grasa" (3 cucharadas = 1 eq), "Puré de papa preparado" (1/2 taza = 1 eq), o "Pizza de queso o tradicional" (2/3 de rebanada = 1 eq).
   - "Frutas": PUEDES incluir "Durazno en almíbar" (2 mitades = 1 eq), "Piña en almíbar" (1 rebanada = 1 eq), "Cóctel de frutas en almíbar" (1/4 taza = 1 eq) o "Puré de manzana" (1/2 taza = 1 eq).
12. EXCLUSIÓN ESTRICTA DE POZOLE: NUNCA sugieras ni incluyas "Pozole" ni "Maíz pozolero / Cacahuazintle" en las opciones generadas automáticamente por IA. Este alimento queda EXCLUSIVAMENTE reservado para adición manual en el buscador por parte del usuario o nutriólogo, o únicamente si el usuario lo solicita explícitamente en sus notas.`;

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

    let optionData = await generateWithTimeout(
      () =>
        generateWithRetryAndFallback({
          contents: prompt,
          systemInstruction,
          responseSchema: singleOptionSchema,
          temperature: 0.5,
        }),
      22000
    );

    // Rectify generated option according to SMAE 5th Edition
    const letter = (optionLetter || 'A').toUpperCase();
    const optIdx = letter === 'B' ? 1 : letter === 'C' ? 2 : 0;
    optionData = rectifyMenuOption(optionData, portions, optIdx, mealName);

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
    const optIdx = letter === 'B' ? 1 : letter === 'C' ? 2 : 0;
    const fallbackOpt = letter === 'B' ? fallbackMeal.optionB : letter === 'C' ? fallbackMeal.optionC : fallbackMeal.optionA;
    const rectifiedOpt = rectifyMenuOption(fallbackOpt, req.body.portions, optIdx, req.body.mealName);
    return res.json({ option: rectifiedOpt, isFallback: true });
  }
});

// Explicit 404 guard for /api/* routes so they NEVER fall through to Vite SPA html
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `Ruta API no encontrada: ${req.method} ${req.originalUrl}` });
});

// Explicit error handler for /api/* routes
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.path.startsWith('/api')) {
    console.error('[API Error]', err);
    return res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
  next(err);
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

import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { buildFallbackFullPlan, buildFallbackMeal } from './src/utils/smaeFallbackEngine';
import { rectifyFullPlan, rectifyMealMenu, rectifyMenuOption, ensureMealVariety } from './src/utils/smaeRectifier';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

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
        title: { type: Type.STRING, description: "Nombre atractivo, descriptivo y congruente del platillo para la Opción C (innovador y diferente a A y B)" },
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
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-3.8-flash',
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
    const maxAttempts = 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[Gemini] Generando con modelo ultrarrápido ${model}...`);
        
        const config: any = {
          systemInstruction: params.systemInstruction,
          temperature: params.temperature ?? 0.35,
          responseMimeType: 'application/json',
          responseSchema: params.responseSchema,
        };

        // Minimal thinking to maximize response speed and avoid UI freezes
        if (model.startsWith('gemini-3')) {
          config.thinkingConfig = {
            thinkingLevel: ThinkingLevel.MINIMAL,
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

        console.log(`[Gemini] Generación exitosa con ${model}.`);
        return JSON.parse(text);
      } catch (err: any) {
        lastError = err;
        console.log(`[Gemini] Modelo ${model} no respondió de inmediato, alternando al siguiente...`);
        break;
      }
    }
  }

  throw lastError || new Error('No fue posible generar el menú con los modelos disponibles.');
}

// API Endpoint to generate all 5 meals
app.post('/api/generate-menus', async (req, res) => {
  try {
    const { tableData, patientName, dietNotes, preferredFoods, dislikedFoods, mealPreferences, proteinSupplement, manualNutrientEntry } = req.body;

    if (!tableData || typeof tableData !== 'object') {
      return res.status(400).json({ error: 'tableData es requerido' });
    }

    const systemInstruction = `Eres un nutriólogo clínico especialista de primer nivel en el Sistema Mexicano de Alimentos Equivalentes (SMAE 5ta Edición).
Tu labor es recibir la distribución de equivalentes por tiempo de comida calculada por una nutrióloga clínica y transformarla en menús extraordinariamente variados, deliciosos, apetecibles, económicos y con auténtica cocina mexicana cotidiana y saludable.

DEBES GENERAR OBLIGATORIAMENTE TRES OPCIONES COMPLETAS (Opción A, Opción B y Opción C) PARA CADA TIEMPO DE COMIDA QUE TENGA EQUIVALENTES ASIGNADOS.
NOTA CRÍTICA: Se generan EXACTAMENTE 3 OPCIONES (A, B y C). La opción D ha sido eliminada por solicitud del usuario.

REGLA DE ORO DE CONGRUENCIA CULINARIA (TÍTULO VS INGREDIENTES):
- El título del platillo DEBE corresponder 100% a los alimentos reales presentes en la lista de ingredientes del menú:
  * Si la receta NO tiene huevo o claras, JAMÁS debe titularse "Omelette", "Huevos revueltos", "Frittata" o similar.
  * Si la receta NO contiene pollo o pechuga, JAMÁS debe titularse "Pechuga de pollo", "Pollo al comal", etc.
  * Si la receta NO contiene res o bistec, JAMÁS debe titularse "Bistec", "Carne asada", "Fajitas de res", etc.
  * Si la receta NO contiene pescado o atún, JAMÁS debe titularse "Filete de pescado", "Salmón", "Atún", etc.
  * Si la receta NO contiene pan de caja o bolillo, JAMÁS debe titularse "Sándwich", "Torta" o "Pan tostado".
  * Si la receta NO contiene queso y tortillas, JAMÁS debe titularse "Quesadillas" o "Sincronizada".
  * Si la receta NO contiene avena, JAMÁS debe titularse "Avena", "Porridge" o similar.
- El título debe ser atractivo, específico y apetecible mencionando la preparación y los alimentos protagonistas reales:
  Ejemplos excelentes:
  * "Filete de Tilapia al Limón con Calabacitas Salteadas y Arroz al Vapor"
  * "Tostadas Horneadas con Salpicón de Pechuga de Pollo y Nopales"
  * "Bistec de Res Magro en Salsa Verde con Nopales Asados y Tortillas de Maíz"
  * "Claras de Huevo Revueltas con Espinacas, Frijoles de la Olla y Tortillas"
  * "Bowl de Avena Integral Cocida con Manzana en Gajos y Almendras Tostadas"
  * "Quesadillas Comaleadas de Queso Oaxaca con Flor de Calabaza y Salsa Casera"
  * "Sopa Tradicional de Lentejas con Zanahorias, Espinacas y Arroz Blanco"

CATÁLOGO EXTENSO DE ALIMENTOS DEL SMAE 5TA EDICIÓN PARA MÁXIMA VARIEDAD:
Aprovecha la inmensa variedad del SMAE 5ta edición mexicano. Rota ampliamente los alimentos entre tiempos de comida y opciones:
- Verduras: Nopales cocidos, calabacitas tiernas, chayote al vapor, flor de calabaza, espinacas cocidas o frescas, acelgas, verdolagas, huitlacoche, pimiento morrón en tiras, jitomate bola o guajillo, tomatillo verde con chile, ejotes tiernos, champiñones rebanados, setas asadas, espárragos al vapor, brócoli, coliflor, pepino con cáscara, jícama en tiras, apio picado, lechuga romana/orejona, betabel rallado, zanahoria cocida o rallada, germinado de alfalfa.
- Frutas: Papaya picada, melón verde o valenciano, sandía fresca, fresas rebanadas, zarzamoras, moras azules, frambuesas, manzana roja o verde en gajos, pera fresca, plátano dominico, durazno fresco o en mitades, ciruela roja, guayaba en cuartos, kiwi rebanado, toronja en supremas, naranja en gajos, mandarina, piña fresca picada, mango en cubos, higo fresco, uvas rojas o verdes.
- Cereales sin grasa: Tortilla de maíz nixtamalizada comaleada (1 pza = 30g), arroz blanco o integral cocido al vapor (1/3 tza = 48g), papa cocida o al vapor con cáscara (1/2 pza mediana = 90g), camote horneado (1/3 pza = 50g), elote blanco cocido desgranado (1/2 tza = 83g), avena integral en hojuelas cruda o cocida (1/3 tza = 20g), quinoa cocida (1/3 tza = 62g), tostadas horneadas de maíz sin freír tipo Saníssimo (2 pzas = 24g), pasta integral cocida (1/3 tza = 47g), pan integral de caja (1 rebanada = 25g), bolillo o telera sin migajón (1/2 pza = 30g).
- Cereales con grasa: Granola de avena con miel (3 cdas = 20g), galleta de avena casera con pasas (1 pza pequeña = 25g), barra de amaranto con chocolate/cacao (1 pza = 20g), puré de papa preparado con mantequilla y leche (1/2 tza = 100g), totopos horneados/fritos (6 pzas = 15g), tamal tradicional de pollo o queso (1/4 pza = 45g), pan dulce tradicional (1/3 pza = 25g).
- Leguminosas: Frijoles negros enteros o machacados de la olla (1/2 tza = 86g), frijoles bayos cocidos (1/2 tza = 86g), lentejas cocidas con recaudo casero (1/2 tza = 99g), garbanzos cocidos salteados con pimentón (1/2 tza = 82g), habas tiernas cocidas (1/2 tza = 85g), alubias cocidas (1/2 tza = 90g), soya texturizada cocida (1/3 tza = 50g).
- AOA Muy bajo aporte de grasa: Pechuga de pollo deshebrada o a la plancha sin piel (30g cocido), filete de pescado blanco (tilapia, merluza, lenguado, robalo) (40g cocido), atún en agua drenado bajo en sodio (1/3 lata = 40g), claras de huevo cocidas (2 piezas = 66g), camarón cocido al vapor (5 pzas medianas = 35g), salmón fresco cocido (30g), pulpo o calamar cocido (35g).
- AOA Bajo aporte de grasa: Queso panela fresco en cubos (40g), requesón artesanal descremado (3 cdas = 45g), bistec de res magro a la plancha (30g cocido), lomo de cerdo magro asado (30g cocido), jamón de pechuga de pavo bajo en sodio (2 rebanadas = 42g), falda de res magra deshebrada (30g cocido).
- AOA Moderado aporte de grasa: Huevo entero cocido o revuelto (1 pza = 50g), queso Oaxaca artesanal deshebrado (30g), queso fresco de rancho o canasto en cubos (35g), queso cotija molido (20g), sardina en salsa de jitomate (30g), salchicha de pavo cocida (1 pza = 45g).
- AOA Alto aporte de grasa: Queso manchego artesanal (25g), queso gouda en láminas (25g), queso amarillo (1 rebanada = 25g).
- Leches: Leche descremada (1 tza = 240ml), yogur natural descremado sin azúcar (3/4 tza = 150g), kéfir natural descremado (3/4 tza = 180ml), yogur griego descremado natural (4 cdas = 100g), leche semidescremada (1 tza = 240ml), leche entera (1 tza = 240ml).
- Aceites con proteína (Oleaginosas y semillas - 70 kcal, 3g Prot, 5g Líp): Almendras enteras o fileteadas (10 pzas = 12g), nuez pecana en mitades/trozos (3 pzas = 12g), cacahuates tostados sin sal (14 pzas = 14g), pepitas de calabaza tostadas (2 cditas = 10g), semillas de chía o linaza molida (2 cditas = 10g), ajonjolí tostado (1.5 cdas = 11g), pistaches sin cáscara (18 pzas = 15g), crema de cacahuate o almendra 100% natural sin azúcar (2 cditas = 10g).
  ¡PROHIBIDO poner en este grupo aceites líquidos o aguacate! Deben usarse como TOPPING crujiente para coronar avena, fruta, ensaladas o yogur; NUNCA para cocinar o freír.
- Aceites sin proteína (Grasas puras - 45 kcal, 0g Prot, 5g Líp): Aceite de oliva extra virgen (1 cdita = 5ml), aceite vegetal para cocinar (1 cdita = 5ml), aguacate Hass en rebanadas cremosas (1/3 pza = 45g), aceitunas verdes o negras (6 pzas = 30g), crema de vaca fresca (1 cda = 15g), mayonesa reducida en grasa (1 cda = 15g), mantequilla pura (1.5 cditas = 8g).
  ¡PROHIBIDO poner aquí nueces o semillas! Si se usa para cocinar, nombrarlo como "(para cocinar / en la preparación)".
- Azúcares sin grasa (40 kcal, 0g Prot, 0g Líp, 10g HCO): Miel de abeja pura mexicana (2 cditas = 10g), mermelada de fruta casera (2.5 cditas = 15g), azúcar mascabado o morena (2 cditas = 10g), gelatina baja en azúcar (1/3 tza = 80g). ¡PROHIBIDO poner aquí chocolates, helado o pasteles!
- Azúcares con grasa (85 kcal, 0g Prot, 5g Líp, 10g HCO): Chocolate amargo 70-85% cacao (1 cuadrito = 15g), nutella o crema de avellana con cacao (2 cditas = 10g), mazapán tradicional de cacahuate (1/3 pza = 10g), nieve o helado de crema (1/3 tza = 50g), pastelito casero o galletas con relleno (1 pieza chica).
- Embutidos y carnes procesadas (Jamón de pavo, jamón de pierna, salchicha, etc.): Son ALIMENTOS DE ORIGEN ANIMAL (AOA bajo/moderado aporte de grasa). ¡TERMINANTEMENTE PROHIBIDO considerarlos libre/sazón o verdura!

REGLA ESTRICTA DE EXCLUSIÓN TOTAL: EVITAR TOTALMENTE LAS SEMILLAS DE GIRASOL (PIPAS):
- Queda TERMINANTEMENTE PROHIBIDO incluir semillas de girasol, pipas de girasol o cualquier ingrediente derivado de semillas de girasol en ningún menú, ingrediente o preparación.
- Para el grupo de aceites con proteína (oleaginosas), utiliza exclusivamente almendras, nueces, cacahuates, pepitas de calabaza, chía, ajonjolí o pistaches. NUNCA semillas de girasol.

REGLA ESTRICTA: EVITAR AL MÁXIMO EL USO DE AJO Y PILONCILLO:
- A menos que el paciente lo pida explícitamente en sus alimentos favoritos, NO utilices ajo, dientes de ajo ni piloncillo en ningún menú, ingrediente o preparación.
- Para sazonar de forma libre y natural utiliza hierbas aromáticas mexicanas frescas (cilantro, epazote, orégano, perejil, laurel, tomillo, comino, pimienta negra o jugo de limón fresco).
- Para endulzar utiliza miel de abeja pura, mermelada de fruta sin azúcar, fruta madura o extracto de vainilla. NUNCA piloncillo.

CONGRUENCIA CULINARIA ESTRICTA POR TIEMPO DE COMIDA:
- Desayuno: Alimentos matutinos típicos mexicanos (huevos revueltos o estrellados, claras con vegetales, queso panela asado, requesón, frijoles refritos o de la olla, tortillas de maíz, pan tostado, avena cocida con canela, fruta fresca picada como papaya, melón, manzana o fresas, café con leche o yogur). Evitar cortes pesados de carne o pescado en el desayuno.
- Colación Matutina (Colación 1): Refrigerio fresco, ligero y energizante (frutas frescas como manzana, fresas, moras, kiwi, mandarina; yogur griego, queso cottage, requesón con canela; frutos secos y semillas como almendras o nueces; bastones de jícama o pepino con limón). NUNCA guisados calientes ni carnes pesadas en colaciones.
- Comida (Almuerzo principal): Platillo fuerte tradicional mexicano caliente y sustancioso (pechuga de pollo en guisado o a la plancha, filete de pescado al cilantro o empapelado, bistec de res magro, falda deshebrada, lomo de cerdo, sopa de lentejas o frijoles de la olla, arroz al vapor, papas cocidas, ensalada fresca, nopales, calabacitas).
- Colación Vespertina (Colación 2): Snack saciante para evitar hambre nocturna (frutas frescas con semillas, pepino y jícama con limón y chile piquín, tostadas horneadas con requesón, yogur bebible natural).
- Cena: Preparación ligera, reconfortante y de fácil digestión (queso panela al comal, sincronizadas ligeras de maíz con espinacas, tostadas horneadas con atún preparado o salpicón ligero de pollo, claras con champiñones, pan integral con requesón y aguacate). Evitar carnes rojas pesadas o frituras.

ROTACIÓN Y DIVERSIDAD OBLIGATORIA ENTRE LAS 3 OPCIONES:
- Opción A: Tradicional casera nutritiva al comal o en guisado ligero mexicano.
- Opción B: Opción fresca, ensalada, bowl saludable o preparación práctica de rápida elaboración.
- Opción C: Opción creativa, sandwich gourmet saludable, tostadas horneadas o combinación innovadora con técnica culinaria diferenciada.
- NUNCA repitas el mismo ingrediente proteico principal (ej. pollo en A y pollo en B está TERMINANTEMENTE PROHIBIDO).
- Rota cereales y verduras entre las 3 opciones para dar al paciente una experiencia gastronómica rica y estimulante.
- Si se prescriben 2 o más equivalentes de Aceite sin Proteína: usa 1 eq para la cocción (aceite) y el resto como ingrediente de mesa delicioso (aguacate Hass, crema fresca o aceitunas). Nunca añadas aceite crudo a platillos donde no armoniza.
- Multiplica la porción por el número de equivalentes asignados con exactitud de SMAE 5ta edición.`;

    let preferencesText = '';
    if (req.body.previousOptionHistory) {
      const historySummary: Record<string, string[]> = {};
      Object.entries(req.body.previousOptionHistory).forEach(([meal, options]: [string, any]) => {
        historySummary[meal] = [];
        if (options.A) options.A.forEach((o: any) => historySummary[meal].push(o.title));
        if (options.B) options.B.forEach((o: any) => historySummary[meal].push(o.title));
        if (options.C) options.C.forEach((o: any) => historySummary[meal].push(o.title));
      });
      preferencesText += `\n\nLISTA DE EXCLUSIONES (MENÚS MOSTRADOS ANTERIORMENTE - ESTRICTAMENTE PROHIBIDO REPETIR):\n${JSON.stringify(historySummary, null, 2)}`;
    }

    // Directiva de suplementación de proteína de suero de leche (Whey Protein)
    const timingMap: Record<string, string> = {
      desayuno: 'Desayuno',
      colacion1: 'Colación 1',
      comida: 'Comida',
      colacion2: 'Colación 2',
      cena: 'Cena',
      any: 'Colación 2',
    };
    const proteinTiming = proteinSupplement?.timing || 'colacion2';
    const targetProteinMeal = timingMap[proteinTiming] || 'Colación 2';

    let proteinPromptText = '';
    if (proteinSupplement?.enabled && proteinSupplement?.includeInMenu) {
      const scoops = proteinSupplement.scoops || 1;
      const brand = proteinSupplement.brandOrType || 'Proteína de suero de leche (Whey Protein)';
      const pGrams = proteinSupplement.totalProteinGrams || (scoops * (proteinSupplement.proteinGramsPerServing || 25));
      const eqCount = Number((pGrams / 7).toFixed(1));

      proteinPromptText = `\n\n═════════════════════════════════════════════════════════════════════════
🥛 SUPLEMENTO DE PROTEÍNA DE SUERO DE LECHE (WHEY PROTEIN) - CONTABILIZACIÓN E INTEGRACIÓN OBLIGATORIA:
El paciente tiene prescrito suero de leche que DEBES contabilizar e incorporar obligatoriamente en el menú generado:
• Producto: ${brand}
• Cantidad / Dosis: ${scoops} medida(s) (scoop) (${pGrams}g de proteína neta pura, ~${pGrams * 4} kcal)
• Equivalencia clínica SMAE: ${eqCount} equivalentes de Alimento de origen animal muy bajo aporte de grasa
• Tiempo de comida asignado para tomarla: ${targetProteinMeal}

INSTRUCCIÓN OBLIGATORIA PARA ${targetProteinMeal.toUpperCase()}:
En las 3 opciones (Opción A, Opción B y Opción C) del tiempo de comida "${targetProteinMeal}", DEBES incluir este suplemento en la lista de ingredientes:
  - foodName: "${brand}"
  - exactPortion: "${scoops} ${scoops === 1 ? 'medida (scoop)' : 'medidas (scoops)'} (${Math.round(scoops * 30)}g polvo con ${pGrams}g proteína)"
  - smaeGroup: "Alimento de origen animal muy bajo aporte de grasa"
  - equivalentsCount: ${eqCount}
En la preparación culinaria de las opciones de ${targetProteinMeal}, explica detalladamente cómo incorporarlo (ej. batido en shaker con agua fresca o leche descremada, licuado cremoso post-entreno con la fruta del tiempo, o mezclado suavemente en un bowl de avena cocida).
═════════════════════════════════════════════════════════════════════════`;
    }

    // Directiva de aporte manual de nutrientes si está seleccionado para incluirse en el menú
    let manualNutrientPromptText = '';
    if (manualNutrientEntry?.enabled && manualNutrientEntry?.includeInMenu) {
      const pGrams = Number(manualNutrientEntry.proteinGrams) || 0;
      const directKcal = Number(manualNutrientEntry.kcal) || 0;
      const lGrams = Number(manualNutrientEntry.lipidsGrams) || 0;
      const cGrams = Number(manualNutrientEntry.carbsGrams) || 0;
      const totalKcal = directKcal > 0 ? directKcal : (pGrams * 4 + lGrams * 9 + cGrams * 4);
      const name = manualNutrientEntry.name?.trim() || (pGrams > 0 ? 'Aporte manual / Suplemento de proteína' : 'Aporte nutricional manual');
      const targetMeal = timingMap[manualNutrientEntry.timing || 'colacion2'] || 'Colación 2';
      const eqCount = pGrams > 0 ? Number((pGrams / 7).toFixed(1)) : 1;

      manualNutrientPromptText = `\n\n═════════════════════════════════════════════════════════════════════════
📊 APORTE MANUAL DE NUTRIENTES - CONTABILIZACIÓN E INTEGRACIÓN EN EL MENÚ:
El usuario ingresó un aporte manual que DEBES contabilizar e incorporar en el menú:
• Identificador: ${name}
• Aporte neto: ${pGrams}g Proteína, ${totalKcal} kcal, ${lGrams}g Lípidos/Grasas, ${cGrams}g Carbohidratos
• Tiempo de comida asignado: ${targetMeal}

INSTRUCCIÓN OBLIGATORIA PARA ${targetMeal.toUpperCase()}:
En las 3 opciones (A, B y C) de "${targetMeal}", añade este aporte en la lista de ingredientes:
  - foodName: "${name}"
  - exactPortion: "${pGrams > 0 ? `${pGrams}g proteína, ` : ''}${totalKcal} kcal (${lGrams}g grasa, ${cGrams}g HC)"
  - smaeGroup: "${pGrams > 0 ? 'Alimento de origen animal muy bajo aporte de grasa' : 'Otros'}"
  - equivalentsCount: ${eqCount}
═════════════════════════════════════════════════════════════════════════`;
    }

    // Énfasis de máxima prioridad en alimentos preferidos y alimentos a evitar
    let strictEmphasisText = '';
    if (dislikedFoods || preferredFoods) {
      strictEmphasisText = `\n\n═════════════════════════════════════════════════════════════════════════
🚨 ÉNFASIS CLÍNICO ESTRICTO - PREFERENCIAS Y ALIMENTOS A EVITAR:
1. ALIMENTOS A EVITAR / ALERGIAS (CERO TOLERANCIA / EXCLUSIÓN TOTAL AL 100%):
   ${dislikedFoods ? `ESTRICTAMENTE PROHIBIDO incluir: "${dislikedFoods}".
   BAJO NINGUNA CIRCUNSTANCIA incluyas estos alimentos, ingredientes derivados, salsas o guarniciones con ellos en ninguna opción A, B o C. La seguridad y apego del paciente exigen exclusión 100% estricta e inviolable.` : 'No se indicaron alimentos a evitar.'}

2. ALIMENTOS PREFERIDOS DEL PACIENTE (MÁXIMA PRIORIDAD Y PROTAGONISMO):
   ${preferredFoods ? `ALTA PRIORIDAD: Integra de forma protagónica, deliciosa y apetecible los alimentos favoritos del paciente ("${preferredFoods}") en las recetas generadas.` : 'Variedad gastronómica estándar SMAE.'}
═════════════════════════════════════════════════════════════════════════`;
    }

    if (preferredFoods) {
      preferencesText += `\nALIMENTOS PREFERIDOS / FAVORITOS DEL PACIENTE: ${preferredFoods}`;
    }
    if (dislikedFoods) {
      preferencesText += `\nALIMENTOS NO PREFERIDOS / AVERSIONES DEL PACIENTE: ${dislikedFoods}`;
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
NOTAS / INDICACIONES CLÍNICAS: ${dietNotes ? dietNotes : 'Menús variados, deliciosos, fáciles de preparar, sin repeticiones y estrictamente congruentes entre título y equivalentes.'}
${preferencesText}
${strictEmphasisText}
${proteinPromptText}
${manualNutrientPromptText}

TABLA DE EQUIVALENTES SMAE:
${JSON.stringify(tableData, null, 2)}

Por favor genera las 3 OPCIONES COMPLETAS (Opción A, Opción B y Opción C) para cada uno de los tiempos de comida que tengan equivalentes asignados, garantizando máxima variedad gastronómica del SMAE 5ta edición, congruencia total entre títulos e ingredientes, respeto absoluto a las preferencias/exclusiones y contabilización del suplemento o aporte manual si fue indicado.`;

    let data = await generateWithTimeout(
      () =>
        generateWithRetryAndFallback({
          contents: prompt,
          systemInstruction,
          responseSchema: fullMenuResponseSchema,
          temperature: 0.4,
        }),
      16000
    );

    // Rectify generated data rigorously according to SMAE 5th Edition
    data = rectifyFullPlan(
      data,
      tableData,
      req.body.dislikedFoods,
      req.body.preferredFoods,
      req.body.mealPreferences,
      proteinSupplement,
      manualNutrientEntry
    );

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
      req.body.dislikedFoods,
      req.body.mealPreferences,
      req.body.proteinSupplement,
      req.body.manualNutrientEntry
    );

    // Rectify fallback data rigorously according to SMAE 5th Edition
    fallbackData = rectifyFullPlan(
      fallbackData,
      req.body.tableData,
      req.body.dislikedFoods,
      req.body.preferredFoods,
      req.body.mealPreferences,
      req.body.proteinSupplement,
      req.body.manualNutrientEntry
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

// API Endpoint to regenerate a single meal (3 options A, B, C)
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
      proteinSupplement,
      manualNutrientEntry,
    } = req.body;

    if (!mealName || !portions) {
      return res.status(400).json({ error: 'mealName y portions son requeridos' });
    }

    let keptInstruction = '';
    if (Array.isArray(keepLetters) && keepLetters.length > 0) {
      keptInstruction = `\nNOTA ESPECIAL: El paciente ya seleccionó para imprimir la(s) Opción(es) ${keepLetters.join(', ')}. Genera opciones totalmente novedosas, variadas y diferentes para las opciones restantes sin duplicar alimentos ni recetas.`;
    }

    // Directiva de suplemento si aplica a este tiempo de comida
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
    const curKey = mealKeyMap[mealName.toLowerCase()] || mealName.toLowerCase();
    const timing = proteinSupplement?.timing || 'colacion2';
    const isTargetProteinMeal = proteinSupplement?.enabled && proteinSupplement?.includeInMenu && (timing === 'any' ? curKey === 'colacion2' : curKey === timing);

    let mealProteinPrompt = '';
    if (isTargetProteinMeal) {
      const scoops = proteinSupplement.scoops || 1;
      const brand = proteinSupplement.brandOrType || 'Proteína de suero de leche (Whey Protein)';
      const pGrams = proteinSupplement.totalProteinGrams || (scoops * (proteinSupplement.proteinGramsPerServing || 25));
      const eqCount = Number((pGrams / 7).toFixed(1));
      mealProteinPrompt = `\n\n🥛 INTEGRACIÓN OBLIGATORIA DEL SUPLEMENTO (${brand}):
En las opciones generadas para ${mealName}, DEBES incluir como ingrediente:
- ${brand}: ${scoops} medida (${Math.round(scoops * 30)}g polvo con ${pGrams}g proteína, eq: ${eqCount} de AOA MBAG).
En la preparación explica cómo disolverla o licuarla adecuadamente.`;
    }

    const manualTiming = manualNutrientEntry?.timing || 'colacion2';
    const isTargetManualMeal = manualNutrientEntry?.enabled && manualNutrientEntry?.includeInMenu && (manualTiming === 'any' ? curKey === 'colacion2' : curKey === manualTiming);

    let mealManualPrompt = '';
    if (isTargetManualMeal) {
      const pGrams = Number(manualNutrientEntry.proteinGrams) || 0;
      const directKcal = Number(manualNutrientEntry.kcal) || 0;
      const lGrams = Number(manualNutrientEntry.lipidsGrams) || 0;
      const cGrams = Number(manualNutrientEntry.carbsGrams) || 0;
      const totalKcal = directKcal > 0 ? directKcal : (pGrams * 4 + lGrams * 9 + cGrams * 4);
      const name = manualNutrientEntry.name?.trim() || (pGrams > 0 ? 'Aporte manual / Suplemento de proteína' : 'Aporte nutricional manual');
      const eqCount = pGrams > 0 ? Number((pGrams / 7).toFixed(1)) : 1;

      mealManualPrompt = `\n\n📊 APORTE MANUAL DE NUTRIENTES - INTEGRACIÓN OBLIGATORIA (${name}):
En las opciones generadas para ${mealName}, DEBES incluir como ingrediente:
- ${name}: ${pGrams > 0 ? `${pGrams}g proteína, ` : ''}${totalKcal} kcal (${lGrams}g grasa, ${cGrams}g HC, eq: ${eqCount}).
En la preparación culinaria explica cómo incorporarlo adecuadamente al menú.`;
    }

    const systemInstruction = `Eres un nutriólogo experto mexicano de alta especialidad en el Sistema Mexicano de Alimentos Equivalentes (SMAE 5ta Edición).
Genera 3 OPCIONES TOTALMENTE NUEVAS, CREATIVAS Y VARIADAS (Opción A, Opción B y Opción C) para el tiempo de comida "${mealName}" cumpliendo estrictamente con las porciones y gramajes de SMAE 5ta edición asignados.
${keptInstruction}

REGLAS DE ORO:
1. CONGRUENCIA ENTRE TÍTULO E INGREDIENTES: El título debe reflejar con total exactitud los alimentos principales del platillo. No llames "Omelette" si no tiene huevo; no llames "Pechuga" si no tiene pollo; no llames "Sándwich" si no tiene pan; no llames "Quesadilla" si no tiene queso y tortilla.
2. ROTACIÓN Y VARIEDAD SMAE:
   - Opción A: Tradicional casera nutritiva al comal o en salsa ligera.
   - Opción B: Opción fresca, ensalada, bowl o preparación práctica.
   - Opción C: Opción creativa, sándwich gourmet saludable o tostadas horneadas.
   - Cada opción debe tener un ingrediente proteico y técnica culinaria diferente.
3. DISTINCIÓN EXACTA DE GRUPOS SMAE:
   - "Aceites con proteína": Oleaginosas y semillas (Almendras, nuez, cacahuates, pepitas, chía, ajonjolí, pistaches, crema de cacahuate sin azúcar). NUNCA aceites líquidos ni aguacate. Deben usarse como TOPPING crujiente para coronar avena, fruta, ensaladas o yogur; NUNCA para cocinar o freír.
   - "Aceite sin Proteína": Aceite de oliva, vegetal, aguacate Hass, aceitunas, crema, mayonesa, mantequilla. NUNCA nueces ni semillas. Si es para cocinar, nombrarlo como "(para cocinar / en la preparación)".
   - "Azúcares sin grasa": Miel de abeja pura, mermelada, azúcar mascabado, gelatina. NUNCA chocolates, nieve de crema ni pastel.
   - "Azúcares con grasa": Chocolate amargo, con leche, nutella, pastelito, helado de crema, mazapán.
   - "Jamón y derivados cárnicos": Son AOA (Alimento de Origen Animal), NUNCA sazón ni libre ni verdura.
   - "Cereales con grasa": Granola, galleta de avena casera, puré de papa con mantequilla, pan dulce.
   - "Cereales sin grasa": Tortilla de maíz, arroz al vapor, papa cocida o al vapor con piel, avena en hojuelas, pan integral, tostadas horneadas.
4. REGLA ESTRICTA DE EXCLUSIÓN TOTAL: EVITAR TOTALMENTE LAS SEMILLAS DE GIRASOL (PIPAS):
   - Queda TERMINANTEMENTE PROHIBIDO incluir semillas de girasol ni pipas. Utiliza almendras, nueces, cacahuates, pepitas de calabaza, chía, ajonjolí o pistaches.
5. REGLA ESTRICTA: EVITAR AL MÁXIMO EL USO DE AJO Y PILONCILLO:
   - A menos que el paciente lo pida explícitamente en sus alimentos favoritos, NO utilices ajo, dientes de ajo ni piloncillo en ningún menú, ingrediente o preparación.
   - Para sazonar utiliza hierbas aromáticas mexicanas frescas (cilantro, epazote, orégano, perejil, laurel, tomillo, comino, pimienta o jugo de limón).
   - Para endulzar utiliza miel de abeja pura, mermelada sin azúcar, fruta natural madura o extracto de vainilla. NUNCA piloncillo.
6. CONGRUENCIA CULINARIA POR TIEMPO DE COMIDA (${mealName}):
   - Asegura total armonía de ingredientes y preparaciones según el tiempo de comida (ej. desayunos matutinos tradicionales con huevo/panela/avena; colaciones frescas con fruta/yogur/oleaginosas/bastones de verdura con limón; comidas con guisados calientes, arroz, leguminosas y ensaladas; cenas ligeras y digestivas al comal).
7. COHERENCIA CULINARIA Y EN SUS INGREDIENTES: Platillos armónicos, apetecibles y saludables de la cocina cotidiana mexicana donde los ingredientes se combinan con sentido gastronómico real y los títulos reflejan exactamente los ingredientes.`;

    let specificPrefsText = '';
    if (preferredFoods) specificPrefsText += `\nAlimentos preferidos generales: ${preferredFoods}`;
    if (dislikedFoods) specificPrefsText += `\nAlimentos no preferidos / a evitar: ${dislikedFoods}`;
    if (specificPreferences && (specificPreferences.likes || specificPreferences.dislikes)) {
      specificPrefsText += `\nPreferencias específicas para ${mealName}: Preferidos (${specificPreferences.likes || 'N/A'}) | Evitar (${specificPreferences.dislikes || 'N/A'})`;
    }

    const prompt = `Genera 3 opciones de menú (Opción A, Opción B y Opción C) para ${mealName}.
Equivalentes asignados:
${JSON.stringify(portions, null, 2)}

Notas: ${dietNotes || 'Alta variedad gastronómica, platillo creativo mexicano, saludable y apetecible.'}${specificPrefsText}${mealProteinPrompt}${mealManualPrompt}`;

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
    data = rectifyMealMenu(data, portions, dislikedFoods, preferredFoods, proteinSupplement, manualNutrientEntry);

    // Merge back any kept options selected for printing
    if (keptOptions && Array.isArray(keepLetters)) {
      if (keepLetters.includes('A') && keptOptions.optionA) data.optionA = keptOptions.optionA;
      if (keepLetters.includes('B') && keptOptions.optionB) data.optionB = keptOptions.optionB;
      if (keepLetters.includes('C') && keptOptions.optionC) data.optionC = keptOptions.optionC;
      data = ensureMealVariety(data, dislikedFoods, preferredFoods);
    }

    return res.json(data);
  } catch (error: any) {
    console.log('[Gemini] Regeneración por IA saturada temporalmente. Usando motor determinista SMAE de respaldo.');
    let fallbackMeal = buildFallbackMeal(
      req.body.mealName,
      req.body.portions,
      req.body.preferredFoods,
      req.body.dislikedFoods,
      0,
      undefined,
      req.body.proteinSupplement,
      req.body.manualNutrientEntry
    );

    fallbackMeal = rectifyMealMenu(
      fallbackMeal,
      req.body.portions,
      req.body.dislikedFoods,
      req.body.preferredFoods,
      req.body.proteinSupplement,
      req.body.manualNutrientEntry
    );

    if (req.body.keptOptions && Array.isArray(req.body.keepLetters)) {
      if (req.body.keepLetters.includes('A') && req.body.keptOptions.optionA) fallbackMeal.optionA = req.body.keptOptions.optionA;
      if (req.body.keepLetters.includes('B') && req.body.keptOptions.optionB) fallbackMeal.optionB = req.body.keptOptions.optionB;
      if (req.body.keepLetters.includes('C') && req.body.keptOptions.optionC) fallbackMeal.optionC = req.body.keptOptions.optionC;
      fallbackMeal = ensureMealVariety(fallbackMeal, req.body.dislikedFoods, req.body.preferredFoods);
    }

    return res.json(fallbackMeal);
  }
});

// API Endpoint to regenerate a single specific option (Opción A, B o C)
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
      proteinSupplement,
      manualNutrientEntry,
    } = req.body;

    if (!mealName || !portions || !optionLetter) {
      return res.status(400).json({ error: 'mealName, portions y optionLetter son requeridos' });
    }

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
    const curKey = mealKeyMap[mealName.toLowerCase()] || mealName.toLowerCase();

    const timing = proteinSupplement?.timing || 'colacion2';
    const isTargetProteinMeal = proteinSupplement?.enabled && proteinSupplement?.includeInMenu && (timing === 'any' ? curKey === 'colacion2' : curKey === timing);

    let mealProteinPrompt = '';
    if (isTargetProteinMeal) {
      const scoops = proteinSupplement.scoops || 1;
      const brand = proteinSupplement.brandOrType || 'Proteína de suero de leche (Whey Protein)';
      const pGrams = proteinSupplement.totalProteinGrams || (scoops * (proteinSupplement.proteinGramsPerServing || 25));
      const eqCount = Number((pGrams / 7).toFixed(1));
      mealProteinPrompt = `\n\n🥛 INTEGRACIÓN OBLIGATORIA DEL SUPLEMENTO (${brand}):
En la Opción ${optionLetter} de ${mealName}, DEBES incluir como ingrediente:
- ${brand}: ${scoops} medida (${Math.round(scoops * 30)}g polvo con ${pGrams}g proteína, eq: ${eqCount} de AOA MBAG).
En la preparación explica cómo disolverla o incorporarla.`;
    }

    const manualTiming = manualNutrientEntry?.timing || 'colacion2';
    const isTargetManualMeal = manualNutrientEntry?.enabled && manualNutrientEntry?.includeInMenu && (manualTiming === 'any' ? curKey === 'colacion2' : curKey === manualTiming);

    let mealManualPrompt = '';
    if (isTargetManualMeal) {
      const pGrams = Number(manualNutrientEntry.proteinGrams) || 0;
      const directKcal = Number(manualNutrientEntry.kcal) || 0;
      const lGrams = Number(manualNutrientEntry.lipidsGrams) || 0;
      const cGrams = Number(manualNutrientEntry.carbsGrams) || 0;
      const totalKcal = directKcal > 0 ? directKcal : (pGrams * 4 + lGrams * 9 + cGrams * 4);
      const name = manualNutrientEntry.name?.trim() || (pGrams > 0 ? 'Aporte manual / Suplemento de proteína' : 'Aporte nutricional manual');
      const eqCount = pGrams > 0 ? Number((pGrams / 7).toFixed(1)) : 1;

      mealManualPrompt = `\n\n📊 APORTE MANUAL DE NUTRIENTES - INTEGRACIÓN OBLIGATORIA (${name}):
En la Opción ${optionLetter} de ${mealName}, DEBES incluir como ingrediente:
- ${name}: ${pGrams > 0 ? `${pGrams}g proteína, ` : ''}${totalKcal} kcal (${lGrams}g grasa, ${cGrams}g HC, eq: ${eqCount}).
En la preparación culinaria explica cómo incorporarlo adecuadamente al menú.`;
    }

    const systemInstruction = `Eres un nutriólogo experto mexicano de alta especialidad en el Sistema Mexicano de Alimentos Equivalentes (SMAE 5ta Edición).
Genera UNA ÚNICA OPCIÓN TOTALMENTE NUEVA, CREATIVA Y DELICIOSA (Opción ${optionLetter}) para el tiempo de comida "${mealName}" cumpliendo exactamente con las porciones y gramajes de SMAE 5ta edición asignados.

REGLAS CRÍTICAS:
1. CONGRUENCIA ENTRE TÍTULO E INGREDIENTES: El título debe reflejar los alimentos exactos seleccionados (ej. no llamar omelette si no hay huevo).
2. SMAE 5TA EDICIÓN: Porciones caseras y gramajes rigurosamente apegados al SMAE 5ta edición.
3. PREFERENCIAS DEL PACIENTE:
   - ALIMENTOS PREFERIDOS: Incorpóralos con prioridad absoluta si coinciden con los grupos equivalentes asignados.
   - ALIMENTOS NO PREFERIDOS / AVERSIONES: TERMINANTEMENTE PROHIBIDO incluir estos ingredientes o derivados.
   - EXCLUSIÓN TOTAL DE SEMILLAS DE GIRASOL (PIPAS): NUNCA incluir semillas de girasol ni derivados. Usar almendras, nueces, cacahuates, pepitas de calabaza, chía, ajonjolí o pistaches.
4. DISTINCIÓN OBLIGATORIA:
   - "Aceites con proteína": Oleaginosas y semillas (Almendras, nueces, cacahuates, pepitas, chía, ajonjolí, pistaches, crema de cacahuate sin azúcar). NUNCA aceites líquidos ni aguacate. Usar como TOPPING crujiente.
   - "Aceite sin Proteína": Aceite de oliva, vegetal, aguacate, aceitunas, crema fresca, mayonesa, mantequilla. NUNCA nueces ni semillas. Nombrar como "(para cocinar / en la preparación)" si se usa en la cocción.
   - "Azúcares sin grasa": Miel de abeja pura, mermelada, azúcar mascabado, gelatina. NUNCA chocolates, nieve de crema ni pastel.
   - "Azúcares con grasa": Chocolate amargo, con leche, nutella, pastelito, helado de crema, mazapán.
   - "Jamón y derivados cárnicos": Son AOA (Alimento de Origen Animal), NUNCA sazón ni libre ni verdura.
   - "Cereales con grasa": Granola, galleta de avena casera, puré de papa con mantequilla, pan dulce.
   - "Cereales sin grasa": Tortilla de maíz, arroz al vapor, papa cocida o al vapor con piel, avena en hojuelas, pan integral, tostadas horneadas.
5. REGLA ESTRICTA: EVITAR AL MÁXIMO EL USO DE AJO Y PILONCILLO:
   - A menos que el paciente lo pida explícitamente en sus alimentos favoritos, NO utilices ajo, dientes de ajo ni piloncillo en ningún menú, ingrediente o preparación.
   - Para sazonar utiliza hierbas aromáticas mexicanas frescas (cilantro, epazote, orégano, perejil, laurel, tomillo, comino, pimienta o jugo de limón).
   - Para endulzar utiliza miel de abeja pura, mermelada sin azúcar, fruta natural madura o extracto de vainilla. NUNCA piloncillo.
6. CONGRUENCIA CULINARIA POR TIEMPO DE COMIDA (${mealName}):
   - Asegura total coherencia con el tiempo de comida (desayuno matutino, colación ligera/fresca, comida tradicional caliente con guisado y guarnición, o cena ligera al comal).
7. NO REPETIR RECETAS: La receta debe ser completamente diferente a las existentes (${existingMenuTitles ? existingMenuTitles.join(', ') : 'ninguna'}).`;

    let specificPrefsText = '';
    if (preferredFoods) specificPrefsText += `\nAlimentos preferidos generales: ${preferredFoods}`;
    if (dislikedFoods) specificPrefsText += `\nAlimentos no preferidos / a evitar: ${dislikedFoods}`;
    if (specificPreferences && (specificPreferences.likes || specificPreferences.dislikes)) {
      specificPrefsText += `\nPreferencias para ${mealName}: Preferidos (${specificPreferences.likes || 'N/A'}) | Evitar (${specificPreferences.dislikes || 'N/A'})`;
    }

    const prompt = `Genera un nuevo menú para la Opción ${optionLetter} de ${mealName}.
Equivalentes asignados:
${JSON.stringify(portions, null, 2)}

Notas: ${dietNotes || 'Menú balanceado, sazón mexicana, fácil de preparar y con congruencia absoluta entre título e ingredientes.'}${specificPrefsText}${mealProteinPrompt}${mealManualPrompt}`;

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
    optionData = rectifyMenuOption(optionData, portions, optIdx, mealName, preferredFoods, dislikedFoods);

    // Inyectar suplemento o aporte manual si aplica a este tiempo y no está presente
    if (isTargetProteinMeal && optionData?.ingredients) {
      const brand = proteinSupplement.brandOrType || 'Proteína de suero de leche (Whey Protein)';
      const scoops = proteinSupplement.scoops || 1;
      const pGrams = proteinSupplement.totalProteinGrams || (scoops * (proteinSupplement.proteinGramsPerServing || 25));
      const eqCount = Number((pGrams / 7).toFixed(1));
      const hasProtein = optionData.ingredients.some(
        (ing: any) =>
          ing.foodName?.toLowerCase().includes('suero') ||
          ing.foodName?.toLowerCase().includes('whey') ||
          ing.foodName?.toLowerCase().includes('proteína en polvo') ||
          ing.foodName?.toLowerCase().includes('proteina en polvo') ||
          ing.foodName?.toLowerCase().includes('proteína de suero') ||
          ing.foodName?.toLowerCase().includes('proteina de suero')
      );
      if (!hasProtein) {
        optionData.ingredients.push({
          foodName: brand,
          exactPortion: `${scoops} ${scoops === 1 ? 'medida (scoop)' : 'medidas (scoops)'} (${Math.round(scoops * 30)}g polvo con ${pGrams}g proteína)`,
          smaeGroup: 'Alimento de origen animal muy bajo aporte de grasa',
          equivalentsCount: eqCount,
          role: 'principal',
          isPreferred: true,
          preparationNotes: `Suplemento prescrito: ${pGrams}g de proteína de suero pura`,
        });
      }
    }

    if (isTargetManualMeal && optionData?.ingredients) {
      const pGrams = Number(manualNutrientEntry.proteinGrams) || 0;
      const directKcal = Number(manualNutrientEntry.kcal) || 0;
      const lGrams = Number(manualNutrientEntry.lipidsGrams) || 0;
      const cGrams = Number(manualNutrientEntry.carbsGrams) || 0;
      const totalKcal = directKcal > 0 ? directKcal : (pGrams * 4 + lGrams * 9 + cGrams * 4);
      const name = manualNutrientEntry.name?.trim() || (pGrams > 0 ? 'Aporte manual / Suplemento de proteína' : 'Aporte nutricional manual');
      const eqCount = pGrams > 0 ? Number((pGrams / 7).toFixed(1)) : 1;
      const hasManual = optionData.ingredients.some(
        (ing: any) => ing.preparationNotes?.includes('Aporte manual contabilizado') || ing.foodName?.toLowerCase().includes('aporte manual')
      );
      if (!hasManual && (pGrams > 0 || totalKcal > 0 || lGrams > 0 || cGrams > 0)) {
        optionData.ingredients.push({
          foodName: name,
          exactPortion: `${pGrams > 0 ? `${pGrams}g proteína, ` : ''}${totalKcal} kcal (${lGrams}g grasa, ${cGrams}g HC)`,
          smaeGroup: pGrams > 0 ? 'Alimento de origen animal muy bajo aporte de grasa' : 'Otros',
          equivalentsCount: eqCount,
          role: 'principal',
          isPreferred: true,
          preparationNotes: `Aporte manual contabilizado: ${pGrams}g proteína, ${totalKcal} kcal, ${lGrams}g lípidos, ${cGrams}g carbohidratos`,
        });
      }
    }

    return res.json({ option: optionData });
  } catch (error: any) {
    console.log('[Gemini] Regeneración de opción individual saturada. Usando motor determinista SMAE de respaldo.');
    const fallbackMeal = buildFallbackMeal(
      req.body.mealName,
      req.body.portions,
      req.body.preferredFoods,
      req.body.dislikedFoods,
      0,
      undefined,
      req.body.proteinSupplement,
      req.body.manualNutrientEntry
    );
    const letter = (req.body.optionLetter || 'A').toUpperCase();
    const optIdx = letter === 'B' ? 1 : letter === 'C' ? 2 : 0;
    const fallbackOpt =
      letter === 'B'
        ? fallbackMeal.optionB
        : letter === 'C'
        ? fallbackMeal.optionC
        : fallbackMeal.optionA;
    const rectifiedOpt = rectifyMenuOption(
      fallbackOpt,
      req.body.portions,
      optIdx,
      req.body.mealName,
      req.body.preferredFoods,
      req.body.dislikedFoods
    );
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
  const distPath = path.join(process.cwd(), 'dist');
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from dist directory with standard caching
    app.use(express.static(distPath, { maxAge: '1h' }));

    // Never return index.html for non-existent static assets
    app.use('/assets', (req, res) => {
      res.status(404).send('Asset not found');
    });

    // SPA fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor SMAE Pro activo en http://0.0.0.0:${PORT} (modo: ${isProduction ? 'producción' : 'desarrollo'})`);
  });

  const shutdown = () => {
    console.log('Señal de apagado recibida, cerrando servidor HTTP de forma limpia...');
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer();

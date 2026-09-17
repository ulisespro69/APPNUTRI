import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Packer,
  ShadingType,
  Header,
  Footer,
  PageNumber,
} from 'docx';
import { GeneratedPlan, PatientInfo, MacroNutrientSummary, MealOptionLetter } from '../types';
import { normalizeOptionSelection, calculateRowTotal, calculateColumnTotal, calculateGrandTotalEquivalents, calculateBmiInfo, calculateSkinfoldSums } from './nutritionCalculations';
import { TableGridState, SMAE_GROUPS, MEAL_COLUMNS } from '../data/smaeData';

export async function exportPlanToWord(
  plan: GeneratedPlan,
  patientInfo: PatientInfo,
  macros: MacroNutrientSummary,
  fileName: string = 'Plan_Nutricional_SMAE.docx',
  selectedOptions: Record<string, MealOptionLetter[] | string> = {},
  tableState?: TableGridState
): Promise<void> {
  const sectionsChildren: (Paragraph | Table)[] = [];

  // ==========================================
  // 1. MAIN HEADER BANNER (Identical to PDF)
  // Background #0D3141, Title white, Subtitle #D1FAE5
  // ==========================================
  const headerBannerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { fill: '0D3141', type: ShadingType.CLEAR },
            margins: { top: 200, bottom: 200, left: 240, right: 240 },
            children: [
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: 'PLAN NUTRICIONAL PERSONALIZADO',
                    bold: true,
                    size: 30, // 15pt
                    color: 'FFFFFF',
                    font: 'Helvetica',
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Calculado bajo el Sistema Mexicano de Alimentos Equivalentes (SMAE 5ta Edición)',
                    size: 20, // 10pt
                    color: 'D1FAE5', // emerald-100 identical to PDF
                    font: 'Helvetica',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  sectionsChildren.push(headerBannerTable);
  sectionsChildren.push(new Paragraph({ spacing: { after: 180 } }));

  // ==========================================
  // 2. MARCO CLÍNICO: ANTROPOMETRÍA Y TABLA DE MACRONUTRIENTES
  // Left: #F8FAFC, Right: #ECFDF5 with border #A7F3D0
  // ==========================================
  const dateStr = patientInfo.date || new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const bmiInfo = calculateBmiInfo(patientInfo.height, patientInfo.weight);
  const skinfoldSums = calculateSkinfoldSums(patientInfo.skinfolds);
  const displayHeight = patientInfo.height
    ? /\d$/.test(patientInfo.height.trim())
      ? parseFloat(patientInfo.height) > 3
        ? `${patientInfo.height.trim()} cm`
        : `${patientInfo.height.trim()} m`
      : patientInfo.height
    : '—';

  const proteinKcal = Math.round(macros.totalProteinGrams * 4);
  const lipidsKcal = Math.round(macros.totalLipidsGrams * 9);
  const carbsKcal = Math.round(macros.totalCarbsGrams * 4);

  const patientLeftCell = new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
    margins: { top: 120, bottom: 120, left: 160, right: 140 },
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: 'EXPEDIENTE CLÍNICO DEL PACIENTE', bold: true, size: 19, color: '0F172A', font: 'Helvetica' }),
        ],
      }),
      new Paragraph({
        spacing: { before: 40 },
        children: [
          new TextRun({ text: 'Paciente: ', bold: true, size: 20, color: '0F172A', font: 'Helvetica' }),
          new TextRun({ text: patientInfo.name && patientInfo.name.trim() ? patientInfo.name.trim() : 'Plan Personalizado', bold: true, size: 20, color: '0F172A', font: 'Helvetica' }),
        ],
      }),
      new Paragraph({
        spacing: { before: 30 },
        children: [
          new TextRun({ text: 'Fecha: ', bold: true, size: 17, color: '475569', font: 'Helvetica' }),
          new TextRun({ text: dateStr, size: 17, color: '475569', font: 'Helvetica' }),
        ],
      }),
      new Paragraph({
        spacing: { before: 30 },
        children: [
          new TextRun({ text: 'Objetivo: ', bold: true, size: 17, color: '047857', font: 'Helvetica' }),
          new TextRun({ text: patientInfo.goal && patientInfo.goal.trim() ? patientInfo.goal.trim() : 'Mantenimiento y Prescripción Dietoterapéutica', size: 17, color: '334155', font: 'Helvetica' }),
        ],
      }),
      new Paragraph({
        spacing: { before: 20 },
        children: [
          new TextRun({ text: 'Prescripción Dietoterapéutica bajo SMAE (5ta Edición)', italics: true, size: 15, color: '64748B', font: 'Helvetica' }),
        ],
      }),
    ],
  });

  const macrosRightCell = new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    shading: { fill: 'ECFDF5', type: ShadingType.CLEAR }, // emerald-50 identical to PDF
    margins: { top: 120, bottom: 120, left: 160, right: 160 },
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: 'TABLA DE KCAL, PROTEÍNAS, GRASAS Y HC', bold: true, size: 19, color: '065F46', font: 'Helvetica' }),
        ],
      }),
      new Paragraph({
        spacing: { before: 40 },
        children: [
          new TextRun({ text: 'Calorías Totales (Kcal): ', bold: true, size: 19, color: '064E3B', font: 'Helvetica' }),
          new TextRun({ text: `${Math.round(macros.totalKcal)} kcal (100%)`, bold: true, size: 19, color: '064E3B', font: 'Helvetica' }),
        ],
      }),
      new Paragraph({
        spacing: { before: 30 },
        children: [
          new TextRun({ text: '• Proteínas: ', bold: true, size: 17, color: '0D3141', font: 'Helvetica' }),
          new TextRun({
            text: `${macros.totalProteinGrams} g  |  ${proteinKcal} kcal  |  ${macros.proteinKcalPercent}% VET`,
            size: 17,
            color: '0D3141',
            font: 'Helvetica',
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 20 },
        children: [
          new TextRun({ text: '• Grasas (Lípidos): ', bold: true, size: 17, color: '0D3141', font: 'Helvetica' }),
          new TextRun({
            text: `${macros.totalLipidsGrams} g  |  ${lipidsKcal} kcal  |  ${macros.lipidsKcalPercent}% VET`,
            size: 17,
            color: '0D3141',
            font: 'Helvetica',
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 20 },
        children: [
          new TextRun({ text: '• HC (Carbohidratos): ', bold: true, size: 17, color: '0D3141', font: 'Helvetica' }),
          new TextRun({
            text: `${macros.totalCarbsGrams} g  |  ${carbsKcal} kcal  |  ${macros.carbsKcalPercent}% VET`,
            size: 17,
            color: '0D3141',
            font: 'Helvetica',
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 20 },
        children: [
          new TextRun({ text: `Total de equivalentes prescritos: ${macros.totalEquivalents} eq / día`, italics: true, size: 15, color: '047857', font: 'Helvetica' }),
        ],
      }),
    ],
  });

  const patientCardTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'A7F3D0' },
    },
    rows: [new TableRow({ children: [patientLeftCell, macrosRightCell] })],
  });

  sectionsChildren.push(patientCardTable);
  sectionsChildren.push(new Paragraph({ spacing: { after: 120 } }));

  // =========================================================================
  // 2.5 TABLA UNIFICADA: VALORACIÓN ANTROPOMÉTRICA Y COMPOSICIÓN CORPORAL
  // Una sola tabla que unifica Estatura, Masa Corporal, Edad, IMC y los 4 componentes
  // =========================================================================
  const unifiedAnthropoCompTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
    },
    rows: [
      // Fila 1: Encabezado Principal
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 20,
            shading: { fill: '0F172A', type: ShadingType.CLEAR }, // slate-900
            margins: { top: 80, bottom: 80, left: 140, right: 140 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'VALORACIÓN ANTROPOMÉTRICA Y COMPOSICIÓN CORPORAL (4 COMPONENTES)',
                    bold: true,
                    size: 18,
                    color: 'FFFFFF',
                    font: 'Helvetica',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),

      // Fila 2: Parámetros Antropométricos (Sexo, Edad, Masa Corporal, Estatura, IMC)
      new TableRow({
        children: [
          // Sexo
          new TableCell({
            columnSpan: 4,
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
            margins: { top: 70, bottom: 70, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'SEXO', bold: true, size: 14, color: '64748B', font: 'Helvetica' }),
                ],
              }),
              new Paragraph({
                spacing: { before: 20 },
                children: [
                  new TextRun({
                    text: patientInfo.gender || '—',
                    bold: true,
                    size: 18,
                    color: '0F172A',
                    font: 'Helvetica',
                  }),
                ],
              }),
            ],
          }),
          // Edad
          new TableCell({
            columnSpan: 4,
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
            margins: { top: 70, bottom: 70, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'EDAD', bold: true, size: 14, color: '64748B', font: 'Helvetica' }),
                ],
              }),
              new Paragraph({
                spacing: { before: 20 },
                children: [
                  new TextRun({
                    text: patientInfo.age ? `${patientInfo.age} años` : '—',
                    bold: true,
                    size: 18,
                    color: '0F172A',
                    font: 'Helvetica',
                  }),
                ],
              }),
            ],
          }),
          // Masa Corporal (Peso)
          new TableCell({
            columnSpan: 4,
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
            margins: { top: 70, bottom: 70, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'MASA CORPORAL (PESO)', bold: true, size: 14, color: '64748B', font: 'Helvetica' }),
                ],
              }),
              new Paragraph({
                spacing: { before: 20 },
                children: [
                  new TextRun({
                    text: patientInfo.weight || '—',
                    bold: true,
                    size: 18,
                    color: '0F172A',
                    font: 'Helvetica',
                  }),
                ],
              }),
            ],
          }),
          // Estatura (Talla)
          new TableCell({
            columnSpan: 4,
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
            margins: { top: 70, bottom: 70, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'ESTATURA (TALLA)', bold: true, size: 14, color: '64748B', font: 'Helvetica' }),
                ],
              }),
              new Paragraph({
                spacing: { before: 20 },
                children: [
                  new TextRun({
                    text: displayHeight,
                    bold: true,
                    size: 18,
                    color: '0F172A',
                    font: 'Helvetica',
                  }),
                ],
              }),
            ],
          }),
          // IMC
          new TableCell({
            columnSpan: 4,
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
            margins: { top: 70, bottom: 70, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'ÍNDICE MASA CORP. (IMC)', bold: true, size: 14, color: '64748B', font: 'Helvetica' }),
                ],
              }),
              new Paragraph({
                spacing: { before: 20 },
                children: [
                  new TextRun({
                    text: bmiInfo ? `${bmiInfo.formatted} (${bmiInfo.category})` : '—',
                    bold: true,
                    size: 17,
                    color: '047857',
                    font: 'Helvetica',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),

      // Fila: Sub-encabezado de Sumatoria de Pliegues Cutáneos
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 20,
            shading: { fill: 'ECFDF5', type: ShadingType.CLEAR }, // emerald-50
            margins: { top: 60, bottom: 60, left: 140, right: 140 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'SUMATORIA DE PLIEGUES CUTÁNEOS',
                    bold: true,
                    size: 15,
                    color: '065F46', // emerald-800
                    font: 'Helvetica',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),

      // Fila: 2 Columnas para Σ3 y Σ6 Pliegues (columnSpan 10 cada una)
      new TableRow({
        children: [
          // Σ3 Pliegues
          new TableCell({
            columnSpan: 10,
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { fill: 'F0FDF4', type: ShadingType.CLEAR }, // emerald-50
            margins: { top: 90, bottom: 90, left: 140, right: 140 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'SUMATORIA DE Σ3 PLIEGUES (mm)',
                    bold: true,
                    size: 16,
                    color: '065F46',
                    font: 'Helvetica',
                  }),
                ],
              }),
              new Paragraph({
                spacing: { before: 25 },
                children: [
                  new TextRun({
                    text: 'Subescapular + Supraespinal + Abdominal',
                    italics: true,
                    size: 13,
                    color: '64748B',
                    font: 'Helvetica',
                  }),
                ],
              }),
              new Paragraph({
                spacing: { before: 40 },
                children: [
                  new TextRun({
                    text: skinfoldSums.sum3 || '— mm',
                    bold: true,
                    size: 20,
                    color: '047857',
                    font: 'Helvetica',
                  }),
                  new TextRun({
                    text: skinfoldSums.count3 > 0
                      ? (skinfoldSums.isComplete3 ? '  (3/3 completados)' : `  (${skinfoldSums.count3}/3 capturados)`)
                      : '',
                    italics: true,
                    size: 13,
                    color: '64748B',
                    font: 'Helvetica',
                  }),
                ],
              }),
            ],
          }),

          // Σ6 Pliegues
          new TableCell({
            columnSpan: 10,
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { fill: 'F0FDFA', type: ShadingType.CLEAR }, // teal-50
            margins: { top: 90, bottom: 90, left: 140, right: 140 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'SUMATORIA DE Σ6 PLIEGUES (mm)',
                    bold: true,
                    size: 16,
                    color: '0F766E',
                    font: 'Helvetica',
                  }),
                ],
              }),
              new Paragraph({
                spacing: { before: 25 },
                children: [
                  new TextRun({
                    text: 'Tríceps + Subescapular + Supraespinal + Abdominal + Muslo Frontal + Pantorrilla Medial',
                    italics: true,
                    size: 13,
                    color: '64748B',
                    font: 'Helvetica',
                  }),
                ],
              }),
              new Paragraph({
                spacing: { before: 40 },
                children: [
                  new TextRun({
                    text: skinfoldSums.sum6 || '— mm',
                    bold: true,
                    size: 20,
                    color: '0F766E',
                    font: 'Helvetica',
                  }),
                  new TextRun({
                    text: skinfoldSums.count6 > 0
                      ? (skinfoldSums.isComplete6 ? '  (6/6 completados)' : `  (${skinfoldSums.count6}/6 capturados)`)
                      : '',
                    italics: true,
                    size: 13,
                    color: '64748B',
                    font: 'Helvetica',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),

      // Fila 3: Sub-encabezado de Composición Corporal
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 20,
            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, // slate-100
            margins: { top: 50, bottom: 50, left: 140, right: 140 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'COMPOSICIÓN CORPORAL (FRACCIONAMIENTO 4 COMPONENTES)',
                    bold: true,
                    size: 15,
                    color: '334155',
                    font: 'Helvetica',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),

      // Fila 4: 4 Columnas: Masa Grasa, Masa Muscular, Masa Ósea, Masa Residual
      new TableRow({
        children: [
          // Masa Grasa
          new TableCell({
            columnSpan: 5,
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: 'FFFBEB', type: ShadingType.CLEAR }, // amber-50
            margins: { top: 90, bottom: 90, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Masa Grasa', bold: true, size: 17, color: '92400E', font: 'Helvetica' }),
                ],
              }),
              new Paragraph({
                spacing: { before: 30 },
                children: [
                  new TextRun({ text: '% de Grasa: ', bold: true, size: 16, color: '475569', font: 'Helvetica' }),
                  new TextRun({ text: patientInfo.fatPercent ? `${patientInfo.fatPercent}%` : '—', bold: true, size: 17, color: '0F172A', font: 'Helvetica' }),
                ],
              }),
              new Paragraph({
                spacing: { before: 20 },
                children: [
                  new TextRun({ text: 'Kg de Grasa: ', bold: true, size: 16, color: '475569', font: 'Helvetica' }),
                  new TextRun({ text: patientInfo.fatKg ? `${patientInfo.fatKg} kg` : '—', bold: true, size: 17, color: '0F172A', font: 'Helvetica' }),
                ],
              }),
            ],
          }),
          // Masa Muscular
          new TableCell({
            columnSpan: 5,
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: 'FFF1F2', type: ShadingType.CLEAR }, // rose-50
            margins: { top: 90, bottom: 90, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Masa Muscular', bold: true, size: 17, color: '9F1239', font: 'Helvetica' }),
                ],
              }),
              new Paragraph({
                spacing: { before: 30 },
                children: [
                  new TextRun({ text: '% de Músculo: ', bold: true, size: 16, color: '475569', font: 'Helvetica' }),
                  new TextRun({ text: patientInfo.musclePercent ? `${patientInfo.musclePercent}%` : '—', bold: true, size: 17, color: '0F172A', font: 'Helvetica' }),
                ],
              }),
              new Paragraph({
                spacing: { before: 20 },
                children: [
                  new TextRun({ text: 'Kg de Músculo: ', bold: true, size: 16, color: '475569', font: 'Helvetica' }),
                  new TextRun({ text: patientInfo.muscleKg ? `${patientInfo.muscleKg} kg` : '—', bold: true, size: 17, color: '0F172A', font: 'Helvetica' }),
                ],
              }),
            ],
          }),
          // Masa Ósea
          new TableCell({
            columnSpan: 5,
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: 'F0F9FF', type: ShadingType.CLEAR }, // sky-50
            margins: { top: 90, bottom: 90, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Masa Ósea (Hueso)', bold: true, size: 17, color: '075985', font: 'Helvetica' }),
                ],
              }),
              new Paragraph({
                spacing: { before: 30 },
                children: [
                  new TextRun({ text: '% de Hueso: ', bold: true, size: 16, color: '475569', font: 'Helvetica' }),
                  new TextRun({ text: patientInfo.bonePercent ? `${patientInfo.bonePercent}%` : '—', bold: true, size: 17, color: '0F172A', font: 'Helvetica' }),
                ],
              }),
              new Paragraph({
                spacing: { before: 20 },
                children: [
                  new TextRun({ text: 'Kg de Hueso: ', bold: true, size: 16, color: '475569', font: 'Helvetica' }),
                  new TextRun({ text: patientInfo.boneKg ? `${patientInfo.boneKg} kg` : '—', bold: true, size: 17, color: '0F172A', font: 'Helvetica' }),
                ],
              }),
            ],
          }),
          // Masa Residual
          new TableCell({
            columnSpan: 5,
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: 'FAF5FF', type: ShadingType.CLEAR }, // purple-50
            margins: { top: 90, bottom: 90, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Masa Residual', bold: true, size: 17, color: '6B21A8', font: 'Helvetica' }),
                ],
              }),
              new Paragraph({
                spacing: { before: 30 },
                children: [
                  new TextRun({ text: '% de Residual: ', bold: true, size: 16, color: '475569', font: 'Helvetica' }),
                  new TextRun({ text: patientInfo.residualPercent ? `${patientInfo.residualPercent}%` : '—', bold: true, size: 17, color: '0F172A', font: 'Helvetica' }),
                ],
              }),
              new Paragraph({
                spacing: { before: 20 },
                children: [
                  new TextRun({ text: 'Kg Residual: ', bold: true, size: 16, color: '475569', font: 'Helvetica' }),
                  new TextRun({ text: patientInfo.residualKg ? `${patientInfo.residualKg} kg` : '—', bold: true, size: 17, color: '0F172A', font: 'Helvetica' }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  sectionsChildren.push(unifiedAnthropoCompTable);
  sectionsChildren.push(new Paragraph({ spacing: { after: 140 } }));

  // ==========================================
  // 3. INDICACIONES Y NOTAS GENERALES (Identical to PDF)
  // Se imprime ÚNICAMENTE si el usuario ingresó información en el cuadro de notas
  // ==========================================
  const userNotes = patientInfo.notes?.trim();
  if (userNotes) {
    const notesTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: 'FEF08A' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'FEF08A' },
        left: { style: BorderStyle.SINGLE, size: 8, color: 'FEF08A' },
        right: { style: BorderStyle.SINGLE, size: 4, color: 'FEF08A' },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 100, type: WidthType.PERCENTAGE },
              shading: { fill: 'FEFCE8', type: ShadingType.CLEAR },
              margins: { top: 100, bottom: 100, left: 160, right: 160 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Indicaciones y notas del paciente: ', bold: true, italics: true, size: 18, color: '713F12', font: 'Helvetica' }),
                    new TextRun({ text: userNotes, italics: true, size: 18, color: '713F12', font: 'Helvetica' }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    sectionsChildren.push(notesTable);
    sectionsChildren.push(new Paragraph({ spacing: { after: 180 } }));
  }

  // ==========================================
  // 3.5 CUADRO DE DISTRIBUCIÓN DE EQUIVALENTES (SMAE 5ª EDICIÓN)
  // ==========================================
  if (tableState) {
    const allGroups = SMAE_GROUPS;

    // Title Banner Table
    const eqBannerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 100, type: WidthType.PERCENTAGE },
              shading: { fill: '0D3141', type: ShadingType.CLEAR },
              margins: { top: 100, bottom: 100, left: 180, right: 180 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'CUADRO DE DISTRIBUCIÓN DE EQUIVALENTES',
                      bold: true,
                      size: 20,
                      color: 'FFFFFF',
                      font: 'Helvetica',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    sectionsChildren.push(eqBannerTable);
    sectionsChildren.push(new Paragraph({ spacing: { after: 60 } }));

    // Equivalents Grid Table
    const headerCells = [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: 'Grupo de Alimento', bold: true, size: 17, color: '0F172A', font: 'Helvetica' }),
            ],
          }),
        ],
      }),
      ...MEAL_COLUMNS.map((col) => {
        return new TableCell({
          width: { size: 10, type: WidthType.PERCENTAGE },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 60, right: 60 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: col.shortLabel, bold: true, size: 17, color: '0F172A', font: 'Helvetica' }),
              ],
            }),
          ],
        });
      }),
      new TableCell({
        width: { size: 10, type: WidthType.PERCENTAGE },
        shading: { fill: 'ECFDF5', type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 60, right: 60 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'Total Eq.', bold: true, size: 17, color: '064E3B', font: 'Helvetica' }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 10, type: WidthType.PERCENTAGE },
        shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 60, right: 60 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'Kcal', bold: true, size: 17, color: '334155', font: 'Helvetica' }),
            ],
          }),
        ],
      }),
    ];

    const gridRows: TableRow[] = [
      new TableRow({ children: headerCells }),
    ];

    allGroups.forEach((group, idx) => {
      const rowTotal = calculateRowTotal(group.id, tableState);
      const groupKcal = Math.round(rowTotal * group.kcal);
      const isEven = idx % 2 === 0;
      const fill = isEven ? 'FFFFFF' : 'F8FAFC';

      const rowCells = [
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          shading: { fill, type: ShadingType.CLEAR },
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: group.name, size: 16, color: '1E293B', font: 'Helvetica' }),
              ],
            }),
          ],
        }),
        ...MEAL_COLUMNS.map((col) => {
          const val = tableState[group.id]?.[col.key] || 0;
          return new TableCell({
            width: { size: 10, type: WidthType.PERCENTAGE },
            shading: { fill, type: ShadingType.CLEAR },
            margins: { top: 60, bottom: 60, left: 60, right: 60 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: val > 0 ? `${val}` : '-',
                    bold: val > 0,
                    size: 16,
                    color: val > 0 ? '065F46' : '94A3B8',
                    font: 'Helvetica',
                  }),
                ],
              }),
            ],
          });
        }),
        new TableCell({
          width: { size: 10, type: WidthType.PERCENTAGE },
          shading: { fill: isEven ? 'F0FDF4' : 'ECFDF5', type: ShadingType.CLEAR },
          margins: { top: 60, bottom: 60, left: 60, right: 60 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: `${rowTotal}`, bold: rowTotal > 0, size: 16, color: rowTotal > 0 ? '065F46' : '94A3B8', font: 'Helvetica' }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 10, type: WidthType.PERCENTAGE },
          shading: { fill, type: ShadingType.CLEAR },
          margins: { top: 60, bottom: 60, left: 60, right: 60 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: groupKcal > 0 ? `${groupKcal}` : '-', size: 16, color: groupKcal > 0 ? '475569' : '94A3B8', font: 'Helvetica' }),
              ],
            }),
          ],
        }),
      ];

      gridRows.push(new TableRow({ children: rowCells }));
    });

    // Total Row
    const grandTotalEq = calculateGrandTotalEquivalents(tableState);
    const footerCells = [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        shading: { fill: '0D3141', type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: 'TOTAL POR COMIDA', bold: true, size: 16, color: 'FFFFFF', font: 'Helvetica' }),
            ],
          }),
        ],
      }),
      ...MEAL_COLUMNS.map((col) => {
        const colTotal = calculateColumnTotal(col.key, tableState);
        return new TableCell({
          width: { size: 10, type: WidthType.PERCENTAGE },
          shading: { fill: '0D3141', type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 60, right: 60 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: `${colTotal}`, bold: true, size: 16, color: 'FFFFFF', font: 'Helvetica' }),
              ],
            }),
          ],
        });
      }),
      new TableCell({
        width: { size: 10, type: WidthType.PERCENTAGE },
        shading: { fill: '064E3B', type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 60, right: 60 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `${grandTotalEq} eq`, bold: true, size: 16, color: 'FDE047', font: 'Helvetica' }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 10, type: WidthType.PERCENTAGE },
        shading: { fill: '0D3141', type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 60, right: 60 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `${Math.round(macros.totalKcal)}`, bold: true, size: 16, color: 'FFFFFF', font: 'Helvetica' }),
            ],
          }),
        ],
      }),
    ];

    gridRows.push(new TableRow({ children: footerCells }));

    const equivalentsTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' },
        bottom: { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' },
        left: { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' },
        right: { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
      },
      rows: gridRows,
    });

    sectionsChildren.push(equivalentsTable);
    sectionsChildren.push(new Paragraph({ spacing: { after: 180 } }));
  }

  // ==========================================
  // 4. MEAL TIMES & OPTIONS (Identical to PDF)
  // Meal Banner #0D3141, Option A: #F0FDF4, Option B: #F0FDFA, Option C: #F0F9FF
  // ==========================================
  plan.meals.forEach((meal) => {
    const hasIngredientsA = Boolean(meal.optionA?.ingredients && meal.optionA.ingredients.length > 0);
    const hasIngredientsB = Boolean(meal.optionB?.ingredients && meal.optionB.ingredients.length > 0);
    const hasIngredientsC = Boolean(meal.optionC?.ingredients && meal.optionC.ingredients.length > 0);
    const hasEquivalents = Boolean(
      meal.totalEquivalentsSummary &&
        meal.totalEquivalentsSummary.length > 0 &&
        meal.totalEquivalentsSummary.some((eq) => (Number(eq.quantity) || 0) > 0)
    );

    const hasAny = hasIngredientsA || hasIngredientsB || hasIngredientsC || hasEquivalents;
    if (!hasAny) return;

    // Meal Header Banner Table (#0D3141)
    const mealBannerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 100, type: WidthType.PERCENTAGE },
              shading: { fill: '0D3141', type: ShadingType.CLEAR },
              margins: { top: 90, bottom: 90, left: 160, right: 160 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: meal.mealName.toUpperCase(),
                      bold: true,
                      size: 23, // 11.5pt
                      color: 'FFFFFF',
                      font: 'Helvetica',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    sectionsChildren.push(mealBannerTable);
    sectionsChildren.push(new Paragraph({ spacing: { after: 100 } }));

    const currentSelection = normalizeOptionSelection(selectedOptions[meal.mealName]);

    // Render Option Function matching PDF
    const renderWordOption = (opt: typeof meal.optionA, letter: 'A' | 'B' | 'C') => {
      if (!opt) return;

      const isA = letter === 'A';
      const isB = letter === 'B';

      // Colors matching PDF exactly:
      // A: emerald-50 (#F0FDF4), border #A7F3D0
      // B: teal-50 (#F0FDFA), border #99F6E4 / #9BF6E4
      // C: sky-50 (#F0F9FF), border #BAE6FD
      const fillColor = isA ? 'F0FDF4' : isB ? 'F0FDFA' : 'F0F9FF';
      const borderColor = isA ? 'A7F3D0' : isB ? '99F6E4' : 'BAE6FD';

      const optChildren: Paragraph[] = [
        // Title: OPCIÓN A: Title (bold, color #0D3141, identical to PDF)
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: `OPCIÓN ${letter}: ${opt.title || 'Menú sugerido'}`,
              bold: true,
              size: 21, // 10.5pt
              color: '0D3141',
              font: 'Helvetica',
            }),
          ],
        }),
      ];

      if (opt.description) {
        optChildren.push(
          new Paragraph({
            spacing: { before: 20, after: 60 },
            children: [
              new TextRun({
                text: opt.description,
                italics: true,
                size: 18,
                color: '334155',
                font: 'Helvetica',
              }),
            ],
          })
        );
      }

      // Ingredients List:  •  {portion} {name} (clean food portions without equivalents)
      if (opt.ingredients && opt.ingredients.length > 0) {
        opt.ingredients.forEach((ing) => {
          optChildren.push(
            new Paragraph({
              spacing: { before: 25, after: 25 },
              children: [
                new TextRun({ text: '  •  ', bold: true, color: '059669', size: 19, font: 'Helvetica' }),
                new TextRun({ text: `${ing.exactPortion} `, bold: true, size: 19, color: '1E293B', font: 'Helvetica' }),
                new TextRun({ text: `${ing.foodName}`, size: 19, color: '1E293B', font: 'Helvetica' }),
                new TextRun({ text: ` (${ing.equivalentsCount} eq ${ing.smaeGroup})`, size: 17, color: '64748B', font: 'Helvetica' }),
              ],
            })
          );
        });
      }

      // Preparation: italics, color #475569 (identical to PDF)
      if (opt.preparation) {
        optChildren.push(
          new Paragraph({
            spacing: { before: 80, after: 40 },
            children: [
              new TextRun({ text: 'Preparación: ', bold: true, italics: true, size: 18, color: '475569', font: 'Helvetica' }),
              new TextRun({ text: opt.preparation, italics: true, size: 18, color: '475569', font: 'Helvetica' }),
            ],
          })
        );
      }

      // Tip: color #B45309 (amber-700, identical to PDF)
      if (opt.nutritionistTip) {
        optChildren.push(
          new Paragraph({
            spacing: { before: 40, after: 40 },
            children: [
              new TextRun({ text: 'Tip: ', bold: true, size: 18, color: 'B45309', font: 'Helvetica' }),
              new TextRun({ text: opt.nutritionistTip, size: 18, color: 'B45309', font: 'Helvetica' }),
            ],
          })
        );
      }

      // Card Table
      const optionCardTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
          left: { style: BorderStyle.SINGLE, size: 12, color: borderColor },
          right: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
          insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
          insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 100, type: WidthType.PERCENTAGE },
                shading: { fill: fillColor, type: ShadingType.CLEAR },
                margins: { top: 120, bottom: 120, left: 160, right: 160 },
                children: optChildren,
              }),
            ],
          }),
        ],
      });

      sectionsChildren.push(optionCardTable);
      sectionsChildren.push(new Paragraph({ spacing: { after: 120 } }));
    };

    if (currentSelection.includes('A') && hasIngredientsA && meal.optionA) {
      renderWordOption(meal.optionA, 'A');
    }
    if (currentSelection.includes('B') && hasIngredientsB && meal.optionB) {
      renderWordOption(meal.optionB, 'B');
    }
    if (currentSelection.includes('C') && hasIngredientsC && meal.optionC) {
      renderWordOption(meal.optionC, 'C');
    }

    sectionsChildren.push(new Paragraph({ spacing: { after: 80 } }));
  });

  // ==========================================
  // 5. WORD DOCUMENT STRUCTURE (Header & Footer)
  // ==========================================
  const doc = new Document({
    creator: 'Generador de Menús SMAE',
    title: `Plan Nutricional - ${patientInfo.name || 'Paciente'}`,
    description: 'Plan Nutricional Personalizado SMAE 5ta Edición',
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 794, // 14mm
              bottom: 794, // 14mm
              left: 794, // 14mm
              right: 794, // 14mm
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 120 },
                children: [
                  new TextRun({
                    text: 'PLAN NUTRICIONAL - SISTEMA MEXICANO DE ALIMENTOS EQUIVALENTES (SMAE 5TA ED.)',
                    size: 15, // 7.5pt
                    color: '94A3B8', // slate-400
                    font: 'Helvetica',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.BOTH,
                children: [
                  new TextRun({
                    text: 'Generado por Sistema Nutricional SMAE Pro 5ta Edición       ',
                    size: 16, // 8pt
                    color: '94A3B8', // slate-400
                    font: 'Helvetica',
                  }),
                  new TextRun({
                    text: 'Página ',
                    size: 16,
                    color: '94A3B8',
                    font: 'Helvetica',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: '94A3B8',
                    font: 'Helvetica',
                  }),
                  new TextRun({
                    text: ' de ',
                    size: 16,
                    color: '94A3B8',
                    font: 'Helvetica',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: '94A3B8',
                    font: 'Helvetica',
                  }),
                ],
              }),
            ],
          }),
        },
        children: sectionsChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

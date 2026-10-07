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
  ImageRun,
  PageBreak,
} from 'docx';
import { GeneratedPlan, PatientInfo, MacroNutrientSummary, MealOptionLetter } from '../types';
import { normalizeOptionSelection, calculateRowTotal, calculateColumnTotal, calculateGrandTotalEquivalents, calculateBmiInfo, calculateSkinfoldSums, calculateHeathCarterSomatotype } from './nutritionCalculations';
import { TableGridState, SMAE_GROUPS, MEAL_COLUMNS } from '../data/smaeData';
import { getSomatocartaPngDataUrl, dataUrlToUint8Array } from './somatocartaGenerator';
import { parseAndScalePortion, getGroupBadgeConfig, detectTrueSMAEGroup, detectIngredientRole, cleanSpacing } from './smaeRectifier';

function getWordGroupColor(shortName: string): string {
  switch (shortName) {
    case 'Verdura':
      return '047857'; // emerald-700
    case 'Fruta':
      return 'B45309'; // amber-700
    case 'Cereales s/g':
      return '854D0E'; // yellow-800
    case 'Cereales c/g':
      return '92400E'; // amber-800
    case 'Leguminosas':
      return '57534E'; // stone-600
    case 'AOA Muy Bajo':
    case 'AOA Bajo':
      return 'BE123C'; // rose-700
    case 'AOA Moderado':
      return 'C2410C'; // orange-700
    case 'AOA Alto':
      return 'B91C1C'; // red-700
    case 'Leche Descremada':
    case 'Leche Semidescr.':
      return '0369A1'; // sky-700
    case 'Leche Entera':
      return '1D4ED8'; // blue-700
    case 'Leche c/ Azúcar':
      return '4338CA'; // indigo-700
    case 'Grasas s/ Prot':
      return '4D7C0F'; // lime-700
    case 'Grasas c/ Prot':
      return '0F766E'; // teal-700
    case 'Azúcar s/ Grasa':
      return '7E22CE'; // purple-700
    case 'Azúcar c/ Grasa':
      return 'A21CAF'; // fuchsia-700
    case 'Libre / Sazón':
      return '64748B'; // slate-500
    default:
      return '475569'; // slate-600
  }
}

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
  sectionsChildren.push(new Paragraph({ spacing: { after: 70 } }));

  // ==========================================
  // 2. MARCO CLÍNICO: ANTROPOMETRÍA Y TABLA DE MACRONUTRIENTES
  // Left: #F8FAFC, Right: #ECFDF5 with border #A7F3D0
  // ==========================================
  const dateStr = patientInfo.date || new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const bmiInfo = calculateBmiInfo(patientInfo.height, patientInfo.weight);
  const skinfoldSums = calculateSkinfoldSums(patientInfo.skinfolds);
  const heightStr = patientInfo.height != null ? String(patientInfo.height).trim() : '';
  const displayHeight = heightStr
    ? /\d$/.test(heightStr)
      ? parseFloat(heightStr) > 3
        ? `${heightStr} cm`
        : `${heightStr} m`
      : heightStr
    : '—';

  const proteinKcal = Math.round(macros.totalProteinGrams * 4);
  const lipidsKcal = Math.round(macros.totalLipidsGrams * 9);
  const carbsKcal = Math.round(macros.totalCarbsGrams * 4);

  const patientDisplayName = cleanSpacing(patientInfo.name && patientInfo.name.trim() ? patientInfo.name.trim() : 'Plan Personalizado');
  const clinicalGoal = cleanSpacing(patientInfo.goal && patientInfo.goal.trim() ? patientInfo.goal.trim() : 'Mantenimiento y Prescripción Dietoterapéutica');

  const patientLeftCell = new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
    margins: { top: 0, bottom: 80, left: 0, right: 0 },
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: '  EXPEDIENTE CLÍNICO DEL PACIENTE', bold: true, size: 16, color: 'FFFFFF', font: 'Helvetica' }),
        ],
        shading: { fill: '0F172A', type: ShadingType.CLEAR },
        spacing: { before: 40, after: 60 },
      }),
      new Paragraph({
        spacing: { before: 20, after: 20 },
        children: [
          new TextRun({ text: '  Paciente: ', bold: true, size: 18, color: '0F172A', font: 'Helvetica' }),
          new TextRun({ text: patientDisplayName, bold: true, size: 18, color: '0F172A', font: 'Helvetica' }),
        ],
      }),
      new Paragraph({
        spacing: { before: 20, after: 20 },
        children: [
          new TextRun({ text: '  Fecha de valoración: ', size: 16, color: '475569', font: 'Helvetica' }),
          new TextRun({ text: dateStr, size: 16, color: '475569', font: 'Helvetica' }),
        ],
      }),
      new Paragraph({
        spacing: { before: 20, after: 20 },
        children: [
          new TextRun({ text: '  Objetivo: ', bold: true, size: 16, color: '047857', font: 'Helvetica' }),
          new TextRun({ text: clinicalGoal, size: 16, color: '334155', font: 'Helvetica' }),
        ],
      }),
      new Paragraph({
        spacing: { before: 20, after: 40 },
        children: [
          new TextRun({ text: '  Prescripción bajo Sistema Mexicano de Equivalentes (SMAE)', size: 14, color: '64748B', font: 'Helvetica' }),
        ],
      }),
    ],
  });

  // Mini-tabla de Macronutrientes idéntica a la estructura del archivo PDF
  const macroInnerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' },
      left: { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' },
      right: { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    },
    rows: [
      // Encabezados de columna
      new TableRow({
        children: [
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
            margins: { top: 25, bottom: 25, left: 40, right: 20 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Nutriente', bold: true, size: 14, color: '334155', font: 'Helvetica' })] })],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
            margins: { top: 25, bottom: 25, left: 20, right: 20 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Gramos', bold: true, size: 14, color: '334155', font: 'Helvetica' })] })],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
            margins: { top: 25, bottom: 25, left: 20, right: 20 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Kcal', bold: true, size: 14, color: '334155', font: 'Helvetica' })] })],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
            margins: { top: 25, bottom: 25, left: 20, right: 20 },
            children: [new Paragraph({ children: [new TextRun({ text: '% VET', bold: true, size: 14, color: '334155', font: 'Helvetica' })] })],
          }),
        ],
      }),
      // Kcal Totales
      new TableRow({
        children: [
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            shading: { fill: 'ECFDF5', type: ShadingType.CLEAR },
            margins: { top: 20, bottom: 20, left: 40, right: 20 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Kcal Totales', bold: true, size: 14, color: '064E3B', font: 'Helvetica' })] })],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: 'ECFDF5', type: ShadingType.CLEAR },
            margins: { top: 20, bottom: 20, left: 20, right: 20 },
            children: [new Paragraph({ children: [new TextRun({ text: '—', size: 14, color: '064E3B', font: 'Helvetica' })] })],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: 'ECFDF5', type: ShadingType.CLEAR },
            margins: { top: 20, bottom: 20, left: 20, right: 20 },
            children: [new Paragraph({ children: [new TextRun({ text: `${Math.round(macros.totalKcal)}`, bold: true, size: 14, color: '064E3B', font: 'Helvetica' })] })],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: 'ECFDF5', type: ShadingType.CLEAR },
            margins: { top: 20, bottom: 20, left: 20, right: 20 },
            children: [new Paragraph({ children: [new TextRun({ text: '100%', bold: true, size: 14, color: '064E3B', font: 'Helvetica' })] })],
          }),
        ],
      }),
      // Proteínas
      new TableRow({
        children: [
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
            margins: { top: 20, bottom: 20, left: 40, right: 20 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Proteínas', size: 14, color: '1E293B', font: 'Helvetica' })] })],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
            margins: { top: 20, bottom: 20, left: 20, right: 20 },
            children: [new Paragraph({ children: [new TextRun({ text: `${macros.totalProteinGrams} g`, size: 14, color: '1E293B', font: 'Helvetica' })] })],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
            margins: { top: 20, bottom: 20, left: 20, right: 20 },
            children: [new Paragraph({ children: [new TextRun({ text: `${proteinKcal}`, size: 14, color: '1E293B', font: 'Helvetica' })] })],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
            margins: { top: 20, bottom: 20, left: 20, right: 20 },
            children: [new Paragraph({ children: [new TextRun({ text: `${macros.proteinKcalPercent}%`, size: 14, color: '1E293B', font: 'Helvetica' })] })],
          }),
        ],
      }),
      // Grasas
      new TableRow({
        children: [
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
            margins: { top: 20, bottom: 20, left: 40, right: 20 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Grasas (Lípidos)', size: 14, color: '1E293B', font: 'Helvetica' })] })],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
            margins: { top: 20, bottom: 20, left: 20, right: 20 },
            children: [new Paragraph({ children: [new TextRun({ text: `${macros.totalLipidsGrams} g`, size: 14, color: '1E293B', font: 'Helvetica' })] })],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
            margins: { top: 20, bottom: 20, left: 20, right: 20 },
            children: [new Paragraph({ children: [new TextRun({ text: `${lipidsKcal}`, size: 14, color: '1E293B', font: 'Helvetica' })] })],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
            margins: { top: 20, bottom: 20, left: 20, right: 20 },
            children: [new Paragraph({ children: [new TextRun({ text: `${macros.lipidsKcalPercent}%`, size: 14, color: '1E293B', font: 'Helvetica' })] })],
          }),
        ],
      }),
      // HC
      new TableRow({
        children: [
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
            margins: { top: 20, bottom: 20, left: 40, right: 20 },
            children: [new Paragraph({ children: [new TextRun({ text: 'HC (Carbohidratos)', size: 14, color: '1E293B', font: 'Helvetica' })] })],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
            margins: { top: 20, bottom: 20, left: 20, right: 20 },
            children: [new Paragraph({ children: [new TextRun({ text: `${macros.totalCarbsGrams} g`, size: 14, color: '1E293B', font: 'Helvetica' })] })],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
            margins: { top: 20, bottom: 20, left: 20, right: 20 },
            children: [new Paragraph({ children: [new TextRun({ text: `${carbsKcal}`, size: 14, color: '1E293B', font: 'Helvetica' })] })],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
            margins: { top: 20, bottom: 20, left: 20, right: 20 },
            children: [new Paragraph({ children: [new TextRun({ text: `${macros.carbsKcalPercent}%`, size: 14, color: '1E293B', font: 'Helvetica' })] })],
          }),
        ],
      }),
    ],
  });

  const macrosRightCell = new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
    margins: { top: 0, bottom: 40, left: 0, right: 0 },
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: '  TABLA DE KCAL Y MACRONUTRIENTES', bold: true, size: 16, color: 'FFFFFF', font: 'Helvetica' }),
        ],
        shading: { fill: '0F4C5C', type: ShadingType.CLEAR },
        spacing: { before: 40, after: 40 },
      }),
      macroInnerTable,
      new Paragraph({
        spacing: { before: 30, after: 20 },
        children: [
          new TextRun({ text: `  Total de equivalentes: ${macros.totalEquivalents} eq / día`, size: 14, color: '047857', font: 'Helvetica' }),
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
  sectionsChildren.push(new Paragraph({ spacing: { after: 30 } }));

  // ==========================================
  // 2.2 CUADRO DE DISTRIBUCIÓN DE EQUIVALENTES (SMAE 5ª EDICIÓN)
  // En la primera hoja manteniendo el formato y proporciones exactas para quitar espacio innecesario
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
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: 100, type: WidthType.PERCENTAGE },
              shading: { fill: '0D3141', type: ShadingType.CLEAR },
              margins: { top: 30, bottom: 30, left: 100, right: 100 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'CUADRO DE DISTRIBUCIÓN DE EQUIVALENTES (SMAE 5ª EDICIÓN)',
                      bold: true,
                      size: 15, // 7.5pt
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
    sectionsChildren.push(new Paragraph({ spacing: { after: 20 } }));

    // Equivalents Grid Table (ajustado en proporciones para asegurar caber perfectamente en la primera hoja)
    const headerCells = [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
        margins: { top: 22, bottom: 22, left: 50, right: 50 },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: 'Grupo de Alimento', bold: true, size: 13, color: '0F172A', font: 'Helvetica' }),
            ],
          }),
        ],
      }),
      ...MEAL_COLUMNS.map((col) => {
        return new TableCell({
          width: { size: 10, type: WidthType.PERCENTAGE },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          margins: { top: 22, bottom: 22, left: 30, right: 30 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: col.shortLabel, bold: true, size: 13, color: '0F172A', font: 'Helvetica' }),
              ],
            }),
          ],
        });
      }),
      new TableCell({
        width: { size: 10, type: WidthType.PERCENTAGE },
        shading: { fill: 'ECFDF5', type: ShadingType.CLEAR },
        margins: { top: 22, bottom: 22, left: 30, right: 30 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'Total Eq.', bold: true, size: 13, color: '064E3B', font: 'Helvetica' }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 10, type: WidthType.PERCENTAGE },
        shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
        margins: { top: 22, bottom: 22, left: 30, right: 30 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'Kcal', bold: true, size: 13, color: '334155', font: 'Helvetica' }),
            ],
          }),
        ],
      }),
    ];

    const gridRows: TableRow[] = [
      new TableRow({ cantSplit: true, children: headerCells }),
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
          margins: { top: 16, bottom: 16, left: 50, right: 50 },
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: group.name, size: 12, color: '1E293B', font: 'Helvetica' }),
              ],
            }),
          ],
        }),
        ...MEAL_COLUMNS.map((col) => {
          const val = tableState[group.id]?.[col.key] || 0;
          return new TableCell({
            width: { size: 10, type: WidthType.PERCENTAGE },
            shading: { fill, type: ShadingType.CLEAR },
            margins: { top: 16, bottom: 16, left: 30, right: 30 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: val > 0 ? `${val}` : '-',
                    bold: val > 0,
                    size: 12,
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
          margins: { top: 16, bottom: 16, left: 30, right: 30 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: `${rowTotal}`, bold: rowTotal > 0, size: 12, color: rowTotal > 0 ? '065F46' : '94A3B8', font: 'Helvetica' }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 10, type: WidthType.PERCENTAGE },
          shading: { fill, type: ShadingType.CLEAR },
          margins: { top: 16, bottom: 16, left: 30, right: 30 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: groupKcal > 0 ? `${groupKcal}` : '-', size: 12, color: groupKcal > 0 ? '475569' : '94A3B8', font: 'Helvetica' }),
              ],
            }),
          ],
        }),
      ];

      gridRows.push(new TableRow({ cantSplit: true, children: rowCells }));
    });

    // Total Row
    const grandTotalEq = calculateGrandTotalEquivalents(tableState);
    const footerCells = [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        shading: { fill: '0D3141', type: ShadingType.CLEAR },
        margins: { top: 22, bottom: 22, left: 50, right: 50 },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: 'TOTAL POR COMIDA', bold: true, size: 13, color: 'FFFFFF', font: 'Helvetica' }),
            ],
          }),
        ],
      }),
      ...MEAL_COLUMNS.map((col) => {
        const colTotal = calculateColumnTotal(col.key, tableState);
        return new TableCell({
          width: { size: 10, type: WidthType.PERCENTAGE },
          shading: { fill: '0D3141', type: ShadingType.CLEAR },
          margins: { top: 22, bottom: 22, left: 30, right: 30 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: `${colTotal}`, bold: true, size: 13, color: 'FFFFFF', font: 'Helvetica' }),
              ],
            }),
          ],
        });
      }),
      new TableCell({
        width: { size: 10, type: WidthType.PERCENTAGE },
        shading: { fill: '064E3B', type: ShadingType.CLEAR },
        margins: { top: 22, bottom: 22, left: 30, right: 30 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `${grandTotalEq} eq`, bold: true, size: 13, color: 'FDE047', font: 'Helvetica' }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 10, type: WidthType.PERCENTAGE },
        shading: { fill: '0D3141', type: ShadingType.CLEAR },
        margins: { top: 22, bottom: 22, left: 30, right: 30 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `${Math.round(macros.totalKcal)}`, bold: true, size: 13, color: 'FFFFFF', font: 'Helvetica' }),
            ],
          }),
        ],
      }),
    ];

    gridRows.push(new TableRow({ cantSplit: true, children: footerCells }));

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
    sectionsChildren.push(new Paragraph({ spacing: { after: 30 } }));
  }

  // =========================================================================
  // 2.3 TABLA UNIFICADA: VALORACIÓN ANTROPOMÉTRICA Y COMPOSICIÓN CORPORAL
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
                    text: patientInfo.weight ? `${patientInfo.weight}` : '—',
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

  // ==========================================
  // 2.3 VALORACIÓN ANTROPOMÉTRICA Y SOMATOTIPO
  // Se presenta en hoja propia si el expediente contiene mediciones capturadas
  // ==========================================
  const somatotype = calculateHeathCarterSomatotype(patientInfo);
  const hasAnthropoOrSomato = Boolean(
    patientInfo.weight ||
    patientInfo.height ||
    patientInfo.fatPercent ||
    patientInfo.musclePercent ||
    skinfoldSums.sum6 ||
    somatotype.hasAnyData
  );

  if (hasAnthropoOrSomato) {
    sectionsChildren.push(unifiedAnthropoCompTable);
    sectionsChildren.push(new Paragraph({ spacing: { after: 40 } }));

    if (somatotype.hasAnyData) {
    let somatoBytes: Uint8Array | null = null;
    try {
      const dataUrl = await getSomatocartaPngDataUrl(somatotype, 600);
      if (dataUrl) {
        const bytes = dataUrlToUint8Array(dataUrl);
        if (bytes.length > 0) {
          somatoBytes = bytes;
        }
      }
    } catch (err) {
      console.error('Error generating Somatocarta PNG for Word:', err);
    }

    const hasImg = !!somatoBytes;

    const somatoTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: 'C7D2FE' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'C7D2FE' },
        left: { style: BorderStyle.SINGLE, size: 4, color: 'C7D2FE' },
        right: { style: BorderStyle.SINGLE, size: 4, color: 'C7D2FE' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'E0E7FF' },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      },
      rows: [
        // Fila 1: Banner de Título (Sin la palabra ISAK)
        new TableRow({
          children: [
            new TableCell({
              columnSpan: hasImg ? 2 : 1,
              shading: { fill: '4338CA', type: ShadingType.CLEAR }, // indigo-700
              margins: { top: 60, bottom: 60, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'SOMATOTIPO (MÉTODO HEATH-CARTER)',
                      bold: true,
                      size: 15,
                      color: 'FFFFFF',
                      font: 'Helvetica',
                    }),
                    ...(somatotype.x !== null && somatotype.y !== null
                      ? [
                          new TextRun({
                            text: `    |    Somatocarta: X = ${somatotype.x.toFixed(1)}, Y = ${somatotype.y.toFixed(1)}`,
                            size: 13,
                            color: 'E0E7FF',
                            font: 'Helvetica',
                          }),
                        ]
                      : []),
                  ],
                }),
              ],
            }),
          ],
        }),

        // Fila 2: Contenido
        new TableRow({
          children: hasImg
            ? [
                // Columna 1: Imagen de la Somatocarta
                new TableCell({
                  width: { size: 38, type: WidthType.PERCENTAGE },
                  shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
                  margins: { top: 70, bottom: 70, left: 100, right: 100 },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new ImageRun({
                          type: 'png',
                          data: somatoBytes!,
                          transformation: { width: 210, height: 210 },
                        }),
                      ],
                    }),
                  ],
                }),

                // Columna 2: Componentes, Traducción e Interpretación
                new TableCell({
                  width: { size: 62, type: WidthType.PERCENTAGE },
                  shading: { fill: 'EEF2FF', type: ShadingType.CLEAR }, // indigo-50
                  margins: { top: 70, bottom: 70, left: 140, right: 140 },
                  children: [
                    // Componentes (Línea 1 del ejemplo)
                    new Paragraph({
                      children: [
                        new TextRun({ text: '1. Endomorfia: ', bold: true, size: 18, color: 'B45309', font: 'Helvetica' }),
                        new TextRun({ text: `${somatotype.endoFormatted}     |    `, bold: true, size: 18, color: '0F172A', font: 'Helvetica' }),
                        new TextRun({ text: '2. Mesomorfia: ', bold: true, size: 18, color: '0369A1', font: 'Helvetica' }),
                        new TextRun({ text: `${somatotype.mesoFormatted}    |   `, bold: true, size: 18, color: '0F172A', font: 'Helvetica' }),
                        new TextRun({ text: '3. Ectomorfia: ', bold: true, size: 18, color: '7E22CE', font: 'Helvetica' }),
                        new TextRun({ text: `${somatotype.ectoFormatted}`, bold: true, size: 18, color: '0F172A', font: 'Helvetica' }),
                      ],
                    }),

                    // Clasificación (Línea 2) e Interpretación funcional (Línea 3) y Frase de escalas (Línea 4)
                    ...(somatotype.classification
                      ? [
                          new Paragraph({
                            spacing: { before: 40 },
                            children: [
                              new TextRun({
                                text: 'Clasificación: ',
                                bold: true,
                                size: 18,
                                color: '4338CA',
                                font: 'Helvetica',
                              }),
                              new TextRun({
                                text: `${somatotype.classification.name} `,
                                bold: true,
                                size: 18,
                                color: '1E1B4B',
                                font: 'Helvetica',
                              }),
                              new TextRun({
                                text: `(${somatotype.endoFormatted} - ${somatotype.mesoFormatted} - ${somatotype.ectoFormatted})`,
                                bold: true,
                                size: 17,
                                color: '475569',
                                font: 'Helvetica',
                              }),
                            ],
                          }),
                          new Paragraph({
                            spacing: { before: 30 },
                            children: [
                              new TextRun({
                                text: 'Interpretación funcional: ',
                                bold: true,
                                size: 16,
                                color: '1E293B',
                                font: 'Helvetica',
                              }),
                              new TextRun({
                                text: somatotype.classification.description,
                                size: 16,
                                color: '334155',
                                font: 'Helvetica',
                              }),
                            ],
                          }),
                          ...(somatotype.scaleSummaryText
                            ? [
                                new Paragraph({
                                  spacing: { before: 30 },
                                  children: [
                                    new TextRun({
                                      text: `"${somatotype.scaleSummaryText}"`,
                                      italics: true,
                                      size: 16,
                                      color: '1E293B',
                                      font: 'Helvetica',
                                    }),
                                  ],
                                }),
                              ]
                            : []),
                        ]
                      : [
                          new Paragraph({
                            spacing: { before: 40 },
                            children: [
                              new TextRun({
                                text: `Variables antropométricas capturadas: ${somatotype.completedVariablesCount}/10`,
                                size: 16,
                                color: '64748B',
                                font: 'Helvetica',
                              }),
                            ],
                          }),
                        ]),
                  ],
                }),
              ]
            : [
                // Fallback sin imagen
                new TableCell({
                  shading: { fill: 'EEF2FF', type: ShadingType.CLEAR },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: '1. Endomorfia: ', bold: true, size: 18, color: 'B45309', font: 'Helvetica' }),
                        new TextRun({ text: `${somatotype.endoFormatted}     |    `, bold: true, size: 18, color: '0F172A', font: 'Helvetica' }),
                        new TextRun({ text: '2. Mesomorfia: ', bold: true, size: 18, color: '0369A1', font: 'Helvetica' }),
                        new TextRun({ text: `${somatotype.mesoFormatted}    |   `, bold: true, size: 18, color: '0F172A', font: 'Helvetica' }),
                        new TextRun({ text: '3. Ectomorfia: ', bold: true, size: 18, color: '7E22CE', font: 'Helvetica' }),
                        new TextRun({ text: `${somatotype.ectoFormatted}`, bold: true, size: 18, color: '0F172A', font: 'Helvetica' }),
                      ],
                    }),
                    ...(somatotype.classification
                      ? [
                          new Paragraph({
                            spacing: { before: 40 },
                            children: [
                              new TextRun({ text: 'Clasificación: ', bold: true, size: 18, color: '4338CA', font: 'Helvetica' }),
                              new TextRun({ text: `${somatotype.classification.name} `, bold: true, size: 18, color: '1E1B4B', font: 'Helvetica' }),
                              new TextRun({
                                text: `(${somatotype.endoFormatted} - ${somatotype.mesoFormatted} - ${somatotype.ectoFormatted})`,
                                bold: true,
                                size: 17,
                                color: '475569',
                                font: 'Helvetica',
                              }),
                            ],
                          }),
                          new Paragraph({
                            spacing: { before: 30 },
                            children: [
                              new TextRun({ text: 'Interpretación funcional: ', bold: true, size: 16, color: '1E293B', font: 'Helvetica' }),
                              new TextRun({ text: somatotype.classification.description, size: 16, color: '334155', font: 'Helvetica' }),
                            ],
                          }),
                          ...(somatotype.scaleSummaryText
                            ? [
                                new Paragraph({
                                  spacing: { before: 30 },
                                  children: [
                                    new TextRun({ text: `"${somatotype.scaleSummaryText}"`, italics: true, size: 16, color: '1E293B', font: 'Helvetica' }),
                                  ],
                                }),
                              ]
                            : []),
                        ]
                      : []),
                  ],
                }),
              ],
        }),
      ],
    });

    sectionsChildren.push(somatoTable);
    sectionsChildren.push(new Paragraph({ spacing: { after: 40 } }));
  }
}

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
                    new TextRun({ text: 'Indicaciones y notas del paciente: ', bold: true, size: 18, color: '713F12', font: 'Helvetica' }),
                    new TextRun({ text: userNotes, size: 18, color: '713F12', font: 'Helvetica' }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    sectionsChildren.push(notesTable);
    sectionsChildren.push(new Paragraph({ spacing: { after: 50 } }));
  }

  // Salto de página para que los menús y recetas comiencen nítidamente en la hoja 2
  sectionsChildren.push(new Paragraph({ children: [new PageBreak()] }));

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
    const mealNameUpper = meal.mealName.toUpperCase();
    let mealTitleSize = 23; // 11.5pt
    if (mealNameUpper.length > 35) {
      mealTitleSize = 19; // 9.5pt
    } else if (mealNameUpper.length > 22) {
      mealTitleSize = 21; // 10.5pt
    }

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
              margins: { top: 80, bottom: 80, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: mealNameUpper,
                      bold: true,
                      size: mealTitleSize,
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
    sectionsChildren.push(new Paragraph({ spacing: { after: 60 } }));

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

      // Dinámico: ajusta tamaño de letra si el título de la comida es largo
      const rawTitle = cleanSpacing(opt.title || 'Menú sugerido');
      const titleFull = `OPCIÓN ${letter}: ${rawTitle}`;
      let optTitleSize = 22; // 11pt
      if (titleFull.length > 70) {
        optTitleSize = 17; // 8.5pt
      } else if (titleFull.length > 50) {
        optTitleSize = 19; // 9.5pt
      } else if (titleFull.length > 35) {
        optTitleSize = 21; // 10.5pt
      }

      const optChildren: Paragraph[] = [
        // Title: OPCIÓN A: Title (bold, color #0D3141, identical to PDF)
        new Paragraph({
          spacing: { after: 30 },
          children: [
            new TextRun({
              text: titleFull,
              bold: true,
              size: optTitleSize,
              color: '0D3141',
              font: 'Helvetica',
            }),
          ],
        }),
      ];

      if (opt.description) {
        const cleanDesc = cleanSpacing(opt.description);
        if (cleanDesc) {
          optChildren.push(
            new Paragraph({
              spacing: { before: 10, after: 30 },
              children: [
                new TextRun({
                  text: cleanDesc,
                  size: 17,
                  color: '334155',
                  font: 'Helvetica',
                }),
              ],
            })
          );
        }
      }

      // Ingredients List: • {portion} {name} [{group} · {eq}] (espaciado cuidado y compacto sin espacios extras)
      if (opt.ingredients && opt.ingredients.length > 0) {
        opt.ingredients.forEach((ing) => {
          const displayPortion = cleanSpacing(parseAndScalePortion(ing.exactPortion, ing.equivalentsCount));
          const foodNameClean = cleanSpacing(ing.foodName);
          const trueGroup = ing.smaeGroup || detectTrueSMAEGroup(ing.foodName);
          const groupBadge = getGroupBadgeConfig(trueGroup);
          const role = ing.role || detectIngredientRole(ing.foodName, trueGroup);
          const isFree = groupBadge.shortName === 'Libre / Sazón' || (Number(ing.equivalentsCount) || 0) === 0;

          let roleTag = '';
          if (role === 'coccion') roleTag = ' (Cocción)';
          else if (role === 'topping') roleTag = ' (Topping)';
          else if (role === 'sazon') roleTag = ' (Sazón)';

          const eqText = !isFree && ing.equivalentsCount ? ` · ${ing.equivalentsCount} eq` : '';
          const groupTag = `[${groupBadge.shortName}${roleTag}${eqText}]`;
          const groupColor = getWordGroupColor(groupBadge.shortName);

          const ingParagraphChildren: TextRun[] = [
            new TextRun({ text: '• ', bold: true, color: '059669', size: 18, font: 'Helvetica' }),
          ];

          if (displayPortion) {
            ingParagraphChildren.push(
              new TextRun({ text: `${displayPortion} `, bold: true, size: 18, color: '0F172A', font: 'Helvetica' })
            );
          }

          ingParagraphChildren.push(
            new TextRun({ text: `${foodNameClean} `, size: 18, color: '1E293B', font: 'Helvetica' }),
            new TextRun({
              text: groupTag,
              bold: true,
              size: 16,
              color: groupColor,
              font: 'Helvetica',
            })
          );

          if (ing.isPreferred) {
            ingParagraphChildren.push(
              new TextRun({
                text: ' ★ Preferido',
                bold: true,
                size: 14,
                color: 'D97706',
                font: 'Helvetica',
              })
            );
          }

          optChildren.push(
            new Paragraph({
              spacing: { before: 10, after: 10 },
              children: ingParagraphChildren,
            })
          );
        });
      }

      // Preparation: sin cursiva, color #475569 (identical to PDF)
      if (opt.preparation) {
        const cleanPrep = cleanSpacing(opt.preparation);
        if (cleanPrep) {
          optChildren.push(
            new Paragraph({
              spacing: { before: 40, after: 20 },
              children: [
                new TextRun({ text: 'Preparación: ', bold: true, size: 17, color: '475569', font: 'Helvetica' }),
                new TextRun({ text: cleanPrep, size: 17, color: '475569', font: 'Helvetica' }),
              ],
            })
          );
        }
      }

      // Tip: color #B45309 (amber-700, identical to PDF)
      if (opt.nutritionistTip) {
        const cleanTip = cleanSpacing(opt.nutritionistTip);
        if (cleanTip) {
          optChildren.push(
            new Paragraph({
              spacing: { before: 20, after: 20 },
              children: [
                new TextRun({ text: 'Tip: ', bold: true, size: 17, color: 'B45309', font: 'Helvetica' }),
                new TextRun({ text: cleanTip, size: 17, color: 'B45309', font: 'Helvetica' }),
              ],
            })
          );
        }
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
                margins: { top: 90, bottom: 90, left: 140, right: 140 },
                children: optChildren,
              }),
            ],
          }),
        ],
      });

      sectionsChildren.push(optionCardTable);
      sectionsChildren.push(new Paragraph({ spacing: { after: 50 } }));
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

    sectionsChildren.push(new Paragraph({ spacing: { after: 50 } }));
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
              top: 567, // 10mm
              bottom: 567, // 10mm
              left: 708, // 12.5mm
              right: 708, // 12.5mm
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
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    if (anchor.parentNode) {
      document.body.removeChild(anchor);
    }
    URL.revokeObjectURL(url);
  }, 2500);
}

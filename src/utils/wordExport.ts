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
import { normalizeOptionSelection, calculateRowTotal, calculateColumnTotal, calculateGrandTotalEquivalents } from './nutritionCalculations';
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
  // 2. PATIENT INFO & MACRO CARD (Identical to PDF)
  // Left: #F8FAFC, Right: #ECFDF5 with border #A7F3D0
  // ==========================================
  const dateStr = patientInfo.date || new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

  const patientLeftCell = new TableCell({
    width: { size: 55, type: WidthType.PERCENTAGE },
    shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
    margins: { top: 140, bottom: 140, left: 180, right: 140 },
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: 'Paciente: ', bold: true, size: 21, color: '0F172A', font: 'Helvetica' }),
          new TextRun({ text: patientInfo.name || 'Paciente', bold: true, size: 21, color: '0F172A', font: 'Helvetica' }),
        ],
      }),
      new Paragraph({
        spacing: { before: 60 },
        children: [
          new TextRun({ text: 'Fecha: ', bold: true, size: 19, color: '475569', font: 'Helvetica' }),
          new TextRun({ text: dateStr, size: 19, color: '475569', font: 'Helvetica' }),
        ],
      }),
      ...(patientInfo.goal
        ? [
            new Paragraph({
              spacing: { before: 40 },
              children: [
                new TextRun({ text: 'Objetivo: ', bold: true, size: 19, color: '475569', font: 'Helvetica' }),
                new TextRun({ text: patientInfo.goal, size: 19, color: '475569', font: 'Helvetica' }),
              ],
            }),
          ]
        : []),
    ],
  });

  const macrosRightCell = new TableCell({
    width: { size: 45, type: WidthType.PERCENTAGE },
    shading: { fill: 'ECFDF5', type: ShadingType.CLEAR }, // emerald-50 identical to PDF
    margins: { top: 140, bottom: 140, left: 180, right: 180 },
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: 'Energía: ', bold: true, size: 21, color: '0D3141', font: 'Helvetica' }),
          new TextRun({ text: `${Math.round(macros.totalKcal)} kcal`, bold: true, size: 21, color: '0D3141', font: 'Helvetica' }),
        ],
      }),
      new Paragraph({
        spacing: { before: 50 },
        children: [
          new TextRun({ text: 'Proteínas: ', bold: true, size: 19, color: '0D3141', font: 'Helvetica' }),
          new TextRun({
            text: `${Math.round(macros.totalProteinGrams)}g (${Math.round(macros.proteinKcalPercent)}%)`,
            size: 19,
            color: '0D3141',
            font: 'Helvetica',
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 30 },
        children: [
          new TextRun({ text: 'Lípidos: ', bold: true, size: 19, color: '0D3141', font: 'Helvetica' }),
          new TextRun({
            text: `${Math.round(macros.totalLipidsGrams)}g (${Math.round(macros.lipidsKcalPercent)}%)`,
            size: 19,
            color: '0D3141',
            font: 'Helvetica',
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 30 },
        children: [
          new TextRun({ text: 'Carbohidratos: ', bold: true, size: 19, color: '0D3141', font: 'Helvetica' }),
          new TextRun({
            text: `${Math.round(macros.totalCarbsGrams)}g (${Math.round(macros.carbsKcalPercent)}%)`,
            size: 19,
            color: '0D3141',
            font: 'Helvetica',
          }),
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
  sectionsChildren.push(new Paragraph({ spacing: { after: 160 } }));

  // ==========================================
  // 3. RECOMENDACIONES GENERALES (Identical to PDF)
  // Yellow background #FEFCE8, Border #FEF08A, Text #713F12
  // ==========================================
  const generalNotes = plan.patientNotes || patientInfo.notes;
  if (generalNotes) {
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
                    new TextRun({ text: 'Recomendaciones: ', bold: true, italics: true, size: 19, color: '713F12', font: 'Helvetica' }),
                    new TextRun({ text: generalNotes, italics: true, size: 19, color: '713F12', font: 'Helvetica' }),
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
                      text: 'CUADRO DE DISTRIBUCIÓN DE EQUIVALENTES (SMAE 5TA EDICIÓN)',
                      bold: true,
                      size: 20,
                      color: 'FFFFFF',
                      font: 'Helvetica',
                    }),
                    ...(patientInfo.name && patientInfo.name.trim().length > 0 ? [
                      new TextRun({
                        text: `   |   Paciente: ${patientInfo.name.trim()}`,
                        bold: true,
                        size: 18,
                        color: 'FDE047',
                        font: 'Helvetica',
                      }),
                    ] : []),
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

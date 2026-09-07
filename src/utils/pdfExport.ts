import jsPDF from 'jspdf';
import { GeneratedPlan, PatientInfo, MacroNutrientSummary, MealOptionLetter } from '../types';
import { normalizeOptionSelection, calculateRowTotal, calculateColumnTotal, calculateGrandTotalEquivalents } from './nutritionCalculations';
import { TableGridState, SMAE_GROUPS, MEAL_COLUMNS } from '../data/smaeData';

export function exportPlanToPdfNative(
  plan: GeneratedPlan,
  patientInfo: PatientInfo,
  macros: MacroNutrientSummary,
  fileName: string = 'Plan_Nutricional_SMAE.pdf',
  selectedOptions: Record<string, MealOptionLetter[] | string> = {},
  tableState?: TableGridState
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 15) {
      doc.addPage();
      y = margin;
      drawHeaderSmall();
    }
  };

  const drawHeaderSmall = () => {
    doc.setFillColor(13, 49, 65); // pantone #0d3141
    doc.rect(margin, y, contentWidth, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('PLAN NUTRICIONAL - SISTEMA MEXICANO DE ALIMENTOS EQUIVALENTES (SMAE 5TA ED.)', margin + 3, y + 6.5);
    y += 14;
  };

  // --- 1. Main Header Banner ---
  doc.setFillColor(13, 49, 65); // pantone #0d3141
  doc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('PLAN NUTRICIONAL PERSONALIZADO', margin + 6, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(209, 250, 229); // emerald-100
  doc.text('Calculado bajo el Sistema Mexicano de Alimentos Equivalentes (SMAE 5ta Edición)', margin + 6, y + 18);

  y += 30;

  // --- 2. Patient Info & Macro Card ---
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'FD');

  // Left column: Patient details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(`Paciente: ${patientInfo.name || 'Paciente'}`, margin + 4, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(`Fecha: ${patientInfo.date || new Date().toISOString().split('T')[0]}`, margin + 4, y + 16);
  if (patientInfo.goal) {
    doc.text(`Objetivo: ${patientInfo.goal}`, margin + 4, y + 24);
  }

  // Right column: Energy & Macros
  const macroX = margin + contentWidth - 75;
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.roundedRect(macroX, y + 2, 71, 30, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(13, 49, 65); // pantone #0d3141
  doc.text(`Energía: ${macros.totalKcal} kcal`, macroX + 4, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(13, 49, 65); // pantone #0d3141
  doc.text(`Proteínas: ${macros.totalProteinGrams}g (${macros.proteinKcalPercent}%)`, macroX + 4, y + 16);
  doc.text(`Lípidos: ${macros.totalLipidsGrams}g (${macros.lipidsKcalPercent}%)`, macroX + 4, y + 22);
  doc.text(`Carbohidratos: ${macros.totalCarbsGrams}g (${macros.carbsKcalPercent}%)`, macroX + 4, y + 28);

  y += 38;

  // General Notes if present
  if (plan.patientNotes) {
    checkPageBreak(25);
    doc.setFillColor(254, 252, 232); // yellow-50
    doc.setDrawColor(254, 240, 138); // yellow-200
    doc.roundedRect(margin, y, contentWidth, 16, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(113, 63, 18); // yellow-900
    const splitNotes = doc.splitTextToSize(`Recomendaciones: ${plan.patientNotes}`, contentWidth - 8);
    doc.text(splitNotes, margin + 4, y + 6);
    y += Math.max(16, splitNotes.length * 4.5 + 8);
  }

  // --- 2.5 Cuadro de Distribución de Equivalentes (SMAE 5ª Edición) ---
  if (tableState) {
    const allGroups = SMAE_GROUPS;
    checkPageBreak(35);

    // Section Title Banner
    doc.setFillColor(13, 49, 65); // #0d3141
    doc.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('CUADRO DE DISTRIBUCIÓN DE EQUIVALENTES (SMAE 5TA EDICIÓN)', margin + 4, y + 5.2);

    if (patientInfo.name && patientInfo.name.trim().length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(253, 224, 71); // amber-300
      doc.text(`Paciente: ${patientInfo.name.trim()}`, margin + contentWidth - 4, y + 5.2, { align: 'right' });
    }
    y += 10;

    // Table Column Dimensions: total width = 182
    const colWGroup = 62;
    const colWMeal = 16; // 5 meals = 80
    const colWEq = 20;
    const colWKcal = 20; // 62 + 80 + 20 + 20 = 182

    const drawTableHeader = () => {
      doc.setFillColor(241, 245, 249); // slate-100
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.rect(margin, y, contentWidth, 6, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);

      let curX = margin;
      doc.text('Grupo de Alimento', curX + 2, y + 4.2);
      curX += colWGroup;

      const mealHeaders = ['Desayuno', 'Col. 1', 'Comida', 'Col. 2', 'Cena'];
      mealHeaders.forEach((mh) => {
        doc.text(mh, curX + colWMeal / 2, y + 4.2, { align: 'center' });
        curX += colWMeal;
      });

      doc.text('Total Eq.', curX + colWEq / 2, y + 4.2, { align: 'center' });
      curX += colWEq;
      doc.text('Kcal', curX + colWKcal / 2, y + 4.2, { align: 'center' });

      y += 6;
    };

    // Header Row
    checkPageBreak(12);
    drawTableHeader();

    // Table Rows: all 17 SMAE groups
    allGroups.forEach((group, idx) => {
      if (y + 6 > pageHeight - margin - 10) {
        doc.addPage();
        y = margin;
        drawTableHeader();
      }

      const rowTotal = calculateRowTotal(group.id, tableState);
      const groupKcal = Math.round(rowTotal * group.kcal);
      const isEven = idx % 2 === 0;

      if (isEven) {
        doc.setFillColor(255, 255, 255);
      } else {
        doc.setFillColor(248, 250, 252); // slate-50
      }
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.rect(margin, y, contentWidth, 5.2, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);

      let rowX = margin;
      // Group Name: full name adjusted to fit column without truncation
      const splitName = doc.splitTextToSize(group.name, colWGroup - 4);
      if (splitName.length > 1) {
        doc.setFontSize(6.2);
        doc.text(splitName[0], rowX + 2, y + 2.3);
        doc.text(splitName[1], rowX + 2, y + 4.5);
      } else {
        doc.setFontSize(7.2);
        doc.text(splitName[0], rowX + 2, y + 3.7);
      }
      rowX += colWGroup;

      // 5 Meals
      MEAL_COLUMNS.forEach((col) => {
        const val = tableState[group.id]?.[col.key] || 0;
        doc.setFont('helvetica', val > 0 ? 'bold' : 'normal');
        doc.setTextColor(val > 0 ? 6 : 148, val > 0 ? 78 : 163, val > 0 ? 59 : 184); // emerald-800 or slate-400
        doc.text(val > 0 ? `${val}` : '-', rowX + colWMeal / 2, y + 3.7, { align: 'center' });
        rowX += colWMeal;
      });

      // Row Total Eq
      doc.setFont('helvetica', rowTotal > 0 ? 'bold' : 'normal');
      doc.setTextColor(rowTotal > 0 ? 6 : 148, rowTotal > 0 ? 78 : 163, rowTotal > 0 ? 59 : 184);
      doc.text(rowTotal > 0 ? `${rowTotal}` : '0', rowX + colWEq / 2, y + 3.7, { align: 'center' });
      rowX += colWEq;

      // Kcal
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(groupKcal > 0 ? 71 : 148, groupKcal > 0 ? 85 : 163, groupKcal > 0 ? 105 : 184);
      doc.text(groupKcal > 0 ? `${groupKcal}` : '-', rowX + colWKcal / 2, y + 3.7, { align: 'center' });

      y += 5.2;
    });

    // Total Row
    if (y + 7 > pageHeight - margin - 10) {
      doc.addPage();
      y = margin;
    }
    doc.setFillColor(13, 49, 65); // #0d3141
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);

    let totX = margin;
    doc.text('TOTAL POR COMIDA', totX + 2, y + 4.2);
    totX += colWGroup;

    MEAL_COLUMNS.forEach((col) => {
      const colTotal = calculateColumnTotal(col.key, tableState);
      doc.text(`${colTotal}`, totX + colWMeal / 2, y + 4.2, { align: 'center' });
      totX += colWMeal;
    });

    const grandTotalEq = calculateGrandTotalEquivalents(tableState);
    doc.setTextColor(253, 224, 71); // amber-300
    doc.text(`${grandTotalEq} eq`, totX + colWEq / 2, y + 4.2, { align: 'center' });
    totX += colWEq;

    doc.setTextColor(255, 255, 255);
    doc.text(`${Math.round(macros.totalKcal)}`, totX + colWKcal / 2, y + 4.2, { align: 'center' });

    y += 10;
  }

  // --- 3. Render Meal Times ---
  plan.meals.forEach((meal, idx) => {
    const hasEquivalents = Boolean(
      meal.totalEquivalentsSummary &&
        meal.totalEquivalentsSummary.length > 0 &&
        meal.totalEquivalentsSummary.some((eq) => (Number(eq.quantity) || 0) > 0)
    );

    const hasIngredientsA = Boolean(
      meal.optionA &&
        meal.optionA.ingredients &&
        meal.optionA.ingredients.length > 0
    );

    const hasIngredientsB = Boolean(
      meal.optionB &&
        meal.optionB.ingredients &&
        meal.optionB.ingredients.length > 0
    );

    const hasIngredientsC = Boolean(
      meal.optionC &&
        meal.optionC.ingredients &&
        meal.optionC.ingredients.length > 0
    );

    const hasMealValues = hasEquivalents || hasIngredientsA || hasIngredientsB || hasIngredientsC;

    // Skip meal if it has no assigned equivalents or foods
    if (!hasMealValues) return;

    checkPageBreak(40);

    // Meal Header
    doc.setFillColor(13, 49, 65); // pantone #0d3141
    doc.roundedRect(margin, y, contentWidth, 9, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(`${meal.mealName.toUpperCase()}`, margin + 4, y + 6.5);

    y += 13;

    // Render Option A, B, and C
    const renderOption = (option: typeof meal.optionA, letter: 'A' | 'B' | 'C') => {
      checkPageBreak(30);

      const isA = letter === 'A';
      const isB = letter === 'B';
      // Colors: A = emerald-50, B = teal-50, C = sky-50
      if (isA) {
        doc.setFillColor(240, 253, 244);
        doc.setDrawColor(167, 243, 208);
      } else if (isB) {
        doc.setFillColor(240, 253, 250);
        doc.setDrawColor(153, 246, 228);
      } else {
        doc.setFillColor(240, 249, 255);
        doc.setDrawColor(186, 230, 253);
      }
      doc.setLineWidth(0.2);

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(13, 49, 65); // pantone #0d3141
      doc.text(`OPCIÓN ${letter}: ${option.title || 'Menú sugerido'}`, margin + 2, y + 4);
      y += 8;

      // Ingredients
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(30, 41, 59);

      if (option.ingredients && option.ingredients.length > 0) {
        option.ingredients.forEach((ing) => {
          checkPageBreak(6);
          doc.text(`  •  ${ing.exactPortion} ${ing.foodName}`, margin + 3, y);
          y += 5;
        });
      }

      // Preparation
      if (option.preparation) {
        checkPageBreak(12);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        const splitPrep = doc.splitTextToSize(`Preparación: ${option.preparation}`, contentWidth - 8);
        doc.text(splitPrep, margin + 4, y);
        y += splitPrep.length * 4.5 + 2;
      }

      // Tip
      if (option.nutritionistTip) {
        checkPageBreak(10);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(180, 83, 9); // amber-700
        const splitTip = doc.splitTextToSize(`Tip: ${option.nutritionistTip}`, contentWidth - 8);
        doc.text(splitTip, margin + 4, y);
        y += splitTip.length * 4.5 + 2;
      }

      y += 1.5;
    };

    const currentSelection = normalizeOptionSelection(selectedOptions[meal.mealName]);

    if (currentSelection.includes('A') && hasIngredientsA) {
      renderOption(meal.optionA, 'A');
    }
    if (currentSelection.includes('B') && hasIngredientsB) {
      renderOption(meal.optionB, 'B');
    }
    if (currentSelection.includes('C') && hasIngredientsC && meal.optionC) {
      renderOption(meal.optionC, 'C');
    }

    y += 3.5;
  });

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('Generado por Sistema Nutricional SMAE Pro 5ta Edición', margin, pageHeight - 8);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 20, pageHeight - 8);
  }

  doc.save(fileName);
}

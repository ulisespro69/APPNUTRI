import * as jspdfModule from 'jspdf';
import { GeneratedPlan, PatientInfo, MacroNutrientSummary, MealOptionLetter } from '../types';
import { normalizeOptionSelection, calculateRowTotal, calculateColumnTotal, calculateGrandTotalEquivalents, calculateBmiInfo, calculateSkinfoldSums, calculateHeathCarterSomatotype } from './nutritionCalculations';
import { TableGridState, SMAE_GROUPS, MEAL_COLUMNS } from '../data/smaeData';
import { getSomatocartaPngDataUrl } from './somatocartaGenerator';
import { parseAndScalePortion, getGroupBadgeConfig, detectTrueSMAEGroup, detectIngredientRole, cleanSpacing } from './smaeRectifier';

const JsPdfConstructor: any = (jspdfModule as any).jsPDF || (jspdfModule as any).default || jspdfModule;

function getGroupPdfColor(shortName: string): [number, number, number] {
  switch (shortName) {
    case 'Verdura':
      return [4, 120, 87]; // emerald-700
    case 'Fruta':
      return [180, 83, 9]; // amber-700
    case 'Cereales s/g':
      return [133, 77, 14]; // yellow-800
    case 'Cereales c/g':
      return [146, 64, 14]; // amber-800
    case 'Leguminosas':
      return [87, 83, 78]; // stone-600
    case 'AOA Muy Bajo':
    case 'AOA Bajo':
      return [190, 18, 60]; // rose-700
    case 'AOA Moderado':
      return [194, 65, 12]; // orange-700
    case 'AOA Alto':
      return [185, 28, 28]; // red-700
    case 'Leche Descremada':
    case 'Leche Semidescr.':
      return [3, 105, 161]; // sky-700
    case 'Leche Entera':
      return [29, 78, 216]; // blue-700
    case 'Leche c/ Azúcar':
      return [67, 56, 202]; // indigo-700
    case 'Grasas s/ Prot':
      return [77, 124, 15]; // lime-700
    case 'Grasas c/ Prot':
      return [15, 118, 110]; // teal-700
    case 'Azúcar s/ Grasa':
      return [126, 34, 206]; // purple-700
    case 'Azúcar c/ Grasa':
      return [162, 28, 175]; // fuchsia-700
    case 'Libre / Sazón':
      return [100, 116, 139]; // slate-500
    default:
      return [71, 85, 105]; // slate-600
  }
}

export async function exportPlanToPdfNative(
  plan: GeneratedPlan,
  patientInfo: PatientInfo,
  macros: MacroNutrientSummary,
  fileName: string = 'Plan_Nutricional_SMAE.pdf',
  selectedOptions: Record<string, MealOptionLetter[] | string> = {},
  tableState?: TableGridState
) {
  const doc = new JsPdfConstructor({
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

  y += 26;

  // --- 2. Marco Clínico Superior: Expediente del Paciente y Tabla de Kcal/Macronutrientes ---
  const frameHeight = 33;
  const leftBoxWidth = 88;
  const boxGap = 4;
  const rightBoxWidth = contentWidth - leftBoxWidth - boxGap;
  const rightBoxX = margin + leftBoxWidth + boxGap;

  // Cuadro 1 (Izquierdo): Expediente del Paciente y Prescripción
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, y, leftBoxWidth, frameHeight, 2, 2, 'FD');

  // Banner cabecera Expediente
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(margin, y, leftBoxWidth, 6.5, 2, 2, 'F');
  doc.rect(margin, y + 3.5, leftBoxWidth, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('EXPEDIENTE CLÍNICO DEL PACIENTE', margin + 3.5, y + 4.5);

  const leftX = margin + 4;

  // Datos del expediente
  const patientDisplayName = cleanSpacing(patientInfo.name && patientInfo.name.trim() ? patientInfo.name.trim() : 'Plan Personalizado');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const splitPatientName = doc.splitTextToSize(`Paciente: ${patientDisplayName}`, leftBoxWidth - 8);
  doc.text(splitPatientName[0], leftX, y + 12);

  const dateStr = patientInfo.date
    ? new Date(patientInfo.date + 'T12:00:00').toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Fecha de valoración: ${dateStr}`, leftX, y + 17.5);

  // Objetivo o Prescripción: solo se imprime si el usuario lo ingresó en el div correspondiente
  const hasUserGoal = Boolean(patientInfo.goal && patientInfo.goal.trim());
  if (hasUserGoal) {
    const clinicalGoal = cleanSpacing(patientInfo.goal!.trim());
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(4, 120, 87); // emerald-700
    const splitGoal = doc.splitTextToSize(`Objetivo: ${clinicalGoal}`, leftBoxWidth - 8);
    doc.text(splitGoal[0], leftX, y + 23);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text('Prescripción bajo Sistema Mexicano de Equivalentes (SMAE)', leftX, y + 28.5);
  } else {
    // Si no se escribió objetivo, no se agrega texto simulado para eliminar espacios innecesarios
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text('Prescripción bajo Sistema Mexicano de Equivalentes (SMAE)', leftX, y + 23.5);
  }

  // Cuadro 2 (Derecho): Tabla de Kcal, Proteínas, Grasas y HC independiente
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.35);
  doc.roundedRect(rightBoxX, y, rightBoxWidth, frameHeight, 2, 2, 'FD');

  // Banner cabecera Cuadro de Macronutrientes
  doc.setFillColor(15, 76, 92); // #0f4c5c
  doc.roundedRect(rightBoxX, y, rightBoxWidth, 6.5, 2, 2, 'F');
  doc.rect(rightBoxX, y + 3.5, rightBoxWidth, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('TABLA DE KCAL Y MACRONUTRIENTES', rightBoxX + 3.5, y + 4.5);

  // Table header dentro del cuadro derecho
  const tableY = y + 8.5;
  const innerTableWidth = rightBoxWidth - 6;
  const innerTableX = rightBoxX + 3;

  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225);
  doc.rect(innerTableX, tableY, innerTableWidth, 4.8, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);
  doc.text('Nutriente', innerTableX + 2, tableY + 3.5);
  doc.text('Gramos', innerTableX + 33, tableY + 3.5);
  doc.text('Kcal', innerTableX + 51, tableY + 3.5);
  doc.text('% VET', innerTableX + 68, tableY + 3.5);

  // Table Rows
  const proteinKcal = Math.round(macros.totalProteinGrams * 4);
  const lipidsKcal = Math.round(macros.totalLipidsGrams * 9);
  const carbsKcal = Math.round(macros.totalCarbsGrams * 4);

  const macroRows = [
    { label: 'Kcal Totales', g: '—', kcal: `${Math.round(macros.totalKcal)}`, pct: '100%', bold: true },
    { label: 'Proteínas', g: `${macros.totalProteinGrams} g`, kcal: `${proteinKcal}`, pct: `${macros.proteinKcalPercent}%`, bold: false },
    { label: 'Grasas (Lípidos)', g: `${macros.totalLipidsGrams} g`, kcal: `${lipidsKcal}`, pct: `${macros.lipidsKcalPercent}%`, bold: false },
    { label: 'HC (Carbohidratos)', g: `${macros.totalCarbsGrams} g`, kcal: `${carbsKcal}`, pct: `${macros.carbsKcalPercent}%`, bold: false },
  ];

  let rowY = tableY + 4.8;
  macroRows.forEach((r, idx) => {
    const isEven = idx % 2 === 0;
    if (r.bold) {
      doc.setFillColor(236, 253, 245); // emerald-50
      doc.rect(innerTableX, rowY, innerTableWidth, 4.6, 'F');
    } else if (isEven) {
      doc.setFillColor(248, 250, 252);
      doc.rect(innerTableX, rowY, innerTableWidth, 4.6, 'F');
    }
    doc.setDrawColor(226, 232, 240);
    doc.rect(innerTableX, rowY, innerTableWidth, 4.6, 'S');

    doc.setFont('helvetica', r.bold ? 'bold' : 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(r.bold ? 15 : 51, r.bold ? 23 : 65, r.bold ? 42 : 85);

    doc.text(r.label, innerTableX + 2, rowY + 3.3);
    doc.text(r.g, innerTableX + 33, rowY + 3.3);
    doc.text(r.kcal, innerTableX + 51, rowY + 3.3);
    doc.text(r.pct, innerTableX + 68, rowY + 3.3);

    rowY += 4.6;
  });

  y += frameHeight + 3.0;

  // --- 2.2 CUADRO DE DISTRIBUCIÓN DE EQUIVALENTES (SMAE 5ª EDICIÓN) ---
  // En la primera hoja manteniendo el formato, diseño y proporciones idéntico a Word
  if (tableState) {
    const allGroups = SMAE_GROUPS;

    // Banner de Título del Cuadro de Equivalentes
    doc.setFillColor(13, 49, 65); // #0d3141
    doc.roundedRect(margin, y, contentWidth, 5.5, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('CUADRO DE DISTRIBUCIÓN DE EQUIVALENTES (SMAE 5ª EDICIÓN)', margin + 3.5, y + 3.9);
    y += 6.5;

    // Dimensiones de Columnas: Ancho total = 182mm (Margen 14mm en hoja A4 de 210mm)
    const colWGroup = 62;
    const colWMeal = 16; // 5 tiempos de comida = 80mm
    const colWEq = 20;
    const colWKcal = 20; // 62 + 80 + 20 + 20 = 182mm

    // Encabezado de la Tabla
    doc.setFillColor(241, 245, 249); // slate-100
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.rect(margin, y, contentWidth, 4.6, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);

    let curX = margin;
    doc.text('Grupo de Alimento', curX + 2, y + 3.3);
    curX += colWGroup;

    const mealHeaders = ['Desayuno', 'Col. 1', 'Comida', 'Col. 2', 'Cena'];
    mealHeaders.forEach((mh) => {
      doc.text(mh, curX + colWMeal / 2, y + 3.3, { align: 'center' });
      curX += colWMeal;
    });

    doc.text('Total Eq.', curX + colWEq / 2, y + 3.3, { align: 'center' });
    curX += colWEq;
    doc.text('Kcal', curX + colWKcal / 2, y + 3.3, { align: 'center' });

    y += 4.6;

    // Filas de los 17 Grupos Oficiales SMAE (proporción compacta de 3.8mm por fila)
    allGroups.forEach((group, idx) => {
      const rowTotal = calculateRowTotal(group.id, tableState);
      const groupKcal = Math.round(rowTotal * group.kcal);
      const isEven = idx % 2 === 0;

      if (isEven) {
        doc.setFillColor(255, 255, 255);
      } else {
        doc.setFillColor(248, 250, 252); // slate-50
      }
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.rect(margin, y, contentWidth, 3.8, 'FD');

      let rowX = margin;

      // Nombre del Grupo SMAE ajustado con precisión
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.4);
      doc.setTextColor(30, 41, 59);

      const splitName = doc.splitTextToSize(group.name, colWGroup - 4);
      if (splitName.length > 1) {
        doc.setFontSize(5.6);
        doc.text(splitName[0], rowX + 2, y + 1.8);
        doc.text(splitName[1], rowX + 2, y + 3.3);
      } else {
        doc.text(splitName[0], rowX + 2, y + 2.7);
      }
      rowX += colWGroup;

      // 5 Tiempos de Comida
      MEAL_COLUMNS.forEach((col) => {
        const val = tableState[group.id]?.[col.key] || 0;
        doc.setFont('helvetica', val > 0 ? 'bold' : 'normal');
        doc.setFontSize(6.6);
        doc.setTextColor(val > 0 ? 6 : 148, val > 0 ? 95 : 163, val > 0 ? 70 : 184); // emerald-700 o slate-400
        doc.text(val > 0 ? `${val}` : '-', rowX + colWMeal / 2, y + 2.7, { align: 'center' });
        rowX += colWMeal;
      });

      // Total de Equivalentes de la fila
      doc.setFont('helvetica', rowTotal > 0 ? 'bold' : 'normal');
      doc.setFontSize(6.6);
      doc.setTextColor(rowTotal > 0 ? 6 : 148, rowTotal > 0 ? 95 : 163, rowTotal > 0 ? 70 : 184);
      doc.text(rowTotal > 0 ? `${rowTotal}` : '0', rowX + colWEq / 2, y + 2.7, { align: 'center' });
      rowX += colWEq;

      // Kcal de la fila
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.4);
      doc.setTextColor(groupKcal > 0 ? 71 : 148, groupKcal > 0 ? 85 : 163, groupKcal > 0 ? 105 : 184);
      doc.text(groupKcal > 0 ? `${groupKcal}` : '-', rowX + colWKcal / 2, y + 2.7, { align: 'center' });

      y += 3.8;
    });

    // Fila de Totales Generales
    doc.setFillColor(13, 49, 65); // #0d3141
    doc.rect(margin, y, contentWidth, 4.8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(255, 255, 255);

    let totX = margin;
    doc.text('TOTAL POR COMIDA', totX + 2, y + 3.4);
    totX += colWGroup;

    MEAL_COLUMNS.forEach((col) => {
      const colTotal = calculateColumnTotal(col.key, tableState);
      doc.text(`${colTotal}`, totX + colWMeal / 2, y + 3.4, { align: 'center' });
      totX += colWMeal;
    });

    const grandTotalEq = calculateGrandTotalEquivalents(tableState);
    doc.setTextColor(253, 224, 71); // amber-300
    doc.text(`${grandTotalEq} eq`, totX + colWEq / 2, y + 3.4, { align: 'center' });
    totX += colWEq;

    doc.setTextColor(255, 255, 255);
    doc.text(`${Math.round(macros.totalKcal)}`, totX + colWKcal / 2, y + 3.4, { align: 'center' });

    y += 4.8 + 3.5;
  }

  // --- 2.3 TABLA UNIFICADA: VALORACIÓN ANTROPOMÉTRICA Y COMPOSICIÓN CORPORAL ---
  const somatotype = calculateHeathCarterSomatotype(patientInfo);
  const skinfoldSums = calculateSkinfoldSums(patientInfo.skinfolds);
  const hasBasicAnthropo = Boolean(patientInfo.weight || patientInfo.height || patientInfo.age || patientInfo.gender);
  const hasSkinfolds = (skinfoldSums.count6 || 0) > 0;
  const hasComposition = Boolean(
    patientInfo.fatPercent ||
    patientInfo.musclePercent ||
    patientInfo.bonePercent ||
    patientInfo.residualPercent
  );

  const hasAnthropoOrSomato = Boolean(
    hasBasicAnthropo ||
    hasSkinfolds ||
    hasComposition ||
    somatotype.hasAnyData
  );

  if (hasAnthropoOrSomato) {
    let unifiedTableHeight = 17.5;
    if (hasSkinfolds) unifiedTableHeight += 16.5;
    if (hasComposition) unifiedTableHeight += 20.0;

    checkPageBreak(unifiedTableHeight + 2.5);

    const bmiInfo = calculateBmiInfo(patientInfo.height, patientInfo.weight);
    const hStr = String(patientInfo.height || '').trim();
    const displayHeight = hStr
      ? /\d$/.test(hStr)
        ? parseFloat(hStr.replace(',', '.')) > 3
          ? `${hStr} cm`
          : `${hStr} m`
        : hStr
      : '—';

    // Contenedor principal de la tabla unificada
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.35);
    doc.roundedRect(margin, y, contentWidth, unifiedTableHeight, 2, 2, 'FD');

    // Encabezado Principal de la tabla unificada
    doc.setFillColor(15, 23, 42); // slate-900
    doc.roundedRect(margin, y, contentWidth, 5.5, 2, 2, 'F');
    doc.rect(margin, y + 2.5, contentWidth, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    const tableTitle = hasComposition
      ? 'VALORACIÓN ANTROPOMÉTRICA Y COMPOSICIÓN CORPORAL (MODELO 4 COMPONENTES)'
      : hasSkinfolds
      ? 'VALORACIÓN ANTROPOMÉTRICA Y PLIEGUES CUTÁNEOS'
      : 'VALORACIÓN ANTROPOMÉTRICA GENERAL';
    doc.text(tableTitle, margin + 3.5, y + 4.1);

    // --- Fila 1 de la tabla: Antropometría General (Sexo, Edad, Masa Corporal, Estatura, IMC) ---
    const anthropoParams = [
      { label: 'SEXO', value: patientInfo.gender ? String(patientInfo.gender) : '—', sub: '' },
      { label: 'EDAD', value: patientInfo.age ? `${patientInfo.age} años` : '—', sub: '' },
      {
        label: 'MASA CORPORAL (PESO)',
        value: patientInfo.weight
          ? `${patientInfo.weight}${String(patientInfo.weight).toLowerCase().includes('kg') ? '' : ' kg'}`
          : '—',
        sub: '',
      },
      { label: 'ESTATURA (TALLA)', value: String(displayHeight || '—'), sub: '' },
      {
        label: 'ÍNDICE MASA CORP. (IMC)',
        value: bmiInfo ? String(bmiInfo.formatted) : '—',
        sub: bmiInfo ? `(${bmiInfo.category})` : '',
      },
    ];

    const colW = contentWidth / anthropoParams.length;

    anthropoParams.forEach((param, idx) => {
      const colX = margin + idx * colW;
      // Línea divisoria vertical
      if (idx > 0) {
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.25);
        doc.line(colX, y + 5.5, colX, y + 17.5);
      }

      // Etiqueta del parámetro antropométrico
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(String(param.label), colX + 3.5, y + 9.5);

      // Valor del parámetro antropométrico
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42); // slate-900
      const strVal = String(param.value);
      doc.text(strVal, colX + 3.5, y + 14.8);

      if (param.sub) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(4, 120, 87); // emerald-700
        const valW = doc.getTextWidth(strVal);
        doc.text(String(param.sub), colX + 3.5 + valW + 2, y + 14.8);
      }
    });

    let currentSectionY = y + 17.5;

    // --- Sub-franja: SUMATORIA DE PLIEGUES CUTÁNEOS (Solo si fueron capturados) ---
    if (hasSkinfolds) {
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(0.3);
      doc.line(margin, currentSectionY, margin + contentWidth, currentSectionY);

      doc.setFillColor(240, 253, 244); // emerald-50
      doc.rect(margin + 0.35, currentSectionY + 0.15, contentWidth - 0.7, 4, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(6, 95, 70); // emerald-800
      doc.text('SUMATORIA DE PLIEGUES CUTÁNEOS', margin + 3.5, currentSectionY + 3.1);

      // 2 Columnas para Σ3 y Σ6 Pliegues
      const pliegueColW = contentWidth / 2;

      // Divisor vertical entre Σ3 y Σ6
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.25);
      doc.line(margin + pliegueColW, currentSectionY + 4.15, margin + pliegueColW, currentSectionY + 16.5);

      // Columna 1: SUMATORIA DE Σ3 PLIEGUES (mm)
      const col3X = margin;
      doc.setFillColor(5, 150, 105); // emerald-600
      doc.circle(col3X + 4, currentSectionY + 7.5, 1, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(6, 95, 70); // emerald-800
      doc.text('SUMATORIA DE Σ3 PLIEGUES (mm)', col3X + 6.5, currentSectionY + 8.3);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.8);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text('Subescapular + Supraespinal + Abdominal', col3X + 6.5, currentSectionY + 12.0);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(4, 120, 87); // emerald-700
      const sum3Text = skinfoldSums.sum3 || '— mm';
      doc.text(sum3Text, col3X + 6.5, currentSectionY + 15.7);

      if (skinfoldSums.count3 > 0) {
        const s3W = doc.getTextWidth(sum3Text);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.text(
          skinfoldSums.isComplete3 ? '(3/3 completados)' : `(${skinfoldSums.count3}/3 capturados)`,
          col3X + 6.5 + s3W + 2,
          currentSectionY + 15.7
        );
      }

      // Columna 2: SUMATORIA DE Σ6 PLIEGUES (mm)
      const col6X = margin + pliegueColW;
      doc.setFillColor(15, 118, 110); // teal-600
      doc.circle(col6X + 4, currentSectionY + 7.5, 1, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(15, 118, 110); // teal-700
      doc.text('SUMATORIA DE Σ6 PLIEGUES (mm)', col6X + 6.5, currentSectionY + 8.3);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.8);
      doc.setTextColor(100, 116, 139);
      doc.text('Tríceps + Subescapular + Supraespinal + Abdominal + Muslo Frontal + Pantorrilla Medial', col6X + 6.5, currentSectionY + 12.0);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 118, 110); // teal-700
      const sum6Text = skinfoldSums.sum6 || '— mm';
      doc.text(sum6Text, col6X + 6.5, currentSectionY + 15.7);

      if (skinfoldSums.count6 > 0) {
        const s6W = doc.getTextWidth(sum6Text);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.text(
          skinfoldSums.isComplete6 ? '(6/6 completados)' : `(${skinfoldSums.count6}/6 capturados)`,
          col6X + 6.5 + s6W + 2,
          currentSectionY + 15.7
        );
      }

      currentSectionY += 16.5;
    }

    // --- Sub-franja de Composición Corporal (Solo si fue capturada) ---
    if (hasComposition) {
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(0.3);
      doc.line(margin, currentSectionY, margin + contentWidth, currentSectionY);

      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(margin + 0.35, currentSectionY + 0.15, contentWidth - 0.7, 4, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text('COMPOSICIÓN CORPORAL (FRACCIONAMIENTO 4 COMPONENTES)', margin + 3.5, currentSectionY + 3.1);

      const compData = [
        {
          title: 'Masa Grasa',
          pctLabel: '% de Grasa:',
          pct: patientInfo.fatPercent ? `${patientInfo.fatPercent}%` : '—',
          kgLabel: 'Kg de Grasa:',
          kg: patientInfo.fatKg ? `${patientInfo.fatKg} kg` : '—',
          color: [217, 119, 6], // amber-600
        },
        {
          title: 'Masa Muscular',
          pctLabel: '% de Músculo:',
          pct: patientInfo.musclePercent ? `${patientInfo.musclePercent}%` : '—',
          kgLabel: 'Kg de Músculo:',
          kg: patientInfo.muscleKg ? `${patientInfo.muscleKg} kg` : '—',
          color: [225, 29, 72], // rose-600
        },
        {
          title: 'Masa Ósea (Hueso)',
          pctLabel: '% de Hueso:',
          pct: patientInfo.bonePercent ? `${patientInfo.bonePercent}%` : '—',
          kgLabel: 'Kg de Hueso:',
          kg: patientInfo.boneKg ? `${patientInfo.boneKg} kg` : '—',
          color: [2, 132, 199], // sky-600
        },
        {
          title: 'Masa Residual',
          pctLabel: '% de Residual:',
          pct: patientInfo.residualPercent ? `${patientInfo.residualPercent}%` : '—',
          kgLabel: 'Kg Residual:',
          kg: patientInfo.residualKg ? `${patientInfo.residualKg} kg` : '—',
          color: [147, 51, 234], // purple-600
        },
      ];

      const compColW = contentWidth / compData.length;

      compData.forEach((c, idx) => {
        const colX = margin + idx * compColW;
        if (idx > 0) {
          doc.setDrawColor(226, 232, 240); // slate-200
          doc.setLineWidth(0.25);
          doc.line(colX, currentSectionY, colX, currentSectionY + 20.0);
        }

        // Título del componente con círculo de color
        doc.setFillColor(c.color[0], c.color[1], c.color[2]);
        doc.circle(colX + 3.5, currentSectionY + 7.2, 1, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text(String(c.title), colX + 6, currentSectionY + 8.1);

        // % renglón
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105); // slate-600
        const pctLabelW = doc.getTextWidth(String(c.pctLabel));
        doc.text(String(c.pctLabel), colX + 3.5, currentSectionY + 12.2);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(15, 23, 42);
        doc.text(String(c.pct), colX + 3.5 + pctLabelW + 1.5, currentSectionY + 12.2);

        // Kg renglón
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        const kgLabelW = doc.getTextWidth(String(c.kgLabel));
        doc.text(String(c.kgLabel), colX + 3.5, currentSectionY + 16.0);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(15, 23, 42);
        doc.text(String(c.kg), colX + 3.5 + kgLabelW + 1.5, currentSectionY + 16.0);
      });

      currentSectionY += 20.0;
    }

    y += unifiedTableHeight + 2.5;

  // --- 2.25 Somatotipo (Método Heath-Carter) ---
  if (somatotype.hasAnyData) {
    let somatoPng = '';
    try {
      somatoPng = await getSomatocartaPngDataUrl(somatotype, 600);
    } catch (e) {
      console.error('Error generating Somatocarta PNG for PDF:', e);
    }

    const hasImg = !!somatoPng;
    const somatoH = hasImg ? 50 : (somatotype.classification ? 32 : 18);
    checkPageBreak(somatoH + 2.5);

    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, somatoH, 1.5, 1.5, 'FD');

    // Barra de título del Somatotipo
    doc.setFillColor(67, 56, 202); // indigo-700
    doc.roundedRect(margin, y, contentWidth, 4.5, 1.5, 1.5, 'F');
    doc.rect(margin, y + 2, contentWidth, 2.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(255, 255, 255);
    doc.text('SOMATOTIPO (MÉTODO HEATH-CARTER)', margin + 3.5, y + 3.2);

    if (somatotype.x !== null && somatotype.y !== null) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(224, 231, 255); // indigo-100
      const coordStr = `Somatocarta: X = ${somatotype.x.toFixed(1)} | Y = ${somatotype.y.toFixed(1)}`;
      doc.text(coordStr, margin + contentWidth - 3.5, y + 3.2, { align: 'right' });
    }

    if (hasImg) {
      // Imagen de la Somatocarta a la izquierda
      const imgSize = 40; // 40mm x 40mm
      try {
        doc.addImage(somatoPng, 'PNG', margin + 3, y + 6.5, imgSize, imgSize);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.roundedRect(margin + 2.5, y + 6, imgSize + 1, imgSize + 1, 1, 1, 'S');
      } catch (imgErr) {
        console.warn('Could not render somatocarta image in PDF:', imgErr);
      }

      // Columna derecha con estructura idéntica al ejemplo requerido:
      // 1. Endomorfia: X.X     |    2. Mesomorfia: Y.Y    |   3. Ectomorfia: Z.Z
      // Clasificación: Nombre (X.X - Y.Y - Z.Z)
      // Interpretación funcional: Descripción
      // "Frase descriptiva oficial según escalas Heath-Carter (somatotipo.pdf)"
      const rightX = margin + imgSize + 7;
      const rightW = contentWidth - (imgSize + 10);

      // Fila 1: Componentes
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(180, 83, 9); // amber-700
      doc.text(`1. Endomorfia: ${somatotype.endoFormatted}`, rightX, y + 10.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('|', rightX + 38, y + 10.5);
      doc.setTextColor(3, 105, 161); // sky-700
      doc.text(`2. Mesomorfia: ${somatotype.mesoFormatted}`, rightX + 44, y + 10.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('|', rightX + 82, y + 10.5);
      doc.setTextColor(126, 34, 206); // purple-700
      doc.text(`3. Ectomorfia: ${somatotype.ectoFormatted}`, rightX + 88, y + 10.5);

      // Fila 2: Clasificación (formato exacto solicitado)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(67, 56, 202);
      doc.text('Clasificación:', rightX, y + 18.0);

      doc.setTextColor(15, 23, 42);
      const classText = somatotype.classification ? somatotype.classification.name : 'Pendiente de cálculo';
      doc.text(`${classText} (${somatotype.endoFormatted} - ${somatotype.mesoFormatted} - ${somatotype.ectoFormatted})`, rightX + 22, y + 18.0);

      // Fila 3: Interpretación funcional
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.0);
      doc.setTextColor(15, 23, 42);
      doc.text('Interpretación funcional:', rightX, y + 24.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.4);
      doc.setTextColor(71, 85, 105);
      const interpDesc = somatotype.classification?.description || 'Complete las mediciones antropométricas para obtener la interpretación funcional.';
      const splitInterp = doc.splitTextToSize(interpDesc, rightW);
      doc.text(splitInterp, rightX, y + 28.5);

      // Fila 4: Frase de escalas (somatotipo.pdf)
      if (somatotype.scaleSummaryText) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6.4);
        doc.setTextColor(30, 41, 59);
        const splitScale = doc.splitTextToSize(`"${somatotype.scaleSummaryText}"`, rightW);
        const scaleY = y + 28.5 + (splitInterp.length * 3.2) + 2.5;
        doc.text(splitScale, rightX, Math.min(y + somatoH - 4, scaleY));
      }
    } else {
      // Fallback sin imagen: Formato exacto requerido
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(30, 41, 59);
      doc.text(`1. Endomorfia: ${somatotype.endoFormatted}     |    2. Mesomorfia: ${somatotype.mesoFormatted}    |   3. Ectomorfia: ${somatotype.ectoFormatted}`, margin + 3.5, y + 9.5);

      if (somatotype.classification) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.8);
        doc.setTextColor(67, 56, 202);
        doc.text(`Clasificación: ${somatotype.classification.name} (${somatotype.endoFormatted} - ${somatotype.mesoFormatted} - ${somatotype.ectoFormatted})`, margin + 3.5, y + 16);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.0);
        doc.setTextColor(15, 23, 42);
        doc.text('Interpretación funcional: ', margin + 3.5, y + 21.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(somatotype.classification.description, margin + 34, y + 21.5);

        if (somatotype.scaleSummaryText) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(6.8);
          doc.setTextColor(30, 41, 59);
          doc.text(`"${somatotype.scaleSummaryText}"`, margin + 3.5, y + 27.5);
        }
      }
    }

    y += somatoH + 2.5;
  }
}

  // --- 2.3 Notas e Indicaciones Generales del Paciente ---
  // Se imprime en el PDF ÚNICAMENTE si el usuario ingresó información en este cuadro
  const userNotes = patientInfo.notes?.trim();
  if (userNotes) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const splitNotes = doc.splitTextToSize(`Indicaciones y notas del paciente: ${userNotes}`, contentWidth - 8);
    const boxHeight = Math.max(12, splitNotes.length * 4 + 6);

    checkPageBreak(boxHeight + 4);
    doc.setFillColor(254, 252, 232); // yellow-50
    doc.setDrawColor(254, 240, 138); // yellow-200
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, boxHeight, 1.5, 1.5, 'FD');

    doc.setTextColor(113, 63, 18); // yellow-900
    doc.text(splitNotes, margin + 4, y + 5);
    y += boxHeight + 4;
  }

  // Salto de página para que los menús y recetas de cada tiempo de comida comiencen nítidamente en la hoja 2
  doc.addPage();
  y = margin;

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
    const mealNameUpper = meal.mealName.toUpperCase();
    let mealTitleFontSize = 12;
    if (mealNameUpper.length > 35) {
      mealTitleFontSize = 9.5;
    } else if (mealNameUpper.length > 22) {
      mealTitleFontSize = 10.5;
    }

    doc.setFillColor(13, 49, 65); // pantone #0d3141
    doc.roundedRect(margin, y, contentWidth, 9, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(mealTitleFontSize);
    doc.setTextColor(255, 255, 255);
    doc.text(mealNameUpper, margin + 4, y + 6.2);

    y += 12;

    // Render Options A, B, C
    const renderOption = (option: typeof meal.optionA, letter: 'A' | 'B' | 'C') => {
      const isA = letter === 'A';
      const isB = letter === 'B';

      // Title (cuidando el tamaño de letra si el título de la comida es largo y quitando espacios raros)
      const rawTitle = cleanSpacing(option.title || 'Menú sugerido');
      const titleFull = `OPCIÓN ${letter}: ${rawTitle}`;
      let titleFontSize = 11;
      if (titleFull.length > 70) {
        titleFontSize = 8.5;
      } else if (titleFull.length > 50) {
        titleFontSize = 9.5;
      } else if (titleFull.length > 35) {
        titleFontSize = 10.5;
      }

      const maxInnerW = contentWidth - 10; // Margen interno estricto (5mm a cada lado)
      const cardInnerX = margin + 5;

      // 1. Título
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(titleFontSize);
      const splitTitle = doc.splitTextToSize(titleFull, maxInnerW);
      const titleLineH = titleFontSize * 0.36 + 1.2;
      const titleHeight = splitTitle.length * titleLineH;

      // 2. Descripción (sin cursiva)
      let descHeight = 0;
      let splitDesc: string[] = [];
      if (option.description) {
        const cleanDesc = cleanSpacing(option.description);
        if (cleanDesc) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          splitDesc = doc.splitTextToSize(`"${cleanDesc}"`, maxInnerW);
          descHeight = splitDesc.length * 3.6 + 1.5;
        }
      }

      // 3. Pre-cálculo exacto de ingredientes con ajuste de renglones para que nada se salga del marco ni se sobreponga
      let ingTotalHeight = 0;
      const formattedIngredients = (option.ingredients || []).map((ing) => {
        const displayPortion = cleanSpacing(parseAndScalePortion(ing.exactPortion, ing.equivalentsCount));
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
        const prefTag = ing.isPreferred ? ' ★' : '';
        const foodNameClean = `${cleanSpacing(ing.foodName)}${prefTag}`;

        const portionPart = displayPortion ? `${displayPortion} ` : '';
        const fullFoodText = `${portionPart}${foodNameClean}  ${groupTag}`.trim();

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.8);
        const bulletIndent = 4.0;
        const textAvailW = maxInnerW - bulletIndent;
        const splitLines: string[] = doc.splitTextToSize(fullFoodText, textAvailW);

        const itemH = splitLines.length * 4.0 + 0.6;
        ingTotalHeight += itemH;

        return {
          splitLines,
          bulletIndent,
          itemH,
        };
      });

      // 4. Preparación (sin cursiva)
      let prepHeight = 0;
      let splitPrep: string[] = [];
      if (option.preparation) {
        const cleanPrep = cleanSpacing(option.preparation);
        if (cleanPrep) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          splitPrep = doc.splitTextToSize(`Preparación: ${cleanPrep}`, maxInnerW);
          prepHeight = splitPrep.length * 3.6 + 2.0;
        }
      }

      // 5. Tip (sin cursiva)
      let tipHeight = 0;
      let splitTip: string[] = [];
      if (option.nutritionistTip) {
        const cleanTip = cleanSpacing(option.nutritionistTip);
        if (cleanTip) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          splitTip = doc.splitTextToSize(`Tip: ${cleanTip}`, maxInnerW);
          tipHeight = splitTip.length * 3.4 + 2.0;
        }
      }

      const cardPaddingTop = 4.0;
      const cardPaddingBottom = 4.0;
      const totalCardHeight = Math.max(
        18,
        cardPaddingTop + titleHeight + descHeight + ingTotalHeight + prepHeight + tipHeight + cardPaddingBottom
      );

      // Control de salto de página antes de dibujar la tarjeta
      if (totalCardHeight < pageHeight - 35) {
        checkPageBreak(totalCardHeight + 2);
      } else {
        checkPageBreak(30);
      }

      const cardStartY = y;

      // Tarjeta contenedora con fondo suave idéntica al archivo Word
      if (isA) {
        doc.setFillColor(240, 253, 244); // emerald-50
        doc.setDrawColor(167, 243, 208); // emerald-200
      } else if (isB) {
        doc.setFillColor(240, 253, 250); // teal-50
        doc.setDrawColor(153, 246, 228); // teal-200
      } else {
        doc.setFillColor(240, 249, 255); // sky-50
        doc.setDrawColor(186, 230, 253); // sky-200
      }
      doc.setLineWidth(0.25);
      doc.roundedRect(margin, cardStartY, contentWidth, totalCardHeight, 1.5, 1.5, 'FD');

      // Línea de acento lateral izquierda distintiva
      if (isA) doc.setFillColor(5, 150, 105); // emerald-600
      else if (isB) doc.setFillColor(13, 148, 136); // teal-600
      else doc.setFillColor(2, 132, 199); // sky-600
      doc.roundedRect(margin, cardStartY, 2.0, totalCardHeight, 0.8, 0.8, 'F');

      y += cardPaddingTop;

      // Título de la opción
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(titleFontSize);
      doc.setTextColor(13, 49, 65); // pantone #0d3141
      splitTitle.forEach((tLine) => {
        doc.text(tLine, cardInnerX, y);
        y += titleLineH;
      });
      y += 1.0;

      // Descripción (sin cursiva)
      if (splitDesc.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        splitDesc.forEach((dLine) => {
          doc.text(dLine, cardInnerX, y);
          y += 3.6;
        });
        y += 1.0;
      }

      // Ingredientes
      if (formattedIngredients.length > 0) {
        formattedIngredients.forEach((item) => {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.8);
          doc.setTextColor(5, 150, 105); // emerald-600 bullet
          doc.text('•', cardInnerX, y);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.8);
          doc.setTextColor(15, 23, 42); // slate-900

          item.splitLines.forEach((lineText) => {
            doc.text(lineText, cardInnerX + item.bulletIndent, y);
            y += 4.0;
          });
          y += 0.6;
        });
      }

      // Preparación (sin cursiva)
      if (splitPrep.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        splitPrep.forEach((pLine) => {
          doc.text(pLine, cardInnerX, y);
          y += 3.6;
        });
        y += 1.5;
      }

      // Tip (sin cursiva)
      if (splitTip.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(180, 83, 9); // amber-700
        splitTip.forEach((tLine) => {
          doc.text(tLine, cardInnerX, y);
          y += 3.4;
        });
        y += 1.5;
      }

      // Espaciado final al término de la tarjeta
      y = cardStartY + totalCardHeight + 3.2;
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
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  try {
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = fileName;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      if (anchor.parentNode) {
        document.body.removeChild(anchor);
      }
      URL.revokeObjectURL(blobUrl);
    }, 2500);
  } catch (saveErr) {
    console.warn('Direct Blob download failed, falling back to doc.save:', saveErr);
    doc.save(fileName);
  }
}

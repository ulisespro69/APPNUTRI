import jsPDF from 'jspdf';
import { GeneratedPlan, PatientInfo, MacroNutrientSummary, MealOptionLetter } from '../types';
import { normalizeOptionSelection, calculateRowTotal, calculateColumnTotal, calculateGrandTotalEquivalents, calculateBmiInfo, calculateSkinfoldSums } from './nutritionCalculations';
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
  const patientDisplayName = patientInfo.name && patientInfo.name.trim() ? patientInfo.name.trim() : 'Plan Personalizado';
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

  // Objetivo o Prescripción
  const clinicalGoal = patientInfo.goal && patientInfo.goal.trim() ? patientInfo.goal.trim() : 'Mantenimiento y Prescripción Dietoterapéutica';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(4, 120, 87); // emerald-700
  const splitGoal = doc.splitTextToSize(`Objetivo: ${clinicalGoal}`, leftBoxWidth - 8);
  doc.text(splitGoal[0], leftX, y + 23);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Prescripción bajo Sistema Mexicano de Equivalentes (SMAE)', leftX, y + 28.5);

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

  y += frameHeight + 3.5;

  // --- 2.2 TABLA UNIFICADA: VALORACIÓN ANTROPOMÉTRICA Y COMPOSICIÓN CORPORAL ---
  // Una sola tabla integral combinando Parámetros Antropométricos, Sumatoria de Pliegues y los 4 componentes
  const unifiedTableHeight = 54;
  checkPageBreak(unifiedTableHeight + 4);

  const bmiInfo = calculateBmiInfo(patientInfo.height, patientInfo.weight);
  const skinfoldSums = calculateSkinfoldSums(patientInfo.skinfolds);
  const displayHeight = patientInfo.height
    ? /\d$/.test(patientInfo.height.trim())
      ? parseFloat(patientInfo.height) > 3
        ? `${patientInfo.height.trim()} cm`
        : `${patientInfo.height.trim()} m`
      : patientInfo.height
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
  doc.text('VALORACIÓN ANTROPOMÉTRICA Y COMPOSICIÓN CORPORAL (MODELO 4 COMPONENTES)', margin + 3.5, y + 4.1);

  // --- Fila 1 de la tabla: Antropometría General (Sexo, Edad, Masa Corporal, Estatura, IMC) ---
  const anthropoParams = [
    { label: 'SEXO', value: patientInfo.gender || '—', sub: '' },
    { label: 'EDAD', value: patientInfo.age ? `${patientInfo.age} años` : '—', sub: '' },
    { label: 'MASA CORPORAL (PESO)', value: patientInfo.weight || '—', sub: '' },
    { label: 'ESTATURA (TALLA)', value: displayHeight, sub: '' },
    {
      label: 'ÍNDICE MASA CORP. (IMC)',
      value: bmiInfo ? bmiInfo.formatted : '—',
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
    doc.text(param.label, colX + 3.5, y + 9.5);

    // Valor del parámetro antropométrico
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(param.value, colX + 3.5, y + 14.8);

    if (param.sub) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(4, 120, 87); // emerald-700
      const valW = doc.getTextWidth(param.value);
      doc.text(param.sub, colX + 3.5 + valW + 2, y + 14.8);
    }
  });

  // Divisor horizontal: De parámetros generales a Sumatorias de Pliegues
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.line(margin, y + 17.5, margin + contentWidth, y + 17.5);

  // --- Sub-franja: SUMATORIA DE PLIEGUES CUTÁNEOS ---
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.rect(margin + 0.35, y + 17.65, contentWidth - 0.7, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.text('SUMATORIA DE PLIEGUES CUTÁNEOS', margin + 3.5, y + 20.6);

  // 2 Columnas para Σ3 y Σ6 Pliegues
  const pliegueColW = contentWidth / 2;

  // Divisor vertical entre Σ3 y Σ6
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.line(margin + pliegueColW, y + 21.65, margin + pliegueColW, y + 34.0);

  // Columna 1: SUMATORIA DE Σ3 PLIEGUES (mm)
  const col3X = margin;
  doc.setFillColor(5, 150, 105); // emerald-600
  doc.circle(col3X + 4, y + 25.0, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.text('SUMATORIA DE Σ3 PLIEGUES (mm)', col3X + 6.5, y + 25.8);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Subescapular + Supraespinal + Abdominal', col3X + 6.5, y + 29.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(4, 120, 87); // emerald-700
  const sum3Text = skinfoldSums.sum3 || '— mm';
  doc.text(sum3Text, col3X + 6.5, y + 33.2);

  if (skinfoldSums.count3 > 0) {
    const s3W = doc.getTextWidth(sum3Text);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(
      skinfoldSums.isComplete3 ? '(3/3 completados)' : `(${skinfoldSums.count3}/3 capturados)`,
      col3X + 6.5 + s3W + 2,
      y + 33.2
    );
  }

  // Columna 2: SUMATORIA DE Σ6 PLIEGUES (mm)
  const col6X = margin + pliegueColW;
  doc.setFillColor(15, 118, 110); // teal-600
  doc.circle(col6X + 4, y + 25.0, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(15, 118, 110); // teal-700
  doc.text('SUMATORIA DE Σ6 PLIEGUES (mm)', col6X + 6.5, y + 25.8);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Tríceps + Subescapular + Supraespinal + Abdominal + Muslo Frontal + Pantorrilla Medial', col6X + 6.5, y + 29.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 118, 110); // teal-700
  const sum6Text = skinfoldSums.sum6 || '— mm';
  doc.text(sum6Text, col6X + 6.5, y + 33.2);

  if (skinfoldSums.count6 > 0) {
    const s6W = doc.getTextWidth(sum6Text);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(
      skinfoldSums.isComplete6 ? '(6/6 completados)' : `(${skinfoldSums.count6}/6 capturados)`,
      col6X + 6.5 + s6W + 2,
      y + 33.2
    );
  }

  // Divisor horizontal: De Sumatorias de Pliegues a Composición Corporal
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.line(margin, y + 34.0, margin + contentWidth, y + 34.0);

  // Sub-franja de Composición Corporal
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(margin + 0.35, y + 34.15, contentWidth - 0.7, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('COMPOSICIÓN CORPORAL (FRACCIONAMIENTO 4 COMPONENTES)', margin + 3.5, y + 37.1);

  // --- Fila 3 de la tabla: 4 Componentes de Composición Corporal ---
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
    // Línea divisoria vertical
    if (idx > 0) {
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.25);
      doc.line(colX, y + 34.0, colX, y + unifiedTableHeight - 0.5);
    }

    // Título del componente con círculo de color
    doc.setFillColor(c.color[0], c.color[1], c.color[2]);
    doc.circle(colX + 3.5, y + 41.2, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(c.title, colX + 6, y + 42.1);

    // % renglón
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105); // slate-600
    const pctLabelW = doc.getTextWidth(c.pctLabel);
    doc.text(c.pctLabel, colX + 3.5, y + 46.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);
    doc.text(c.pct, colX + 3.5 + pctLabelW + 1.5, y + 46.2);

    // Kg renglón
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    const kgLabelW = doc.getTextWidth(c.kgLabel);
    doc.text(c.kgLabel, colX + 3.5, y + 50.0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);
    doc.text(c.kg, colX + 3.5 + kgLabelW + 1.5, y + 50.0);
  });

  y += unifiedTableHeight + 3.5;

  // --- 2.3 Notas e Indicaciones Generales del Paciente ---
  // Se imprime en el PDF ÚNICAMENTE si el usuario ingresó información en este cuadro
  const userNotes = patientInfo.notes?.trim();
  if (userNotes) {
    doc.setFont('helvetica', 'italic');
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

  // --- 2.5 Cuadro de Distribución de Equivalentes ---
  if (tableState) {
    const allGroups = SMAE_GROUPS;
    checkPageBreak(35);

    // Section Title Banner
    doc.setFillColor(13, 49, 65); // #0d3141
    doc.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('CUADRO DE DISTRIBUCIÓN DE EQUIVALENTES', margin + 4, y + 5.2);
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
          const eqLabel = ing.smaeGroup ? ` (${ing.equivalentsCount} eq ${ing.smaeGroup})` : '';
          const ingText = `  •  ${ing.exactPortion} ${ing.foodName}${eqLabel}`;
          const splitIng = doc.splitTextToSize(ingText, contentWidth - 6);
          doc.text(splitIng, margin + 3, y);
          y += splitIng.length * 4.8;
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

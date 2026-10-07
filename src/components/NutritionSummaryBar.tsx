import React, { useState, useEffect } from 'react';
import { MacroNutrientSummary, PatientInfo, SkinfoldMeasurements, GirthMeasurements, BreadthMeasurements, ManualMacroPrescription, ProteinSupplementInfo, ManualNutrientEntry } from '../types';
import { Flame, PieChart, User, Sparkles, ChevronDown, ChevronUp, Ruler, Weight, Calendar, Percent, Layers, EyeOff, Calculator, Dumbbell, Zap, Info, Check, Sliders, RotateCcw, Target, AlertTriangle, CheckCircle2, ShieldAlert, CupSoda, Heart, X } from 'lucide-react';
import { PRESETS, TableGridState } from '../data/smaeData';
import { SomatotypeCard } from './SomatotypeCard';
import {
  calculateBmiInfo,
  calculateSkinfoldSums,
  calculateDurninWomersley,
  calculateSloanBurtBlyth,
  calculateWilmoreBehnke,
  getAllBodyFatEstimations,
  calculateBoneMassRocha,
  calculateResidualMass,
  calculateMuscleMass,
  calculateHarrisBenedict,
  calculateMifflinStJeor,
  calculateKatchMcArdle,
  calculateCunningham,
  calculateCaloricExpenditure,
  calculateWeightsByStrategy,
  ACTIVITY_LEVEL_OPTIONS,
} from '../utils/nutritionCalculations';

interface NutritionSummaryBarProps {
  macros: MacroNutrientSummary;
  patientInfo: PatientInfo;
  onPatientInfoChange: (info: PatientInfo) => void;
  onSelectPreset: (presetData: TableGridState) => void;
}

const NutritionSummaryBarComponent: React.FC<NutritionSummaryBarProps> = ({
  macros,
  patientInfo,
  onPatientInfoChange,
  onSelectPreset,
}) => {
  const [showPatientDetails, setShowPatientDetails] = useState(true);
  const [showHarrisBenedict, setShowHarrisBenedict] = useState(false);
  const [anthropoTab, setAnthropoTab] = useState<'all' | 'skinfolds' | 'girths' | 'breadths'>('all');
  const [caloricAdjustmentMode, setCaloricAdjustmentMode] = useState<'subtract' | 'add'>('subtract');

  const handleSkinfoldChange = (field: keyof SkinfoldMeasurements, val: string) => {
    onPatientInfoChange({
      ...patientInfo,
      skinfolds: {
        ...(patientInfo.skinfolds || {}),
        [field]: val,
      },
    });
  };

  const handleGirthChange = (field: keyof GirthMeasurements, val: string) => {
    onPatientInfoChange({
      ...patientInfo,
      girths: {
        ...(patientInfo.girths || {}),
        [field]: val,
      },
    });
  };

  const handleBreadthChange = (field: keyof BreadthMeasurements, val: string) => {
    onPatientInfoChange({
      ...patientInfo,
      breadths: {
        ...(patientInfo.breadths || {}),
        [field]: val,
      },
    });
  };

  const skinfoldsCount = Object.values(patientInfo.skinfolds || {}).filter((v) => v !== undefined && v !== null && String(v).trim() !== '').length;
  const girthsCount = Object.values(patientInfo.girths || {}).filter((v) => v !== undefined && v !== null && String(v).trim() !== '').length;
  const breadthsCount = Object.values(patientInfo.breadths || {}).filter((v) => v !== undefined && v !== null && String(v).trim() !== '').length;

  const skinfoldValues = [
    patientInfo.skinfolds?.triceps,
    patientInfo.skinfolds?.subescapular,
    patientInfo.skinfolds?.biceps,
    patientInfo.skinfolds?.pectoral,
    patientInfo.skinfolds?.axilar,
    patientInfo.skinfolds?.crestaIliaca,
    patientInfo.skinfolds?.supraespinal,
    patientInfo.skinfolds?.abdominal,
    patientInfo.skinfolds?.musloFrontal,
    patientInfo.skinfolds?.pantorrillaMedial,
  ].map((v) => parseFloat(String(v ?? '').replace(',', '.'))).filter((n) => !isNaN(n) && n > 0);

  const skinfoldSum = skinfoldValues.length > 0
    ? skinfoldValues.reduce((acc, curr) => acc + curr, 0).toFixed(1)
    : null;

  const skinfoldSums = calculateSkinfoldSums(patientInfo.skinfolds);
  const bodyFatEstimations = getAllBodyFatEstimations(patientInfo);
  const completedEstimationsCount = bodyFatEstimations.filter((f) => f.isComplete).length;
  const sortedBodyFatEstimations = [...bodyFatEstimations].sort((a, b) => {
    if (a.isComplete && !b.isComplete) return -1;
    if (!a.isComplete && b.isComplete) return 1;
    return 0;
  });

  const rochaBoneMass = calculateBoneMassRocha(
    patientInfo.height,
    patientInfo.breadths,
    patientInfo.weight
  );

  const residualMassEst = calculateResidualMass(
    patientInfo.gender,
    patientInfo.weight
  );

  const muscleMassEst = calculateMuscleMass(
    patientInfo.fatPercent,
    patientInfo.bonePercent,
    patientInfo.residualPercent,
    patientInfo.weight
  );

  // Helper para comparar valores numéricos y evitar bucles de renderizado
  const isSameVal = (a: any, b: any) => {
    if (a === b) return true;
    if (!a && !b) return true;
    const numA = parseFloat(String(a).replace(',', '.'));
    const numB = parseFloat(String(b).replace(',', '.'));
    if (!isNaN(numA) && !isNaN(numB)) return Math.abs(numA - numB) < 0.001;
    return String(a || '').trim() === String(b || '').trim();
  };

  // Aplicar por default la fórmula de Masa Ósea (Rocha), Masa Residual (según sexo) y Masa Muscular (MM = 100 - (MG+MO+MR))
  useEffect(() => {
    let changed = false;
    const nextInfo = { ...patientInfo };

    // 1. Masa Ósea: Aplicar fórmula Rocha por default cuando estén disponibles sus variables
    if (rochaBoneMass.isComplete && rochaBoneMass.boneKg) {
      if (!isSameVal(nextInfo.boneKg, rochaBoneMass.boneKg) || (rochaBoneMass.bonePercent && !isSameVal(nextInfo.bonePercent, rochaBoneMass.bonePercent))) {
        nextInfo.boneKg = rochaBoneMass.boneKg;
        if (rochaBoneMass.bonePercent) {
          nextInfo.bonePercent = rochaBoneMass.bonePercent;
        }
        changed = true;
      }
    }

    // 2. Masa Residual: Aplicar por default siempre tomando en cuenta el sexo (Hombres 24%, Mujeres 21%)
    if (residualMassEst.isComplete && residualMassEst.residualKg && residualMassEst.residualPercent) {
      if (!isSameVal(nextInfo.residualKg, residualMassEst.residualKg) || !isSameVal(nextInfo.residualPercent, residualMassEst.residualPercent)) {
        nextInfo.residualKg = residualMassEst.residualKg;
        nextInfo.residualPercent = residualMassEst.residualPercent;
        changed = true;
      }
    } else if (residualMassEst.residualPercent && !isSameVal(nextInfo.residualPercent, residualMassEst.residualPercent)) {
      // Si el sexo fue seleccionado pero aún falta peso o residualKg, aplicar por default el porcentaje según sexo
      nextInfo.residualPercent = residualMassEst.residualPercent;
      changed = true;
    }

    // 3. Masa Muscular: MM = 100 - (MG% + MO% + MR%), y conversión a kg: (MM% * peso) / 100
    if (muscleMassEst.isComplete && muscleMassEst.musclePercent) {
      if (!isSameVal(nextInfo.musclePercent, muscleMassEst.musclePercent) || (muscleMassEst.muscleKg && !isSameVal(nextInfo.muscleKg, muscleMassEst.muscleKg))) {
        nextInfo.musclePercent = muscleMassEst.musclePercent;
        if (muscleMassEst.muscleKg) {
          nextInfo.muscleKg = muscleMassEst.muscleKg;
        }
        changed = true;
      }
    }

    if (changed) {
      onPatientInfoChange(nextInfo);
    }
  }, [
    rochaBoneMass.isComplete,
    rochaBoneMass.boneKg,
    rochaBoneMass.bonePercent,
    residualMassEst.isComplete,
    residualMassEst.residualKg,
    residualMassEst.residualPercent,
    muscleMassEst.isComplete,
    muscleMassEst.musclePercent,
    muscleMassEst.muscleKg,
    patientInfo.boneKg,
    patientInfo.bonePercent,
    patientInfo.residualKg,
    patientInfo.residualPercent,
    patientInfo.muscleKg,
    patientInfo.musclePercent,
  ]);

  const isRochaActive = Boolean(
    rochaBoneMass.isComplete &&
    rochaBoneMass.boneKg &&
    patientInfo.boneKg &&
    parseFloat(String(patientInfo.boneKg).replace(',', '.')) === parseFloat(String(rochaBoneMass.boneKg).replace(',', '.'))
  );

  const isResidualActive = Boolean(
    residualMassEst.isComplete &&
    residualMassEst.residualKg &&
    patientInfo.residualKg &&
    parseFloat(String(patientInfo.residualKg).replace(',', '.')) === parseFloat(String(residualMassEst.residualKg).replace(',', '.'))
  );

  const isMuscleActive = Boolean(
    muscleMassEst.isComplete &&
    muscleMassEst.musclePercent &&
    patientInfo.musclePercent &&
    parseFloat(String(patientInfo.musclePercent).replace(',', '.')) === parseFloat(String(muscleMassEst.musclePercent).replace(',', '.'))
  );

  const waistVal = parseFloat(patientInfo.girths?.cinturaMinima || '');
  const hipVal = parseFloat(patientInfo.girths?.caderasMaximo || '');
  const whr = !isNaN(waistVal) && !isNaN(hipVal) && hipVal > 0
    ? (waistVal / hipVal).toFixed(2)
    : null;

  // Cálculo de Masa Libre de Grasa (MLG = Peso - Kg de grasa)
  const patientWeightNum = (() => {
    const rawW = parseFloat(patientInfo.weight?.toString().replace(',', '.') || '');
    return !isNaN(rawW) && rawW > 0 ? rawW : 0;
  })();

  const patientFatKgNum = (() => {
    const rawKg = parseFloat(patientInfo.fatKg?.toString().replace(',', '.') || '');
    if (!isNaN(rawKg) && rawKg >= 0) return rawKg;
    const rawPct = parseFloat(patientInfo.fatPercent?.toString().replace(',', '.') || '');
    if (!isNaN(rawPct) && rawPct >= 0 && patientWeightNum > 0) {
      return (rawPct * patientWeightNum) / 100;
    }
    return null;
  })();

  const fatFreeMassKg = (() => {
    if (patientWeightNum > 0 && patientFatKgNum !== null) {
      const diff = patientWeightNum - patientFatKgNum;
      return diff >= 0 ? diff.toFixed(1) : '0.0';
    }
    return null;
  })();

  const fatFreeMassPercent = (() => {
    if (fatFreeMassKg !== null && patientWeightNum > 0) {
      return ((parseFloat(fatFreeMassKg) / patientWeightNum) * 100).toFixed(1);
    }
    return null;
  })();

  const selectedActivityFactor = patientInfo.activityFactor || 1.2;
  const selectedWeightStrategy: 'real' | 'ideal' | 'adjusted' =
    patientInfo.weightStrategy === 'ideal' || patientInfo.weightStrategy === 'adjusted'
      ? patientInfo.weightStrategy
      : 'real';
  const selectedCaloricFormula =
    patientInfo.caloricFormula === 'mifflin-st-jeor'
      ? 'mifflin-st-jeor'
      : patientInfo.caloricFormula === 'katch-mcardle'
      ? 'katch-mcardle'
      : patientInfo.caloricFormula === 'cunningham'
      ? 'cunningham'
      : 'harris-benedict';

  const caloricCalculation = calculateCaloricExpenditure(
    patientInfo,
    selectedCaloricFormula,
    selectedActivityFactor,
    selectedWeightStrategy
  );

  const hbCalculation = calculateHarrisBenedict(
    patientInfo,
    selectedActivityFactor,
    selectedWeightStrategy
  );

  const mifflinCalculation = calculateMifflinStJeor(
    patientInfo,
    selectedActivityFactor,
    selectedWeightStrategy
  );

  const katchCalculation = calculateKatchMcArdle(
    patientInfo,
    selectedActivityFactor,
    selectedWeightStrategy
  );

  const cunninghamCalculation = calculateCunningham(
    patientInfo,
    selectedActivityFactor,
    selectedWeightStrategy
  );

  // Alias for backward compatibility in subcomponents if needed
  const harrisBenedict = caloricCalculation;

  // Prescripción Manual de Macronutrientes y Dosificación de Proteína
  const [isManualMacroMode, setIsManualMacroMode] = useState<boolean>(() => {
    return Boolean(patientInfo.macroPrescription?.enabled);
  });

  // Helper para mostrar números limpios: si es entero, quitar el punto y los ceros
  const formatNumClean = (val: number | string | null | undefined): string => {
    if (val === null || val === undefined || val === '') return '';
    const num = typeof val === 'number' ? val : parseFloat(val.toString().replace(',', '.'));
    if (isNaN(num)) return '';
    if (Math.abs(num - Math.round(num)) < 0.0001) {
      return Math.round(num).toString();
    }
    const formatted = (Math.round(num * 10) / 10).toString();
    return formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted;
  };

  // Pesos para dosificación de proteína por g/kg/día
  const macroWeights = calculateWeightsByStrategy(
    patientInfo.height,
    patientInfo.weight,
    patientInfo.gender,
    selectedWeightStrategy
  );

  const realWeightKg = macroWeights.realWeight;
  const currentWeightNum = realWeightKg || (patientInfo.weight ? parseFloat(String(patientInfo.weight).replace(',', '.')) : null);

  // Kcal meta de referencia (de prescripción, GET o SMAE)
  const defaultTargetKcal = caloricCalculation.isComplete && caloricCalculation.get
    ? caloricCalculation.get
    : macros.totalKcal > 0
    ? macros.totalKcal
    : 2000;

  const activeTargetKcal = patientInfo.macroPrescription?.targetKcal || defaultTargetKcal;

  // Gramos meta prescritos
  // Si el usuario ingresó una cantidad fija de gramos de proteína, mantenerla estrictamente intacta
  const metaProteinGrams = patientInfo.macroPrescription?.targetProteinGrams && patientInfo.macroPrescription.targetProteinGrams > 0
    ? patientInfo.macroPrescription.targetProteinGrams
    : Math.round(((activeTargetKcal * ((patientInfo.macroPrescription?.proteinPercent || (macros.proteinKcalPercent > 0 ? macros.proteinKcalPercent : 20)) / 100)) / 4) * 10) / 10;

  // Porcentajes activos de macronutrientes
  // Si hay gramos de proteína ingresados, el % de proteína se calcula a partir de los gramos fijos para que se mantengan invariantes al cambiar calorías
  const activeProteinPercent = patientInfo.macroPrescription?.targetProteinGrams && patientInfo.macroPrescription.targetProteinGrams > 0 && activeTargetKcal > 0
    ? Math.round(((patientInfo.macroPrescription.targetProteinGrams * 4 / activeTargetKcal) * 100) * 10) / 10
    : patientInfo.macroPrescription?.enabled && patientInfo.macroPrescription.proteinPercent !== undefined
    ? patientInfo.macroPrescription.proteinPercent
    : macros.proteinKcalPercent > 0
    ? macros.proteinKcalPercent
    : 20;

  const activeLipidsPercent = patientInfo.macroPrescription?.enabled
    ? patientInfo.macroPrescription.lipidsPercent
    : macros.lipidsKcalPercent > 0
    ? macros.lipidsKcalPercent
    : 25;

  const activeCarbsPercent = patientInfo.macroPrescription?.enabled
    ? patientInfo.macroPrescription.carbsPercent
    : macros.carbsKcalPercent > 0
    ? macros.carbsKcalPercent
    : 55;

  const currentMacroSum = Math.round((activeProteinPercent + activeLipidsPercent + activeCarbsPercent) * 10) / 10;
  const currentMacroDiff = Math.round((100 - currentMacroSum) * 10) / 10;
  const is100PercentBalanced = Math.abs(currentMacroDiff) < 0.05;

  const metaLipidsGrams = Math.round(((activeTargetKcal * (activeLipidsPercent / 100)) / 9) * 10) / 10;
  const metaCarbsGrams = Math.round(((activeTargetKcal * (activeCarbsPercent / 100)) / 4) * 10) / 10;

  // Proteína en g/kg/día
  const metaProteinGPerKg = currentWeightNum && currentWeightNum > 0
    ? Math.round((metaProteinGrams / currentWeightNum) * 10) / 10
    : patientInfo.macroPrescription?.proteinGPerKg || null;

  const currentSmaeProteinGPerKg = currentWeightNum && currentWeightNum > 0 && macros.totalProteinGrams > 0
    ? (macros.totalProteinGrams / currentWeightNum).toFixed(1)
    : null;

  // Adecuación nutricional (%)
  const proteinAdequacy = metaProteinGrams > 0 && macros.totalProteinGrams > 0
    ? Math.round((macros.totalProteinGrams / metaProteinGrams) * 100)
    : null;
  const lipidsAdequacy = metaLipidsGrams > 0 && macros.totalLipidsGrams > 0
    ? Math.round((macros.totalLipidsGrams / metaLipidsGrams) * 100)
    : null;
  const carbsAdequacy = metaCarbsGrams > 0 && macros.totalCarbsGrams > 0
    ? Math.round((macros.totalCarbsGrams / metaCarbsGrams) * 100)
    : null;
  const kcalAdequacy = activeTargetKcal > 0 && macros.totalKcal > 0
    ? Math.round((macros.totalKcal / activeTargetKcal) * 100)
    : null;

  // Estados locales para escribir números y decimales libremente sin flechas ni bloqueos
  const [proteinInputStr, setProteinInputStr] = useState<string>(() => formatNumClean(activeProteinPercent));
  const [proteinGramsInputStr, setProteinGramsInputStr] = useState<string>(() => formatNumClean(metaProteinGrams));
  const [lipidsInputStr, setLipidsInputStr] = useState<string>(() => formatNumClean(activeLipidsPercent));
  const [carbsInputStr, setCarbsInputStr] = useState<string>(() => formatNumClean(activeCarbsPercent));
  const [gPerKgInputStr, setGPerKgInputStr] = useState<string>(() => formatNumClean(metaProteinGPerKg ?? ''));
  const [focusedField, setFocusedField] = useState<'protein' | 'proteingrams' | 'lipids' | 'carbs' | 'gperkg' | null>(null);

  useEffect(() => {
    if (focusedField !== 'protein') {
      setProteinInputStr(formatNumClean(activeProteinPercent));
    }
  }, [activeProteinPercent, focusedField]);

  useEffect(() => {
    if (focusedField !== 'proteingrams') {
      setProteinGramsInputStr(formatNumClean(metaProteinGrams));
    }
  }, [metaProteinGrams, focusedField]);

  useEffect(() => {
    if (focusedField !== 'lipids') {
      setLipidsInputStr(formatNumClean(activeLipidsPercent));
    }
  }, [activeLipidsPercent, focusedField]);

  useEffect(() => {
    if (focusedField !== 'carbs') {
      setCarbsInputStr(formatNumClean(activeCarbsPercent));
    }
  }, [activeCarbsPercent, focusedField]);

  useEffect(() => {
    if (focusedField !== 'gperkg') {
      setGPerKgInputStr(formatNumClean(metaProteinGPerKg ?? (currentWeightNum && currentWeightNum > 0 && macros.totalProteinGrams > 0 ? (macros.totalProteinGrams / currentWeightNum) : '')));
    }
  }, [metaProteinGPerKg, currentWeightNum, macros.totalProteinGrams, focusedField]);

  const updateMacroPrescription = (partial: Partial<ManualMacroPrescription>) => {
    setIsManualMacroMode(true);
    const existingGrams = patientInfo.macroPrescription?.targetProteinGrams || metaProteinGrams || undefined;
    const current: ManualMacroPrescription = patientInfo.macroPrescription || {
      enabled: true,
      targetKcal: activeTargetKcal,
      proteinPercent: activeProteinPercent,
      lipidsPercent: activeLipidsPercent,
      carbsPercent: activeCarbsPercent,
      proteinGPerKg: metaProteinGPerKg || undefined,
      targetProteinGrams: existingGrams,
      proteinBaseWeight: 'real',
    };

    const next: ManualMacroPrescription = {
      ...current,
      enabled: true,
      targetProteinGrams: current.targetProteinGrams || existingGrams,
      ...partial,
    };

    // Si se modifica targetKcal pero no se especificó un nuevo proteinPercent ni targetProteinGrams,
    // mantener intactos los gramos de proteína ingresados recalculando el % de proteína correspondiente:
    if (partial.targetKcal !== undefined && partial.proteinPercent === undefined && next.targetProteinGrams && next.targetProteinGrams > 0 && next.targetKcal && next.targetKcal > 0) {
      const pKcal = next.targetProteinGrams * 4;
      const newProteinPct = Math.round(((pKcal / next.targetKcal) * 100) * 10) / 10;
      let nextLipids = next.lipidsPercent;
      let nextCarbs = Math.max(0, Math.round((100 - newProteinPct - nextLipids) * 10) / 10);
      if (newProteinPct + nextLipids > 100) {
        nextLipids = Math.max(0, Math.round((100 - newProteinPct) * 10) / 10);
        nextCarbs = 0;
      }
      next.proteinPercent = newProteinPct;
      next.lipidsPercent = nextLipids;
      next.carbsPercent = nextCarbs;
    }

    onPatientInfoChange({
      ...patientInfo,
      macroPrescription: next,
    });
  };

  // Ajuste de porcentajes manual teniendo como tope número el 100%
  const handleMacroPercentChange = (
    macro: 'protein' | 'lipids' | 'carbs',
    rawVal: string
  ) => {
    if (macro === 'protein') setProteinInputStr(rawVal);
    else if (macro === 'lipids') setLipidsInputStr(rawVal);
    else if (macro === 'carbs') setCarbsInputStr(rawVal);

    const cleaned = rawVal.replace(/[^0-9.,]/g, '').replace(',', '.');
    if (cleaned === '' || cleaned === '.') return;

    let val = parseFloat(cleaned);
    if (isNaN(val)) return;

    // Tope número 100%
    val = Math.min(100, Math.max(0, val));
    val = Math.round(val * 10) / 10;

    let newP = activeProteinPercent;
    let newL = activeLipidsPercent;
    let newC = activeCarbsPercent;

    if (macro === 'protein') {
      newP = val;
      const newGrams = activeTargetKcal > 0 ? Math.round(((activeTargetKcal * (newP / 100)) / 4) * 10) / 10 : 0;
      const remaining = Math.max(0, Math.round((100 - newP) * 10) / 10);
      if (newL > remaining) {
        newL = remaining;
        newC = 0;
      } else {
        newC = Math.max(0, Math.round((remaining - newL) * 10) / 10);
      }
      updateMacroPrescription({
        proteinPercent: newP,
        lipidsPercent: newL,
        carbsPercent: newC,
        targetProteinGrams: newGrams,
        proteinGPerKg: currentWeightNum && currentWeightNum > 0 ? Math.round((newGrams / currentWeightNum) * 10) / 10 : undefined,
      });
      return;
    } else if (macro === 'lipids') {
      newL = val;
      const remaining = Math.max(0, Math.round((100 - newL) * 10) / 10);
      if (newP > remaining) {
        newP = remaining;
        newC = 0;
      } else {
        newC = Math.max(0, Math.round((remaining - newP) * 10) / 10);
      }
    } else if (macro === 'carbs') {
      newC = val;
      const remaining = Math.max(0, Math.round((100 - newC) * 10) / 10);
      if (newP > remaining) {
        newP = remaining;
        newL = 0;
      } else {
        newL = Math.max(0, Math.round((remaining - newP) * 10) / 10);
      }
    }

    updateMacroPrescription({
      proteinPercent: newP,
      lipidsPercent: newL,
      carbsPercent: newC,
    });
  };

  // Cambio directo de los gramos de proteína ingresados
  const handleProteinGramsInputChange = (rawVal: string) => {
    setProteinGramsInputStr(rawVal);
    const cleaned = rawVal.replace(/[^0-9.,]/g, '').replace(',', '.');
    if (cleaned === '' || cleaned === '.') return;
    const val = parseFloat(cleaned);
    if (!isNaN(val) && val >= 0) {
      handleProteinGramsChange(val);
    }
  };

  const handleProteinGramsChange = (newGrams: number) => {
    const kcal = newGrams * 4;
    const newProteinPct = activeTargetKcal > 0 ? Math.round(((kcal / activeTargetKcal) * 100) * 10) / 10 : 20;
    const newGPerKg = currentWeightNum && currentWeightNum > 0 ? Math.round((newGrams / currentWeightNum) * 10) / 10 : undefined;

    let nextLipids = activeLipidsPercent;
    let nextCarbs = Math.max(0, Math.round((100 - newProteinPct - nextLipids) * 10) / 10);
    if (newProteinPct + nextLipids > 100) {
      nextLipids = Math.max(15, Math.round((100 - newProteinPct) * 10) / 10);
      nextCarbs = Math.max(0, Math.round((100 - newProteinPct - nextLipids) * 10) / 10);
    }

    updateMacroPrescription({
      enabled: true,
      targetProteinGrams: newGrams,
      proteinPercent: newProteinPct,
      lipidsPercent: nextLipids,
      carbsPercent: nextCarbs,
      proteinGPerKg: newGPerKg,
    });
  };

  const handleGPerKgInputChange = (rawVal: string) => {
    setGPerKgInputStr(rawVal);
    const cleaned = rawVal.replace(/[^0-9.,]/g, '').replace(',', '.');
    if (cleaned === '' || cleaned === '.') return;
    const val = parseFloat(cleaned);
    if (!isNaN(val) && val >= 0) {
      handleGPerKgChange(val);
    }
  };

  const handleAdjustTo100Percent = (preferredTarget: 'carbs' | 'lipids' | 'proportional' = 'carbs') => {
    const p = activeProteinPercent;
    const l = activeLipidsPercent;
    const c = activeCarbsPercent;
    const sum = Math.round((p + l + c) * 10) / 10;
    const diff = Math.round((100 - sum) * 10) / 10;

    if (preferredTarget === 'carbs') {
      const newCarbs = Math.max(0, Math.round((c + diff) * 10) / 10);
      updateMacroPrescription({ carbsPercent: newCarbs });
    } else if (preferredTarget === 'lipids') {
      const newLipids = Math.max(0, Math.round((l + diff) * 10) / 10);
      updateMacroPrescription({ lipidsPercent: newLipids });
    } else {
      if (sum <= 0) {
        updateMacroPrescription({ proteinPercent: 20, lipidsPercent: 25, carbsPercent: 55 });
      } else {
        const factor = 100 / sum;
        const newP = Math.round(p * factor * 10) / 10;
        const newL = Math.round(l * factor * 10) / 10;
        const newC = Math.max(0, Math.round((100 - newP - newL) * 10) / 10);
        updateMacroPrescription({ proteinPercent: newP, lipidsPercent: newL, carbsPercent: newC });
      }
    }
  };

  const handleResetToSmaeMacros = () => {
    onPatientInfoChange({
      ...patientInfo,
      macroPrescription: {
        enabled: false,
        targetKcal: macros.totalKcal > 0 ? macros.totalKcal : defaultTargetKcal,
        proteinPercent: macros.proteinKcalPercent > 0 ? macros.proteinKcalPercent : 20,
        lipidsPercent: macros.lipidsKcalPercent > 0 ? macros.lipidsKcalPercent : 25,
        carbsPercent: macros.carbsKcalPercent > 0 ? macros.carbsKcalPercent : 55,
        targetProteinGrams: macros.totalProteinGrams > 0 ? macros.totalProteinGrams : undefined,
      },
    });
    setIsManualMacroMode(false);
  };

  const handleGPerKgChange = (newGPerKg: number) => {
    const weight = currentWeightNum && currentWeightNum > 0 ? currentWeightNum : 70;
    const grams = Math.round(newGPerKg * weight * 10) / 10;
    const kcal = grams * 4;
    const newProteinPct = activeTargetKcal > 0 ? Math.round(((kcal / activeTargetKcal) * 100) * 10) / 10 : 20;

    // Auto-ajustar carbohidratos para que la suma cierre exactamente en 100%
    let nextLipids = activeLipidsPercent;
    let nextCarbs = Math.max(0, Math.round((100 - newProteinPct - nextLipids) * 10) / 10);
    if (newProteinPct + nextLipids > 100) {
      nextLipids = Math.max(15, Math.round((100 - newProteinPct) * 10) / 10);
      nextCarbs = Math.max(0, Math.round((100 - newProteinPct - nextLipids) * 10) / 10);
    }

    updateMacroPrescription({
      enabled: true,
      proteinPercent: newProteinPct,
      lipidsPercent: nextLipids,
      carbsPercent: nextCarbs,
      proteinGPerKg: newGPerKg,
      targetProteinGrams: grams, // Guardar los gramos calculados para mantenerlos fijos independientemente de cambios calóricos
    });
  };

  // Cambio de calorías manteniendo estrictamente fijos los gramos de proteína ingresados
  const handleTargetKcalChange = (newKcal: number) => {
    if (isNaN(newKcal) || newKcal <= 0) {
      updateMacroPrescription({ targetKcal: newKcal });
      return;
    }

    // Preservar exactamente el número ingresado de gramos de proteína
    const fixedGrams = patientInfo.macroPrescription?.targetProteinGrams && patientInfo.macroPrescription.targetProteinGrams > 0
      ? patientInfo.macroPrescription.targetProteinGrams
      : metaProteinGrams > 0
      ? metaProteinGrams
      : Math.round(((newKcal * (activeProteinPercent / 100)) / 4) * 10) / 10;

    const pKcal = fixedGrams * 4;
    const newProteinPct = Math.round(((pKcal / newKcal) * 100) * 10) / 10;

    let nextLipids = activeLipidsPercent;
    let nextCarbs = Math.max(0, Math.round((100 - newProteinPct - nextLipids) * 10) / 10);
    if (newProteinPct + nextLipids > 100) {
      nextLipids = Math.max(0, Math.round((100 - newProteinPct) * 10) / 10);
      nextCarbs = 0;
    }

    const calculatedAdj = caloricCalculation.isComplete && caloricCalculation.get
      ? Math.round(newKcal - caloricCalculation.get)
      : undefined;

    updateMacroPrescription({
      enabled: true,
      targetKcal: newKcal,
      caloricAdjustment: calculatedAdj,
      targetProteinGrams: fixedGrams,
      proteinPercent: newProteinPct,
      lipidsPercent: nextLipids,
      carbsPercent: nextCarbs,
      proteinGPerKg: currentWeightNum && currentWeightNum > 0
        ? Math.round((fixedGrams / currentWeightNum) * 10) / 10
        : patientInfo.macroPrescription?.proteinGPerKg,
    });
  };

  // Base GET para cálculo de ajustes
  const baseCaloricGet = caloricCalculation.isComplete && caloricCalculation.get
    ? caloricCalculation.get
    : defaultTargetKcal;

  // Ajuste o diferencia calórica respecto al GET base
  const currentAdjustment = typeof patientInfo.caloricAdjustment === 'number'
    ? patientInfo.caloricAdjustment
    : typeof patientInfo.macroPrescription?.caloricAdjustment === 'number'
    ? patientInfo.macroPrescription.caloricAdjustment
    : patientInfo.macroPrescription?.targetKcal && caloricCalculation.isComplete && caloricCalculation.get
    ? Math.round(patientInfo.macroPrescription.targetKcal - caloricCalculation.get)
    : caloricCalculation.isComplete && caloricCalculation.get
    ? Math.round(activeTargetKcal - caloricCalculation.get)
    : 0;

  // Función para aplicar un ajuste calórico (positivo para agregar, negativo para quitar)
  const handleApplyCaloricAdjustment = (adjKcal: number) => {
    const finalKcal = Math.max(500, Math.round(baseCaloricGet + adjKcal));
    onPatientInfoChange({
      ...patientInfo,
      caloricAdjustment: adjKcal,
      customCaloricTarget: finalKcal,
      macroPrescription: {
        ...(patientInfo.macroPrescription || {
          enabled: true,
          proteinPercent: 20,
          lipidsPercent: 30,
          carbsPercent: 50,
        }),
        enabled: true,
        targetKcal: finalKcal,
        caloricAdjustment: adjKcal,
      },
    });
    handleTargetKcalChange(finalKcal);
  };

  // Control para que el usuario meta el número de calorías a agregar o quitar y vea las Calorías Totales Ajustadas
  const renderAdjustedCaloriesControl = (idPrefix = 'folded') => {
    const isDeficit = currentAdjustment < 0 || (currentAdjustment === 0 && caloricAdjustmentMode === 'subtract');
    const isSurplus = currentAdjustment > 0 || (currentAdjustment === 0 && caloricAdjustmentMode === 'add');
    const absAdj = Math.abs(currentAdjustment);

    return (
      <div className="flex flex-wrap items-center bg-white border border-amber-300/90 rounded-xl p-1 sm:p-1.5 shadow-2xs gap-1.5 text-xs">
        {/* Selector de Acción: Quitar (-) o Agregar (+) */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-2xs">
          <button
            type="button"
            id={`btn-mode-sub-${idPrefix}`}
            onClick={() => {
              setCaloricAdjustmentMode('subtract');
              const amount = absAdj > 0 ? absAdj : 300;
              handleApplyCaloricAdjustment(-amount);
            }}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-2xs font-extrabold transition-all cursor-pointer ${
              currentAdjustment < 0
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50'
            }`}
            title="Quitar calorías"
          >
            <span>Quitar</span>
          </button>
          <button
            type="button"
            id={`btn-mode-add-${idPrefix}`}
            onClick={() => {
              setCaloricAdjustmentMode('add');
              const amount = absAdj > 0 ? absAdj : 300;
              handleApplyCaloricAdjustment(amount);
            }}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-2xs font-extrabold transition-all cursor-pointer ${
              currentAdjustment > 0
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
            }`}
            title="Agregar calorías"
          >
            <span>Agregar</span>
          </button>
        </div>

        {/* Input para meter el número de calorías a agregar o quitar */}
        <div className="relative flex items-center">
          <input
            id={`input-calories-amount-${idPrefix}`}
            type="number"
            min="0"
            max="4000"
            step="50"
            placeholder="Ej. 300"
            value={absAdj === 0 ? '' : absAdj}
            onChange={(e) => {
              const val = e.target.value.trim();
              if (val === '') {
                handleApplyCaloricAdjustment(0);
                return;
              }
              const num = Math.abs(parseFloat(val));
              if (isNaN(num)) return;
              const mode = currentAdjustment > 0 ? 'add' : currentAdjustment < 0 ? 'subtract' : caloricAdjustmentMode;
              handleApplyCaloricAdjustment(mode === 'add' ? num : -num);
            }}
            className={`w-18 px-1.5 py-0.5 text-center text-xs font-black rounded border focus:outline-hidden focus:ring-1 font-mono transition-all ${
              currentAdjustment < 0
                ? 'bg-rose-50 text-rose-950 border-rose-300 focus:ring-rose-400'
                : currentAdjustment > 0
                ? 'bg-emerald-50 text-emerald-950 border-emerald-300 focus:ring-emerald-400'
                : 'bg-slate-50 text-slate-800 border-slate-300 focus:ring-amber-400'
            }`}
            title="Escriba el número de calorías que desea agregar o quitar"
          />
          <span className="text-3xs font-bold text-slate-500 ml-1">kcal</span>
        </div>

        {/* Separador */}
        <div className="h-5 w-px bg-amber-200 hidden sm:block" />

        {/* Resultado: Calorías totales ajustadas */}
        <div className="flex items-center gap-1.5 pl-0.5">
          <span className="text-2xs font-extrabold text-slate-700 uppercase tracking-tight whitespace-nowrap">
            Calorías totales ajustadas:
          </span>
          <div className="relative flex items-center">
            <input
              id={`input-adjusted-calories-${idPrefix}`}
              type="number"
              min="500"
              max="8000"
              step="10"
              value={activeTargetKcal}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                handleTargetKcalChange(isNaN(val) ? 0 : val);
              }}
              className="w-20 px-1.5 py-0.5 text-center text-xs font-black text-amber-950 bg-amber-50/80 border border-amber-300 rounded focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-mono transition-all"
              title="Total de calorías ajustadas final"
            />
            <span className="text-3xs font-bold text-slate-500 ml-1">kcal</span>
          </div>

          {currentAdjustment !== 0 && (
            <button
              type="button"
              onClick={() => handleApplyCaloricAdjustment(0)}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer ml-0.5"
              title="Restablecer ajuste a 0 (volver al GET base)"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const hasAnyPatientData = Boolean(
    patientInfo.name?.trim() ||
    patientInfo.goal?.trim() ||
    patientInfo.gender ||
    patientInfo.weight ||
    patientInfo.height ||
    patientInfo.age ||
    patientInfo.notes?.trim() ||
    patientInfo.fatPercent ||
    patientInfo.skinfolds?.triceps
  );

  const handleClearPatientData = () => {
    onPatientInfoChange({
      name: '',
      date: new Date().toISOString().split('T')[0],
      goal: '',
      notes: '',
      gender: '',
      age: '',
      weight: '',
      height: '',
      fatPercent: '',
      fatKg: '',
      musclePercent: '',
      muscleKg: '',
      bonePercent: '',
      boneKg: '',
      residualPercent: '',
      residualKg: '',
      skinfolds: undefined,
      girths: undefined,
      breadths: undefined,
      preferredFoods: '',
      dislikedFoods: '',
      mealPreferences: undefined,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-emerald-100/80 shadow-xs p-4 sm:p-5 mb-6 transition-all no-print">
      {/* Top Banner: Datos del Paciente y Prescripción */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-700 to-teal-800 text-white flex items-center justify-center shadow-xs">
            <User className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 font-heading flex items-center gap-2">
              <span>{patientInfo.name?.trim() ? patientInfo.name.trim() : 'Prescripción Dietética del Paciente'}</span>
            </h3>
            <p className="text-2xs text-slate-500 font-medium">
              {patientInfo.goal?.trim() ? patientInfo.goal.trim() : 'Valoración antropométrica, distribución de macronutrientes y notas clínicas'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasAnyPatientData && (
            <button
              id="btn-clear-patient-data"
              type="button"
              onClick={handleClearPatientData}
              className="flex items-center gap-1 px-2.5 py-1.5 text-2xs font-semibold text-slate-600 hover:text-red-700 bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl transition-all cursor-pointer"
              title="Limpiar todos los datos del paciente e iniciar en blanco"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Iniciar en blanco</span>
            </button>
          )}

          <button
            id="btn-toggle-patient-details"
            type="button"
            onClick={() => setShowPatientDetails(!showPatientDetails)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all cursor-pointer shadow-2xs"
            title={showPatientDetails ? 'Ocultar datos del paciente' : 'Ver datos del paciente'}
          >
            <span>{showPatientDetails ? 'Ocultar datos' : 'Ver datos'}</span>
            {showPatientDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Patient Info / Prescription Settings */}
      {showPatientDetails && (
        <div className="mt-4 space-y-3">
          {/* Fila 1: Identificación y Objetivo */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-7">
              <label
                style={{ fontSize: '13px' }}
                className="block text-2xs font-bold uppercase tracking-wider text-slate-500 mb-1"
              >
                Nombre de la Paciente / Paciente
              </label>
              <input
                id="input-patient-name"
                type="text"
                placeholder="Nombre completo del paciente"
                value={patientInfo.name}
                onChange={(e) => onPatientInfoChange({ ...patientInfo, name: e.target.value })}
                className="w-full px-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>

            <div className="sm:col-span-5">
              <label
                style={{ fontSize: '13px' }}
                className="block text-2xs font-bold uppercase tracking-wider text-slate-500 mb-1"
              >
                Diagnóstico / Objetivo Nutricional
              </label>
              <input
                id="input-patient-goal"
                type="text"
                placeholder="Objetivo o diagnóstico nutricional"
                value={patientInfo.goal}
                onChange={(e) => onPatientInfoChange({ ...patientInfo, goal: e.target.value })}
                className="w-full px-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Cuadro Unificado: Valoración Antropométrica y Composición Corporal */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-3 sm:p-3.5 space-y-3 shadow-2xs">
            <div className="flex items-center gap-1.5 border-b border-slate-200/70 pb-2">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-800">
                Valoración Antropométrica y Composición Corporal
              </span>
            </div>

            {/* Fila 1 del cuadro: Sexo, Edad, Estatura, Masa Corporal, IMC */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-12 gap-3 items-end">
              {/* Sexo: Selección Hombre o Mujer */}
              <div className="col-span-1 sm:col-span-1 lg:col-span-2">
                <label
                  style={{ fontSize: '13px' }}
                  className="block text-2xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1"
                >
                  <User className="w-3 h-3 text-emerald-600" />
                  Sexo
                </label>
                <div className="grid grid-cols-2 gap-1 bg-white border border-slate-200 rounded-lg p-1 min-h-[38px] items-center">
                  <button
                    id="btn-gender-hombre"
                    type="button"
                    onClick={() =>
                      onPatientInfoChange({
                        ...patientInfo,
                        gender: patientInfo.gender === 'Hombre' ? '' : 'Hombre',
                      })
                    }
                    className={`py-1 px-1 text-xs font-bold rounded-md transition-all text-center ${
                      patientInfo.gender === 'Hombre'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Hombre
                  </button>
                  <button
                    id="btn-gender-mujer"
                    type="button"
                    onClick={() =>
                      onPatientInfoChange({
                        ...patientInfo,
                        gender: patientInfo.gender === 'Mujer' ? '' : 'Mujer',
                      })
                    }
                    className={`py-1 px-1 text-xs font-bold rounded-md transition-all text-center ${
                      patientInfo.gender === 'Mujer'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Mujer
                  </button>
                </div>
              </div>

              {/* Edad */}
              <div className="col-span-1 sm:col-span-1 lg:col-span-2">
                <label
                  style={{ fontSize: '13px' }}
                  className="block text-2xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1"
                >
                  <Calendar className="w-3 h-3 text-emerald-600" />
                  Edad
                </label>
                <div className="relative">
                  <input
                    id="input-patient-age"
                    type="text"
                    placeholder="Ej. 28 años"
                    value={patientInfo.age || ''}
                    onChange={(e) => onPatientInfoChange({ ...patientInfo, age: e.target.value })}
                    className="w-full px-3 py-2 text-xs text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all pr-12"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-2xs font-bold text-slate-400 pointer-events-none">
                    años
                  </span>
                </div>
              </div>

              {/* Estatura */}
              <div className="col-span-1 sm:col-span-1 lg:col-span-2">
                <label
                  htmlFor="input-patient-height"
                  style={{ fontSize: '13px' }}
                  className="block text-2xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1 cursor-pointer"
                >
                  <Ruler className="w-3 h-3 text-emerald-600" />
                  Estatura (cm)
                </label>
                <div className="relative">
                  <input
                    id="input-patient-height"
                    type="text"
                    inputMode="decimal"
                    placeholder="Ej. 170"
                    value={patientInfo.height || ''}
                    onChange={(e) => onPatientInfoChange({ ...patientInfo, height: e.target.value })}
                    className="w-full px-3 py-2 text-xs text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all pr-11 font-medium cursor-text [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-2xs font-bold text-slate-500 pointer-events-none bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    cm
                  </span>
                </div>
              </div>

              {/* Masa Corporal */}
              <div className="col-span-1 sm:col-span-1 lg:col-span-3">
                <label
                  style={{ fontSize: '13px' }}
                  className="block text-2xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1"
                >
                  <Weight className="w-3 h-3 text-emerald-600" />
                  Masa Corporal (Kg)
                </label>
                <div className="relative">
                  <input
                    id="input-patient-weight"
                    type="text"
                    placeholder="Ej. 68.5 kg"
                    value={patientInfo.weight || ''}
                    onChange={(e) => onPatientInfoChange({ ...patientInfo, weight: e.target.value })}
                    className="w-full px-3 py-2 text-xs text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all pr-10"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-2xs font-bold text-slate-400 pointer-events-none">
                    kg
                  </span>
                </div>
              </div>

              {/* IMC Automático */}
              <div className="col-span-2 sm:col-span-2 lg:col-span-3 bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between min-h-[38px]">
                <span
                  style={{ textAlign: 'center', fontSize: '13px' }}
                  className="text-2xs font-bold uppercase tracking-wider text-slate-500"
                >
                  IMC Calculado:
                </span>
                {(() => {
                  const bmi = calculateBmiInfo(patientInfo.height, patientInfo.weight);
                  if (!bmi) {
                    return (
                      <span
                        style={{ fontSize: '14px' }}
                        className="text-2xs text-slate-400 italic"
                      >
                        Requiere talla y peso
                      </span>
                    );
                  }
                  return (
                    <span
                      style={{ fontSize: '14px' }}
                      className={`text-2xs font-bold px-2 py-0.5 rounded-md border ${bmi.colorClass}`}
                    >
                      {bmi.formatted} • {bmi.category}
                    </span>
                  );
                })()}
              </div>
            </div>


            {/* Fila 2 del cuadro: Mediciones Antropométricas Adicionales (Pliegues, Circunferencias, Diámetros) */}
            <div className="border-t border-slate-200/80 pt-2.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="text-3xs font-bold uppercase tracking-wider text-slate-700">
                    Mediciones Antropométricas (Pliegues, Circunferencias y Diámetros)
                  </span>
                  <span className="text-3xs font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                    <EyeOff className="w-2.5 h-2.5 text-slate-400" />
                    No se muestra en PDF/Word
                  </span>
                </div>

                {/* Selector de pestañas / visualización */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 text-3xs font-semibold">
                  <button
                    id="btn-tab-anthropo-all"
                    type="button"
                    onClick={() => setAnthropoTab('all')}
                    className={`px-2 py-1 rounded-md transition-all ${
                      anthropoTab === 'all'
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Ver Todos
                  </button>
                  <button
                    id="btn-tab-anthropo-skinfolds"
                    type="button"
                    onClick={() => setAnthropoTab('skinfolds')}
                    className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 ${
                      anthropoTab === 'skinfolds'
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Pliegues ({skinfoldsCount}/10)
                  </button>
                  <button
                    id="btn-tab-anthropo-girths"
                    type="button"
                    onClick={() => setAnthropoTab('girths')}
                    className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 ${
                      anthropoTab === 'girths'
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Circunferencias ({girthsCount}/5)
                  </button>
                  <button
                    id="btn-tab-anthropo-breadths"
                    type="button"
                    onClick={() => setAnthropoTab('breadths')}
                    className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 ${
                      anthropoTab === 'breadths'
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Diámetros ({breadthsCount}/3)
                  </button>
                </div>
              </div>

              {/* Paneles de datos según pestaña */}
              <div className="space-y-2.5">
                {/* 1. Pliegues Cutáneos (mm) */}
                {(anthropoTab === 'all' || anthropoTab === 'skinfolds') && (
                  <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                      <span className="text-2xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        Pliegues Cutáneos (Mediciones en mm)
                      </span>
                      <span className="text-3xs text-slate-400 font-medium">
                        Sumatorias visibles en el Cuadro de Equivalentes
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                      {[
                        { key: 'triceps' as const, label: 'Tríceps', id: 'input-skinfold-triceps' },
                        { key: 'subescapular' as const, label: 'Subescapular', id: 'input-skinfold-subescapular' },
                        { key: 'biceps' as const, label: 'Bíceps', id: 'input-skinfold-biceps' },
                        { key: 'pectoral' as const, label: 'Pectoral', id: 'input-skinfold-pectoral' },
                        { key: 'axilar' as const, label: 'Axilar', id: 'input-skinfold-axilar' },
                        { key: 'crestaIliaca' as const, label: 'Cresta Ilíaca', id: 'input-skinfold-cresta-iliaca' },
                        { key: 'supraespinal' as const, label: 'Supraespinal', id: 'input-skinfold-supraespinal' },
                        { key: 'abdominal' as const, label: 'Abdominal', id: 'input-skinfold-abdominal' },
                        { key: 'musloFrontal' as const, label: 'Muslo Frontal', id: 'input-skinfold-muslo-frontal' },
                        { key: 'pantorrillaMedial' as const, label: 'Pantorrilla Medial', id: 'input-skinfold-pantorrilla-medial' },
                      ].map((item) => (
                        <div key={item.key}>
                          <label htmlFor={item.id} className="block text-3xs font-bold text-slate-600 uppercase mb-0.5 truncate" title={item.label}>
                            {item.label}
                          </label>
                          <div className="relative">
                            <input
                              id={item.id}
                              type="text"
                              inputMode="decimal"
                              placeholder="0.0"
                              value={patientInfo.skinfolds?.[item.key] || ''}
                              onChange={(e) => handleSkinfoldChange(item.key, e.target.value)}
                              className="w-full px-2 py-1 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:bg-white pr-7 font-medium"
                            />
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-3xs font-bold text-slate-400 pointer-events-none">
                              mm
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Circunferencias Corporales (cm) */}
                {(anthropoTab === 'all' || anthropoTab === 'girths') && (
                  <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-2xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                        Circunferencias Corporales
                      </span>
                      {whr && (
                        <span className="hidden">
                          ICC (Cintura/Cadera): {whr}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                      {[
                        { key: 'brazoRelajado' as const, label: 'Brazo (relajado)', id: 'input-girth-brazo-relajado' },
                        { key: 'brazoContraido' as const, label: 'Brazo (contraído)', id: 'input-girth-brazo-contraido' },
                        { key: 'cinturaMinima' as const, label: 'Cintura (mínima)', id: 'input-girth-cintura-minima' },
                        { key: 'caderasMaximo' as const, label: 'Caderas (máximo)', id: 'input-girth-caderas-maximo' },
                        { key: 'pantorrillaMaximo' as const, label: 'Pantorrilla (máximo)', id: 'input-girth-pantorrilla-maximo' },
                      ].map((item) => (
                        <div key={item.key}>
                          <label htmlFor={item.id} className="block text-3xs font-bold text-slate-600 uppercase mb-0.5 truncate" title={item.label}>
                            {item.label}
                          </label>
                          <div className="relative">
                            <input
                              id={item.id}
                              type="text"
                              inputMode="decimal"
                              placeholder="0.0"
                              value={patientInfo.girths?.[item.key] || ''}
                              onChange={(e) => handleGirthChange(item.key, e.target.value)}
                              className="w-full px-2 py-1 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-teal-500 focus:bg-white pr-7 font-medium"
                            />
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-3xs font-bold text-slate-400 pointer-events-none">
                              cm
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Diámetros (cm) */}
                {(anthropoTab === 'all' || anthropoTab === 'breadths') && (
                  <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-2xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-600"></span>
                        Diámetros Óseos
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {[
                        { key: 'humeral' as const, label: 'Humeral', id: 'input-breadth-humeral' },
                        { key: 'biestiloideo' as const, label: 'Biestiloideo', id: 'input-breadth-biestiloideo' },
                        { key: 'femoral' as const, label: 'Femoral', id: 'input-breadth-femoral' },
                      ].map((item) => (
                        <div key={item.key}>
                          <label htmlFor={item.id} className="block text-3xs font-bold text-slate-600 uppercase mb-0.5 truncate" title={item.label}>
                            {item.label}
                          </label>
                          <div className="relative">
                            <input
                              id={item.id}
                              type="text"
                              inputMode="decimal"
                              placeholder="0.0"
                              value={patientInfo.breadths?.[item.key] || ''}
                              onChange={(e) => handleBreadthChange(item.key, e.target.value)}
                              className="w-full px-2 py-1 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-sky-500 focus:bg-white pr-7 font-medium"
                            />
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-3xs font-bold text-slate-400 pointer-events-none">
                              cm
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fila 3 del cuadro: Composición Corporal (Modelo 4 Componentes) */}
            <div className="border-t border-slate-200/80 pt-2.5 space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="text-3xs font-bold uppercase tracking-wider text-slate-700">
                  Composición Corporal (Modelo 4 Componentes)
                </span>
                <span className="text-3xs font-semibold px-1.5 py-0.2 rounded bg-emerald-100/80 text-emerald-800 border border-emerald-200">
                  Opcional
                </span>
              </div>

              {/* Grid 4 Componentes: Grasa, Músculo, Hueso, Residual */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
                {/* 1. Masa Grasa */}
                <div className="flex flex-col h-full bg-white border border-amber-200/90 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between gap-1.5 pb-2 mb-2 border-b border-amber-100 min-h-[34px]">
                    <span className="text-2xs font-extrabold text-amber-950 flex items-center gap-1.5 tracking-tight">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                      Masa Grasa
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100/80 text-amber-900 border border-amber-200/80 shrink-0">
                      Directo o Fórmulas
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2.5">
                    <div>
                      <label
                        htmlFor="input-fat-percent"
                        style={{ fontSize: '13px' }}
                        className="block text-3xs font-bold text-slate-600 uppercase mb-1 truncate"
                        title="Porcentaje de Grasa"
                      >
                        Porcentaje Grasa
                      </label>
                      <div className="relative">
                        <input
                          id="input-fat-percent"
                          type="text"
                          inputMode="decimal"
                          placeholder="Ej. 21.5"
                          value={patientInfo.fatPercent || ''}
                          onChange={(e) => {
                            const newPct = e.target.value;
                            let newKg = patientInfo.fatKg;
                            const w = parseFloat(String(patientInfo.weight ?? '').replace(',', '.') || '');
                            const p = parseFloat(newPct.replace(',', '.'));
                            if (!isNaN(w) && w > 0 && !isNaN(p)) {
                              newKg = ((p * w) / 100).toFixed(2);
                            }
                            onPatientInfoChange({ ...patientInfo, fatPercent: newPct, fatKg: newKg });
                          }}
                          className="w-full px-2 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500 focus:bg-white pr-6 font-semibold"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-3xs font-bold text-slate-400 pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="input-fat-kg"
                        style={{ fontSize: '13px' }}
                        className="block text-3xs font-bold text-slate-600 uppercase mb-1 truncate"
                        title="Kilogramos de Grasa"
                      >
                        Kilogramos Grasa
                      </label>
                      <div className="relative">
                        <input
                          id="input-fat-kg"
                          type="text"
                          inputMode="decimal"
                          placeholder="Ej. 14.8"
                          value={patientInfo.fatKg || ''}
                          onChange={(e) => {
                            const newKg = e.target.value;
                            let newPct = patientInfo.fatPercent;
                            const w = parseFloat(String(patientInfo.weight ?? '').replace(',', '.') || '');
                            const k = parseFloat(newKg.replace(',', '.'));
                            if (!isNaN(w) && w > 0 && !isNaN(k)) {
                              newPct = ((k / w) * 100).toFixed(1);
                            }
                            onPatientInfoChange({ ...patientInfo, fatKg: newKg, fatPercent: newPct });
                          }}
                          className="w-full px-2 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500 focus:bg-white pr-7 font-semibold"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-3xs font-bold text-slate-400 pointer-events-none">
                          kg
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fórmulas de Estimación Antropométrica */}
                  <div className="pt-2 border-t border-amber-200/70 flex-1 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5 min-h-[22px]">
                      <span className="text-[10px] font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                        Fórmulas de Grasa
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-200/80 text-amber-900 ml-0.5 shrink-0">
                          {completedEstimationsCount}/{bodyFatEstimations.length}
                        </span>
                      </span>
                      <span className="text-[9px] text-amber-800 font-medium shrink-0">
                        Clic para aplicar
                      </span>
                    </div>

                    <div className="h-[240px] overflow-y-auto pr-1 space-y-1.5">
                      {sortedBodyFatEstimations.map((formula) => {
                        const isSelected = Boolean(
                          formula.bodyFatPercent &&
                          patientInfo.fatPercent &&
                          parseFloat(String(patientInfo.fatPercent).replace(',', '.')) === parseFloat(String(formula.bodyFatPercent).replace(',', '.'))
                        );

                        return (
                          <div
                            key={formula.id}
                            id={`formula-card-${formula.id}`}
                            onClick={
                              formula.bodyFatPercent
                                ? () => {
                                    const newFatPercent = formula.bodyFatPercent!;
                                    const weightNum = parseFloat(String(patientInfo.weight ?? '').replace(',', '.') || '');
                                    const p = parseFloat(newFatPercent.replace(',', '.'));
                                    let newFatKg = patientInfo.fatKg;
                                    if (!isNaN(weightNum) && weightNum > 0 && !isNaN(p)) {
                                      newFatKg = ((p * weightNum) / 100).toFixed(2);
                                    }
                                    onPatientInfoChange({
                                      ...patientInfo,
                                      fatPercent: newFatPercent,
                                      fatKg: newFatKg,
                                    });
                                  }
                                : undefined
                            }
                            className={`p-1.5 rounded-lg border text-left transition-all ${
                              formula.bodyFatPercent
                                ? isSelected
                                ? 'bg-amber-100/90 border-amber-400 ring-1 ring-amber-400 cursor-pointer shadow-xs'
                                : 'bg-amber-50/90 hover:bg-amber-100 border-amber-300/80 cursor-pointer shadow-2xs hover:border-amber-400 group'
                                : 'bg-slate-50/80 border-slate-200/70 opacity-80 cursor-default'
                            }`}
                            title={`${formula.name} (${formula.equationBadge})\n• Población: ${formula.population}\n• Plicómetro: ${formula.caliper}\n• Fuente: ${formula.reference}\n${
                              formula.bodyFatPercent
                                ? `• Clic para aplicar ${formula.bodyFatPercent}% (${formula.detailText})`
                                : `• ${formula.missingText}`
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1 min-w-0">
                                <span
                                  className={`text-[10px] font-bold truncate ${
                                    formula.bodyFatPercent ? 'text-amber-950' : 'text-slate-700'
                                  }`}
                                >
                                  {formula.name}
                                </span>
                                <span className="text-[8px] font-semibold px-1 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                                  {formula.equationBadge}
                                </span>
                                {isSelected && (
                                  <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-amber-500 text-white shrink-0">
                                    Activo
                                  </span>
                                )}
                              </div>
                              {formula.bodyFatPercent ? (
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-xs font-black text-amber-900 bg-amber-200/70 px-1.5 py-0.5 rounded border border-amber-300 group-hover:scale-105 transition-transform">
                                    {formula.bodyFatPercent}%
                                  </span>
                                  {(() => {
                                    const w = parseFloat(String(patientInfo.weight ?? '').replace(',', '.') || '');
                                    const p = parseFloat(formula.bodyFatPercent.replace(',', '.'));
                                    if (!isNaN(w) && w > 0 && !isNaN(p)) {
                                      const kg = ((p * w) / 100).toFixed(1);
                                      return (
                                        <span className="text-3xs font-bold text-amber-900/90 bg-amber-100 px-1 py-0.5 rounded border border-amber-200">
                                          {kg} kg
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                              ) : (
                                <span className="text-3xs font-medium text-slate-400 shrink-0">
                                  —%
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] mt-0.5 flex items-center justify-between gap-1">
                              <span
                                className={`truncate ${
                                  formula.bodyFatPercent ? 'text-amber-800 font-medium' : 'text-slate-400 italic'
                                }`}
                              >
                                {formula.bodyFatPercent ? formula.detailText : formula.missingText}
                              </span>
                              {formula.bodyFatPercent && (
                                <span className="text-[9px] text-amber-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  Usar ↵
                                </span>
                              )}
                            </div>

                            {/* Metadatos Bibliográficos / ISAK: Población y Plicómetro */}
                            <div className="mt-1 pt-1 border-t border-amber-200/50 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[8.5px] leading-tight text-slate-600">
                              <span className="truncate min-w-0 flex items-center gap-1" title={`Población: ${formula.population}\nFuente: ${formula.reference}`}>
                                <span className="font-bold text-amber-950">Pob:</span>
                                <span className={formula.bodyFatPercent ? 'text-slate-700' : 'text-slate-400'}>{formula.population}</span>
                              </span>
                              <span className="shrink-0 flex items-center gap-1" title={`Plicómetro utilizado: ${formula.caliper}`}>
                                <span className="font-bold text-amber-950">Plicómetro:</span>
                                <span className="px-1 py-0.2 rounded bg-amber-100/80 border border-amber-200 font-semibold text-amber-900">{formula.caliper}</span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 2. Masa Muscular */}
                <div className="flex flex-col h-full bg-white border border-rose-200/90 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between gap-1.5 pb-2 mb-2 border-b border-rose-100 min-h-[34px]">
                    <span className="text-2xs font-extrabold text-rose-950 flex items-center gap-1.5 tracking-tight">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
                      Masa Muscular
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2.5">
                    <div>
                      <label
                        htmlFor="input-muscle-percent"
                        style={{ fontSize: '13px' }}
                        className="block text-3xs font-bold text-slate-600 uppercase mb-1 truncate"
                        title="Porcentaje Muscular"
                      >
                        Porcentaje Músculo
                      </label>
                      <div className="relative">
                        <input
                          id="input-muscle-percent"
                          type="text"
                          inputMode="decimal"
                          placeholder="Ej. 42.0"
                          value={patientInfo.musclePercent || ''}
                          onChange={(e) => {
                            const newPct = e.target.value;
                            let newKg = patientInfo.muscleKg;
                            const w = parseFloat(String(patientInfo.weight ?? '').replace(',', '.') || '');
                            const p = parseFloat(newPct.replace(',', '.'));
                            if (!isNaN(w) && w > 0 && !isNaN(p)) {
                              newKg = ((p * w) / 100).toFixed(2);
                            }
                            onPatientInfoChange({ ...patientInfo, musclePercent: newPct, muscleKg: newKg });
                          }}
                          className="w-full px-2 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-rose-500 focus:bg-white pr-6 font-semibold"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-3xs font-bold text-slate-400 pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="input-muscle-kg"
                        style={{ fontSize: '13px' }}
                        className="block text-3xs font-bold text-slate-600 uppercase mb-1 truncate"
                        title="Kilogramos de Masa Muscular"
                      >
                        Kilogramos Músculo
                      </label>
                      <div className="relative">
                        <input
                          id="input-muscle-kg"
                          type="text"
                          inputMode="decimal"
                          placeholder="Ej. 28.7"
                          value={patientInfo.muscleKg || ''}
                          onChange={(e) => {
                            const newKg = e.target.value;
                            let newPct = patientInfo.musclePercent;
                            const w = parseFloat(String(patientInfo.weight ?? '').replace(',', '.') || '');
                            const k = parseFloat(newKg.replace(',', '.'));
                            if (!isNaN(w) && w > 0 && !isNaN(k)) {
                              newPct = ((k / w) * 100).toFixed(1);
                            }
                            onPatientInfoChange({ ...patientInfo, muscleKg: newKg, musclePercent: newPct });
                          }}
                          className="w-full px-2 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-rose-500 focus:bg-white pr-7 font-semibold"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-3xs font-bold text-slate-400 pointer-events-none">
                          kg
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sección Masa Libre de Grasa (MLG = Peso - Kg de grasa) */}
                  <div className="pt-2 border-t border-rose-100/90 mt-0.5">
                    <div className="p-2 rounded-lg bg-rose-50/80 border border-rose-200/80 flex items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                        <span className="text-2xs font-bold text-rose-950 truncate">
                          Masa libre de grasa
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          id="result-masa-libre-grasa-kg"
                          className="text-xs font-black text-rose-950 bg-white px-2 py-0.5 rounded border border-rose-200 shadow-2xs font-mono"
                          title="Peso total menos Kilogramos de grasa"
                        >
                          {fatFreeMassKg !== null ? `${fatFreeMassKg} kg` : '— kg'}
                        </span>
                        {fatFreeMassPercent !== null && (
                          <span className="text-3xs font-bold text-rose-800 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200">
                            {fatFreeMassPercent}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-[9px] text-slate-500 mt-1 flex items-center justify-between px-1">
                      <span className="font-semibold text-rose-950">Resultado: peso − kg de grasa</span>
                      {patientWeightNum > 0 && patientFatKgNum !== null ? (
                        <span className="font-medium text-slate-600">
                          {patientWeightNum} kg − {patientFatKgNum.toFixed(1)} kg
                        </span>
                      ) : (
                        <span className="italic text-slate-400">
                          {patientWeightNum <= 0 ? 'Falta peso' : 'Falta kg de grasa'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sección Inferior: Fórmula Antropométrica */}
                  <div className="hidden pt-2 border-t border-rose-200/70 flex-1 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5 min-h-[22px]">
                      <span className="text-[10px] font-bold text-rose-950 uppercase tracking-wider">
                        Fórmula Antropométrica
                      </span>
                      <span className="text-[9px] text-rose-800 font-medium">
                        Ecuación de fraccionamiento
                      </span>
                    </div>

                    <div className="h-[210px] flex flex-col justify-between gap-2">
                      <div className="hidden p-2.5 rounded-lg bg-rose-50/70 border border-rose-200/70 space-y-1.5 text-xs">
                        <div className="text-[11px] font-bold text-rose-950 flex items-center justify-between">
                          <span>Ecuación de 4 Componentes:</span>
                        </div>
                        <div className="text-[10px] font-semibold text-rose-900 bg-white/80 p-1.5 rounded border border-rose-200/60 leading-relaxed">
                          100 - (Masa Grasa + Masa Ósea + Masa Residual)
                        </div>
                        <div className="grid grid-cols-3 gap-1 pt-1 text-center text-3xs">
                          <div className="bg-white/80 rounded p-1 border border-rose-100">
                            <span className="text-slate-500 block truncate">Grasa</span>
                            <strong className="text-amber-900 font-bold">{patientInfo.fatPercent || '—'}%</strong>
                          </div>
                          <div className="bg-white/80 rounded p-1 border border-rose-100">
                            <span className="text-slate-500 block truncate">Ósea</span>
                            <strong className="text-sky-900 font-bold">{patientInfo.bonePercent || '—'}%</strong>
                          </div>
                          <div className="bg-white/80 rounded p-1 border border-rose-100">
                            <span className="text-slate-500 block truncate">Residual</span>
                            <strong className="text-purple-900 font-bold">{patientInfo.residualPercent || '—'}%</strong>
                          </div>
                        </div>
                      </div>

                      <div
                        id="formula-card-muscle"
                        onClick={
                          muscleMassEst.isComplete && muscleMassEst.musclePercent
                            ? () => {
                                onPatientInfoChange({
                                  ...patientInfo,
                                  musclePercent: muscleMassEst.musclePercent!,
                                  muscleKg: muscleMassEst.muscleKg || patientInfo.muscleKg,
                                });
                              }
                            : undefined
                        }
                        className={`hidden p-2 rounded-lg border text-left transition-all ${
                          muscleMassEst.isComplete
                            ? isMuscleActive
                              ? 'bg-rose-100/90 border-rose-400 ring-1 ring-rose-400 cursor-pointer shadow-xs'
                              : 'bg-rose-50/90 hover:bg-rose-100 border-rose-300/80 cursor-pointer shadow-2xs hover:border-rose-400 group'
                            : 'bg-slate-50/80 border-slate-200/70 opacity-80 cursor-default'
                        }`}
                        title={
                          muscleMassEst.isComplete
                            ? `Fórmula por defecto activa: ${muscleMassEst.musclePercent}% (${muscleMassEst.muscleKg || '—'} kg)`
                            : muscleMassEst.missingText || ''
                        }
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className={`text-[10px] font-bold truncate ${muscleMassEst.isComplete ? 'text-rose-950' : 'text-slate-700'}`}>
                              Fraccionamiento Corporal
                            </span>
                            <span className="text-[8px] font-semibold px-1 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
                              Masa Muscular
                            </span>
                            {isMuscleActive && (
                              <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-rose-600 text-white shrink-0">
                                Activo por defecto
                              </span>
                            )}
                          </div>
                          {muscleMassEst.isComplete ? (
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-xs font-black text-rose-900 bg-rose-200/70 px-1.5 py-0.5 rounded border border-rose-300 group-hover:scale-105 transition-transform">
                                {muscleMassEst.musclePercent}%
                              </span>
                              {muscleMassEst.muscleKg && (
                                <span className="text-3xs font-bold text-rose-900/90 bg-rose-100 px-1 py-0.5 rounded border border-rose-200">
                                  {muscleMassEst.muscleKg} kg
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-3xs font-medium text-slate-400 shrink-0">
                              —%
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] mt-0.5 flex items-center justify-between gap-1">
                          <span className={`truncate ${muscleMassEst.isComplete ? 'text-rose-800 font-medium' : 'text-slate-400 italic'}`}>
                            {muscleMassEst.isComplete ? muscleMassEst.detailText : muscleMassEst.missingText}
                          </span>
                          {muscleMassEst.isComplete && !isMuscleActive && (
                            <span className="text-[9px] text-rose-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              Usar ↵
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Masa Ósea */}
                <div className="flex flex-col h-full bg-white border border-sky-200/90 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between gap-1.5 pb-2 mb-2 border-b border-sky-100 min-h-[34px]">
                    <span className="text-2xs font-extrabold text-sky-950 flex items-center gap-1.5 tracking-tight">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0"></span>
                      Masa Ósea
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100/80 text-sky-900 border border-sky-200/80 shrink-0">
                      Fórmula Rocha (Por defecto)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2.5">
                    <div>
                      <label
                        htmlFor="input-bone-percent"
                        style={{ fontSize: '13px' }}
                        className="block text-3xs font-bold text-slate-600 uppercase mb-1 truncate"
                        title="Porcentaje Óseo"
                      >
                        Porcentaje Hueso
                      </label>
                      <div className="relative">
                        <input
                          id="input-bone-percent"
                          type="text"
                          inputMode="decimal"
                          placeholder="Ej. 14.0"
                          value={patientInfo.bonePercent || ''}
                          onChange={(e) => {
                            const newPct = e.target.value;
                            let newKg = patientInfo.boneKg;
                            const w = parseFloat(String(patientInfo.weight ?? '').replace(',', '.') || '');
                            const p = parseFloat(newPct.replace(',', '.'));
                            if (!isNaN(w) && w > 0 && !isNaN(p)) {
                              newKg = ((w * p) / 100).toFixed(2);
                            }
                            onPatientInfoChange({ ...patientInfo, bonePercent: newPct, boneKg: newKg });
                          }}
                          className="w-full px-2 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-sky-500 focus:bg-white pr-6 font-semibold"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-3xs font-bold text-slate-400 pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="input-bone-kg"
                        style={{ fontSize: '13px' }}
                        className="block text-3xs font-bold text-slate-600 uppercase mb-1 truncate"
                        title="Kilogramos de Masa Ósea"
                      >
                        Kilogramos Hueso
                      </label>
                      <div className="relative">
                        <input
                          id="input-bone-kg"
                          type="text"
                          inputMode="decimal"
                          placeholder="Ej. 9.6"
                          value={patientInfo.boneKg || ''}
                          onChange={(e) => {
                            const newKg = e.target.value;
                            let newPct = patientInfo.bonePercent;
                            const w = parseFloat(String(patientInfo.weight ?? '').replace(',', '.') || '');
                            const k = parseFloat(newKg.replace(',', '.'));
                            if (!isNaN(w) && w > 0 && !isNaN(k)) {
                              newPct = ((k / w) * 100).toFixed(1);
                            }
                            onPatientInfoChange({ ...patientInfo, boneKg: newKg, bonePercent: newPct });
                          }}
                          className="w-full px-2 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-sky-500 focus:bg-white pr-7 font-semibold"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-3xs font-bold text-slate-400 pointer-events-none">
                          kg
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sección Inferior: Fórmula Rocha Card */}
                  <div className="hidden pt-2 border-t border-sky-200/70 flex-1 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5 min-h-[22px]">
                      <span className="text-[10px] font-bold text-sky-950 uppercase tracking-wider">
                        Fórmula Antropométrica
                      </span>
                      <span className="text-[9px] text-sky-800 font-medium">
                        Ecuación Rocha (1975)
                      </span>
                    </div>

                    <div className="h-[210px] flex flex-col justify-between gap-2">
                      <div className="hidden p-2.5 rounded-lg bg-sky-50/70 border border-sky-200/70 space-y-1.5 text-xs">
                        <div className="text-[11px] font-bold text-sky-950 flex items-center justify-between">
                          <span>Variables de Cálculo Óseo:</span>
                        </div>
                        <div className="text-[10px] font-semibold text-sky-900 bg-white/80 p-1.5 rounded border border-sky-200/60 leading-relaxed truncate">
                          Estatura² × Diámetro Humeral × Diámetro Femoral
                        </div>
                        <div className="grid grid-cols-3 gap-1 pt-1 text-center text-3xs">
                          <div className="bg-white/80 rounded p-1 border border-sky-100">
                            <span className="text-slate-500 block truncate">Estatura</span>
                            <strong className="text-sky-950 font-bold">{patientInfo.height ? `${patientInfo.height} cm` : '—'}</strong>
                          </div>
                          <div className="bg-white/80 rounded p-1 border border-sky-100">
                            <span className="text-slate-500 block truncate">Humeral</span>
                            <strong className="text-sky-950 font-bold">{patientInfo.breadths?.humeral ? `${patientInfo.breadths.humeral} cm` : '—'}</strong>
                          </div>
                          <div className="bg-white/80 rounded p-1 border border-sky-100">
                            <span className="text-slate-500 block truncate">Femoral</span>
                            <strong className="text-sky-950 font-bold">{patientInfo.breadths?.femoral ? `${patientInfo.breadths.femoral} cm` : '—'}</strong>
                          </div>
                        </div>
                      </div>

                      <div
                        id="formula-card-rocha"
                        onClick={
                          rochaBoneMass.isComplete
                            ? () => {
                                onPatientInfoChange({
                                  ...patientInfo,
                                  boneKg: rochaBoneMass.boneKg || patientInfo.boneKg,
                                  bonePercent: rochaBoneMass.bonePercent || patientInfo.bonePercent,
                                });
                              }
                            : undefined
                        }
                        className={`hidden p-2 rounded-lg border text-left transition-all ${
                          rochaBoneMass.isComplete
                            ? isRochaActive
                              ? 'bg-sky-100/90 border-sky-400 ring-1 ring-sky-400 cursor-pointer shadow-xs'
                              : 'bg-sky-50/90 hover:bg-sky-100 border-sky-300/80 cursor-pointer shadow-2xs hover:border-sky-400 group'
                            : 'bg-slate-50/80 border-slate-200/70 opacity-80 cursor-default'
                        }`}
                        title={
                          rochaBoneMass.isComplete
                            ? `Fórmula por defecto activa: ${rochaBoneMass.boneKg} kg (${rochaBoneMass.bonePercent || ''}%)`
                            : rochaBoneMass.missingText || ''
                        }
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className={`text-[10px] font-bold truncate ${rochaBoneMass.isComplete ? 'text-sky-950' : 'text-slate-700'}`}>
                              Fórmula Rocha (1975)
                            </span>
                            <span className="text-[8px] font-semibold px-1 py-0.2 rounded bg-sky-100 text-sky-800 border border-sky-200 shrink-0">
                              Masa Ósea
                            </span>
                            {isRochaActive && (
                              <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-sky-600 text-white shrink-0">
                                Activo por defecto
                              </span>
                            )}
                          </div>
                          {rochaBoneMass.isComplete ? (
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-xs font-black text-sky-900 bg-sky-200/70 px-1.5 py-0.5 rounded border border-sky-300 group-hover:scale-105 transition-transform">
                                {rochaBoneMass.boneKg} kg
                              </span>
                              {rochaBoneMass.bonePercent && (
                                <span className="text-3xs font-bold text-sky-900/90 bg-sky-100 px-1 py-0.5 rounded border border-sky-200">
                                  {rochaBoneMass.bonePercent}%
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-3xs font-medium text-slate-400 shrink-0">
                              — kg
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] mt-0.5 flex items-center justify-between gap-1">
                          <span className={`truncate ${rochaBoneMass.isComplete ? 'text-sky-800 font-medium' : 'text-slate-400 italic'}`}>
                            {rochaBoneMass.isComplete ? rochaBoneMass.detailText : rochaBoneMass.missingText}
                          </span>
                          {rochaBoneMass.isComplete && !isRochaActive && (
                            <span className="text-[9px] text-sky-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              Usar ↵
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Masa Residual */}
                <div className="flex flex-col h-full bg-white border border-purple-200/90 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between gap-1.5 pb-2 mb-2 border-b border-purple-100 min-h-[34px]">
                    <span className="text-2xs font-extrabold text-purple-950 flex items-center gap-1.5 tracking-tight">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0"></span>
                      Masa Residual
                    </span>
                    <span
                      style={{ textAlign: 'right' }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100/80 text-purple-900 border border-purple-200/80 shrink-0"
                    >
                      {patientInfo.gender
                        ? (patientInfo.gender.toLowerCase().startsWith('h') || (patientInfo.gender.toLowerCase().startsWith('m') && !patientInfo.gender.toLowerCase().startsWith('mu'))
                            ? 'Hombre: 24% (Por defecto)'
                            : 'Mujer: 21% (Por defecto)')
                        : 'Hombre: 24% | Mujer: 21% (Por defecto)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2.5">
                    <div>
                      <label
                        htmlFor="input-residual-percent"
                        style={{ fontSize: '13px' }}
                        className="block text-3xs font-bold text-slate-600 uppercase mb-1 truncate"
                        title="Porcentaje Residual"
                      >
                        Porcentaje Residual
                      </label>
                      <div className="relative">
                        <input
                          id="input-residual-percent"
                          type="text"
                          inputMode="decimal"
                          placeholder="Ej. 24.0"
                          value={patientInfo.residualPercent || ''}
                          onChange={(e) => {
                            const newPct = e.target.value;
                            let newKg = patientInfo.residualKg;
                            const w = parseFloat(String(patientInfo.weight ?? '').replace(',', '.') || '');
                            const p = parseFloat(newPct.replace(',', '.'));
                            if (!isNaN(w) && w > 0 && !isNaN(p)) {
                              newKg = ((w * p) / 100).toFixed(2);
                            }
                            onPatientInfoChange({ ...patientInfo, residualPercent: newPct, residualKg: newKg });
                          }}
                          className="w-full px-2 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-purple-500 focus:bg-white pr-6 font-semibold"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-3xs font-bold text-slate-400 pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="input-residual-kg"
                        style={{ fontSize: '13px' }}
                        className="block text-3xs font-bold text-slate-600 uppercase mb-1 truncate"
                        title="Kilogramos de Masa Residual"
                      >
                        Kilogramos Residual
                      </label>
                      <div className="relative">
                        <input
                          id="input-residual-kg"
                          type="text"
                          inputMode="decimal"
                          placeholder="Ej. 16.8"
                          value={patientInfo.residualKg || ''}
                          onChange={(e) => {
                            const newKg = e.target.value;
                            let newPct = patientInfo.residualPercent;
                            const w = parseFloat(String(patientInfo.weight ?? '').replace(',', '.') || '');
                            const k = parseFloat(newKg.replace(',', '.'));
                            if (!isNaN(w) && w > 0 && !isNaN(k)) {
                              newPct = ((k / w) * 100).toFixed(1);
                            }
                            onPatientInfoChange({ ...patientInfo, residualKg: newKg, residualPercent: newPct });
                          }}
                          className="w-full px-2 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-purple-500 focus:bg-white pr-7 font-semibold"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-3xs font-bold text-slate-400 pointer-events-none">
                          kg
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Estimación Antropométrica de la Masa Residual Card */}
                  <div className="hidden pt-2 border-t border-purple-200/70 flex-1 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5 min-h-[22px]">
                      <span className="text-[10px] font-bold text-purple-950 uppercase tracking-wider">
                        Fórmula Antropométrica
                      </span>
                      <span className="text-[9px] text-purple-800 font-medium">
                        Ecuación según sexo
                      </span>
                    </div>

                    <div className="h-[210px] flex flex-col justify-between gap-2">
                      <div className="hidden p-2.5 rounded-lg bg-purple-50/70 border border-purple-200/70 space-y-1.5 text-xs">
                        <div className="text-[11px] font-bold text-purple-950 flex items-center justify-between">
                          <span>Parámetros Fisiológicos:</span>
                        </div>
                        <div className="text-[10px] font-semibold text-purple-900 bg-white/80 p-1.5 rounded border border-purple-200/60 leading-relaxed">
                          Hombre: 24% del peso corporal | Mujer: 21%
                        </div>
                        <div className="grid grid-cols-2 gap-1 pt-1 text-center text-3xs">
                          <div className="bg-white/80 rounded p-1 border border-purple-100">
                            <span className="text-slate-500 block truncate">Sexo Paciente</span>
                            <strong className="text-purple-950 font-bold capitalize">{patientInfo.gender || 'No definido'}</strong>
                          </div>
                          <div className="bg-white/80 rounded p-1 border border-purple-100">
                            <span className="text-slate-500 block truncate">Peso Corporal</span>
                            <strong className="text-purple-950 font-bold">{patientInfo.weight ? `${patientInfo.weight} kg` : '—'}</strong>
                          </div>
                        </div>
                      </div>

                      <div
                        id="formula-card-residual"
                        onClick={
                          residualMassEst.isComplete
                            ? () => {
                                onPatientInfoChange({
                                  ...patientInfo,
                                  residualKg: residualMassEst.residualKg || patientInfo.residualKg,
                                  residualPercent: residualMassEst.residualPercent || patientInfo.residualPercent,
                                });
                              }
                            : undefined
                        }
                        className={`hidden p-2 rounded-lg border text-left transition-all ${
                          residualMassEst.isComplete
                            ? isResidualActive
                              ? 'bg-purple-100/90 border-purple-400 ring-1 ring-purple-400 cursor-pointer shadow-xs'
                              : 'bg-purple-50/90 hover:bg-purple-100 border-purple-300/80 cursor-pointer shadow-2xs hover:border-purple-400 group'
                            : 'bg-slate-50/80 border-slate-200/70 opacity-80 cursor-default'
                        }`}
                        title={
                          residualMassEst.isComplete
                            ? `Fórmula por defecto activa: ${residualMassEst.residualKg} kg (${residualMassEst.residualPercent}%)`
                            : residualMassEst.missingText || ''
                        }
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className={`text-[10px] font-bold truncate ${residualMassEst.isComplete ? 'text-purple-950' : 'text-slate-700'}`}>
                              Estimación Masa Residual
                            </span>
                            <span className="text-[8px] font-semibold px-1 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-200 shrink-0">
                              Masa Residual
                            </span>
                            {isResidualActive && (
                              <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-purple-600 text-white shrink-0">
                                Activo por defecto
                              </span>
                            )}
                          </div>
                          {residualMassEst.isComplete ? (
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-xs font-black text-purple-900 bg-purple-200/70 px-1.5 py-0.5 rounded border border-purple-300 group-hover:scale-105 transition-transform">
                                {residualMassEst.residualKg} kg
                              </span>
                              {residualMassEst.residualPercent && (
                                <span className="text-3xs font-bold text-purple-900/90 bg-purple-100 px-1 py-0.5 rounded border border-purple-200">
                                  {residualMassEst.residualPercent}%
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-3xs font-medium text-slate-400 shrink-0">
                              — kg
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] mt-0.5 flex items-center justify-between gap-1">
                          <span className={`truncate ${residualMassEst.isComplete ? 'text-purple-800 font-medium' : 'text-slate-400 italic'}`}>
                            {residualMassEst.isComplete ? residualMassEst.detailText : residualMassEst.missingText}
                          </span>
                          {residualMassEst.isComplete && !isResidualActive && (
                            <span className="text-[9px] text-purple-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              Usar ↵
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fila: Sumatoria de Pliegues Cutáneos (Colocada después de la composición corporal / porcentajes) */}
            <div className="border-t border-slate-200/80 pt-2.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-3xs font-bold uppercase tracking-wider text-slate-700">
                    Sumatoria de Pliegues Cutáneos
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Σ3 Pliegues */}
                <div id="card-sum-skinfolds-3" className="bg-emerald-50/60 border border-emerald-200/80 rounded-lg p-2.5 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide block">
                        SUMATORIA DE Σ3 PLIEGUES (mm)
                      </span>
                      <span className="text-2xs text-emerald-800/90 font-medium">
                        Subescapular + Supraespinal + Abdominal
                      </span>
                    </div>
                    <span className="text-3xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                      {skinfoldSums.isComplete3
                        ? '3/3 completados'
                        : skinfoldSums.count3 > 0
                        ? `${skinfoldSums.count3}/3 capturados`
                        : 'Sub + Se + Abd'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1.5 pt-1.5 border-t border-emerald-200/60">
                    <span className="text-base font-extrabold text-emerald-900 tracking-tight">
                      {skinfoldSums.sum3 || '— mm'}
                    </span>
                    <span className="text-2xs text-emerald-700 font-medium">
                      {skinfoldSums.sum3 ? 'Suma calculada' : '(Ingrese los 3 pliegues correspondientes)'}
                    </span>
                  </div>
                </div>

                {/* Σ6 Pliegues */}
                <div id="card-sum-skinfolds-6" className="bg-teal-50/60 border border-teal-200/80 rounded-lg p-2.5 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-teal-950 uppercase tracking-wide block">
                        SUMATORIA DE Σ6 PLIEGUES (mm)
                      </span>
                      <span className="text-2xs text-teal-800/90 font-medium">
                        Tríceps + Subescapular + Supraespinal + Abdominal + Muslo Frontal + Pantorrilla Medial
                      </span>
                    </div>
                    <span className="text-3xs font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-300 whitespace-nowrap">
                      {skinfoldSums.isComplete6
                        ? '6/6 completados'
                        : skinfoldSums.count6 > 0
                        ? `${skinfoldSums.count6}/6 capturados`
                        : '6 Pliegues'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1.5 pt-1.5 border-t border-teal-200/60">
                    <span className="text-base font-extrabold text-teal-900 tracking-tight">
                      {skinfoldSums.sum6 || '— mm'}
                    </span>
                    <span className="text-2xs text-teal-700 font-medium">
                      {skinfoldSums.sum6 ? 'Suma calculada' : '(Ingrese los 6 pliegues correspondientes)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fila: Somatotipo ISAK (Método Heath-Carter) */}
            <SomatotypeCard
              patientInfo={patientInfo}
              onPatientInfoChange={onPatientInfoChange}
              onNavigateToTab={(tab) => setAnthropoTab(tab)}
            />
          </div>

          {/* Distribución de Macronutrientes y Aporte Calórico (Ubicado arriba de notas generales) */}
          <div className="pt-3 border-t border-slate-200/90 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-emerald-600" />
                Aporte Calórico Teórico y Distribución de Macronutrientes
              </span>
            </div>

            {/* SECCIÓN: FÓRMULA DE CONTEO CALÓRICO (HARRIS-BENEDICT & MIFFLIN-ST JEOR) */}
            <div id="section-harris-benedict">
              {!showHarrisBenedict ? (
                /* Vista plegada / escondida cuidando el diseño */
                <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-amber-50/40 via-white to-orange-50/30 border border-amber-200/80 shadow-2xs transition-all">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0">
                      <Calculator className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          Fórmula: {caloricCalculation.formulaName}
                        </span>
                        <span className="text-[10px] font-extrabold px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          {caloricCalculation.formulaSubtitle}
                        </span>
                      </div>
                      <p className="text-2xs text-slate-500 mt-0.5">
                        MB/TMB con selección de peso ({selectedWeightStrategy === 'real' ? 'Peso Real' : selectedWeightStrategy === 'ideal' ? 'Peso Ideal' : selectedWeightStrategy === 'adjusted' ? 'Peso Ajustado' : 'Recomendación IMC'}) y factor de actividad ({selectedActivityFactor}).
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {caloricCalculation.isComplete && caloricCalculation.get ? (
                      <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-amber-300/80 shadow-2xs">
                        <span className="text-3xs font-bold text-slate-500 uppercase">GET Base:</span>
                        <span className="text-xs font-black text-amber-950">
                          {caloricCalculation.get.toLocaleString('es-MX')} kcal/d
                        </span>
                      </div>
                    ) : null}

                    {/* Campo de Calorías Totales Ajustadas */}
                    {renderAdjustedCaloriesControl('folded')}

                    <button
                      id="btn-expand-harris-benedict"
                      type="button"
                      onClick={() => setShowHarrisBenedict(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg shadow-2xs transition-all cursor-pointer"
                    >
                      <Calculator className="w-3.5 h-3.5 text-amber-700" />
                      <span>Ver cálculo</span>
                      <ChevronDown className="w-3.5 h-3.5 text-amber-700" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Vista expandida completa */
                <div className="bg-gradient-to-br from-white via-amber-50/20 to-orange-50/30 border border-amber-200/90 rounded-xl p-3.5 sm:p-4 shadow-2xs space-y-3.5 animate-in fade-in duration-200">
                  {/* Encabezado Principal */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-amber-200/70 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0">
                        <Calculator className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                            Fórmula de Conteo Calórico: {caloricCalculation.formulaName}
                          </h4>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-600" />
                            {caloricCalculation.formulaSubtitle}
                          </span>
                        </div>
                        <p className="text-2xs text-slate-600 mt-0.5">
                          Estimación del Metabolismo Basal (MB / TMB) y Gasto Energético Total (GET) con selección de fórmula, peso y multiplicador de actividad.
                        </p>
                      </div>
                    </div>

                    {/* Resumen numérico rápido y botón Ocultar */}
                    <div className="flex flex-wrap items-center gap-2">
                      {caloricCalculation.isComplete && caloricCalculation.get ? (
                        <div className="flex items-center gap-2 bg-white/90 border border-amber-300/80 px-3 py-1.5 rounded-xl shadow-2xs">
                          <div className="text-right">
                            <div className="text-3xs font-bold text-slate-500 uppercase">TMB / MB</div>
                            <div className="text-xs font-black text-slate-800">
                              {caloricCalculation.geb?.toLocaleString('es-MX')} <span className="text-3xs font-medium">kcal</span>
                            </div>
                          </div>
                          <div className="h-6 w-px bg-amber-200" />
                          <div className="text-right">
                            <div className="text-3xs font-bold text-amber-800 uppercase flex items-center gap-0.5 justify-end">
                              <Flame className="w-2.5 h-2.5 text-amber-600 fill-amber-500" />
                              GET Base
                            </div>
                            <div className="text-sm font-black text-amber-950">
                              {caloricCalculation.get.toLocaleString('es-MX')} <span className="text-3xs font-medium text-amber-800">kcal/día</span>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {/* Campo de Calorías Totales Ajustadas */}
                      {renderAdjustedCaloriesControl('expanded')}

                      <button
                        id="btn-hide-harris-benedict"
                        type="button"
                        onClick={() => setShowHarrisBenedict(false)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-all cursor-pointer shrink-0"
                        title="Esconder de la pantalla cuidando el diseño"
                      >
                        <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                        <span>Ocultar</span>
                        <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                    </div>
                  </div>

                  {/* ESPACIO: SELECCIÓN DE FÓRMULA DE GASTO CALÓRICO */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <label className="text-2xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <Calculator className="w-3.5 h-3.5 text-amber-600" />
                        Selección de Fórmula para Gasto Calórico:
                      </label>
                      <span className="text-2xs text-slate-500">
                        Selecciona la fórmula adecuada según las características del paciente
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {/* Opción 1: Harris-Benedict */}
                      <div
                        id="card-formula-harris-benedict"
                        role="button"
                        tabIndex={0}
                        onClick={() => onPatientInfoChange({ ...patientInfo, caloricFormula: 'harris-benedict' })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onPatientInfoChange({ ...patientInfo, caloricFormula: 'harris-benedict' });
                          }
                        }}
                        className={`text-left p-3 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                          selectedCaloricFormula === 'harris-benedict'
                            ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/25 shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900">
                                Harris-Benedict
                              </span>
                              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                Deportistas
                              </span>
                            </div>
                            {selectedCaloricFormula === 'harris-benedict' ? (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300 flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" />
                                Fórmula Activa
                              </span>
                            ) : (
                              <span className="text-[9px] font-medium text-slate-400">
                                Clic para seleccionar
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-600 mb-2 leading-relaxed">
                            Recomendada en atletas, deportistas o para verificación cruzada de requerimientos.
                          </p>
                        </div>

                        {hbCalculation.geb !== null && (
                          <div className="mt-2.5 pt-2 border-t border-amber-200/70 flex items-center justify-between text-2xs">
                            <span className="text-slate-500">TMB: <strong className="text-slate-900 font-bold">{hbCalculation.geb.toLocaleString('es-MX')} kcal</strong></span>
                            <span className="text-amber-900 font-bold">GET ({selectedActivityFactor}): <strong className="text-amber-950 font-black">{hbCalculation.get?.toLocaleString('es-MX')} kcal/d</strong></span>
                          </div>
                        )}
                      </div>

                      {/* Opción 2: Mifflin-St Jeor (1990) */}
                      <div
                        id="card-formula-mifflin-st-jeor"
                        role="button"
                        tabIndex={0}
                        onClick={() => onPatientInfoChange({ ...patientInfo, caloricFormula: 'mifflin-st-jeor', weightStrategy: 'real' })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onPatientInfoChange({ ...patientInfo, caloricFormula: 'mifflin-st-jeor', weightStrategy: 'real' });
                          }
                        }}
                        className={`text-left p-3 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                          selectedCaloricFormula === 'mifflin-st-jeor'
                            ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/25 shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900">
                                Mifflin-St Jeor (1990)
                              </span>
                              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                                Adultos sedentarios o con sobrepeso
                              </span>
                            </div>
                            {selectedCaloricFormula === 'mifflin-st-jeor' ? (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300 flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" />
                                Fórmula Activa
                              </span>
                            ) : (
                              <span className="text-[9px] font-medium text-slate-400">
                                Clic para seleccionar
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-600 mb-2 leading-relaxed">
                            Adultos sedentarios o con sobrepeso (calculado directamente con el peso real agregado).
                          </p>
                        </div>

                        {mifflinCalculation.geb !== null && (
                          <div className="mt-2.5 pt-2 border-t border-amber-200/70 flex items-center justify-between text-2xs">
                            <span className="text-slate-500">MB: <strong className="text-slate-900 font-bold">{mifflinCalculation.geb.toLocaleString('es-MX')} kcal</strong></span>
                            <span className="text-amber-900 font-bold">GET ({selectedActivityFactor}): <strong className="text-amber-950 font-black">{mifflinCalculation.get?.toLocaleString('es-MX')} kcal/d</strong></span>
                          </div>
                        )}
                      </div>

                      {/* Opción 3: Katch-McArdle (1996) */}
                      <div
                        id="card-formula-katch-mcardle"
                        role="button"
                        tabIndex={0}
                        onClick={() => onPatientInfoChange({ ...patientInfo, caloricFormula: 'katch-mcardle' })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onPatientInfoChange({ ...patientInfo, caloricFormula: 'katch-mcardle' });
                          }
                        }}
                        className={`text-left p-3 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                          selectedCaloricFormula === 'katch-mcardle'
                            ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/25 shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900">
                                Katch-McArdle (1996)
                              </span>
                              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-900 border border-blue-300">
                                Composición corporal
                              </span>
                            </div>
                            {selectedCaloricFormula === 'katch-mcardle' ? (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300 flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" />
                                Fórmula Activa
                              </span>
                            ) : (
                              <span className="text-[9px] font-medium text-slate-400">
                                Clic para seleccionar
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-600 mb-2 leading-relaxed">
                            Clientes con composición corporal medida (calculado con masa corporal magra y % de grasa).
                          </p>
                        </div>

                        {katchCalculation.geb !== null && (
                          <div className="mt-2.5 pt-2 border-t border-amber-200/70 flex items-center justify-between text-2xs">
                            <span className="text-slate-500">
                              TMB: <strong className="text-slate-900 font-bold">{katchCalculation.geb.toLocaleString('es-MX')} kcal</strong>
                              {katchCalculation.leanBodyMassKg && (
                                <span className="block text-[10px] text-slate-500 font-normal">
                                  Masa magra: <strong className="text-slate-700 font-bold">{katchCalculation.leanBodyMassKg} kg</strong> ({katchCalculation.fatPercentUsed}% grasa)
                                </span>
                              )}
                            </span>
                            <span className="text-amber-900 font-bold text-right">
                              GET ({selectedActivityFactor}):{' '}
                              <strong className="text-amber-950 font-black block sm:inline">
                                {katchCalculation.get?.toLocaleString('es-MX')} kcal/d
                              </strong>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Opción 4: Cunningham (1980 / 1991) */}
                      <div
                        id="card-formula-cunningham"
                        role="button"
                        tabIndex={0}
                        onClick={() => onPatientInfoChange({ ...patientInfo, caloricFormula: 'cunningham' })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onPatientInfoChange({ ...patientInfo, caloricFormula: 'cunningham' });
                          }
                        }}
                        className={`text-left p-3 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                          selectedCaloricFormula === 'cunningham'
                            ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/25 shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900">
                                Cunningham (1980 / 1991)
                              </span>
                              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-violet-100 text-violet-900 border border-violet-300">
                                Atletas de élite
                              </span>
                            </div>
                            {selectedCaloricFormula === 'cunningham' ? (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300 flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" />
                                Fórmula Activa
                              </span>
                            ) : (
                              <span className="text-[9px] font-medium text-slate-400">
                                Clic para seleccionar
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-600 mb-2 leading-relaxed">
                            Atletas de élite con baja grasa corporal (500 + 22 × masa corporal magra calculada con el % de grasa seleccionado).
                          </p>
                        </div>

                        {cunninghamCalculation.geb !== null && (
                          <div className="mt-2.5 pt-2 border-t border-amber-200/70 flex items-center justify-between text-2xs">
                            <span className="text-slate-500">
                              TMB: <strong className="text-slate-900 font-bold">{cunninghamCalculation.geb.toLocaleString('es-MX')} kcal</strong>
                              {cunninghamCalculation.leanBodyMassKg && (
                                <span className="block text-[10px] text-slate-500 font-normal">
                                  Masa magra: <strong className="text-slate-700 font-bold">{cunninghamCalculation.leanBodyMassKg} kg</strong> ({cunninghamCalculation.fatPercentUsed}% grasa)
                                </span>
                              )}
                            </span>
                            <span className="text-amber-900 font-bold text-right">
                              GET ({selectedActivityFactor}):{' '}
                              <strong className="text-amber-950 font-black block sm:inline">
                                {cunninghamCalculation.get?.toLocaleString('es-MX')} kcal/d
                              </strong>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                {/* 1. Criterio de Selección de Peso */}
                <div className="space-y-2">
                  <div className="bg-amber-100/60 border border-amber-200/90 rounded-lg p-2.5 text-slate-800">
                    <div className="flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 text-amber-700 mt-0.5 shrink-0" />
                      <div className="text-2xs leading-relaxed">
                        <span className="font-extrabold text-amber-950">Criterio Clínico de Selección de Peso: </span>
                        Usaremos el peso actual sólo en personas con un IMC normal. Si el IMC es bajo (en casos de desnutrición) emplearemos el peso ideal. Si el IMC es alto (en casos de sobrepeso u obesidad) emplearemos el peso ajustado.
                      </div>
                    </div>
                  </div>

                  {/* Botones de Selección de Peso */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Opción 1: Peso Real (Inicio / Predeterminado) */}
                    <button
                      id="btn-weight-strategy-real"
                      type="button"
                      onClick={() => onPatientInfoChange({ ...patientInfo, weightStrategy: 'real' })}
                      className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                        selectedWeightStrategy === 'real'
                          ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-3xs font-black uppercase tracking-wider text-slate-600">
                          • Peso Real
                        </span>
                        {selectedWeightStrategy === 'real' ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                            Activo (Inicio)
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium text-slate-400">
                            Inicio
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-black text-slate-900">
                        {harrisBenedict.weightDetails.realWeight !== null
                          ? `${harrisBenedict.weightDetails.realWeight} kg`
                          : '— kg'}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        Kg real medido del paciente
                      </div>
                    </button>

                    {/* Opción 2: El Peso Ideal */}
                    <button
                      id="btn-weight-strategy-ideal"
                      type="button"
                      onClick={() => onPatientInfoChange({ ...patientInfo, weightStrategy: 'ideal' })}
                      className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                        selectedWeightStrategy === 'ideal'
                          ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-3xs font-black uppercase tracking-wider text-slate-600">
                          • El Peso Ideal
                        </span>
                        {selectedWeightStrategy === 'ideal' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-200 text-blue-900 border border-blue-300">
                            Activo
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-black text-slate-900">
                        {harrisBenedict.weightDetails.idealWeight !== null
                          ? `${harrisBenedict.weightDetails.idealWeight} kg`
                          : '— kg'}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1" title={harrisBenedict.weightDetails.idealFormulaText}>
                        {patientInfo.gender === 'Hombre'
                          ? 'Hombres → Talla² × 23'
                          : patientInfo.gender === 'Mujer'
                          ? 'Mujeres → Talla² × 21'
                          : 'Talla² × (23 ♂ / 21 ♀)'}
                      </div>
                    </button>

                    {/* Opción 3: El Peso Ajustado */}
                    <button
                      id="btn-weight-strategy-adjusted"
                      type="button"
                      onClick={() => onPatientInfoChange({ ...patientInfo, weightStrategy: 'adjusted' })}
                      className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                        selectedWeightStrategy === 'adjusted'
                          ? 'bg-purple-50/90 border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-3xs font-black uppercase tracking-wider text-slate-600">
                          • El Peso Ajustado
                        </span>
                        {selectedWeightStrategy === 'adjusted' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-200 text-purple-900 border border-purple-300">
                            Activo
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-black text-slate-900">
                        {harrisBenedict.weightDetails.adjustedWeight !== null
                          ? `${harrisBenedict.weightDetails.adjustedWeight} kg`
                          : '— kg'}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1" title={harrisBenedict.weightDetails.adjustedFormulaText}>
                        (Peso actual – Peso ideal) / 3 + Peso ideal
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Ecuación Harris-Benedict (GEB / TMB) */}
                <div className="hidden bg-white border border-amber-200/80 rounded-xl p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                      Ecuación Harris-Benedict (Gasto Energético Basal - GEB):
                    </span>
                    <span className="hidden text-[11px] font-mono font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      {patientInfo.gender === 'Hombre'
                        ? 'Hombres GEB: 66.47 + (13.75*Peso) + (5.0*Talla) - (6.74*Edad)'
                        : patientInfo.gender === 'Mujer'
                        ? 'Mujeres GEB: 665.1 + (9.56*Peso) + (1.85*Talla) - (4.68*Edad)'
                        : 'Hombres: 66.47... | Mujeres: 665.1...'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                    <div className="sm:col-span-8 bg-slate-50/90 p-2.5 rounded-lg border border-slate-200 text-2xs font-mono text-slate-800">
                      {harrisBenedict.isComplete ? (
                        <div>
                          <div className="text-slate-500 text-3xs font-sans mb-0.5">
                            Sustitución con peso empleado (
                            <span className="font-bold text-slate-700">{harrisBenedict.weightDetails.weightUsed} kg</span>
                            {' '}— {harrisBenedict.weightDetails.strategyUsed === 'ideal' ? 'Ideal' : harrisBenedict.weightDetails.strategyUsed === 'adjusted' ? 'Ajustado' : 'Real'}):
                          </div>
                          <div className="font-bold text-slate-900 break-all">{harrisBenedict.formulaDetails}</div>
                        </div>
                      ) : (
                        <div className="text-amber-800 italic font-sans">
                          Falta completar: {harrisBenedict.missingFields.join(', ')}
                        </div>
                      )}
                    </div>

                    <div className="sm:col-span-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 rounded-lg p-2.5 text-center">
                      <div className="text-3xs font-extrabold uppercase tracking-wider text-amber-900">
                        Tasa Metabólica Basal (TMB / GEB)
                      </div>
                      <div className="text-xl font-black text-amber-950 font-heading">
                        {harrisBenedict.geb !== null ? `${harrisBenedict.geb.toLocaleString('es-MX')} kcal` : '— kcal'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Cuadro para Multiplicar TMB (Factor de Actividad Física) */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <label className="text-2xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Dumbbell className="w-3.5 h-3.5 text-amber-600" />
                      Cuadro para multiplicar TMB (Nivel de Actividad Física):
                    </label>
                    <span className="hidden text-2xs font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200">
                      Factor activo: *{selectedActivityFactor}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                    {ACTIVITY_LEVEL_OPTIONS.map((opt) => {
                      const isSelected = selectedActivityFactor === opt.factor;
                      const calculatedGet = harrisBenedict.geb ? Math.round(harrisBenedict.geb * opt.factor) : null;
                      return (
                        <button
                          key={opt.factor}
                          id={`btn-act-factor-${String(opt.factor).replace('.', '_')}`}
                          type="button"
                          onClick={() => onPatientInfoChange({ ...patientInfo, activityFactor: opt.factor })}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-500/30'
                              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-black ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                              {opt.factor}
                            </span>
                            {isSelected && (
                              <span className="text-[9px] font-bold bg-amber-800/80 text-amber-100 px-1.5 py-0.2 rounded-full">
                                Seleccionado
                              </span>
                            )}
                          </div>
                          <div className={`text-xs font-extrabold leading-tight ${isSelected ? 'text-amber-100' : 'text-slate-800'}`}>
                            {opt.label}
                          </div>
                          <div className={`text-[10px] mt-1 leading-snug ${isSelected ? 'text-amber-200' : 'text-slate-500'}`}>
                            {opt.description}
                          </div>
                          {calculatedGet !== null && (
                            <div className={`text-xs font-black mt-2 pt-1.5 border-t ${
                              isSelected ? 'border-amber-500/70 text-white' : 'border-slate-100 text-amber-800'
                            }`}>
                              {calculatedGet.toLocaleString('es-MX')} kcal/día
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 items-stretch">
              {/* Calories Card - DOM div 1 */}
              <div className="col-span-2 sm:col-span-3 lg:col-span-2 bg-gradient-to-br from-emerald-800 to-teal-900 rounded-xl p-3.5 text-white shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-2xs font-bold uppercase tracking-wider text-emerald-200 flex items-center gap-1">
                      Aporte Calórico Teórico
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl sm:text-3xl font-extrabold font-heading tracking-tight">
                        {macros.totalKcal.toLocaleString('es-MX')}
                      </span>
                      <span className="text-xs font-semibold text-emerald-200">kcal / día</span>
                    </div>
                    {caloricCalculation.isComplete && caloricCalculation.get ? (
                      <button
                        id="btn-quick-hb-badge"
                        type="button"
                        onClick={() => {
                          setShowHarrisBenedict(true);
                          setTimeout(() => {
                            const el = document.getElementById('section-harris-benedict');
                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }, 50);
                        }}
                        className="text-right bg-emerald-950/50 hover:bg-emerald-950/70 border border-emerald-500/40 rounded-lg px-2 py-1 transition-all cursor-pointer"
                        title={`Ver desglose de la fórmula ${caloricCalculation.formulaName}`}
                      >
                        <div className="text-[10px] text-emerald-200 flex items-center justify-end gap-1">
                          <span>
                            GET{' '}
                            {selectedCaloricFormula === 'mifflin-st-jeor'
                              ? 'Mifflin'
                              : selectedCaloricFormula === 'katch-mcardle'
                              ? 'Katch'
                              : selectedCaloricFormula === 'cunningham'
                              ? 'Cunningham'
                              : 'Harris-B'}
                            :
                          </span>
                        </div>
                        <div className="text-xs font-black text-amber-300">
                          {caloricCalculation.get.toLocaleString('es-MX')} kcal
                        </div>
                      </button>
                    ) : null}
                  </div>

                  {/* Fila: Calorías Totales Ajustadas */}
                  <div className="mt-2 pt-1.5 border-t border-emerald-700/60 flex flex-wrap items-center justify-between gap-1.5 text-2xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-200 font-bold">Calorías totales ajustadas:</span>
                      <input
                        id="input-target-kcal"
                        type="number"
                        min="500"
                        max="8000"
                        step="10"
                        value={activeTargetKcal}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          handleTargetKcalChange(isNaN(val) ? 0 : val);
                        }}
                        className="w-20 bg-emerald-950/80 border border-emerald-500/50 rounded px-1.5 py-0.5 text-xs font-black text-amber-300 focus:outline-hidden focus:ring-1 focus:ring-amber-400"
                      />
                      <span className="text-3xs text-emerald-300">kcal</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {currentAdjustment !== 0 && (
                        <span className={`text-3xs font-extrabold px-1.5 py-0.5 rounded border ${
                          currentAdjustment < 0
                            ? 'bg-rose-500/30 text-rose-200 border-rose-400/40'
                            : 'bg-emerald-500/30 text-emerald-200 border-emerald-400/40'
                        }`}>
                          {currentAdjustment > 0 ? `+${currentAdjustment}` : currentAdjustment} kcal
                        </span>
                      )}
                      {kcalAdequacy !== null && (
                        <span
                          className={`text-3xs font-extrabold px-1.5 py-0.5 rounded border ${
                            kcalAdequacy >= 95 && kcalAdequacy <= 105
                              ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/40'
                              : 'bg-amber-500/30 text-amber-200 border-amber-400/40'
                          }`}
                          title="Adecuación calórica entre tabla SMAE y meta prescrita"
                        >
                          {kcalAdequacy}% adec.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Visual Macro Bar */}
                <div className="mt-2.5">
                  <div className="h-2 w-full bg-emerald-950/50 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${activeProteinPercent}%` }}
                      className="bg-rose-400 h-full transition-all duration-300"
                      title={`Proteína: ${activeProteinPercent}%`}
                    />
                    <div
                      style={{ width: `${activeLipidsPercent}%` }}
                      className="bg-amber-400 h-full transition-all duration-300"
                      title={`Lípidos: ${activeLipidsPercent}%`}
                    />
                    <div
                      style={{ width: `${activeCarbsPercent}%` }}
                      className="bg-emerald-400 h-full transition-all duration-300"
                      title={`Carbohidratos: ${activeCarbsPercent}%`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-3xs text-emerald-200/90 mt-1 font-medium">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />
                      Prot {formatNumClean(activeProteinPercent)}%
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                      Líp {formatNumClean(activeLipidsPercent)}%
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                      HC {formatNumClean(activeCarbsPercent)}%
                    </span>
                    <span
                      onClick={() => !is100PercentBalanced && handleAdjustTo100Percent('carbs')}
                      className={`font-black px-1 rounded transition-colors ${
                        is100PercentBalanced
                          ? 'text-emerald-300'
                          : 'bg-amber-400 text-amber-950 hover:bg-amber-300 cursor-pointer shadow-2xs'
                      }`}
                      title={is100PercentBalanced ? '100% Equilibrado' : `Total actual: ${formatNumClean(currentMacroSum)}%. Clic para ajustar HC al 100%`}
                    >
                      {formatNumClean(currentMacroSum)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Protein Card - DOM div 2 */}
              <div className="col-span-1 bg-white border border-slate-200/90 rounded-xl p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between h-fit">
                <div>
                  <div className="flex items-center justify-between text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1 gap-1">
                    <span className="flex items-center gap-1 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block shrink-0" />
                      <span className="truncate">Proteínas</span>
                    </span>
                    {/* Manual % Input */}
                    <div className="relative flex items-center shrink-0">
                      <input
                        id="input-manual-protein-pct"
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={proteinInputStr}
                        onFocus={() => setFocusedField('protein')}
                        onBlur={() => {
                          setFocusedField(null);
                          setProteinInputStr(formatNumClean(activeProteinPercent));
                        }}
                        onChange={(e) => handleMacroPercentChange('protein', e.target.value)}
                        className="w-[48px] sm:w-[54px] h-[20px] text-center text-xs font-black text-rose-600 bg-rose-50/70 border border-rose-200 rounded px-1 py-0 leading-none focus:outline-hidden focus:ring-1 focus:ring-rose-500 shadow-2xs"
                        placeholder="20"
                      />
                      <span className="text-3xs font-bold text-rose-500 ml-0.5">%</span>
                    </div>
                  </div>

                  <div className="text-xl font-bold text-slate-900 font-heading">
                    {formatNumClean(macros.totalProteinGrams)} <span className="text-xs font-normal text-slate-500">g</span>
                  </div>
                  <div className="text-2xs text-slate-400 mt-0.5">
                    <span>{Math.round(macros.totalProteinGrams * 4)} kcal</span>
                  </div>
                  <div className="mt-1.5 pt-1 border-t border-slate-100 flex items-center justify-between text-3xs text-rose-700 font-medium gap-1">
                    <span className="text-slate-500 font-bold whitespace-nowrap">Meta g:</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        id="input-manual-protein-grams"
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={proteinGramsInputStr}
                        onFocus={() => setFocusedField('proteingrams')}
                        onBlur={() => {
                          setFocusedField(null);
                          setProteinGramsInputStr(formatNumClean(metaProteinGrams));
                        }}
                        onChange={(e) => handleProteinGramsInputChange(e.target.value)}
                        className="w-[48px] sm:w-[54px] h-[20px] text-center text-xs font-black text-rose-700 bg-rose-50/80 border border-rose-200 rounded px-1 py-0 leading-none focus:outline-hidden focus:ring-1 focus:ring-rose-500 shadow-2xs"
                        placeholder="g"
                        title="Gramos de proteína prescritos (se mantienen fijos independientemente de cambios en las calorías)"
                      />
                      <span className="text-3xs font-bold text-rose-600">g</span>
                    </div>
                  </div>
                </div>

                {/* Cuadro de gr para proteína (gr · kg/d) */}
                <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-3xs text-slate-500 gap-1">
                  <span className="text-slate-400 font-medium whitespace-nowrap">gr · kg/d:</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      id="input-protein-gperkg"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="1.5"
                      value={gPerKgInputStr}
                      onFocus={() => setFocusedField('gperkg')}
                      onBlur={() => {
                        setFocusedField(null);
                        setGPerKgInputStr(formatNumClean(metaProteinGPerKg ?? (currentWeightNum && currentWeightNum > 0 && macros.totalProteinGrams > 0 ? (macros.totalProteinGrams / currentWeightNum) : '')));
                      }}
                      onChange={(e) => handleGPerKgInputChange(e.target.value)}
                      className="w-[52px] sm:w-[58px] h-[20px] text-center text-xs font-bold text-rose-700 bg-rose-50/70 border border-rose-200 rounded px-1 py-0 leading-none focus:outline-hidden focus:ring-1 focus:ring-rose-500 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Lipids Card - DOM div 3 */}
              <div className="col-span-1 bg-white border border-slate-200/90 rounded-xl p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between h-fit">
                <div>
                  <div className="flex items-center justify-between text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1 gap-1">
                    <span className="flex items-center gap-1 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block shrink-0" />
                      <span className="truncate">Lípidos</span>
                    </span>
                    {/* Manual % Input */}
                    <div className="relative flex items-center shrink-0">
                      <input
                        id="input-manual-lipids-pct"
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={lipidsInputStr}
                        onFocus={() => setFocusedField('lipids')}
                        onBlur={() => {
                          setFocusedField(null);
                          setLipidsInputStr(formatNumClean(activeLipidsPercent));
                        }}
                        onChange={(e) => handleMacroPercentChange('lipids', e.target.value)}
                        className="w-[48px] sm:w-[54px] h-[20px] text-center text-xs font-black text-amber-600 bg-amber-50/70 border border-amber-200 rounded px-1 py-0 leading-none focus:outline-hidden focus:ring-1 focus:ring-amber-500 shadow-2xs"
                        placeholder="25"
                      />
                      <span className="text-3xs font-bold text-amber-500 ml-0.5">%</span>
                    </div>
                  </div>

                  <div className="text-xl font-bold text-slate-900 font-heading">
                    {formatNumClean(macros.totalLipidsGrams)} <span className="text-xs font-normal text-slate-500">g</span>
                  </div>
                  <div className="text-2xs text-slate-400 mt-0.5">
                    <span>{Math.round(macros.totalLipidsGrams * 9)} kcal</span>
                  </div>
                  {(patientInfo.macroPrescription?.enabled || isManualMacroMode) && (
                    <div className="text-3xs text-amber-700/90 font-medium mt-1">
                      Meta: <span className="font-bold">{formatNumClean(metaLipidsGrams)} g</span> ({Math.round(metaLipidsGrams * 9)} kcal)
                    </div>
                  )}
                </div>
              </div>

              {/* Carbs Card - DOM div 4 */}
              <div className="col-span-1 bg-white border border-slate-200/90 rounded-xl p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between h-fit">
                <div>
                  <div className="flex items-center justify-between text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1 gap-1">
                    <span className="flex items-center gap-1 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                      <span className="truncate">HC</span>
                    </span>
                    {/* Manual % Input */}
                    <div className="relative flex items-center shrink-0">
                      <input
                        id="input-manual-carbs-pct"
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={carbsInputStr}
                        onFocus={() => setFocusedField('carbs')}
                        onBlur={() => {
                          setFocusedField(null);
                          setCarbsInputStr(formatNumClean(activeCarbsPercent));
                        }}
                        onChange={(e) => handleMacroPercentChange('carbs', e.target.value)}
                        className="w-[48px] sm:w-[54px] h-[20px] text-center text-xs font-black text-emerald-600 bg-emerald-50/70 border border-emerald-200 rounded px-1 py-0 leading-none focus:outline-hidden focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                        placeholder="55"
                      />
                      <span className="text-3xs font-bold text-emerald-500 ml-0.5">%</span>
                    </div>
                  </div>

                  <div className="text-xl font-bold text-slate-900 font-heading">
                    {formatNumClean(macros.totalCarbsGrams)} <span className="text-xs font-normal text-slate-500">g</span>
                  </div>
                  <div className="text-2xs text-slate-400 mt-0.5">
                    <span>{Math.round(macros.totalCarbsGrams * 4)} kcal</span>
                  </div>
                  {(patientInfo.macroPrescription?.enabled || isManualMacroMode) && (
                    <div className="text-3xs text-emerald-700/90 font-medium mt-1">
                      Meta: <span className="font-bold">{formatNumClean(metaCarbsGrams)} g</span> ({Math.round(metaCarbsGrams * 4)} kcal)
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Fila 3: Notas Generales */}
          <div>
            <label
              htmlFor="input-patient-notes"
              className="block text-2xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between cursor-pointer"
            >
              <span style={{ fontSize: '13px' }}>Notas generales (Alergias, Presupuesto, Estilo, etc.)</span>
              <span className="text-3xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded normal-case tracking-normal">
                Solo se incluye en descargas (Word/PDF) si contiene texto
              </span>
            </label>
            <input
              id="input-patient-notes"
              type="text"
              placeholder="Ej. Alergia a nueces y mariscos, intolerancia a lactosa o indicaciones especiales"
              value={patientInfo.notes || ''}
              onChange={(e) => onPatientInfoChange({ ...patientInfo, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all cursor-text"
            />
          </div>
        </div>
      )}

      {/* Cuadro de Aporte Manual de Nutrientes y Preferencias por Comida */}
      {showPatientDetails && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
          {/* CUADRO: INGRESO MANUAL DE MACRONUTRIENTES Y KCAL */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                  <Calculator className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 font-heading">
                    Aporte Manual de Nutrientes (Proteína, Kcal, Lípidos, Carbohidratos)
                  </h4>
                  <p className="text-2xs text-slate-500">
                    Ingresa manualmente los gramos y calorías, y selecciona si deseas contabilizarlo e incorporarlo en el menú de la IA.
                  </p>
                </div>
              </div>
            </div>

            {/* Selector: ¿Agregar a la sumatoria final de equivalentes y menú? */}
            <div className={`flex flex-wrap items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-lg border transition-all ${
              patientInfo.manualNutrientEntry?.includeInMenu
                ? 'bg-emerald-50/70 border-emerald-300/80 shadow-2xs'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <label htmlFor="checkbox-include-manual-entry" className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-[240px]">
                <input
                  id="checkbox-include-manual-entry"
                  type="checkbox"
                  checked={Boolean(patientInfo.manualNutrientEntry?.includeInMenu)}
                  onChange={(e) => {
                    const current = patientInfo.manualNutrientEntry || {
                      enabled: true,
                      timing: 'colacion2',
                      includeInMenu: false,
                    };
                    onPatientInfoChange({
                      ...patientInfo,
                      manualNutrientEntry: {
                        ...current,
                        enabled: true,
                        includeInMenu: e.target.checked,
                      },
                    });
                  }}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer accent-emerald-600 mt-0.5 shrink-0"
                />
                <div>
                  <span className="text-[14px] font-bold text-slate-800" style={{ fontSize: '14px' }}>
                    Agregar a la sumatoria de equivalentes y al menú generado por IA
                  </span>
                  <p className="text-2xs text-slate-500">
                    {patientInfo.manualNutrientEntry?.includeInMenu
                      ? '✓ Activo: Se suma a los equivalentes y conteo calórico final, e integrará en el menú de la IA.'
                      : 'Inactivo: Solo registro informativo (no se suma a los equivalentes ni se añade al menú).'}
                  </p>
                </div>
              </label>

              <span
                style={{ fontSize: '14px' }}
                className={`text-[14px] font-extrabold px-2.5 py-1 rounded-md border shadow-2xs shrink-0 ${
                  patientInfo.manualNutrientEntry?.includeInMenu
                    ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {patientInfo.manualNutrientEntry?.includeInMenu ? '✓ Agregado a la sumatoria y menú' : 'No se agregará a la sumatoria'}
              </span>
            </div>

            {/* Inputs Manuales: Proteína, Calorías, Lípidos, Carbohidratos y Tiempo asignado */}
            {(() => {
              const pNum = Number(patientInfo.manualNutrientEntry?.proteinGrams) || 0;
              const lNum = Number(patientInfo.manualNutrientEntry?.lipidsGrams) || 0;
              const cNum = Number(patientInfo.manualNutrientEntry?.carbsGrams) || 0;
              const autoKcal = pNum > 0 || lNum > 0 || cNum > 0 ? Math.round(pNum * 4 + lNum * 9 + cNum * 4) : 0;

              return (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {/* Proteína */}
                  <div>
                    <label
                      htmlFor="input-manual-protein"
                      style={{ fontSize: '13px' }}
                      className="block text-[13px] font-bold uppercase tracking-wider text-slate-600 mb-1"
                    >
                      Proteína
                    </label>
                    <div className="relative">
                      <input
                        id="input-manual-protein"
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder=""
                        value={
                          patientInfo.manualNutrientEntry?.proteinGrams === 0 ||
                          patientInfo.manualNutrientEntry?.proteinGrams === '0' ||
                          patientInfo.manualNutrientEntry?.proteinGrams === undefined
                            ? ''
                            : patientInfo.manualNutrientEntry.proteinGrams
                        }
                        onChange={(e) => {
                          const raw = e.target.value;
                          const current = patientInfo.manualNutrientEntry || {
                            enabled: true,
                            timing: 'colacion2',
                            includeInMenu: false,
                          };
                          onPatientInfoChange({
                            ...patientInfo,
                            manualNutrientEntry: {
                              ...current,
                              enabled: true,
                              proteinGrams: raw === '' ? '' : (parseFloat(raw) || raw),
                            },
                          });
                        }}
                        className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 transition-all font-mono pr-6"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-2xs font-bold text-slate-400 pointer-events-none">
                        g
                      </span>
                    </div>
                  </div>

                  {/* Calorías */}
                  <div>
                    <label
                      htmlFor="input-manual-kcal"
                      style={{ fontSize: '13px' }}
                      className="block text-[13px] font-bold uppercase tracking-wider text-slate-600 mb-1"
                    >
                      Calorías
                    </label>
                    <div className="relative">
                      <input
                        id="input-manual-kcal"
                        type="number"
                        min="0"
                        step="1"
                        placeholder={autoKcal > 0 ? String(autoKcal) : ''}
                        title={autoKcal > 0 ? `Cálculo automático de calorías: ${autoKcal} kcal (P×4 + L×9 + HC×4). Puede sobreescribir este valor manualmente.` : undefined}
                        value={
                          patientInfo.manualNutrientEntry?.kcal === 0 ||
                          patientInfo.manualNutrientEntry?.kcal === '0' ||
                          patientInfo.manualNutrientEntry?.kcal === undefined
                            ? ''
                            : patientInfo.manualNutrientEntry.kcal
                        }
                        onChange={(e) => {
                          const raw = e.target.value;
                          const current = patientInfo.manualNutrientEntry || {
                            enabled: true,
                            timing: 'colacion2',
                            includeInMenu: false,
                          };
                          onPatientInfoChange({
                            ...patientInfo,
                            manualNutrientEntry: {
                              ...current,
                              enabled: true,
                              kcal: raw === '' ? '' : (parseFloat(raw) || raw),
                            },
                          });
                        }}
                        className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 transition-all font-mono pr-8"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-2xs font-bold text-slate-400 pointer-events-none">
                        kcal
                      </span>
                    </div>
                  </div>

              {/* Lípidos */}
              <div>
                <label
                  htmlFor="input-manual-lipids"
                  style={{ fontSize: '13px' }}
                  className="block text-[13px] font-bold uppercase tracking-wider text-slate-600 mb-1"
                >
                  Lípidos
                </label>
                <div className="relative">
                  <input
                    id="input-manual-lipids"
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder=""
                    value={
                      patientInfo.manualNutrientEntry?.lipidsGrams === 0 ||
                      patientInfo.manualNutrientEntry?.lipidsGrams === '0' ||
                      patientInfo.manualNutrientEntry?.lipidsGrams === undefined
                        ? ''
                        : patientInfo.manualNutrientEntry.lipidsGrams
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      const current = patientInfo.manualNutrientEntry || {
                        enabled: true,
                        timing: 'colacion2',
                        includeInMenu: false,
                      };
                      onPatientInfoChange({
                        ...patientInfo,
                        manualNutrientEntry: {
                          ...current,
                          enabled: true,
                          lipidsGrams: raw === '' ? '' : (parseFloat(raw) || raw),
                        },
                      });
                    }}
                    className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 transition-all font-mono pr-6"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-2xs font-bold text-slate-400 pointer-events-none">
                    g
                  </span>
                </div>
              </div>

              {/* Carbohidratos */}
              <div>
                <label
                  htmlFor="input-manual-carbs"
                  style={{ fontSize: '13px' }}
                  className="block text-[13px] font-bold uppercase tracking-wider text-slate-600 mb-1"
                >
                  Carbohidratos
                </label>
                <div className="relative">
                  <input
                    id="input-manual-carbs"
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder=""
                    value={
                      patientInfo.manualNutrientEntry?.carbsGrams === 0 ||
                      patientInfo.manualNutrientEntry?.carbsGrams === '0' ||
                      patientInfo.manualNutrientEntry?.carbsGrams === undefined
                        ? ''
                        : patientInfo.manualNutrientEntry.carbsGrams
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      const current = patientInfo.manualNutrientEntry || {
                        enabled: true,
                        timing: 'colacion2',
                        includeInMenu: false,
                      };
                      onPatientInfoChange({
                        ...patientInfo,
                        manualNutrientEntry: {
                          ...current,
                          enabled: true,
                          carbsGrams: raw === '' ? '' : (parseFloat(raw) || raw),
                        },
                      });
                    }}
                    className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 transition-all font-mono pr-6"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-2xs font-bold text-slate-400 pointer-events-none">
                    g
                  </span>
                </div>
              </div>

              {/* Tiempo de Comida asignado */}
              <div className="col-span-2 sm:col-span-1">
                <label
                  htmlFor="select-manual-timing"
                  style={{ fontSize: '13px' }}
                  className="block text-[13px] font-bold uppercase tracking-wider text-slate-600 mb-1"
                >
                  Tiempo Asignado
                </label>
                <select
                  id="select-manual-timing"
                  value={patientInfo.manualNutrientEntry?.timing || 'colacion2'}
                  onChange={(e) => {
                    const current = patientInfo.manualNutrientEntry || {
                      enabled: true,
                      timing: 'colacion2',
                      includeInMenu: false,
                    };
                    onPatientInfoChange({
                      ...patientInfo,
                      manualNutrientEntry: {
                        ...current,
                        enabled: true,
                        timing: e.target.value as any,
                      },
                    });
                  }}
                  className="w-full px-2.5 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 transition-all font-bold"
                >
                  <option value="colacion2">Colación 2</option>
                  <option value="desayuno">Desayuno</option>
                  <option value="colacion1">Colación 1</option>
                  <option value="comida">Comida</option>
                  <option value="cena">Cena</option>
                  <option value="any">Cualquier tiempo</option>
                </select>
              </div>
            </div>
              );
            })()}

            {/* Resumen del Aporte */}
            {((patientInfo.manualNutrientEntry?.proteinGrams || 0) > 0 || (patientInfo.manualNutrientEntry?.kcal || 0) > 0 || (patientInfo.manualNutrientEntry?.lipidsGrams || 0) > 0 || (patientInfo.manualNutrientEntry?.carbsGrams || 0) > 0) && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-2xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-emerald-900">Total registrado:</span>
                  <span className="font-extrabold text-emerald-950 font-mono">{patientInfo.manualNutrientEntry?.proteinGrams || 0}g Prot</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-extrabold text-emerald-950 font-mono">{patientInfo.manualNutrientEntry?.kcal || 0} kcal</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-extrabold text-emerald-950 font-mono">{patientInfo.manualNutrientEntry?.lipidsGrams || 0}g Grasa</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-extrabold text-emerald-950 font-mono">{patientInfo.manualNutrientEntry?.carbsGrams || 0}g HC</span>
                </div>
                <div className="text-emerald-900 font-semibold">
                  {patientInfo.manualNutrientEntry?.includeInMenu
                    ? '✓ Contabilizado para incluirse en el menú y en los totales nutricionales'
                    : 'No se incluye en el menú ni en totales'}
                </div>
              </div>
            )}
          </div>

          {/* SECCIÓN: PREFERENCIAS DE ALIMENTOS EN CADA COMIDA Y ALIMENTOS NO PREFERIBLES */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 font-heading">
                    Preferencias de Alimentos en Cada Comida y Alimentos No Preferibles
                  </h4>
                  <p className="text-2xs text-slate-500">
                    Especifica los alimentos preferidos (prioridad en el menú) y alimentos no preferibles o a evitar por cada tiempo de comida.
                  </p>
                </div>
              </div>
            </div>

            {/* Cabecera de Columnas */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-2 text-2xs font-extrabold uppercase tracking-wider">
              <div className="sm:col-span-3 text-slate-500" style={{ fontSize: '12px' }}>
                Tiempo de Comida
              </div>
              <div className="sm:col-span-4 text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span style={{ fontSize: '11px' }}>Alimentos Preferidos (Prioridad en Menú)</span>
              </div>
              <div className="sm:col-span-5 text-rose-800 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span style={{ fontSize: '11px', lineHeight: '19px' }}>Alimentos No Preferibles / A Evitar (Exclusión Total)</span>
              </div>
            </div>

            {/* Lista por Tiempos de Comida */}
            <div className="space-y-3">
              {(['desayuno', 'colacion1', 'comida', 'colacion2', 'cena'] as const).map((mealKey) => {
                const labels: Record<string, string> = {
                  desayuno: 'Desayuno',
                  colacion1: 'Colación Matutina',
                  comida: 'Comida',
                  colacion2: 'Colación Vespertina',
                  cena: 'Cena',
                };
                
                const currentLikes = patientInfo.mealPreferences?.[mealKey]?.likes || '';
                const currentDislikes = patientInfo.mealPreferences?.[mealKey]?.dislikes || '';

                const handlePrefChange = (type: 'likes' | 'dislikes', val: string) => {
                  const updatedPrefs = {
                    ...patientInfo.mealPreferences,
                    [mealKey]: {
                      likes: type === 'likes' ? val : currentLikes,
                      dislikes: type === 'dislikes' ? val : currentDislikes,
                    },
                  } as any;
                  onPatientInfoChange({ ...patientInfo, mealPreferences: updatedPrefs });
                };

                const isAssigned =
                  patientInfo.manualNutrientEntry?.enabled &&
                  patientInfo.manualNutrientEntry?.includeInMenu &&
                  (patientInfo.manualNutrientEntry?.timing === mealKey ||
                    (patientInfo.manualNutrientEntry?.timing === 'any' && mealKey === 'colacion2'));

                const parsedLikes = currentLikes.split(',').map((s) => s.trim()).filter(Boolean);
                const parsedDislikes = currentDislikes.split(',').map((s) => s.trim()).filter(Boolean);

                return (
                  <div
                    key={mealKey}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3 items-start bg-slate-50/70 hover:bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200 transition-all"
                  >
                    {/* Columna 1: Nombre del tiempo de comida y badge si aplica */}
                    <div className="sm:col-span-3 space-y-1">
                      <div className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>{labels[mealKey]}</span>
                      </div>
                      {isAssigned && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-300 text-3xs font-extrabold">
                          <span>+ {patientInfo.manualNutrientEntry?.proteinGrams || 0}g Prot ({patientInfo.manualNutrientEntry?.kcal || 0} kcal)</span>
                        </div>
                      )}
                    </div>

                    {/* Columna 2: Alimentos Preferidos */}
                    <div className="sm:col-span-4 space-y-1.5">
                      <div className="sm:hidden text-2xs font-bold text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Alimentos Preferidos</span>
                      </div>
                      <input
                        type="text"
                        placeholder="Ej. Huevo, Avena, Fresas, Pollo..."
                        value={currentLikes}
                        onChange={(e) => handlePrefChange('likes', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs text-slate-800 bg-white border border-emerald-300/80 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400 font-medium"
                      />
                      {parsedLikes.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {parsedLikes.map((item, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 text-3xs font-bold"
                            >
                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                              {item}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Columna 3: Alimentos No Preferibles / A Evitar */}
                    <div className="sm:col-span-5 space-y-1.5">
                      <div className="sm:hidden text-2xs font-bold text-rose-800 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                        <span>Alimentos No Preferibles / A Evitar</span>
                      </div>
                      <input
                        type="text"
                        placeholder="Ej. Lácteos, Mariscos, Papaya, Gluten..."
                        value={currentDislikes}
                        onChange={(e) => handlePrefChange('dislikes', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs text-slate-800 bg-white border border-rose-300/80 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500 transition-all placeholder:text-slate-400 font-medium"
                      />
                      {parsedDislikes.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {parsedDislikes.map((item, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-900 border border-rose-200 text-3xs font-bold"
                            >
                              <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                              Excluir: {item}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const NutritionSummaryBar = React.memo(NutritionSummaryBarComponent);


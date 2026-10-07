import React, { useMemo, useCallback } from 'react';
import { SMAE_GROUPS, MEAL_COLUMNS, TableGridState } from '../data/smaeData';
import { MealKey, PatientInfo } from '../types';
import {
  calculateRowTotal,
  calculateColumnTotal,
  calculateGrandTotalEquivalents,
  calculateMacros,
  calculateCaloricExpenditure,
} from '../utils/nutritionCalculations';
import { Plus, Minus, UtensilsCrossed, Sunrise, Apple, Utensils, Coffee, Moon, Flame, Activity } from 'lucide-react';

interface SmaeTableProps {
  tableState: TableGridState;
  onChangeCell: (groupId: string, mealKey: MealKey, value: number) => void;
  patientName?: string;
  patientInfo?: PatientInfo;
}

const getMealIcon = (iconName: string) => {
  switch (iconName) {
    case 'Sunrise':
      return <Sunrise className="w-3.5 h-3.5 text-amber-500" />;
    case 'Apple':
      return <Apple className="w-3.5 h-3.5 text-rose-500" />;
    case 'Utensils':
      return <Utensils className="w-3.5 h-3.5 text-emerald-600" />;
    case 'Coffee':
      return <Coffee className="w-3.5 h-3.5 text-amber-600" />;
    case 'Moon':
      return <Moon className="w-3.5 h-3.5 text-indigo-500" />;
    default:
      return <Utensils className="w-3.5 h-3.5 text-slate-500" />;
  }
};

const SmaeTableComponent: React.FC<SmaeTableProps> = ({ tableState, onChangeCell, patientName, patientInfo }) => {
  const handleInputChange = useCallback(
    (groupId: string, mealKey: MealKey, rawValue: string) => {
      if (rawValue === '') {
        onChangeCell(groupId, mealKey, 0);
        return;
      }
      const num = parseFloat(rawValue);
      if (!isNaN(num) && num >= 0) {
        onChangeCell(groupId, mealKey, num);
      }
    },
    [onChangeCell]
  );

  const handleStep = useCallback(
    (groupId: string, mealKey: MealKey, delta: number) => {
      const current = Number(tableState[groupId]?.[mealKey]) || 0;
      const next = Math.max(0, Math.round((current + delta) * 2) / 2); // Steps of 0.5
      onChangeCell(groupId, mealKey, next);
    },
    [tableState, onChangeCell]
  );

  const grandTotal = useMemo(() => calculateGrandTotalEquivalents(tableState), [tableState]);
  const macros = useMemo(
    () => calculateMacros(tableState, patientInfo?.manualNutrientEntry, patientInfo?.proteinSupplement),
    [tableState, patientInfo?.manualNutrientEntry, patientInfo?.proteinSupplement]
  );

  const isIncluded = Boolean(patientInfo?.manualNutrientEntry?.includeInMenu);
  const manualEntryP = isIncluded ? (Number(patientInfo?.manualNutrientEntry?.proteinGrams) || 0) : 0;
  const suppP = (patientInfo?.proteinSupplement?.enabled && patientInfo?.proteinSupplement?.includeInMenu)
    ? (Number(patientInfo.proteinSupplement.totalProteinGrams) ||
       Number(patientInfo.proteinSupplement.scoops || 1) * Number(patientInfo.proteinSupplement.proteinGramsPerServing || 25))
    : 0;
  const manualP = manualEntryP + suppP;

  const manualL = isIncluded ? (Number(patientInfo?.manualNutrientEntry?.lipidsGrams) || 0) : 0;
  const manualC = isIncluded ? (Number(patientInfo?.manualNutrientEntry?.carbsGrams) || 0) : 0;
  const manualKcalDirect = isIncluded ? (Number(patientInfo?.manualNutrientEntry?.kcal) || 0) : 0;
  const manualKcalFromMacros = manualEntryP * 4 + manualL * 9 + manualC * 4;
  const manualKcal = (manualKcalDirect > 0 ? manualKcalDirect : manualKcalFromMacros) + (suppP * 4);

  // Metas y prescripción del paciente
  const caloricCalculation = useMemo(() => {
    if (!patientInfo) return { isComplete: false, get: 0 };
    return calculateCaloricExpenditure(patientInfo);
  }, [patientInfo]);

  const defaultTargetKcal = useMemo(() => {
    if (caloricCalculation.isComplete && caloricCalculation.get) {
      return caloricCalculation.get;
    }
    return macros.totalKcal > 0 ? macros.totalKcal : 2000;
  }, [caloricCalculation, macros.totalKcal]);

  const activeTargetKcal = patientInfo?.macroPrescription?.targetKcal || defaultTargetKcal;

  const activeProteinPercent = useMemo(() => {
    if (typeof patientInfo?.macroPrescription?.proteinPercent === 'number') {
      return patientInfo.macroPrescription.proteinPercent;
    }
    if (patientInfo?.macroPrescription?.targetProteinGrams && patientInfo.macroPrescription.targetProteinGrams > 0 && activeTargetKcal > 0) {
      return Math.round(((patientInfo.macroPrescription.targetProteinGrams * 4 / activeTargetKcal) * 100) * 10) / 10;
    }
    return 20;
  }, [patientInfo?.macroPrescription, activeTargetKcal]);

  const activeLipidsPercent = useMemo(() => {
    if (typeof patientInfo?.macroPrescription?.lipidsPercent === 'number') {
      return patientInfo.macroPrescription.lipidsPercent;
    }
    return 25;
  }, [patientInfo?.macroPrescription]);

  const activeCarbsPercent = useMemo(() => {
    if (typeof patientInfo?.macroPrescription?.carbsPercent === 'number') {
      return patientInfo.macroPrescription.carbsPercent;
    }
    return 55;
  }, [patientInfo?.macroPrescription]);

  const metaProteinGrams = useMemo(() => {
    if (patientInfo?.macroPrescription?.targetProteinGrams && patientInfo.macroPrescription.targetProteinGrams > 0) {
      return patientInfo.macroPrescription.targetProteinGrams;
    }
    return Math.round(((activeTargetKcal * (activeProteinPercent / 100)) / 4) * 10) / 10;
  }, [patientInfo?.macroPrescription, activeTargetKcal, activeProteinPercent]);

  const metaLipidsGrams = useMemo(() => {
    return Math.round(((activeTargetKcal * (activeLipidsPercent / 100)) / 9) * 10) / 10;
  }, [activeTargetKcal, activeLipidsPercent]);

  const metaCarbsGrams = useMemo(() => {
    return Math.round(((activeTargetKcal * (activeCarbsPercent / 100)) / 4) * 10) / 10;
  }, [activeTargetKcal, activeCarbsPercent]);

  // Porcentaje de la suma de cada macro respecto a la meta (100% = meta para observar cuánto se lleva)
  const proteinProgressPercent = metaProteinGrams > 0
    ? Math.round((macros.totalProteinGrams / metaProteinGrams) * 100)
    : 0;

  const lipidsProgressPercent = metaLipidsGrams > 0
    ? Math.round((macros.totalLipidsGrams / metaLipidsGrams) * 100)
    : 0;

  const carbsProgressPercent = metaCarbsGrams > 0
    ? Math.round((macros.totalCarbsGrams / metaCarbsGrams) * 100)
    : 0;

  // Adecuaciones de macros y calorías (%)
  const kcalAdequacy = activeTargetKcal > 0 && macros.totalKcal > 0
    ? Math.round((macros.totalKcal / activeTargetKcal) * 100)
    : null;
  const proteinAdequacy = metaProteinGrams > 0 && macros.totalProteinGrams > 0
    ? Math.round((macros.totalProteinGrams / metaProteinGrams) * 100)
    : null;
  const lipidsAdequacy = metaLipidsGrams > 0 && macros.totalLipidsGrams > 0
    ? Math.round((macros.totalLipidsGrams / metaLipidsGrams) * 100)
    : null;
  const carbsAdequacy = metaCarbsGrams > 0 && macros.totalCarbsGrams > 0
    ? Math.round((macros.totalCarbsGrams / metaCarbsGrams) * 100)
    : null;

  // Memoize column totals
  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const col of MEAL_COLUMNS) {
      totals[col.key] = calculateColumnTotal(col.key, tableState);
    }
    return totals;
  }, [tableState]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden mb-8 transition-all">
      {/* Table Top Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 px-5 py-4 text-white flex flex-wrap items-center justify-between gap-3 border-b border-emerald-900/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-900/60 border border-emerald-500/40 flex items-center justify-center shadow-inner">
            <UtensilsCrossed className="w-5 h-5 text-emerald-200" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold tracking-tight font-heading flex items-center gap-2">
              CUADRO DE PORCIONES Y EQUIVALENTES
            </h2>
            <p className="text-xs text-emerald-100/90 font-medium">
              Distribución de equivalentes por comida
            </p>
          </div>
        </div>

        {patientName && patientName.trim().length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-emerald-950/60 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-emerald-500/30 shadow-xs flex items-center gap-1.5 text-xs text-white">
              <span className="text-emerald-300 font-bold uppercase text-2xs">Paciente:</span>
              <span className="font-bold text-white max-w-[200px] truncate">{patientName.trim()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Table Container with Horizontal Scroll */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[780px]" id="smae-editable-table">
          {/* Header Row */}
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 text-xs font-bold font-heading uppercase tracking-wider">
              {/* Columna A: Grupo de Alimento */}
              <th className="py-3.5 px-4 w-[280px] sticky left-0 bg-slate-50/95 z-20 border-r border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-800">
                    <span>Grupo de Alimento</span>
                  </div>
                  <span className="hidden text-3xs font-semibold text-slate-400 normal-case tracking-normal">SMAE 5ª Ed.</span>
                </div>
              </th>

              {/* 5 Meal Columns */}
              {MEAL_COLUMNS.map((col) => {
                const colTotal = columnTotals[col.key] ?? 0;
                return (
                  <th key={col.key} className="py-3 px-3 text-center border-r border-slate-200 min-w-[105px]">
                    <div className="flex items-center justify-center gap-1.5 text-slate-800 font-extrabold text-xs">
                      {getMealIcon(col.iconName)}
                      <span>{col.label}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-center gap-1">
                      <span className="text-3xs font-bold text-emerald-800 bg-emerald-100/80 rounded-full px-2 py-0.5 border border-emerald-200/80 tabular-nums">
                        {colTotal} eq
                      </span>
                    </div>
                  </th>
                );
              })}

              {/* Columna: Equivalentes totales */}
              <th className="py-3 px-3 text-center bg-emerald-50/70 text-emerald-950 font-extrabold min-w-[110px]">
                <div className="text-xs">Total Grupo</div>
                <div className="hidden text-3xs font-semibold text-emerald-700 uppercase mt-0.5">Σ Fila</div>
              </th>
            </tr>
          </thead>

          {/* 17 Food Group Rows */}
          <tbody className="divide-y divide-slate-100 text-xs">
            {SMAE_GROUPS.map((group, idx) => {
              const rowTotal = calculateRowTotal(group.id, tableState);
              const isEven = idx % 2 === 0;

              return (
                <tr
                  key={group.id}
                  className={`transition-colors hover:bg-emerald-50/30 ${
                    isEven ? 'bg-white' : 'bg-slate-50/30'
                  }`}
                >
                  {/* Fixed Column A: Food group name & kcal pill */}
                  <td
                    className={`py-2 px-4 font-semibold text-slate-800 sticky left-0 z-10 border-r border-slate-200 shadow-2xs ${
                      isEven ? 'bg-white' : 'bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="leading-tight text-xs text-slate-900 font-medium">
                        {group.name}
                      </span>
                      <span
                        className={`text-3xs px-2 py-0.5 rounded-full font-semibold shrink-0 border tabular-nums ${group.badgeColor}`}
                        title={`${group.kcal} kcal | P: ${group.protein}g | L: ${group.lipids}g | HC: ${group.carbs}g`}
                      >
                        {group.kcal} kcal
                      </span>
                    </div>
                  </td>

                  {/* 5 Meal inputs */}
                  {MEAL_COLUMNS.map((col) => {
                    const value = tableState[group.id]?.[col.key] ?? 0;
                    const hasValue = value > 0;

                    return (
                      <td key={col.key} className="py-1.5 px-2 text-center border-r border-slate-200/80">
                        <div className="inline-flex items-center justify-center gap-0.5 bg-slate-50/70 p-0.5 rounded-lg border border-slate-200/60 focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                          {/* Stepper Down */}
                          <button
                            type="button"
                            id={`btn-dec-${group.id}-${col.key}`}
                            onClick={() => handleStep(group.id, col.key, -0.5)}
                            className="w-5 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 active:scale-95 transition-all text-3xs disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
                            disabled={value <= 0}
                            title="Restar 0.5"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>

                          {/* Numeric Input */}
                          <input
                            id={`input-${group.id}-${col.key}`}
                            type="number"
                            step="0.5"
                            min="0"
                            max="20"
                            value={value === 0 ? '' : value}
                            placeholder="0"
                            onChange={(e) => handleInputChange(group.id, col.key, e.target.value)}
                            className={`w-11 sm:w-12 h-6 text-center text-xs font-bold rounded bg-transparent focus:outline-hidden tabular-nums transition-all ${
                              hasValue
                                ? 'text-emerald-900 font-extrabold bg-emerald-100/70'
                                : 'text-slate-400 placeholder:text-slate-300 font-normal'
                            }`}
                          />

                          {/* Stepper Up */}
                          <button
                            type="button"
                            id={`btn-inc-${group.id}-${col.key}`}
                            onClick={() => handleStep(group.id, col.key, 0.5)}
                            className="w-5 h-6 flex items-center justify-center rounded text-slate-400 hover:text-emerald-800 hover:bg-emerald-100 active:scale-95 transition-all text-3xs cursor-pointer"
                            title="Sumar 0.5"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </td>
                    );
                  })}

                  {/* Equivalentes totales (Row Sum) */}
                  <td className="py-2 px-3 text-center bg-emerald-50/30">
                    <span
                      className={`inline-block min-w-[32px] px-2 py-0.5 rounded-md text-xs font-extrabold font-heading tabular-nums transition-all ${
                        rowTotal > 0
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-400 bg-slate-100'
                      }`}
                    >
                      {rowTotal}
                    </span>
                  </td>
                </tr>
              );
            })}

            {/* Fila Final: Cuadro de Meta y Suma a lo ancho de toda la tabla (4 en horizontal) */}
            <tr className="border-t-2 border-emerald-900 bg-emerald-950 text-white">
              <td colSpan={7} className="p-2 sm:p-2.5 bg-emerald-950 text-white">
                <div className="grid grid-cols-4 gap-2 sm:gap-2.5 w-full">
                  {/* ENERGÍA (Kcal) */}
                  <div className="bg-emerald-900/90 rounded-xl p-2 sm:p-2.5 border border-emerald-700/70 shadow-xs flex flex-col justify-between gap-1">
                    <div className="flex items-center justify-between font-bold mb-0.5">
                      <span className="flex items-center gap-1.5 text-amber-300 text-xs">
                        <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Kcal</span>
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-3xs font-black border tabular-nums shrink-0 ${
                        kcalAdequacy && kcalAdequacy >= 95 && kcalAdequacy <= 105
                          ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/50'
                          : kcalAdequacy && kcalAdequacy >= 90 && kcalAdequacy <= 110
                          ? 'bg-amber-500/30 text-amber-200 border-amber-400/50'
                          : 'bg-rose-500/30 text-rose-200 border-rose-400/50'
                      }`}>
                        {kcalAdequacy ?? '--'}%
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-1 text-3xs text-emerald-100/90 tabular-nums">
                      <span className="truncate">
                        Suma: <strong className="text-white text-xs font-black">{macros.totalKcal}</strong>
                        {isIncluded && manualKcal > 0 && (
                          <span className="text-amber-300 font-bold ml-1 text-4xs" title={`Incluye +${manualKcal} kcal de aporte manual de proteína/nutrientes`}>
                            (+{manualKcal})
                          </span>
                        )}
                      </span>
                      <span className="truncate text-slate-400">Meta: <strong className="text-slate-200 font-semibold">{activeTargetKcal}</strong></span>
                    </div>
                  </div>

                  {/* PROTEÍNA */}
                  <div className="bg-emerald-900/90 rounded-xl p-2.5 border border-emerald-700/70 shadow-xs flex flex-col justify-between gap-1">
                    <div className="flex items-center justify-between font-bold mb-0.5">
                      <span className="flex items-center gap-1.5 text-rose-300 text-xs">
                        <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0"></span>
                        <span>Proteína</span>
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-3xs font-black border tabular-nums shrink-0 bg-rose-500/30 text-rose-200 border-rose-400/50" title={`Porcentaje asignado manualmente en el cuadro anterior: ${activeProteinPercent}% (Meta: ${metaProteinGrams}g, Adecuación: ${proteinAdequacy ?? '--'}%)`}>
                        {activeProteinPercent % 1 === 0 ? activeProteinPercent : activeProteinPercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-1 text-3xs text-emerald-100/90 tabular-nums">
                      <span className="truncate">
                        Suma: <strong className="text-white text-xs font-black">{macros.totalProteinGrams}g</strong>
                        {isIncluded && manualP > 0 && (
                          <span className="text-rose-300 font-bold ml-1 text-4xs" title={`Incluye +${manualP}g de proteína manual`}>
                            (+{manualP}g)
                          </span>
                        )}
                        <span className="text-rose-300/90 text-4xs font-bold ml-1" title={`Avance respecto a la meta (100% = ${metaProteinGrams}g)`}>({proteinProgressPercent}%)</span>
                      </span>
                      <span className="truncate text-slate-400">Meta: <strong className="text-slate-200 font-semibold">{metaProteinGrams}g</strong></span>
                    </div>
                  </div>

                  {/* LÍPIDOS */}
                  <div className="bg-emerald-900/90 rounded-xl p-2.5 border border-emerald-700/70 shadow-xs flex flex-col justify-between gap-1">
                    <div className="flex items-center justify-between font-bold mb-0.5">
                      <span className="flex items-center gap-1.5 text-amber-200 text-xs">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                        <span>Lípidos</span>
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-3xs font-black border tabular-nums shrink-0 bg-amber-500/30 text-amber-200 border-amber-400/50" title={`Porcentaje asignado manualmente en el cuadro anterior: ${activeLipidsPercent}% (Meta: ${metaLipidsGrams}g, Adecuación: ${lipidsAdequacy ?? '--'}%)`}>
                        {activeLipidsPercent % 1 === 0 ? activeLipidsPercent : activeLipidsPercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-1 text-3xs text-emerald-100/90 tabular-nums">
                      <span className="truncate">
                        Suma: <strong className="text-white text-xs font-black">{macros.totalLipidsGrams}g</strong>
                        {isIncluded && manualL > 0 && (
                          <span className="text-amber-300 font-bold ml-1 text-4xs" title={`Incluye +${manualL}g de lípidos manuales`}>
                            (+{manualL}g)
                          </span>
                        )}
                        <span className="text-amber-300/90 text-4xs font-bold ml-1" title={`Avance respecto a la meta (100% = ${metaLipidsGrams}g)`}>({lipidsProgressPercent}%)</span>
                      </span>
                      <span className="truncate text-slate-400">Meta: <strong className="text-slate-200 font-semibold">{metaLipidsGrams}g</strong></span>
                    </div>
                  </div>

                  {/* CARBOHIDRATOS (HC) */}
                  <div className="bg-emerald-900/90 rounded-xl p-2.5 border border-emerald-700/70 shadow-xs flex flex-col justify-between gap-1">
                    <div className="flex items-center justify-between font-bold mb-0.5">
                      <span className="flex items-center gap-1.5 text-sky-300 text-xs">
                        <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0"></span>
                        <span>HC</span>
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-3xs font-black border tabular-nums shrink-0 bg-sky-500/30 text-sky-200 border-sky-400/50" title={`Porcentaje asignado manualmente en el cuadro anterior: ${activeCarbsPercent}% (Meta: ${metaCarbsGrams}g, Adecuación: ${carbsAdequacy ?? '--'}%)`}>
                        {activeCarbsPercent % 1 === 0 ? activeCarbsPercent : activeCarbsPercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-1 text-3xs text-emerald-100/90 tabular-nums">
                      <span className="truncate">
                        Suma: <strong className="text-white text-xs font-black">{macros.totalCarbsGrams}g</strong>
                        {isIncluded && manualC > 0 && (
                          <span className="text-sky-300 font-bold ml-1 text-4xs" title={`Incluye +${manualC}g de carbohidratos manuales`}>
                            (+{manualC}g)
                          </span>
                        )}
                        <span className="text-sky-300/90 text-4xs font-bold ml-1" title={`Avance respecto a la meta (100% = ${metaCarbsGrams}g)`}>({carbsProgressPercent}%)</span>
                      </span>
                      <span className="truncate text-slate-400">Meta: <strong className="text-slate-200 font-semibold">{metaCarbsGrams}g</strong></span>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const SmaeTable = React.memo(SmaeTableComponent);


import React from 'react';
import { TableGridState, SMAE_GROUPS, MEAL_COLUMNS } from '../data/smaeData';
import { calculateRowTotal, calculateColumnTotal, calculateGrandTotalEquivalents, calculateBmiInfo, calculateMacros } from '../utils/nutritionCalculations';
import { MacroNutrientSummary, PatientInfo } from '../types';
import { Table as TableIcon, Flame, Scale, Activity, Weight, Ruler } from 'lucide-react';

interface PrintableEquivalentsTableProps {
  tableState: TableGridState;
  patientName?: string;
  patientGoal?: string;
  patientHeight?: string;
  patientWeight?: string;
  patientAge?: string;
  patientInfo?: PatientInfo;
  macros?: MacroNutrientSummary;
  className?: string;
}

export const PrintableEquivalentsTable: React.FC<PrintableEquivalentsTableProps> = ({
  tableState,
  patientName = '',
  patientGoal = '',
  patientHeight = '',
  patientWeight = '',
  patientAge = '',
  patientInfo,
  macros: inputMacros,
  className = '',
}) => {
  const activeName = patientInfo?.name || patientName;
  const activeGoal = patientInfo?.goal || patientGoal;
  const activeHeight = patientInfo?.height || patientHeight;
  const activeWeight = patientInfo?.weight || patientWeight;
  const activeAge = patientInfo?.age || patientAge;

  const grandTotal = calculateGrandTotalEquivalents(tableState);
  const bmiInfo = calculateBmiInfo(activeHeight, activeWeight);
  const macros = inputMacros || calculateMacros(tableState);

  const hasComposition = !!(
    patientInfo?.fatPercent || patientInfo?.fatKg ||
    patientInfo?.musclePercent || patientInfo?.muscleKg ||
    patientInfo?.bonePercent || patientInfo?.boneKg ||
    patientInfo?.residualPercent || patientInfo?.residualKg
  );

  const proteinKcal = Math.round(macros.totalProteinGrams * 4);
  const lipidsKcal = Math.round(macros.totalLipidsGrams * 9);
  const carbsKcal = Math.round(macros.totalCarbsGrams * 4);

  // Show all 17 SMAE groups even if they have 0 values, preserving full table structure
  const displayGroups = SMAE_GROUPS;

  // Calculate total kcal sum for the groups displayed
  const totalKcal = SMAE_GROUPS.reduce((acc, g) => {
    const rowEq = calculateRowTotal(g.id, tableState);
    return acc + rowEq * g.kcal;
  }, 0);

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-300 print:border-slate-400 shadow-xs overflow-hidden mb-6 print:mb-5 print-break-inside-avoid ${className}`}
      id="printable-equivalents-table"
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 print:bg-none print:bg-slate-900 px-5 py-3.5 print:px-4 print:py-2.5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-900/60 print:bg-slate-800 flex items-center justify-center border border-emerald-500/40 print:border-slate-700 text-emerald-200 print:text-white shrink-0">
              <TableIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base print:text-sm font-extrabold font-heading tracking-tight uppercase">
                Cuadro de Distribución de Equivalentes
              </h3>
              <p className="text-2xs print:text-3xs text-emerald-100/90 print:text-slate-300 font-medium">
                Porciones prescritas por tiempo de comida para el cumplimiento de los requerimientos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-2xs font-semibold rounded-lg bg-white/15 text-emerald-100 border border-white/20 hidden sm:inline-flex no-print">
              Cuadro completo ({SMAE_GROUPS.length} grupos)
            </span>
            <div className="bg-emerald-950/60 print:bg-slate-800 px-3 py-1 rounded-lg border border-emerald-500/30 print:border-slate-600 text-xs font-bold text-amber-300 print:text-white tabular-nums">
              {grandTotal} eq / día
            </div>
          </div>
        </div>
      </div>

      {/* Patient info strip if present */}
      {(activeName || activeWeight || activeHeight || hasComposition) && (
        <div className="bg-slate-50 print:bg-transparent px-4 py-2.5 border-b border-slate-200 print:border-slate-300 flex flex-wrap items-center justify-between gap-3 text-xs print:text-2xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-800">Paciente:</span>
            <span className="font-semibold text-slate-900">{activeName || 'Plan Personalizado'}</span>
            {activeGoal && <span className="text-slate-500 italic">({activeGoal})</span>}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-2xs print:text-3xs text-slate-600">
            {activeAge && <span><strong>Edad:</strong> {activeAge}</span>}
            {activeWeight && <span><strong>Peso:</strong> {activeWeight}</span>}
            {activeHeight && <span><strong>Talla:</strong> {activeHeight}</span>}
            {bmiInfo && <span><strong>IMC:</strong> {bmiInfo.formatted} ({bmiInfo.category})</span>}
          </div>
        </div>
      )}

      {/* Body Composition strip if present */}
      {hasComposition && (
        <div className="bg-slate-100/70 print:bg-transparent px-4 py-2 border-b border-slate-200 print:border-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs print:text-3xs text-slate-700">
          <span className="font-bold text-slate-900 flex items-center gap-1">
            <Scale className="w-3 h-3 text-emerald-700" />
            Composición Corporal:
          </span>
          {(patientInfo?.fatPercent || patientInfo?.fatKg) && (
            <span><strong>Grasa:</strong> {patientInfo?.fatPercent ? `${patientInfo.fatPercent}%` : ''} {patientInfo?.fatKg ? `(${patientInfo.fatKg} kg)` : ''}</span>
          )}
          {(patientInfo?.musclePercent || patientInfo?.muscleKg) && (
            <span><strong>Músculo:</strong> {patientInfo?.musclePercent ? `${patientInfo.musclePercent}%` : ''} {patientInfo?.muscleKg ? `(${patientInfo.muscleKg} kg)` : ''}</span>
          )}
          {(patientInfo?.bonePercent || patientInfo?.boneKg) && (
            <span><strong>Hueso:</strong> {patientInfo?.bonePercent ? `${patientInfo.bonePercent}%` : ''} {patientInfo?.boneKg ? `(${patientInfo.boneKg} kg)` : ''}</span>
          )}
          {(patientInfo?.residualPercent || patientInfo?.residualKg) && (
            <span><strong>Residual:</strong> {patientInfo?.residualPercent ? `${patientInfo.residualPercent}%` : ''} {patientInfo?.residualKg ? `(${patientInfo.residualKg} kg)` : ''}</span>
          )}
        </div>
      )}

      {/* Clean formal table for screen & print */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[620px] print:min-w-0 text-xs print:text-2xs">
          <thead>
            <tr className="bg-slate-100 print:bg-slate-100 border-b border-slate-200 print:border-slate-300 text-slate-800 font-bold uppercase tracking-wider text-2xs print:text-3xs">
              <th className="py-2 px-3.5 print:py-1.5 print:px-2 border-r border-slate-200 print:border-slate-300 text-left min-w-[200px] print:min-w-[150px]">
                Grupo de Alimento (SMAE)
              </th>
              {MEAL_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="py-2 px-2 print:py-1.5 print:px-1.5 border-r border-slate-200 print:border-slate-300 text-center"
                >
                  <div className="font-extrabold text-slate-900">{col.label}</div>
                  <div className="text-3xs font-semibold text-slate-500 lowercase print:hidden">
                    {col.timeHint}
                  </div>
                </th>
              ))}
              <th className="py-2 px-2.5 print:py-1.5 print:px-2 border-r border-slate-200 print:border-slate-300 text-center bg-emerald-50/70 print:bg-slate-100 text-emerald-950 print:text-slate-900 font-extrabold">
                Total Eq.
              </th>
              <th className="py-2 px-2.5 print:py-1.5 print:px-2 text-center bg-slate-50 print:bg-slate-100 text-slate-700 font-extrabold">
                Kcal
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 print:divide-slate-200">
            {displayGroups.map((group, idx) => {
              const rowTotal = calculateRowTotal(group.id, tableState);
              const isEven = idx % 2 === 0;
              const groupKcal = Math.round(rowTotal * group.kcal);

              return (
                <tr
                  key={group.id}
                  className={`${
                    isEven ? 'bg-white' : 'bg-slate-50/50 print:bg-slate-50/30'
                  } transition-colors`}
                >
                  {/* Group Name & Info */}
                  <td className="py-1.5 px-3.5 print:py-1 print:px-2 font-medium text-slate-900 border-r border-slate-200/80 print:border-slate-300">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs print:text-2xs font-semibold text-slate-800">
                        {group.name}
                      </span>
                      <span className="text-3xs text-slate-400 print:text-slate-600 font-normal">
                        ({group.kcal} kcal/eq)
                      </span>
                    </div>
                  </td>

                  {/* 5 Meal Column Values */}
                  {MEAL_COLUMNS.map((col) => {
                    const val = tableState[group.id]?.[col.key] || 0;
                    return (
                      <td
                        key={col.key}
                        className="py-1.5 px-2 print:py-1 print:px-1 text-center border-r border-slate-200/80 print:border-slate-300 font-bold tabular-nums"
                      >
                        {val > 0 ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-xs print:text-2xs font-bold text-emerald-900 print:text-slate-900 bg-emerald-50 print:bg-transparent">
                            {val}
                          </span>
                        ) : (
                          <span className="text-slate-300 print:text-slate-400 font-normal">-</span>
                        )}
                      </td>
                    );
                  })}

                  {/* Row Total */}
                  <td className="py-1.5 px-2.5 print:py-1 print:px-2 text-center border-r border-slate-200/80 print:border-slate-300 bg-emerald-50/40 print:bg-transparent font-extrabold text-emerald-950 print:text-slate-900 tabular-nums">
                    {rowTotal > 0 ? (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100/80 print:bg-transparent text-emerald-900 print:text-slate-900 font-black">
                        {rowTotal}
                      </span>
                    ) : (
                      <span className="text-slate-300 font-normal">0</span>
                    )}
                  </td>

                  {/* Kcal Total for Group */}
                  <td className="py-1.5 px-2.5 print:py-1 print:px-2 text-center font-semibold text-slate-600 print:text-slate-800 tabular-nums text-2xs print:text-3xs">
                    {groupKcal > 0 ? `${groupKcal} kcal` : '-'}
                  </td>
                </tr>
              );
            })}

            {/* TOTAL POR COMIDA ROW */}
            <tr className="bg-emerald-800 print:bg-slate-800 text-white font-extrabold border-t-2 border-emerald-900 print:border-slate-900">
              <td className="py-2.5 px-3.5 print:py-1.5 print:px-2 font-heading text-2xs print:text-3xs uppercase tracking-wider border-r border-emerald-700 print:border-slate-700 font-black">
                TOTAL POR COMIDA
              </td>

              {MEAL_COLUMNS.map((col) => {
                const colTotal = calculateColumnTotal(col.key, tableState);
                return (
                  <td
                    key={col.key}
                    className="py-2.5 px-2 print:py-1.5 print:px-1 text-center border-r border-emerald-700 print:border-slate-700 tabular-nums font-heading font-black text-xs print:text-2xs"
                  >
                    <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-900/80 print:bg-slate-700 text-white font-bold">
                      {colTotal}
                    </span>
                  </td>
                );
              })}

              {/* Grand Total Eq */}
              <td className="py-2.5 px-2.5 print:py-1.5 print:px-2 text-center border-r border-emerald-700 print:border-slate-700 bg-emerald-900 print:bg-slate-900 text-amber-300 print:text-white font-heading font-black text-xs print:text-2xs tabular-nums">
                {grandTotal} eq
              </td>

              {/* Total Kcal */}
              <td className="py-2.5 px-2.5 print:py-1.5 print:px-2 text-center bg-emerald-900/80 print:bg-slate-900 text-emerald-100 print:text-slate-200 font-heading font-bold text-2xs print:text-3xs tabular-nums">
                {Math.round(totalKcal)} kcal
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

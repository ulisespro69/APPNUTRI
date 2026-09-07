import React from 'react';
import { TableGridState, SMAE_GROUPS, MEAL_COLUMNS } from '../data/smaeData';
import { calculateRowTotal, calculateColumnTotal, calculateGrandTotalEquivalents } from '../utils/nutritionCalculations';
import { Table as TableIcon } from 'lucide-react';

interface PrintableEquivalentsTableProps {
  tableState: TableGridState;
  patientName?: string;
  patientGoal?: string;
  className?: string;
}

export const PrintableEquivalentsTable: React.FC<PrintableEquivalentsTableProps> = ({
  tableState,
  patientName = '',
  patientGoal = '',
  className = '',
}) => {
  const grandTotal = calculateGrandTotalEquivalents(tableState);

  // Show all 17 SMAE groups even if they have 0 values, preserving full table structure
  const displayGroups = SMAE_GROUPS;

  // Calculate total kcal sum for the groups displayed
  const totalKcal = SMAE_GROUPS.reduce((acc, g) => {
    const rowEq = calculateRowTotal(g.id, tableState);
    return acc + rowEq * g.kcal;
  }, 0);

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 print:border-slate-300 shadow-xs overflow-hidden mb-6 print:mb-5 print-break-inside-avoid ${className}`}
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
              <h3 className="text-sm sm:text-base print:text-sm font-extrabold font-heading tracking-tight uppercase flex items-center gap-2">
                <span>Cuadro de Distribución de Equivalentes</span>
                <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-emerald-900/70 print:bg-slate-800 text-emerald-200 print:text-slate-300 border border-emerald-600/40 print:border-slate-700">
                  SMAE 5ª Edición
                </span>
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

        {/* Nombre completo del paciente ajustado al cuadro de equivalencias */}
        <div className="mt-2.5 pt-2 border-t border-emerald-600/50 print:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs print:text-2xs">
          <div className="flex items-center gap-2">
            <span className="text-2xs print:text-3xs uppercase tracking-wider font-bold text-emerald-200 print:text-slate-400">
              Paciente:
            </span>
            <span className="font-extrabold text-white print:text-white text-xs sm:text-sm print:text-xs">
              {patientName && patientName.trim().length > 0 ? patientName.trim() : 'Plan Nutricional Personalizado'}
            </span>
            {patientGoal && (
              <span className="text-2xs text-emerald-200/90 print:text-slate-300 hidden sm:inline print:inline">
                • <strong className="font-semibold text-emerald-100 print:text-slate-200">Objetivo:</strong> {patientGoal}
              </span>
            )}
          </div>
          <div className="text-2xs print:text-3xs text-emerald-200/90 print:text-slate-300">
            <span>Fecha: {new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

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

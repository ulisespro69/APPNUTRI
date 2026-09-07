import React from 'react';
import { SMAE_GROUPS, MEAL_COLUMNS, TableGridState } from '../data/smaeData';
import { MealKey } from '../types';
import { calculateRowTotal, calculateColumnTotal, calculateGrandTotalEquivalents } from '../utils/nutritionCalculations';
import { Plus, Minus, Hash, UtensilsCrossed, Sunrise, Apple, Utensils, Coffee, Moon } from 'lucide-react';

interface SmaeTableProps {
  tableState: TableGridState;
  onChangeCell: (groupId: string, mealKey: MealKey, value: number) => void;
  patientName?: string;
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

export const SmaeTable: React.FC<SmaeTableProps> = ({ tableState, onChangeCell, patientName }) => {
  const handleInputChange = (groupId: string, mealKey: MealKey, rawValue: string) => {
    if (rawValue === '') {
      onChangeCell(groupId, mealKey, 0);
      return;
    }
    const num = parseFloat(rawValue);
    if (!isNaN(num) && num >= 0) {
      onChangeCell(groupId, mealKey, num);
    }
  };

  const handleStep = (groupId: string, mealKey: MealKey, delta: number) => {
    const current = Number(tableState[groupId]?.[mealKey]) || 0;
    const next = Math.max(0, Math.round((current + delta) * 2) / 2); // Steps of 0.5
    onChangeCell(groupId, mealKey, next);
  };

  const grandTotal = calculateGrandTotalEquivalents(tableState);

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
              Distribución de equivalentes SMAE por comida (pasos de 0.5)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {patientName && patientName.trim().length > 0 && (
            <div className="bg-emerald-950/60 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-emerald-500/30 shadow-xs flex items-center gap-1.5 text-xs text-white">
              <span className="text-emerald-300 font-bold uppercase text-2xs">Paciente:</span>
              <span className="font-bold text-white max-w-[200px] truncate">{patientName.trim()}</span>
            </div>
          )}
          <div className="flex items-center gap-2 bg-emerald-950/50 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-emerald-500/30 shadow-xs">
            <span className="text-xs text-emerald-200/90 font-medium">Total equivalentes día:</span>
            <span className="text-base font-black text-amber-300 font-heading tabular-nums">
              {grandTotal} <span className="text-xs font-semibold text-emerald-200">eq</span>
            </span>
          </div>
        </div>
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
                    <Hash className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Grupo de Alimento</span>
                  </div>
                  <span className="text-3xs font-semibold text-slate-400 normal-case tracking-normal">SMAE 5ª Ed.</span>
                </div>
              </th>

              {/* 5 Meal Columns */}
              {MEAL_COLUMNS.map((col) => {
                const colTotal = calculateColumnTotal(col.key, tableState);
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
                <div className="text-3xs font-semibold text-emerald-700 uppercase mt-0.5">Σ Fila</div>
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

            {/* Row 18: TOTAL POR COMIDA (Column Sums) */}
            <tr className="bg-emerald-800 text-white font-extrabold border-t-2 border-emerald-900">
              {/* Columna A: Label */}
              <td className="py-3.5 px-4 sticky left-0 bg-emerald-800 z-10 border-r border-emerald-700 font-heading text-xs uppercase tracking-wider shadow-xs">
                <span className="font-extrabold text-white">TOTAL POR COMIDA</span>
              </td>

              {/* Meal Column Sums */}
              {MEAL_COLUMNS.map((col) => {
                const colTotal = calculateColumnTotal(col.key, tableState);
                return (
                  <td key={col.key} className="py-3.5 px-2 text-center border-r border-emerald-700">
                    <span className="text-sm font-heading font-black tracking-tight text-white inline-block bg-emerald-900/80 px-2.5 py-0.5 rounded-lg border border-emerald-600/50 tabular-nums">
                      {colTotal}
                    </span>
                  </td>
                );
              })}

              {/* Grand Total */}
              <td className="py-3.5 px-3 text-center bg-emerald-900/90 text-amber-300">
                <div className="text-base font-heading font-black tracking-tight flex items-center justify-center gap-1 tabular-nums">
                  <span>{grandTotal}</span>
                  <span className="text-2xs text-emerald-200 font-semibold uppercase">eq</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};


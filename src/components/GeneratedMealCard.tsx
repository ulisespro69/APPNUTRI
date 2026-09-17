import React from 'react';
import { MealMenu, MenuOption, MealOptionLetter } from '../types';
import { Utensils, RefreshCw, ChefHat, Info, Check, Plus, Lock, Undo2, CheckCircle2 } from 'lucide-react';
import { normalizeOptionSelection } from '../utils/nutritionCalculations';

interface GeneratedMealCardProps {
  meal: MealMenu;
  mealIndex: number;
  onRegenerateMeal?: (mealName: string, forceAll?: boolean) => void;
  onRegenerateOption?: (mealName: string, letter: MealOptionLetter) => void;
  isRegenerating: boolean;
  regeneratingLetter?: MealOptionLetter | null;
  selectedOptions?: MealOptionLetter[] | string;
  onToggleOption: (letter: MealOptionLetter) => void;
  onSetMealOptions?: (letters: MealOptionLetter[]) => void;
  optionHistoryCounts?: { A: number; B: number; C: number };
  onRestoreOption?: (mealName: string, letter: MealOptionLetter) => void;
}

export const GeneratedMealCard: React.FC<GeneratedMealCardProps> = ({
  meal,
  mealIndex,
  onRegenerateMeal,
  onRegenerateOption,
  isRegenerating,
  regeneratingLetter,
  selectedOptions,
  onToggleOption,
  onSetMealOptions,
  optionHistoryCounts,
  onRestoreOption,
}) => {
  const activeLetters = normalizeOptionSelection(selectedOptions);

  const icons = ['🍳', '🍏', '🍲', '☕', '🥗'];
  const icon = icons[mealIndex % icons.length] || '🍽️';

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

  const renderOptionBox = (option?: MenuOption, letter: MealOptionLetter = 'A') => {
    if (!option) return null;

    const isSelected = activeLetters.includes(letter);
    const isOptionA = letter === 'A';
    const isOptionB = letter === 'B';
    const isOptionC = letter === 'C';
    const historyCount = optionHistoryCounts?.[letter] || 0;

    let accentBorder = 'border-slate-200';
    let badgeBg = 'bg-emerald-700 text-white';

    if (isOptionA) {
      accentBorder = isSelected
        ? 'border-emerald-600 ring-2 ring-emerald-500/20'
        : 'border-slate-200 opacity-65';
      badgeBg = 'bg-emerald-700 text-white';
    } else if (isOptionB) {
      accentBorder = isSelected
        ? 'border-teal-600 ring-2 ring-teal-500/20'
        : 'border-slate-200 opacity-65';
      badgeBg = 'bg-teal-700 text-white';
    } else if (isOptionC) {
      accentBorder = isSelected
        ? 'border-sky-600 ring-2 ring-sky-500/20'
        : 'border-slate-200 opacity-65';
      badgeBg = 'bg-sky-700 text-white';
    }

    return (
      <div
        className={`flex-1 bg-white rounded-xl border ${accentBorder} p-4 sm:p-5 print:p-2.5 flex flex-col justify-between shadow-xs transition-all relative overflow-hidden h-full ${
          !isSelected ? 'bg-slate-50/70 border-dashed' : ''
        }`}
      >
        {/* Option Header */}
        <div>
          {/* Top row: Option letter badge + compact action buttons aligned with table style */}
          <div className="flex items-center justify-between gap-2 mb-2 print:mb-1 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-md text-xs font-black tracking-wide uppercase font-heading ${badgeBg}`}>
              Opción {letter}
            </span>

            {/* Action buttons for this specific option (matching table control proportions) */}
            <div className="flex items-center gap-1.5 shrink-0 no-print">
              {/* Regresar a la opción anterior para esta opción */}
              {onRestoreOption && (
                <button
                  type="button"
                  id={`btn-undo-${mealIndex}-${letter}`}
                  onClick={() => onRestoreOption(meal.mealName, letter)}
                  disabled={isRegenerating || historyCount === 0}
                  className={`h-7 px-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                    historyCount > 0
                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs active:scale-95'
                      : 'bg-slate-100 text-slate-400 border border-slate-200/80 cursor-not-allowed opacity-40'
                  }`}
                  title={
                    historyCount > 0
                      ? `Regresar a la receta anterior de la Opción ${letter} (${historyCount} previa${historyCount > 1 ? 's' : ''})`
                      : `Aún no hay opción anterior para la Opción ${letter}`
                  }
                >
                  <Undo2 className="w-3.5 h-3.5 text-current shrink-0" />
                  <span>Regresar</span>
                  {historyCount > 0 && (
                    <span className="px-1 py-0.2 text-[10px] font-black bg-white/30 text-white rounded-full leading-none">
                      {historyCount}
                    </span>
                  )}
                </button>
              )}

              {/* Cambiar receta de esta opción */}
              {onRegenerateOption && (
                <button
                  type="button"
                  id={`btn-change-${mealIndex}-${letter}`}
                  onClick={() => onRegenerateOption(meal.mealName, letter)}
                  disabled={isRegenerating || regeneratingLetter === letter}
                  className="h-7 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs hover:border-slate-300 disabled:opacity-40"
                  title={`Generar una nueva receta para la Opción ${letter}`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 shrink-0 ${regeneratingLetter === letter ? 'animate-spin' : ''}`} />
                  <span>Cambiar</span>
                </button>
              )}

              {/* Mantener/Seleccionar en el menú para imprimir */}
              <button
                type="button"
                id={`btn-toggle-print-${mealIndex}-${letter}`}
                onClick={() => onToggleOption(letter)}
                className={`h-7 px-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? isOptionA
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                      : isOptionB
                      ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-2xs'
                      : 'bg-sky-600 hover:bg-sky-700 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300/80'
                }`}
                title={
                  isSelected
                    ? `Opción ${letter} seleccionada para el menú impreso (haz clic para excluir)`
                    : `Haz clic para seleccionar y mantener la Opción ${letter} para el menú impreso`
                }
              >
                {isSelected ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white shrink-0" />
                    <span>Para Imprimir</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Incluir {letter}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Option title with full width prominence */}
          <h4 className="text-base sm:text-lg print:text-base font-extrabold text-slate-900 font-heading leading-snug mb-2">
            {option.title}
          </h4>

          {isSelected && (
            <div className="mb-2 px-2.5 py-0.5 bg-emerald-50/90 text-emerald-900 text-3xs font-bold rounded-md inline-flex items-center gap-1 border border-emerald-200/80 no-print">
              <Lock className="w-2.5 h-2.5 text-emerald-700" />
              <span>Opción de menú seleccionada para imprimir (mantenida)</span>
            </div>
          )}

          {!isSelected && (
            <div className="mb-2.5 px-2.5 py-1 bg-slate-100/90 text-slate-500 text-3xs font-semibold rounded-md flex items-center gap-1 no-print">
              <span>(Excluida del PDF, Word e Impresión)</span>
            </div>
          )}

          {option.description && (
            <p className="text-xs sm:text-sm print:text-xs text-slate-600 mb-3 print:mb-1.5 italic">
              "{option.description}"
            </p>
          )}

          {/* Ingredients list with exact SMAE portions */}
          <div className="mb-4 print:mb-2">
            <div className="text-xs sm:text-sm print:text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 print:mb-1 flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-emerald-600 print:w-3 print:h-3" />
              <span className="print:hidden">Ingredientes y Porciones SMAE 5ta Ed.</span>
              <span className="hidden print:inline font-bold text-slate-800">Ingredientes y Porciones:</span>
            </div>
            <ul className="space-y-1.5 print:space-y-0.5">
              {option.ingredients?.map((ing, iIdx) => (
                <li
                  key={iIdx}
                  className="flex items-start justify-between text-sm sm:text-base print:text-sm py-1 px-2 rounded-md bg-slate-50 border border-slate-100 text-slate-800 gap-2 print:bg-white print:border-none print:px-0 print:py-0.5"
                >
                  <div className="flex items-center gap-2 print:gap-1.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 print:bg-slate-700" />
                    <span className="leading-snug">
                      <strong className="text-slate-950 font-black text-sm sm:text-base print:text-sm">{ing.exactPortion}</strong>{' '}
                      <span className="text-slate-900 font-semibold text-sm sm:text-base print:text-sm">{ing.foodName}</span>
                      <span className="hidden print:inline text-[9px] font-semibold text-slate-500 ml-1">({ing.equivalentsCount} eq {ing.smaeGroup})</span>
                    </span>
                  </div>
                  <span className="text-2xs sm:text-xs font-bold px-2 py-0.5 rounded-sm bg-emerald-100/80 text-emerald-900 border border-emerald-200 shrink-0 print:hidden">
                    {ing.equivalentsCount} {ing.equivalentsCount === 1 ? 'eq' : 'eqs'} {ing.smaeGroup}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Preparation & Tips */}
        <div className="pt-3 print:pt-1.5 border-t border-slate-100 print:border-slate-300 mt-2 print:mt-1 space-y-2 print:space-y-1">
          {option.preparation && (
            <div className="text-xs sm:text-sm print:text-xs text-slate-800">
              <div className="font-bold text-slate-800 flex items-center gap-1 text-xs uppercase tracking-wider mb-1 print:mb-0.5 text-emerald-800 print:text-slate-900">
                <ChefHat className="w-3.5 h-3.5 text-emerald-600 print:hidden" />
                <span>Modo de Preparación:</span>
              </div>
              <p className="text-slate-700 print:text-slate-900 leading-relaxed pl-1 font-medium">{option.preparation}</p>
            </div>
          )}

          {option.nutritionistTip && (
            <div className="p-2 print:p-1.5 rounded-lg bg-amber-50 print:bg-slate-50 border border-amber-200 print:border-slate-300 text-xs print:text-2xs text-amber-900 print:text-slate-800 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5 print:hidden" />
              <div>
                <span className="font-bold">Tip de la Nutrióloga: </span>
                {option.nutritionistTip}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const allAvailableLetters: MealOptionLetter[] = meal.optionC
    ? ['A', 'B', 'C']
    : ['A', 'B'];

  const selectedCount = activeLetters.filter((l) => allAvailableLetters.includes(l)).length;

  return (
    <div
      className={`bg-slate-50/70 rounded-2xl border border-slate-200 p-4 sm:p-6 mb-6 print:mb-3 print:p-3.5 print:border-slate-300 shadow-xs transition-all hover:border-emerald-200 print-break-inside-avoid ${
        !hasMealValues ? 'print:hidden' : ''
      }`}
      id={`meal-card-${mealIndex}`}
    >
      {/* Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 print:mb-2 pb-3 print:pb-2 border-b border-slate-200 print:border-slate-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 print:w-8 print:h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center text-xl print:text-base shadow-xs">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg sm:text-xl print:text-xl font-black text-slate-900 font-heading">
                {meal.mealName}
              </h3>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200 print:hidden">
                {selectedCount === allAvailableLetters.length
                  ? `Todas las opciones seleccionadas (${selectedCount})`
                  : selectedCount === 1
                  ? `1 Opción para imprimir (${activeLetters.join(', ')})`
                  : `${selectedCount} Opciones seleccionadas (${activeLetters.join(' + ')})`}
              </span>
              <span
                className="text-3xs sm:text-2xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300 print:hidden flex items-center gap-1 shadow-2xs"
                title="Gramos, grupos y equivalencias rectificados minuciosamente según el libro oficial SMAE 5ta Edición"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                SMAE 5ª Ed. Rectificado
              </span>
              {meal.isFallback && (
                <span
                  className="text-3xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 print:hidden flex items-center gap-1"
                  title="Generado con cuadratura SMAE estandarizada"
                >
                  Motor SMAE
                </span>
              )}
            </div>
            {/* Summary of assigned equivalents */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1 print:hidden">
              {hasEquivalents ? (
                meal.totalEquivalentsSummary
                  .filter((eq) => (Number(eq.quantity) || 0) > 0)
                  .map((eq, sIdx) => (
                    <span
                      key={sIdx}
                      className="text-3xs font-semibold px-2 py-0.5 bg-white text-slate-700 rounded-md border border-slate-200 shadow-2xs"
                    >
                      {eq.quantity} eq {eq.group}
                    </span>
                  ))
              ) : (
                <span className="text-2xs text-slate-400 italic">Sin equivalentes asignados</span>
              )}
            </div>
          </div>
        </div>

        {/* Right side header actions */}
        <div className="flex items-center gap-2 print:hidden flex-wrap">
          {onRegenerateMeal && (
            <button
              type="button"
              id={`btn-regen-meal-${mealIndex}`}
              onClick={() => onRegenerateMeal(meal.mealName, true)}
              disabled={isRegenerating}
              className="h-8 px-3 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300/80 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
              title="Regenerar las 3 opciones con nuevas variantes"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isRegenerating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Cambiar las 3 Opciones</span>
              <span className="sm:hidden">Cambiar 3</span>
            </button>
          )}
        </div>
      </div>

      {/* 3 Options (Grid layout with all options maintained on screen) */}
      <div
        className={`grid gap-4 print:gap-2.5 ${
          meal.optionC
            ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
            : 'grid-cols-1 lg:grid-cols-2'
        } ${
          selectedCount === 1
            ? 'print:grid-cols-1'
            : selectedCount === 2
            ? 'print:grid-cols-2'
            : 'print:grid-cols-3'
        }`}
      >
        {/* Option A Box */}
        <div
          className={`${
            !hasIngredientsA || !activeLetters.includes('A')
              ? 'print:hidden'
              : activeLetters.length === 1
              ? 'print:col-span-full'
              : ''
          }`}
        >
          {renderOptionBox(meal.optionA, 'A')}
        </div>

        {/* Option B Box */}
        <div
          className={`${
            !hasIngredientsB || !activeLetters.includes('B')
              ? 'print:hidden'
              : activeLetters.length === 1
              ? 'print:col-span-full'
              : ''
          }`}
        >
          {renderOptionBox(meal.optionB, 'B')}
        </div>

        {/* Option C Box */}
        {meal.optionC && (
          <div
            className={`${
              !hasIngredientsC || !activeLetters.includes('C')
                ? 'print:hidden'
                : activeLetters.length === 1
                ? 'print:col-span-full'
                : ''
            }`}
          >
            {renderOptionBox(meal.optionC, 'C')}
          </div>
        )}
      </div>
    </div>
  );
};

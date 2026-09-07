import React, { useState } from 'react';
import { MacroNutrientSummary, PatientInfo } from '../types';
import { Flame, PieChart, User, FileEdit, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { PRESETS, TableGridState } from '../data/smaeData';

interface NutritionSummaryBarProps {
  macros: MacroNutrientSummary;
  patientInfo: PatientInfo;
  onPatientInfoChange: (info: PatientInfo) => void;
  onSelectPreset: (presetData: TableGridState) => void;
}

export const NutritionSummaryBar: React.FC<NutritionSummaryBarProps> = ({
  macros,
  patientInfo,
  onPatientInfoChange,
  onSelectPreset,
}) => {
  const [showPatientDetails, setShowPatientDetails] = useState(true);

  return (
    <div className="bg-white rounded-2xl border border-emerald-100/80 shadow-xs p-4 sm:p-5 mb-6 transition-all no-print">
      {/* Top row: Macro metrics & presets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 items-center">
        {/* Calories Card */}
        <div className="col-span-2 sm:col-span-2 lg:col-span-2 bg-gradient-to-br from-emerald-800 to-teal-900 rounded-xl p-3.5 text-white shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-2xs font-bold uppercase tracking-wider text-emerald-200 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              Aporte Calórico Teórico
            </span>
            <span className="text-2xs font-semibold px-2 py-0.5 bg-emerald-700/60 rounded-full text-emerald-100 border border-emerald-600/40">
              {macros.totalEquivalents} eq totales
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-heading tracking-tight">
              {macros.totalKcal.toLocaleString('es-MX')}
            </span>
            <span className="text-xs font-semibold text-emerald-200">kcal / día</span>
          </div>
          {/* Visual Macro Bar */}
          <div className="mt-2.5 h-2 w-full bg-emerald-950/40 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${macros.proteinKcalPercent}%` }}
              className="bg-rose-400 h-full transition-all duration-300"
              title={`Proteína: ${macros.proteinKcalPercent}%`}
            />
            <div
              style={{ width: `${macros.lipidsKcalPercent}%` }}
              className="bg-amber-400 h-full transition-all duration-300"
              title={`Lípidos: ${macros.lipidsKcalPercent}%`}
            />
            <div
              style={{ width: `${macros.carbsKcalPercent}%` }}
              className="bg-emerald-400 h-full transition-all duration-300"
              title={`Carbohidratos: ${macros.carbsKcalPercent}%`}
            />
          </div>
        </div>

        {/* Protein */}
        <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
          <div className="flex items-center justify-between text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              Proteínas
            </span>
            <span className="text-rose-600 font-bold">{macros.proteinKcalPercent}%</span>
          </div>
          <div className="text-xl font-bold text-slate-900 font-heading">
            {macros.totalProteinGrams} <span className="text-xs font-normal text-slate-500">g</span>
          </div>
          <div className="text-2xs text-slate-400 mt-0.5">
            {Math.round(macros.totalProteinGrams * 4)} kcal
          </div>
        </div>

        {/* Lipids */}
        <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
          <div className="flex items-center justify-between text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              Lípidos
            </span>
            <span className="text-amber-600 font-bold">{macros.lipidsKcalPercent}%</span>
          </div>
          <div className="text-xl font-bold text-slate-900 font-heading">
            {macros.totalLipidsGrams} <span className="text-xs font-normal text-slate-500">g</span>
          </div>
          <div className="text-2xs text-slate-400 mt-0.5">
            {Math.round(macros.totalLipidsGrams * 9)} kcal
          </div>
        </div>

        {/* Carbs */}
        <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
          <div className="flex items-center justify-between text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1 text-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Hidratos de carbono
            </span>
            <span className="text-emerald-600 font-bold">{macros.carbsKcalPercent}%</span>
          </div>
          <div className="text-xl font-bold text-slate-900 font-heading">
            {macros.totalCarbsGrams} <span className="text-xs font-normal text-slate-500">g</span>
          </div>
          <div className="text-2xs text-slate-400 mt-0.5">
            {Math.round(macros.totalCarbsGrams * 4)} kcal
          </div>
        </div>

        {/* Quick Presets on Mobile & Small screens */}
        <div className="col-span-2 sm:col-span-1 lg:col-span-1 flex flex-col justify-center">
          <button
            id="btn-toggle-patient-details"
            type="button"
            onClick={() => setShowPatientDetails(!showPatientDetails)}
            className="w-full flex items-center justify-between gap-1.5 px-3 py-2.5 text-xs font-semibold text-right text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all"
          >
            <span className="flex items-center gap-1.5 truncate">
              <User className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="truncate">{patientInfo.name ? patientInfo.name : 'Datos del Paciente'}</span>
            </span>
            {showPatientDetails ? (
              <ChevronUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            )}
          </button>
        </div>
      </div>

      {/* Expandable Patient Info / Prescription Settings */}
      {showPatientDetails && (
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-500 mb-1">
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

          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-500 mb-1">
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

          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Notas generales (Alergias, Presupuesto, Estilo, etc.)
            </label>
            <input
              id="input-patient-notes"
              type="text"
              placeholder="Alergias, aversiones o indicaciones especiales"
              value={patientInfo.notes}
              onChange={(e) => onPatientInfoChange({ ...patientInfo, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>
        </div>
      )}

      {/* Specific Meal Preferences (Likes/Dislikes) */}
      {showPatientDetails && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            Preferencias por Tiempo de Comida
          </h4>
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

              return (
                <div key={mealKey} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                  <div className="sm:col-span-3 text-xs font-semibold text-slate-700">
                    {labels[mealKey]}
                  </div>
                  <div className="sm:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    <input
                      type="text"
                      placeholder="Alimentos preferidos (Ej. Huevo, Avena...)"
                      value={currentLikes}
                      onChange={(e) => handlePrefChange('likes', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
                    />
                    <input
                      type="text"
                      placeholder="Alimentos a evitar (Ej. Papaya, Lácteos...)"
                      value={currentDislikes}
                      onChange={(e) => handlePrefChange('dislikes', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-rose-400 transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

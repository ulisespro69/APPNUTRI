import React, { useState } from 'react';
import { MacroNutrientSummary, PatientInfo, SkinfoldMeasurements, GirthMeasurements, BreadthMeasurements } from '../types';
import { Flame, PieChart, User, FileEdit, Sparkles, ChevronDown, ChevronUp, Ruler, Weight, Calendar, Activity, Scale, Percent, Layers, EyeOff } from 'lucide-react';
import { PRESETS, TableGridState } from '../data/smaeData';
import { calculateBmiInfo, calculateSkinfoldSums } from '../utils/nutritionCalculations';

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
  const [anthropoTab, setAnthropoTab] = useState<'all' | 'skinfolds' | 'girths' | 'breadths'>('all');

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

  const skinfoldsCount = Object.values(patientInfo.skinfolds || {}).filter((v) => typeof v === 'string' && v.trim() !== '').length;
  const girthsCount = Object.values(patientInfo.girths || {}).filter((v) => typeof v === 'string' && v.trim() !== '').length;
  const breadthsCount = Object.values(patientInfo.breadths || {}).filter((v) => typeof v === 'string' && v.trim() !== '').length;

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
  ].map((v) => parseFloat(v || '')).filter((n) => !isNaN(n) && n > 0);

  const skinfoldSum = skinfoldValues.length > 0
    ? skinfoldValues.reduce((acc, curr) => acc + curr, 0).toFixed(1)
    : null;

  const skinfoldSums = calculateSkinfoldSums(patientInfo.skinfolds);

  const waistVal = parseFloat(patientInfo.girths?.cinturaMinima || '');
  const hipVal = parseFloat(patientInfo.girths?.caderasMaximo || '');
  const whr = !isNaN(waistVal) && !isNaN(hipVal) && hipVal > 0
    ? (waistVal / hipVal).toFixed(2)
    : null;

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
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
          {/* Fila 1: Identificación y Objetivo */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-7">
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

            <div className="sm:col-span-5">
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
          </div>

          {/* Cuadro Unificado: Valoración Antropométrica y Composición Corporal */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-3 sm:p-3.5 space-y-3 shadow-2xs">
            <div className="flex items-center gap-1.5 border-b border-slate-200/70 pb-2">
              <Activity className="w-3.5 h-3.5 text-emerald-700" />
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-800">
                Valoración Antropométrica y Composición Corporal
              </span>
            </div>

            {/* Fila 1 del cuadro: Sexo, Edad, Estatura, Masa Corporal, IMC */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-12 gap-3 items-end">
              {/* Sexo: Selección Hombre o Mujer */}
              <div className="col-span-1 sm:col-span-1 lg:col-span-2">
                <label className="block text-2xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
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
                <label className="block text-2xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
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
                <label className="block text-2xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
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
                <span className="text-2xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-emerald-600" />
                  IMC Calculado:
                </span>
                {(() => {
                  const bmi = calculateBmiInfo(patientInfo.height, patientInfo.weight);
                  if (!bmi) {
                    return <span className="text-2xs text-slate-400 italic">Requiere talla y peso</span>;
                  }
                  return (
                    <span className={`text-2xs font-bold px-2 py-0.5 rounded-md border ${bmi.colorClass}`}>
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
                        Pliegues Cutáneos
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`text-3xs font-bold px-2 py-0.5 rounded border transition-colors ${
                            skinfoldSums.sum3
                              ? 'text-emerald-900 bg-emerald-100/90 border-emerald-300'
                              : 'text-slate-500 bg-slate-50 border-slate-200'
                          }`}
                          title="Subescapular + Supraespinal + Abdominal"
                        >
                          Σ3: <strong className="font-extrabold">{skinfoldSums.sum3 || '—'}</strong>
                        </span>
                        <span
                          className={`text-3xs font-bold px-2 py-0.5 rounded border transition-colors ${
                            skinfoldSums.sum6
                              ? 'text-teal-900 bg-teal-100/90 border-teal-300'
                              : 'text-slate-500 bg-slate-50 border-slate-200'
                          }`}
                          title="Tríceps + Subescapular + Supraespinal + Abdominal + Muslo Frontal + Pantorrilla Medial"
                        >
                          Σ6: <strong className="font-extrabold">{skinfoldSums.sum6 || '—'}</strong>
                        </span>
                        {skinfoldSum && (
                          <span className="text-3xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            Σ Total: {skinfoldSum} mm
                          </span>
                        )}
                      </div>
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
                        <span className="text-3xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
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
                        <span className="w-2 h-2 rounded-full bg-sky-600"></span>
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

            {/* Fila: Sumatoria de Pliegues Cutáneos */}
            <div className="border-t border-slate-200/80 pt-2.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="text-3xs font-bold uppercase tracking-wider text-slate-700">
                    Sumatoria de Pliegues Cutáneos
                  </span>
                  <span className="text-3xs font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Se muestra en PDF y Word
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

            {/* Fila 3 del cuadro: Composición Corporal (Modelo 4 Componentes) */}
            <div className="border-t border-slate-200/80 pt-2.5 space-y-2">
              <div className="flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-emerald-700" />
                <span className="text-3xs font-bold uppercase tracking-wider text-slate-700">
                  Composición Corporal (Modelo 4 Componentes)
                </span>
                <span className="text-3xs font-semibold px-1.5 py-0.2 rounded bg-emerald-100/80 text-emerald-800 border border-emerald-200">
                  Opcional
                </span>
              </div>

              {/* Grid 4 Componentes: Grasa, Músculo, Hueso, Residual */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {/* 1. Masa Grasa */}
                <div className="bg-white border border-amber-200/80 rounded-lg p-2.5 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-2xs font-extrabold text-amber-900 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Masa Grasa
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="input-fat-percent" className="block text-3xs font-bold text-slate-500 uppercase mb-0.5">
                        % Grasa
                      </label>
                      <div className="relative">
                        <input
                          id="input-fat-percent"
                          type="text"
                          inputMode="decimal"
                          placeholder="Ej. 21.5"
                          value={patientInfo.fatPercent || ''}
                          onChange={(e) => onPatientInfoChange({ ...patientInfo, fatPercent: e.target.value })}
                          className="w-full px-2 py-1 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-amber-500 focus:bg-white pr-6 font-medium"
                        />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-3xs font-bold text-slate-400 pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="input-fat-kg" className="block text-3xs font-bold text-slate-500 uppercase mb-0.5">
                        Kg Grasa
                      </label>
                      <div className="relative">
                        <input
                          id="input-fat-kg"
                          type="text"
                          inputMode="decimal"
                          placeholder="Ej. 14.8"
                          value={patientInfo.fatKg || ''}
                          onChange={(e) => onPatientInfoChange({ ...patientInfo, fatKg: e.target.value })}
                          className="w-full px-2 py-1 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-amber-500 focus:bg-white pr-7 font-medium"
                        />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-3xs font-bold text-slate-400 pointer-events-none">
                          kg
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Masa Muscular */}
                <div className="bg-white border border-rose-200/80 rounded-lg p-2.5 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-2xs font-extrabold text-rose-900 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      Masa Músculo
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="input-muscle-percent" className="block text-3xs font-bold text-slate-500 uppercase mb-0.5">
                        % Músculo
                      </label>
                      <div className="relative">
                        <input
                          id="input-muscle-percent"
                          type="text"
                          inputMode="decimal"
                          placeholder="Ej. 42.0"
                          value={patientInfo.musclePercent || ''}
                          onChange={(e) => onPatientInfoChange({ ...patientInfo, musclePercent: e.target.value })}
                          className="w-full px-2 py-1 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-rose-500 focus:bg-white pr-6 font-medium"
                        />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-3xs font-bold text-slate-400 pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="input-muscle-kg" className="block text-3xs font-bold text-slate-500 uppercase mb-0.5">
                        Kg Músculo
                      </label>
                      <div className="relative">
                        <input
                          id="input-muscle-kg"
                          type="text"
                          inputMode="decimal"
                          placeholder="Ej. 28.7"
                          value={patientInfo.muscleKg || ''}
                          onChange={(e) => onPatientInfoChange({ ...patientInfo, muscleKg: e.target.value })}
                          className="w-full px-2 py-1 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-rose-500 focus:bg-white pr-7 font-medium"
                        />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-3xs font-bold text-slate-400 pointer-events-none">
                          kg
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Masa Ósea */}
                <div className="bg-white border border-sky-200/80 rounded-lg p-2.5 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-2xs font-extrabold text-sky-900 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                      Masa Ósea (Hueso)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="input-bone-percent" className="block text-3xs font-bold text-slate-500 uppercase mb-0.5">
                        % Hueso
                      </label>
                      <div className="relative">
                        <input
                          id="input-bone-percent"
                          type="text"
                          inputMode="decimal"
                          placeholder="Ej. 14.0"
                          value={patientInfo.bonePercent || ''}
                          onChange={(e) => onPatientInfoChange({ ...patientInfo, bonePercent: e.target.value })}
                          className="w-full px-2 py-1 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-sky-500 focus:bg-white pr-6 font-medium"
                        />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-3xs font-bold text-slate-400 pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="input-bone-kg" className="block text-3xs font-bold text-slate-500 uppercase mb-0.5">
                        Kg Hueso
                      </label>
                      <div className="relative">
                        <input
                          id="input-bone-kg"
                          type="text"
                          inputMode="decimal"
                          placeholder="Ej. 9.6"
                          value={patientInfo.boneKg || ''}
                          onChange={(e) => onPatientInfoChange({ ...patientInfo, boneKg: e.target.value })}
                          className="w-full px-2 py-1 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-sky-500 focus:bg-white pr-7 font-medium"
                        />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-3xs font-bold text-slate-400 pointer-events-none">
                          kg
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Masa Residual */}
                <div className="bg-white border border-purple-200/80 rounded-lg p-2.5 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-2xs font-extrabold text-purple-900 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      Masa Residual
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="input-residual-percent" className="block text-3xs font-bold text-slate-500 uppercase mb-0.5">
                        % Residual
                      </label>
                      <div className="relative">
                        <input
                          id="input-residual-percent"
                          type="text"
                          inputMode="decimal"
                          placeholder="Ej. 22.5"
                          value={patientInfo.residualPercent || ''}
                          onChange={(e) => onPatientInfoChange({ ...patientInfo, residualPercent: e.target.value })}
                          className="w-full px-2 py-1 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-purple-500 focus:bg-white pr-6 font-medium"
                        />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-3xs font-bold text-slate-400 pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="input-residual-kg" className="block text-3xs font-bold text-slate-500 uppercase mb-0.5">
                        Kg Residual
                      </label>
                      <div className="relative">
                        <input
                          id="input-residual-kg"
                          type="text"
                          inputMode="decimal"
                          placeholder="Ej. 15.4"
                          value={patientInfo.residualKg || ''}
                          onChange={(e) => onPatientInfoChange({ ...patientInfo, residualKg: e.target.value })}
                          className="w-full px-2 py-1 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-purple-500 focus:bg-white pr-7 font-medium"
                        />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-3xs font-bold text-slate-400 pointer-events-none">
                          kg
                        </span>
                      </div>
                    </div>
                  </div>
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
              <span>Notas generales (Alergias, Presupuesto, Estilo, etc.)</span>
              <span className="text-3xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded normal-case tracking-normal">
                Solo se imprime en el PDF si contiene texto
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

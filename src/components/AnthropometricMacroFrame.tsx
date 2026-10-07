import React, { useMemo } from 'react';
import { PatientInfo, MacroNutrientSummary } from '../types';
import {
  calculateBmiInfo,
  calculateSkinfoldSums,
  calculateHeathCarterSomatotype,
} from '../utils/nutritionCalculations';
import { generateSomatocartaSvgString } from '../utils/somatocartaGenerator';
import {
  User,
  Calendar,
  Target,
  Activity,
  Scale,
  Crosshair,
  Layers,
  Ruler,
} from 'lucide-react';

interface AnthropometricMacroFrameProps {
  patientInfo: PatientInfo;
  macros: MacroNutrientSummary;
  className?: string;
  showTitle?: boolean;
}

const AnthropometricMacroFrameComponent: React.FC<AnthropometricMacroFrameProps> = ({
  patientInfo,
  macros,
  className = '',
}) => {
  const bmiInfo = useMemo(
    () => calculateBmiInfo(patientInfo.height, patientInfo.weight),
    [patientInfo.height, patientInfo.weight]
  );
  const skinfoldSums = useMemo(
    () => calculateSkinfoldSums(patientInfo.skinfolds),
    [patientInfo.skinfolds]
  );
  const somatotype = useMemo(
    () => calculateHeathCarterSomatotype(patientInfo),
    [patientInfo]
  );

  const heightStr = patientInfo.height != null ? String(patientInfo.height).trim() : '';
  const displayHeight = heightStr
    ? /\d$/.test(heightStr)
      ? parseFloat(heightStr) > 3
        ? `${heightStr} cm`
        : `${heightStr} m`
      : heightStr
    : '—';

  const weightNum = parseFloat(String(patientInfo.weight || '0').replace(',', '.')) || null;
  const gPerKg =
    weightNum && weightNum > 0 && macros.totalProteinGrams > 0
      ? (macros.totalProteinGrams / weightNum).toFixed(2)
      : null;

  const hasComposition = !!(
    patientInfo.fatPercent ||
    patientInfo.fatKg ||
    patientInfo.musclePercent ||
    patientInfo.muscleKg ||
    patientInfo.bonePercent ||
    patientInfo.boneKg ||
    patientInfo.residualPercent ||
    patientInfo.residualKg
  );

  const hasSkinfolds = !!(
    patientInfo.skinfolds?.triceps ||
    patientInfo.skinfolds?.subescapular ||
    patientInfo.skinfolds?.biceps ||
    patientInfo.skinfolds?.pectoral ||
    patientInfo.skinfolds?.axilar ||
    patientInfo.skinfolds?.crestaIliaca ||
    patientInfo.skinfolds?.supraespinal ||
    patientInfo.skinfolds?.abdominal ||
    patientInfo.skinfolds?.musloFrontal ||
    patientInfo.skinfolds?.pantorrillaMedial
  );

  const hasGirths = !!(
    patientInfo.girths?.brazoRelajado ||
    patientInfo.girths?.brazoContraido ||
    patientInfo.girths?.cinturaMinima ||
    patientInfo.girths?.caderasMaximo ||
    patientInfo.girths?.pantorrillaMaximo
  );

  const hasBreadths = !!(
    patientInfo.breadths?.humeral ||
    patientInfo.breadths?.femoral ||
    patientInfo.breadths?.biestiloideo
  );

  // ICC (Índice Cintura/Cadera)
  const cinturaNum = parseFloat(patientInfo.girths?.cinturaMinima || '0');
  const caderaNum = parseFloat(patientInfo.girths?.caderasMaximo || '0');
  const icc = cinturaNum > 0 && caderaNum > 0 ? (cinturaNum / caderaNum).toFixed(2) : null;

  return (
    <div
      className={`bg-white rounded-xl border border-slate-300 print:border-slate-400 shadow-2xs overflow-hidden print-break-inside-avoid ${className}`}
      id="anthropometric-macro-frame"
    >
      {/* 1. Cabecera Principal del Expediente */}
      <div className="bg-slate-900 text-white px-3.5 py-2 print:px-3 print:py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center text-white shrink-0">
            <User className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-3xs uppercase tracking-wider font-bold text-emerald-300">
              Expediente Clínico y Prescripción
            </div>
            <h2 className="text-sm print:text-xs font-extrabold font-heading text-white tracking-tight leading-tight">
              {patientInfo.name && patientInfo.name.trim().length > 0
                ? patientInfo.name.trim()
                : 'Plan Nutricional Personalizado'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-2xs print:text-3xs text-slate-300">
          {patientInfo.goal && (
            <div className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              <Target className="w-3 h-3 text-amber-300 shrink-0" />
              <span>
                <strong className="text-white">Meta:</strong> {patientInfo.goal}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1 text-slate-300">
            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
            <span>
              {patientInfo.date ||
                new Date().toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Cuadrícula Superior: Parámetros Clínicos + Distribución de Macronutrientes */}
      <div className="grid grid-cols-1 md:grid-cols-12 border-b border-slate-200 print:border-slate-300 text-xs print:text-2xs divide-y md:divide-y-0 md:divide-x divide-slate-200 print:divide-slate-300">
        {/* Lado Izquierdo: Parámetros del Paciente (7 columnas) */}
        <div className="md:col-span-6 p-2.5 sm:p-3 bg-slate-50/60 print:bg-transparent">
          <div className="text-3xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
            <Activity className="w-3 h-3 text-emerald-600" />
            Datos Generales y Somatometría
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-2xs print:text-3xs">
            <div className="bg-white print:bg-slate-50 border border-slate-200/80 rounded p-1.5">
              <span className="text-slate-400 block font-medium">Sexo</span>
              <span className="font-bold text-slate-800">{patientInfo.gender || '—'}</span>
            </div>
            <div className="bg-white print:bg-slate-50 border border-slate-200/80 rounded p-1.5">
              <span className="text-slate-400 block font-medium">Edad</span>
              <span className="font-bold text-slate-800">{patientInfo.age ? `${patientInfo.age} años` : '—'}</span>
            </div>
            <div className="bg-white print:bg-slate-50 border border-slate-200/80 rounded p-1.5">
              <span className="text-slate-400 block font-medium">Peso</span>
              <span className="font-bold text-slate-800">{patientInfo.weight || '—'}</span>
            </div>
            <div className="bg-white print:bg-slate-50 border border-slate-200/80 rounded p-1.5">
              <span className="text-slate-400 block font-medium">Estatura</span>
              <span className="font-bold text-slate-800">{displayHeight}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 text-2xs print:text-3xs">
            <div className="bg-white print:bg-slate-50 border border-slate-200/80 rounded p-1.5">
              <span className="text-slate-400 block font-medium">IMC</span>
              <span className="font-bold text-slate-800">
                {bmiInfo ? `${bmiInfo.formatted}` : '—'}
              </span>
              {bmiInfo && (
                <span className="text-3xs text-emerald-700 block font-semibold truncate">
                  {bmiInfo.category}
                </span>
              )}
            </div>
            <div className="bg-white print:bg-slate-50 border border-slate-200/80 rounded p-1.5">
              <span className="text-slate-400 block font-medium">Gasto / Meta</span>
              <span className="font-extrabold text-emerald-900 print:text-slate-900">
                {macros.totalKcal.toLocaleString('es-MX')} kcal/d
              </span>
            </div>
            <div className="bg-white print:bg-slate-50 border border-slate-200/80 rounded p-1.5">
              <span className="text-slate-400 block font-medium">Proteína g/kg</span>
              <span className="font-bold text-rose-700">
                {gPerKg ? `${gPerKg} g/kg/d` : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Lado Derecho: Tabla de Macronutrientes (6 columnas) */}
        <div className="md:col-span-6 p-2.5 sm:p-3 bg-white">
          <div className="text-3xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Scale className="w-3 h-3 text-emerald-600" />
              Prescripción de Macronutrientes
            </span>
            <span className="text-slate-400 font-medium">{macros.totalEquivalents} eq totales</span>
          </div>

          <div className="border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left text-2xs print:text-3xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-1 px-2">Nutriente</th>
                  <th className="py-1 px-1.5 text-center">% Kcal</th>
                  <th className="py-1 px-1.5 text-center">Gramos</th>
                  <th className="py-1 px-2 text-right">Kcal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-1 px-2 font-medium text-slate-700 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                    Proteínas
                  </td>
                  <td className="py-1 px-1.5 text-center font-bold text-rose-700">
                    {macros.proteinKcalPercent}%
                  </td>
                  <td className="py-1 px-1.5 text-center font-bold text-slate-800">
                    {macros.totalProteinGrams} g
                  </td>
                  <td className="py-1 px-2 text-right font-medium text-slate-600">
                    {Math.round(macros.totalProteinGrams * 4)} kcal
                  </td>
                </tr>
                <tr>
                  <td className="py-1 px-2 font-medium text-slate-700 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                    Lípidos
                  </td>
                  <td className="py-1 px-1.5 text-center font-bold text-amber-700">
                    {macros.lipidsKcalPercent}%
                  </td>
                  <td className="py-1 px-1.5 text-center font-bold text-slate-800">
                    {macros.totalLipidsGrams} g
                  </td>
                  <td className="py-1 px-2 text-right font-medium text-slate-600">
                    {Math.round(macros.totalLipidsGrams * 9)} kcal
                  </td>
                </tr>
                <tr>
                  <td className="py-1 px-2 font-medium text-slate-700 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    Carbohidratos (HC)
                  </td>
                  <td className="py-1 px-1.5 text-center font-bold text-emerald-700">
                    {macros.carbsKcalPercent}%
                  </td>
                  <td className="py-1 px-1.5 text-center font-bold text-slate-800">
                    {macros.totalCarbsGrams} g
                  </td>
                  <td className="py-1 px-2 text-right font-medium text-slate-600">
                    {Math.round(macros.totalCarbsGrams * 4)} kcal
                  </td>
                </tr>
                <tr className="bg-emerald-50/70 font-extrabold text-slate-900">
                  <td className="py-1 px-2">Total Teórico</td>
                  <td className="py-1 px-1.5 text-center">100%</td>
                  <td className="py-1 px-1.5 text-center">
                    {(macros.totalProteinGrams + macros.totalLipidsGrams + macros.totalCarbsGrams).toFixed(0)} g
                  </td>
                  <td className="py-1 px-2 text-right text-emerald-950 font-black">
                    {macros.totalKcal.toLocaleString('es-MX')} kcal
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. Fila de Composición Corporal (4 Componentes) */}
      {hasComposition && (
        <div className="p-2.5 sm:p-3 bg-slate-50/40 border-b border-slate-200 print:border-slate-300">
          <div className="text-3xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1">
            <Scale className="w-3 h-3 text-slate-700" />
            Composición Corporal (Fraccionamiento 4 Componentes)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-2xs print:text-3xs">
            <div className="bg-amber-50/60 border border-amber-200/80 rounded p-1.5">
              <span className="text-amber-800 font-bold block">Masa Grasa</span>
              <span className="font-extrabold text-slate-900">
                {patientInfo.fatPercent ? `${patientInfo.fatPercent}%` : '—'}
              </span>
              <span className="text-3xs text-slate-500 block">
                {patientInfo.fatKg ? `${patientInfo.fatKg} kg` : ''}
              </span>
            </div>
            <div className="bg-rose-50/60 border border-rose-200/80 rounded p-1.5">
              <span className="text-rose-800 font-bold block">Masa Muscular</span>
              <span className="font-extrabold text-slate-900">
                {patientInfo.musclePercent ? `${patientInfo.musclePercent}%` : '—'}
              </span>
              <span className="text-3xs text-slate-500 block">
                {patientInfo.muscleKg ? `${patientInfo.muscleKg} kg` : ''}
              </span>
            </div>
            <div className="bg-sky-50/60 border border-sky-200/80 rounded p-1.5">
              <span className="text-sky-800 font-bold block">Masa Ósea</span>
              <span className="font-extrabold text-slate-900">
                {patientInfo.bonePercent ? `${patientInfo.bonePercent}%` : '—'}
              </span>
              <span className="text-3xs text-slate-500 block">
                {patientInfo.boneKg ? `${patientInfo.boneKg} kg` : ''}
              </span>
            </div>
            <div className="bg-purple-50/60 border border-purple-200/80 rounded p-1.5">
              <span className="text-purple-800 font-bold block">Masa Residual</span>
              <span className="font-extrabold text-slate-900">
                {patientInfo.residualPercent ? `${patientInfo.residualPercent}%` : '—'}
              </span>
              <span className="text-3xs text-slate-500 block">
                {patientInfo.residualKg ? `${patientInfo.residualKg} kg` : ''}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Somatotipo (Método Heath-Carter) con Somatocarta, Traducción e Interpretación */}
      {somatotype.hasAnyData && (
        <div className="p-3 bg-white border-t border-slate-200 print:border-slate-300">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-indigo-100">
            <div className="flex items-center gap-1.5 font-extrabold text-indigo-950 text-xs print:text-2xs">
              <Crosshair className="w-4 h-4 text-indigo-700 shrink-0" />
              <span className="uppercase tracking-wider">Somatotipo (Método Heath-Carter)</span>
            </div>
            {somatotype.x !== null && somatotype.y !== null && (
              <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-900 font-extrabold text-3xs">
                Somatocarta: X = {somatotype.x.toFixed(1)} | Y = {somatotype.y.toFixed(1)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Columna Izquierda: Imagen de la Somatocarta */}
            <div className="md:col-span-4 flex justify-center">
              <div
                className="w-44 sm:w-48 aspect-square border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs p-0.5"
                dangerouslySetInnerHTML={{
                  __html: generateSomatocartaSvgString(somatotype, {
                    chartMode: 'classic',
                    showProjections: false,
                  }),
                }}
              />
            </div>

            {/* Columna Derecha: Componentes, Traducción e Interpretación */}
            <div className="md:col-span-8 space-y-2 text-2xs print:text-3xs">
              {/* Componentes */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-amber-50/80 border border-amber-200 rounded p-1.5">
                  <span className="text-amber-900 font-bold block text-3xs">1. Endomorfia</span>
                  <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                    {somatotype.endoFormatted}
                  </span>
                  <span className="text-3xs text-slate-500 block truncate">
                    {somatotype.endoDetails.spc ? `SPC: ${somatotype.endoDetails.spc} mm` : 'Adiposidad relativa'}
                  </span>
                </div>
                <div className="bg-sky-50/80 border border-sky-200 rounded p-1.5">
                  <span className="text-sky-900 font-bold block text-3xs">2. Mesomorfia</span>
                  <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                    {somatotype.mesoFormatted}
                  </span>
                  <span className="text-3xs text-slate-500 block truncate">
                    {somatotype.mesoDetails.bc && somatotype.mesoDetails.pnc ? `BC: ${somatotype.mesoDetails.bc} | PnC: ${somatotype.mesoDetails.pnc}` : 'Robustez muscular'}
                  </span>
                </div>
                <div className="bg-purple-50/80 border border-purple-200 rounded p-1.5">
                  <span className="text-purple-900 font-bold block text-3xs">3. Ectomorfia</span>
                  <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                    {somatotype.ectoFormatted}
                  </span>
                  <span className="text-3xs text-slate-500 block truncate">
                    {somatotype.ectoDetails.hwr ? `HWR: ${somatotype.ectoDetails.hwr}` : 'Linealidad relativa'}
                  </span>
                </div>
              </div>

              {/* Traducción y Clasificación */}
              {somatotype.classification && (
                <div className="bg-indigo-50/70 border border-indigo-200/90 rounded-lg p-2 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-extrabold text-indigo-950 uppercase tracking-wide text-3xs">
                      Traducción y Clasificación:
                    </span>
                    <span className="font-black px-2 py-0.5 rounded bg-indigo-600 text-white text-3xs">
                      {somatotype.classification.name}
                    </span>
                    <span className="font-bold text-slate-600 text-3xs">
                      ({somatotype.endoFormatted} - {somatotype.mesoFormatted} - {somatotype.ectoFormatted})
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">Interpretación: </span>
                    <span className="text-slate-600 leading-relaxed">
                      {somatotype.classification.description}
                    </span>
                  </div>
                  {somatotype.scaleSummaryText && (
                    <div className="pt-1 border-t border-indigo-200/60 text-3xs text-indigo-900 font-medium italic">
                      &ldquo;{somatotype.scaleSummaryText}&rdquo;
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AnthropometricMacroFrame = React.memo(AnthropometricMacroFrameComponent);

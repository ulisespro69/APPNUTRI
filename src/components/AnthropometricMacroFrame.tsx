import React from 'react';
import { PatientInfo, MacroNutrientSummary } from '../types';
import { User, Calendar, Target } from 'lucide-react';

interface AnthropometricMacroFrameProps {
  patientInfo: PatientInfo;
  macros: MacroNutrientSummary;
  className?: string;
  showTitle?: boolean;
}

export const AnthropometricMacroFrame: React.FC<AnthropometricMacroFrameProps> = ({
  patientInfo,
  macros,
  className = '',
  showTitle = true,
}) => {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-300 print:border-slate-400 shadow-xs overflow-hidden print-break-inside-avoid ${className}`}
      id="anthropometric-macro-frame"
    >
      {/* Top Banner: Patient Identity & Date */}
      <div className="bg-slate-900 print:bg-slate-900 text-white px-4 py-3 print:px-3.5 print:py-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-600/80 print:bg-slate-800 flex items-center justify-center text-white shrink-0 border border-emerald-400/30">
            <User className="w-4 h-4" />
          </div>
          <div>
            <div className="text-3xs uppercase tracking-wider font-bold text-emerald-300 print:text-slate-300">
              Expediente y Prescripción Nutricional
            </div>
            <h2 className="text-sm sm:text-base print:text-sm font-extrabold font-heading text-white tracking-tight">
              {patientInfo.name && patientInfo.name.trim().length > 0
                ? patientInfo.name.trim()
                : 'Plan Nutricional Personalizado'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3 text-2xs print:text-3xs text-slate-300">
          {patientInfo.goal && (
            <div className="flex items-center gap-1 bg-slate-800/90 print:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
              <Target className="w-3 h-3 text-amber-300 shrink-0" />
              <span>
                <strong className="text-white">Objetivo:</strong> {patientInfo.goal}
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
    </div>
  );
};


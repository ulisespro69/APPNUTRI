import React from 'react';
import { RefreshCw, FileText, Loader2, Download, BookOpen } from 'lucide-react';
import { PRESETS } from '../data/smaeData';
import { TableGridState } from '../data/smaeData';
import { SmaeFoodSearch } from './SmaeFoodSearch';

interface NavbarProps {
  onSelectPreset?: (presetData: TableGridState) => void;
  onOpenGuide?: () => void;
  onResetTable: () => void;
  hasGeneratedPlan: boolean;
  onExportWord: () => void;
  isExportingWord?: boolean;
  onExportPdf: () => void;
  isExportingPdf?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenGuide,
  onResetTable,
  hasGeneratedPlan,
  onExportWord,
  isExportingWord = false,
  onExportPdf,
  isExportingPdf = false,
}) => {
  return (
    <header className="bg-white border-b border-emerald-100 sticky top-0 z-30 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-emerald-700 via-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-200 overflow-hidden relative">
              <span
                style={{ fontSize: '38px', textAlign: 'center', lineHeight: '41px' }}
                className="font-heading font-black text-[38px] leading-[41px] text-center tracking-normal select-none flex items-center justify-center w-full h-full transform scale-125 sm:scale-130 translate-y-[2px] sm:translate-y-[3px] origin-center"
              >
                ꛎ
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-extrabold text-slate-900 tracking-tight font-heading">
                  |SCIENCE
                </h1>
              </div>
              <p className="text-xs text-slate-500 hidden xl:block font-medium">
                Software para cálculo de equivalentes y diseño automatizado de dietas con IA
              </p>
            </div>
          </div>

          {/* Buscador de Alimentos SMAE 5ª Edición */}
          <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg min-w-0">
            <SmaeFoodSearch onOpenFullGuide={onOpenGuide} />
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Abrir ventana de búsqueda completa (Oculto por solicitud) */}
            {onOpenGuide && (
              <button
                id="btn-navbar-open-guide"
                type="button"
                onClick={onOpenGuide}
                className="hidden items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg shadow-2xs transition-colors"
                title="Abrir ventana de búsqueda y catálogo oficial SMAE 5ª Ed."
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden md:inline">Ventana SMAE</span>
              </button>
            )}

            {/* Clear table */}
            <button
              id="btn-reset-table"
              onClick={onResetTable}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-transparent"
              title="Reiniciar todos los valores a 0"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Limpiar</span>
            </button>

            {/* Export PDF if generated - Classic PDF red */}
            {hasGeneratedPlan && (
              <button
                id="btn-quick-pdf"
                onClick={onExportPdf}
                disabled={isExportingPdf}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
                title="Descargar plan en formato PDF"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                ) : (
                  <Download className="w-4 h-4 text-red-600" />
                )}
                <span className="hidden sm:inline">Exportar PDF</span>
              </button>
            )}

            {/* Export Word if generated */}
            {hasGeneratedPlan && (
              <button
                id="btn-quick-word"
                onClick={onExportWord}
                disabled={isExportingWord}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
                title="Descargar plan en formato Word editable (.docx)"
              >
                {isExportingWord ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-700" />
                ) : (
                  <FileText className="w-4 h-4 text-blue-700" />
                )}
                <span className="hidden sm:inline">Exportar Word</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

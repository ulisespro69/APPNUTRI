import React, { useState } from 'react';
import {
  Users,
  ChevronDown,
  ChevronRight,
  Radio,
  Plus,
  Save,
  PanelLeftClose,
  PanelLeftOpen,
  HeartPulse,
} from 'lucide-react';
import { PatientInfo } from '../types';

interface SidebarProps {
  onOpenPatients: () => void;
  onOpenConnect: () => void;
  onNewPatient: () => void;
  onSaveCurrentPatient: () => void;
  savedPatientsCount: number;
  activePatient: PatientInfo;
  activePatientId: string | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenPatients,
  onOpenConnect,
  onNewPatient,
  onSaveCurrentPatient,
  savedPatientsCount,
  activePatient,
  activePatientId,
  isCollapsed,
  onToggleCollapse,
}) => {
  // "Consulta" section is expanded by default to show "-Pacientes"
  const [isConsultaExpanded, setIsConsultaExpanded] = useState(true);

  return (
    <aside
      className={`no-print transition-all duration-300 ease-in-out bg-white text-slate-800 border-r border-slate-200/90 shadow-xs flex flex-col z-30 shrink-0 select-none ${
        isCollapsed ? 'w-18' : 'w-64'
      }`}
      aria-label="Barra Lateral de Navegación Clínica"
    >
      {/* Sidebar Header / Brand */}
      <div className="h-16 sm:h-20 flex items-center justify-between px-3.5 border-b border-slate-100 bg-white">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-700 via-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-xl shadow-xs shadow-emerald-200 shrink-0">
              ꛎ
            </div>
            <div className="truncate">
              <span className="font-heading font-black text-sm tracking-tight text-slate-900 block truncate">
                |SCIENCE
              </span>
              <span className="text-3xs text-emerald-700 font-bold block truncate uppercase tracking-wider">
                SMAE Clínico
              </span>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="w-full flex justify-center">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-700 via-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-xl shadow-xs shadow-emerald-200">
              ꛎ
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          title={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Main Sidebar Nav Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 bg-white">
        {/* Section: Consulta y despliegue */}
        <div className="space-y-1">
          {/* Main button: "Consulta" */}
          <button
            type="button"
            id="sidebar-btn-consulta"
            onClick={() => {
              if (isCollapsed) {
                onToggleCollapse();
                setIsConsultaExpanded(true);
              } else {
                setIsConsultaExpanded((prev) => !prev);
              }
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-heading font-bold text-xs transition-all cursor-pointer ${
              isConsultaExpanded
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/90 shadow-2xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
            }`}
            title="Consulta Clínica Nutricional"
          >
            <div className="flex items-center gap-2.5 truncate">
              <HeartPulse className="w-4 h-4 text-emerald-600 shrink-0" />
              {!isCollapsed && <span className="truncate">Consulta</span>}
            </div>

            {!isCollapsed && (
              <span className="text-slate-400">
                {isConsultaExpanded ? (
                  <ChevronDown className="w-4 h-4 text-emerald-700" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </span>
            )}
          </button>

          {/* Despliegue de Consulta */}
          {(isConsultaExpanded || isCollapsed) && (
            <div className={`space-y-1 pt-1 ${!isCollapsed ? 'pl-2 border-l border-emerald-200/60 ml-4' : ''}`}>
              {/* -Pacientes button */}
              <button
                type="button"
                id="sidebar-btn-pacientes"
                onClick={onOpenPatients}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-emerald-900 hover:bg-emerald-50/80 transition-colors group cursor-pointer"
                title="Directorio de pacientes en orden alfabético A-Z"
              >
                <div className="flex items-center gap-2 truncate">
                  <Users className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform shrink-0" />
                  {!isCollapsed && (
                    <span className="truncate group-hover:text-emerald-800 transition-colors">
                      -Pacientes
                    </span>
                  )}
                </div>

                {!isCollapsed && (
                  <span className="px-1.5 py-0.5 rounded-full text-3xs font-extrabold bg-emerald-100 text-emerald-800 group-hover:bg-emerald-200 transition-colors">
                    {savedPatientsCount}
                  </span>
                )}
              </button>

              {/* Sub-action: Guardar actual */}
              {!isCollapsed && (
                <button
                  type="button"
                  id="sidebar-btn-guardar-paciente"
                  onClick={onSaveCurrentPatient}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-2xs text-slate-500 hover:text-emerald-800 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Guardar información del paciente actual"
                >
                  <Save className="w-3 h-3 text-slate-400" />
                  <span className="truncate">Guardar información</span>
                </button>
              )}

              {/* Sub-action: Nuevo paciente */}
              {!isCollapsed && (
                <button
                  type="button"
                  id="sidebar-btn-nuevo-paciente"
                  onClick={onNewPatient}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-2xs text-slate-500 hover:text-emerald-800 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Comenzar con un nuevo paciente en blanco"
                >
                  <Plus className="w-3 h-3 text-emerald-600" />
                  <span className="truncate">+ Nuevo paciente</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Button: "-Conect" */}
        <div className="pt-2">
          <button
            type="button"
            id="sidebar-btn-conect"
            onClick={onOpenConnect}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-heading font-bold text-xs text-slate-800 hover:text-emerald-900 bg-white hover:bg-emerald-50/80 transition-all border border-slate-200 hover:border-emerald-300 shadow-2xs group cursor-pointer"
            title="Conect: Enlace con paciente y envío por WhatsApp"
          >
            <div className="flex items-center gap-2.5 truncate">
              <div className="relative shrink-0">
                <Radio className="w-4 h-4 text-emerald-600 group-hover:animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute -top-0.5 -right-0.5 ring-2 ring-white" />
              </div>
              {!isCollapsed && (
                <span className="truncate group-hover:text-emerald-800 transition-colors">
                  -Conect
                </span>
              )}
            </div>

            {!isCollapsed && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
            )}
          </button>
        </div>
      </div>

      {/* Active Patient Card / Footer Widget */}
      {!isCollapsed && activePatient.name && (
        <div className="p-3 m-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 text-slate-800 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-3xs font-extrabold uppercase tracking-wider text-emerald-700">
            <span>En Consulta</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="font-heading font-bold text-xs text-slate-900 truncate">
            {activePatient.name}
          </div>
          <div className="text-3xs text-slate-600 flex items-center gap-2">
            {activePatient.age && <span>{activePatient.age} años</span>}
            {activePatient.weight && <span>{activePatient.weight} kg</span>}
          </div>
        </div>
      )}

      {/* Bottom Bar: System Status */}
      <div className="p-3 border-t border-slate-100 bg-white text-3xs text-slate-500 flex items-center justify-between">
        {!isCollapsed && <span>SMAE 5ª Edición</span>}
        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {!isCollapsed && 'Listo'}
        </span>
      </div>
    </aside>
  );
};

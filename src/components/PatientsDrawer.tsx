import React, { useState, useMemo } from 'react';
import {
  User,
  Users,
  Search,
  Plus,
  Trash2,
  Calendar,
  Activity,
  Check,
  ChevronRight,
  Save,
  Download,
  AlertCircle,
  X,
  FileText,
  Utensils,
  Sparkles,
} from 'lucide-react';
import { SavedPatientRecord, PatientInfo, GeneratedPlan, MealOptionLetter } from '../types';
import { TableGridState } from '../data/smaeData';

interface PatientsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedPatients: SavedPatientRecord[];
  activePatientId: string | null;
  currentPatientInfo: PatientInfo;
  currentTableState: TableGridState;
  currentPlan: GeneratedPlan | null;
  currentMealOptions: Record<string, MealOptionLetter[]>;
  currentKcal: number;
  onLoadPatient: (record: SavedPatientRecord) => void;
  onSaveCurrentPatient: () => void;
  onNewPatient: () => void;
  onDeletePatient: (id: string) => void;
}

export const PatientsDrawer: React.FC<PatientsDrawerProps> = ({
  isOpen,
  onClose,
  savedPatients,
  activePatientId,
  currentPatientInfo,
  currentTableState,
  currentPlan,
  currentMealOptions,
  currentKcal,
  onLoadPatient,
  onSaveCurrentPatient,
  onNewPatient,
  onDeletePatient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInitial, setSelectedInitial] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Available unique initial letters from the saved patients
  const availableInitials = useMemo(() => {
    const letters = new Set<string>();
    savedPatients.forEach((p) => {
      const first = (p.name || '').trim().charAt(0).toUpperCase();
      if (first) letters.add(first);
    });
    return Array.from(letters).sort((a, b) => a.localeCompare(b, 'es'));
  }, [savedPatients]);

  // Filtered and alphabetically ordered patients
  const filteredPatients = useMemo(() => {
    let result = [...savedPatients];

    if (selectedInitial) {
      result = result.filter((p) => {
        const first = (p.name || '').trim().charAt(0).toUpperCase();
        return first === selectedInitial;
      });
    }

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(query) ||
          p.patientInfo?.goal?.toLowerCase().includes(query) ||
          p.patientInfo?.notes?.toLowerCase().includes(query) ||
          p.date?.includes(query)
      );
    }

    return result;
  }, [savedPatients, selectedInitial, searchTerm]);

  // Group patients by first letter for alphabetical directory display
  const groupedPatients = useMemo(() => {
    const groups: Record<string, SavedPatientRecord[]> = {};
    filteredPatients.forEach((p) => {
      const first = (p.name || '').trim().charAt(0).toUpperCase() || '#';
      if (!groups[first]) groups[first] = [];
      groups[first].push(p);
    });
    return groups;
  }, [filteredPatients]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end overflow-hidden bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 text-slate-800 animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight font-heading">
                  Directorio de Pacientes
                </h2>
                <span className="px-2 py-0.5 rounded-full text-2xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Orden Alfabético (A - Z)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {savedPatients.length} paciente{savedPatients.length === 1 ? '' : 's'} registrado{savedPatients.length === 1 ? '' : 's'} en la base clínica
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Cerrar directorio"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Bar: Save Current Patient & New Patient */}
        <div className="p-3 sm:p-4 bg-emerald-50/80 border-b border-emerald-200/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onSaveCurrentPatient();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold font-heading bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
              title="Guarda la información de la consulta actual en el directorio"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Consulta Actual</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onNewPatient();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
              title="Iniciar una consulta en blanco con nuevo paciente"
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>+ Nuevo Paciente</span>
            </button>
          </div>

          {currentPatientInfo.name && (
            <div className="text-xs text-slate-600 truncate max-w-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-semibold text-slate-800 truncate">{currentPatientInfo.name}</span>
            </div>
          )}
        </div>

        {/* Search & Alphabetical Filter Bar */}
        <div className="p-4 border-b border-slate-200 bg-white space-y-3 shrink-0">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, objetivo, fecha o notas..."
              className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50/50"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Alphabetical Filter Bar (A-Z) */}
          {availableInitials.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-2xs">
              <button
                type="button"
                onClick={() => setSelectedInitial(null)}
                className={`px-2 py-1 rounded-md font-bold transition-colors cursor-pointer shrink-0 ${
                  selectedInitial === null
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({savedPatients.length})
              </button>
              {availableInitials.map((letter) => (
                <button
                  key={letter}
                  type="button"
                  onClick={() => setSelectedInitial(selectedInitial === letter ? null : letter)}
                  className={`w-6 h-6 rounded-md font-bold transition-colors cursor-pointer flex items-center justify-center shrink-0 ${
                    selectedInitial === letter
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-emerald-100 hover:text-emerald-800'
                  }`}
                  title={`Filtrar pacientes que inician con '${letter}'`}
                >
                  {letter}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Patient List (Grouped Alphabetically) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {savedPatients.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="font-heading font-extrabold text-slate-800 text-base mb-1">
                Aún no hay pacientes guardados
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
                Ingresa el nombre y datos de tu paciente en la consulta y presiona{' '}
                <strong className="text-emerald-700 font-semibold">"Guardar Consulta Actual"</strong> para almacenarlo en este directorio alfabético.
              </p>
              <button
                type="button"
                onClick={onSaveCurrentPatient}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-heading font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Paciente en Consulta</span>
              </button>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Search className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-700">No se encontraron pacientes coincidentes</p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedInitial(null);
                }}
                className="mt-2 text-xs text-emerald-600 hover:underline font-bold"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            Object.keys(groupedPatients)
              .sort((a, b) => a.localeCompare(b, 'es'))
              .map((initial) => (
                <div key={initial} className="space-y-2.5">
                  {/* Alphabetical letter section header */}
                  <div className="flex items-center gap-2 sticky top-0 bg-white/95 backdrop-blur-xs py-1 z-10 border-b border-slate-200">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-black font-heading text-xs flex items-center justify-center">
                      {initial}
                    </span>
                    <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-400">
                      Pacientes con letra {initial} ({groupedPatients[initial].length})
                    </span>
                  </div>

                  {/* Cards under this letter */}
                  <div className="space-y-2">
                    {groupedPatients[initial].map((patient) => {
                      const isActive = activePatientId === patient.id;
                      const hasMenus = !!patient.generatedPlan?.meals?.length;

                      return (
                        <div
                          key={patient.id}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            isActive
                              ? 'bg-emerald-50/70 border-emerald-400 shadow-sm ring-1 ring-emerald-400'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div
                                className={`w-10 h-10 rounded-xl font-heading font-black text-sm flex items-center justify-center shrink-0 ${
                                  isActive
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {patient.name.charAt(0).toUpperCase()}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-heading font-bold text-sm text-slate-900 truncate">
                                    {patient.name}
                                  </h4>
                                  {isActive && (
                                    <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold bg-emerald-600 text-white uppercase tracking-wider">
                                      En Consulta
                                    </span>
                                  )}
                                  {hasMenus && (
                                    <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1">
                                      <Utensils className="w-2.5 h-2.5 text-teal-600" />
                                      Menú SMAE
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-2xs text-slate-500">
                                  {patient.date && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-slate-400" />
                                      {patient.date}
                                    </span>
                                  )}
                                  {patient.patientInfo?.gender && (
                                    <span>{patient.patientInfo.gender}</span>
                                  )}
                                  {patient.patientInfo?.age && (
                                    <span>{patient.patientInfo.age} años</span>
                                  )}
                                  {patient.patientInfo?.weight && (
                                    <span>{patient.patientInfo.weight} kg</span>
                                  )}
                                  {patient.patientInfo?.height && (
                                    <span>{patient.patientInfo.height} cm</span>
                                  )}
                                  {patient.totalKcal && (
                                    <span className="font-bold text-emerald-700">
                                      {Math.round(patient.totalKcal)} kcal
                                    </span>
                                  )}
                                </div>

                                {patient.patientInfo?.goal && (
                                  <p className="text-2xs text-slate-600 mt-1 line-clamp-1 italic">
                                    Objetivo: {patient.patientInfo.goal}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  onLoadPatient(patient);
                                  onClose();
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold font-heading bg-slate-900 hover:bg-emerald-700 text-white transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                title="Cargar este paciente a la consulta activa"
                              >
                                <span>Cargar</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>

                              {deleteConfirmId === patient.id ? (
                                <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-200">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDeletePatient(patient.id);
                                      setDeleteConfirmId(null);
                                    }}
                                    className="px-2 py-1 text-2xs font-extrabold bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer"
                                  >
                                    Sí, borrar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-2 py-1 text-2xs text-slate-600 hover:bg-slate-200 rounded cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(patient.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Eliminar paciente del directorio"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-2xs text-slate-500 flex items-center justify-between shrink-0">
          <span>Ordenados estrictamente en orden alfabético A-Z</span>
          <span className="font-semibold text-slate-700">Almacenamiento Local Seguro</span>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  X,
  Share2,
  Smartphone,
  CheckCircle2,
  Copy,
  Send,
} from 'lucide-react';
import { PatientInfo, GeneratedPlan, MealOptionLetter } from '../types';
import { formatClipboardMenu } from '../utils/nutritionCalculations';

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientInfo: PatientInfo;
  generatedPlan: GeneratedPlan | null;
  selectedMealOptions: Record<string, MealOptionLetter[]>;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({
  isOpen,
  onClose,
  patientInfo,
  generatedPlan,
  selectedMealOptions,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');

  if (!isOpen) return null;

  const handleCopyShareText = () => {
    if (!generatedPlan) {
      navigator.clipboard.writeText(`Plan de Consulta Nutricional - Paciente: ${patientInfo.name || 'Sin nombre'}`);
    } else {
      const formatted = formatClipboardMenu(generatedPlan, patientInfo, selectedMealOptions);
      navigator.clipboard.writeText(formatted);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleSendWhatsApp = () => {
    const text = generatedPlan
      ? formatClipboardMenu(generatedPlan, patientInfo, selectedMealOptions)
      : `Hola ${patientInfo.name || ''}, aquí tienes el seguimiento de tu consulta nutricional.`;

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const encoded = encodeURIComponent(text);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight font-heading">
                  Conectar con Paciente
                </h2>
                <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  En línea
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Enlace directo con el paciente y envío del plan nutricional
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Solo Conectar con Paciente */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
          {/* Patient active status card */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center font-heading">
                {patientInfo.name ? patientInfo.name.charAt(0).toUpperCase() : 'P'}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">
                  {patientInfo.name || 'Paciente en Consulta'}
                </div>
                <div className="text-2xs text-slate-500">
                  {patientInfo.goal ? `Meta: ${patientInfo.goal}` : 'Sin objetivo especificado'}
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-3xs font-extrabold bg-emerald-100 text-emerald-800">
              {generatedPlan ? 'Menú SMAE Listo' : 'En Diagnóstico'}
            </span>
          </div>

          {/* WhatsApp direct delivery */}
          <div className="p-5 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-3">
            <div className="flex items-center gap-2 text-emerald-900 font-heading font-bold text-sm">
              <Smartphone className="w-4 h-4 text-emerald-700" />
              <span>Envío directo por WhatsApp</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Envía el plan nutricional y los equivalentes directamente al celular del paciente con porciones detalladas y recomendaciones.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Número con lada (ej. 5215512345678 o 5512345678)"
                className="flex-1 px-3 py-2.5 text-xs border border-emerald-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Copy structured text */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-heading font-bold text-xs text-slate-900">
                Copiar texto formateado del plan
              </h4>
              <p className="text-2xs text-slate-500">
                Listo para pegar en correo, notas clínicas o mensajes privados.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyShareText}
              className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-heading font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              {copiedLink ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar al portapapeles</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

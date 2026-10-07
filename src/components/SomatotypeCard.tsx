import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Crosshair,
  Download,
  Maximize2,
  X,
} from 'lucide-react';
import { PatientInfo } from '../types';
import { calculateHeathCarterSomatotype, HeathCarterSomatotypeResult } from '../utils/nutritionCalculations';

interface SomatotypeCardProps {
  patientInfo: PatientInfo;
  onPatientInfoChange?: (updated: PatientInfo) => void;
  onNavigateToTab?: (tab: 'all' | 'skinfolds' | 'girths' | 'breadths') => void;
}

export const SomatotypeCard: React.FC<SomatotypeCardProps> = ({
  patientInfo,
  onPatientInfoChange,
  onNavigateToTab,
}) => {
  const [chartMode, setChartMode] = useState<'official' | 'zones'>(() => {
    try {
      const saved = localStorage.getItem('somatotype_chart_mode');
      if (saved === 'official' || saved === 'zones') return saved;
    } catch {
      // fallback
    }
    return 'zones';
  });
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('somatotype_chart_mode', chartMode);
    } catch {
      // ignore
    }
  }, [chartMode]);

  const somatotype: HeathCarterSomatotypeResult = calculateHeathCarterSomatotype(patientInfo);

  // Parámetros matemáticos y visuales de la Somatocarta (Método Heath & Carter Oficial)
  // Tamaño del lienzo: 612 x 612
  const svgWidth = 612;
  const svgHeight = 612;

  // Cuadrilátero exterior
  const boxX0 = 34;
  const boxY0 = 30;
  const boxW = 544;
  const boxH = 544;
  const boxXRight = boxX0 + boxW; // 578
  const boxYBottom = boxY0 + boxH; // 574

  // Origen (0,0) calibrado matemáticamente
  // Horizontal: exactamente centrado (34 + 544/2 = 306)
  // Vertical: eje Y=0 a 365px (61.5% desde arriba, proporcional al rango +16 a -10)
  const originX = 306;
  const originY = 365;

  // Escalas matemáticas exactas:
  // En el triángulo equilátero del somatotipo de Carter & Heath:
  // scaleX = scaleY * sqrt(3)
  const scaleX = 31.0;
  const scaleY = scaleX / Math.sqrt(3); // ≈ 17.8979 px por unidad

  // Mapeo preciso de coordenadas cartesianas (X, Y) a píxeles
  const getPixelCoord = (xVal: number, yVal: number) => {
    // Clamping dentro del marco para evitar roturas visuales
    const clampedX = Math.max(-8.6, Math.min(8.6, xVal));
    const clampedY = Math.max(-11.0, Math.min(17.0, yVal));
    return {
      px: originX + clampedX * scaleX,
      py: originY - clampedY * scaleY,
    };
  };

  // Punto del paciente si hay cálculo válido, o punto de referencia canónico
  const isCustomCalculated = somatotype.isComplete && somatotype.x !== null && somatotype.y !== null;
  const patientPoint =
    somatotype.x !== null && somatotype.y !== null
      ? getPixelCoord(somatotype.x, somatotype.y)
      : null;

  const activeX = isCustomCalculated && somatotype.x !== null ? somatotype.x : -2.0;
  const activeY = isCustomCalculated && somatotype.y !== null ? somatotype.y : 9.0;
  const activePoint = patientPoint || getPixelCoord(activeX, activeY);

  const displayEndo = isCustomCalculated ? somatotype.endoFormatted : '2.7';
  const displayMeso = isCustomCalculated ? somatotype.mesoFormatted : '6.2';
  const displayEcto = isCustomCalculated ? somatotype.ectoFormatted : '0.7';
  const displayClassName = isCustomCalculated && somatotype.classification ? somatotype.classification.name : 'Endo-mesomorfo';
  const displayInterp = isCustomCalculated && somatotype.classification?.description
    ? somatotype.classification.description
    : 'La mesomorfia es dominante y la endomorfia es mayor que la ectomorfia. Fuerte componente muscular con moderada adiposidad subcutánea.';
  const displayScaleSummary = isCustomCalculated && somatotype.scaleSummaryText
    ? somatotype.scaleSummaryText
    : 'Hombre de 32 años con un peso de 79.0 kg y estatura de 1.70 m. Presenta una moderada adiposidad relativa, con un alto desarrollo musculoesquelético y una baja linealidad relativa.';
  const displayX = isCustomCalculated && somatotype.x !== null ? somatotype.x.toFixed(1) : '-2.0';
  const displayY = isCustomCalculated && somatotype.y !== null ? somatotype.y.toFixed(1) : '9.0';

  // Vértices del triángulo de Carter & Heath (Reuleaux curvilíneo)
  // Mesomorfismo puro: (0, +12)
  // Endomorfismo puro: (-6, -6)
  // Ectomorfismo puro: (+6, -6)
  const mesoApex = getPixelCoord(0, 12);     // px = 306, py = 150.23
  const endoApex = getPixelCoord(-6, -6);   // px = 120, py = 472.39
  const ectoApex = getPixelCoord(6, -6);    // px = 492, py = 472.39

  // Lado del triángulo equilátero en píxeles y radio de los arcos de Reuleaux
  // Distancia = 12 * scaleX = 372.0 px
  const reuleauxRadius = 12 * scaleX; // 372 px

  // Trayectoria SVG de la Somatocarta Curvilínea
  const somatocartaPath = `M ${endoApex.px} ${endoApex.py} A ${reuleauxRadius} ${reuleauxRadius} 0 0 0 ${ectoApex.px} ${ectoApex.py} A ${reuleauxRadius} ${reuleauxRadius} 0 0 0 ${mesoApex.px} ${mesoApex.py} A ${reuleauxRadius} ${reuleauxRadius} 0 0 0 ${endoApex.px} ${endoApex.py} Z`;

  // Descarga del gráfico SVG en alta resolución
  const handleDownloadSvg = () => {
    const svgEl = document.getElementById('somatocarta-svg-main');
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgEl);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `somatocarta_heath_carter_${patientInfo.name ? patientInfo.name.replace(/\s+/g, '_') : 'paciente'}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Generador de Ticks para el Eje X (de -8.6 a +8.6)
  const renderXTicks = (yPos: number, isTop: boolean) => {
    const ticks = [];
    const step = 0.2;
    for (let x = -8.6; x <= 8.61; x += step) {
      const roundedX = Math.round(x * 10) / 10;
      const px = originX + roundedX * scaleX;
      if (px < boxX0 || px > boxXRight) continue;

      const isInteger = Math.abs(roundedX - Math.round(roundedX)) < 0.01;
      const isHalf = Math.abs(roundedX % 1) === 0.5;

      let tickLen = 4;
      let strokeW = 0.6;
      if (isInteger) {
        tickLen = 9;
        strokeW = 1.3;
      } else if (isHalf) {
        tickLen = 6.5;
        strokeW = 0.9;
      }

      const y1 = yPos;
      const y2 = isTop ? yPos + tickLen : yPos - tickLen;

      ticks.push(
        <line
          key={`xtick-${isTop ? 'top' : 'bot'}-${roundedX}`}
          x1={px}
          y1={y1}
          x2={px}
          y2={y2}
          stroke="#000000"
          strokeWidth={strokeW}
        />
      );

      // Etiquetas en números enteros entre -8 y +8
      if (isInteger && roundedX >= -8 && roundedX <= 8) {
        const intVal = Math.round(roundedX);
        const labelText = intVal === 0 ? '0' : intVal > 0 ? `+${intVal}` : `${intVal}`;
        const labelY = isTop ? yPos - 8 : yPos + 18;
        ticks.push(
          <text
            key={`xlabel-${isTop ? 'top' : 'bot'}-${intVal}`}
            x={px}
            y={labelY}
            textAnchor="middle"
            className="fill-black text-[14.5px] font-black select-none"
            style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
          >
            {labelText}
          </text>
        );
      }
    }
    return ticks;
  };

  // Generador de Ticks para el Eje Y (de -11.0 a +17.0)
  const renderYTicks = (xPos: number, isLeft: boolean) => {
    const ticks = [];
    const step = 0.2;
    for (let y = -11.0; y <= 17.01; y += step) {
      const roundedY = Math.round(y * 10) / 10;
      const py = originY - roundedY * scaleY;
      if (py < boxY0 || py > boxYBottom) continue;

      const isInteger = Math.abs(roundedY - Math.round(roundedY)) < 0.01;
      const isHalf = Math.abs(roundedY % 1) === 0.5;

      let tickLen = 3.5;
      let strokeW = 0.6;
      if (isInteger) {
        tickLen = 8;
        strokeW = 1.3;
      } else if (isHalf) {
        tickLen = 5.5;
        strokeW = 0.8;
      }

      const x1 = xPos;
      const x2 = isLeft ? xPos + tickLen : xPos - tickLen;

      ticks.push(
        <line
          key={`ytick-${isLeft ? 'l' : 'r'}-${roundedY}`}
          x1={x1}
          y1={py}
          x2={x2}
          y2={py}
          stroke="#000000"
          strokeWidth={strokeW}
        />
      );

      // Etiquetas en números pares entre -10 y +16
      if (isInteger && roundedY >= -10 && roundedY <= 16 && Math.round(roundedY) % 2 === 0) {
        const intVal = Math.round(roundedY);
        const labelText = intVal === 0 ? '0' : intVal > 0 ? `+${intVal}` : `${intVal}`;
        const labelX = isLeft ? xPos - 7 : xPos + 7;
        ticks.push(
          <text
            key={`ylabel-${isLeft ? 'l' : 'r'}-${intVal}`}
            x={labelX}
            y={py + 4.0}
            textAnchor={isLeft ? 'end' : 'start'}
            className="fill-black text-[14.5px] font-black select-none"
            style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
          >
            {labelText}
          </text>
        );
      }
    }
    return ticks;
  };

  // Renderizador del SVG central de la Somatocarta
  const renderSomatochartSvg = (id: string, isZoom = false) => (
    <svg
      id={id}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="w-full h-auto select-none"
      style={{
        maxWidth: isZoom ? '840px' : '612px',
        maxHeight: isZoom ? '85vh' : '612px',
        backgroundColor: '#ffffff',
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}
    >
      <defs>
        {/* Degradado sutil para visualización con zonas */}
        <linearGradient id="somatoGradientZones" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.45" />
          <stop offset="50%" stopColor="#f8fafc" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#fde68a" stopOpacity="0.45" />
        </linearGradient>
      </defs>

      {/* Marco Exterior Cuadrado Oficial Heath-Carter */}
      <rect
        x={boxX0}
        y={boxY0}
        width={boxW}
        height={boxH}
        fill="#ffffff"
        stroke="#000000"
        strokeWidth="2.5"
      />

      {/* Zonas somatotípicas en modo color */}
      {chartMode === 'zones' && (
        <g id="zones-overlay">
          {/* Zona Mesomorfa (Azul celeste) */}
          <path
            d={`M ${originX} ${originY} L ${endoApex.px + 50} ${endoApex.py - 100} A ${reuleauxRadius} ${reuleauxRadius} 0 0 0 ${mesoApex.px} ${mesoApex.py} A ${reuleauxRadius} ${reuleauxRadius} 0 0 0 ${ectoApex.px - 50} ${ectoApex.py - 100} Z`}
            fill="#e0f2fe"
            fillOpacity="0.6"
          />
          {/* Zona Endomorfa (Ámbar) */}
          <path
            d={`M ${originX} ${originY} L ${originX} ${originY + 157} A ${reuleauxRadius} ${reuleauxRadius} 0 0 1 ${endoApex.px} ${endoApex.py} A ${reuleauxRadius} ${reuleauxRadius} 0 0 1 ${endoApex.px + 50} ${endoApex.py - 100} Z`}
            fill="#fef3c7"
            fillOpacity="0.6"
          />
          {/* Zona Ectomorfa (Púrpura) */}
          <path
            d={`M ${originX} ${originY} L ${originX} ${originY + 157} A ${reuleauxRadius} ${reuleauxRadius} 0 0 0 ${ectoApex.px} ${ectoApex.py} A ${reuleauxRadius} ${reuleauxRadius} 0 0 0 ${ectoApex.px - 50} ${ectoApex.py - 100} Z`}
            fill="#f3e8ff"
            fillOpacity="0.6"
          />
          {/* Zona Central (Verde esmeralda) */}
          <circle
            cx={originX}
            cy={originY}
            r="28"
            fill="#d1fae5"
            fillOpacity="0.65"
            stroke="#10b981"
            strokeWidth="1.2"
            strokeDasharray="3,3"
          />
        </g>
      )}

      {/* Triángulo Curvilíneo de Carter & Heath (Reuleaux) */}
      <path
        d={somatocartaPath}
        fill={chartMode === 'zones' ? 'none' : '#ffffff'}
        stroke="#000000"
        strokeWidth="2.2"
      />

      {/* Líneas Guías Interiores Oficiales de Heath-Carter */}
      {/* 1. Eje Vertical Mesomorfismo */}
      {/* Puntero exterior arriba */}
      <line x1={originX} y1={87} x2={originX} y2={mesoApex.py} stroke="#000000" strokeWidth="1" />
      {/* Espina central sólida superior */}
      <line
        x1={originX}
        y1={mesoApex.py}
        x2={originX}
        y2={originY}
        stroke="#000000"
        strokeWidth="1.6"
      />
      {/* Bisectriz inferior discontinua hasta arco inferior */}
      <line
        x1={originX}
        y1={originY}
        x2={originX}
        y2={522.2}
        stroke="#000000"
        strokeWidth="1.3"
        strokeDasharray="6,4"
      />

      {/* 2. Eje Diagonal Endomorfismo */}
      {/* Puntero exterior abajo a la izquierda */}
      <line x1={73.5} y1={499.2} x2={endoApex.px} y2={endoApex.py} stroke="#000000" strokeWidth="1" />
      {/* Segmento sólido desde vértice hasta origen */}
      <line
        x1={endoApex.px}
        y1={endoApex.py}
        x2={originX}
        y2={originY}
        stroke="#000000"
        strokeWidth="1.6"
      />
      {/* Bisectriz discontinua hacia arriba a la derecha */}
      <line
        x1={originX}
        y1={originY}
        x2={498}
        y2={254}
        stroke="#000000"
        strokeWidth="1.3"
        strokeDasharray="6,4"
      />

      {/* 3. Eje Diagonal Ectomorfismo */}
      {/* Puntero exterior abajo a la derecha */}
      <line x1={538.5} y1={499.2} x2={ectoApex.px} y2={ectoApex.py} stroke="#000000" strokeWidth="1" />
      {/* Segmento sólido desde vértice hasta origen */}
      <line
        x1={ectoApex.px}
        y1={ectoApex.py}
        x2={originX}
        y2={originY}
        stroke="#000000"
        strokeWidth="1.6"
      />
      {/* Bisectriz discontinua hacia arriba a la izquierda */}
      <line
        x1={originX}
        y1={originY}
        x2={114}
        y2={254}
        stroke="#000000"
        strokeWidth="1.3"
        strokeDasharray="6,4"
      />

      {/* Etiquetas de los Vértices del Somatotipo (Heath-Carter ISAK) */}
      {/* 1. MESOMORFISMO (Vértice Superior - Componente Musculoesquelético) */}
      <g id="apex-label-mesomorphy" className="cursor-default select-none">
        <rect
          x={originX - 82}
          y={114}
          width={164}
          height={30}
          rx={6}
          fill="#ffffff"
          stroke={chartMode === 'zones' ? '#0284c7' : '#0f172a'}
          strokeWidth="1.8"
          filter="drop-shadow(0 1px 2px rgba(0,0,0,0.06))"
        />
        <circle cx={originX - 64} cy={129} r={4} fill="#0284c7" />
        <text
          x={originX + 6}
          y={134}
          textAnchor="middle"
          className="fill-slate-900 text-[16px] font-black tracking-wider select-none"
          style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
        >
          MESOMORFISMO
        </text>
      </g>

      {/* 2. ENDOMORFISMO (Vértice Inferior Izquierdo - Componente Adiposidad Relativa) */}
      <g id="apex-label-endomorphy" className="cursor-default select-none">
        <rect
          x={124 - 82}
          y={498}
          width={164}
          height={30}
          rx={6}
          fill="#ffffff"
          stroke={chartMode === 'zones' ? '#d97706' : '#0f172a'}
          strokeWidth="1.8"
          filter="drop-shadow(0 1px 2px rgba(0,0,0,0.06))"
        />
        <circle cx={124 - 64} cy={513} r={4} fill="#d97706" />
        <text
          x={124 + 6}
          y={518}
          textAnchor="middle"
          className="fill-slate-900 text-[16px] font-black tracking-wider select-none"
          style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
        >
          ENDOMORFISMO
        </text>
      </g>

      {/* 3. ECTOMORFISMO (Vértice Inferior Derecho - Componente Linealidad Relativa) */}
      <g id="apex-label-ectomorphy" className="cursor-default select-none">
        <rect
          x={488 - 82}
          y={498}
          width={164}
          height={30}
          rx={6}
          fill="#ffffff"
          stroke={chartMode === 'zones' ? '#7c3aed' : '#0f172a'}
          strokeWidth="1.8"
          filter="drop-shadow(0 1px 2px rgba(0,0,0,0.06))"
        />
        <circle cx={488 - 64} cy={513} r={4} fill="#7c3aed" />
        <text
          x={488 + 6}
          y={518}
          textAnchor="middle"
          className="fill-slate-900 text-[16px] font-black tracking-wider select-none"
          style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
        >
          ECTOMORFISMO
        </text>
      </g>

      {/* Reglas Graduadas: Ticks y Números en los 4 bordes del marco */}
      {renderXTicks(boxY0, true)}
      {renderXTicks(boxYBottom, false)}
      {renderYTicks(boxX0, true)}
      {renderYTicks(boxXRight, false)}

      {/* Marcador del Paciente: Solo el punto */}
      <g id="patient-marker" className="transition-all duration-300">
        <circle
          cx={activePoint.px}
          cy={activePoint.py}
          r="6.5"
          fill="#dc2626"
          stroke="#ffffff"
          strokeWidth="2.2"
          className="drop-shadow-xs"
        />
        <circle
          cx={activePoint.px}
          cy={activePoint.py}
          r="11"
          fill="#dc2626"
          fillOpacity="0.22"
        />
      </g>
    </svg>
  );

  return (
    <div id="card-somatotype-isak" className="border-t border-slate-200/90 pt-3 space-y-3">
      {/* Encabezado Principal */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-2xs font-extrabold uppercase tracking-wide text-slate-900 block">
            Somatotipo (Método Heath-Carter)
          </span>
          <p className="text-3xs text-slate-500 font-medium">
            Evaluación antropométrica de adiposidad relativa, robustez musculoesquelética y linealidad
          </p>
        </div>
      </div>

      {/* Grid Principal: Tarjetas de Componentes + Somatocarta Oficial */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        {/* Columna Izquierda (6 columnas): Componentes y Clasificación Oficial */}
        <div className="lg:col-span-6 flex flex-col justify-between gap-2.5">
          {/* 1. Endomorfia (Adiposidad Relativa) */}
          <div
            id="somatotype-card-endomorphy"
            className="bg-white border border-amber-200/90 rounded-xl p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-2 pb-1.5 border-b border-amber-100">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                <div>
                  <span className="text-2xs font-extrabold text-amber-950 uppercase tracking-wide">
                    1. Endomorfia (Adiposidad Relativa)
                  </span>
                  <span className="text-3xs text-slate-500 block">
                    Grasa subcutánea relativa y redondez física
                  </span>
                </div>
              </div>
              <span
                className={`text-3xs font-bold px-2 py-0.5 rounded ${
                  somatotype.endoDetails.isComplete
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {somatotype.endoDetails.isComplete ? 'Calculado' : 'Pendiente'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 mt-2">
              <div className="space-y-0.5">
                <div className="text-3xs text-slate-600 font-medium">
                  {somatotype.endoDetails.isComplete ? (
                    <>
                      Σ corregida: <strong className="text-slate-800 font-bold">{somatotype.endoDetails.spc} mm</strong>
                      <span className="text-slate-400 text-3xs block">
                        ({somatotype.endoDetails.sumSkinfolds} mm × 170.18 / {somatotype.variablesSummary.height.value} cm)
                      </span>
                    </>
                  ) : (
                    <span className="text-amber-800 font-medium">
                      Requiere: {somatotype.endoDetails.missingVars.join(', ')}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xl sm:text-2xl font-black text-amber-900 tracking-tight">
                  {somatotype.endoFormatted}
                </span>
                <span className="text-3xs text-slate-400 block font-semibold">Puntos</span>
              </div>
            </div>
          </div>

          {/* 2. Mesomorfia (Robustez Musculoesquelética Relativa) */}
          <div
            id="somatotype-card-mesomorphy"
            className="bg-white border border-sky-200/90 rounded-xl p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-2 pb-1.5 border-b border-sky-100">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0"></span>
                <div>
                  <span className="text-2xs font-extrabold text-sky-950 uppercase tracking-wide">
                    2. Mesomorfia (Robustez Muscular)
                  </span>
                  <span className="text-3xs text-slate-500 block">
                    Masa magra y robustez ósea relativa a la estatura
                  </span>
                </div>
              </div>
              <span
                className={`text-3xs font-bold px-2 py-0.5 rounded ${
                  somatotype.mesoDetails.isComplete
                    ? 'bg-sky-100 text-sky-900 border border-sky-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {somatotype.mesoDetails.isComplete ? 'Calculado' : 'Pendiente'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 mt-2">
              <div className="space-y-0.5">
                <div className="text-3xs text-slate-600 font-medium">
                  {somatotype.mesoDetails.isComplete ? (
                    <>
                      DH: <strong className="text-slate-800 font-bold">{somatotype.mesoDetails.dh} cm</strong> | DF: <strong className="text-slate-800 font-bold">{somatotype.mesoDetails.df} cm</strong>
                      <span className="text-slate-400 text-3xs block">
                        BC: {somatotype.mesoDetails.bc} cm | PnC: {somatotype.mesoDetails.pnc} cm
                      </span>
                    </>
                  ) : (
                    <span className="text-sky-800 font-medium">
                      Requiere: {somatotype.mesoDetails.missingVars.join(', ')}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xl sm:text-2xl font-black text-sky-900 tracking-tight">
                  {somatotype.mesoFormatted}
                </span>
                <span className="text-3xs text-slate-400 block font-semibold">Puntos</span>
              </div>
            </div>
          </div>

          {/* 3. Ectomorfia (Linealidad Relativa) */}
          <div
            id="somatotype-card-ectomorphy"
            className="bg-white border border-purple-200/90 rounded-xl p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-2 pb-1.5 border-b border-purple-100">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0"></span>
                <div>
                  <span className="text-2xs font-extrabold text-purple-950 uppercase tracking-wide">
                    3. Ectomorfia (Linealidad Relativa)
                  </span>
                  <span className="text-3xs text-slate-500 block">
                    Delgadez relativa y predominio de longitud
                  </span>
                </div>
              </div>
              <span
                className={`text-3xs font-bold px-2 py-0.5 rounded ${
                  somatotype.ectoDetails.isComplete
                    ? 'bg-purple-100 text-purple-900 border border-purple-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {somatotype.ectoDetails.isComplete ? 'Calculado' : 'Pendiente'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 mt-2">
              <div className="space-y-0.5">
                <div className="text-3xs text-slate-600 font-medium">
                  {somatotype.ectoDetails.isComplete ? (
                    <>
                      Índice Ponderal (HWR): <strong className="text-slate-800 font-bold">{somatotype.ectoDetails.hwr}</strong>
                      <span className="text-slate-400 text-3xs block">
                        (Estatura / ∛Peso)
                      </span>
                    </>
                  ) : (
                    <span className="text-purple-800 font-medium">
                      Requiere: {somatotype.ectoDetails.missingVars.join(', ')}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xl sm:text-2xl font-black text-purple-900 tracking-tight">
                  {somatotype.ectoFormatted}
                </span>
                <span className="text-3xs text-slate-400 block font-semibold">Puntos</span>
              </div>
            </div>
          </div>

          {/* Panel de Clasificación e Interpretación Completa */}
          <div
            id="somatotype-classification-banner"
            className="bg-white border-2 border-indigo-200/90 rounded-xl p-3 sm:p-3.5 shadow-2xs space-y-2.5"
          >
            {/* 1. Componentes compactos: 1. Endomorfia: 2.7 | 2. Mesomorfia: 6.2 | 3. Ectomorfia: 0.7 */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-lg p-2 flex flex-wrap items-center justify-between sm:justify-start gap-y-1 gap-x-2.5 text-2xs font-extrabold text-slate-800">
              <span className="text-amber-800">
                1. Endomorfia: <strong className="text-amber-950 font-black">{displayEndo}</strong>
              </span>
              <span className="text-slate-300 font-normal hidden sm:inline">|</span>
              <span className="text-sky-800">
                2. Mesomorfia: <strong className="text-sky-950 font-black">{displayMeso}</strong>
              </span>
              <span className="text-slate-300 font-normal hidden sm:inline">|</span>
              <span className="text-purple-800">
                3. Ectomorfia: <strong className="text-purple-950 font-black">{displayEcto}</strong>
              </span>
            </div>

            {/* 2. Clasificación: Endo-mesomorfo (2.7 - 6.2 - 0.7) */}
            <div className="space-y-0.5">
              <div className="text-3xs font-extrabold uppercase tracking-wide text-slate-500">
                Clasificación Heath-Carter:
              </div>
              <div className="text-xs sm:text-sm font-black text-indigo-950 flex flex-wrap items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-950 border border-indigo-300 font-black">
                  {displayClassName}
                </span>
                <span className="text-3xs font-bold text-slate-600">
                  ({displayEndo} - {displayMeso} - {displayEcto})
                </span>
              </div>
            </div>

            {/* 3. Interpretación funcional */}
            <div className="space-y-1 text-2xs sm:text-xs">
              <span className="font-extrabold text-slate-900 block text-xs">
                Interpretación funcional:
              </span>
              <p className="text-slate-700 font-bold leading-relaxed text-[12px] sm:text-[13px]">
                {displayInterp}
              </p>
            </div>

            {/* 4. Frase cualitativa oficial según escalas Heath-Carter (somatotipo.pdf) */}
            {displayScaleSummary && (
              <div
                id="somatotype-scales-summary-text"
                className="bg-indigo-50/80 border-l-4 border-indigo-600 rounded-r-lg p-3 text-[13px] sm:text-[14px] text-slate-900 leading-relaxed font-bold italic shadow-2xs"
              >
                &ldquo;{displayScaleSummary}&rdquo;
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha (6 columnas): Gráfico Oficial Somatocarta */}
        <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between items-center text-center">
          {/* Barra de Controles y Herramientas de la Somatocarta */}
          <div className="w-full flex flex-wrap items-center justify-between gap-1.5 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-indigo-600" />
              <span className="text-xs sm:text-sm font-black text-slate-900 tracking-wide">
                Somatocarta Oficial
              </span>
            </div>

            {/* Coordenadas o estado */}
            <div className="flex items-center gap-1.5">
              <span className="text-3xs sm:text-2xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-900 border border-indigo-200">
                X: {displayX} | Y: {displayY}
              </span>

              {/* Botón de pantalla completa / Zoom */}
              <button
                type="button"
                onClick={() => setIsZoomOpen(true)}
                className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors"
                title="Ampliar Somatocarta en pantalla completa"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              {/* Botón de descarga de imagen SVG */}
              <button
                type="button"
                onClick={handleDownloadSvg}
                className="p-1 rounded text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 border border-slate-200 transition-colors"
                title="Descargar Somatocarta en formato SVG vectorial"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Contenedor del Gráfico Somatograma */}
          <div className="relative w-full my-2 flex justify-center items-center bg-white p-1">
            {renderSomatochartSvg('somatocarta-svg-main', false)}
          </div>

          {/* Fórmulas matemáticas y referencias inferiores */}
          <div className="w-full pt-2 border-t border-slate-100 space-y-1.5">
            <div className="flex flex-wrap items-center justify-center text-3xs text-slate-500">
              <div className="font-mono text-[9.5px] text-slate-600 bg-slate-50 px-2.5 py-0.5 rounded border border-slate-200">
                X = Ecto - Endo | Y = 2·Meso - (Endo + Ecto)
              </div>
            </div>

            {/* Referencias anatómicas de los vértices */}
            <div className="grid grid-cols-3 gap-1 text-[9.5px] text-slate-500 font-semibold pt-1 border-t border-slate-100/70">
              <div className="text-center">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mr-1"></span>
                Endo: (-6, -6)
              </div>
              <div className="text-center">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500 mr-1"></span>
                Meso: (0, +12)
              </div>
              <div className="text-center">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 mr-1"></span>
                Ecto: (+6, -6)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Zoom en Pantalla Completa para Análisis Clínico */}
      {isZoomOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-300">
            {/* Cabecera del Modal */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-extrabold text-slate-900">
                  Somatocarta Oficial Ampliada (Heath-Carter / ISAK)
                </span>
                <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900">
                  X: {displayX}, Y: {displayY}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadSvg}
                  className="text-3xs font-bold text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded-md border border-indigo-200 flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Descargar SVG
                </button>
                <button
                  type="button"
                  onClick={() => setIsZoomOpen(false)}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Contenido del Modal */}
            <div className="p-4 overflow-y-auto flex flex-col items-center justify-center bg-slate-100/50">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm w-full flex justify-center">
                {renderSomatochartSvg('somatocarta-svg-zoom', true)}
              </div>

              <div className="mt-3 w-full bg-white p-3 rounded-xl border border-slate-200 text-3xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800">
                    Resultado Somatotípico: {displayClassName}
                  </span>
                  <span className="font-mono text-slate-600">
                    Endomorfia: {displayEndo} | Mesomorfia: {displayMeso} | Ectomorfia: {displayEcto}
                  </span>
                </div>
                <p className="text-slate-500 leading-relaxed">
                  {displayInterp}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

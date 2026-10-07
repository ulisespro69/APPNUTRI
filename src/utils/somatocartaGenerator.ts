import { HeathCarterSomatotypeResult } from './nutritionCalculations';

export interface SomatocartaOptions {
  chartMode?: 'classic' | 'zones';
  showProjections?: boolean;
}

/**
 * Genera el SVG completo en string de la Somatocarta Oficial de Heath & Carter (1990)
 * Calibrada matemáticamente con precisión ISAK
 */
export function generateSomatocartaSvgString(
  somatotype: HeathCarterSomatotypeResult,
  options: SomatocartaOptions = {}
): string {
  const { chartMode = 'classic', showProjections = false } = options;

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
  const originX = 306;
  const originY = 365;

  // Escalas matemáticas exactas: scaleX = 31.0, scaleY = scaleX / sqrt(3)
  const scaleX = 31.0;
  const scaleY = scaleX / Math.sqrt(3);

  const getPixelCoord = (xVal: number, yVal: number) => {
    const clampedX = Math.max(-8.6, Math.min(8.6, xVal));
    const clampedY = Math.max(-11.0, Math.min(17.0, yVal));
    return {
      px: originX + clampedX * scaleX,
      py: originY - clampedY * scaleY,
    };
  };

  const patientPoint =
    somatotype.x !== null && somatotype.y !== null
      ? getPixelCoord(somatotype.x, somatotype.y)
      : null;

  const mesoApex = getPixelCoord(0, 12);
  const endoApex = getPixelCoord(-6, -6);
  const ectoApex = getPixelCoord(6, -6);

  const reuleauxRadius = 12 * scaleX; // 372 px

  const somatocartaPath = `M ${endoApex.px} ${endoApex.py} A ${reuleauxRadius} ${reuleauxRadius} 0 0 0 ${ectoApex.px} ${ectoApex.py} A ${reuleauxRadius} ${reuleauxRadius} 0 0 0 ${mesoApex.px} ${mesoApex.py} A ${reuleauxRadius} ${reuleauxRadius} 0 0 0 ${endoApex.px} ${endoApex.py} Z`;

  // Ticks X
  const renderXTicks = (yPos: number, isTop: boolean): string => {
    let ticksStr = '';
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

      ticksStr += `<line x1="${px.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${px.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#000000" stroke-width="${strokeW}" />\n`;

      if (isInteger && roundedX >= -8 && roundedX <= 8) {
        const intVal = Math.round(roundedX);
        const labelText = intVal === 0 ? '0' : intVal > 0 ? `+${intVal}` : `${intVal}`;
        const labelY = isTop ? yPos - 8 : yPos + 18;
        ticksStr += `<text x="${px.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" fill="#000000" font-size="12.5" font-weight="bold" font-family="Arial, Helvetica, sans-serif">${labelText}</text>\n`;
      }
    }
    return ticksStr;
  };

  // Ticks Y
  const renderYTicks = (xPos: number, isLeft: boolean): string => {
    let ticksStr = '';
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

      ticksStr += `<line x1="${x1.toFixed(1)}" y1="${py.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${py.toFixed(1)}" stroke="#000000" stroke-width="${strokeW}" />\n`;

      if (isInteger && roundedY >= -10 && roundedY <= 16 && Math.round(roundedY) % 2 === 0) {
        const intVal = Math.round(roundedY);
        const labelText = intVal === 0 ? '0' : intVal > 0 ? `+${intVal}` : `${intVal}`;
        const labelX = isLeft ? xPos - 7 : xPos + 7;
        const textAnchor = isLeft ? 'end' : 'start';
        ticksStr += `<text x="${labelX.toFixed(1)}" y="${(py + 4.0).toFixed(1)}" text-anchor="${textAnchor}" fill="#000000" font-size="12.5" font-weight="bold" font-family="Arial, Helvetica, sans-serif">${labelText}</text>\n`;
      }
    }
    return ticksStr;
  };

  let patientProjectionsSvg = '';
  if (patientPoint && showProjections) {
    patientProjectionsSvg = `
      <!-- Proyecciones del paciente -->
      <line x1="${patientPoint.px.toFixed(1)}" y1="${boxY0}" x2="${patientPoint.px.toFixed(1)}" y2="${boxYBottom}" stroke="#dc2626" stroke-width="1.2" stroke-dasharray="4,3" opacity="0.8" />
      <line x1="${boxX0}" y1="${patientPoint.py.toFixed(1)}" x2="${boxXRight}" y2="${patientPoint.py.toFixed(1)}" stroke="#dc2626" stroke-width="1.2" stroke-dasharray="4,3" opacity="0.8" />

      <!-- Indicador Eje X -->
      <rect x="${(patientPoint.px - 18).toFixed(1)}" y="${boxY0 - 24}" width="36" height="14" rx="3" fill="#dc2626" />
      <text x="${patientPoint.px.toFixed(1)}" y="${boxY0 - 14}" text-anchor="middle" fill="#ffffff" font-size="9" font-weight="bold" font-family="Arial, Helvetica, sans-serif">${somatotype.x?.toFixed(1)}</text>

      <!-- Indicador Eje Y -->
      <rect x="${boxX0 - 32}" y="${(patientPoint.py - 7).toFixed(1)}" width="28" height="14" rx="3" fill="#dc2626" />
      <text x="${boxX0 - 18}" y="${(patientPoint.py + 3.5).toFixed(1)}" text-anchor="middle" fill="#ffffff" font-size="9" font-weight="bold" font-family="Arial, Helvetica, sans-serif">${somatotype.y?.toFixed(1)}</text>
    `;
  }

  let patientMarkerSvg = '';
  if (patientPoint) {
    patientMarkerSvg = `
      <!-- Marcador del paciente: solo el punto -->
      <g id="patient-marker">
        <circle cx="${patientPoint.px.toFixed(1)}" cy="${patientPoint.py.toFixed(1)}" r="6" fill="#dc2626" stroke="#ffffff" stroke-width="2" />
      </g>
    `;
  } else {
    patientMarkerSvg = `
      <g id="empty-state-notice">
        <rect x="${originX - 110}" y="${originY - 24}" width="220" height="48" rx="6" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
        <text x="${originX}" y="${originY}" text-anchor="middle" fill="#334155" font-size="11" font-weight="bold" font-family="Arial, Helvetica, sans-serif">
          Punto no ubicado aún
        </text>
        <text x="${originX}" y="${originY + 14}" text-anchor="middle" fill="#64748b" font-size="9" font-family="Arial, Helvetica, sans-serif">
          Faltan mediciones antropométricas
        </text>
      </g>
    `;
  }

  const zonesSvg = chartMode === 'zones'
    ? `
      <g id="zones-overlay">
        <path d="M ${originX} ${originY} L ${endoApex.px + 50} ${endoApex.py - 100} A ${reuleauxRadius} ${reuleauxRadius} 0 0 0 ${mesoApex.px} ${mesoApex.py} A ${reuleauxRadius} ${reuleauxRadius} 0 0 0 ${ectoApex.px - 50} ${ectoApex.py - 100} Z" fill="#e0f2fe" fill-opacity="0.6" />
        <path d="M ${originX} ${originY} L ${originX} ${originY + 157} A ${reuleauxRadius} ${reuleauxRadius} 0 0 1 ${endoApex.px} ${endoApex.py} A ${reuleauxRadius} ${reuleauxRadius} 0 0 1 ${endoApex.px + 50} ${endoApex.py - 100} Z" fill="#fef3c7" fill-opacity="0.6" />
        <path d="M ${originX} ${originY} L ${originX} ${originY + 157} A ${reuleauxRadius} ${reuleauxRadius} 0 0 0 ${ectoApex.px} ${ectoApex.py} A ${reuleauxRadius} ${reuleauxRadius} 0 0 0 ${ectoApex.px - 50} ${ectoApex.py - 100} Z" fill="#f3e8ff" fill-opacity="0.6" />
        <circle cx="${originX}" cy="${originY}" r="28" fill="#d1fae5" fill-opacity="0.65" stroke="#10b981" stroke-width="1.2" stroke-dasharray="3,3" />
      </g>
    `
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}" style="background-color: #ffffff;">
  <!-- Fondo blanco -->
  <rect width="${svgWidth}" height="${svgHeight}" fill="#ffffff" />

  <!-- Marco Exterior Cuadrado -->
  <rect x="${boxX0}" y="${boxY0}" width="${boxW}" height="${boxH}" fill="#ffffff" stroke="#000000" stroke-width="2.5" />

  ${zonesSvg}

  <!-- Triángulo Curvilíneo de Carter & Heath (Reuleaux) -->
  <path d="${somatocartaPath}" fill="${chartMode === 'zones' ? 'none' : '#ffffff'}" stroke="#000000" stroke-width="2.2" />

  <!-- Eje Vertical Mesomorfismo -->
  <line x1="${originX}" y1="87" x2="${originX}" y2="${mesoApex.py}" stroke="#000000" stroke-width="1" />
  <line x1="${originX}" y1="${mesoApex.py}" x2="${originX}" y2="${originY}" stroke="#000000" stroke-width="1.6" />
  <line x1="${originX}" y1="${originY}" x2="${originX}" y2="522.2" stroke="#000000" stroke-width="1.3" stroke-dasharray="6,4" />

  <!-- Eje Diagonal Endomorfismo -->
  <line x1="73.5" y1="499.2" x2="${endoApex.px}" y2="${endoApex.py}" stroke="#000000" stroke-width="1" />
  <line x1="${endoApex.px}" y1="${endoApex.py}" x2="${originX}" y2="${originY}" stroke="#000000" stroke-width="1.6" />
  <line x1="${originX}" y1="${originY}" x2="498" y2="254" stroke="#000000" stroke-width="1.3" stroke-dasharray="6,4" />

  <!-- Eje Diagonal Ectomorfismo -->
  <line x1="538.5" y1="499.2" x2="${ectoApex.px}" y2="${ectoApex.py}" stroke="#000000" stroke-width="1" />
  <line x1="${ectoApex.px}" y1="${ectoApex.py}" x2="${originX}" y2="${originY}" stroke="#000000" stroke-width="1.6" />
  <line x1="${originX}" y1="${originY}" x2="114" y2="254" stroke="#000000" stroke-width="1.3" stroke-dasharray="6,4" />

  <!-- Etiquetas de los Vértices del Somatotipo -->
  <!-- 1. MESOMORFISMO -->
  <rect x="${originX - 82}" y="114" width="164" height="30" rx="6" fill="#ffffff" stroke="#0f172a" stroke-width="1.8" />
  <circle cx="${originX - 64}" cy="129" r="4" fill="#0284c7" />
  <text x="${originX + 6}" y="134" text-anchor="middle" fill="#0f172a" font-size="14.5" font-weight="900" letter-spacing="1" font-family="Arial, Helvetica, sans-serif">MESOMORFISMO</text>

  <!-- 2. ENDOMORFISMO -->
  <rect x="${124 - 82}" y="498" width="164" height="30" rx="6" fill="#ffffff" stroke="#0f172a" stroke-width="1.8" />
  <circle cx="${124 - 64}" cy="513" r="4" fill="#d97706" />
  <text x="${124 + 6}" y="518" text-anchor="middle" fill="#0f172a" font-size="14.5" font-weight="900" letter-spacing="1" font-family="Arial, Helvetica, sans-serif">ENDOMORFISMO</text>

  <!-- 3. ECTOMORFISMO -->
  <rect x="${488 - 82}" y="498" width="164" height="30" rx="6" fill="#ffffff" stroke="#0f172a" stroke-width="1.8" />
  <circle cx="${488 - 64}" cy="513" r="4" fill="#7c3aed" />
  <text x="${488 + 6}" y="518" text-anchor="middle" fill="#0f172a" font-size="14.5" font-weight="900" letter-spacing="1" font-family="Arial, Helvetica, sans-serif">ECTOMORFISMO</text>

  <!-- Reglas Graduadas (Ticks & Números) -->
  ${renderXTicks(boxY0, true)}
  ${renderXTicks(boxYBottom, false)}
  ${renderYTicks(boxX0, true)}
  ${renderYTicks(boxXRight, false)}

  ${patientProjectionsSvg}
  ${patientMarkerSvg}
</svg>`;
}

/**
 * Convierte un string SVG a Data URL PNG (en el navegador)
 */
export function somatocartaSvgToPngDataUrl(svgString: string, size = 612): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve('');
      return;
    }

    const timer = setTimeout(() => {
      resolve('');
    }, 1200);

    try {
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(url);
            resolve('');
            return;
          }
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, size, size);
          ctx.drawImage(img, 0, 0, size, size);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          URL.revokeObjectURL(url);
          resolve('');
        }
      };

      img.onerror = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        resolve('');
      };

      img.src = url;
    } catch {
      clearTimeout(timer);
      resolve('');
    }
  });
}

/**
 * Genera directamente el Data URL PNG a partir del resultado del somatotipo
 */
export async function getSomatocartaPngDataUrl(
  somatotype: HeathCarterSomatotypeResult,
  size = 612,
  options?: SomatocartaOptions
): Promise<string> {
  const svgStr = generateSomatocartaSvgString(somatotype, options);
  return await somatocartaSvgToPngDataUrl(svgStr, size);
}

/**
 * Convierte un Data URL a Uint8Array (para incrustar en docx / ImageRun)
 */
export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  if (!dataUrl || !dataUrl.includes(',')) {
    return new Uint8Array(0);
  }
  const base64 = dataUrl.split(',')[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

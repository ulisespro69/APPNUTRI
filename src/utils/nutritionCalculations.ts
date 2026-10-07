import { TableGridState, SMAE_GROUPS, MEAL_COLUMNS } from '../data/smaeData';
import { MealKey, MacroNutrientSummary, MealOptionLetter, PatientInfo, SkinfoldMeasurements, GirthMeasurements, BreadthMeasurements, ManualNutrientEntry, ProteinSupplementInfo } from '../types';
import { parseAndScalePortion, getGroupBadgeConfig, detectTrueSMAEGroup, detectIngredientRole } from './smaeRectifier';

export function calculateRowTotal(groupId: string, tableState: TableGridState): number {
  const row = tableState[groupId];
  if (!row) return 0;
  return MEAL_COLUMNS.reduce((sum, col) => sum + (Number(row[col.key]) || 0), 0);
}

export function calculateColumnTotal(mealKey: MealKey, tableState: TableGridState): number {
  return SMAE_GROUPS.reduce((sum, group) => {
    const val = Number(tableState[group.id]?.[mealKey]) || 0;
    return sum + val;
  }, 0);
}

export function calculateGrandTotalEquivalents(tableState: TableGridState): number {
  return SMAE_GROUPS.reduce((sum, group) => {
    return sum + calculateRowTotal(group.id, tableState);
  }, 0);
}

export interface BmiInfo {
  value: number;
  formatted: string;
  category: string;
  colorClass: string;
}

export function calculateBmiInfo(heightStr?: string, weightStr?: string): BmiInfo | null {
  if (!heightStr || !weightStr) return null;
  const weightMatch = weightStr.replace(',', '.').match(/\d+(\.\d+)?/);
  const heightMatch = heightStr.replace(',', '.').match(/\d+(\.\d+)?/);
  if (!weightMatch || !heightMatch) return null;
  const w = parseFloat(weightMatch[0]);
  let h = parseFloat(heightMatch[0]);
  if (h > 3) h = h / 100;
  if (h <= 0.5 || h >= 2.6 || w <= 15 || w >= 350) return null;
  const imc = Math.round((w / (h * h)) * 10) / 10;
  let category = 'Normal';
  let colorClass = 'text-emerald-800 bg-emerald-100 border-emerald-300';
  if (imc < 18.5) {
    category = 'Bajo peso';
    colorClass = 'text-amber-800 bg-amber-100 border-amber-300';
  } else if (imc >= 25 && imc < 30) {
    category = 'Sobrepeso';
    colorClass = 'text-amber-800 bg-amber-100 border-amber-300';
  } else if (imc >= 30) {
    category = 'Obesidad';
    colorClass = 'text-rose-800 bg-rose-100 border-rose-300';
  }
  return {
    value: imc,
    formatted: `${imc.toFixed(1)} kg/m²`,
    category,
    colorClass,
  };
}

export interface SkinfoldSums {
  sum3: string | null;
  sum4: string | null;
  sum6: string | null;
  sum3Value: number | null;
  sum4Value: number | null;
  sum6Value: number | null;
  count3: number;
  count4: number;
  count6: number;
  isComplete3: boolean;
  isComplete4: boolean;
  isComplete6: boolean;
  hasAny3: boolean;
  hasAny4: boolean;
  hasAny6: boolean;
}

export function calculateSkinfoldSums(skinfolds?: SkinfoldMeasurements): SkinfoldSums {
  if (!skinfolds) {
    return {
      sum3: null,
      sum4: null,
      sum6: null,
      sum3Value: null,
      sum4Value: null,
      sum6Value: null,
      count3: 0,
      count4: 0,
      count6: 0,
      isComplete3: false,
      isComplete4: false,
      isComplete6: false,
      hasAny3: false,
      hasAny4: false,
      hasAny6: false,
    };
  }

  const parseNum = (val?: string): number | null => {
    if (!val || typeof val !== 'string') return null;
    const clean = val.replace(',', '.').trim();
    const n = parseFloat(clean);
    return isNaN(n) || n <= 0 ? null : n;
  };

  // Σ3 Pliegues: Subescapular + Supraespinal + Abdominal
  const sub = parseNum(skinfolds.subescapular);
  const supra = parseNum(skinfolds.supraespinal);
  const abd = parseNum(skinfolds.abdominal);

  // Σ4 Pliegues (Durnin & Womersley): Tríceps + Subescapular + Bíceps + Cresta Ilíaca
  const tri = parseNum(skinfolds.triceps);
  const bi = parseNum(skinfolds.biceps);
  const cresta = parseNum(skinfolds.crestaIliaca);

  // Σ6 Pliegues: Tríceps + Subescapular + Supraespinal + Abdominal + Muslo frontal + Pantorrilla medial
  const muslo = parseNum(skinfolds.musloFrontal);
  const pant = parseNum(skinfolds.pantorrillaMedial);

  const count3 = (sub !== null ? 1 : 0) + (supra !== null ? 1 : 0) + (abd !== null ? 1 : 0);
  const hasAny3 = count3 > 0;
  const isComplete3 = count3 === 3;
  const sum3Val = hasAny3 ? Math.round(((sub || 0) + (supra || 0) + (abd || 0)) * 10) / 10 : null;
  const sum3 = sum3Val !== null ? `${sum3Val.toFixed(1)} mm` : null;

  const count4 = (tri !== null ? 1 : 0) + (sub !== null ? 1 : 0) + (bi !== null ? 1 : 0) + (cresta !== null ? 1 : 0);
  const hasAny4 = count4 > 0;
  const isComplete4 = count4 === 4;
  const sum4Val = hasAny4 ? Math.round(((tri || 0) + (sub || 0) + (bi || 0) + (cresta || 0)) * 10) / 10 : null;
  const sum4 = sum4Val !== null ? `${sum4Val.toFixed(1)} mm` : null;

  const count6 = count3 + (tri !== null ? 1 : 0) + (muslo !== null ? 1 : 0) + (pant !== null ? 1 : 0);
  const hasAny6 = count6 > 0;
  const isComplete6 = count6 === 6;
  const sum6Val = hasAny6
    ? Math.round(((sub || 0) + (supra || 0) + (abd || 0) + (tri || 0) + (muslo || 0) + (pant || 0)) * 10) / 10
    : null;
  const sum6 = sum6Val !== null ? `${sum6Val.toFixed(1)} mm` : null;

  return {
    sum3,
    sum4,
    sum6,
    sum3Value: sum3Val,
    sum4Value: sum4Val,
    sum6Value: sum6Val,
    count3,
    count4,
    count6,
    isComplete3,
    isComplete4,
    isComplete6,
    hasAny3,
    hasAny4,
    hasAny6,
  };
}

export interface BodyFatFormulaInfo {
  id: 'durnin' | 'sloan' | 'wilmore' | 'jackson' | 'lewis' | 'thorland' | 'forsyth' | 'yuhasz';
  name: string;
  shortName: string;
  equationBadge: string;
  bodyFatPercent: string | null;
  dc: number | null;
  isComplete: boolean;
  detailText: string;
  missingText: string | null;
  population: string;
  caliper: string;
  reference: string;
}

export function calculateDurninWomersley(
  skinfolds: SkinfoldMeasurements | undefined,
  gender: string | undefined
): { bodyFatPercent: string | null; sum4: number; count4: number; dc: number | null; missingText: string | null } {
  if (!skinfolds) {
    return { bodyFatPercent: null, sum4: 0, count4: 0, dc: null, missingText: 'Faltan 4 pliegues' };
  }

  const parseOrNull = (val?: string) => {
    if (!val) return null;
    const parsed = parseFloat(val.replace(',', '.'));
    return isNaN(parsed) || parsed <= 0 ? null : parsed;
  };

  const triceps = parseOrNull(skinfolds.triceps);
  const biceps = parseOrNull(skinfolds.biceps);
  const subescapular = parseOrNull(skinfolds.subescapular);
  const crestaIliaca = parseOrNull(skinfolds.crestaIliaca);

  const missing: string[] = [];
  if (triceps === null) missing.push('Tríceps');
  if (biceps === null) missing.push('Bíceps');
  if (subescapular === null) missing.push('Subescapular');
  if (crestaIliaca === null) missing.push('Cresta Ilíaca');

  const count4 = 4 - missing.length;
  const values = [triceps, biceps, subescapular, crestaIliaca];
  const sum4 = values.reduce((acc: number, val) => acc + (val || 0), 0);

  const isMale = gender?.toLowerCase() === 'hombre' || gender?.toLowerCase() === 'masculino' || gender?.toLowerCase() === 'm';
  const isFemale = gender?.toLowerCase() === 'mujer' || gender?.toLowerCase() === 'femenino' || gender?.toLowerCase() === 'f';

  if (!isMale && !isFemale) {
    return {
      bodyFatPercent: null,
      sum4,
      count4,
      dc: null,
      missingText: count4 === 4 ? 'Requiere definir Sexo' : `Falta: ${missing.join(', ')} y Sexo`,
    };
  }

  if (count4 < 4) {
    return {
      bodyFatPercent: null,
      sum4,
      count4,
      dc: null,
      missingText: `Falta: ${missing.join(', ')}`,
    };
  }

  const logSum4 = Math.log10(sum4);
  const dc = isMale ? 1.1765 - 0.0744 * logSum4 : 1.1567 - 0.0717 * logSum4;
  const fatPercent = (495 / dc) - 450;

  return {
    bodyFatPercent: Math.max(0, fatPercent).toFixed(1),
    sum4: parseFloat(sum4.toFixed(1)),
    count4: 4,
    dc: parseFloat(dc.toFixed(4)),
    missingText: null,
  };
}

export function calculateSloanBurtBlyth(
  skinfolds: SkinfoldMeasurements | undefined,
  gender: string | undefined
): { bodyFatPercent: string | null; dc: number | null; isComplete: boolean; missingText: string | null; detailText: string } {
  const parseOrNull = (val?: string) => {
    if (!val) return null;
    const parsed = parseFloat(val.replace(',', '.'));
    return isNaN(parsed) || parsed <= 0 ? null : parsed;
  };

  const isMale = gender?.toLowerCase() === 'hombre' || gender?.toLowerCase() === 'masculino' || gender?.toLowerCase() === 'm';
  const isFemale = gender?.toLowerCase() === 'mujer' || gender?.toLowerCase() === 'femenino' || gender?.toLowerCase() === 'f';

  if (!isMale && !isFemale) {
    return {
      bodyFatPercent: null,
      dc: null,
      isComplete: false,
      missingText: 'Requiere definir Sexo',
      detailText: 'Hombre: Muslo+Sub | Mujer: Cresta+Trí',
    };
  }

  if (isMale) {
    // Hombre: DC= 1.1043 – 0.001327 (pliegue de muslo frontal) – 0.001310 (pliegue subescapular)
    // %GC = 457/DC − 414.2
    const muslo = parseOrNull(skinfolds?.musloFrontal);
    const sub = parseOrNull(skinfolds?.subescapular);
    const missing: string[] = [];
    if (muslo === null) missing.push('Muslo Frontal');
    if (sub === null) missing.push('Subescapular');

    if (missing.length > 0) {
      return {
        bodyFatPercent: null,
        dc: null,
        isComplete: false,
        missingText: `Falta: ${missing.join(', ')}`,
        detailText: 'Muslo frontal + Subescapular',
      };
    }

    const dc = 1.1043 - (0.001327 * muslo!) - (0.001310 * sub!);
    const fatPercent = (457 / dc) - 414.2;

    return {
      bodyFatPercent: Math.max(0, fatPercent).toFixed(1),
      dc: parseFloat(dc.toFixed(4)),
      isComplete: true,
      missingText: null,
      detailText: `DC = ${dc.toFixed(4)} (Brozek)`,
    };
  } else {
    // Mujer: DC= 1.0764 – 0.00081 (pliegue de cresta iliaca) – 0.00088 (pliegue del tríceps)
    // %GC = 457/DC − 414.2
    const cresta = parseOrNull(skinfolds?.crestaIliaca);
    const triceps = parseOrNull(skinfolds?.triceps);
    const missing: string[] = [];
    if (cresta === null) missing.push('Cresta Ilíaca');
    if (triceps === null) missing.push('Tríceps');

    if (missing.length > 0) {
      return {
        bodyFatPercent: null,
        dc: null,
        isComplete: false,
        missingText: `Falta: ${missing.join(', ')}`,
        detailText: 'Cresta ilíaca + Tríceps',
      };
    }

    const dc = 1.0764 - (0.00081 * cresta!) - (0.00088 * triceps!);
    const fatPercent = (457 / dc) - 414.2;

    return {
      bodyFatPercent: Math.max(0, fatPercent).toFixed(1),
      dc: parseFloat(dc.toFixed(4)),
      isComplete: true,
      missingText: null,
      detailText: `DC = ${dc.toFixed(4)} (Brozek)`,
    };
  }
}

export function calculateWilmoreBehnke(
  skinfolds: SkinfoldMeasurements | undefined,
  gender: string | undefined
): { bodyFatPercent: string | null; dc: number | null; isComplete: boolean; missingText: string | null; detailText: string } {
  const parseOrNull = (val?: string) => {
    if (!val) return null;
    const parsed = parseFloat(val.replace(',', '.'));
    return isNaN(parsed) || parsed <= 0 ? null : parsed;
  };

  const isMale = gender?.toLowerCase() === 'hombre' || gender?.toLowerCase() === 'masculino' || gender?.toLowerCase() === 'm';
  const isFemale = gender?.toLowerCase() === 'mujer' || gender?.toLowerCase() === 'femenino' || gender?.toLowerCase() === 'f';

  if (!isMale && !isFemale) {
    return {
      bodyFatPercent: null,
      dc: null,
      isComplete: false,
      missingText: 'Requiere definir Sexo',
      detailText: 'Hombre: Abd+Muslo | Mujer: Sub+Trí+Muslo',
    };
  }

  if (isMale) {
    // Hombre: DC= 1.08543 – 0.000886 (pliegue abdominal) – 0.00040 (pliegue de muslo frontal)
    // %GC = 495/DC – 450
    const abdominal = parseOrNull(skinfolds?.abdominal);
    const muslo = parseOrNull(skinfolds?.musloFrontal);
    const missing: string[] = [];
    if (abdominal === null) missing.push('Abdominal');
    if (muslo === null) missing.push('Muslo Frontal');

    if (missing.length > 0) {
      return {
        bodyFatPercent: null,
        dc: null,
        isComplete: false,
        missingText: `Falta: ${missing.join(', ')}`,
        detailText: 'Abdominal + Muslo frontal',
      };
    }

    const dc = 1.08543 - (0.000886 * abdominal!) - (0.00040 * muslo!);
    const fatPercent = (495 / dc) - 450;

    return {
      bodyFatPercent: Math.max(0, fatPercent).toFixed(1),
      dc: parseFloat(dc.toFixed(4)),
      isComplete: true,
      missingText: null,
      detailText: `DC = ${dc.toFixed(4)} (Siri)`,
    };
  } else {
    // Mujer: DC= 1.06234 – 0.00068 (pliegue de subescapular) – 0.00039 (pliegue de tríceps) – 0.00025 (pliegue de muslo frontal)
    // %GC = 495/DC – 450
    const sub = parseOrNull(skinfolds?.subescapular);
    const triceps = parseOrNull(skinfolds?.triceps);
    const muslo = parseOrNull(skinfolds?.musloFrontal);
    const missing: string[] = [];
    if (sub === null) missing.push('Subescapular');
    if (triceps === null) missing.push('Tríceps');
    if (muslo === null) missing.push('Muslo Frontal');

    if (missing.length > 0) {
      return {
        bodyFatPercent: null,
        dc: null,
        isComplete: false,
        missingText: `Falta: ${missing.join(', ')}`,
        detailText: 'Subescapular + Tríceps + Muslo',
      };
    }

    const dc = 1.06234 - (0.00068 * sub!) - (0.00039 * triceps!) - (0.00025 * muslo!);
    const fatPercent = (495 / dc) - 450;

    return {
      bodyFatPercent: Math.max(0, fatPercent).toFixed(1),
      dc: parseFloat(dc.toFixed(4)),
      isComplete: true,
      missingText: null,
      detailText: `DC = ${dc.toFixed(4)} (Siri)`,
    };
  }
}

export function calculateJacksonPollock(
  skinfolds: SkinfoldMeasurements | undefined,
  gender: string | undefined,
  ageStr: string | undefined
): { bodyFatPercent: string | null; dc: number | null; isComplete: boolean; missingText: string | null; detailText: string } {
  const parseOrNull = (val?: string) => {
    if (!val) return null;
    const parsed = parseFloat(val.replace(',', '.'));
    return isNaN(parsed) || parsed <= 0 ? null : parsed;
  };

  const isMale = gender?.toLowerCase() === 'hombre' || gender?.toLowerCase() === 'masculino' || gender?.toLowerCase() === 'm';
  const isFemale = gender?.toLowerCase() === 'mujer' || gender?.toLowerCase() === 'femenino' || gender?.toLowerCase() === 'f';
  const age = ageStr ? parseFloat(ageStr.replace(',', '.')) : NaN;
  const hasValidAge = !isNaN(age) && age > 0;

  if (!isMale && !isFemale) {
    return {
      bodyFatPercent: null,
      dc: null,
      isComplete: false,
      missingText: 'Requiere definir Sexo',
      detailText: 'Hombre: 7 pliegues | Mujer: 4 pliegues',
    };
  }

  if (isMale) {
    // Hombre: DC= 1.112 - 0.00043499*(Pectoral + Axilar + Tríceps + Subescapular + Abdominal + Cresta Iliaca + Muslo Frontal)
    // + 0.00000055*(suma)^2 - 0.00028826*EDAD
    // %GC= (495 / Resultado) – 450
    const pectoral = parseOrNull(skinfolds?.pectoral);
    const axilar = parseOrNull(skinfolds?.axilar);
    const triceps = parseOrNull(skinfolds?.triceps);
    const sub = parseOrNull(skinfolds?.subescapular);
    const abdominal = parseOrNull(skinfolds?.abdominal);
    const cresta = parseOrNull(skinfolds?.crestaIliaca);
    const muslo = parseOrNull(skinfolds?.musloFrontal);

    const missing: string[] = [];
    if (pectoral === null) missing.push('Pectoral');
    if (axilar === null) missing.push('Axilar');
    if (triceps === null) missing.push('Tríceps');
    if (sub === null) missing.push('Subescapular');
    if (abdominal === null) missing.push('Abdominal');
    if (cresta === null) missing.push('Cresta Ilíaca');
    if (muslo === null) missing.push('Muslo Frontal');
    if (!hasValidAge) missing.push('Edad');

    if (missing.length > 0) {
      return {
        bodyFatPercent: null,
        dc: null,
        isComplete: false,
        missingText: `Falta: ${missing.join(', ')}`,
        detailText: 'Hombre: 7 pliegues + Edad',
      };
    }

    const sum7 = pectoral! + axilar! + triceps! + sub! + abdominal! + cresta! + muslo!;
    const dc = 1.112 - (0.00043499 * sum7) + (0.00000055 * sum7 * sum7) - (0.00028826 * age);
    const fatPercent = (495 / dc) - 450;

    return {
      bodyFatPercent: Math.max(0, fatPercent).toFixed(1),
      dc: parseFloat(dc.toFixed(4)),
      isComplete: true,
      missingText: null,
      detailText: `Σ7 = ${sum7.toFixed(1)} mm (DC: ${dc.toFixed(4)})`,
    };
  } else {
    // Mujeres: DC= 1.096095 - 0.0006952*(Tríceps + Cresta Iliaca + Abdominal + Muslo Frontal)
    // + 0.0000011*(suma)^2 - 0.0000714*EDAD
    // %GC= (495 / Resultado) – 450
    const triceps = parseOrNull(skinfolds?.triceps);
    const cresta = parseOrNull(skinfolds?.crestaIliaca);
    const abdominal = parseOrNull(skinfolds?.abdominal);
    const muslo = parseOrNull(skinfolds?.musloFrontal);

    const missing: string[] = [];
    if (triceps === null) missing.push('Tríceps');
    if (cresta === null) missing.push('Cresta Ilíaca');
    if (abdominal === null) missing.push('Abdominal');
    if (muslo === null) missing.push('Muslo Frontal');
    if (!hasValidAge) missing.push('Edad');

    if (missing.length > 0) {
      return {
        bodyFatPercent: null,
        dc: null,
        isComplete: false,
        missingText: `Falta: ${missing.join(', ')}`,
        detailText: 'Mujer: 4 pliegues + Edad',
      };
    }

    const sum4 = triceps! + cresta! + abdominal! + muslo!;
    const dc = 1.096095 - (0.0006952 * sum4) + (0.0000011 * sum4 * sum4) - (0.0000714 * age);
    const fatPercent = (495 / dc) - 450;

    return {
      bodyFatPercent: Math.max(0, fatPercent).toFixed(1),
      dc: parseFloat(dc.toFixed(4)),
      isComplete: true,
      missingText: null,
      detailText: `Σ4 = ${sum4.toFixed(1)} mm (DC: ${dc.toFixed(4)})`,
    };
  }
}

export function calculateLewis(
  skinfolds: SkinfoldMeasurements | undefined,
  heightStr: string | undefined,
  girths: GirthMeasurements | undefined,
  gender?: string | undefined
): { bodyFatPercent: string | null; dc: number | null; isComplete: boolean; missingText: string | null; detailText: string } {
  // LEWIS:
  // DC= 0.97845 – 0.0002(Pliegue de triceps) + 0.00088(Estatura) – 0.00122(pliegue subescapular) – 0.00234(circunferencia de brazo relajado)
  // %GC= (4.95/DC – 4.50) x100
  // Validación: Solo aplica en mujeres
  const isMale = gender?.toLowerCase() === 'hombre' || gender?.toLowerCase() === 'masculino' || gender?.toLowerCase() === 'm';
  const isFemale = gender?.toLowerCase() === 'mujer' || gender?.toLowerCase() === 'femenino' || gender?.toLowerCase() === 'f';

  if (isMale) {
    return {
      bodyFatPercent: null,
      dc: null,
      isComplete: false,
      missingText: 'No aplica en hombres',
      detailText: 'Fórmula validada sólo para mujeres',
    };
  }

  if (!isFemale) {
    return {
      bodyFatPercent: null,
      dc: null,
      isComplete: false,
      missingText: 'Sólo aplica en mujeres',
      detailText: 'Requiere sexo: Mujer',
    };
  }

  const parseOrNull = (val?: string) => {
    if (!val) return null;
    const parsed = parseFloat(val.replace(',', '.'));
    return isNaN(parsed) || parsed <= 0 ? null : parsed;
  };

  const triceps = parseOrNull(skinfolds?.triceps);
  const sub = parseOrNull(skinfolds?.subescapular);
  const rawHeight = parseOrNull(heightStr);
  const brazo = parseOrNull(girths?.brazoRelajado);

  const missing: string[] = [];
  if (triceps === null) missing.push('Tríceps');
  if (sub === null) missing.push('Subescapular');
  if (rawHeight === null) missing.push('Estatura');
  if (brazo === null) missing.push('Brazo Relajado');

  if (missing.length > 0) {
    return {
      bodyFatPercent: null,
      dc: null,
      isComplete: false,
      missingText: `Falta: ${missing.join(', ')}`,
      detailText: 'Mujer: Tríceps + Sub + Estatura + Brazo',
    };
  }

  // Estatura en cm (si se ingresó e.g. 1.75 en vez de 175)
  const heightCm = rawHeight! < 3 ? rawHeight! * 100 : rawHeight!;
  const dc = 0.97845 - (0.0002 * triceps!) + (0.00088 * heightCm) - (0.00122 * sub!) - (0.00234 * brazo!);
  const fatPercent = ((4.95 / dc) - 4.50) * 100;

  return {
    bodyFatPercent: Math.max(0, fatPercent).toFixed(1),
    dc: parseFloat(dc.toFixed(4)),
    isComplete: true,
    missingText: null,
    detailText: `DC = ${dc.toFixed(4)} (Mujer)`,
  };
}

export function calculateThorland(
  skinfolds: SkinfoldMeasurements | undefined,
  gender: string | undefined
): { bodyFatPercent: string | null; dc: number | null; isComplete: boolean; missingText: string | null; detailText: string } {
  // Thorland
  const parseOrNull = (val?: string) => {
    if (!val) return null;
    const parsed = parseFloat(val.replace(',', '.'));
    return isNaN(parsed) || parsed <= 0 ? null : parsed;
  };

  const isMale = gender?.toLowerCase() === 'hombre' || gender?.toLowerCase() === 'masculino' || gender?.toLowerCase() === 'm';
  const isFemale = gender?.toLowerCase() === 'mujer' || gender?.toLowerCase() === 'femenino' || gender?.toLowerCase() === 'f';

  if (!isMale && !isFemale) {
    return {
      bodyFatPercent: null,
      dc: null,
      isComplete: false,
      missingText: 'Requiere definir Sexo',
      detailText: 'Hombre: 7 pliegues | Mujer: 3 pliegues',
    };
  }

  if (isMale) {
    // DC Hombres: 1.1091 – 0.00052(tríceps + subescapular + axilar + cresta iliaca + abdominal + muslo frontal + pantorrilla)
    // + 0.00000032(suma)^2
    // %GC= (4.95/DC – 4.50) x100
    const triceps = parseOrNull(skinfolds?.triceps);
    const sub = parseOrNull(skinfolds?.subescapular);
    const axilar = parseOrNull(skinfolds?.axilar);
    const cresta = parseOrNull(skinfolds?.crestaIliaca);
    const abdominal = parseOrNull(skinfolds?.abdominal);
    const muslo = parseOrNull(skinfolds?.musloFrontal);
    const pantorrilla = parseOrNull(skinfolds?.pantorrillaMedial);

    const missing: string[] = [];
    if (triceps === null) missing.push('Tríceps');
    if (sub === null) missing.push('Subescapular');
    if (axilar === null) missing.push('Axilar');
    if (cresta === null) missing.push('Cresta Ilíaca');
    if (abdominal === null) missing.push('Abdominal');
    if (muslo === null) missing.push('Muslo Frontal');
    if (pantorrilla === null) missing.push('Pantorrilla');

    if (missing.length > 0) {
      return {
        bodyFatPercent: null,
        dc: null,
        isComplete: false,
        missingText: `Falta: ${missing.join(', ')}`,
        detailText: 'Hombre: 7 pliegues',
      };
    }

    const sum7 = triceps! + sub! + axilar! + cresta! + abdominal! + muslo! + pantorrilla!;
    const dc = 1.1091 - (0.00052 * sum7) + (0.00000032 * sum7 * sum7);
    const fatPercent = ((4.95 / dc) - 4.50) * 100;

    return {
      bodyFatPercent: Math.max(0, fatPercent).toFixed(1),
      dc: parseFloat(dc.toFixed(4)),
      isComplete: true,
      missingText: null,
      detailText: `Σ7 = ${sum7.toFixed(1)} mm (DC: ${dc.toFixed(4)})`,
    };
  } else {
    // DC Mujeres: 1.0987 – 0.00122(tríceps + subescapular + cresta iliaca) + 0.00000263(suma)^2
    // %GC= (4.95/DC – 4.50) x100
    const triceps = parseOrNull(skinfolds?.triceps);
    const sub = parseOrNull(skinfolds?.subescapular);
    const cresta = parseOrNull(skinfolds?.crestaIliaca);

    const missing: string[] = [];
    if (triceps === null) missing.push('Tríceps');
    if (sub === null) missing.push('Subescapular');
    if (cresta === null) missing.push('Cresta Ilíaca');

    if (missing.length > 0) {
      return {
        bodyFatPercent: null,
        dc: null,
        isComplete: false,
        missingText: `Falta: ${missing.join(', ')}`,
        detailText: 'Tríceps + Subescapular + Cresta',
      };
    }

    const sum3 = triceps! + sub! + cresta!;
    const dc = 1.0987 - (0.00122 * sum3) + (0.00000263 * sum3 * sum3);
    const fatPercent = ((4.95 / dc) - 4.50) * 100;

    return {
      bodyFatPercent: Math.max(0, fatPercent).toFixed(1),
      dc: parseFloat(dc.toFixed(4)),
      isComplete: true,
      missingText: null,
      detailText: `Σ3 = ${sum3.toFixed(1)} mm (DC: ${dc.toFixed(4)})`,
    };
  }
}

export function calculateForsyth(
  skinfolds: SkinfoldMeasurements | undefined,
  gender?: string | undefined
): { bodyFatPercent: string | null; dc: number | null; isComplete: boolean; missingText: string | null; detailText: string } {
  // Forsyth:
  // DC= 1.10647 – 0.00162(pliegue subescapular) – 0.00144(pliegue abdominal) – 0.00077(pliegue tríceps) + 0.00071(pliegue axilar)
  // %GC= (4.95/DC – 4.50) x100
  // Validación: Solo aplica en hombres
  const isMale = gender?.toLowerCase() === 'hombre' || gender?.toLowerCase() === 'masculino' || gender?.toLowerCase() === 'm';
  const isFemale = gender?.toLowerCase() === 'mujer' || gender?.toLowerCase() === 'femenino' || gender?.toLowerCase() === 'f';

  if (isFemale) {
    return {
      bodyFatPercent: null,
      dc: null,
      isComplete: false,
      missingText: 'No aplica en mujeres',
      detailText: 'Fórmula validada sólo para hombres',
    };
  }

  if (!isMale) {
    return {
      bodyFatPercent: null,
      dc: null,
      isComplete: false,
      missingText: 'Sólo aplica en hombres',
      detailText: 'Requiere sexo: Hombre',
    };
  }

  const parseOrNull = (val?: string) => {
    if (!val) return null;
    const parsed = parseFloat(val.replace(',', '.'));
    return isNaN(parsed) || parsed <= 0 ? null : parsed;
  };

  const sub = parseOrNull(skinfolds?.subescapular);
  const abdominal = parseOrNull(skinfolds?.abdominal);
  const triceps = parseOrNull(skinfolds?.triceps);
  const axilar = parseOrNull(skinfolds?.axilar);

  const missing: string[] = [];
  if (sub === null) missing.push('Subescapular');
  if (abdominal === null) missing.push('Abdominal');
  if (triceps === null) missing.push('Tríceps');
  if (axilar === null) missing.push('Axilar');

  if (missing.length > 0) {
    return {
      bodyFatPercent: null,
      dc: null,
      isComplete: false,
      missingText: `Falta: ${missing.join(', ')}`,
      detailText: 'Hombre: Sub + Abd + Trí + Axilar',
    };
  }

  const dc = 1.10647 - (0.00162 * sub!) - (0.00144 * abdominal!) - (0.00077 * triceps!) + (0.00071 * axilar!);
  const fatPercent = ((4.95 / dc) - 4.50) * 100;

  return {
    bodyFatPercent: Math.max(0, fatPercent).toFixed(1),
    dc: parseFloat(dc.toFixed(4)),
    isComplete: true,
    missingText: null,
    detailText: `DC = ${dc.toFixed(4)} (Hombre)`,
  };
}

export function calculateYuhasz(
  skinfolds: SkinfoldMeasurements | undefined,
  gender: string | undefined
): { bodyFatPercent: string | null; dc: number | null; isComplete: boolean; missingText: string | null; detailText: string } {
  // Yuhasz:
  // Hombres: Porcentaje de grasa corporal (%) = (0.1051 x suma de todos los pliegues cutáneos) + 2.585
  // Mujeres: Porcentaje de grasa corporal (%) = (0.1548 x (Tríceps + subescapular + abdominal + suprailíaco + muslo + pantorrilla) + 3.580
  const parseOrNull = (val?: string) => {
    if (!val) return null;
    const parsed = parseFloat(val.replace(',', '.'));
    return isNaN(parsed) || parsed <= 0 ? null : parsed;
  };

  const isMale = gender?.toLowerCase() === 'hombre' || gender?.toLowerCase() === 'masculino' || gender?.toLowerCase() === 'm';
  const isFemale = gender?.toLowerCase() === 'mujer' || gender?.toLowerCase() === 'femenino' || gender?.toLowerCase() === 'f';

  if (!isMale && !isFemale) {
    return {
      bodyFatPercent: null,
      dc: null,
      isComplete: false,
      missingText: 'Requiere definir Sexo',
      detailText: 'Hombre / Mujer: 6 pliegues',
    };
  }

  const triceps = parseOrNull(skinfolds?.triceps);
  const sub = parseOrNull(skinfolds?.subescapular);
  const abdominal = parseOrNull(skinfolds?.abdominal);
  const supra = parseOrNull(skinfolds?.crestaIliaca) ?? parseOrNull(skinfolds?.supraespinal);
  const muslo = parseOrNull(skinfolds?.musloFrontal);
  const pantorrilla = parseOrNull(skinfolds?.pantorrillaMedial);

  const missing: string[] = [];
  if (triceps === null) missing.push('Tríceps');
  if (sub === null) missing.push('Subescapular');
  if (abdominal === null) missing.push('Abdominal');
  if (supra === null) missing.push('Suprailíaco/Cresta');
  if (muslo === null) missing.push('Muslo Frontal');
  if (pantorrilla === null) missing.push('Pantorrilla');

  if (missing.length > 0) {
    return {
      bodyFatPercent: null,
      dc: null,
      isComplete: false,
      missingText: `Falta: ${missing.join(', ')}`,
      detailText: '6 pliegues (Trí, Sub, Abd, Supra, Mus, Pan)',
    };
  }

  const sum6 = triceps! + sub! + abdominal! + supra! + muslo! + pantorrilla!;
  let fatPercent = 0;

  if (isMale) {
    // Si están presentes los demás pliegues (bíceps, pectoral, axilar), se suman al total de pliegues
    const biceps = parseOrNull(skinfolds?.biceps) ?? 0;
    const pectoral = parseOrNull(skinfolds?.pectoral) ?? 0;
    const axilar = parseOrNull(skinfolds?.axilar) ?? 0;
    const totalSum = sum6 + biceps + pectoral + axilar;
    fatPercent = (0.1051 * totalSum) + 2.585;
  } else {
    fatPercent = (0.1548 * sum6) + 3.580;
  }

  const dc = 495 / (fatPercent + 450);

  return {
    bodyFatPercent: Math.max(0, fatPercent).toFixed(1),
    dc: parseFloat(dc.toFixed(4)),
    isComplete: true,
    missingText: null,
    detailText: `Σ = ${sum6.toFixed(1)} mm (Yuhasz)`,
  };
}

export interface BoneMassEstimation {
  boneKg: string | null;
  bonePercent: string | null;
  isComplete: boolean;
  missingText: string | null;
  detailText: string;
}

export function calculateBoneMassRocha(
  heightStr: string | undefined,
  breadths: BreadthMeasurements | undefined,
  weightStr?: string | undefined
): BoneMassEstimation {
  // ROCHA (1975):
  // MO = (Estatura en mts² X Diámetro del fémur en mts X Diámetro estiloideo en mts X 400)⁰.⁷¹² X 3.02
  const parseNum = (val?: string) => {
    if (!val) return null;
    const parsed = parseFloat(val.replace(',', '.'));
    return isNaN(parsed) || parsed <= 0 ? null : parsed;
  };

  const rawHeight = parseNum(heightStr);
  const rawFemur = parseNum(breadths?.femoral);
  const rawEstiloideo = parseNum(breadths?.biestiloideo);
  const rawWeight = parseNum(weightStr);

  const missing: string[] = [];
  if (rawHeight === null) missing.push('Estatura');
  if (rawFemur === null) missing.push('Diámetro Fémur');
  if (rawEstiloideo === null) missing.push('Diámetro Estiloideo');

  if (missing.length > 0) {
    return {
      boneKg: null,
      bonePercent: null,
      isComplete: false,
      missingText: `Falta: ${missing.join(', ')}`,
      detailText: 'Estatura² × Fémur × Estiloideo × 400',
    };
  }

  // Estatura en metros (si se ingresó en cm como 175)
  const heightMts = rawHeight! > 3 ? rawHeight! / 100 : rawHeight!;

  // Diámetro del fémur en metros:
  // Si > 30 se asume mm (ej. 95 mm -> 0.095 m)
  // Si > 1 se asume cm (ej. 9.5 cm -> 0.095 m)
  // Si <= 1 ya está en metros (ej. 0.095 m)
  let femurMts = rawFemur!;
  if (femurMts > 30) {
    femurMts = femurMts / 1000;
  } else if (femurMts > 1) {
    femurMts = femurMts / 100;
  }

  // Diámetro estiloideo (biestiloideo) en metros:
  // Si > 30 se asume mm (ej. 55 mm -> 0.055 m)
  // Si > 1 se asume cm (ej. 5.5 cm -> 0.055 m)
  // Si <= 1 ya está en metros (ej. 0.055 m)
  let estiloideoMts = rawEstiloideo!;
  if (estiloideoMts > 30) {
    estiloideoMts = estiloideoMts / 1000;
  } else if (estiloideoMts > 1) {
    estiloideoMts = estiloideoMts / 100;
  }

  const base = Math.pow(heightMts, 2) * femurMts * estiloideoMts * 400;
  if (base <= 0) {
    return {
      boneKg: null,
      bonePercent: null,
      isComplete: false,
      missingText: 'Medidas inválidas',
      detailText: 'Estatura² × Fémur × Estiloideo × 400',
    };
  }

  const moKgVal = Math.pow(base, 0.712) * 3.02;
  const boneKg = moKgVal.toFixed(2);

  let bonePercent: string | null = null;
  if (rawWeight && rawWeight > 0) {
    const pct = (moKgVal / rawWeight) * 100;
    bonePercent = pct.toFixed(1);
  }

  return {
    boneKg,
    bonePercent,
    isComplete: true,
    missingText: null,
    detailText: `Masa Ósea = ${boneKg} kg${bonePercent ? ` (${bonePercent}%)` : ''}`,
  };
}

export interface ResidualMassEstimation {
  residualKg: string | null;
  residualPercent: string | null;
  isComplete: boolean;
  missingText: string | null;
  detailText: string;
}

export function calculateResidualMass(
  gender?: string | undefined,
  weightStr?: string | undefined
): ResidualMassEstimation {
  // Estimación Antropométrica de la Masa Residual (Würch):
  // Hombres: 24% del peso corporal
  // Mujeres: 21% del peso corporal
  const g = gender?.toLowerCase().trim();
  const isMale = g === 'hombre' || g === 'masculino' || g === 'm';
  const isFemale = g === 'mujer' || g === 'femenino' || g === 'f';

  if (!isMale && !isFemale) {
    return {
      residualKg: null,
      residualPercent: null,
      isComplete: false,
      missingText: 'Requiere definir Sexo',
      detailText: 'Hombres: 24% | Mujeres: 21%',
    };
  }

  const targetPercent = isMale ? 24 : 21;
  const rawWeight = weightStr ? parseFloat(weightStr.replace(',', '.')) : null;

  if (!rawWeight || isNaN(rawWeight) || rawWeight <= 0) {
    return {
      residualKg: null,
      residualPercent: targetPercent.toString(),
      isComplete: false,
      missingText: 'Falta: Peso del paciente',
      detailText: `${isMale ? 'Hombre' : 'Mujer'}: ${targetPercent}% del peso`,
    };
  }

  const residualKgVal = (rawWeight * targetPercent) / 100;
  const residualKg = residualKgVal.toFixed(2);

  return {
    residualKg,
    residualPercent: targetPercent.toString(),
    isComplete: true,
    missingText: null,
    detailText: `${isMale ? 'Hombre (24%)' : 'Mujer (21%)'}: ${residualKg} kg`,
  };
}

export interface MuscleMassEstimation {
  muscleKg: string | null;
  musclePercent: string | null;
  isComplete: boolean;
  missingText: string | null;
  detailText: string;
}

export function calculateMuscleMass(
  fatPercentStr: string | undefined,
  bonePercentStr: string | undefined,
  residualPercentStr: string | undefined,
  weightStr?: string | undefined
): MuscleMassEstimation {
  // Estimación Antropométrica de la Masa Muscular:
  // Masa Muscular = 100 - (Porcentaje de masa grasa corporal + Porcentaje masa ósea + Porcentaje masa residual)
  // Conversión a kg: (Porcentaje de Masa Muscular * Masa corporal) / 100
  const parseNum = (val?: string) => {
    if (!val) return null;
    const parsed = parseFloat(val.replace(',', '.'));
    return isNaN(parsed) || parsed < 0 ? null : parsed;
  };

  const fatPct = parseNum(fatPercentStr);
  const bonePct = parseNum(bonePercentStr);
  const resPct = parseNum(residualPercentStr);
  const rawWeight = parseNum(weightStr);

  const missing: string[] = [];
  if (fatPct === null) missing.push('% Grasa');
  if (bonePct === null) missing.push('% Ósea');
  if (resPct === null) missing.push('% Residual');

  if (missing.length > 0) {
    return {
      muscleKg: null,
      musclePercent: null,
      isComplete: false,
      missingText: `Falta: ${missing.join(', ')}`,
      detailText: '100 - (% Grasa + % Ósea + % Residual)',
    };
  }

  const sumOther = fatPct! + bonePct! + resPct!;
  const mmPctVal = Math.max(0, 100 - sumOther);
  const musclePercent = mmPctVal.toFixed(1);

  let muscleKg: string | null = null;
  if (rawWeight && rawWeight > 0) {
    const kgVal = (mmPctVal * rawWeight) / 100;
    muscleKg = kgVal.toFixed(2);
  }

  return {
    muscleKg,
    musclePercent,
    isComplete: true,
    missingText: rawWeight ? null : 'Falta: Peso del paciente',
    detailText: `Masa Muscular = 100 - (${fatPct!.toFixed(1)}% + ${bonePct!.toFixed(1)}% + ${resPct!.toFixed(1)}%) = ${musclePercent}%${muscleKg ? ` (${muscleKg} kg)` : ''}`,
  };
}

// ==========================================
// FÓRMULA DE CONTEO CALÓRICO: HARRIS-BENEDICT
// Deportistas, verificación cruzada
// ==========================================

export interface ActivityLevelOption {
  factor: number;
  label: string;
  description: string;
}

export const ACTIVITY_LEVEL_OPTIONS: ActivityLevelOption[] = [
  { factor: 1.2, label: 'Sedentario', description: 'Trabajo de oficina, sin ejercicio regular' },
  { factor: 1.375, label: 'Ligeramente activo', description: '1 a 3 sesiones por semana, caminata diaria' },
  { factor: 1.55, label: 'Moderadamente activo', description: '3 a 5 sesiones por semana, trabajo semi-activo' },
  { factor: 1.725, label: 'Muy activo', description: '6 a 7 sesiones por semana, trabajo físico' },
  { factor: 1.9, label: 'Extremadamente activo', description: 'Doble sesión diaria, atleta profesional' },
];

export interface WeightStrategyResult {
  realWeight: number | null;
  idealWeight: number | null;
  adjustedWeight: number | null;
  weightUsed: number | null;
  strategyUsed: 'real' | 'ideal' | 'adjusted';
  strategyReason: string;
  idealFormulaText: string;
  adjustedFormulaText: string;
}

export function calculateWeightsByStrategy(
  heightStr?: string,
  weightStr?: string,
  gender?: string,
  preferredStrategy: 'real' | 'ideal' | 'adjusted' = 'real'
): WeightStrategyResult {
  const parseNum = (val?: string) => {
    if (!val) return null;
    const clean = val.replace(',', '.').match(/\d+(\.\d+)?/);
    if (!clean) return null;
    const parsed = parseFloat(clean[0]);
    return isNaN(parsed) || parsed <= 0 ? null : parsed;
  };

  const realWeight = parseNum(weightStr);
  const rawHeight = parseNum(heightStr);
  let heightM: number | null = null;
  if (rawHeight) {
    heightM = rawHeight > 3 ? rawHeight / 100 : rawHeight;
  }

  // 1. Peso ideal:
  // Hombres → Peso ideal = talla² x 23
  // Mujeres → Peso ideal = talla² x 21
  let idealWeight: number | null = null;
  let idealFormulaText = '';
  const isMale = gender === 'Hombre';
  const isFemale = gender === 'Mujer';

  if (heightM) {
    if (isMale) {
      idealWeight = Math.round((heightM * heightM * 23) * 10) / 10;
      idealFormulaText = `Talla² (${heightM.toFixed(2)} m)² × 23 = ${idealWeight.toFixed(1)} kg`;
    } else if (isFemale) {
      idealWeight = Math.round((heightM * heightM * 21) * 10) / 10;
      idealFormulaText = `Talla² (${heightM.toFixed(2)} m)² × 21 = ${idealWeight.toFixed(1)} kg`;
    } else {
      idealFormulaText = 'Seleccione el sexo (Hombre: ×23 / Mujer: ×21)';
    }
  } else {
    idealFormulaText = 'Requiere estatura';
  }

  // 2. Peso ajustado:
  // Peso ajustado = (Peso actual – Peso ideal) / 3 + Peso ideal
  let adjustedWeight: number | null = null;
  let adjustedFormulaText = '';
  if (realWeight !== null && idealWeight !== null) {
    const adj = ((realWeight - idealWeight) / 3) + idealWeight;
    adjustedWeight = Math.round(adj * 10) / 10;
    adjustedFormulaText = `(${realWeight.toFixed(1)} - ${idealWeight.toFixed(1)}) / 3 + ${idealWeight.toFixed(1)} = ${adjustedWeight.toFixed(1)} kg`;
  } else {
    adjustedFormulaText = 'Requiere peso actual y peso ideal';
  }

  // 3. Estrategia de peso seleccionada
  let strategyUsed: 'real' | 'ideal' | 'adjusted' = preferredStrategy;
  let strategyReason = '';

  if (preferredStrategy === 'ideal') {
    strategyReason = 'Selección: Peso Ideal Teórico';
  } else if (preferredStrategy === 'adjusted') {
    strategyReason = 'Selección: Peso Ajustado';
  } else {
    strategyUsed = 'real';
    strategyReason = 'Selección: Peso Real Actual';
  }

  let weightUsed: number | null = realWeight;
  if (strategyUsed === 'ideal' && idealWeight !== null) {
    weightUsed = idealWeight;
  } else if (strategyUsed === 'adjusted' && adjustedWeight !== null) {
    weightUsed = adjustedWeight;
  } else if (strategyUsed === 'real' && realWeight !== null) {
    weightUsed = realWeight;
  } else {
    weightUsed = realWeight || idealWeight || adjustedWeight;
  }

  return {
    realWeight,
    idealWeight,
    adjustedWeight,
    weightUsed,
    strategyUsed,
    strategyReason,
    idealFormulaText,
    adjustedFormulaText,
  };
}

export interface CaloricFormulaCalculation {
  formulaId: 'harris-benedict' | 'mifflin-st-jeor' | 'katch-mcardle' | 'cunningham';
  formulaName: string;
  formulaSubtitle: string;
  formulaIndication: string;
  geb: number | null;
  get: number | null;
  activityFactor: number;
  activityLabel: string;
  activityDesc: string;
  weightDetails: WeightStrategyResult;
  formulaDetails: string;
  isComplete: boolean;
  missingFields: string[];
  leanBodyMassKg?: number | null;
  fatPercentUsed?: number | null;
}

export type HarrisBenedictCalculation = CaloricFormulaCalculation;

export function calculateHarrisBenedict(
  patient: PatientInfo,
  selectedActivityFactor: number = 1.2,
  preferredStrategy: 'real' | 'ideal' | 'adjusted' = 'real'
): CaloricFormulaCalculation {
  const missingFields: string[] = [];
  if (!patient.gender || (patient.gender !== 'Hombre' && patient.gender !== 'Mujer')) {
    missingFields.push('Sexo (Hombre o Mujer)');
  }
  if (!patient.height) {
    missingFields.push('Estatura (cm)');
  }
  if (!patient.weight) {
    missingFields.push('Peso corporal');
  }
  if (!patient.age) {
    missingFields.push('Edad (años)');
  }

  const weightDetails = calculateWeightsByStrategy(
    patient.height,
    patient.weight,
    patient.gender,
    preferredStrategy
  );

  const cleanNum = (str?: string) => {
    if (!str) return null;
    const match = str.replace(',', '.').match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
  };

  const rawHeight = cleanNum(patient.height);
  const heightCm = rawHeight && rawHeight < 3 ? rawHeight * 100 : rawHeight;
  const ageYears = cleanNum(patient.age);
  const weightKg = weightDetails.weightUsed;

  const activityObj =
    ACTIVITY_LEVEL_OPTIONS.find((opt) => opt.factor === selectedActivityFactor) ||
    ACTIVITY_LEVEL_OPTIONS[0];

  if (missingFields.length > 0 || !heightCm || !ageYears || !weightKg) {
    return {
      formulaId: 'harris-benedict',
      formulaName: 'Harris-Benedict',
      formulaSubtitle: 'Deportistas, verificación cruzada',
      formulaIndication: 'Atletas y deportistas para verificación cruzada.',
      geb: null,
      get: null,
      activityFactor: activityObj.factor,
      activityLabel: activityObj.label,
      activityDesc: activityObj.description,
      weightDetails,
      formulaDetails: 'Requiere sexo, peso, estatura y edad para el cálculo de Harris-Benedict.',
      isComplete: false,
      missingFields,
    };
  }

  let gebVal = 0;
  let formulaDetails = '';

  if (patient.gender === 'Hombre') {
    // Hombres GEB = 66.47 + (13.75 * Peso (kg)) + (5.0 * Talla (cm)) - (6.74 * edad (años))
    const wPart = 13.75 * weightKg;
    const hPart = 5.0 * heightCm;
    const aPart = 6.74 * ageYears;
    gebVal = 66.47 + wPart + hPart - aPart;
    formulaDetails = `66.47 + (13.75 × ${weightKg.toFixed(1)}) + (5.0 × ${heightCm.toFixed(0)}) - (6.74 × ${ageYears.toFixed(0)})`;
  } else {
    // Mujeres GEB = 665.1 + (9.56 * Peso (kg)) + (1.85 * Talla (cm)) - (4.68 * edad (años))
    const wPart = 9.56 * weightKg;
    const hPart = 1.85 * heightCm;
    const aPart = 4.68 * ageYears;
    gebVal = 665.1 + wPart + hPart - aPart;
    formulaDetails = `665.1 + (9.56 × ${weightKg.toFixed(1)}) + (1.85 × ${heightCm.toFixed(0)}) - (4.68 × ${ageYears.toFixed(0)})`;
  }

  const roundedGeb = Math.round(gebVal);
  const getVal = Math.round(roundedGeb * activityObj.factor);

  return {
    formulaId: 'harris-benedict',
    formulaName: 'Harris-Benedict',
    formulaSubtitle: 'Deportistas, verificación cruzada',
    formulaIndication: 'Atletas y deportistas para verificación cruzada.',
    geb: roundedGeb,
    get: getVal,
    activityFactor: activityObj.factor,
    activityLabel: activityObj.label,
    activityDesc: activityObj.description,
    weightDetails,
    formulaDetails,
    isComplete: true,
    missingFields: [],
  };
}

export function calculateMifflinStJeor(
  patient: PatientInfo,
  selectedActivityFactor: number = 1.2,
  preferredStrategy: 'real' | 'ideal' | 'adjusted' = 'real'
): CaloricFormulaCalculation {
  const missingFields: string[] = [];
  if (!patient.gender || (patient.gender !== 'Hombre' && patient.gender !== 'Mujer')) {
    missingFields.push('Sexo (Hombre o Mujer)');
  }
  if (!patient.height) {
    missingFields.push('Estatura (cm)');
  }
  if (!patient.weight) {
    missingFields.push('Peso corporal');
  }
  if (!patient.age) {
    missingFields.push('Edad (años)');
  }

  const weightDetails = calculateWeightsByStrategy(
    patient.height,
    patient.weight,
    patient.gender,
    preferredStrategy
  );

  const cleanNum = (str?: string) => {
    if (!str) return null;
    const clean = str.toString().trim().replace(',', '.');
    const match = clean.match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
  };

  const rawHeight = cleanNum(patient.height);
  const heightCm = rawHeight && rawHeight < 3 ? rawHeight * 100 : rawHeight;
  const ageYears = cleanNum(patient.age);

  // Utilizar esta fórmula con el peso agregado por el usuario en el espacio antes llenado (Masa Corporal / Peso Real)
  const userEnteredWeight = cleanNum(patient.weight);
  const weightKg = userEnteredWeight !== null && userEnteredWeight > 0
    ? userEnteredWeight
    : weightDetails.weightUsed;

  if (userEnteredWeight !== null && userEnteredWeight > 0) {
    weightDetails.weightUsed = userEnteredWeight;
    weightDetails.strategyUsed = 'real';
    weightDetails.strategyReason = 'Peso real agregado por el usuario en Masa Corporal';
  }

  const activityObj =
    ACTIVITY_LEVEL_OPTIONS.find((opt) => opt.factor === selectedActivityFactor) ||
    ACTIVITY_LEVEL_OPTIONS[0];

  if (missingFields.length > 0 || !heightCm || !ageYears || !weightKg) {
    return {
      formulaId: 'mifflin-st-jeor',
      formulaName: 'Mifflin-St Jeor (1990)',
      formulaSubtitle: 'Adultos sedentarios o con sobrepeso',
      formulaIndication: 'Adultos sedentarios o con sobrepeso.',
      geb: null,
      get: null,
      activityFactor: activityObj.factor,
      activityLabel: activityObj.label,
      activityDesc: activityObj.description,
      weightDetails,
      formulaDetails: 'Requiere sexo, peso, estatura y edad para el cálculo de Mifflin-St Jeor.',
      isComplete: false,
      missingFields,
    };
  }

  let mbVal = 0;
  let formulaDetails = '';

  if (patient.gender === 'Hombre') {
    // Formula para hombres: MB = (10 x peso en kg) + (6.25 x estatura en cm) - (5 x edad en anos) + 5
    const wPart = 10 * weightKg;
    const hPart = 6.25 * heightCm;
    const aPart = 5 * ageYears;
    mbVal = wPart + hPart - aPart + 5;
    formulaDetails = `(10 × ${weightKg.toFixed(1)}) + (6.25 × ${heightCm.toFixed(0)}) - (5 × ${ageYears.toFixed(0)}) + 5`;
  } else {
    // Formula para mujeres: MB = (10 x peso en kg) + (6.25 x estatura en cm) - (5 x edad en anos) - 161
    const wPart = 10 * weightKg;
    const hPart = 6.25 * heightCm;
    const aPart = 5 * ageYears;
    mbVal = wPart + hPart - aPart - 161;
    formulaDetails = `(10 × ${weightKg.toFixed(1)}) + (6.25 × ${heightCm.toFixed(0)}) - (5 × ${ageYears.toFixed(0)}) - 161`;
  }

  const roundedMb = Math.round(mbVal);
  const getVal = Math.round(roundedMb * activityObj.factor);

  return {
    formulaId: 'mifflin-st-jeor',
    formulaName: 'Mifflin-St Jeor (1990)',
    formulaSubtitle: 'Adultos sedentarios o con sobrepeso',
    formulaIndication: 'Adultos sedentarios o con sobrepeso.',
    geb: roundedMb,
    get: getVal,
    activityFactor: activityObj.factor,
    activityLabel: activityObj.label,
    activityDesc: activityObj.description,
    weightDetails,
    formulaDetails,
    isComplete: true,
    missingFields: [],
  };
}

export function calculateKatchMcArdle(
  patient: PatientInfo,
  selectedActivityFactor: number = 1.2,
  preferredStrategy: 'real' | 'ideal' | 'adjusted' = 'real'
): CaloricFormulaCalculation {
  const missingFields: string[] = [];
  if (!patient.weight) {
    missingFields.push('Peso corporal');
  }
  if (!patient.fatPercent) {
    missingFields.push('% Grasa corporal');
  }

  const weightDetails = calculateWeightsByStrategy(
    patient.height,
    patient.weight,
    patient.gender,
    preferredStrategy
  );

  const cleanNum = (str?: string) => {
    if (!str) return null;
    const clean = str.toString().trim().replace(',', '.');
    const match = clean.match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
  };

  const userEnteredWeight = cleanNum(patient.weight);
  const weightKg = userEnteredWeight !== null && userEnteredWeight > 0
    ? userEnteredWeight
    : weightDetails.weightUsed;

  if (userEnteredWeight !== null && userEnteredWeight > 0) {
    weightDetails.weightUsed = userEnteredWeight;
    weightDetails.strategyUsed = 'real';
    weightDetails.strategyReason = 'Peso real agregado por el usuario en Masa Corporal';
  }

  const fatPercentNum = cleanNum(patient.fatPercent);

  const activityObj =
    ACTIVITY_LEVEL_OPTIONS.find((opt) => opt.factor === selectedActivityFactor) ||
    ACTIVITY_LEVEL_OPTIONS[0];

  if (missingFields.length > 0 || !weightKg || fatPercentNum === null || fatPercentNum <= 0) {
    return {
      formulaId: 'katch-mcardle',
      formulaName: 'Katch-McArdle (1996)',
      formulaSubtitle: 'Clientes con composición corporal medida',
      formulaIndication: 'Clientes con composición corporal medida.',
      geb: null,
      get: null,
      activityFactor: activityObj.factor,
      activityLabel: activityObj.label,
      activityDesc: activityObj.description,
      weightDetails,
      formulaDetails: 'Requiere peso y porcentaje de grasa corporal para el cálculo de Katch-McArdle.',
      isComplete: false,
      missingFields,
    };
  }

  // Porcentaje de grasa corporal como fracción (ej. 20% -> 0.20)
  const fatFraction = fatPercentNum > 1 ? fatPercentNum / 100 : fatPercentNum;
  // Masa corporal magra (kg) = Peso (kg) × (1 - Porcentaje de grasa corporal)
  const leanMassKg = weightKg * (1 - fatFraction);

  // TMB (kcal/día) = 370 + (21.6 × masa corporal magra)
  const mbVal = 370 + (21.6 * leanMassKg);
  const roundedMb = Math.round(mbVal);
  const getVal = Math.round(roundedMb * activityObj.factor);

  const formulaDetails = `370 + (21.6 × ${leanMassKg.toFixed(1)} kg masa magra [${weightKg.toFixed(1)} kg × (1 - ${(fatFraction * 100).toFixed(1)}%)])`;

  return {
    formulaId: 'katch-mcardle',
    formulaName: 'Katch-McArdle (1996)',
    formulaSubtitle: 'Clientes con composición corporal medida',
    formulaIndication: 'Clientes con composición corporal medida.',
    geb: roundedMb,
    get: getVal,
    activityFactor: activityObj.factor,
    activityLabel: activityObj.label,
    activityDesc: activityObj.description,
    weightDetails,
    formulaDetails,
    isComplete: true,
    missingFields: [],
    leanBodyMassKg: Math.round(leanMassKg * 10) / 10,
    fatPercentUsed: Math.round((fatFraction * 100) * 10) / 10,
  };
}

export function calculateCunningham(
  patient: PatientInfo,
  selectedActivityFactor: number = 1.2,
  preferredStrategy: 'real' | 'ideal' | 'adjusted' = 'real'
): CaloricFormulaCalculation {
  const missingFields: string[] = [];
  if (!patient.weight) {
    missingFields.push('Peso corporal');
  }
  if (!patient.fatPercent) {
    missingFields.push('% Grasa corporal');
  }

  const weightDetails = calculateWeightsByStrategy(
    patient.height,
    patient.weight,
    patient.gender,
    preferredStrategy
  );

  const cleanNum = (str?: string) => {
    if (!str) return null;
    const clean = str.toString().trim().replace(',', '.');
    const match = clean.match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
  };

  const userEnteredWeight = cleanNum(patient.weight);
  const weightKg = userEnteredWeight !== null && userEnteredWeight > 0
    ? userEnteredWeight
    : weightDetails.weightUsed;

  if (userEnteredWeight !== null && userEnteredWeight > 0) {
    weightDetails.weightUsed = userEnteredWeight;
    weightDetails.strategyUsed = 'real';
    weightDetails.strategyReason = 'Peso real agregado por el usuario en Masa Corporal';
  }

  const fatPercentNum = cleanNum(patient.fatPercent);

  const activityObj =
    ACTIVITY_LEVEL_OPTIONS.find((opt) => opt.factor === selectedActivityFactor) ||
    ACTIVITY_LEVEL_OPTIONS[0];

  if (missingFields.length > 0 || !weightKg || fatPercentNum === null || fatPercentNum <= 0) {
    return {
      formulaId: 'cunningham',
      formulaName: 'Cunningham (1980 / 1991)',
      formulaSubtitle: 'Atletas de élite con baja grasa corporal',
      formulaIndication: 'Atletas de élite con baja grasa corporal.',
      geb: null,
      get: null,
      activityFactor: activityObj.factor,
      activityLabel: activityObj.label,
      activityDesc: activityObj.description,
      weightDetails,
      formulaDetails: 'Requiere peso y porcentaje de grasa corporal para el cálculo de Cunningham.',
      isComplete: false,
      missingFields,
    };
  }

  // Porcentaje de grasa corporal como fracción (ej. 15% -> 0.15)
  const fatFraction = fatPercentNum > 1 ? fatPercentNum / 100 : fatPercentNum;
  // masa corporal magra = (1 - % de grasa corporal) x kg de peso
  const leanMassKg = (1 - fatFraction) * weightKg;

  // Metabolismo basal (kcal/día) = 500 + 22 x masa corporal magra
  const mbVal = 500 + (22 * leanMassKg);
  const roundedMb = Math.round(mbVal);
  // Nivel de actividad física aplicado al gasto energético total:
  const getVal = Math.round(roundedMb * activityObj.factor);

  const formulaDetails = `500 + (22 × ${leanMassKg.toFixed(1)} kg masa magra [(1 - ${(fatFraction * 100).toFixed(1)}%) × ${weightKg.toFixed(1)} kg])`;

  return {
    formulaId: 'cunningham',
    formulaName: 'Cunningham (1980 / 1991)',
    formulaSubtitle: 'Atletas de élite con baja grasa corporal',
    formulaIndication: 'Atletas de élite con baja grasa corporal.',
    geb: roundedMb,
    get: getVal,
    activityFactor: activityObj.factor,
    activityLabel: activityObj.label,
    activityDesc: activityObj.description,
    weightDetails,
    formulaDetails,
    isComplete: true,
    missingFields: [],
    leanBodyMassKg: Math.round(leanMassKg * 10) / 10,
    fatPercentUsed: Math.round((fatFraction * 100) * 10) / 10,
  };
}

export function calculateCaloricExpenditure(
  patient: PatientInfo,
  formula: 'harris-benedict' | 'mifflin-st-jeor' | 'katch-mcardle' | 'cunningham' = 'harris-benedict',
  selectedActivityFactor: number = 1.2,
  preferredStrategy: 'real' | 'ideal' | 'adjusted' = 'real'
): CaloricFormulaCalculation {
  if (formula === 'cunningham') {
    return calculateCunningham(patient, selectedActivityFactor, preferredStrategy);
  }
  if (formula === 'katch-mcardle') {
    return calculateKatchMcArdle(patient, selectedActivityFactor, preferredStrategy);
  }
  if (formula === 'mifflin-st-jeor') {
    return calculateMifflinStJeor(patient, selectedActivityFactor, preferredStrategy);
  }
  return calculateHarrisBenedict(patient, selectedActivityFactor, preferredStrategy);
}

export function getAllBodyFatEstimations(
  patientOrSkinfolds: PatientInfo | SkinfoldMeasurements | undefined,
  legacyGender?: string
): BodyFatFormulaInfo[] {
  let skinfolds: SkinfoldMeasurements | undefined;
  let gender: string | undefined;
  let age: string | undefined;
  let height: string | undefined;
  let girths: GirthMeasurements | undefined;

  if (patientOrSkinfolds && 'name' in patientOrSkinfolds) {
    const p = patientOrSkinfolds as PatientInfo;
    skinfolds = p.skinfolds;
    gender = p.gender;
    age = p.age;
    height = p.height;
    girths = p.girths;
  } else if (patientOrSkinfolds && ('triceps' in patientOrSkinfolds || 'subescapular' in patientOrSkinfolds)) {
    skinfolds = patientOrSkinfolds as SkinfoldMeasurements;
    gender = legacyGender;
  } else if (patientOrSkinfolds && 'skinfolds' in patientOrSkinfolds) {
    const p = patientOrSkinfolds as any;
    skinfolds = p.skinfolds;
    gender = p.gender ?? legacyGender;
    age = p.age;
    height = p.height;
    girths = p.girths;
  } else {
    skinfolds = patientOrSkinfolds as SkinfoldMeasurements | undefined;
    gender = legacyGender;
  }

  const durnin = calculateDurninWomersley(skinfolds, gender);
  const sloan = calculateSloanBurtBlyth(skinfolds, gender);
  const wilmore = calculateWilmoreBehnke(skinfolds, gender);
  const jackson = calculateJacksonPollock(skinfolds, gender, age);
  const lewis = calculateLewis(skinfolds, height, girths, gender);
  const thorland = calculateThorland(skinfolds, gender);
  const forsyth = calculateForsyth(skinfolds, gender);
  const yuhasz = calculateYuhasz(skinfolds, gender);

  return [
    {
      id: 'durnin',
      name: 'Durnin & Womersley',
      shortName: 'Durnin & W.',
      equationBadge: 'Σ4 (Siri)',
      bodyFatPercent: durnin.bodyFatPercent,
      dc: durnin.dc,
      isComplete: durnin.bodyFatPercent !== null,
      detailText: durnin.bodyFatPercent ? `Σ4 = ${durnin.sum4} mm (DC: ${durnin.dc})` : 'Tríceps + Bíceps + Subescapular + Cresta Ilíaca',
      missingText: durnin.missingText,
      population: 'Población general británica (16-72 años, sedentarios y activos, n=481)',
      caliper: 'Harpenden (10 g/mm²)',
      reference: 'Br. J. Nutr. 1974; 32(1):77-97 / Manual ISAK',
    },
    {
      id: 'sloan',
      name: 'Sloan, Burt & Blyth',
      shortName: 'Sloan et al.',
      equationBadge: 'Brozek',
      bodyFatPercent: sloan.bodyFatPercent,
      dc: sloan.dc,
      isComplete: sloan.isComplete,
      detailText: sloan.detailText,
      missingText: sloan.missingText,
      population: 'Jóvenes universitarios (varones 18-26 a., mujeres 17-25 a.)',
      caliper: 'Harpenden',
      reference: 'J. Appl. Physiol. 1962 & Hum. Biol. 1967',
    },
    {
      id: 'wilmore',
      name: 'Wilmore & Behnke',
      shortName: 'Wilmore & B.',
      equationBadge: 'Siri',
      bodyFatPercent: wilmore.bodyFatPercent,
      dc: wilmore.dc,
      isComplete: wilmore.isComplete,
      detailText: wilmore.detailText,
      missingText: wilmore.missingText,
      population: 'Adultos jóvenes estadounidenses (varones 18-29 a., mujeres 17-38 a.)',
      caliper: 'Lange (10 g/mm²)',
      reference: 'Am. J. Clin. Nutr. 1969 & J. Appl. Physiol. 1970',
    },
    {
      id: 'jackson',
      name: 'Jackson & Pollock',
      shortName: 'Jackson & P.',
      equationBadge: 'Siri',
      bodyFatPercent: jackson.bodyFatPercent,
      dc: jackson.dc,
      isComplete: jackson.isComplete,
      detailText: jackson.detailText,
      missingText: jackson.missingText,
      population: 'Adultos caucásicos generales y físicamente activos (18-61 años)',
      caliper: 'Lange (validado con Harpenden)',
      reference: 'Br. J. Nutr. 1978 & Med. Sci. Sports Exerc. 1980',
    },
    {
      id: 'lewis',
      name: 'Lewis',
      shortName: 'Lewis',
      equationBadge: 'Siri',
      bodyFatPercent: lewis.bodyFatPercent,
      dc: lewis.dc,
      isComplete: lewis.isComplete,
      detailText: lewis.detailText,
      missingText: lewis.missingText,
      population: 'Mujeres jóvenes universitarias y deportistas activas (18-35 años)',
      caliper: 'Lange',
      reference: 'Lewis et al. Am. J. Clin. Nutr. 1978',
    },
    {
      id: 'thorland',
      name: 'Thorland',
      shortName: 'Thorland',
      equationBadge: 'Siri',
      bodyFatPercent: thorland.bodyFatPercent,
      dc: thorland.dc,
      isComplete: thorland.isComplete,
      detailText: thorland.detailText,
      missingText: thorland.missingText,
      population: 'Atletas adolescentes y jóvenes de competencia y élite (14-22 años)',
      caliper: 'Lange',
      reference: 'Thorland et al. Hum. Biol. 1984 / ACSM',
    },
    {
      id: 'forsyth',
      name: 'Forsyth',
      shortName: 'Forsyth',
      equationBadge: 'Siri',
      bodyFatPercent: forsyth.bodyFatPercent,
      dc: forsyth.dc,
      isComplete: forsyth.isComplete,
      detailText: forsyth.detailText,
      missingText: forsyth.missingText,
      population: 'Atletas masculinos universitarios (lucha, contacto y atletismo)',
      caliper: 'Lange',
      reference: 'Forsyth & Sinning. Med. Sci. Sports 1973',
    },
    {
      id: 'yuhasz',
      name: 'Yuhasz',
      shortName: 'Yuhasz',
      equationBadge: 'Directo',
      bodyFatPercent: yuhasz.bodyFatPercent,
      dc: yuhasz.dc,
      isComplete: yuhasz.isComplete,
      detailText: yuhasz.detailText,
      missingText: yuhasz.missingText,
      population: 'Atletas universitarios (adaptado por Carter en ISAK para deportistas)',
      caliper: 'Harpenden / Lange (estándar ISAK)',
      reference: 'Yuhasz (1962) / mod. Carter (1982), ISAK',
    },
  ];
}

export function calculateMacros(
  tableState: TableGridState,
  manualEntry?: ManualNutrientEntry,
  proteinSupplement?: ProteinSupplementInfo
): MacroNutrientSummary {
  let totalKcal = 0;
  let totalProteinGrams = 0;
  let totalLipidsGrams = 0;
  let totalCarbsGrams = 0;
  let totalEquivalents = 0;

  SMAE_GROUPS.forEach((group) => {
    const rowSum = calculateRowTotal(group.id, tableState);
    totalEquivalents += rowSum;
    totalKcal += rowSum * group.kcal;
    totalProteinGrams += rowSum * group.protein;
    totalLipidsGrams += rowSum * group.lipids;
    totalCarbsGrams += rowSum * group.carbs;
  });

  // Si se ingresó aporte manual (proteína, calorías, lípidos o carbohidratos)
  // Condicionado a si se seleccionó para agregarse (includeInMenu)
  if (manualEntry && manualEntry.includeInMenu) {
    const pGrams = Number(manualEntry.proteinGrams) || 0;
    const lGrams = Number(manualEntry.lipidsGrams) || 0;
    const cGrams = Number(manualEntry.carbsGrams) || 0;
    const directKcal = Number(manualEntry.kcal) || 0;
    const calculatedKcal = pGrams * 4 + lGrams * 9 + cGrams * 4;
    const addKcal = directKcal > 0 ? directKcal : calculatedKcal;

    if (pGrams > 0 || directKcal > 0 || lGrams > 0 || cGrams > 0) {
      totalKcal += addKcal;
      totalProteinGrams += pGrams;
      totalLipidsGrams += lGrams;
      totalCarbsGrams += cGrams;
    }
  }

  // Si se configuró suplemento de proteína (Whey protein / suero de leche) condicionado a includeInMenu
  if (proteinSupplement?.enabled && proteinSupplement?.includeInMenu) {
    const suppP = Number(proteinSupplement.totalProteinGrams) ||
      (Number(proteinSupplement.scoops || 1) * Number(proteinSupplement.proteinGramsPerServing || 25));
    if (suppP > 0) {
      totalProteinGrams += suppP;
      totalKcal += suppP * 4;
    }
  }

  const proteinKcal = totalProteinGrams * 4;
  const lipidsKcal = totalLipidsGrams * 9;
  const carbsKcal = totalCarbsGrams * 4;
  const baseKcalForPercent = totalKcal > 0 ? totalKcal : (proteinKcal + lipidsKcal + carbsKcal);

  const proteinKcalPercent = baseKcalForPercent > 0 ? Math.round((proteinKcal / baseKcalForPercent) * 100) : 0;
  const lipidsKcalPercent = baseKcalForPercent > 0 ? Math.round((lipidsKcal / baseKcalForPercent) * 100) : 0;
  const carbsKcalPercent = baseKcalForPercent > 0 ? Math.round((carbsKcal / baseKcalForPercent) * 100) : 0;

  return {
    totalKcal: Math.round(totalKcal),
    totalProteinGrams: Math.round(totalProteinGrams * 10) / 10,
    totalLipidsGrams: Math.round(totalLipidsGrams * 10) / 10,
    totalCarbsGrams: Math.round(totalCarbsGrams * 10) / 10,
    proteinKcalPercent,
    lipidsKcalPercent,
    carbsKcalPercent,
    totalEquivalents: Math.round(totalEquivalents * 10) / 10,
  };
}

export function normalizeOptionSelection(selection?: MealOptionLetter[] | string): MealOptionLetter[] {
  if (!selection) return ['A', 'B', 'C'];
  if (Array.isArray(selection)) {
    return selection.length > 0 ? (selection.filter(l => l === 'A' || l === 'B' || l === 'C') as MealOptionLetter[]) : ['A', 'B', 'C'];
  }
  if (selection === 'all' || selection === 'both') return ['A', 'B', 'C'];
  if (selection === 'A') return ['A'];
  if (selection === 'B') return ['B'];
  if (selection === 'C') return ['C'];
  if (typeof selection === 'string') {
    const letters = (selection.match(/[ABC]/gi) || []).map((l) => l.toUpperCase() as MealOptionLetter);
    if (letters.length > 0) return Array.from(new Set(letters));
  }
  return ['A', 'B', 'C'];
}

export function formatClipboardMenu(
  plan: any,
  patientInfoOrName?: PatientInfo | string,
  selectedOptions: Record<string, MealOptionLetter[] | string> = {}
): string {
  if (!plan || !plan.meals) return '';

  const isObj = typeof patientInfoOrName === 'object' && patientInfoOrName !== null;
  const patientName = isObj ? patientInfoOrName.name : patientInfoOrName;
  const age = isObj ? patientInfoOrName.age : undefined;
  const weight = isObj ? patientInfoOrName.weight : undefined;
  const height = isObj ? patientInfoOrName.height : undefined;
  const bmi = isObj ? calculateBmiInfo(height, weight) : null;

  let text = `========================================================\n`;
  text += `🥗 PLAN DE ALIMENTACIÓN PERSONALIZADO (SMAE 5ta Edición)\n`;
  if (patientName) {
    text += `👤 Paciente: ${patientName}\n`;
  }
  const anthroParts = [
    age ? `Edad: ${age}` : '',
    weight ? `Masa Corporal: ${weight}` : '',
    height ? `Estatura: ${height}` : '',
    bmi ? `IMC: ${bmi.formatted} (${bmi.category})` : '',
  ].filter(Boolean);
  if (anthroParts.length > 0) {
    text += `📊 Datos Antropométricos: ${anthroParts.join(' | ')}\n`;
  }
  text += `📅 Fecha: ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}\n`;
  text += `========================================================\n\n`;

  if (plan.patientNotes) {
    text += `📌 RECOMENDACIONES GENERALES:\n${plan.patientNotes}\n\n`;
  }

  plan.meals.forEach((meal: any, idx: number) => {
    const hasEquivalents = Boolean(
      meal.totalEquivalentsSummary &&
        meal.totalEquivalentsSummary.length > 0 &&
        meal.totalEquivalentsSummary.some((eq: any) => (Number(eq.quantity) || 0) > 0)
    );

    const hasIngredientsA = Boolean(
      meal.optionA &&
        meal.optionA.ingredients &&
        meal.optionA.ingredients.length > 0
    );

    const hasIngredientsB = Boolean(
      meal.optionB &&
        meal.optionB.ingredients &&
        meal.optionB.ingredients.length > 0
    );

    const hasIngredientsC = Boolean(
      meal.optionC &&
        meal.optionC.ingredients &&
        meal.optionC.ingredients.length > 0
    );

    const hasMealValues = hasEquivalents || hasIngredientsA || hasIngredientsB || hasIngredientsC;

    // Skip empty meal
    if (!hasMealValues) return;

    text += `--------------------------------------------------------\n`;
    text += `⏰ ${meal.mealName.toUpperCase()}\n`;
    text += `--------------------------------------------------------\n`;

    // Porciones asignadas
    if (hasEquivalents) {
      const summaryList = meal.totalEquivalentsSummary
        .filter((s: any) => (Number(s.quantity) || 0) > 0)
        .map((s: any) => `${s.quantity} eq ${s.group}`)
        .join(', ');
      if (summaryList) {
        text += `📊 Equivalentes asignados: ${summaryList}\n\n`;
      }
    }

    const currentSelection = normalizeOptionSelection(selectedOptions[meal.mealName]);

    // Opcion A
    if (meal.optionA && currentSelection.includes('A') && hasIngredientsA) {
      text += `👉 OPCIÓN A: ${meal.optionA.title}\n`;
      if (meal.optionA.description) text += `   ${meal.optionA.description}\n`;
      text += `   Ingredientes (SMAE):\n`;
      meal.optionA.ingredients.forEach((ing: any) => {
        const trueGroup = ing.smaeGroup || detectTrueSMAEGroup(ing.foodName);
        const groupBadge = getGroupBadgeConfig(trueGroup);
        const role = ing.role || detectIngredientRole(ing.foodName, trueGroup);
        const isFree = groupBadge.shortName === 'Libre / Sazón' || (Number(ing.equivalentsCount) || 0) === 0;
        const roleTag = role === 'coccion' ? ' (Cocción)' : role === 'topping' ? ' (Topping)' : role === 'sazon' ? ' (Sazón)' : '';
        const eqTag = !isFree && ing.equivalentsCount ? ` · ${ing.equivalentsCount} eq` : '';
        text += `   • ${parseAndScalePortion(ing.exactPortion, ing.equivalentsCount)} ${ing.foodName} [${groupBadge.shortName}${roleTag}${eqTag}]\n`;
      });
      if (meal.optionA.preparation) {
        text += `   Preparación: ${meal.optionA.preparation}\n`;
      }
      if (meal.optionA.nutritionistTip) {
        text += `   Tip: ${meal.optionA.nutritionistTip}\n`;
      }
      text += `\n`;
    }

    // Opcion B
    if (meal.optionB && currentSelection.includes('B') && hasIngredientsB) {
      text += `👉 OPCIÓN B: ${meal.optionB.title}\n`;
      if (meal.optionB.description) text += `   ${meal.optionB.description}\n`;
      text += `   Ingredientes (SMAE):\n`;
      meal.optionB.ingredients.forEach((ing: any) => {
        const trueGroup = ing.smaeGroup || detectTrueSMAEGroup(ing.foodName);
        const groupBadge = getGroupBadgeConfig(trueGroup);
        const role = ing.role || detectIngredientRole(ing.foodName, trueGroup);
        const isFree = groupBadge.shortName === 'Libre / Sazón' || (Number(ing.equivalentsCount) || 0) === 0;
        const roleTag = role === 'coccion' ? ' (Cocción)' : role === 'topping' ? ' (Topping)' : role === 'sazon' ? ' (Sazón)' : '';
        const eqTag = !isFree && ing.equivalentsCount ? ` · ${ing.equivalentsCount} eq` : '';
        text += `   • ${parseAndScalePortion(ing.exactPortion, ing.equivalentsCount)} ${ing.foodName} [${groupBadge.shortName}${roleTag}${eqTag}]\n`;
      });
      if (meal.optionB.preparation) {
        text += `   Preparación: ${meal.optionB.preparation}\n`;
      }
      if (meal.optionB.nutritionistTip) {
        text += `   Tip: ${meal.optionB.nutritionistTip}\n`;
      }
      text += `\n`;
    }

    // Opcion C
    if (meal.optionC && currentSelection.includes('C') && hasIngredientsC) {
      text += `👉 OPCIÓN C: ${meal.optionC.title}\n`;
      if (meal.optionC.description) text += `   ${meal.optionC.description}\n`;
      text += `   Ingredientes (SMAE):\n`;
      meal.optionC.ingredients.forEach((ing: any) => {
        const trueGroup = ing.smaeGroup || detectTrueSMAEGroup(ing.foodName);
        const groupBadge = getGroupBadgeConfig(trueGroup);
        const role = ing.role || detectIngredientRole(ing.foodName, trueGroup);
        const isFree = groupBadge.shortName === 'Libre / Sazón' || (Number(ing.equivalentsCount) || 0) === 0;
        const roleTag = role === 'coccion' ? ' (Cocción)' : role === 'topping' ? ' (Topping)' : role === 'sazon' ? ' (Sazón)' : '';
        const eqTag = !isFree && ing.equivalentsCount ? ` · ${ing.equivalentsCount} eq` : '';
        text += `   • ${parseAndScalePortion(ing.exactPortion, ing.equivalentsCount)} ${ing.foodName} [${groupBadge.shortName}${roleTag}${eqTag}]\n`;
      });
      if (meal.optionC.preparation) {
        text += `   Preparación: ${meal.optionC.preparation}\n`;
      }
      if (meal.optionC.nutritionistTip) {
        text += `   Tip: ${meal.optionC.nutritionistTip}\n`;
      }
      text += `\n`;
    }
  });

  text += `========================================================\n`;
  text += `Generado con Generador de Menús SMAE Pro | Nutrición de Precisión\n`;
  return text;
}

// ============================================================================
// SOMATOTIPO ISAK (MÉTODO ANTROPOMÉTRICO DE HEATH & CARTER, 1990)
// ============================================================================

export interface SomatotypeClassificationInfo {
  name: string;
  category: string;
  description: string;
  colorClass: string;
  badgeBg: string;
  badgeText: string;
}

export interface HeathCarterSomatotypeResult {
  isComplete: boolean;
  hasAnyData: boolean;
  endomorphy: number | null;
  mesomorphy: number | null;
  ectomorphy: number | null;
  endoFormatted: string;
  mesoFormatted: string;
  ectoFormatted: string;
  x: number | null;
  y: number | null;
  classification: SomatotypeClassificationInfo | null;
  // Escalas descriptivas según somatotipo.pdf
  endoScaleText: string | null;
  mesoScaleText: string | null;
  ectoScaleText: string | null;
  scaleSummaryText: string | null;
  endoScaleInfo?: SomatotypeScaleInfo;
  mesoScaleInfo?: SomatotypeScaleInfo;
  ectoScaleInfo?: SomatotypeScaleInfo;
  // Detalles de cálculo por componente
  endoDetails: {
    isComplete: boolean;
    sumSkinfolds: number | null;
    correctedSum: number | null;
    spc: number | null;
    missingVars: string[];
  };
  mesoDetails: {
    isComplete: boolean;
    dh: number | null;
    df: number | null;
    bc: number | null;
    pnc: number | null;
    e: number | null;
    correctedArmGirth: number | null;
    correctedCalfGirth: number | null;
    missingVars: string[];
  };
  ectoDetails: {
    isComplete: boolean;
    hwr: number | null;
    formulaBranch: 'high' | 'mid' | 'low' | null;
    missingVars: string[];
  };
  completedVariablesCount: number;
  totalVariablesCount: number;
  variablesSummary: {
    height: { name: string; value: number | null; formatted: string; isSet: boolean };
    weight: { name: string; value: number | null; formatted: string; isSet: boolean };
    triceps: { name: string; value: number | null; formatted: string; isSet: boolean };
    subescapular: { name: string; value: number | null; formatted: string; isSet: boolean };
    supraespinal: { name: string; value: number | null; formatted: string; isSet: boolean };
    pantorrillaMedial: { name: string; value: number | null; formatted: string; isSet: boolean };
    humeral: { name: string; value: number | null; formatted: string; isSet: boolean };
    femoral: { name: string; value: number | null; formatted: string; isSet: boolean };
    brazoContraido: { name: string; value: number | null; formatted: string; isSet: boolean };
    pantorrillaMaximo: { name: string; value: number | null; formatted: string; isSet: boolean };
  };
}

export interface SomatotypeScaleInfo {
  level: string; // 'baja' | 'moderada' | 'alta' | 'muy alta' | 'extremadamente alta' o masculino
  feminineLevel: string; // 'baja' | 'moderada' | 'alta' | 'muy alta' | 'extremadamente alta'
  masculineLevel: string; // 'bajo' | 'moderado' | 'alto' | 'muy alto' | 'extremadamente alto'
  scaleDescriptor: string; // 'baja adiposidad relativa' / 'bajo desarrollo musculoesquelético' / 'baja linealidad relativa'
  rangeLabel: string; // '0.5 - 2.5' | '2.6 - 5.4' | '5.5 - 7.0' | '7.1 - 8.5' | '> 8.5'
  componentScaleName: string; // 'baja endomorfia' / 'bajo desarrollo musculoesquelético' / 'baja ectomorfia'
}

/**
 * Escalas descriptivas oficiales de Heath & Carter (somatotipo.pdf):
 * - 0.5 a 2.5: Bajo / Baja
 * - 2.6 a 5.4: Moderado / Moderada
 * - 5.5 a 7.0: Alto / Alta
 * - 7.1 a 8.5: Muy alto / Muy alta
 * - > 8.5: Extremadamente alto / Extremadamente alta
 */
export function getSomatotypeComponentScale(
  val: number | null,
  component: 'endo' | 'meso' | 'ecto'
): SomatotypeScaleInfo {
  if (val === null) {
    return {
      level: '—',
      feminineLevel: '—',
      masculineLevel: '—',
      scaleDescriptor: '—',
      rangeLabel: 'Sin datos',
      componentScaleName: '—',
    };
  }

  let feminineLevel = 'moderada';
  let masculineLevel = 'moderado';
  let rangeLabel = '2.6 - 5.4';

  if (val <= 2.5) {
    feminineLevel = 'baja';
    masculineLevel = 'bajo';
    rangeLabel = '0.5 - 2.5';
  } else if (val < 5.5) {
    feminineLevel = 'moderada';
    masculineLevel = 'moderado';
    rangeLabel = '2.6 - 5.4';
  } else if (val <= 7.0) {
    feminineLevel = 'alta';
    masculineLevel = 'alto';
    rangeLabel = '5.5 - 7.0';
  } else if (val <= 8.5) {
    feminineLevel = 'muy alta';
    masculineLevel = 'muy alto';
    rangeLabel = '7.1 - 8.5';
  } else {
    feminineLevel = 'extremadamente alta';
    masculineLevel = 'extremadamente alto';
    rangeLabel = '> 8.5';
  }

  let scaleDescriptor = '';
  let componentScaleName = '';

  if (component === 'endo') {
    scaleDescriptor = `${feminineLevel} adiposidad relativa`;
    componentScaleName = `${feminineLevel} endomorfia`;
  } else if (component === 'meso') {
    scaleDescriptor = `${masculineLevel} desarrollo musculoesquelético`;
    componentScaleName = `${masculineLevel} mesomorfismo`;
  } else {
    scaleDescriptor = `${feminineLevel} linealidad relativa`;
    componentScaleName = `${feminineLevel} ectomorfia`;
  }

  return {
    level: component === 'meso' ? masculineLevel : feminineLevel,
    feminineLevel,
    masculineLevel,
    scaleDescriptor,
    rangeLabel,
    componentScaleName,
  };
}

/**
 * Clasificación de los 13 somatotipos de Heath & Carter (1990)
 */
export function getSomatotypeClassification(endo: number, meso: number, ecto: number): SomatotypeClassificationInfo {
  const diffEM = Math.abs(endo - meso);
  const diffME = Math.abs(meso - ecto);
  const diffEE = Math.abs(endo - ecto);
  const maxComp = Math.max(endo, meso, ecto);
  const minComp = Math.min(endo, meso, ecto);

  // 1. Central / Equilibrado: ningún componente difiere en más de 1 unidad de los otros dos
  if (maxComp - minComp <= 1.0) {
    return {
      name: 'Central / Equilibrado',
      category: 'Equilibrado',
      description: 'Los tres componentes (endomorfia, mesomorfia y ectomorfia) presentan proporciones equilibradas sin predominio marcado de ninguno.',
      colorClass: 'bg-emerald-50 text-emerald-900 border-emerald-300',
      badgeBg: 'bg-emerald-600',
      badgeText: 'text-white',
    };
  }

  // 2. Co-dominancia de pares:
  // Mesomorfo-endomorfo (Endomorfia y mesomorfia iguales o difieren <= 0.5 y ambas mayores que ectomorfia)
  if (diffEM <= 0.5 && endo > ecto + 0.5 && meso > ecto + 0.5) {
    return {
      name: 'Mesomorfo-endomorfo',
      category: 'Endo-mesomórfico',
      description: 'Endomorfia y mesomorfia son co-dominantes. Presenta robustez musculoesquelética combinada con adiposidad relativa y baja linealidad.',
      colorClass: 'bg-amber-50 text-amber-950 border-amber-300',
      badgeBg: 'bg-amber-600',
      badgeText: 'text-white',
    };
  }

  // Mesomorfo-ectomorfo (Mesomorfia y ectomorfia iguales o difieren <= 0.5 y ambas mayores que endomorfia)
  if (diffME <= 0.5 && meso > endo + 0.5 && ecto > endo + 0.5) {
    return {
      name: 'Mesomorfo-ectomorfo',
      category: 'Meso-ectomórfico',
      description: 'Mesomorfia y ectomorfia son co-dominantes. Presenta buena tonicidad muscular y robustez con notable linealidad y baja adiposidad.',
      colorClass: 'bg-teal-50 text-teal-950 border-teal-300',
      badgeBg: 'bg-teal-600',
      badgeText: 'text-white',
    };
  }

  // Endomorfo-ectomorfo (Endomorfia y ectomorfia iguales o difieren <= 0.5 y ambas mayores que mesomorfia)
  if (diffEE <= 0.5 && endo > meso + 0.5 && ecto > meso + 0.5) {
    return {
      name: 'Endomorfo-ectomorfo',
      category: 'Endo-ectomórfico',
      description: 'Endomorfia y ectomorfia son co-dominantes. Estructura ósea delgada o longilínea combinada con depósito graso relativo y menor masa muscular.',
      colorClass: 'bg-indigo-50 text-indigo-950 border-indigo-300',
      badgeBg: 'bg-indigo-600',
      badgeText: 'text-white',
    };
  }

  // 3. Dominancia de Endomorfia:
  if (endo > meso && endo > ecto) {
    if (diffME <= 0.5 || (Math.abs(meso - ecto) < 1.0 && endo - Math.max(meso, ecto) >= 1.0)) {
      return {
        name: 'Endomorfo balanceado',
        category: 'Endomorfo',
        description: 'Predominio absoluto de adiposidad relativa (grasa subcutánea), con mesomorfia y ectomorfia moderadas o bajas y parejas.',
        colorClass: 'bg-orange-50 text-orange-950 border-orange-300',
        badgeBg: 'bg-orange-600',
        badgeText: 'text-white',
      };
    }
    if (meso > ecto) {
      return {
        name: 'Meso-endomorfo',
        category: 'Endomorfo',
        description: 'La endomorfia es dominante y la mesomorfia es mayor que la ectomorfia. Perfil de mayor corpulencia y masa magra respecto a linealidad.',
        colorClass: 'bg-amber-50 text-amber-950 border-amber-300',
        badgeBg: 'bg-amber-700',
        badgeText: 'text-white',
      };
    }
    return {
      name: 'Ecto-endomorfo',
      category: 'Endomorfo',
      description: 'La endomorfia es dominante y la ectomorfia es mayor que la mesomorfia. Adiposidad predominante con extremidades o contextura longilínea.',
      colorClass: 'bg-orange-50 text-orange-950 border-orange-300',
      badgeBg: 'bg-orange-700',
      badgeText: 'text-white',
    };
  }

  // 4. Dominancia de Mesomorfia:
  if (meso > endo && meso > ecto) {
    if (diffEE <= 0.5 || (Math.abs(endo - ecto) < 1.0 && meso - Math.max(endo, ecto) >= 1.0)) {
      return {
        name: 'Mesomorfo balanceado',
        category: 'Mesomorfo',
        description: 'Predominio absoluto de desarrollo musculoesquelético robusto con adiposidad y linealidad corporales bajas y equilibradas.',
        colorClass: 'bg-sky-50 text-sky-950 border-sky-300',
        badgeBg: 'bg-sky-600',
        badgeText: 'text-white',
      };
    }
    if (endo > ecto) {
      return {
        name: 'Endo-mesomorfo',
        category: 'Mesomorfo',
        description: 'La mesomorfia es dominante y la endomorfia es mayor que la ectomorfia. Fuerte componente muscular con moderada adiposidad subcutánea.',
        colorClass: 'bg-blue-50 text-blue-950 border-blue-300',
        badgeBg: 'bg-blue-700',
        badgeText: 'text-white',
      };
    }
    return {
      name: 'Ecto-mesomorfo',
      category: 'Mesomorfo',
      description: 'La mesomorfia es dominante y la ectomorfia es mayor que la endomorfia. Complexión atlética magra, definida y fibrosa con baja adiposidad.',
      colorClass: 'bg-cyan-50 text-cyan-950 border-cyan-300',
      badgeBg: 'bg-cyan-700',
      badgeText: 'text-white',
    };
  }

  // 5. Dominancia de Ectomorfia:
  if (ecto > endo && ecto > meso) {
    if (diffEM <= 0.5 || (Math.abs(endo - meso) < 1.0 && ecto - Math.max(endo, meso) >= 1.0)) {
      return {
        name: 'Ectomorfo balanceado',
        category: 'Ectomorfo',
        description: 'Predominio absoluto de linealidad relativa, delgadez y longitud segmentaria con baja adiposidad y masa muscular moderada.',
        colorClass: 'bg-violet-50 text-violet-950 border-violet-300',
        badgeBg: 'bg-violet-600',
        badgeText: 'text-white',
      };
    }
    if (meso > endo) {
      return {
        name: 'Meso-ectomorfo',
        category: 'Ectomorfo',
        description: 'La ectomorfia es dominante y la mesomorfia es mayor que la endomorfia. Sujetos delgados y atléticos con bajo porcentaje graso.',
        colorClass: 'bg-purple-50 text-purple-950 border-purple-300',
        badgeBg: 'bg-purple-700',
        badgeText: 'text-white',
      };
    }
    return {
      name: 'Endo-ectomorfo',
      category: 'Ectomorfo',
      description: 'La ectomorfia es dominante y la endomorfia es mayor que la mesomorfia. Estructura delgada con mayor depósito adiposo que desarrollo muscular.',
      colorClass: 'bg-fuchsia-50 text-fuchsia-950 border-fuchsia-300',
      badgeBg: 'bg-fuchsia-700',
      badgeText: 'text-white',
    };
  }

  return {
    name: 'Central / Equilibrado',
    category: 'Equilibrado',
    description: 'Perfil somatotípico equilibrado entre los componentes evaluados.',
    colorClass: 'bg-emerald-50 text-emerald-900 border-emerald-300',
    badgeBg: 'bg-emerald-600',
    badgeText: 'text-white',
  };
}

/**
 * Calcula el somatotipo de Heath & Carter utilizando las 10 variables del protocolo ISAK:
 * 1. Estatura (cm)
 * 2. Peso / Masa Corporal (kg)
 * 3. Pliegue Tríceps (mm)
 * 4. Pliegue Subescapular (mm)
 * 5. Pliegue Supraespinal (mm)
 * 6. Pliegue Pantorrilla Medial (mm)
 * 7. Diámetro Biepicondilar del Húmero (cm)
 * 8. Diámetro Biepicondilar del Fémur (cm)
 * 9. Circunferencia de Brazo Contraído (cm)
 * 10. Circunferencia Máxima de Pantorrilla (cm)
 */
export function calculateHeathCarterSomatotype(patientInfo: PatientInfo): HeathCarterSomatotypeResult {
  const parseVal = (v?: string | number): number | null => {
    if (v === undefined || v === null) return null;
    const clean = String(v).replace(',', '.').trim();
    const match = clean.match(/-?\d+(\.\d+)?/);
    if (!match) return null;
    const n = parseFloat(match[0]);
    return isNaN(n) || n <= 0 ? null : n;
  };

  // 1. Estatura en cm (E)
  let heightCm: number | null = null;
  const rawH = parseVal(patientInfo.height);
  if (rawH !== null) {
    heightCm = rawH < 3 ? Math.round(rawH * 100 * 10) / 10 : Math.round(rawH * 10) / 10;
    if (heightCm < 50 || heightCm > 250) heightCm = null;
  }

  // 2. Peso en kg
  let weightKg: number | null = null;
  const rawW = parseVal(patientInfo.weight);
  if (rawW !== null && rawW >= 15 && rawW <= 350) {
    weightKg = Math.round(rawW * 10) / 10;
  }

  // Pliegues cutáneos (mm)
  const triceps = parseVal(patientInfo.skinfolds?.triceps);
  const subescapular = parseVal(patientInfo.skinfolds?.subescapular);
  // Supraespinal: si está vacío se permite como alternativa clínica crestaIliaca
  const supraespinal = parseVal(patientInfo.skinfolds?.supraespinal) ?? parseVal(patientInfo.skinfolds?.crestaIliaca);
  const pantorrillaMedial = parseVal(patientInfo.skinfolds?.pantorrillaMedial);

  // Diámetros óseos (cm): DH (Húmero) y DF (Fémur)
  // Autocorrección: si se ingresó en milímetros (> 20 para húmero o > 25 para fémur), se convierte a centímetros dividiendo entre 10
  const rawHumeral = parseVal(patientInfo.breadths?.humeral);
  const humeral = rawHumeral !== null ? (rawHumeral > 20 ? Math.round((rawHumeral / 10) * 100) / 100 : Math.round(rawHumeral * 100) / 100) : null;

  const rawFemoral = parseVal(patientInfo.breadths?.femoral);
  const femoral = rawFemoral !== null ? (rawFemoral > 25 ? Math.round((rawFemoral / 10) * 100) / 100 : Math.round(rawFemoral * 100) / 100) : null;

  // Perímetros musculares (cm): Brazo contraído y Pantorrilla máxima
  // Alternativa clínica: si brazo contraído no está registrado, se usa brazo relajado como apoyo
  const rawBrazo = parseVal(patientInfo.girths?.brazoContraido) ?? parseVal(patientInfo.girths?.brazoRelajado);
  const brazoContraido = rawBrazo !== null ? Math.round(rawBrazo * 100) / 100 : null;

  const rawPantorrilla = parseVal(patientInfo.girths?.pantorrillaMaximo);
  const pantorrillaMaximo = rawPantorrilla !== null ? Math.round(rawPantorrilla * 100) / 100 : null;

  const variablesSummary = {
    height: { name: 'Estatura (E)', value: heightCm, formatted: heightCm ? `${heightCm.toFixed(1)} cm` : '—', isSet: heightCm !== null },
    weight: { name: 'Peso', value: weightKg, formatted: weightKg ? `${weightKg.toFixed(1)} kg` : '—', isSet: weightKg !== null },
    triceps: { name: 'Pliegue Tríceps', value: triceps, formatted: triceps ? `${triceps.toFixed(1)} mm` : '—', isSet: triceps !== null },
    subescapular: { name: 'Pliegue Subescapular', value: subescapular, formatted: subescapular ? `${subescapular.toFixed(1)} mm` : '—', isSet: subescapular !== null },
    supraespinal: { name: 'Pliegue Supraespinal', value: supraespinal, formatted: supraespinal ? `${supraespinal.toFixed(1)} mm` : '—', isSet: supraespinal !== null },
    pantorrillaMedial: { name: 'Pliegue Pantorrilla Medial', value: pantorrillaMedial, formatted: pantorrillaMedial ? `${pantorrillaMedial.toFixed(1)} mm` : '—', isSet: pantorrillaMedial !== null },
    humeral: { name: 'Diámetro Humeral (DH)', value: humeral, formatted: humeral ? `${humeral.toFixed(2)} cm` : '—', isSet: humeral !== null },
    femoral: { name: 'Diámetro Femoral (DF)', value: femoral, formatted: femoral ? `${femoral.toFixed(2)} cm` : '—', isSet: femoral !== null },
    brazoContraido: { name: 'Brazo Flexionado y Contraído', value: brazoContraido, formatted: brazoContraido ? `${brazoContraido.toFixed(1)} cm` : '—', isSet: brazoContraido !== null },
    pantorrillaMaximo: { name: 'Pantorrilla Máxima', value: pantorrillaMaximo, formatted: pantorrillaMaximo ? `${pantorrillaMaximo.toFixed(1)} cm` : '—', isSet: pantorrillaMaximo !== null },
  };

  const completedVariablesCount = Object.values(variablesSummary).filter((v) => v.isSet).length;
  const totalVariablesCount = 10;
  const hasAnyData = completedVariablesCount > 0;

  // --------------------------------------------------------------------------
  // COMPONENTE 1: ENDOMORFIA (Adiposidad Relativa)
  // Ecuación oficial solicitada:
  // Endomorfia = -0.7182 + 0.1451×(SPC) - 0.00068×(SPC)² + 0.0000014×(SPC)³
  // Donde SPC = Suma de Pliegues Cutáneos corregida por talla:
  // SPC = (Tríceps + Subescapular + Supraespinal) × (170.18 / Estatura)
  // --------------------------------------------------------------------------
  const endoMissing: string[] = [];
  if (heightCm === null) endoMissing.push('Estatura');
  if (triceps === null) endoMissing.push('Pliegue Tríceps');
  if (subescapular === null) endoMissing.push('Pliegue Subescapular');
  if (supraespinal === null) endoMissing.push('Pliegue Supraespinal');

  let endomorphy: number | null = null;
  let endoSumSF: number | null = null;
  let endoCorrectedSum: number | null = null;

  if (endoMissing.length === 0 && heightCm && triceps && subescapular && supraespinal) {
    endoSumSF = Math.round((triceps + subescapular + supraespinal) * 10) / 10;
    // Factor de corrección por talla: SPC = Σ * (170.18 / Estatura en cm)
    endoCorrectedSum = Math.round((endoSumSF * (170.18 / heightCm)) * 100) / 100;
    const SPC = endoCorrectedSum;
    const calcEndo = -0.7182 + (0.1451 * SPC) - (0.00068 * Math.pow(SPC, 2)) + (0.0000014 * Math.pow(SPC, 3));
    endomorphy = Math.max(0.1, Math.round(calcEndo * 10) / 10);
  }

  // --------------------------------------------------------------------------
  // COMPONENTE 2: MESOMORFIA (Robustez Músculo-esquelética)
  // Ecuación oficial solicitada:
  // Mesomorfia = [(0.858×DH) + (0.601×DF) + (0.188×BC) + (0.161×PnC) - (E×0.131)] + 4.5
  // Donde:
  // DH = Diámetro Biepicondilar del Húmero (cm)
  // DF = Diámetro Biepicondilar del Fémur (cm)
  // BC = Perímetro de Brazo Corregido (cm) = Brazo contraído (cm) - (Tríceps (mm) / 10)
  // PnC = Perímetro de Pantorrilla Corregido (cm) = Pantorrilla máx (cm) - (Pantorrilla medial (mm) / 10)
  // E = Estatura (cm)
  // --------------------------------------------------------------------------
  const mesoMissing: string[] = [];
  if (heightCm === null) mesoMissing.push('Estatura');
  if (humeral === null) mesoMissing.push('Diámetro Humeral (DH)');
  if (femoral === null) mesoMissing.push('Diámetro Femoral (DF)');
  if (brazoContraido === null) mesoMissing.push('Brazo Contraído');
  if (pantorrillaMaximo === null) mesoMissing.push('Pantorrilla Máxima');
  if (triceps === null) mesoMissing.push('Pliegue Tríceps');
  if (pantorrillaMedial === null) mesoMissing.push('Pliegue Pantorrilla Medial');

  let mesomorphy: number | null = null;
  let correctedArmGirth: number | null = null;
  let correctedCalfGirth: number | null = null;

  if (mesoMissing.length === 0 && heightCm && humeral && femoral && brazoContraido && pantorrillaMaximo && triceps && pantorrillaMedial) {
    // Perímetros corregidos: perímetro en cm - pliegue en cm (pliegue en mm / 10)
    correctedArmGirth = Math.round((brazoContraido - (triceps / 10)) * 100) / 100;
    correctedCalfGirth = Math.round((pantorrillaMaximo - (pantorrillaMedial / 10)) * 100) / 100;

    const DH = humeral;
    const DF = femoral;
    const BC = correctedArmGirth;
    const PnC = correctedCalfGirth;
    const E = heightCm;

    const calcMeso = ((0.858 * DH) + (0.601 * DF) + (0.188 * BC) + (0.161 * PnC) - (E * 0.131)) + 4.50;
    mesomorphy = Math.max(0.1, Math.round(calcMeso * 10) / 10);
  }

  // --------------------------------------------------------------------------
  // COMPONENTE 3: ECTOMORFIA (Linealidad Relativa / Índice Ponderal HWR)
  // Ecuación oficial solicitada:
  // Se obtiene HWR: HWR = Estatura / ∛Peso  (Estatura en cm, Peso en kg)
  // Rangos de clasificación Heath-Carter:
  // • Si HWR >= 40.75: Ectomorfia = (0.732 × HWR) - 28.58
  // • Si 38.25 <= HWR < 40.75: Ectomorfia = (0.463 × HWR) - 17.63
  // • Si HWR < 38.25: Ectomorfia = 0.1 (mínimo estándar)
  // --------------------------------------------------------------------------
  const ectoMissing: string[] = [];
  if (heightCm === null) ectoMissing.push('Estatura');
  if (weightKg === null) ectoMissing.push('Peso');

  let ectomorphy: number | null = null;
  let hwr: number | null = null;
  let ectoBranch: 'high' | 'mid' | 'low' | null = null;

  if (ectoMissing.length === 0 && heightCm && weightKg) {
    // HWR = Estatura / ∛Peso
    hwr = Math.round((heightCm / Math.cbrt(weightKg)) * 100) / 100;

    let calcEcto = 0.1;
    if (hwr >= 40.75) {
      calcEcto = (0.732 * hwr) - 28.58;
      ectoBranch = 'high';
    } else if (hwr >= 38.25) {
      calcEcto = (0.463 * hwr) - 17.63;
      ectoBranch = 'mid';
    } else {
      calcEcto = 0.1;
      ectoBranch = 'low';
    }
    ectomorphy = Math.max(0.1, Math.round(calcEcto * 10) / 10);
  }

  // --------------------------------------------------------------------------
  // COORDENADAS SOMATOCARTA (X, Y) Y CLASIFICACIÓN
  // Ecuaciones oficiales de Carter & Heath:
  // X = Ectomorfia - Endomorfia
  // Y = 2 × Mesomorfia - (Endomorfia + Ectomorfia)
  // --------------------------------------------------------------------------
  const isComplete = endomorphy !== null && mesomorphy !== null && ectomorphy !== null;

  let x: number | null = null;
  let y: number | null = null;
  let classification: SomatotypeClassificationInfo | null = null;

  if (isComplete && endomorphy !== null && mesomorphy !== null && ectomorphy !== null) {
    x = Math.round((ectomorphy - endomorphy) * 10) / 10;
    y = Math.round(((2 * mesomorphy) - (endomorphy + ectomorphy)) * 10) / 10;
    classification = getSomatotypeClassification(endomorphy, mesomorphy, ectomorphy);
  }

  // --------------------------------------------------------------------------
  // ESCALAS DE CLASIFICACIÓN CUALITATIVA (somatotipo.pdf)
  // Formato oficial solicitado:
  // "(Hombre o mujer) de (edad) años con un peso de (masa corporal) kg y estatura de (estatura) m.
  //  Presenta una (escala de endomorfia), con un (escala de mesomorfia) y una (escala de ectomorfia)."
  // --------------------------------------------------------------------------
  const endoScaleInfo = getSomatotypeComponentScale(endomorphy, 'endo');
  const mesoScaleInfo = getSomatotypeComponentScale(mesomorphy, 'meso');
  const ectoScaleInfo = getSomatotypeComponentScale(ectomorphy, 'ecto');

  const endoScaleText = endomorphy !== null ? endoScaleInfo.scaleDescriptor : null;
  const mesoScaleText = mesomorphy !== null ? mesoScaleInfo.scaleDescriptor : null;
  const ectoScaleText = ectomorphy !== null ? ectoScaleInfo.scaleDescriptor : null;

  // Género: Hombre o Mujer
  const isFemale =
    patientInfo.gender?.toLowerCase() === 'mujer' ||
    patientInfo.gender?.toLowerCase() === 'femenino' ||
    patientInfo.gender?.toLowerCase() === 'f';
  const sexText = isFemale ? 'Mujer' : (patientInfo.gender ? patientInfo.gender : 'Hombre');

  // Edad
  const ageClean = patientInfo.age ? String(patientInfo.age).trim() : '';
  const ageText = ageClean ? `${ageClean} años` : 'edad no especificada';

  // Peso en kg (masa corporal)
  const weightVal =
    weightKg !== null
      ? `${weightKg.toFixed(1)} kg`
      : (patientInfo.weight ? `${String(patientInfo.weight).trim()} kg` : 'peso no especificado');

  // Estatura en metros (m)
  let heightMVal = 'estatura no especificada';
  if (heightCm !== null) {
    const m = heightCm >= 3 ? (heightCm / 100).toFixed(2) : heightCm.toFixed(2);
    heightMVal = `${m} m`;
  } else if (patientInfo.height) {
    const rawH = parseFloat(String(patientInfo.height).replace(',', '.'));
    if (!isNaN(rawH)) {
      const m = rawH >= 3 ? (rawH / 100).toFixed(2) : rawH.toFixed(2);
      heightMVal = `${m} m`;
    }
  }

  let scaleSummaryText: string | null = null;
  if (isComplete && endomorphy !== null && mesomorphy !== null && ectomorphy !== null) {
    scaleSummaryText = `${sexText} de ${ageText} con un peso de ${weightVal} y estatura de ${heightMVal}. Presenta una ${endoScaleInfo.scaleDescriptor}, con un ${mesoScaleInfo.scaleDescriptor} y una ${ectoScaleInfo.scaleDescriptor}.`;
  }

  return {
    isComplete,
    hasAnyData,
    endomorphy,
    mesomorphy,
    ectomorphy,
    endoFormatted: endomorphy !== null ? endomorphy.toFixed(1) : '—',
    mesoFormatted: mesomorphy !== null ? mesomorphy.toFixed(1) : '—',
    ectoFormatted: ectomorphy !== null ? ectomorphy.toFixed(1) : '—',
    x,
    y,
    classification,
    endoScaleText,
    mesoScaleText,
    ectoScaleText,
    scaleSummaryText,
    endoScaleInfo,
    mesoScaleInfo,
    ectoScaleInfo,
    endoDetails: {
      isComplete: endoMissing.length === 0,
      sumSkinfolds: endoSumSF,
      correctedSum: endoCorrectedSum,
      spc: endoCorrectedSum,
      missingVars: endoMissing,
    },
    mesoDetails: {
      isComplete: mesoMissing.length === 0,
      dh: humeral,
      df: femoral,
      bc: correctedArmGirth,
      pnc: correctedCalfGirth,
      e: heightCm,
      correctedArmGirth,
      correctedCalfGirth,
      missingVars: mesoMissing,
    },
    ectoDetails: {
      isComplete: ectoMissing.length === 0,
      hwr,
      formulaBranch: ectoBranch,
      missingVars: ectoMissing,
    },
    completedVariablesCount,
    totalVariablesCount,
    variablesSummary,
  };
}

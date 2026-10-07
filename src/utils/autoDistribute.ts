import { TableGridState, EMPTY_TABLE_STATE } from '../data/smaeData';

/**
 * Distribuye automáticamente equivalentes del SMAE 5ta edición
 * basándose en el gasto energético total o calorías meta del paciente.
 * Reparte de forma equilibrada en los 5 tiempos de comida mexicanos tradicionales:
 * Desayuno (~25%), Colación 1 (~10%), Comida (~35%), Colación 2 (~10%), Cena (~20%).
 */
export function autoDistributeEquivalents(
  targetKcal: number = 1800,
  proteinPercent: number = 20,
  lipidsPercent: number = 25,
  carbsPercent: number = 55
): TableGridState {
  const kcal = Math.max(1000, Math.min(4000, targetKcal || 1800));

  // Gramos meta
  const pGrams = (kcal * (proteinPercent / 100)) / 4;
  const lGrams = (kcal * (lipidsPercent / 100)) / 9;
  const cGrams = (kcal * (carbsPercent / 100)) / 4;

  // Factores de escalamiento respecto a base 1600 kcal
  const scale = kcal / 1600;

  // Cálculo proporcional de equivalentes por grupo (redondeado a múltiplos de 0.5)
  const roundHalf = (val: number) => Math.max(0, Math.round(val * 2) / 2);

  const totalVerduras = roundHalf(Math.min(8, Math.max(3, 4.5 * scale)));
  const totalFrutas = roundHalf(Math.min(6, Math.max(2, 3 * scale)));
  const totalCerealesSg = roundHalf(Math.min(12, Math.max(3, (cGrams - (totalVerduras * 4 + totalFrutas * 15 + 20)) / 15)));
  const totalLeguminosas = roundHalf(scale >= 1.1 ? 1.5 : 1);
  const totalLeche = roundHalf(1);

  // Proteínas de alimentos de origen animal
  // Proteína ya aportada por verduras, cereales, leguminosas, leche:
  const protFromOthers = totalVerduras * 2 + totalCerealesSg * 2 + totalLeguminosas * 8 + totalLeche * 8;
  const remainingProt = Math.max(14, pGrams - protFromOthers);
  const totalAoa = roundHalf(remainingProt / 7);

  // Repartir AOA en muy bajo, bajo y moderado
  const aoaMuyBajo = roundHalf(totalAoa * 0.45);
  const aoaBajo = roundHalf(totalAoa * 0.35);
  const aoaModerado = roundHalf(totalAoa * 0.2);

  // Grasas (Aceite sin proteína y con proteína)
  const lipidsFromOthers = totalLeguminosas * 1 + aoaBajo * 3 + aoaModerado * 5 + totalLeche * 2;
  const remainingLipids = Math.max(10, lGrams - lipidsFromOthers);
  const totalAceites = roundHalf(remainingLipids / 5);
  const aceiteSinProt = roundHalf(totalAceites * 0.65);
  const aceiteConProt = roundHalf(totalAceites * 0.35);

  const newState: TableGridState = JSON.parse(JSON.stringify(EMPTY_TABLE_STATE));

  // Distribuir en los 5 tiempos: Desayuno, Colación 1, Comida, Colación 2, Cena
  // 1. Verdura
  newState.verdura.desayuno = roundHalf(totalVerduras * 0.25);
  newState.verdura.colacion1 = roundHalf(totalVerduras * 0.1);
  newState.verdura.comida = roundHalf(totalVerduras * 0.4);
  newState.verdura.colacion2 = roundHalf(totalVerduras * 0.1);
  newState.verdura.cena = Math.max(0.5, roundHalf(totalVerduras - (newState.verdura.desayuno + newState.verdura.colacion1 + newState.verdura.comida + newState.verdura.colacion2)));

  // 2. Fruta
  newState.fruta.desayuno = roundHalf(totalFrutas * 0.4);
  newState.fruta.colacion1 = roundHalf(totalFrutas * 0.3);
  newState.fruta.colacion2 = Math.max(0.5, roundHalf(totalFrutas - (newState.fruta.desayuno + newState.fruta.colacion1)));

  // 3. Cereales sin grasa
  newState.cereales_sin_grasa.desayuno = roundHalf(totalCerealesSg * 0.3);
  newState.cereales_sin_grasa.colacion1 = totalCerealesSg >= 6 ? 0.5 : 0;
  newState.cereales_sin_grasa.comida = roundHalf(totalCerealesSg * 0.4);
  newState.cereales_sin_grasa.colacion2 = totalCerealesSg >= 8 ? 0.5 : 0;
  newState.cereales_sin_grasa.cena = Math.max(1, roundHalf(totalCerealesSg - (newState.cereales_sin_grasa.desayuno + newState.cereales_sin_grasa.colacion1 + newState.cereales_sin_grasa.comida + newState.cereales_sin_grasa.colacion2)));

  // 4. Leguminosas (principalmente comida y desayuno)
  if (totalLeguminosas >= 1.5) {
    newState.leguminosas.desayuno = 0.5;
    newState.leguminosas.comida = 1;
  } else {
    newState.leguminosas.comida = totalLeguminosas;
  }

  // 5. AOA Muy bajo
  newState.aoa_muy_bajo.comida = roundHalf(aoaMuyBajo * 0.65);
  newState.aoa_muy_bajo.cena = Math.max(0.5, roundHalf(aoaMuyBajo - newState.aoa_muy_bajo.comida));

  // 6. AOA Bajo
  newState.aoa_bajo.desayuno = roundHalf(aoaBajo * 0.5);
  newState.aoa_bajo.cena = Math.max(0.5, roundHalf(aoaBajo - newState.aoa_bajo.desayuno));

  // 7. AOA Moderado (huevo en desayuno)
  newState.aoa_moderado.desayuno = Math.max(0.5, aoaModerado);

  // 8. Leche
  newState.leche_descremada.desayuno = totalLeche;

  // 9. Aceites sin proteína
  newState.aceite_sin_proteina.desayuno = roundHalf(aceiteSinProt * 0.3);
  newState.aceite_sin_proteina.comida = roundHalf(aceiteSinProt * 0.45);
  newState.aceite_sin_proteina.cena = Math.max(0.5, roundHalf(aceiteSinProt - (newState.aceite_sin_proteina.desayuno + newState.aceite_sin_proteina.comida)));

  // 10. Aceites con proteína (oleaginosas en colaciones)
  newState.aceite_con_proteina.colacion1 = roundHalf(aceiteConProt * 0.5);
  newState.aceite_con_proteina.colacion2 = Math.max(0.5, roundHalf(aceiteConProt - newState.aceite_con_proteina.colacion1));

  return newState;
}

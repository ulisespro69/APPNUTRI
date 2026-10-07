import { SMAEFoodItem } from './types';
import { SMAE_AOA_MUY_BAJO } from './animalFoodsMuyBajo';
import { SMAE_AOA_BAJO } from './animalFoodsBajo';
import { SMAE_AOA_MODERADO } from './animalFoodsModerado';
import { SMAE_AOA_ALTO } from './animalFoodsAlto';

export {
  SMAE_AOA_MUY_BAJO,
  SMAE_AOA_BAJO,
  SMAE_AOA_MODERADO,
  SMAE_AOA_ALTO,
};

/**
 * Catálogo completo de Alimentos de Origen Animal (AOA)
 * del Sistema Mexicano de Alimentos Equivalentes (SMAE 5ª Edición)
 * Clasificados en sus 4 subgrupos oficiales:
 * 1. Muy Bajo Aporte de Grasa (40 kcal, 7g Prot, 1g Lip, 0g HC)
 * 2. Bajo Aporte de Grasa (55 kcal, 7g Prot, 3g Lip, 0g HC)
 * 3. Moderado Aporte de Grasa (75 kcal, 7g Prot, 5g Lip, 0g HC)
 * 4. Alto Aporte de Grasa (100 kcal, 7g Prot, 8g Lip, 0g HC)
 */
export const SMAE_ANIMAL_FOODS: SMAEFoodItem[] = [
  ...SMAE_AOA_MUY_BAJO,
  ...SMAE_AOA_BAJO,
  ...SMAE_AOA_MODERADO,
  ...SMAE_AOA_ALTO,
];

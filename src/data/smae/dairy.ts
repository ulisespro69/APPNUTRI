import { SMAEFoodItem } from './types';
import { SMAE_DAIRY_DESCREMADA } from './dairyDescremada';
import { SMAE_DAIRY_SEMIDESCREMADA } from './dairySemidescremada';
import { SMAE_DAIRY_ENTERA } from './dairyEntera';
import { SMAE_DAIRY_CON_AZUCAR } from './dairyConAzucar';

export {
  SMAE_DAIRY_DESCREMADA,
  SMAE_DAIRY_SEMIDESCREMADA,
  SMAE_DAIRY_ENTERA,
  SMAE_DAIRY_CON_AZUCAR,
};

export const SMAE_ALL_DAIRY: SMAEFoodItem[] = [
  ...SMAE_DAIRY_DESCREMADA,
  ...SMAE_DAIRY_SEMIDESCREMADA,
  ...SMAE_DAIRY_ENTERA,
  ...SMAE_DAIRY_CON_AZUCAR,
];

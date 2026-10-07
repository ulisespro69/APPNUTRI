import { SMAEFoodItem } from './types';
import { SMAE_FATS_SIN_PROTEINA } from './fatsSinProteina';
import { SMAE_FATS_CON_PROTEINA } from './fatsConProteina';

export {
  SMAE_FATS_SIN_PROTEINA,
  SMAE_FATS_CON_PROTEINA,
};

export const SMAE_ALL_FATS: SMAEFoodItem[] = [
  ...SMAE_FATS_SIN_PROTEINA,
  ...SMAE_FATS_CON_PROTEINA,
];

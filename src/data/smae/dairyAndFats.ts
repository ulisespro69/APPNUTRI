import { SMAEFoodItem } from './types';
import { SMAE_ALL_DAIRY } from './dairy';
import { SMAE_ALL_FATS, SMAE_FATS_SIN_PROTEINA, SMAE_FATS_CON_PROTEINA } from './fats';

export {
  SMAE_ALL_DAIRY,
  SMAE_ALL_FATS,
  SMAE_FATS_SIN_PROTEINA,
  SMAE_FATS_CON_PROTEINA,
};

export const SMAE_DAIRY_AND_FATS: SMAEFoodItem[] = [
  ...SMAE_ALL_DAIRY,
  ...SMAE_ALL_FATS,
];

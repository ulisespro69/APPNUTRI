import { SMAEFoodItem } from './types';
import { SMAE_SUGARS_SIN_GRASA } from './sugarsSinGrasa';
import { SMAE_SUGARS_CON_GRASA } from './sugarsConGrasa';

export {
  SMAE_SUGARS_SIN_GRASA,
  SMAE_SUGARS_CON_GRASA,
};

export const SMAE_ALL_SUGARS: SMAEFoodItem[] = [
  ...SMAE_SUGARS_SIN_GRASA,
  ...SMAE_SUGARS_CON_GRASA,
];

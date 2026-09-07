import { SMAEFoodItem, SMAECategoryMeta, SMAE_CATEGORIES } from './smae/types';
import { SMAE_VEGETABLES } from './smae/vegetables';
import { SMAE_FRUITS } from './smae/fruits';
import { SMAE_CEREALS } from './smae/cereals';
import { SMAE_LEGUMES } from './smae/legumes';
import { SMAE_ANIMAL_FOODS } from './smae/animalFoods';
import { SMAE_DAIRY_AND_FATS } from './smae/dairyAndFats';
import { SMAE_SUGARS_AND_FREE } from './smae/sugarsAndFree';

export type { SMAEFoodItem, SMAECategoryMeta };
export { SMAE_CATEGORIES };

// Consolidated Master SMAE 5th Edition Database
export const SMAE_FOODS_DATABASE: SMAEFoodItem[] = [
  ...SMAE_VEGETABLES,
  ...SMAE_FRUITS,
  ...SMAE_CEREALS,
  ...SMAE_LEGUMES,
  ...SMAE_ANIMAL_FOODS,
  ...SMAE_DAIRY_AND_FATS,
  ...SMAE_SUGARS_AND_FREE,
];

// Helper utility for normalized, diacritic-insensitive search
export function normalizeSearchString(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Intelligent fuzzy matching for SMAE items:
 * Matches on food name, keywords, group name, notes, portion, etc.
 * Supports multi-word matching (all tokens must match somewhere in the item fields).
 */
export function searchSMAEFoods(query: string, items: SMAEFoodItem[] = SMAE_FOODS_DATABASE): SMAEFoodItem[] {
  const normalizedQuery = normalizeSearchString(query);
  if (!normalizedQuery) {
    return items;
  }

  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

  return items.filter((food) => {
    const normalizedName = normalizeSearchString(food.name);
    const normalizedGroup = normalizeSearchString(food.groupName);
    const normalizedPortion = normalizeSearchString(food.portionHousehold);
    const normalizedNotes = normalizeSearchString(food.notes || '');
    const normalizedKeywords = (food.keywords || []).map(normalizeSearchString).join(' ');

    const combinedSearchTarget = `${normalizedName} ${normalizedGroup} ${normalizedPortion} ${normalizedNotes} ${normalizedKeywords}`;

    return queryTokens.every((token) => combinedSearchTarget.includes(token));
  });
}

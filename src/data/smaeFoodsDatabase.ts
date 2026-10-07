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

// Pre-computed search index map for sub-millisecond lookups across all items
const SEARCH_TARGET_MAP = new WeakMap<SMAEFoodItem, string>();

for (let i = 0; i < SMAE_FOODS_DATABASE.length; i++) {
  const food = SMAE_FOODS_DATABASE[i];
  const normalizedName = normalizeSearchString(food.name);
  const normalizedGroup = normalizeSearchString(food.groupName);
  const normalizedPortion = normalizeSearchString(food.portionHousehold);
  const normalizedNotes = normalizeSearchString(food.notes || '');
  const normalizedKeywords = (food.keywords || []).map(normalizeSearchString).join(' ');
  SEARCH_TARGET_MAP.set(
    food,
    `${normalizedName} ${normalizedGroup} ${normalizedPortion} ${normalizedNotes} ${normalizedKeywords}`
  );
}

export function getFoodSearchTarget(food: SMAEFoodItem): string {
  let target = SEARCH_TARGET_MAP.get(food);
  if (!target) {
    const normalizedName = normalizeSearchString(food.name);
    const normalizedGroup = normalizeSearchString(food.groupName);
    const normalizedPortion = normalizeSearchString(food.portionHousehold);
    const normalizedNotes = normalizeSearchString(food.notes || '');
    const normalizedKeywords = (food.keywords || []).map(normalizeSearchString).join(' ');
    target = `${normalizedName} ${normalizedGroup} ${normalizedPortion} ${normalizedNotes} ${normalizedKeywords}`;
    SEARCH_TARGET_MAP.set(food, target);
  }
  return target;
}

// Pre-indexed category cache to avoid re-filtering 1,000+ items repeatedly
export const CATEGORY_ITEMS_CACHE: Record<string, SMAEFoodItem[]> = {
  all: SMAE_FOODS_DATABASE,
  leche: SMAE_FOODS_DATABASE.filter(
    (f) => f.category.startsWith('leche') || (f.groupId && f.groupId.startsWith('leche')) || f.category === 'leche'
  ),
  grasas: SMAE_FOODS_DATABASE.filter(
    (f) => f.category.startsWith('grasas') || (f.groupId && f.groupId.startsWith('grasas')) || f.category === 'grasas'
  ),
  azucares: SMAE_FOODS_DATABASE.filter(
    (f) => f.category.startsWith('azucares') || (f.groupId && f.groupId.startsWith('azucares')) || f.category === 'azucares'
  ),
};

for (const cat of SMAE_CATEGORIES) {
  if (!CATEGORY_ITEMS_CACHE[cat.id]) {
    CATEGORY_ITEMS_CACHE[cat.id] = SMAE_FOODS_DATABASE.filter(
      (f) => f.category === cat.id || f.groupId === cat.id
    );
  }
}

// Precalculated category counts computed once at startup
export const PRECALCULATED_CATEGORY_COUNTS: Record<string, number> = (() => {
  const counts: Record<string, number> = { all: SMAE_FOODS_DATABASE.length };
  for (const food of SMAE_FOODS_DATABASE) {
    counts[food.category] = (counts[food.category] || 0) + 1;
    if (food.groupId && food.groupId !== food.category) {
      counts[food.groupId] = (counts[food.groupId] || 0) + 1;
    }
    if (food.category.startsWith('leche') || (food.groupId && food.groupId.startsWith('leche'))) {
      counts['leche'] = (counts['leche'] || 0) + 1;
    }
    if (food.category.startsWith('grasas') || (food.groupId && food.groupId.startsWith('grasas'))) {
      counts['grasas'] = (counts['grasas'] || 0) + 1;
    }
    if (food.category.startsWith('azucares') || (food.groupId && food.groupId.startsWith('azucares'))) {
      counts['azucares'] = (counts['azucares'] || 0) + 1;
    }
  }
  return counts;
})();

/**
 * Intelligent fuzzy matching for SMAE items:
 * High-performance search using pre-indexed search targets.
 * Matches on food name, keywords, group name, notes, portion, etc.
 * Supports multi-word matching (all tokens must match somewhere in the item fields).
 */
export function searchSMAEFoods(query: string, items: SMAEFoodItem[] = SMAE_FOODS_DATABASE): SMAEFoodItem[] {
  const normalizedQuery = normalizeSearchString(query);
  if (!normalizedQuery) {
    return items;
  }

  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (queryTokens.length === 0) {
    return items;
  }

  return items.filter((food) => {
    const target = getFoodSearchTarget(food);
    for (let i = 0; i < queryTokens.length; i++) {
      if (!target.includes(queryTokens[i])) {
        return false;
      }
    }
    return true;
  });
}

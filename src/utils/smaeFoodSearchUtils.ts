import { SMAE_FOODS_DATABASE, SMAEFoodItem, normalizeSearchString } from '../data/smaeFoodsDatabase';

/**
 * Calculates Levenshtein edit distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export interface SmaeSearchResultGroup {
  exactMatches: SMAEFoodItem[];
  closeMatches: SMAEFoodItem[];
  totalFound: number;
}

/**
 * Searches exclusively for the requested SMAE food and foods with names closely related to it.
 * Strictly adheres to: "mostrar solo el alimento buscado junto con el nombre cercano al mismo".
 */
export function searchSpecificSmaeFood(
  query: string,
  database: SMAEFoodItem[] = SMAE_FOODS_DATABASE
): SmaeSearchResultGroup {
  const normQuery = normalizeSearchString(query);
  if (!normQuery || normQuery.length < 2) {
    return { exactMatches: [], closeMatches: [], totalFound: 0 };
  }

  const queryTokens = normQuery.split(/\s+/).filter(Boolean);
  const primaryToken = queryTokens[0];

  const exactMatches: SMAEFoodItem[] = [];
  const closeMatches: { item: SMAEFoodItem; score: number }[] = [];
  const seenIds = new Set<string>();

  for (const food of database) {
    const normName = normalizeSearchString(food.name);
    const nameWords = normName.split(/[^\w]+/).filter(Boolean);

    // 1. Exact or direct matches
    // Food starts with the full search query or the exact primary word is the first word
    const startsWithFull = normName.startsWith(normQuery);
    const firstWordMatches = nameWords[0] === primaryToken;
    const fullQueryContained = normName.includes(normQuery);

    if (startsWithFull || (firstWordMatches && queryTokens.every((t) => normName.includes(t)))) {
      exactMatches.push(food);
      seenIds.add(food.id);
      continue;
    }

    // Contains full query as contiguous phrase
    if (fullQueryContained && nameWords.includes(primaryToken)) {
      exactMatches.push(food);
      seenIds.add(food.id);
      continue;
    }

    // 2. Close matches (same core food in compound title, or closely related name)
    // If the food name contains all query tokens
    if (queryTokens.every((t) => normName.includes(t))) {
      closeMatches.push({ item: food, score: 90 });
      seenIds.add(food.id);
      continue;
    }

    // Keywords exact match
    const keywords = (food.keywords || []).map(normalizeSearchString);
    if (keywords.some((k) => k === normQuery || k.startsWith(normQuery))) {
      closeMatches.push({ item: food, score: 80 });
      seenIds.add(food.id);
      continue;
    }

    // Check typo tolerance or word root closeness
    if (primaryToken.length >= 4) {
      let isCloseWord = false;
      for (const word of nameWords) {
        if (word.length >= 3) {
          const dist = levenshteinDistance(word.slice(0, primaryToken.length), primaryToken);
          if (dist <= 1 || (primaryToken.length >= 6 && dist <= 2)) {
            isCloseWord = true;
            break;
          }
        }
      }
      if (isCloseWord) {
        closeMatches.push({ item: food, score: 65 });
        seenIds.add(food.id);
        continue;
      }
    }

    // Close keyword match
    if (primaryToken.length >= 4) {
      const keywordMatch = keywords.some((k) => {
        const kWords = k.split(/[^\w]+/);
        return kWords.some((kw) => kw.length >= 3 && levenshteinDistance(kw.slice(0, primaryToken.length), primaryToken) <= 1);
      });
      if (keywordMatch) {
        closeMatches.push({ item: food, score: 50 });
        seenIds.add(food.id);
      }
    }
  }

  // Sort close matches by relevance score
  closeMatches.sort((a, b) => b.score - a.score);

  // Return only the exact matches and the closest related items
  const limitedExact = exactMatches.slice(0, 10);
  const limitedClose = closeMatches.map((c) => c.item).slice(0, 8);

  return {
    exactMatches: limitedExact,
    closeMatches: limitedClose,
    totalFound: limitedExact.length + limitedClose.length,
  };
}

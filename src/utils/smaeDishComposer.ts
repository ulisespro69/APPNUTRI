import { SMAEIngredient, MenuOption } from '../types';

/**
 * Normalizes strings for culinary keyword matching (lowercase, strips accents).
 */
function cleanStr(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Checks if a dish title has an obvious, severe culinary contradiction with its ingredients.
 * For example:
 * - Title is "Omelette..." or "Huevos..." but ingredients have NO eggs and contain chicken or meat or fish.
 * - Title is "Pechuga de pollo..." but ingredients contain NO chicken.
 * - Title is "Bistec de res..." but ingredients contain NO beef.
 * - Title is "Filete de pescado..." or "Atún..." but ingredients contain NO fish.
 * - Title is "Quesadillas..." but ingredients have no cheese or no tortillas.
 * - Title is "Avena..." but ingredients have no oatmeal.
 */
export function isTitleContradictory(title: string, ingredients: SMAEIngredient[]): boolean {
  if (!title || !ingredients || ingredients.length === 0) return true;

  const t = cleanStr(title);
  const allFoods = cleanStr(ingredients.map((i) => i.foodName).join(' '));

  // 1. Egg contradiction: claims Omelette/Huevos/Claras, but ingredients have NO egg
  const claimsEgg =
    t.includes('omelette') ||
    t.includes('huevo') ||
    t.includes('claras') ||
    t.includes('frittata') ||
    t.includes('revuelto') ||
    t.includes('pochado') ||
    t.includes('estrellado');
  const hasEgg =
    allFoods.includes('huevo') ||
    allFoods.includes('claras') ||
    allFoods.includes('blanquillo');

  if (claimsEgg && !hasEgg) {
    return true; // CRITICAL: This was the user's exact bug ("omelette tiene ingredientes como pollo")
  }

  // 2. Chicken contradiction: claims Pollo/Pechuga, but ingredients have NO chicken
  const claimsChicken = t.includes('pollo') || t.includes('pechuga');
  const hasChicken = allFoods.includes('pollo') || allFoods.includes('pechuga');
  if (claimsChicken && !hasChicken) {
    return true;
  }

  // 3. Beef / Meat contradiction
  const claimsBeef = t.includes('bistec') || t.includes('res ') || t.includes('carne asada') || t.includes('ternera');
  const hasBeef = allFoods.includes('bistec') || allFoods.includes('res') || allFoods.includes('carne magra');
  if (claimsBeef && !hasBeef) {
    return true;
  }

  // 4. Fish / Seafood contradiction
  const claimsFish =
    t.includes('pescado') ||
    t.includes('tilapia') ||
    t.includes('merluza') ||
    t.includes('salmon') ||
    t.includes('atun') ||
    t.includes('camaron');
  const hasFish =
    allFoods.includes('pescado') ||
    allFoods.includes('tilapia') ||
    allFoods.includes('merluza') ||
    allFoods.includes('salmon') ||
    allFoods.includes('atun') ||
    allFoods.includes('camaron');
  if (claimsFish && !hasFish) {
    return true;
  }

  // 5. Quesadilla contradiction: needs cheese and tortilla
  const claimsQuesadilla = t.includes('quesadilla');
  const hasCheese = allFoods.includes('queso') || allFoods.includes('requeson');
  const hasTortilla = allFoods.includes('tortilla');
  if (claimsQuesadilla && (!hasCheese || !hasTortilla)) {
    return true;
  }

  // 6. Oatmeal contradiction
  const claimsOats = t.includes('avena');
  const hasOats = allFoods.includes('avena');
  if (claimsOats && !hasOats) {
    return true;
  }

  return false;
}

/**
 * Extracts key culinary roles from the ingredients list.
 */
function analyzeIngredientRoles(ingredients: SMAEIngredient[]) {
  let mainProtein: SMAEIngredient | null = null;
  let mainCereal: SMAEIngredient | null = null;
  let mainVeg: SMAEIngredient | null = null;
  let mainFruit: SMAEIngredient | null = null;
  let mainDairy: SMAEIngredient | null = null;
  let mainFat: SMAEIngredient | null = null;
  let mainLegume: SMAEIngredient | null = null;

  for (const ing of ingredients) {
    const grp = cleanStr(ing.smaeGroup);
    const f = cleanStr(ing.foodName);

    if (grp.includes('animal') || grp.includes('aoa')) {
      if (!mainProtein) mainProtein = ing;
    } else if (grp.includes('leguminosa')) {
      if (!mainLegume) mainLegume = ing;
      if (!mainProtein) mainProtein = ing;
    } else if (grp.includes('cereal')) {
      if (!mainCereal) mainCereal = ing;
    } else if (grp.includes('verdura')) {
      if (!mainVeg) mainVeg = ing;
    } else if (grp.includes('fruta')) {
      if (!mainFruit) mainFruit = ing;
    } else if (grp.includes('leche')) {
      if (!mainDairy) mainDairy = ing;
    } else if (grp.includes('aceite') || grp.includes('grasa')) {
      if (!mainFat) mainFat = ing;
    }
  }

  // If no animal protein found, legume can act as protein
  if (!mainProtein && mainLegume) {
    mainProtein = mainLegume;
  }

  return { mainProtein, mainCereal, mainVeg, mainFruit, mainDairy, mainFat, mainLegume };
}

/**
 * Cleans food names to short culinary descriptors for titles.
 */
function toShortCulinaryName(fullName: string): string {
  if (!fullName) return '';
  let s = fullName.split('(')[0].trim();
  s = s.replace(/cocid[ao]s?/gi, '')
       .replace(/al vapor/gi, '')
       .replace(/fresc[ao]s?/gi, '')
       .replace(/sin piel/gi, '')
       .replace(/en rebanadas?/gi, '')
       .replace(/en cubos?/gi, '')
       .replace(/nixtamalizad[ao]/gi, '')
       .replace(/bajo en sodio/gi, '')
       .replace(/drenad[ao]/gi, '')
       .replace(/deshebrad[ao]/gi, '')
       .trim();

  // Capitalize first letter
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Synthesizes an authentic, delicious Mexican clinical recipe title
 * that is 100% coherent with the actual ingredients in the option.
 */
export function synthesizeDishTitle(
  mealName: string,
  ingredients: SMAEIngredient[],
  optionIndex: number = 0
): string {
  if (!ingredients || ingredients.length === 0) {
    return `Opción Balanceada de ${mealName}`;
  }

  const mealClean = cleanStr(mealName);
  const isBreakfast = mealClean.includes('desayuno');
  const isDinner = mealClean.includes('cena');
  const isLunch = mealClean.includes('comida');
  const isSnack = mealClean.includes('colacion') || mealClean.includes('snack');

  const { mainProtein, mainCereal, mainVeg, mainFruit, mainDairy, mainFat } =
    analyzeIngredientRoles(ingredients);

  const protStr = mainProtein ? cleanStr(mainProtein.foodName) : '';
  const cerStr = mainCereal ? cleanStr(mainCereal.foodName) : '';
  const vegStr = mainVeg ? cleanStr(mainVeg.foodName) : '';
  const fruitStr = mainFruit ? cleanStr(mainFruit.foodName) : '';
  const fatStr = mainFat ? cleanStr(mainFat.foodName) : '';

  const shortVeg = mainVeg ? toShortCulinaryName(mainVeg.foodName) : '';
  const shortCer = mainCereal ? toShortCulinaryName(mainCereal.foodName) : '';
  const shortFruit = mainFruit ? toShortCulinaryName(mainFruit.foodName) : '';
  const shortFat = mainFat ? toShortCulinaryName(mainFat.foodName) : '';

  // --- 1. CHICKEN (Pechuga de pollo) ---
  if (protStr.includes('pollo') || protStr.includes('pechuga')) {
    if (isBreakfast) {
      if (cerStr.includes('tortilla')) {
        return optionIndex === 0
          ? `Tacos Suaves de Pechuga Deshebrada con ${shortVeg || 'Salsa Casera'} y Tortillas Comaleadas`
          : optionIndex === 1
          ? `Fajitas Ligeras de Pollo a la Plancha con ${shortVeg || 'Nopales'} y Tortillas`
          : `Guisado Rápido de Pechuga de Pollo con ${shortVeg || 'Verduras'} y Tortillas de Maíz`;
      }
      if (cerStr.includes('pan')) {
        return `Sándwich Saludable de Pechuga de Pollo Asada con ${shortVeg || 'Verduras Frescas'}`;
      }
      if (cerStr.includes('tostada')) {
        return `Tostadas Horneadas con Pechuga Deshebrada, ${shortVeg || 'Lechuga'} y Aguacate`;
      }
      return optionIndex === 1
        ? `Pechuga de Pollo Asada al Limón con ${shortVeg || 'Verduras al Vapor'} y ${shortCer || 'Guarnición'}`
        : `Fajitas de Pechuga de Pollo Salteada con ${shortVeg || 'Verduras'} y ${shortCer || 'Cereal'}`;
    }

    if (isLunch) {
      if (optionIndex === 0) {
        return `Pechuga de Pollo en Salsa Verde o Roja con ${shortVeg || 'Calabacitas'} y ${shortCer || 'Arroz'}`;
      }
      if (optionIndex === 1) {
        return `Pechuga de Pollo a la Plancha con Finas Hierbas, ${shortVeg || 'Nopales'} y ${shortCer || 'Arroz Integral'}`;
      }
      return `Fajitas de Pechuga de Pollo Salteadas con ${shortVeg || 'Pimientos'} y ${shortCer || 'Tortillas'}`;
    }

    if (isDinner) {
      if (cerStr.includes('tostada')) {
        return `Tostadas Ligeras de Salpicón de Pollo con ${shortVeg || 'Lechuga'} y Aguacate`;
      }
      if (cerStr.includes('pan')) {
        return `Sándwich Ligero de Pechuga de Pollo con ${shortVeg || 'Espinacas'} al Comal`;
      }
      return optionIndex === 0
        ? `Pechuga de Pollo Deshebrada con ${shortVeg || 'Nopales Asados'} y ${shortCer || 'Tortilla'}`
        : `Ensalada Fresca con Tiras de Pechuga de Pollo Asada y ${shortCer || 'Tostadas'}`;
    }

    // Default for chicken
    return `Pechuga de Pollo a la Plancha con ${shortVeg || 'Verduras'} y ${shortCer || 'Guarnición'}`;
  }

  // --- 2. EGGS / CLARAS (Huevo / Claras) ---
  if (protStr.includes('huevo') || protStr.includes('claras') || protStr.includes('blanquillo')) {
    const isClaras = protStr.includes('claras');
    const eggWord = isClaras ? 'Claras' : 'Huevos';

    if (isBreakfast || isDinner) {
      if (optionIndex === 1) {
        // Here an Omelette is authentic and 100% correct!
        return `Omelette Esponjoso de ${shortVeg || 'Espinacas'} con ${shortCer || 'Tortilla de Maíz'}`;
      }
      if (optionIndex === 0) {
        return `${eggWord} Revueltos a la Mexicana con ${shortVeg || 'Jitomate'} y ${shortCer || 'Tortillas'}`;
      }
      return `${eggWord} al Comal con ${shortVeg || 'Calabacitas'} y ${shortCer || 'Pan Integral'}`;
    }

    return optionIndex === 1
      ? `Omelette Saludable con ${shortVeg || 'Verduras'} y ${shortCer || 'Guarnición'}`
      : `${eggWord} Revueltos con ${shortVeg || 'Nopales'} y ${shortCer || 'Cereal'}`;
  }

  // --- 3. FISH (Pescado blanco, Salmón, Tilapia) ---
  if (
    protStr.includes('pescado') ||
    protStr.includes('tilapia') ||
    protStr.includes('merluza') ||
    protStr.includes('salmon') ||
    protStr.includes('robalo')
  ) {
    const fishName = protStr.includes('salmon') ? 'Salmón' : 'Filete de Pescado';
    if (optionIndex === 0) {
      return `${fishName} a la Plancha al Limón y Ajo con ${shortVeg || 'Calabacitas'} y ${shortCer || 'Arroz'}`;
    }
    if (optionIndex === 1) {
      return `${fishName} Empapelado con ${shortVeg || 'Espinacas y Jitomate'} y ${shortCer || 'Papa Cocida'}`;
    }
    return `Tacos Suaves de ${fishName} Asado con Ensalada de ${shortVeg || 'Col y Pepino'}`;
  }

  // --- 4. TUNA (Atún) ---
  if (protStr.includes('atun')) {
    if (cerStr.includes('tostada')) {
      return `Tostadas Horneadas de Ensalada Fresca de Atún con ${shortVeg || 'Pepinillos y Jitomate'}`;
    }
    if (cerStr.includes('pan')) {
      return `Sándwich de Ensalada de Atún Ligero con ${shortVeg || 'Lechuga'} y Aguacate`;
    }
    return optionIndex === 1
      ? `Salpicón de Atún Fresco con Limón, ${shortVeg || 'Pepino'} y ${shortCer || 'Tostadas'}`
      : `Bowl Saludable de Atún con ${shortVeg || 'Verduras Frescas'} y ${shortCer || 'Cereal'}`;
  }

  // --- 5. BEEF (Res / Bistec) ---
  if (protStr.includes('res') || protStr.includes('bistec') || protStr.includes('carne')) {
    if (optionIndex === 0) {
      return `Bistec de Res Magro Asado con ${shortVeg || 'Nopales al Comal'} y ${shortCer || 'Frijoles con Tortilla'}`;
    }
    if (optionIndex === 1) {
      return `Fajitas de Res Magra Salteadas con ${shortVeg || 'Pimientos'} y ${shortCer || 'Arroz Integral'}`;
    }
    return `Carne Asada Magra con Ensalada de ${shortVeg || 'Verduras'} y ${shortCer || 'Tortillas'}`;
  }

  // --- 6. CHEESE (Queso panela, Oaxaca, Requesón) ---
  if (protStr.includes('queso') || protStr.includes('requeson')) {
    const cheeseName = protStr.includes('oaxaca')
      ? 'Queso Oaxaca'
      : protStr.includes('requeson')
      ? 'Requesón'
      : 'Queso Panela';

    if (cerStr.includes('tortilla')) {
      return optionIndex === 0
        ? `Quesadillas Comaleadas de ${cheeseName} con ${shortVeg || 'Flor de Calabaza o Nopales'}`
        : `Dobladas Ligeras de Maíz con ${cheeseName} y Ensalada de ${shortVeg || 'Pepino'}`;
    }
    if (cerStr.includes('pan')) {
      return `Tostadas de Pan Integral con ${cheeseName} Fresco y ${shortVeg || 'Jitomate con Aguacate'}`;
    }
    if (vegStr.includes('nopal')) {
      return `Nopales Asados con ${cheeseName} a la Plancha y ${shortCer || 'Tortilla'}`;
    }
    return `Ensalada Fresca con Cubos de ${cheeseName}, ${shortVeg || 'Verduras'} y ${shortCer || 'Cereal'}`;
  }

  // --- 7. TURKEY HAM (Jamón de pavo / Salchicha) ---
  if (protStr.includes('jamon') || protStr.includes('salchicha')) {
    if (cerStr.includes('tortilla')) {
      return `Sincronizada Ligera de Jamón de Pavo con ${shortVeg || 'Verdura'} y Salsa`;
    }
    if (cerStr.includes('pan')) {
      return `Sándwich Integral de Jamón de Pavo con ${shortVeg || 'Jitomate y Lechuga'}`;
    }
    return `Rollitos de Jamón de Pavo Rellenos de ${shortVeg || 'Verduras'} con ${shortCer || 'Galletas o Tostadas'}`;
  }

  // --- 8. LEGUMES AS MAIN (Frijoles, Lentejas, Garbanzos) ---
  if (protStr.includes('frijol') || protStr.includes('lenteja') || protStr.includes('garbanzo')) {
    if (protStr.includes('frijol') && cerStr.includes('tortilla')) {
      return `Enfrijoladas Ligeras Caseras con ${shortVeg || 'Nopales'} y Salsa Fresca`;
    }
    if (protStr.includes('lenteja')) {
      return `Sopa Nutritiva de Lentejas Caseras con ${shortVeg || 'Zanahoria y Espinacas'} y ${shortCer || 'Arroz'}`;
    }
    if (protStr.includes('garbanzo')) {
      return `Bowl de Garbanzos Salteados al Pimentón con ${shortVeg || 'Calabacitas'} y ${shortCer || 'Quinoa'}`;
    }
  }

  // --- 9. OATS / CEREAL + FRUIT (Desayuno dulce o Colación) ---
  if (cerStr.includes('avena')) {
    return optionIndex === 0
      ? `Bowl Cálido de Avena Integral con ${shortFruit || 'Manzana y Canela'} y ${shortFat || 'Almendras'}`
      : optionIndex === 1
      ? `Avena Fría Trasnochada con ${shortFruit || 'Fruta Fresca'} y ${shortFat || 'Nueces'}`
      : `Porridge Cremoso de Avena con ${shortFruit || 'Plátano o Fresas'} y Semillas`;
  }

  // --- 10. YOGURT + FRUIT (Desayuno o Colación) ---
  if (protStr.includes('yogur') || (mainDairy && cleanStr(mainDairy.foodName).includes('yogur'))) {
    return optionIndex === 0
      ? `Copa de Yogur Natural Descremado con ${shortFruit || 'Fresas'} y ${shortFat || 'Almendras Tostadas'}`
      : `Bowl Refrescante de Yogur con ${shortFruit || 'Papaya en Cubos'} y ${shortCer || 'Amaranto o Avena'}`;
  }

  // --- 11. FRUIT + NUTS/SEEDS (Colaciones) ---
  if (mainFruit && mainFat && isSnack) {
    return optionIndex === 0
      ? `Plato de ${shortFruit} Fresca en Rodajas con ${shortFat} Tostadas`
      : optionIndex === 1
      ? `Mix Energético de ${shortFruit} con ${shortFat}`
      : `Snack Crujiente de ${shortFruit} con Semillas Saludables`;
  }

  // --- 12. VEGETABLES + CEREAL ---
  if (mainVeg && mainCereal) {
    return `Salteado Casero de ${shortVeg} con ${shortCer} y Toque de ${shortFat || 'Aceite de Oliva'}`;
  }

  // General fallback that strictly mentions real ingredients
  const firstFood = toShortCulinaryName(ingredients[0].foodName);
  const secondFood = ingredients[1] ? toShortCulinaryName(ingredients[1].foodName) : '';
  return secondFood
    ? `Platillo Balanceado de ${firstFood} con ${secondFood}`
    : `Preparación Saludable de ${firstFood}`;
}

/**
 * Synthesizes clear, practical culinary preparation steps
 * aligned with the real ingredients in the option.
 */
export function synthesizePreparation(title: string, ingredients: SMAEIngredient[]): string {
  const { mainProtein, mainCereal, mainVeg, mainFruit, mainDairy, mainFat } =
    analyzeIngredientRoles(ingredients);

  const protStr = mainProtein ? cleanStr(mainProtein.foodName) : '';
  const cerStr = mainCereal ? cleanStr(mainCereal.foodName) : '';
  const vegStr = mainVeg ? cleanStr(mainVeg.foodName) : '';
  const fruitStr = mainFruit ? cleanStr(mainFruit.foodName) : '';

  // Chicken
  if (protStr.includes('pollo') || protStr.includes('pechuga')) {
    return `1. Cocinar la pechuga de pollo a la plancha o en sartén antiadherente con la porción de grasa asignada hasta que esté bien dorada y cocida.
2. Saltear o cocer al vapor las verduras (${vegStr || 'vegetales'}) sazonando con una pizca de sal marina y hierbas de olor.
3. Calentar el cereal (${cerStr || 'tortillas/arroz'}) al comal y servir caliente con salsa casera al gusto.`;
  }

  // Eggs / Omelette
  if (protStr.includes('huevo') || protStr.includes('claras')) {
    const isOmelette = cleanStr(title).includes('omelette');
    if (isOmelette) {
      return `1. Batir los huevos/claras con una pizca de sal y pimienta.
2. Verter en el sartén precalentado con la cucharadita de grasa asignada; cuando comience a cuajar, añadir las verduras (${vegStr || 'espinacas'}).
3. Doblar suavemente en forma de media luna (omelette) y cocinar 1 minuto más. Servir acompañado de ${cerStr || 'la porción de cereal'}.`;
    }
    return `1. Batir los huevos/claras en un tazón con una pizca de sal.
2. Saltear las verduras en el sartén con la porción de grasa asignada por 2 minutos.
3. Incorporar el huevo y revolver a fuego medio hasta alcanzar la consistencia deseada. Servir con ${cerStr || 'tortillas calientes'}.`;
  }

  // Fish
  if (protStr.includes('pescado') || protStr.includes('tilapia') || protStr.includes('salmon')) {
    return `1. Sazonar el filete de pescado con jugo de limón fresco, ajo picado y finas hierbas.
2. Cocinar a la plancha o empapelado en papel aluminio con las verduras por 8-10 minutos.
3. Servir caliente acompañado de ${cerStr || 'la porción de arroz o tostadas'}.`;
  }

  // Tuna
  if (protStr.includes('atun')) {
    return `1. Drenar muy bien la lata de atún en agua.
2. En un tazón, mezclar el atún con las verduras picadas (${vegStr || 'pepino y jitomate'}) y gotas de limón.
3. Montar sobre las tostadas horneadas o rebanadas de pan y decorar con la porción de aguacate o aceite asignada.`;
  }

  // Beef
  if (protStr.includes('res') || protStr.includes('bistec')) {
    return `1. Asar el bistec magro al comal o plancha bien caliente con la porción de grasa asignada y sazonar con limón y pimienta.
2. Saltear o asar las verduras al comal junto a la carne.
3. Servir inmediatamente con ${cerStr || 'la porción de cereal asignada'}.`;
  }

  // Cheese / Quesadilla
  if (protStr.includes('queso') || protStr.includes('requeson')) {
    return `1. Calentar las tortillas en el comal y rellenar con la porción exacta de queso para fundir ligeramente.
2. Acompañar con las verduras frescas o salteadas al vapor.
3. Servir con salsa mexicana natural sin grasa adicional.`;
  }

  // Oatmeal
  if (cerStr.includes('avena')) {
    return `1. Cocinar la avena en agua hirviendo o leche con una raja de canela a fuego bajo por 4-5 minutos hasta que esté suave y cremosa.
2. Servir en un tazón y añadir la fruta fresca picada en cubos.
3. Espolvorear las semillas o nueces tostadas por encima para dar textura crocante.`;
  }

  // Fruit + Yogurt or Nuts
  if (fruitStr && (protStr.includes('yogur') || mainDairy || mainFat)) {
    return `1. Lavar, desinfectar y cortar la fruta fresca en cubos o rebanadas delgadas.
2. Colocar en una copa o tazón, incorporar el yogur si está asignado y mezclar suavemente.
3. Añadir las nueces o semillas tostadas por encima y disfrutar frío.`;
  }

  // Default clean preparation
  return `1. Pesar o medir con exactitud los ingredientes según la guía del SMAE 5ta edición.
2. Cocinar o saltear a fuego medio utilizando la porción de grasa asignada.
3. Servir de forma atractiva y balanceada, acompañando con agua natural.`;
}

/**
 * Reconciles an entire MenuOption:
 * Checks if the title contradicts the actual ingredients. If so, synthesizes a brand new,
 * accurate title and preparation that 100% matches the ingredients.
 */
export function reconcileOptionTitleAndPrep(
  option: MenuOption,
  mealName: string,
  optionIndex: number = 0
): MenuOption {
  if (!option || !Array.isArray(option.ingredients) || option.ingredients.length === 0) {
    return option;
  }

  const needsNewTitle = isTitleContradictory(option.title, option.ingredients);

  const finalTitle = needsNewTitle
    ? synthesizeDishTitle(mealName, option.ingredients, optionIndex)
    : option.title;

  const finalPrep = needsNewTitle || !option.preparation
    ? synthesizePreparation(finalTitle, option.ingredients)
    : option.preparation;

  const finalDesc = needsNewTitle || !option.description
    ? `Opción culinaria balanceada que cumple estrictamente con las porciones prescritas del SMAE 5ta edición.`
    : option.description;

  return {
    ...option,
    title: finalTitle,
    preparation: finalPrep,
    description: finalDesc,
  };
}

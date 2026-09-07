import React, { useState, useMemo } from 'react';
import {
  Search,
  BookOpen,
  Filter,
  Check,
  Copy,
  Info,
  Scale,
  Sparkles,
  Flame,
  Wheat,
  Drumstick,
  Droplet,
  CheckCircle2,
  X,
  Layers,
} from 'lucide-react';
import {
  SMAE_FOODS_DATABASE,
  SMAEFoodItem,
  SMAE_CATEGORIES,
  searchSMAEFoods,
} from '../data/smaeFoodsDatabase';

const QUICK_TAGS = [
  'Pechuga de pollo',
  'Huevo',
  'Tortilla de maíz',
  'Avena',
  'Manzana',
  'Frijoles',
  'Aguacate',
  'Atún en agua',
  'Queso panela',
  'Yogurt griego',
  'Almendras',
  'Salmón',
  'Arroz cocido',
  'Nopales',
  'Café',
];

export const SmaeFoodSearchSection: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [portionMultiplier, setPortionMultiplier] = useState<number>(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter foods by selected category and search term
  const filteredFoods = useMemo(() => {
    let items = SMAE_FOODS_DATABASE;

    if (selectedCategory !== 'all') {
      items = items.filter((food) => {
        if (selectedCategory === 'verdura') return food.category === 'verdura';
        if (selectedCategory === 'fruta') return food.category === 'fruta';
        if (selectedCategory === 'cereales_sin_grasa') return food.groupId === 'cereales_sin_grasa';
        if (selectedCategory === 'cereales_con_grasa') return food.groupId === 'cereales_con_grasa';
        if (selectedCategory === 'leguminosas') return food.category === 'leguminosas';
        if (selectedCategory === 'aoa_muy_bajo') return food.groupId === 'aoa_muy_bajo';
        if (selectedCategory === 'aoa_bajo') return food.groupId === 'aoa_bajo';
        if (selectedCategory === 'aoa_moderado') return food.groupId === 'aoa_moderado';
        if (selectedCategory === 'aoa_alto') return food.groupId === 'aoa_alto';
        if (selectedCategory === 'leche') return food.category === 'leche';
        if (selectedCategory === 'grasas') return food.category === 'grasas';
        if (selectedCategory === 'azucares') return food.category === 'azucares';
        if (selectedCategory === 'libres') return food.category === 'libres';
        if (selectedCategory === 'alcohol') return food.category === 'alcohol';
        return true;
      });
    }

    if (searchTerm.trim()) {
      items = searchSMAEFoods(searchTerm, items);
    }

    return items;
  }, [searchTerm, selectedCategory]);

  const handleCopyFood = (food: SMAEFoodItem) => {
    const mult = portionMultiplier;
    const calcKcal = Math.round(food.kcal * mult);
    const calcProt = (food.protein * mult).toFixed(1);
    const calcLip = (food.lipids * mult).toFixed(1);
    const calcCarb = (food.carbs * mult).toFixed(1);
    const gramsText = typeof food.netGrams === 'number' ? `${Math.round(food.netGrams * mult)}g` : food.netGrams;

    const textToCopy = `📋 ${food.name}\n• Porción (${mult} eq): ${food.portionHousehold} (${gramsText})\n• Grupo: ${food.groupName}\n• Aporte: ${calcKcal} kcal | ${calcProt}g Prot | ${calcLip}g Grasa | ${calcCarb}g HC${food.fiberGrams ? ` | ${food.fiberGrams}g Fibra` : ''}\n(Fuente: SMAE 5ta Edición)`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedId(food.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  return (
    <section id="smae-food-search-section" className="my-8 bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0 shadow-inner">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-2xs font-extrabold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 uppercase tracking-widest">
                  Sistema Mexicano de Alimentos Equivalentes
                </span>
                <span className="text-2xs text-emerald-200/80 font-medium">5ta Edición Oficial</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-heading tracking-tight mt-1 text-white">
                Buscador y Calculador de Alimentos SMAE
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/90 mt-0.5 max-w-2xl">
                Consulta porciones exactas, gramajes netos y macronutrientes oficiales de todos los grupos nutricionales de México.
              </p>
            </div>
          </div>

          {/* Multiplier selector */}
          <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 self-start md:self-auto">
            <Scale className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs text-slate-300 font-medium whitespace-nowrap">Escalar Equivalentes:</span>
            <div className="flex items-center gap-1">
              {[0.5, 1, 1.5, 2, 3].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPortionMultiplier(val)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    portionMultiplier === val
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {val}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Search Input */}
        <div className="mt-6 relative">
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
            <input
              id="input-search-smae-food"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Escribe el nombre del alimento (ej. pechuga de pollo, tortilla, manzana, frijoles, avena, aguacate)..."
              className="w-full pl-12 pr-10 py-3.5 bg-white text-slate-900 placeholder:text-slate-400 rounded-2xl text-sm font-medium focus:outline-hidden focus:ring-4 focus:ring-emerald-400/40 shadow-lg"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Search Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 no-scrollbar text-xs">
            <span className="text-2xs font-semibold text-emerald-200/90 shrink-0 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" /> Búsquedas frecuentes:
            </span>
            {QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSearchTerm(tag)}
                className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-emerald-100 text-2xs font-medium border border-white/10 transition-colors whitespace-nowrap active:scale-95"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category Pills Navigation */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3 overflow-x-auto no-scrollbar flex items-center gap-2">
        <div className="flex items-center gap-1.5 shrink-0 text-xs text-slate-600 font-semibold mr-1">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span>Grupos:</span>
        </div>
        {SMAE_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs scale-102'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
            >
              {cat.shortLabel}
            </button>
          );
        })}
      </div>

      {/* Results Header Info */}
      <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold text-slate-800">
            {filteredFoods.length} {filteredFoods.length === 1 ? 'alimento encontrado' : 'alimentos encontrados'}
          </span>
          {selectedCategory !== 'all' && (
            <span className="text-2xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
              Filtrado por: {SMAE_CATEGORIES.find((c) => c.id === selectedCategory)?.label}
            </span>
          )}
          {searchTerm && (
            <span className="text-2xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-medium">
              Búsqueda: "{searchTerm}"
            </span>
          )}
        </div>

        {portionMultiplier !== 1 && (
          <div className="text-2xs text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
            ⚡ Valores multiplicados por {portionMultiplier} equivalentes
          </div>
        )}
      </div>

      {/* Foods Grid */}
      <div className="p-4 sm:p-6 bg-slate-50/50">
        {filteredFoods.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-md mx-auto my-6 shadow-2xs">
            <Info className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">No encontramos coincidencias para "{searchTerm}"</h4>
            <p className="text-xs text-slate-500 mt-1">
              Intenta buscar sin acentos o con términos más sencillos (ej. pollo, huevo, avena, tortilla, manzana, frijoles, arroz, requesón).
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
              >
                Limpiar búsqueda
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                Restablecer filtros
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFoods.map((food) => {
              const mult = portionMultiplier;
              const calcKcal = Math.round(food.kcal * mult);
              const calcProt = +(food.protein * mult).toFixed(1);
              const calcLip = +(food.lipids * mult).toFixed(1);
              const calcCarb = +(food.carbs * mult).toFixed(1);
              const isCopied = copiedId === food.id;

              return (
                <div
                  key={food.id}
                  id={`food-card-${food.id}`}
                  className="bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-500/50 p-4 transition-all duration-150 hover:shadow-md flex flex-col justify-between group relative"
                >
                  <div>
                    {/* Top Group Badge & GI */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-md text-2xs font-extrabold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200/80">
                        {food.groupName}
                      </span>
                      {food.glycemicIndex && (
                        <span
                          className={`px-2 py-0.5 rounded-md text-2xs font-bold ${
                            food.glycemicIndex === 'Bajo'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : food.glycemicIndex === 'Medio'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                          title={`Índice Glucémico: ${food.glycemicIndex}`}
                        >
                          IG {food.glycemicIndex}
                        </span>
                      )}
                    </div>

                    {/* Food Name */}
                    <h3 className="text-sm font-bold text-slate-900 font-heading leading-tight group-hover:text-emerald-800 transition-colors">
                      {food.name}
                    </h3>

                    {/* Portion & Weight */}
                    <div className="mt-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-2xs text-slate-400 block font-medium">Porción de Referencia:</span>
                        <span className="font-bold text-slate-800">{food.portionHousehold}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-2xs text-slate-400 block font-medium">Peso Neto:</span>
                        <span className="font-extrabold text-emerald-800">
                          {typeof food.netGrams === 'number'
                            ? `${Math.round(food.netGrams * mult)} ${food.unit || 'g'}`
                            : food.netGrams}
                        </span>
                      </div>
                    </div>

                    {/* Macros Grid */}
                    <div className="grid grid-cols-4 gap-1.5 mt-3 text-center">
                      <div className="bg-amber-50/80 border border-amber-100 rounded-lg p-1.5">
                        <div className="flex items-center justify-center gap-0.5 text-2xs font-bold text-amber-700">
                          <Flame className="w-2.5 h-2.5" />
                          <span>Kcal</span>
                        </div>
                        <span className="text-xs font-black text-amber-900">{calcKcal}</span>
                      </div>

                      <div className="bg-rose-50/80 border border-rose-100 rounded-lg p-1.5">
                        <div className="flex items-center justify-center gap-0.5 text-2xs font-bold text-rose-700">
                          <Drumstick className="w-2.5 h-2.5" />
                          <span>Prot</span>
                        </div>
                        <span className="text-xs font-black text-rose-900">{calcProt}g</span>
                      </div>

                      <div className="bg-lime-50/80 border border-lime-100 rounded-lg p-1.5">
                        <div className="flex items-center justify-center gap-0.5 text-2xs font-bold text-lime-700">
                          <Droplet className="w-2.5 h-2.5" />
                          <span>Grasa</span>
                        </div>
                        <span className="text-xs font-black text-lime-900">{calcLip}g</span>
                      </div>

                      <div className="bg-sky-50/80 border border-sky-100 rounded-lg p-1.5">
                        <div className="flex items-center justify-center gap-0.5 text-2xs font-bold text-sky-700">
                          <Wheat className="w-2.5 h-2.5" />
                          <span>HC</span>
                        </div>
                        <span className="text-xs font-black text-sky-900">{calcCarb}g</span>
                      </div>
                    </div>

                    {/* Notes / Clinical Insight */}
                    {food.notes && (
                      <p className="text-2xs text-slate-500 mt-2.5 leading-relaxed bg-slate-50/60 p-2 rounded-lg border border-slate-100/80 line-clamp-2">
                        💡 {food.notes}
                      </p>
                    )}
                  </div>

                  {/* Bottom Action bar */}
                  <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-2xs text-slate-400">
                      {food.fiberGrams !== undefined && (
                        <span>Fibra: <strong className="text-slate-600">{+(food.fiberGrams * mult).toFixed(1)}g</strong></span>
                      )}
                      {food.sodiumMg !== undefined && (
                        <span>Sodio: <strong className="text-slate-600">{Math.round(food.sodiumMg * mult)}mg</strong></span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyFood(food)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-2xs font-bold transition-all ${
                        isCopied
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95'
                      }`}
                      title="Copiar porción y macronutrientes"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-white" />
                          <span>¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-500" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Disclaimer */}
      <div className="p-4 bg-slate-100/80 border-t border-slate-200 text-center text-2xs text-slate-500 flex items-center justify-center gap-2">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        <span>
          Catálogo estandarizado según las tablas oficiales del <strong>Sistema Mexicano de Alimentos Equivalentes (SMAE 5ta Edición)</strong>.
        </span>
      </div>
    </section>
  );
};

import React, { useState, useMemo, useDeferredValue, useRef, useEffect } from 'react';
import {
  X,
  Search,
  Copy,
  Check,
  Flame,
  Dna,
  Droplets,
  Wheat,
  Info,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  SMAE_FOODS_DATABASE,
  SMAEFoodItem,
  SMAE_CATEGORIES,
  searchSMAEFoods,
  CATEGORY_ITEMS_CACHE,
  PRECALCULATED_CATEGORY_COUNTS,
} from '../data/smaeFoodsDatabase';

interface SmaeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SmaeGuideModal: React.FC<SmaeGuideModalProps> = ({ isOpen, onClose }) => {
  // Iniciar siempre con el buscador limpio para que el usuario pueda ingresar el alimento
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [portionInput, setPortionInput] = useState<string>('1');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(50);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Valor numérico efectivo del multiplicador calculado a partir de la entrada manual
  const portionMultiplier = useMemo(() => {
    const val = parseFloat(portionInput);
    if (!isNaN(val) && val > 0) return val;
    return 1;
  }, [portionInput]);

  // Al abrir la ventana, reiniciar y limpiar el buscador para permitir nueva entrada inmediata
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedCategory('all');
      setPortionInput('1');
      setCopiedId(null);
      setVisibleLimit(50);

      const timer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.value = '';
          searchInputRef.current.focus();
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Reset visible limit whenever search term or category changes
  useEffect(() => {
    setVisibleLimit(50);
  }, [searchTerm, selectedCategory]);

  // Soporte para cerrar la ventana con la tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Precalculated category counts computed once at module load
  const categoryCounts = PRECALCULATED_CATEGORY_COUNTS;

  // Filtered food items based on category and search term (deferred for ultra-smooth typing)
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const filteredFoods = useMemo(() => {
    const baseItems = CATEGORY_ITEMS_CACHE[selectedCategory] || SMAE_FOODS_DATABASE;
    return searchSMAEFoods(deferredSearchTerm, baseItems);
  }, [deferredSearchTerm, selectedCategory]);

  // Only render visible slice to prevent DOM freezing (progressive rendering)
  const visibleFoods = useMemo(() => {
    return filteredFoods.slice(0, visibleLimit);
  }, [filteredFoods, visibleLimit]);

  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 350) {
      if (visibleLimit < filteredFoods.length) {
        setVisibleLimit((prev) => Math.min(prev + 50, filteredFoods.length));
      }
    }
  };

  const handleCopyFood = (food: SMAEFoodItem) => {
    const scaledKcal = Math.round(food.kcal * portionMultiplier);
    const scaledProt = Math.round(food.protein * portionMultiplier * 10) / 10;
    const scaledLip = Math.round(food.lipids * portionMultiplier * 10) / 10;
    const scaledCarb = Math.round(food.carbs * portionMultiplier * 10) / 10;

    const textToCopy = `${food.name}: ${portionMultiplier === 1 ? food.portionHousehold : `${portionMultiplier} × (${food.portionHousehold})`} (${food.netGrams} ${food.unit}) = ${portionMultiplier} eq. de ${food.groupName} (${scaledKcal} kcal, ${scaledProt}g P, ${scaledLip}g L, ${scaledCarb}g HC)`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(food.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
      searchInputRef.current.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl max-w-5xl w-full h-[92vh] sm:h-[88vh] max-h-[95vh] flex flex-col shadow-2xl border border-emerald-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-900 to-teal-900 px-4 sm:px-6 py-3.5 text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-700/60 flex items-center justify-center text-emerald-200 border border-emerald-500/30 shrink-0">
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-sm sm:text-lg font-black font-heading tracking-tight flex items-center gap-2">
                <span>Buscador y Catálogo SMAE</span>
                <span
                  style={{ fontSize: '12px', textAlign: 'justify' }}
                  className="text-3xs sm:text-2xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30"
                >
                  5ta Edición Oficial
                </span>
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {searchTerm.trim().length > 0 && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="px-2.5 py-1 text-2xs font-semibold bg-emerald-950/40 hover:bg-emerald-950/80 text-emerald-200 hover:text-white rounded-lg border border-emerald-700/40 transition-colors"
                title="Limpiar buscador"
              >
                Limpiar
              </button>
            )}
            <button
              id="btn-close-smae-guide"
              onClick={onClose}
              className="p-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-950/70 text-emerald-200 hover:text-white transition-colors border border-emerald-800/40"
              title="Cerrar buscador (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Direct Controls */}
        <div className="p-3.5 sm:p-5 border-b border-slate-200/80 bg-slate-50/90 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
            {/* Search Input (Clean initial start & focused) */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-emerald-700 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="input-search-smae-food"
                ref={searchInputRef}
                type="text"
                autoFocus
                dir="ltr"
                placeholder="Ingresa el alimento a buscar (ej. Avena, Tortilla, Pollo, Manzana, Atún, Arroz, Huevo, Leche, Aguacate)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                style={{ direction: 'ltr', textAlign: 'left', unicodeBidi: 'plaintext' }}
                className="w-full pl-10 pr-10 py-2.5 sm:py-3 text-left text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 shadow-2xs font-medium placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-full text-xs transition-colors"
                  title="Limpiar buscador"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Numerical Equivalent Multiplier */}
            <div
              style={{ fontSize: '19px' }}
              className="flex items-center justify-between sm:justify-start gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 sm:py-2 shadow-2xs shrink-0"
            >
              <span
                style={{ fontSize: '14px' }}
                className="text-2xs font-bold text-slate-500 uppercase tracking-wide"
              >
                Porción:
              </span>
              <div className="flex items-center gap-1.5">
                <div className="relative flex items-center">
                  <input
                    id="input-portion-multiplier"
                    type="text"
                    inputMode="decimal"
                    placeholder="1"
                    value={portionInput}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value.replace(/,/g, '.');
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        setPortionInput(val);
                      }
                    }}
                    onBlur={() => {
                      const parsed = parseFloat(portionInput);
                      if (isNaN(parsed) || parsed <= 0) {
                        setPortionInput('1');
                      } else {
                        setPortionInput(String(parsed));
                      }
                    }}
                    className="w-14 text-center py-1 text-xs font-black text-emerald-950 bg-emerald-50 border border-emerald-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-inner"
                    title="Ingresar múltiplo numérico de equivalentes de forma manual"
                  />
                  <span className="text-2xs font-bold text-emerald-700 ml-1 mr-1">eq</span>
                </div>
                {portionInput !== '1' && (
                  <button
                    type="button"
                    onClick={() => setPortionInput('1')}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                    title="Restablecer a 1.0 equivalente"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Category Filter Chips (Oculto por solicitud) */}
          <div className="hidden" style={{ display: 'none' }}>
            {SMAE_CATEGORIES.map((cat) => {
              const count = categoryCounts[cat.id] ?? 0;
              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  id={`btn-filter-category-${cat.id}`}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-2xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 border ${
                    isSelected
                      ? 'bg-emerald-800 text-white border-emerald-900 shadow-2xs scale-[1.02]'
                      : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100/90 border-slate-200'
                  }`}
                >
                  <span>{cat.shortLabel}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-3xs font-extrabold ${
                      isSelected
                        ? 'bg-emerald-950/50 text-emerald-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Food Items List */}
        <div
          onScroll={handleListScroll}
          className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3 divide-y divide-slate-100"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700">
              Mostrando <strong>{visibleFoods.length}</strong> de <strong>{filteredFoods.length}</strong> alimentos encontrados
            </span>
            {portionMultiplier !== 1 && (
              <span className="text-emerald-800 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 text-2xs">
                Valores calculados para {portionMultiplier} equivalente{portionMultiplier > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {filteredFoods.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">
                No encontramos alimentos que coincidan con "{searchTerm}"
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Intenta buscar sin acentos o con términos más sencillos (ej. pollo, huevo, avena, tortilla, manzana, frijoles, arroz, requesón).
              </p>
              <button
                type="button"
                onClick={handleClearSearch}
                className="mt-4 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs inline-flex items-center gap-1.5"
              >
                <span>Limpiar buscador e ingresar otro alimento</span>
              </button>
            </div>
          ) : (
            <>
              {visibleFoods.map((food) => {
              const scaledGrams =
                typeof food.netGrams === 'number'
                  ? Math.round(food.netGrams * portionMultiplier * 10) / 10
                  : food.netGrams;
              const scaledKcal = Math.round(food.kcal * portionMultiplier);
              const scaledProt = Math.round(food.protein * portionMultiplier * 10) / 10;
              const scaledLip = Math.round(food.lipids * portionMultiplier * 10) / 10;
              const scaledCarb = Math.round(food.carbs * portionMultiplier * 10) / 10;
              const isCopied = copiedId === food.id;

              return (
                <div
                  key={food.id}
                  className="pt-3.5 first:pt-0 group hover:bg-slate-50/80 p-3 sm:p-3.5 rounded-xl transition-all border border-transparent hover:border-slate-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Food Info */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className="text-sm sm:text-base font-extrabold text-slate-900 font-heading">
                          {food.name}
                        </h4>
                        <span className="text-2xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {food.groupName}
                        </span>
                        {food.glycemicIndex && (
                          <span
                            className={`text-2xs font-bold px-2 py-0.5 rounded-full border ${
                              food.glycemicIndex === 'Bajo'
                                ? 'bg-teal-50 text-teal-800 border-teal-200'
                                : food.glycemicIndex === 'Medio'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            IG {food.glycemicIndex}
                          </span>
                        )}
                      </div>

                      {/* Main Portion & Grammage */}
                      <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-700 font-medium my-1.5">
                        <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-2xs">
                          <span className="text-slate-500 font-semibold">Porción:</span>
                          <strong className="text-slate-900 font-bold">
                            {portionMultiplier === 1
                              ? food.portionHousehold
                              : `${portionMultiplier} × (${food.portionHousehold})`}
                          </strong>
                        </div>
                        <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80 shadow-2xs">
                          <span className="text-emerald-700 font-semibold">Peso Neto:</span>
                          <strong className="text-emerald-900 font-extrabold">
                            {scaledGrams} {food.unit}
                          </strong>
                        </div>
                        {food.fiberGrams !== undefined && (
                          <span className="text-3xs font-semibold px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md border border-amber-200">
                            Fibra: {Math.round(food.fiberGrams * portionMultiplier * 10) / 10}g
                          </span>
                        )}
                        {food.sodiumMg !== undefined && (
                          <span className="text-3xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                            Sodio: {Math.round(food.sodiumMg * portionMultiplier)}mg
                          </span>
                        )}
                      </div>

                      {/* Notes / Clinical tip */}
                      {food.notes && (
                        <p className="text-2xs text-slate-500 flex items-center gap-1 mt-1 font-normal">
                          <Info className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{food.notes}</span>
                        </p>
                      )}
                    </div>

                    {/* Macros & Action Button */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                      {/* Macro Breakdown */}
                      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center">
                        <div className="bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg min-w-[50px]">
                          <div className="text-3xs font-bold text-amber-700 flex items-center justify-center gap-0.5">
                            <Flame className="w-2.5 h-2.5" />
                            Kcal
                          </div>
                          <div className="text-xs font-black text-amber-950">{scaledKcal}</div>
                        </div>
                        <div className="bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg min-w-[48px]">
                          <div className="text-3xs font-bold text-rose-700 flex items-center justify-center gap-0.5">
                            <Dna className="w-2.5 h-2.5" />
                            Prot
                          </div>
                          <div className="text-xs font-black text-rose-950">{scaledProt}g</div>
                        </div>
                        <div className="bg-lime-50 border border-lime-200 px-2 py-1 rounded-lg min-w-[48px]">
                          <div className="text-3xs font-bold text-lime-700 flex items-center justify-center gap-0.5">
                            <Droplets className="w-2.5 h-2.5" />
                            Lip
                          </div>
                          <div className="text-xs font-black text-lime-950">{scaledLip}g</div>
                        </div>
                        <div className="bg-sky-50 border border-sky-200 px-2 py-1 rounded-lg min-w-[48px]">
                          <div className="text-3xs font-bold text-sky-700 flex items-center justify-center gap-0.5">
                            <Wheat className="w-2.5 h-2.5" />
                            HC
                          </div>
                          <div className="text-xs font-black text-sky-950">{scaledCarb}g</div>
                        </div>
                      </div>

                      {/* Copy Equivalency Button */}
                      <button
                        type="button"
                        onClick={() => handleCopyFood(food)}
                        className={`text-2xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-2xs ${
                          isCopied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                        title="Copiar porción y equivalencia al portapapeles"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-white" />
                            <span>¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-500" />
                            <span>Copiar equivalencia</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {visibleLimit < filteredFoods.length && (
              <div className="pt-4 pb-2 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleLimit((prev) => Math.min(prev + 50, filteredFoods.length))}
                  className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Cargar más alimentos ({filteredFoods.length - visibleLimit} restantes)</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2 text-2xs text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>
              Valores oficiales del <strong>Sistema Mexicano de Alimentos Equivalentes (5ta Edición)</strong>.
            </span>
          </div>
          <button
            id="btn-confirm-close-smae-guide"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-extrabold transition-colors shadow-2xs"
          >
            Cerrar Buscador
          </button>
        </div>

      </div>
    </div>
  );
};

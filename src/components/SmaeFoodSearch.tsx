import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  X,
  Copy,
  Check,
  Flame,
  Dna,
  Droplets,
  Wheat,
  Info,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { SMAEFoodItem, SMAE_CATEGORIES } from '../data/smaeFoodsDatabase';
import { searchSpecificSmaeFood } from '../utils/smaeFoodSearchUtils';

interface SmaeFoodSearchProps {
  className?: string;
}

const POPULAR_SEARCH_SUGGESTIONS = [
  'Salchicha de pavo',
  'Manzana',
  'Pechuga de pollo',
  'Tortilla de maíz',
  'Aguacate',
  'Avena',
  'Huevo',
  'Frijoles',
  'Leche descremada',
  'Queso panela',
  'Arroz cocido',
];

export const SmaeFoodSearch: React.FC<SmaeFoodSearchProps> = ({ className = '' }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search results strictly matching query and closely named foods
  const searchResults = useMemo(() => {
    return searchSpecificSmaeFood(query);
  }, [query]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global keyboard shortcut to focus search: Ctrl+K, Cmd+K, or "/"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCopyFood = (food: SMAEFoodItem) => {
    const text = `${food.name}: ${food.portionHousehold} (${food.netGrams} ${food.unit}) = 1 eq. de ${food.groupName} (${food.kcal} kcal, ${food.protein}g P, ${food.lipids}g L, ${food.carbs}g HC) [SMAE 5ª Edición]`;
    navigator.clipboard.writeText(text);
    setCopiedId(food.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getCategoryMeta = (groupId: string, category: string) => {
    const found = SMAE_CATEGORIES.find((c) => c.id === groupId || c.id === category);
    return (
      found || {
        badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        textColor: 'text-emerald-800',
        shortLabel: 'SMAE 5ª Ed',
      }
    );
  };

  return (
    <div ref={containerRef} className={`relative ${className}`} id="smae-food-search-container">
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <div className="absolute left-3 pointer-events-none text-emerald-600">
          <Search className="w-4 h-4" />
        </div>
        <input
          id="input-search-smae"
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar alimento en SMAE 5ª Ed..."
          className="w-full pl-9 pr-14 sm:pr-20 py-2 text-xs sm:text-sm bg-slate-50 hover:bg-white focus:bg-white text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200/50 transition-all shadow-2xs outline-none"
        />

        {/* Clear or Shortcut badge */}
        <div className="absolute right-2.5 flex items-center gap-1">
          {query ? (
            <button
              id="btn-clear-smae-search"
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
              title="Borrar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-200/70 rounded border border-slate-300/60 select-none" title="Buscar en SMAE">
              <Search className="w-3 h-3 text-slate-500" />
            </span>
          )}
        </div>
      </div>

      {/* Floating Results Dropdown */}
      {isOpen && (
        <div
          id="smae-search-dropdown"
          className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-[calc(100vw-2rem)] sm:w-[480px] md:w-[540px] max-w-[94vw] bg-white rounded-2xl shadow-2xl border border-emerald-100/90 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Top Panel Banner */}
          <div className="bg-gradient-to-r from-emerald-800 via-emerald-900 to-teal-900 px-4 py-2.5 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h4 className="text-xs sm:text-sm font-bold tracking-tight">
                Buscador Oficial SMAE 5ª Edición
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-emerald-200 font-medium hidden sm:inline">
                {query.trim().length >= 2
                  ? `${searchResults.totalFound} alimento(s) encontrado(s)`
                  : 'Catálogo de alimentos'}
              </span>
              <button
                id="btn-close-smae-search"
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Cerrar buscador"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Results Area */}
          <div className="max-h-[68vh] overflow-y-auto p-3 sm:p-4 divide-y divide-slate-100">
            {/* Case 1: Empty Query - Show Guide & Suggestions */}
            {query.trim().length < 2 && (
              <div className="py-2">
                <div className="flex items-start gap-3 p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl mb-3">
                  <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-900">
                    <p className="font-semibold mb-0.5">Búsqueda directa de alimentos</p>
                    <p className="text-emerald-800/90 leading-relaxed">
                      Escribe el nombre de un alimento para consultar su porción casera, peso neto
                      y equivalente exacto según el PDF del Sistema Mexicano de Alimentos Equivalentes
                      (SMAE 5ª Edición).
                    </p>
                  </div>
                </div>

                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
                  Alimentos comunes del SMAE:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_SEARCH_SUGGESTIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setQuery(item);
                        inputRef.current?.focus();
                      }}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 hover:border-emerald-200 border border-slate-200 rounded-lg transition-all"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Case 2: Query active with no matches */}
            {query.trim().length >= 2 && searchResults.totalFound === 0 && (
              <div className="py-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6 text-amber-500" />
                </div>
                <h5 className="text-sm font-bold text-slate-800 mb-1">
                  Alimento no encontrado en el SMAE 5ª Ed.
                </h5>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  No se encontró ningún alimento con el término &ldquo;<span className="font-semibold text-slate-700">{query}</span>&rdquo;. Prueba con términos genéricos como <span className="text-emerald-700 font-medium">pollo</span>, <span className="text-emerald-700 font-medium">avena</span>, <span className="text-emerald-700 font-medium">huevo</span> o <span className="text-emerald-700 font-medium">manzana</span>.
                </p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {POPULAR_SEARCH_SUGGESTIONS.slice(0, 5).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setQuery(item)}
                      className="px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Case 3: Exact Matches Section ("El alimento buscado") */}
            {searchResults.exactMatches.length > 0 && (
              <div className="pb-3">
                <div className="flex items-center gap-1.5 mb-2.5 px-1 pt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Alimento Buscado (Coincidencia Directa)
                  </h5>
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {searchResults.exactMatches.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {searchResults.exactMatches.map((food) => {
                    const meta = getCategoryMeta(food.groupId, food.category);
                    const isCopied = copiedId === food.id;

                    return (
                      <div
                        key={food.id}
                        className="p-3 bg-white hover:bg-emerald-50/40 rounded-xl border border-emerald-100/80 shadow-2xs hover:border-emerald-300 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h6 className="text-sm font-black text-slate-900 leading-snug">
                                {food.name}
                              </h6>
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${meta.badgeColor}`}
                              >
                                {food.groupName || meta.shortLabel}
                              </span>
                            </div>

                            {/* Portion and Net Grams */}
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-700">
                              <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                1 equivalente = {food.portionHousehold}
                              </span>
                              <span className="text-slate-500 font-medium">
                                ({food.netGrams} {food.unit})
                              </span>
                            </div>
                          </div>

                          {/* Quick copy button */}
                          <button
                            type="button"
                            onClick={() => handleCopyFood(food)}
                            className={`p-1.5 rounded-lg border text-xs font-medium transition-all shrink-0 ${
                              isCopied
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-slate-50 hover:bg-emerald-100 text-slate-600 hover:text-emerald-900 border-slate-200'
                            }`}
                            title="Copiar porción y equivalente"
                          >
                            {isCopied ? (
                              <div className="flex items-center gap-1 px-1">
                                <Check className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold">Copiado</span>
                              </div>
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Macronutrients Strip */}
                        <div className="grid grid-cols-4 gap-1.5 text-[11px] pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-1 bg-amber-50/70 text-amber-900 px-1.5 py-0.5 rounded">
                            <Flame className="w-3 h-3 text-amber-600 shrink-0" />
                            <span className="font-bold">{food.kcal}</span>
                            <span className="text-[9px] text-amber-700">kcal</span>
                          </div>
                          <div className="flex items-center gap-1 bg-rose-50/70 text-rose-900 px-1.5 py-0.5 rounded">
                            <Dna className="w-3 h-3 text-rose-600 shrink-0" />
                            <span className="font-bold">{food.protein}g</span>
                            <span className="text-[9px] text-rose-700">Prot</span>
                          </div>
                          <div className="flex items-center gap-1 bg-amber-50/70 text-amber-900 px-1.5 py-0.5 rounded">
                            <Droplets className="w-3 h-3 text-amber-600 shrink-0" />
                            <span className="font-bold">{food.lipids}g</span>
                            <span className="text-[9px] text-amber-700">Lip</span>
                          </div>
                          <div className="flex items-center gap-1 bg-teal-50/70 text-teal-900 px-1.5 py-0.5 rounded">
                            <Wheat className="w-3 h-3 text-teal-600 shrink-0" />
                            <span className="font-bold">{food.carbs}g</span>
                            <span className="text-[9px] text-teal-700">HC</span>
                          </div>
                        </div>

                        {/* Extra clinical notes if present */}
                        {food.notes && (
                          <p className="mt-1.5 text-[11px] text-slate-500 italic bg-slate-50 px-2 py-1 rounded">
                            {food.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Case 4: Close Name Matches Section ("Nombre cercano al mismo") */}
            {searchResults.closeMatches.length > 0 && (
              <div className="pt-3">
                <div className="flex items-center gap-1.5 mb-2.5 px-1">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Nombres Cercanos en el SMAE 5ª Edición
                  </h5>
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                    {searchResults.closeMatches.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {searchResults.closeMatches.map((food) => {
                    const meta = getCategoryMeta(food.groupId, food.category);
                    const isCopied = copiedId === food.id;

                    return (
                      <div
                        key={food.id}
                        className="p-3 bg-slate-50/60 hover:bg-teal-50/40 rounded-xl border border-slate-200/70 hover:border-teal-300 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h6 className="text-sm font-bold text-slate-800 leading-snug">
                                {food.name}
                              </h6>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badgeColor}`}
                              >
                                {food.groupName || meta.shortLabel}
                              </span>
                            </div>

                            {/* Portion and Net Grams */}
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-700">
                              <span className="font-semibold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                                1 eq = {food.portionHousehold}
                              </span>
                              <span className="text-slate-500 font-medium">
                                ({food.netGrams} {food.unit})
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopyFood(food)}
                            className={`p-1.5 rounded-lg border text-xs font-medium transition-all shrink-0 ${
                              isCopied
                                ? 'bg-teal-600 text-white border-teal-600'
                                : 'bg-white hover:bg-teal-100 text-slate-600 hover:text-teal-900 border-slate-200'
                            }`}
                            title="Copiar porción y equivalente"
                          >
                            {isCopied ? (
                              <div className="flex items-center gap-1 px-1">
                                <Check className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold">Copiado</span>
                              </div>
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Nutrition strip */}
                        <div className="grid grid-cols-4 gap-1 text-[11px] pt-1.5 border-t border-slate-200/60 text-slate-600">
                          <div>
                            <span className="font-bold text-slate-800">{food.kcal}</span> kcal
                          </div>
                          <div>
                            <span className="font-bold text-slate-800">{food.protein}g</span> P
                          </div>
                          <div>
                            <span className="font-bold text-slate-800">{food.lipids}g</span> L
                          </div>
                          <div>
                            <span className="font-bold text-slate-800">{food.carbs}g</span> HC
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="font-semibold text-emerald-800">SMAE 5ª Ed.</span>
              <span>• Valores netos por 1 equivalente</span>
            </span>
            <span className="text-slate-400">Presiona Esc para cerrar</span>
          </div>
        </div>
      )}
    </div>
  );
};

export interface SMAEFoodItem {
  id: string;
  name: string;
  category: string;
  groupId: string;
  groupName: string;
  portionHousehold: string;
  netGrams: number | string;
  unit: string;
  kcal: number;
  protein: number;
  lipids: number;
  carbs: number;
  sugarGrams?: number;
  fiberGrams?: number;
  sodiumMg?: number;
  glycemicIndex?: 'Bajo' | 'Medio' | 'Alto';
  notes?: string;
  keywords?: string[];
}

export interface SMAECategoryMeta {
  id: string;
  label: string;
  shortLabel: string;
  badgeColor: string;
  textColor: string;
  borderColor: string;
  description: string;
}

export const SMAE_CATEGORIES: SMAECategoryMeta[] = [
  {
    id: 'all',
    label: 'Todos los Alimentos',
    shortLabel: 'Todos',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    textColor: 'text-emerald-800',
    borderColor: 'border-emerald-200',
    description: 'Catálogo completo de alimentos SMAE 5ta Edición',
  },
  {
    id: 'verdura',
    label: 'Verduras',
    shortLabel: 'Verduras',
    badgeColor: 'bg-green-50 text-green-800 border-green-200',
    textColor: 'text-green-800',
    borderColor: 'border-green-200',
    description: '25 kcal · 2g Prot · 0g Lip · 4g HC por equivalente',
  },
  {
    id: 'fruta',
    label: 'Frutas',
    shortLabel: 'Frutas',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-200',
    description: '60 kcal · 0g Prot · 0g Lip · 15g HC por equivalente',
  },
  {
    id: 'cereales_sin_grasa',
    label: 'Cereales sin Grasa',
    shortLabel: 'Cereales s/g',
    badgeColor: 'bg-orange-50 text-orange-800 border-orange-200',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-200',
    description: '70 kcal · 2g Prot · 0g Lip · 15g HC por equivalente',
  },
  {
    id: 'cereales_con_grasa',
    label: 'Cereales con Grasa',
    shortLabel: 'Cereales c/g',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    textColor: 'text-amber-900',
    borderColor: 'border-amber-300',
    description: '115 kcal · 2g Prot · 5g Lip · 15g HC por equivalente',
  },
  {
    id: 'leguminosas',
    label: 'Leguminosas',
    shortLabel: 'Leguminosas',
    badgeColor: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-200',
    description: '120 kcal · 8g Prot · 1g Lip · 20g HC por equivalente',
  },
  {
    id: 'aoa_muy_bajo',
    label: 'AOA Muy Bajo Aporte',
    shortLabel: 'AOA Muy Bajo',
    badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
    textColor: 'text-rose-800',
    borderColor: 'border-rose-200',
    description: '40 kcal · 7g Prot · 1g Lip · 0g HC por equivalente',
  },
  {
    id: 'aoa_bajo',
    label: 'AOA Bajo Aporte',
    shortLabel: 'AOA Bajo',
    badgeColor: 'bg-pink-50 text-pink-800 border-pink-200',
    textColor: 'text-pink-800',
    borderColor: 'border-pink-200',
    description: '55 kcal · 7g Prot · 3g Lip · 0g HC por equivalente',
  },
  {
    id: 'aoa_moderado',
    label: 'AOA Moderado Aporte',
    shortLabel: 'AOA Moderado',
    badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
    textColor: 'text-purple-800',
    borderColor: 'border-purple-200',
    description: '75 kcal · 7g Prot · 5g Lip · 0g HC por equivalente',
  },
  {
    id: 'aoa_alto',
    label: 'AOA Alto Aporte',
    shortLabel: 'AOA Alto',
    badgeColor: 'bg-red-50 text-red-800 border-red-200',
    textColor: 'text-red-800',
    borderColor: 'border-red-200',
    description: '100 kcal · 7g Prot · 8g Lip · 0g HC por equivalente',
  },
  {
    id: 'leche',
    label: 'Leches y Yogures (General)',
    shortLabel: 'Todas las Leches',
    badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-200',
    description: '95-200 kcal · 7-9g Prot · 0-8g Lip · 12-30g HC',
  },
  {
    id: 'leche_descremada',
    label: 'Leche Descremada',
    shortLabel: 'Leche Descremada',
    badgeColor: 'bg-sky-50 text-sky-800 border-sky-200',
    textColor: 'text-sky-800',
    borderColor: 'border-sky-200',
    description: '95 kcal · 9g Prot · 2g Lip · 12g HC por equivalente',
  },
  {
    id: 'leche_semi_descremada',
    label: 'Leche Semidescremada',
    shortLabel: 'Leche Semi',
    badgeColor: 'bg-cyan-50 text-cyan-900 border-cyan-200',
    textColor: 'text-cyan-900',
    borderColor: 'border-cyan-200',
    description: '110 kcal · 9g Prot · 4g Lip · 12g HC por equivalente',
  },
  {
    id: 'leche_entera',
    label: 'Leche Entera',
    shortLabel: 'Leche Entera',
    badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
    textColor: 'text-blue-900',
    borderColor: 'border-blue-300',
    description: '150 kcal · 9g Prot · 8g Lip · 12g HC por equivalente',
  },
  {
    id: 'leche_con_azucar',
    label: 'Leche con Azúcar',
    shortLabel: 'Leche c/ Azúcar',
    badgeColor: 'bg-indigo-50 text-indigo-900 border-indigo-200',
    textColor: 'text-indigo-900',
    borderColor: 'border-indigo-200',
    description: '200 kcal · 8g Prot · 5g Lip · 30g HC por equivalente',
  },
  {
    id: 'grasas',
    label: 'Aceites y Grasas (Todas)',
    shortLabel: 'Grasas (Todas)',
    badgeColor: 'bg-lime-50 text-lime-800 border-lime-200',
    textColor: 'text-lime-800',
    borderColor: 'border-lime-200',
    description: '45-70 kcal · 0-3g Prot · 5g Lip · 0-3g HC',
  },
  {
    id: 'grasas_sin_proteina',
    label: 'Grasas sin Proteína',
    shortLabel: 'Grasas s/ Prot',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    textColor: 'text-emerald-800',
    borderColor: 'border-emerald-200',
    description: '45 kcal · 0g Prot · 5g Lip · 0g HC por equivalente',
  },
  {
    id: 'grasas_con_proteina',
    label: 'Grasas con Proteína',
    shortLabel: 'Grasas c/ Prot',
    badgeColor: 'bg-teal-50 text-teal-900 border-teal-200',
    textColor: 'text-teal-900',
    borderColor: 'border-teal-200',
    description: '70 kcal · 3g Prot · 5g Lip · 3g HC por equivalente',
  },
  {
    id: 'azucares',
    label: 'Azúcares (Todos)',
    shortLabel: 'Azúcares (Todos)',
    badgeColor: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200',
    textColor: 'text-fuchsia-800',
    borderColor: 'border-fuchsia-200',
    description: '40-85 kcal · 0g Prot · 0-5g Lip · 10g HC',
  },
  {
    id: 'azucares_sin_grasa',
    label: 'Azúcares sin Grasa',
    shortLabel: 'Azúcar s/ Grasa',
    badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
    textColor: 'text-purple-800',
    borderColor: 'border-purple-200',
    description: '40 kcal · 0g Prot · 0g Lip · 10g HC por equivalente',
  },
  {
    id: 'azucares_con_grasa',
    label: 'Azúcares con Grasa',
    shortLabel: 'Azúcar c/ Grasa',
    badgeColor: 'bg-pink-100 text-pink-900 border-pink-300',
    textColor: 'text-pink-900',
    borderColor: 'border-pink-300',
    description: '85 kcal · 0g Prot · 5g Lip · 10g HC por equivalente',
  },
  {
    id: 'libres',
    label: 'Libres de Energía',
    shortLabel: 'Libres',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    textColor: 'text-slate-700',
    borderColor: 'border-slate-200',
    description: '0-5 kcal · Sin aporte calórico significativo',
  },
  {
    id: 'alcohol',
    label: 'Bebidas Alcohólicas',
    shortLabel: 'Alcohol',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    textColor: 'text-amber-900',
    borderColor: 'border-amber-300',
    description: '140 kcal · 0g Prot · 0g Lip · 0-20g HC',
  },
];

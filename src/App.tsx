import React, { useState, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { NutritionSummaryBar } from './components/NutritionSummaryBar';
import { SmaeTable } from './components/SmaeTable';
import { PrintableEquivalentsTable } from './components/PrintableEquivalentsTable';
import { AnthropometricMacroFrame } from './components/AnthropometricMacroFrame';
import { GeneratedMealCard } from './components/GeneratedMealCard';
import { SmaeGuideModal } from './components/SmaeGuideModal';
import { INITIAL_TABLE_STATE, SMAE_GROUPS, MEAL_COLUMNS, TableGridState } from './data/smaeData';
import { MealKey, GeneratedPlan, PatientInfo, MealPreference, MealOptionLetter, MenuOption, MealMenu } from './types';
import { calculateMacros, formatClipboardMenu, calculateRowTotal, normalizeOptionSelection, calculateBmiInfo } from './utils/nutritionCalculations';
import { buildFallbackFullPlan, buildFallbackMeal } from './utils/smaeFallbackEngine';
import { rectifyFullPlan, rectifyMealMenu, rectifyMenuOption, ensureMealVariety } from './utils/smaeRectifier';
import { exportPlanToPdfNative } from './utils/pdfExport';
import { exportPlanToWord } from './utils/wordExport';
import confetti from 'canvas-confetti';

// Robust JSON request helper that protects against HTML responses (like 502/504 or fallback pages)
async function safePostJson<T>(url: string, payload: any): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const textSnippet = await response.text().catch(() => '');
    throw new Error(`Respuesta no JSON del servidor (${response.status}): ${textSnippet.slice(0, 100)}`);
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || `Error ${response.status}`);
  }
  return data as T;
}
import {
  Sparkles,
  Copy,
  Download,
  FileText,
  AlertCircle,
  CheckCircle2,
  Utensils,
  Flame,
  User,
  HeartPulse,
  Share2,
  RotateCcw,
  RefreshCw,
  Lock,
  Loader2,
  Calendar,
  FileSpreadsheet,
  Printer,
  ChevronUp,
  EyeOff,
} from 'lucide-react';

export default function App() {
  const [tableState, setTableState] = useState<TableGridState>(INITIAL_TABLE_STATE);
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    name: '',
    date: new Date().toISOString().split('T')[0],
    goal: '',
    notes: '',
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingMeal, setRegeneratingMeal] = useState<string | null>(null);
  const [regeneratingOption, setRegeneratingOption] = useState<{ mealName: string; letter: MealOptionLetter } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [selectedMealOptions, setSelectedMealOptions] = useState<Record<string, MealOptionLetter[]>>({});

  // Pestaña de acciones y exportación oculta por defecto para permitir una mayor exploración de los menús
  // Se despliega al pasar el cursor (hover) y se oculta automáticamente al salir
  const [isExportBarOpen, setIsExportBarOpen] = useState(false);
  const exportBarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleExportBarMouseEnter = () => {
    if (exportBarTimeoutRef.current) {
      clearTimeout(exportBarTimeoutRef.current);
      exportBarTimeoutRef.current = null;
    }
    setIsExportBarOpen(true);
  };

  const handleExportBarMouseLeave = () => {
    if (exportBarTimeoutRef.current) {
      clearTimeout(exportBarTimeoutRef.current);
    }
    exportBarTimeoutRef.current = setTimeout(() => {
      setIsExportBarOpen(false);
    }, 350);
  };

  // History of previous options for each meal and letter to allow "Regresar a la opción anterior" per option
  const [optionHistory, setOptionHistory] = useState<
    Record<string, { A?: MenuOption[]; B?: MenuOption[]; C?: MenuOption[] }>
  >({});

  // Restore previous option/recipe for a specific meal and option letter (A, B, or C)
  const handleRestoreOption = (mealName: string, letter: MealOptionLetter) => {
    setOptionHistory((prev) => {
      const mealHist = prev[mealName];
      const letterHist = mealHist?.[letter];
      if (!letterHist || letterHist.length === 0) return prev;

      const previousOption = letterHist[letterHist.length - 1];
      const newLetterHist = letterHist.slice(0, -1);

      setGeneratedPlan((prevPlan) => {
        if (!prevPlan) return prevPlan;
        return {
          ...prevPlan,
          meals: prevPlan.meals.map((m) => {
            if (m.mealName.toLowerCase() !== mealName.toLowerCase()) return m;
            return {
              ...m,
              [letter === 'A' ? 'optionA' : letter === 'B' ? 'optionB' : 'optionC']: previousOption,
            };
          }),
        };
      });

      return {
        ...prev,
        [mealName]: {
          ...mealHist,
          [letter]: newLetterHist,
        },
      };
    });
  };

  // Toggle option letter for a specific meal
  const handleToggleMealOption = (mealName: string, letter: MealOptionLetter) => {
    setSelectedMealOptions((prev) => {
      const current = prev[mealName] ? [...prev[mealName]] : ['A', 'B', 'C'];
      let updated: MealOptionLetter[];
      if (current.includes(letter)) {
        // Keep at least one option selected
        if (current.length <= 1) return prev;
        updated = current.filter((l) => l !== letter);
      } else {
        updated = [...current, letter].sort();
      }
      return {
        ...prev,
        [mealName]: updated,
      };
    });
  };

  // Explicitly set option letters for a specific meal
  const handleSetMealOptions = (mealName: string, letters: MealOptionLetter[]) => {
    setSelectedMealOptions((prev) => ({
      ...prev,
      [mealName]: letters,
    }));
  };

  const resultsRef = useRef<HTMLDivElement>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const macros = calculateMacros(tableState);

  // Update cell handler
  const handleCellChange = (groupId: string, mealKey: MealKey, value: number) => {
    setTableState((prev) => ({
      ...prev,
      [groupId]: {
        ...prev[groupId],
        [mealKey]: value,
      },
    }));
  };

  // Reset table to all zeros and clean patient fields
  const handleResetTable = () => {
    const emptyState: TableGridState = {};
    SMAE_GROUPS.forEach((group) => {
      emptyState[group.id] = {
        desayuno: 0,
        colacion1: 0,
        comida: 0,
        colacion2: 0,
        cena: 0,
      };
    });
    setTableState(emptyState);
    setPatientInfo({
      name: '',
      date: new Date().toISOString().split('T')[0],
      goal: '',
      notes: '',
      gender: '',
      height: '',
      weight: '',
      age: '',
      fatPercent: '',
      fatKg: '',
      musclePercent: '',
      muscleKg: '',
      bonePercent: '',
      boneKg: '',
      residualPercent: '',
      residualKg: '',
      skinfolds: undefined,
      girths: undefined,
      breadths: undefined,
      preferredFoods: '',
      dislikedFoods: '',
      mealPreferences: undefined,
    });
    setGeneratedPlan(null);
    setOptionHistory({});
    setErrorMsg(null);
  };

  // Load preset
  const handleSelectPreset = (presetData: TableGridState) => {
    setTableState(presetData);
  };

  const buildDietNotes = (info: PatientInfo) => {
    const bmi = calculateBmiInfo(info.height, info.weight);
    const anthropometrics = [
      info.gender ? `Sexo: ${info.gender}` : '',
      info.age ? `Edad: ${info.age}` : '',
      info.weight ? `Masa Corporal: ${info.weight}` : '',
      info.height ? `Estatura: ${info.height}` : '',
      bmi ? `IMC: ${bmi.formatted} (${bmi.category})` : '',
    ].filter(Boolean).join(', ');

    const parts = [
      info.notes,
      info.goal ? `Objetivo: ${info.goal}` : '',
      anthropometrics ? `Datos antropométricos: ${anthropometrics}` : '',
    ].filter(Boolean);

    return parts.join(' - ');
  };

  // Main Generate Button Handler (supports keeping selected print options)
  const handleGenerateMenus = async (keepSelected: boolean = false) => {
    setErrorMsg(null);
    setIsGenerating(true);

    // Prepare table payload formatted with readable group names
    const tableDataPayload: Record<string, Record<string, number>> = {};
    SMAE_GROUPS.forEach((g) => {
      tableDataPayload[g.name] = {
        Desayuno: tableState[g.id]?.desayuno || 0,
        'Colación 1': tableState[g.id]?.colacion1 || 0,
        Comida: tableState[g.id]?.comida || 0,
        'Colación 2': tableState[g.id]?.colacion2 || 0,
        Cena: tableState[g.id]?.cena || 0,
      };
    });

    const prefList = patientInfo.mealPreferences
      ? (Object.values(patientInfo.mealPreferences) as MealPreference[])
          .map((p) => p.likes)
          .filter(Boolean)
          .join(', ')
      : '';
    const dislikeList = patientInfo.mealPreferences
      ? (Object.values(patientInfo.mealPreferences) as MealPreference[])
          .map((p) => p.dislikes)
          .filter(Boolean)
          .join(', ')
      : '';

    // Build preserved options dictionary if keeping selected for printing
    const preservedMealsPayload: Record<string, any> = {};
    if (generatedPlan && keepSelected) {
      generatedPlan.meals.forEach((m) => {
        const letters = normalizeOptionSelection(selectedMealOptions[m.mealName]);
        if (letters.length > 0 && letters.length < 3) {
          preservedMealsPayload[m.mealName] = {
            keptLetters: letters,
            optionA: letters.includes('A') ? m.optionA : undefined,
            optionB: letters.includes('B') ? m.optionB : undefined,
            optionC: letters.includes('C') ? m.optionC : undefined,
          };
        }
      });
    }

    try {
      let resultData: any;
      try {
        resultData = await safePostJson<any>('/api/generate-menus', {
          tableData: tableDataPayload,
          patientName: patientInfo.name,
          dietNotes: buildDietNotes(patientInfo),
          preferredFoods: prefList,
          dislikedFoods: dislikeList,
          mealPreferences: patientInfo.mealPreferences,
          preservedMeals: Object.keys(preservedMealsPayload).length > 0 ? preservedMealsPayload : undefined,
          previousOptionHistory: optionHistory,
        });
      } catch (apiErr) {
        console.warn('API no disponible o respuesta no válida, ejecutando motor clínico SMAE 5ta Edición local:', apiErr);
        const fallback = buildFallbackFullPlan(
          tableDataPayload,
          buildDietNotes(patientInfo),
          prefList,
          dislikeList
        );
        resultData = {
          ...fallback,
          isFallback: true,
        };

        if (Object.keys(preservedMealsPayload).length > 0 && resultData.meals) {
          resultData.meals = resultData.meals.map((m: any) => {
            const p = preservedMealsPayload[m.mealName];
            if (!p || !Array.isArray(p.keptLetters)) return m;
            return {
              ...m,
              optionA: p.keptLetters.includes('A') && p.optionA ? p.optionA : m.optionA,
              optionB: p.keptLetters.includes('B') && p.optionB ? p.optionB : m.optionB,
              optionC: p.keptLetters.includes('C') && p.optionC ? p.optionC : m.optionC,
            };
          });
        }
      }

      // Rectify plan meticulously according to SMAE 5th Edition standards
      resultData = rectifyFullPlan(resultData, tableDataPayload, dislikeList);

      setGeneratedPlan({
        patientNotes: resultData.patientNotes,
        isFallback: Boolean(resultData.isFallback),
        meals: resultData.meals || [],
        generatedAt: new Date().toISOString(),
      });

      // Track newly generated options in history to avoid repetition in future regenerations
      setOptionHistory(prev => {
        const next = { ...prev };
        (resultData.meals || []).forEach((m: any) => {
          if (!next[m.mealName]) {
            next[m.mealName] = { A: [], B: [], C: [] };
          }
          if (m.optionA) next[m.mealName].A.push(m.optionA);
          if (m.optionB) next[m.mealName].B.push(m.optionB);
          if (m.optionC) next[m.mealName].C.push(m.optionC);
        });
        return next;
      });

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#059669', '#10b981', '#34d399', '#f59e0b', '#0284c7'],
        });
      } catch (e) {
        // ignore
      }

      // Smooth scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Ocurrió un error al generar los menús. Verifique la conexión.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Regenerate single meal handler (maintaining selected options for print by default)
  const handleRegenerateMeal = async (mealName: string, forceAll: boolean = false) => {
    setRegeneratingMeal(mealName);
    setErrorMsg(null);

    // Map meal name back to key
    const column = MEAL_COLUMNS.find((c) => c.label.toLowerCase() === mealName.toLowerCase()) || MEAL_COLUMNS[0];
    const portionsForMeal: Record<string, number> = {};

    SMAE_GROUPS.forEach((g) => {
      const count = tableState[g.id]?.[column.key] || 0;
      if (count > 0) {
        portionsForMeal[g.name] = count;
      }
    });

    const existingMenuTitles: string[] = [];
    if (generatedPlan) {
      generatedPlan.meals.forEach((m) => {
        if (m.optionA?.title) existingMenuTitles.push(m.optionA.title);
        if (m.optionB?.title) existingMenuTitles.push(m.optionB.title);
        if (m.optionC?.title) existingMenuTitles.push(m.optionC.title);
      });
    }

    const prefList = patientInfo.mealPreferences
      ? (Object.values(patientInfo.mealPreferences) as MealPreference[])
          .map((p) => p.likes)
          .filter(Boolean)
          .join(', ')
      : '';
    const dislikeList = patientInfo.mealPreferences
      ? (Object.values(patientInfo.mealPreferences) as MealPreference[])
          .map((p) => p.dislikes)
          .filter(Boolean)
          .join(', ')
      : '';

    // Check which options to maintain
    const currentMeal = generatedPlan?.meals.find(
      (m) => m.mealName.toLowerCase() === mealName.toLowerCase()
    );
    const letters = normalizeOptionSelection(selectedMealOptions[mealName]);
    // Mantener las opciones del menú seleccionadas para imprimir
    const shouldKeep = !forceAll && letters.length > 0 && currentMeal;

    const keptOptions = shouldKeep && currentMeal
      ? {
          optionA: letters.includes('A') ? currentMeal.optionA : undefined,
          optionB: letters.includes('B') ? currentMeal.optionB : undefined,
          optionC: letters.includes('C') ? currentMeal.optionC : undefined,
        }
      : undefined;

    const keepLetters = shouldKeep ? letters : undefined;

    try {
      let newMealData: any;
      try {
        newMealData = await safePostJson<any>('/api/regenerate-meal', {
          mealName: column.label,
          mealKey: column.key,
          portions: portionsForMeal,
          patientName: patientInfo.name,
          dietNotes: buildDietNotes(patientInfo),
          preferredFoods: prefList,
          dislikedFoods: dislikeList,
          specificPreferences: patientInfo.mealPreferences?.[column.key],
          existingMenuTitles,
          keptOptions,
          keepLetters,
        });
      } catch (apiErr) {
        console.warn('Fallo al regenerar vía API, usando motor SMAE 5ta Edición local:', apiErr);
        newMealData = buildFallbackMeal(
          column.label,
          portionsForMeal,
          prefList,
          dislikeList
        );
        if (keptOptions && Array.isArray(keepLetters)) {
          if (keepLetters.includes('A') && keptOptions.optionA) newMealData.optionA = keptOptions.optionA;
          if (keepLetters.includes('B') && keptOptions.optionB) newMealData.optionB = keptOptions.optionB;
          if (keepLetters.includes('C') && keptOptions.optionC) newMealData.optionC = keptOptions.optionC;
        }
      }

      // Rectify regenerated meal according to SMAE 5th Edition standards
      newMealData = rectifyMealMenu(newMealData, portionsForMeal, dislikeList);

      if (generatedPlan) {
        if (currentMeal) {
          setOptionHistory((prev) => {
            const curA = (!keptOptions?.optionA && currentMeal.optionA) ? currentMeal.optionA : null;
            const curB = (!keptOptions?.optionB && currentMeal.optionB) ? currentMeal.optionB : null;
            const curC = (!keptOptions?.optionC && currentMeal.optionC) ? currentMeal.optionC : null;
            const existingMealHistory = prev[currentMeal.mealName] || { A: [], B: [], C: [] };

            return {
              ...prev,
              [currentMeal.mealName]: {
                A: curA ? [...(existingMealHistory.A || []), curA] : (existingMealHistory.A || []),
                B: curB ? [...(existingMealHistory.B || []), curB] : (existingMealHistory.B || []),
                C: curC ? [...(existingMealHistory.C || []), curC] : (existingMealHistory.C || []),
              },
            };
          });
        }
        setGeneratedPlan({
          ...generatedPlan,
          meals: generatedPlan.meals.map((m) =>
            m.mealName.toLowerCase() === mealName.toLowerCase() ? newMealData : m
          ),
        });
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al regenerar el tiempo.');
    } finally {
      setRegeneratingMeal(null);
    }
  };

  // Regenerate a single option (Option A, B, or C) for a specific meal
  const handleRegenerateOption = async (mealName: string, letter: MealOptionLetter) => {
    setRegeneratingOption({ mealName, letter });
    setErrorMsg(null);

    const column = MEAL_COLUMNS.find((c) => c.label.toLowerCase() === mealName.toLowerCase()) || MEAL_COLUMNS[0];
    const portionsForMeal: Record<string, number> = {};

    SMAE_GROUPS.forEach((g) => {
      const count = tableState[g.id]?.[column.key] || 0;
      if (count > 0) {
        portionsForMeal[g.name] = count;
      }
    });

    const existingMenuTitles: string[] = [];
    if (generatedPlan) {
      generatedPlan.meals.forEach((m) => {
        if (m.optionA?.title) existingMenuTitles.push(m.optionA.title);
        if (m.optionB?.title) existingMenuTitles.push(m.optionB.title);
        if (m.optionC?.title) existingMenuTitles.push(m.optionC.title);
      });
    }

    const prefList = patientInfo.mealPreferences
      ? (Object.values(patientInfo.mealPreferences) as MealPreference[])
          .map((p) => p.likes)
          .filter(Boolean)
          .join(', ')
      : '';
    const dislikeList = patientInfo.mealPreferences
      ? (Object.values(patientInfo.mealPreferences) as MealPreference[])
          .map((p) => p.dislikes)
          .filter(Boolean)
          .join(', ')
      : '';

    try {
      let option: MenuOption;
      try {
        const responseData = await safePostJson<{ option: MenuOption }>('/api/regenerate-option', {
          mealName: column.label,
          optionLetter: letter,
          portions: portionsForMeal,
          patientName: patientInfo.name,
          dietNotes: buildDietNotes(patientInfo),
          preferredFoods: prefList,
          dislikedFoods: dislikeList,
          specificPreferences: patientInfo.mealPreferences?.[column.key],
          existingMenuTitles,
        });
        option = responseData.option;
      } catch (apiErr) {
        console.warn('Fallo al regenerar opción individual vía API, usando motor SMAE local:', apiErr);
        const fallbackMeal = buildFallbackMeal(
          column.label,
          portionsForMeal,
          prefList,
          dislikeList
        );
        option = letter === 'B' ? fallbackMeal.optionB : letter === 'C' ? fallbackMeal.optionC : fallbackMeal.optionA;
      }

      // Rectify regenerated option according to SMAE 5th Edition
      const optIdx = letter === 'B' ? 1 : letter === 'C' ? 2 : 0;
      option = rectifyMenuOption(option, portionsForMeal, optIdx, mealName);

      if (generatedPlan) {
        const currentMeal = generatedPlan.meals.find(
          (m) => m.mealName.toLowerCase() === mealName.toLowerCase()
        );
        if (currentMeal) {
          const currentOption =
            letter === 'A' ? currentMeal.optionA : letter === 'B' ? currentMeal.optionB : currentMeal.optionC;
          if (currentOption) {
            setOptionHistory((prev) => {
              const existingMealHistory = prev[currentMeal.mealName] || { A: [], B: [], C: [] };
              return {
                ...prev,
                [currentMeal.mealName]: {
                  A: existingMealHistory.A || [],
                  B: existingMealHistory.B || [],
                  C: existingMealHistory.C || [],
                  [letter]: [...(existingMealHistory[letter] || []), currentOption],
                },
              };
            });
          }
        }

        setGeneratedPlan({
          ...generatedPlan,
          meals: generatedPlan.meals.map((m) => {
            if (m.mealName.toLowerCase() !== mealName.toLowerCase()) return m;
            const updatedMeal: MealMenu = {
              ...m,
              [letter === 'A' ? 'optionA' : letter === 'B' ? 'optionB' : 'optionC']: option,
            };
            return ensureMealVariety(updatedMeal, dislikeList);
          }),
        });
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || `Error al regenerar la Opción ${letter}.`);
    } finally {
      setRegeneratingOption(null);
    }
  };

  // Copy Menus to Clipboard
  const handleCopyMenus = () => {
    if (!generatedPlan) return;
    const formatted = formatClipboardMenu(generatedPlan, patientInfo, selectedMealOptions);
    navigator.clipboard.writeText(formatted);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3500);
  };

  // Export Plan to Word (.docx)
  const handleExportWord = async () => {
    if (!generatedPlan) return;
    try {
      setIsExportingWord(true);
      const safePatientName = patientInfo.name ? patientInfo.name.replace(/\s+/g, '_') : 'Paciente';
      const fileName = `Plan_Nutricional_SMAE_${safePatientName}.docx`;
      await exportPlanToWord(generatedPlan, patientInfo, macros, fileName, selectedMealOptions, tableState);
    } catch (err: any) {
      console.error('Word export error:', err);
      setErrorMsg('Ocurrió un error al generar el documento de Word.');
    } finally {
      setIsExportingWord(false);
    }
  };

  // Export Plan to PDF with native jsPDF
  const handleExportPdf = async () => {
    if (!generatedPlan) return;
    try {
      setIsExportingPdf(true);
      const safePatientName = patientInfo.name ? patientInfo.name.replace(/\s+/g, '_') : 'Paciente';
      const fileName = `Plan_Nutricional_SMAE_${safePatientName}.pdf`;
      exportPlanToPdfNative(generatedPlan, patientInfo, macros, fileName, selectedMealOptions, tableState);
    } catch (err: any) {
      console.error('PDF export error:', err);
      setErrorMsg('Ocurrió un error al generar el archivo PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Clear generated menus
  const handleClearMenus = () => {
    setGeneratedPlan(null);
    setSelectedMealOptions({});
    setOptionHistory({});
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70 text-slate-800">
      {/* App Header / Navigation */}
      <Navbar
        onSelectPreset={handleSelectPreset}
        onOpenGuide={() => setIsGuideOpen(true)}
        onResetTable={handleResetTable}
        hasGeneratedPlan={!!generatedPlan}
        onExportPdf={handleExportPdf}
        isExportingPdf={isExportingPdf}
        onExportWord={handleExportWord}
        isExportingWord={isExportingWord}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Prescription & Nutrient Summary Bar */}
        <NutritionSummaryBar
          macros={macros}
          patientInfo={patientInfo}
          onPatientInfoChange={setPatientInfo}
          onSelectPreset={handleSelectPreset}
        />

        {/* The 18-Row SMAE Table (hides on print when plan is generated) */}
        <div className={generatedPlan ? 'no-print' : ''}>
          <SmaeTable
            tableState={tableState}
            onChangeCell={handleCellChange}
            patientName={patientInfo.name}
          />
        </div>

        {/* Big Action Button */}
        <div className="flex flex-col items-center justify-center my-6 sm:my-8 no-print">
          <button
            id="btn-generate-ai-menus"
            type="button"
            onClick={handleGenerateMenus}
            disabled={isGenerating || macros.totalEquivalents === 0}
            className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-heading font-black text-base sm:text-lg tracking-wide uppercase shadow-lg transition-all flex items-center justify-center gap-3 ${
              isGenerating || macros.totalEquivalents === 0
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-emerald-900/20 hover:shadow-emerald-900/30 hover:-translate-y-0.5 active:translate-y-0'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin text-white" />
                <span>Analizando SMAE 5ta Edición y Generando Menús...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
                <span>GENERAR 3 OPCIONES DE MENÚ POR TIEMPO CON IA</span>
              </>
            )}
          </button>

          {macros.totalEquivalents === 0 && (
            <p className="text-xs text-amber-700 mt-2 font-medium">
              * Ingrese al menos 1 porción en la tabla o seleccione una plantilla superior para generar.
            </p>
          )}
        </div>

        {/* Loading Progress State */}
        {isGenerating && (
          <div className="bg-white rounded-2xl border border-emerald-200 p-8 text-center my-8 shadow-xs animate-pulse no-print">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-4">
              <Utensils className="w-8 h-8 animate-bounce" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 font-heading mb-2">
              Gemini AI está elaborando el plan nutricional exacto
            </h3>
            <div className="max-w-md mx-auto space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Validando porciones y gramajes según SMAE 5ta edición</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Calculando 3 opciones culinarias diferentes por cada tiempo (A, B y C)</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Respetando la cuadratura matemática de equivalentes al 100%</span>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 sm:p-5 my-6 flex items-start gap-3 text-red-800 shadow-xs no-print">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-sm">Ocurrió un inconveniente</h4>
              <p className="text-xs text-red-700 mt-0.5">{errorMsg}</p>
              <button
                type="button"
                onClick={handleGenerateMenus}
                className="mt-3 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Reintentar generación
              </button>
            </div>
          </div>
        )}

        {/* Toast Feedback for Copy */}
        {copySuccess && (
          <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-4 duration-200 border border-emerald-700">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>¡Menús copiados al portapapeles con formato listo para WhatsApp / Correo!</span>
          </div>
        )}

        {/* Generated Plan Container */}
        {generatedPlan && (
          <div ref={resultsRef} className="mt-10" id="printable-plan-container">
            
            {generatedPlan.isFallback && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 mb-6 flex items-start gap-3 text-amber-900 shadow-xs no-print">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-sm">Aviso: Capacidad de IA excedida</h4>
                  <p className="text-xs text-amber-800 mt-1">
                    Debido a una alta demanda o límites de cuota gratuita en los servidores de IA, el sistema ha activado automáticamente el <strong>Motor Determinista de Respaldo SMAE</strong>. 
                    <br/><br/>
                    Se han generado los menús utilizando opciones estándar preconfiguradas que cumplen estrictamente con la cuadratura matemática y gramajes del SMAE.
                  </p>
                </div>
              </div>
            )}

            {/* Clinical Marco: Anthropometric parameters & Kcal, Protein, Lipids, Carbs table */}
            <AnthropometricMacroFrame
              patientInfo={patientInfo}
              macros={macros}
              className="mb-6 print:mb-4"
            />

            {/* General Nutritionist Notes if present */}
            {generatedPlan.patientNotes && (
              <div className="mb-6 print:mb-4 p-4 print:p-3 bg-white rounded-2xl border border-slate-300 print:border-slate-400 text-xs sm:text-sm print:text-xs text-slate-800 leading-relaxed shadow-xs print-break-inside-avoid">
                <span className="font-extrabold text-emerald-900 print:text-slate-900">Recomendaciones Generales: </span>
                {generatedPlan.patientNotes}
              </div>
            )}

            {/* 5 Meal Cards */}
            <div className="space-y-6">
              {generatedPlan.meals.map((meal, idx) => {
                const mealHistoryForCard = optionHistory[meal.mealName] || {};
                return (
                  <GeneratedMealCard
                    key={meal.mealName || idx}
                    meal={meal}
                    mealIndex={idx}
                    onRegenerateMeal={handleRegenerateMeal}
                    onRegenerateOption={handleRegenerateOption}
                    isRegenerating={regeneratingMeal === meal.mealName}
                    regeneratingLetter={regeneratingOption?.mealName === meal.mealName ? regeneratingOption.letter : null}
                    selectedOptions={selectedMealOptions[meal.mealName] || (meal.optionC ? ['A', 'B', 'C'] : ['A', 'B'])}
                    onToggleOption={(letter) => handleToggleMealOption(meal.mealName, letter)}
                    onSetMealOptions={(letters) => handleSetMealOptions(meal.mealName, letters)}
                    optionHistoryCounts={{
                      A: mealHistoryForCard.A?.length || 0,
                      B: mealHistoryForCard.B?.length || 0,
                      C: mealHistoryForCard.C?.length || 0,
                    }}
                    onRestoreOption={handleRestoreOption}
                  />
                );
              })}
            </div>

            {/* Bottom Export Actions Bar (Oculta por defecto para mayor exploración, desplegable al poner el cursor sobre el botón) */}
            {isExportBarOpen ? (
              <div
                onMouseEnter={handleExportBarMouseEnter}
                onMouseLeave={handleExportBarMouseLeave}
                className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-300/80 p-4 shadow-xl flex flex-wrap items-center justify-between gap-4 mt-8 no-print transition-all"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold font-heading text-sm">
                    5/5
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Menús Listos para Entregar</div>
                    <div className="text-2xs text-slate-500">3 Opciones calculadas con porciones exactas SMAE 5ta Ed.</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {/* Imprimir Hoja button */}
                  <button
                    id="btn-print-menus"
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-heading font-bold text-xs bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                    title="Imprimir hoja directamente en tu impresora o abrir diálogo de impresión"
                  >
                    <Printer className="w-4 h-4 text-emerald-200" />
                    <span>Imprimir Hoja</span>
                  </button>

                  {/* Copiar Menús button */}
                  <button
                    id="btn-copy-menus"
                    type="button"
                    onClick={handleCopyMenus}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-heading font-bold text-xs bg-slate-800 hover:bg-slate-900 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <Copy className="w-4 h-4 text-emerald-400" />
                    <span>Copiar menús (WhatsApp / Texto)</span>
                  </button>

                  {/* Exportar a PDF button */}
                  <button
                    id="btn-export-pdf"
                    type="button"
                    onClick={handleExportPdf}
                    disabled={isExportingPdf}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-heading font-bold text-xs bg-red-600 hover:bg-red-700 text-white shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    title="Descargar plan en formato PDF"
                  >
                    {isExportingPdf ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Download className="w-4 h-4 text-red-100" />
                    )}
                    <span>Exportar a PDF</span>
                  </button>

                  {/* Exportar a Word (.docx) button */}
                  <button
                    id="btn-export-word"
                    type="button"
                    onClick={handleExportWord}
                    disabled={isExportingWord}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-heading font-bold text-xs bg-blue-700 hover:bg-blue-800 text-white shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    title="Descargar plan en formato Word editable (.docx)"
                  >
                    {isExportingWord ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <FileText className="w-4 h-4 text-blue-200" />
                    )}
                    <span>Exportar a Word</span>
                  </button>

                  {/* Reiniciar button */}
                  <button
                    id="btn-clear-menus"
                    type="button"
                    onClick={handleClearMenus}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-heading font-bold text-xs bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-rose-500" />
                    <span>Reiniciar</span>
                  </button>

                  {/* Ocultar Pestaña button */}
                  <button
                    id="btn-hide-export-tab"
                    type="button"
                    onClick={() => setIsExportBarOpen(false)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer border border-transparent hover:border-slate-200"
                    title="Ocultar pestaña de acciones para mayor espacio de visualización"
                  >
                    <EyeOff className="w-4 h-4 text-slate-400" />
                    <span className="hidden sm:inline">Ocultar pestaña</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="sticky bottom-4 z-20 flex justify-end no-print mt-6"
                onMouseEnter={handleExportBarMouseEnter}
                onMouseLeave={handleExportBarMouseLeave}
              >
                <button
                  id="btn-show-export-tab"
                  type="button"
                  onMouseEnter={handleExportBarMouseEnter}
                  onMouseLeave={handleExportBarMouseLeave}
                  onClick={() => setIsExportBarOpen((prev) => !prev)}
                  className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-heading font-black text-xs bg-slate-900 hover:bg-emerald-800 text-white shadow-xl hover:shadow-2xl border border-slate-700 hover:border-emerald-500 transition-all active:scale-95 cursor-pointer backdrop-blur-md group"
                  title="Pasa el cursor o haz clic para desplegar las opciones de exportación"
                >
                  <Printer className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span>Opciones de Exportación (5/5)</span>
                  <ChevronUp className="w-4 h-4 text-slate-300 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* SMAE Guide Modal */}
      <SmaeGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Generador de Menús SMAE Pro © {new Date().getFullYear()}</span>
            <span className="text-slate-300">|</span>
            <span>Sistema Mexicano de Alimentos Equivalentes 5ta Edición</span>
          </div>
          <div className="text-slate-400 text-2xs">
            Desarrollado para Nutriólogas y Profesionales de la Salud
          </div>
        </div>
      </footer>
    </div>
  );
}

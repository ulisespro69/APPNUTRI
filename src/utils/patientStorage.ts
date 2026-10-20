import { SavedPatientRecord, PatientInfo, GeneratedPlan, MealOptionLetter } from '../types';
import { TableGridState } from '../data/smaeData';

const PATIENTS_STORAGE_KEY = 'smae_consultation_patients';

/**
 * Returns all saved patients sorted in strictly alphabetical order (A-Z) by name.
 */
export function getSavedPatients(): SavedPatientRecord[] {
  try {
    const raw = localStorage.getItem(PATIENTS_STORAGE_KEY);
    if (!raw) return [];
    const list: SavedPatientRecord[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    
    return sortPatientsAlphabetically(list);
  } catch (err) {
    console.error('Error al cargar pacientes de localStorage:', err);
    return [];
  }
}

/**
 * Sorts an array of patient records alphabetically by name (A-Z).
 * Handles Spanish characters (á, é, í, ó, ú, ñ) correctly.
 */
export function sortPatientsAlphabetically(patients: SavedPatientRecord[]): SavedPatientRecord[] {
  return [...patients].sort((a, b) => {
    const nameA = (a.name || 'Sin nombre').trim().toLowerCase();
    const nameB = (b.name || 'Sin nombre').trim().toLowerCase();
    return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
  });
}

/**
 * Saves or updates a patient record and returns the updated alphabetically sorted list.
 */
export function savePatientRecord(record: SavedPatientRecord): SavedPatientRecord[] {
  const current = getSavedPatients();
  const existingIndex = current.findIndex((p) => p.id === record.id);

  let updated: SavedPatientRecord[];
  const timestamp = new Date().toISOString();

  if (existingIndex >= 0) {
    updated = current.map((p, idx) =>
      idx === existingIndex
        ? {
            ...record,
            name: (record.name || 'Paciente Sin Nombre').trim(),
            updatedAt: timestamp,
          }
        : p
    );
  } else {
    updated = [
      ...current,
      {
        ...record,
        name: (record.name || 'Paciente Sin Nombre').trim(),
        createdAt: record.createdAt || timestamp,
        updatedAt: timestamp,
      },
    ];
  }

  const sorted = sortPatientsAlphabetically(updated);
  try {
    localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(sorted));
  } catch (err) {
    console.error('Error al guardar paciente en localStorage:', err);
  }

  return sorted;
}

/**
 * Deletes a patient by ID and returns the updated list.
 */
export function deletePatientRecord(id: string): SavedPatientRecord[] {
  const current = getSavedPatients();
  const updated = current.filter((p) => p.id !== id);
  const sorted = sortPatientsAlphabetically(updated);

  try {
    localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(sorted));
  } catch (err) {
    console.error('Error al eliminar paciente en localStorage:', err);
  }

  return sorted;
}

/**
 * Exports all patients to a JSON file download.
 */
export function exportPatientsBackup(): void {
  const list = getSavedPatients();
  const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `respaldo_pacientes_smae_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Imports patients from a JSON file content and merges with existing list.
 */
export function importPatientsBackup(jsonContent: string): { success: boolean; count: number; error?: string } {
  try {
    const imported = JSON.parse(jsonContent);
    if (!Array.isArray(imported)) {
      return { success: false, count: 0, error: 'El archivo no contiene una lista válida de pacientes.' };
    }

    const current = getSavedPatients();
    const map = new Map<string, SavedPatientRecord>();
    current.forEach((p) => map.set(p.id, p));

    imported.forEach((p) => {
      if (p && p.id && p.name) {
        map.set(p.id, p);
      }
    });

    const merged = sortPatientsAlphabetically(Array.from(map.values()));
    localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(merged));
    return { success: true, count: merged.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || 'Error al procesar el archivo JSON.' };
  }
}

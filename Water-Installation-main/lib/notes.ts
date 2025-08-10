import type { InstallationData, Note } from "./types"

export interface NoteData {
  [unit: string]: string
}

export function createNote(unit: string, content: string): Note {
  return {
    id: `${unit}-${Date.now()}`,
    unit,
    content,
    timestamp: Date.now(),
  }
}

export function formatNoteForDisplay(note: Note): string {
  return `Unit ${note.unit}: ${note.content}`
}

export function sortNotesByUnit(notes: Note[]): Note[] {
  return notes.sort((a, b) => a.unit.localeCompare(b.unit))
}

export function filterNotesByContent(notes: Note[], searchTerm: string): Note[] {
  if (!searchTerm) return notes

  const term = searchTerm.toLowerCase()
  return notes.filter((note) => note.unit.toLowerCase().includes(term) || note.content.toLowerCase().includes(term))
}

export function exportNotesToCSV(notes: Note[]): string {
  const headers = ["Unit", "Note", "Timestamp"]
  const rows = notes.map((note) => [
    note.unit,
    `"${note.content.replace(/"/g, '""')}"`,
    new Date(note.timestamp).toISOString(),
  ])

  return [headers, ...rows].map((row) => row.join(",")).join("\n")
}

export function validateNoteContent(content: string): boolean {
  return content.trim().length > 0 && content.length <= 500
}

export function sanitizeNoteContent(content: string): string {
  return content.trim().replace(/[<>]/g, "")
}

const LOCAL_STORAGE_KEY = "unifiedNotes"

// Compile notes for all units, including selected cells and columns
export function compileAllNotes({
  installationData,
  unitColumn,
  selectedCells = {},
  selectedNotesColumns = [],
}: {
  installationData: InstallationData[]
  unitColumn: string
  selectedCells?: Record<string, string[]>
  selectedNotesColumns?: string[]
}): Array<{ unit: string; note: string; [key: string]: any }> {
  return installationData.map((item) => {
    let notes = ""
    // Leak issues (same as before)
    if (item["Leak Issue Kitchen Faucet"]) {
      const leakValue = item["Leak Issue Kitchen Faucet"].trim().toLowerCase()
      if (leakValue === "light") notes += "Light leak from kitchen faucet. "
      else if (leakValue === "moderate") notes += "Moderate leak from bathroom faucet. "
      else if (leakValue === "heavy") notes += "Heavy leak from bathroom faucet. "
      else if (leakValue === "dripping" || leakValue === "driping") notes += "Dripping from bathroom faucet. "
      else notes += "Leak from bathroom faucet. "
    }
    if (item["Leak Issue Bath Faucet"]) {
      const leakValue = item["Leak Issue Bath Faucet"].trim().toLowerCase()
      if (leakValue === "light") notes += "Light leak from bathroom faucet. "
      else if (leakValue === "moderate") notes += "Moderate leak from bathroom faucet. "
      else if (leakValue === "heavy") notes += "Heavy leak from bathroom faucet. "
      else if (leakValue === "dripping" || leakValue === "driping") notes += "Dripping from bathroom faucet. "
      else notes += "Leak from bathroom faucet. "
    }
    if (item["Tub Spout/Diverter Leak Issue"]) {
      const leakValue = item["Tub Spout/Diverter Leak Issue"]
      if (leakValue === "Light") notes += "Light leak from tub spout/diverter. "
      else if (leakValue === "Moderate") notes += "Moderate leak from tub spout/diverter. "
      else if (leakValue === "Heavy") notes += "Heavy leak from tub spout/diverter. "
      else notes += "Leak from tub spout/diverter. "
    }
    // Add notes from selected columns
    if (selectedNotesColumns && selectedNotesColumns.length > 0) {
      selectedNotesColumns.forEach((col) => {
        const val = item[col]
        if (val && val.trim() !== "") notes += `${val}. `
      })
    }
    // Add notes from selected cells
    const unitValue = item[unitColumn] || item.Unit
    if (unitValue && selectedCells[unitValue]) {
      selectedCells[unitValue].forEach((cellInfo) => {
        notes += `${cellInfo}. `
      })
    }
    return {
      unit: unitValue,
      note: notes.trim(),
      ...item,
    }
  })
}

// Unified notes management functions
export const loadNotesFromLocalStorage = (): Note[] => {
  if (typeof window === "undefined") {
    return []
  }
  try {
    const storedNotes = localStorage.getItem(LOCAL_STORAGE_KEY)
    return storedNotes ? JSON.parse(storedNotes) : []
  } catch (error) {
    console.error("Failed to load notes from local storage:", error)
    return []
  }
}

export const saveNotesToLocalStorage = (notes: Note[]): void => {
  if (typeof window === "undefined") {
    return
  }
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notes))
  } catch (error) {
    console.error("Failed to save notes to local storage:", error)
  }
}

export const getStoredNotes = (): Record<string, string> => {
  if (typeof window === "undefined") {
    return {}
  }
  try {
    const storedNotes = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (storedNotes) {
      // If it's the new array format, convert it to the old map format for this function
      const parsedNotes: Note[] = JSON.parse(storedNotes)
      return parsedNotes.reduce((acc: Record<string, string>, note) => {
        // Only add notes that have valid content
        if (note.content && note.content.trim() && note.content !== "undefined") {
          acc[note.unit] = note.content
        }
        return acc
      }, {})
    }
    return {}
  } catch (error) {
    console.error("Failed to get stored notes:", error)
    return {}
  }
}

export const updateStoredNote = (unit: string, noteContent: string): void => {
  if (typeof window === "undefined") {
    return
  }
  try {
    const currentNotes = loadNotesFromLocalStorage()
    const existingNoteIndex = currentNotes.findIndex((note) => note.unit === unit)

    if (existingNoteIndex !== -1) {
      // Update existing note
      currentNotes[existingNoteIndex].content = noteContent
    } else {
      // Add new note
      currentNotes.push({ id: Date.now().toString(), unit, content: noteContent })
    }
    saveNotesToLocalStorage(currentNotes)
  } catch (error) {
    console.error("Failed to update stored note:", error)
  }
}

interface GetUnifiedNotesParams {
  installationData: any[]
  unitColumn: string
  selectedCells: Record<string, string[]>
  selectedNotesColumns: string[]
}

export const getUnifiedNotes = ({
  installationData,
  unitColumn,
  selectedCells,
  selectedNotesColumns,
}: GetUnifiedNotesParams): Note[] => {
  const compiledNotes: Record<string, string> = {}

  // 1. Compile notes from selected cells
  for (const unitKey in selectedCells) {
    const notesForUnit = selectedCells[unitKey].join(". ")
    if (notesForUnit.trim()) {
      compiledNotes[unitKey] = (compiledNotes[unitKey] || "") + notesForUnit + ". "
    }
  }

  // 2. Compile notes from selected columns for each unit
  installationData.forEach((item) => {
    const unit = item[unitColumn]
    if (unit) {
      let unitNotes = ""
      selectedNotesColumns.forEach((col) => {
        if (item[col] && item[col].trim()) {
          unitNotes += `${item[col]}. `
        }
      })
      if (unitNotes.trim()) {
        compiledNotes[unit] = (compiledNotes[unit] || "") + unitNotes
      }
    }
  })

  // 3. Compile notes from specific "Leak Issue" columns
  installationData.forEach((item) => {
    const unit = item[unitColumn]
    if (unit) {
      let leakNotes = ""

      if (item["Leak Issue Kitchen Faucet"] && item["Leak Issue Kitchen Faucet"].trim()) {
        leakNotes += `Kitchen Faucet Leak: ${item["Leak Issue Kitchen Faucet"]}. `
      }
      if (item["Leak Issue Bath Faucet"] && item["Leak Issue Bath Faucet"].trim()) {
        leakNotes += `Bathroom Faucet Leak: ${item["Leak Issue Bath Faucet"]}. `
      }
      if (item["Tub Spout/Diverter Leak Issue"] && item["Tub Spout/Diverter Leak Issue"].trim()) {
        leakNotes += `Tub Spout/Diverter Leak: ${item["Tub Spout/Diverter Leak Issue"]}. `
      }

      if (leakNotes.trim()) {
        compiledNotes[unit] = (compiledNotes[unit] || "") + leakNotes
      }
    }
  })

  // 4. Load and merge manually added/edited notes from local storage (new format)
  const manuallyAddedNotes = loadNotesFromLocalStorage()
  manuallyAddedNotes.forEach((note) => {
    // Only process notes that have actual content
    if (note.content && note.content.trim() && note.content !== "undefined") {
      if (compiledNotes[note.unit]) {
        compiledNotes[note.unit] = (compiledNotes[note.unit] || "") + note.content
      } else {
        compiledNotes[note.unit] = note.content
      }
    }
  })

  // Convert the compiledNotes map to the Note[] array format, filtering out empty notes
  const finalNotes: Note[] = Object.entries(compiledNotes)
    .filter(([unit, content]) => content && content.trim() && content !== "undefined")
    .map(([unit, content], index) => ({
      id: `auto-${index}-${Date.now()}`, // Generate a unique ID
      unit,
      content: content.trim(),
      timestamp: Date.now(),
    }))

  // Sort notes by unit number
  return finalNotes.sort((a, b) => {
    const unitA = a.unit || ""
    const unitB = b.unit || ""

    // Try to parse as numbers first
    const numA = Number.parseInt(unitA)
    const numB = Number.parseInt(unitB)

    // If both are valid numbers, sort numerically
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB
    }

    // Otherwise, sort alphabetically
    return unitA.localeCompare(unitB, undefined, { numeric: true, sensitivity: "base" })
  })
}

export const clearNotesFromLocalStorage = () => {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY)
  } catch (error) {
    console.error("Error clearing notes from local storage:", error)
  }
}

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
export function loadNotesFromLocalStorage(): Note[] {
  if (typeof window === "undefined") return []

  try {
    const storedNotes = localStorage.getItem("unifiedNotes")
    if (storedNotes) {
      const parsedNotes = JSON.parse(storedNotes)
      console.log("Notes: Loaded unified notes from localStorage:", parsedNotes)

      // Filter out any notes with undefined content
      return parsedNotes.filter(
        (note: Note) =>
          note &&
          note.content &&
          typeof note.content === "string" &&
          note.content.trim() !== "" &&
          note.content !== "undefined",
      )
    }
  } catch (error) {
    console.error("Error loading notes from localStorage:", error)
  }

  return []
}

export function saveNotesToLocalStorage(notes: Note[]): void {
  if (typeof window === "undefined") return

  try {
    // Filter out invalid notes before saving
    const validNotes = notes.filter(
      (note) =>
        note &&
        note.content &&
        typeof note.content === "string" &&
        note.content.trim() !== "" &&
        note.content !== "undefined",
    )

    localStorage.setItem("unifiedNotes", JSON.stringify(validNotes))
    console.log("Notes: Saved unified notes to localStorage:", validNotes)

    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent("notesUpdated", { detail: validNotes }))
  } catch (error) {
    console.error("Error saving notes to localStorage:", error)
  }
}

export function getStoredNotes(): Note[] {
  if (typeof window === "undefined") return []

  try {
    const installationDataStr = localStorage.getItem("installationData")
    const selectedCellsStr = localStorage.getItem("selectedCells")
    const selectedNotesColumnsStr = localStorage.getItem("selectedNotesColumns")

    if (!installationDataStr) {
      console.log("Notes: No installation data available")
      return []
    }

    const installationData = JSON.parse(installationDataStr)
    const selectedCells = selectedCellsStr ? JSON.parse(selectedCellsStr) : {}
    const selectedNotesColumns = selectedNotesColumnsStr ? JSON.parse(selectedNotesColumnsStr) : []

    console.log("Notes: Processing installation data, length:", installationData.length)
    console.log("Notes: Loaded selected cells from preview:", selectedCells)
    console.log("Notes: Loaded selected notes columns from preview:", selectedNotesColumns)

    if (installationData.length === 0) {
      console.log("Notes: No installation data available")
      return []
    }

    // Find unit column
    const allColumnNames = Object.keys(installationData[0] || {})
    console.log("Notes: All column names for unit detection:", allColumnNames)

    const unitColumn = allColumnNames.find((col) => col.toLowerCase().includes("unit")) || allColumnNames[0]
    console.log("Notes: Found unit column:", unitColumn)
    console.log("Notes: Using unit column:", unitColumn)

    console.log("Notes: Using unified notes system...")

    const processedNotes: Note[] = []

    installationData.forEach((row: any) => {
      const unit = row[unitColumn]
      if (!unit || unit.toString().trim() === "") return

      let noteContent = ""

      // Add notes from selected columns
      selectedNotesColumns.forEach((col: string) => {
        const value = row[col]
        if (
          value &&
          typeof value === "string" &&
          value.trim() !== "" &&
          value !== "undefined" &&
          value.toLowerCase() !== "undefined"
        ) {
          noteContent += `${col}: ${value}. `
        } else if (value && typeof value === "number") {
          noteContent += `${col}: ${value}. `
        }
      })

      // Add notes from selected cells
      const unitCells = selectedCells[unit.toString()]
      if (unitCells && Array.isArray(unitCells)) {
        unitCells.forEach((cellInfo: string) => {
          if (cellInfo && typeof cellInfo === "string" && cellInfo.trim() !== "" && !cellInfo.includes("undefined")) {
            noteContent += `${cellInfo}. `
          }
        })
      }

      // Only add note if there's actual content
      const finalContent = noteContent.trim()
      if (finalContent && finalContent !== "" && !finalContent.includes("undefined")) {
        console.log(`Notes: Adding note for unit ${unit}: "${finalContent}"`)
        processedNotes.push({
          id: `note-${unit}`,
          unit: unit.toString(),
          content: finalContent,
        })
      } else {
        console.log(`Notes: Skipping note for unit ${unit}, no valid content`)
      }
    })

    console.log("Notes: Final processed notes:", processedNotes.length, "notes")
    return processedNotes
  } catch (error) {
    console.error("Error processing notes:", error)
    return []
  }
}

export function updateStoredNote(unit: string, noteContent: string): void {
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

export function clearNotesFromLocalStorage() {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY)
  } catch (error) {
    console.error("Error clearing notes from local storage:", error)
  }
}

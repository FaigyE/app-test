"use client"

import { useState, useEffect } from "react"
import { useReportContext } from "@/lib/report-context"
import EditableText from "@/components/editable-text"
import { getStoredNotes, updateStoredNote } from "@/lib/notes"
import Image from "next/image"

interface ReportNotesPageProps {
  isEditable?: boolean
}

export function ReportNotesPage({ isEditable = true }: ReportNotesPageProps) {
  const { reportData, updateSectionTitle } = useReportContext()
  const [notes, setNotes] = useState<Array<{ unit: string; note: string }>>([])

  useEffect(() => {
    const loadNotes = () => {
      console.log("Notes: Loading installation data from localStorage")
      const storedInstallationData = localStorage.getItem("installationData")

      if (!storedInstallationData) {
        console.log("Notes: No installation data available")
        return
      }

      try {
        const installationData = JSON.parse(storedInstallationData)
        console.log("Notes: Processing installation data, length:", installationData.length)

        if (!installationData || installationData.length === 0) {
          console.log("Notes: No installation data available")
          return
        }

        // Find unit column
        const findUnitColumn = (data: any[]): string => {
          if (!data || data.length === 0) return "Unit"

          const item = data[0]
          console.log("Notes: All column names for unit detection:", Object.keys(item))

          const unitKeywords = ["unit", "apt", "apartment", "room", "bldg/unit"]

          for (const key of Object.keys(item)) {
            if (unitKeywords.some((keyword) => key.toLowerCase().includes(keyword))) {
              console.log("Notes: Found unit column:", key)
              return key
            }
          }

          return Object.keys(item)[0]
        }

        const unitColumn = findUnitColumn(installationData)
        console.log("Notes: Using unit column:", unitColumn)

        // Load selected cells and columns from localStorage
        const selectedCells = JSON.parse(localStorage.getItem("selectedCells") || "{}")
        const selectedNotesColumns = JSON.parse(localStorage.getItem("selectedNotesColumns") || "[]")

        console.log("Notes: Loaded selected cells from preview:", selectedCells)
        console.log("Notes: Loaded selected notes columns from preview:", selectedNotesColumns)

        // Get stored notes
        const storedNotes = getStoredNotes()
        console.log("Notes: Using unified notes system...")

        // Process notes from installation data and stored notes
        const processedNotes: Array<{ unit: string; note: string }> = []

        installationData.forEach((row: any) => {
          const unit = row[unitColumn]
          if (!unit) return

          let compiledNote = ""

          // Add notes from selected columns
          selectedNotesColumns.forEach((col: string) => {
            const value = row[col]
            if (
              value &&
              typeof value === "string" &&
              value.trim() !== "" &&
              value.trim() !== "undefined" &&
              value.toLowerCase() !== "undefined"
            ) {
              compiledNote += `${col}: ${value}. `
            } else if (value && typeof value === "number") {
              compiledNote += `${col}: ${value}. `
            }
          })

          // Add notes from selected cells
          if (selectedCells[unit]) {
            selectedCells[unit].forEach((cellInfo: string) => {
              if (
                cellInfo &&
                typeof cellInfo === "string" &&
                cellInfo.trim() !== "" &&
                cellInfo.trim() !== "undefined" &&
                cellInfo.toLowerCase() !== "undefined" &&
                !cellInfo.includes("undefined")
              ) {
                compiledNote += `${cellInfo}. `
              }
            })
          }

          // Add manually stored notes
          const storedNote = storedNotes[unit]
          if (
            storedNote &&
            storedNote.trim() !== "" &&
            storedNote.trim() !== "undefined" &&
            storedNote.toLowerCase() !== "undefined"
          ) {
            compiledNote += storedNote
          }

          const finalNote = compiledNote.trim()

          // Enhanced validation to ensure no undefined values make it through
          const hasValidContent =
            finalNote &&
            finalNote !== "" &&
            finalNote !== "undefined" &&
            finalNote.toLowerCase() !== "undefined" &&
            !finalNote.includes("undefined") &&
            finalNote.length > 0

          console.log(`Notes: Filtering note for unit ${unit}, has content: ${hasValidContent}, note: "${finalNote}"`)

          if (hasValidContent) {
            processedNotes.push({
              unit: unit,
              note: finalNote,
            })
          }
        })

        // Sort by unit number
        processedNotes.sort((a, b) => {
          const numA = Number.parseInt(a.unit) || 0
          const numB = Number.parseInt(b.unit) || 0
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB
          }
          return a.unit.localeCompare(b.unit, undefined, { numeric: true, sensitivity: "base" })
        })

        console.log("Notes: Final processed notes:", processedNotes.length, "notes")
        setNotes(processedNotes)
      } catch (error) {
        console.error("Error processing notes:", error)
      }
    }

    loadNotes()

    // Listen for unified notes updates
    const handleNotesUpdate = () => {
      console.log("Notes: Received unified notes update event")
      loadNotes()
    }

    window.addEventListener("unifiedNotesUpdated", handleNotesUpdate)
    return () => window.removeEventListener("unifiedNotesUpdated", handleNotesUpdate)
  }, [])

  const handleNoteEdit = (unit: string, value: string) => {
    if (isEditable) {
      updateStoredNote(unit, value)
      // Update local state immediately
      setNotes((prev) => prev.map((note) => (note.unit === unit ? { ...note, note: value } : note)))
    }
  }

  if (!reportData) {
    return null
  }

  return (
    <div className="print-section report-page min-h-[1056px] relative">
      {/* Header with logo */}
      <div className="mb-8">
        <Image src="/images/greenlight-logo.png" alt="GreenLight Logo" width={150} height={96} className="h-24" />
      </div>

      {/* Notes content */}
      <div className="mb-16">
        <h2 className="text-xl font-bold mb-6">
          {isEditable ? (
            <EditableText
              value={reportData.sections?.notesPage?.title || "Installation Notes"}
              onChange={(value) => updateSectionTitle("notesPage", value)}
              placeholder="Notes Title"
              className="text-xl font-bold"
            />
          ) : (
            reportData.sections?.notesPage?.title || "Installation Notes"
          )}
        </h2>

        {notes.length === 0 ? (
          <p className="text-gray-600 italic">No installation notes available.</p>
        ) : (
          <div className="space-y-4">
            {notes.map((noteItem, index) => (
              <div key={index} className="border-b border-gray-200 pb-3">
                <div className="flex items-start gap-3">
                  <span className="font-semibold text-gray-800 min-w-[80px]">Unit {noteItem.unit}:</span>
                  <div className="flex-1">
                    {isEditable ? (
                      <EditableText
                        value={noteItem.note}
                        onChange={(value) => handleNoteEdit(noteItem.unit, value)}
                        placeholder="Add note..."
                        className="text-gray-700"
                      />
                    ) : (
                      <span className="text-gray-700">{noteItem.note}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="footer-container">
        <Image
          src="/images/greenlight-footer.png"
          alt="GreenLight Footer"
          width={800}
          height={100}
          className="w-full h-auto"
        />
      </div>
    </div>
  )
}

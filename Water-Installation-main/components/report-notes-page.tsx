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
      console.log("Notes: Starting fresh approach - loading installation data")

      try {
        const storedInstallationData = localStorage.getItem("installationData")
        if (!storedInstallationData) {
          console.log("Notes: No installation data found")
          setNotes([])
          return
        }

        const installationData = JSON.parse(storedInstallationData)
        console.log("Notes: Loaded installation data:", installationData.length, "rows")

        // Find unit column
        const findUnitColumn = (data: any[]): string => {
          if (!data || data.length === 0) return "Unit"
          const item = data[0]
          const unitKeywords = ["unit", "apt", "apartment", "room", "bldg/unit"]

          for (const key of Object.keys(item)) {
            if (unitKeywords.some((keyword) => key.toLowerCase().includes(keyword))) {
              return key
            }
          }
          return Object.keys(item)[0]
        }

        const unitColumn = findUnitColumn(installationData)
        console.log("Notes: Using unit column:", unitColumn)

        // Load selections from localStorage
        const selectedCells = JSON.parse(localStorage.getItem("selectedCells") || "{}")
        const selectedNotesColumns = JSON.parse(localStorage.getItem("selectedNotesColumns") || "[]")
        const storedNotes = getStoredNotes()

        console.log("Notes: Loaded selections:", { selectedCells, selectedNotesColumns, storedNotes })

        // Process notes with strict validation
        const processedNotes: Array<{ unit: string; note: string }> = []

        installationData.forEach((row: any, index: number) => {
          const unit = row[unitColumn]

          // Skip if no valid unit
          if (!unit || typeof unit !== "string" || unit.trim() === "") {
            console.log(`Notes: Skipping row ${index} - invalid unit:`, unit)
            return
          }

          const unitStr = unit.toString().trim()
          let compiledNote = ""

          // Add notes from selected columns - with strict validation
          selectedNotesColumns.forEach((col: string) => {
            const value = row[col]
            if (value !== null && value !== undefined && value !== "" && String(value).trim() !== "") {
              const valueStr = String(value).trim()
              if (valueStr !== "undefined" && !valueStr.includes("undefined")) {
                compiledNote += `${col}: ${valueStr}. `
              }
            }
          })

          // Add notes from selected cells - with strict validation
          if (selectedCells[unitStr] && Array.isArray(selectedCells[unitStr])) {
            selectedCells[unitStr].forEach((cellInfo: string) => {
              if (cellInfo && typeof cellInfo === "string" && cellInfo.trim() !== "") {
                const cellStr = cellInfo.trim()
                if (cellStr !== "undefined" && !cellStr.includes("undefined")) {
                  compiledNote += `${cellStr}. `
                }
              }
            })
          }

          // Add manually stored notes - with strict validation
          const storedNote = storedNotes[unitStr]
          if (storedNote && typeof storedNote === "string" && storedNote.trim() !== "") {
            const storedStr = storedNote.trim()
            if (storedStr !== "undefined" && !storedStr.includes("undefined")) {
              compiledNote += storedStr
            }
          }

          const finalNote = compiledNote.trim()

          // Only add if we have actual content
          if (finalNote && finalNote !== "" && finalNote !== "undefined" && !finalNote.includes("undefined")) {
            console.log(`Notes: Adding note for unit ${unitStr}:`, finalNote)
            processedNotes.push({
              unit: unitStr,
              note: finalNote,
            })
          } else {
            console.log(`Notes: Skipping unit ${unitStr} - no valid content`)
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

        console.log("Notes: Final processed notes:", processedNotes.length)
        console.log("Notes: Sample notes:", processedNotes.slice(0, 3))

        setNotes(processedNotes)
      } catch (error) {
        console.error("Notes: Error processing notes:", error)
        setNotes([])
      }
    }

    loadNotes()

    // Listen for updates
    const handleNotesUpdate = () => {
      console.log("Notes: Received update event")
      loadNotes()
    }

    window.addEventListener("unifiedNotesUpdated", handleNotesUpdate)
    return () => window.removeEventListener("unifiedNotesUpdated", handleNotesUpdate)
  }, [])

  const handleNoteEdit = (unit: string, value: string) => {
    if (isEditable && value !== undefined && value !== null) {
      const cleanValue = String(value).trim()
      if (cleanValue !== "undefined" && !cleanValue.includes("undefined")) {
        updateStoredNote(unit, cleanValue)
        setNotes((prev) => prev.map((note) => (note.unit === unit ? { ...note, note: cleanValue } : note)))
      }
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
            {notes.map((noteItem, index) => {
              // Additional safety check before rendering
              if (
                !noteItem ||
                !noteItem.unit ||
                !noteItem.note ||
                noteItem.note === "undefined" ||
                noteItem.note.includes("undefined")
              ) {
                console.warn("Notes: Skipping invalid note item:", noteItem)
                return null
              }

              return (
                <div key={`${noteItem.unit}-${index}`} className="border-b border-gray-200 pb-3">
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
              )
            })}
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

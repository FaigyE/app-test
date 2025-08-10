"use client"

import { useState, useEffect } from "react"
import { useReportContext } from "@/lib/report-context"
import EditableText from "@/components/editable-text"
import { getSimpleNotes, updateSimpleNote, type SimpleNote } from "@/lib/simple-notes"
import Image from "next/image"

interface SimpleNotesPageProps {
  isEditable?: boolean
}

export function SimpleNotesPage({ isEditable = true }: SimpleNotesPageProps) {
  const { reportData, updateSectionTitle } = useReportContext()
  const [notes, setNotes] = useState<SimpleNote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log("SimpleNotes: Loading notes...")

    try {
      const loadedNotes = getSimpleNotes()
      console.log("SimpleNotes: Loaded", loadedNotes.length, "notes")
      console.log("SimpleNotes: Sample:", loadedNotes.slice(0, 3))

      setNotes(loadedNotes)
    } catch (error) {
      console.error("SimpleNotes: Error loading notes:", error)
      setNotes([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleNoteEdit = (unit: string, content: string) => {
    if (!isEditable) return

    console.log("SimpleNotes: Editing note for unit", unit, "content:", content)

    // Update localStorage
    updateSimpleNote(unit, content)

    // Update local state
    setNotes((prev) => {
      const existing = prev.find((n) => n.unit === unit)
      if (existing) {
        return prev.map((n) => (n.unit === unit ? { ...n, content } : n))
      } else if (content.trim()) {
        return [...prev, { unit, content }].sort((a, b) => {
          const numA = Number.parseInt(a.unit) || 0
          const numB = Number.parseInt(b.unit) || 0
          return numA - numB
        })
      }
      return prev
    })
  }

  if (loading) {
    return (
      <div className="print-section report-page min-h-[1056px] relative">
        <div className="mb-8">
          <Image src="/images/greenlight-logo.png" alt="GreenLight Logo" width={150} height={96} className="h-24" />
        </div>
        <div className="mb-16">
          <h2 className="text-xl font-bold mb-6">Loading Notes...</h2>
        </div>
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
              value={reportData?.sections?.notesPage?.title || "Installation Notes"}
              onChange={(value) => updateSectionTitle("notesPage", value)}
              placeholder="Notes Title"
              className="text-xl font-bold"
            />
          ) : (
            reportData?.sections?.notesPage?.title || "Installation Notes"
          )}
        </h2>

        {notes.length === 0 ? (
          <p className="text-gray-600 italic">No installation notes available.</p>
        ) : (
          <div className="space-y-4">
            {notes.map((note, index) => (
              <div key={`${note.unit}-${index}`} className="border-b border-gray-200 pb-3">
                <div className="flex items-start gap-3">
                  <span className="font-semibold text-gray-800 min-w-[80px]">Unit {note.unit}:</span>
                  <div className="flex-1">
                    {isEditable ? (
                      <EditableText
                        value={note.content}
                        onChange={(value) => handleNoteEdit(note.unit, value)}
                        placeholder="Add note..."
                        className="text-gray-700"
                      />
                    ) : (
                      <span className="text-gray-700">{note.content}</span>
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

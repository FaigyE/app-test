"use client"
import { useState, useEffect, useMemo, useCallback } from "react"
import EditableText from "@/components/editable-text"
import { summarizeAeratorSavings, getAeratorSummaryTable, consolidateInstallationsByUnitV2 } from "@/lib/utils/aerator-helpers"
import { useReportContext } from "@/lib/report-context"
import { Button } from "@/components/ui/button"
import { Plus, XCircle } from 'lucide-react'
import { updateStoredNote, getStoredNotes } from "@/lib/notes"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Image from "next/image"
import type { ReportImage } from "@/lib/types"
import { ImageUploader } from "./image-uploader"
import { useToast } from "@/hooks/use-toast"

interface InstallationData {
  Unit: string
  "Shower Head"?: string
  "Bathroom aerator"?: string
  "Kitchen Aerator"?: string
  "Leak Issue Kitchen Faucet"?: string
  "Leak Issue Bath Faucet"?: string
  "Tub Spout/Diverter Leak Issue"?: string
  Notes?: string
  [key: string]: string | undefined
}

interface ReportDetailPageProps {
  installationData?: InstallationData[]
  isPreview?: boolean
  isEditable?: boolean
}

export function ReportDetailPage({
  installationData: propInstallationData,
  isPreview = true,
  isEditable = true,
}: ReportDetailPageProps) {
  const { reportData, updateReportData, updateSectionTitle, setReportData } = useReportContext()
  const { aeratorData, images, installationData: contextInstallationData } = reportData
  
  // Use installation data from props, context, or empty array as fallback
  const initialInstallationData = propInstallationData || contextInstallationData || []
  
  const [installationData, setInstallationData] = useState<InstallationData[]>(initialInstallationData)
  const [additionalRows, setAdditionalRows] = useState<InstallationData[]>([])
  const [editedNotes, setEditedNotes] = useState<Record<string, string>>({})
  const [editedInstallations, setEditedInstallations] = useState<Record<string, Record<string, string>>>({})
  const [editedUnits, setEditedUnits] = useState<Record<string, string>>({})
  const [columnHeaders, setColumnHeaders] = useState({
    unit: "Unit",
    kitchen: "Kitchen Installed",
    bathroom: "Bathroom Installed",
    shower: "Shower Installed",
    toilet: "Toilet Installed",
    notes: "Notes",
  })
  const { addToast } = useToast()

  console.log("ReportDetailPage: installationData length:", installationData.length)
  console.log("ReportDetailPage: contextInstallationData length:", contextInstallationData?.length || 0)

  const totalSavings = summarizeAeratorSavings(aeratorData)
  const summaryTableData = getAeratorSummaryTable(aeratorData)

  const handleImageUpload = (newImage: ReportImage) => {
    updateReportData("images", [...images, newImage])
  }

  const handleImageDelete = (id: string) => {
    updateReportData(
      "images",
      images.filter((img) => img.id !== id),
    )
  }

  const findUnitColumn = (data: InstallationData[]): string | null => {
    if (!data || data.length === 0) return null

    const item = data[0]
    console.log("All column names for unit detection:", Object.keys(item))

    for (const key of Object.keys(item)) {
      if (key.toLowerCase().includes("unit")) {
        return key
      }
    }

    const unitKeywords = ["unit", "apt", "apartment", "room", "number"]
    for (const key of Object.keys(item)) {
      const keyLower = key.toLowerCase()
      for (const keyword of unitKeywords) {
        if (keyLower.includes(keyword)) {
          console.log(`Found column containing ${keyword}: ${key}`)
          return key
        }
      }
    }

    const firstKey = Object.keys(item)[0]
    console.log(`No unit column found, using first column as fallback: ${firstKey}`)
    return firstKey
  }

  const unitColumn = findUnitColumn([...installationData, ...additionalRows])

  // Function to get the appropriate "not accessed" message based on unit column name
  const getNotAccessedMessage = (): string => {
    if (!unitColumn) return "Unit not accessed."

    const columnLower = unitColumn.toLowerCase()
    if (columnLower.includes("apt") || columnLower.includes("apartment")) {
      return "Apt not accessed."
    }
    return "Unit not accessed."
  }

  const allData = useMemo(() => {
    // Combine original installation data with manually added rows
    const combined = [...installationData]
    additionalRows.forEach((addRow) => {
      const existingIndex = combined.findIndex((data) => data.Unit === addRow.Unit)
      if (existingIndex !== -1) {
        // Merge or replace existing row with additional row data
        combined[existingIndex] = { ...combined[existingIndex], ...addRow }
      } else {
        combined.push(addRow)
      }
    })

    // Only consolidate for the final report display (when isPreview is false)
    // Keep original data structure for editing mode
    const finalData = consolidateInstallationsByUnitV2(combined)

    // Sort the results
    return finalData.sort((a, b) => {
      const unitA = unitColumn ? a[unitColumn] : a.Unit
      const unitB = unitColumn ? b[unitColumn] : b.Unit

      const numA = Number.parseInt(unitA || "")
      const numB = Number.parseInt(unitB || "")

      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB
      }
      return String(unitA).localeCompare(String(unitB), undefined, { numeric: true, sensitivity: "base" })
    })
  }, [installationData, additionalRows, unitColumn, isPreview])

  console.log("Filtered data length:", allData.length)

  // Split data into pages
  const itemsPerPage = 10
  const dataPages = []
  for (let i = 0; i < allData.length; i += itemsPerPage) {
    dataPages.push(allData.slice(i, i + itemsPerPage))
  }

  // Check what columns to show - updated logic
  const hasKitchenAeratorData = allData.some((item) => {
    const value = item["Kitchen Aerator"]
    return value !== undefined && value !== null && value !== "" && value.trim() !== ""
  })

  const hasBathroomAeratorData = allData.some((item) => {
    const value = item["Bathroom aerator"]
    return value !== undefined && value !== null && value !== "" && value.trim() !== ""
  })

  // Updated shower data check to use the new function
  const hasShowerData = allData.some((item) => {
    const showerValue = item["Shower Head"]
    return showerValue !== undefined && showerValue !== null && showerValue !== "" && showerValue.trim() !== ""
  })

  const hasKitchenAerators = Boolean(hasKitchenAeratorData) || additionalRows.length > 0
  const hasBathroomAerators = Boolean(hasBathroomAeratorData) || additionalRows.length > 0
  const hasShowers = Boolean(hasShowerData) || additionalRows.length > 0
  const hasToilets = allData.some((item) => {
    const toiletColumn = Object.keys(item).find((key) => key.startsWith("Toilets Installed:"))
    return toiletColumn && item[toiletColumn] && item[toiletColumn] !== ""
  })
  const hasNotes = true // Always show notes column

  console.log("Detail: Column visibility:", {
    hasKitchenAeratorData,
    hasKitchenAerators,
    hasBathroomAeratorData,
    hasBathroomAerators,
    hasShowerData,
    hasShowers,
    hasToilets,
    hasNotes,
  })

  const handleNoteEdit = (unit: string, value: string) => {
    if (isEditable) {
      // Use unified notes system
      updateStoredNote(unit, value)

      // Also update local state for immediate UI update
      setEditedNotes((prev) => {
        const updated = { ...prev, [unit]: value }
        return updated
      })
    }
  }

  const handleInstallationEdit = useCallback(
    (unit: string, column: string, value: string) => {
      if (isEditable) {
        const isAdditionalRow = additionalRows.some((row) => {
          const rowUnit = unitColumn ? row[unitColumn] : row.Unit
          return rowUnit === unit
        })

        if (isAdditionalRow) {
          const updatedRows = additionalRows.map((row) => {
            const rowUnit = unitColumn ? row[unitColumn] : row.Unit
            if (rowUnit === unit) {
              const updatedRow = { ...row }
              updatedRow[column] = value
              return updatedRow
            }
            return row
          })
          setAdditionalRows(updatedRows)
          localStorage.setItem("additionalDetailRows", JSON.stringify(updatedRows))
        } else {
          setEditedInstallations((prev) => {
            const unitData = prev[unit] || {}
            const updated = {
              ...prev,
              [unit]: {
                ...unitData,
                [column]: value,
              },
            }
            localStorage.setItem("detailInstallations", JSON.stringify(updated))
            return updated
          })
        }

        // Update reportData's aeratorData to reflect changes for PDF generation
        setReportData((prev) => {
          const updatedAeratorData = prev.aeratorData.map((data) =>
            data.Unit === unit ? { ...data, [column]: value } : data,
          )
          // If the modified row was not originally in aeratorData, add it
          if (!updatedAeratorData.some((data) => data.Unit === unit)) {
            updatedAeratorData.push({
              ...allData.find((row) => row.Unit === unit),
              [column]: value,
            } as InstallationData)
          }
          return { ...prev, aeratorData: updatedAeratorData }
        })
      }
    },
    [additionalRows, setAdditionalRows, unitColumn, setEditedInstallations, setReportData, isEditable],
  )

  const handleUnitEdit = (originalUnit: string, newUnit: string) => {
    if (isEditable) {
      const isAdditionalRow = additionalRows.some((row) => {
        const rowUnit = unitColumn ? row[unitColumn] : row.Unit
        return rowUnit === originalUnit
      })

      if (isAdditionalRow) {
        const updatedRows = additionalRows.map((row) => {
          const rowUnit = unitColumn ? row[unitColumn] : row.Unit
          if (rowUnit === originalUnit) {
            const updatedRow = { ...row }
            if (unitColumn) {
              updatedRow[unitColumn] = newUnit
            }
            updatedRow.Unit = newUnit
            return updatedRow
          }
          return row
        })
        setAdditionalRows(updatedRows)
        localStorage.setItem("additionalDetailRows", JSON.stringify(updatedRows))

        // If this is a new unit being added and it has a note, ensure the note appears in the notes section
        if (newUnit && newUnit.trim() !== "" && originalUnit === "") {
          const storedNotes = getStoredNotes()
          if (storedNotes[newUnit]) {
            console.log("Unit added to details has a note, ensuring it appears in notes section:", newUnit)
            // The notes section will automatically pick this up through the unified notes system
            // Dispatch the event to notify the notes section
            window.dispatchEvent(new Event("unifiedNotesUpdated"))
          }
        }
      } else {
        if (newUnit === "") {
          setEditedUnits((prev) => {
            const updated = { ...prev, [originalUnit]: "" }
            localStorage.setItem("editedUnits", JSON.stringify(updated))
            return updated
          })
        } else {
          setEditedUnits((prev) => {
            const updated = { ...prev, [originalUnit]: newUnit }
            localStorage.setItem("editedUnits", JSON.stringify(updated))
            return updated
          })

          // If this is a new unit being added and it has a note, ensure the note appears in the notes section
          if (newUnit && newUnit.trim() !== "" && originalUnit === "") {
            const storedNotes = getStoredNotes()
            if (storedNotes[newUnit]) {
              console.log("Unit added to details has a note, ensuring it appears in notes section:", newUnit)
              // The notes section will automatically pick this up through the unified notes system
              // Dispatch event to notify notes section
              window.dispatchEvent(new Event("unifiedNotesUpdated"))
            }
          }
        }
      }
    }
  }

  const handleAddRow = useCallback(() => {
    if (isEditable) {
      console.log("Add Row clicked!")

      const newUnitNumber = `New Unit ${additionalRows.length + 1}`
      const newRow: InstallationData = {
        Unit: newUnitNumber,
        "Shower Head": "",
        "Bathroom aerator": "",
        "Kitchen Aerator": "",
        "Leak Issue Kitchen Faucet": "",
        "Leak Issue Bath Faucet": "",
        "Tub Spout/Diverter Leak Issue": "",
        Notes: "",
      }

      console.log("Creating new row:", newRow)

      const updatedRows = [newRow, ...additionalRows] // Add to beginning
      console.log("Updated additional rows:", updatedRows)

      setAdditionalRows(updatedRows)
      localStorage.setItem("additionalDetailRows", JSON.stringify(updatedRows))

      console.log("New row added successfully!")
      addToast("New row added. Remember to fill in the Unit number.", "info")
    }
  }, [additionalRows, setAdditionalRows, addToast, isEditable])

  const handleDeleteRow = useCallback(
    (unitToDelete: string) => {
      if (isEditable) {
        setAdditionalRows((prev) => prev.filter((row) => row.Unit !== unitToDelete))
        setInstallationData((prev) => prev.filter((row) => row.Unit !== unitToDelete)) // Also remove from original if it was there
        setReportData((prev) => ({
          ...prev,
          aeratorData: prev.aeratorData.filter((data) => data.Unit !== unitToDelete),
        }))
        addToast(`Row for Unit ${unitToDelete} deleted.`, "info")
      }
    },
    [setAdditionalRows, setInstallationData, setReportData, addToast, isEditable],
  )

  const headers = useMemo(() => {
    if (allData.length === 0) return []
    const allKeys = new Set<string>()
    allData.forEach((row) => {
      Object.keys(row).forEach((key) => allKeys.add(key))
    })
    // Define a preferred order for common columns
    const preferredOrder = [
      "Unit",
      "Bldg/Unit",
      "Shower Head",
      "Bathroom aerator",
      "Kitchen Aerator",
      "Leak Issue Kitchen Faucet",
      "Leak Issue Bath Faucet",
      "Tub Spout/Diverter Leak Issue",
      "Notes",
    ]
    const sortedHeaders = Array.from(allKeys).sort((a, b) => {
      const indexA = preferredOrder.indexOf(a)
      const indexB = preferredOrder.indexOf(b)

      if (indexA === -1 && indexB === -1) {
        return a.localeCompare(b) // Both not in preferred list, sort alphabetically
      }
      if (indexA === -1) {
        return 1 // a is not in preferred list, b is, so b comes first
      }
      if (indexB === -1) {
        return -1 // b is not in preferred list, a is, so a comes first
      }
      return indexA - indexB // Both in preferred list, sort by preferred order
    })
    return sortedHeaders
  }, [allData])

  useEffect(() => {
    try {
      // Load installation data from context if not already loaded
      if (installationData.length === 0 && contextInstallationData && contextInstallationData.length > 0) {
        console.log("ReportDetailPage: Loading installation data from context")
        setInstallationData(contextInstallationData)
      }
      
      const storedAdditionalRows = localStorage.getItem("additionalDetailRows")
      if (storedAdditionalRows) {
        setAdditionalRows(JSON.parse(storedAdditionalRows))
      }
      const storedInstallations = localStorage.getItem("detailInstallations")
      if (storedInstallations) {
        try {
          setEditedInstallations(JSON.parse(storedInstallations))
        } catch (error) {
          console.error("Error parsing stored installations:", error)
        }
      }

      const storedHeaders = localStorage.getItem("columnHeaders")
      if (storedHeaders) {
        try {
          setColumnHeaders(JSON.parse(storedHeaders))
        } catch (error) {
          console.error("Error parsing stored headers:", error)
        }
      }

      const storedUnits = localStorage.getItem("editedUnits")
      if (storedUnits) {
        try {
          setEditedUnits(JSON.parse(storedUnits))
        } catch (error) {
          console.error("Error parsing stored units:", error)
        }
      }
    } catch (error) {
      console.error("Error loading data from localStorage:", error)
    }
  }, [contextInstallationData, installationData.length])

  // Listen for unified notes updates
  useEffect(() => {
    const handleNotesUpdate = () => {
      console.log("Details: Received unified notes update event")
      // Force re-render by updating editedNotes state
      setEditedNotes((prev) => ({ ...prev }))
    }

    window.addEventListener("unifiedNotesUpdated", handleNotesUpdate)
    return () => window.removeEventListener("unifiedNotesUpdated", handleNotesUpdate)
  }, [])

const getExistingValue = (row: any, columnType: string) => {
  const value = row[columnType]
  if (!value || value === '0' || value === '') return ''
  
  // For existing values, show what was there before (typically higher GPM)
  if (columnType.toLowerCase().includes('kitchen') && columnType.toLowerCase().includes('aerator')) {
    return '2.2 GPM'
  }
  if (columnType.toLowerCase().includes('bathroom') && columnType.toLowerCase().includes('aerator')) {
    return '2.2 GPM'
  }
  if (columnType.toLowerCase().includes('shower')) {
    return '2.5 GPM'
  }
  return value
}

const getInstalledValue = (row: any, columnType: string) => {
  const value = row[columnType]
  if (!value || value === '0' || value === '') return 'No Touch'
  
  // Check if this is already a consolidated value with count
  if (typeof value === 'string' && value.includes('(') && value.includes(')')) {
    return value // Already formatted like "1.0 GPM (2)"
  }
  
  if (columnType.toLowerCase().includes('kitchen') && columnType.toLowerCase().includes('aerator')) {
    return '1.0 GPM'
  }
  if (columnType.toLowerCase().includes('bathroom') && columnType.toLowerCase().includes('aerator')) {
    return '1.0 GPM'
  }
  if (columnType.toLowerCase().includes('shower')) {
    return '1.75 GPM'
  }
  return value
}

  // Show a simple table with the installation data for now
  if (allData.length === 0) {
    return (
      <div className="print-section report-page min-h-[1056px] relative">
        <div className="mb-8">
          <img src="/images/greenlight-logo.png" alt="GreenLight Logo" className="h-24" crossOrigin="anonymous" />
        </div>
        <div className="mb-16">
          <h2 className="text-xl font-bold mb-6">
            {isEditable ? (
              <EditableText
                value={reportData.sections.detailPage.title}
                onChange={(value) => updateSectionTitle("detailPage", value)}
                placeholder="Section Title"
                className="text-xl font-bold"
              />
            ) : (
              reportData.sections.detailPage.title
            )}
          </h2>
          <p className="text-gray-600">No installation data available. Please upload an Excel file first.</p>
        </div>
        <div className="footer-container">
          <img
            src="/images/greenlight-footer.png"
            alt="GreenLight Footer"
            className="w-full h-auto"
            crossOrigin="anonymous"
          />
        </div>
      </div>
    )
  }

  return isPreview ? (
    <div className="print-section report-page min-h-[1056px] relative">
      <div className="mb-8">
        <img src="/images/greenlight-logo.png" alt="GreenLight Logo" className="h-24" crossOrigin="anonymous" />
      </div>

      <div className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">
            {isEditable ? (
              <EditableText
                value={reportData.sections.detailPage.title}
                onChange={(value) => updateSectionTitle("detailPage", value)}
                placeholder="Section Title"
                className="text-xl font-bold"
              />
            ) : (
              reportData.sections.detailPage.title
            )}
          </h2>
          {isEditable && (
            <Button onClick={handleAddRow} size="sm" className="flex items-center gap-2 no-print">
              <Plus className="h-4 w-4" />
              Add Row
            </Button>
          )}
        </div>

        <div className="mb-6 overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Existing Kitchen Aerator</TableHead>
                <TableHead>Installed Kitchen Aerator</TableHead>
                <TableHead>Existing Bathroom Aerator</TableHead>
                <TableHead>Installed Bathroom Aerator</TableHead>
                <TableHead>Existing Shower</TableHead>
                <TableHead>Installed Shower</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allData.slice(0, 20).map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  <TableCell>{row.Unit || row[unitColumn] || ""}</TableCell>
                  <TableCell>{getExistingValue(row, "Kitchen Aerator")}</TableCell>
                  <TableCell>{getInstalledValue(row, "Kitchen Aerator")}</TableCell>
                  <TableCell>{getExistingValue(row, "Bathroom aerator")}</TableCell>
                  <TableCell>{getInstalledValue(row, "Bathroom aerator")}</TableCell>
                  <TableCell>{getExistingValue(row, "Shower Head")}</TableCell>
                  <TableCell>{getInstalledValue(row, "Shower Head")}</TableCell>
                  <TableCell>{row.Notes || ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <p className="mb-6 text-sm text-gray-600">
          Showing {Math.min(20, allData.length)} of {allData.length} total units
        </p>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => (
            <div key={image.id} className="relative rounded-md border p-2">
              <Image
                src={image.src || "/placeholder.svg"}
                alt={image.alt}
                width={300}
                height={200}
                layout="responsive"
                objectFit="contain"
                className="h-48 w-full rounded-md"
              />
              <EditableText
                as="p"
                className="mt-2 text-center text-sm text-gray-600"
                value={image.alt}
                onChange={(newAlt) =>
                  updateReportData(
                    "images",
                    images.map((img) => (img.id === image.id ? { ...img, alt: newAlt } : img)),
                  )
                }
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute right-2 top-2 h-6 w-6 rounded-full no-print"
                onClick={() => handleImageDelete(image.id)}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="no-print">
          <ImageUploader />
        </div>
      </div>

      <div className="footer-container">
        <img
          src="/images/greenlight-footer.png"
          alt="GreenLight Footer"
          className="w-full h-auto"
          crossOrigin="anonymous"
        />
      </div>
    </div>
  ) : (
    // PDF/Print mode - same structure but without editing capabilities
    <>
      {dataPages.map((pageData, pageIndex) => (
        <div key={pageIndex} className="print-section report-page min-h-[1056px] relative">
          <div className="mb-8">
            <img
              src="/images/greenlight-logo.png"
              alt="GreenLight Logo"
              className="h-24"
              crossOrigin="anonymous"
            />
          </div>

          <div className="mb-16">
            <h2 className="text-xl font-bold mb-6">{reportData.sections.detailPage.title}</h2>

            <div className="mb-6 overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit</TableHead>
                    <TableHead>Existing Kitchen Aerator</TableHead>
                    <TableHead>Installed Kitchen Aerator</TableHead>
                    <TableHead>Existing Bathroom Aerator</TableHead>
                    <TableHead>Installed Bathroom Aerator</TableHead>
                    <TableHead>Existing Shower</TableHead>
                    <TableHead>Installed Shower</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageData.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      <TableCell>{row.Unit || row[unitColumn] || ""}</TableCell>
                      <TableCell>{getExistingValue(row, "Kitchen Aerator")}</TableCell>
                      <TableCell>{getInstalledValue(row, "Kitchen Aerator")}</TableCell>
                      <TableCell>{getExistingValue(row, "Bathroom aerator")}</TableCell>
                      <TableCell>{getInstalledValue(row, "Bathroom aerator")}</TableCell>
                      <TableCell>{getExistingValue(row, "Shower Head")}</TableCell>
                      <TableCell>{getInstalledValue(row, "Shower Head")}</TableCell>
                      <TableCell>{row.Notes || ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {images.map((image) => (
                <div key={image.id} className="relative rounded-md border p-2">
                  <Image
                    src={image.src || "/placeholder.svg"}
                    alt={image.alt}
                    width={300}
                    height={200}
                    layout="responsive"
                    objectFit="contain"
                    className="h-48 w-full rounded-md"
                  />
                  <p className="mt-2 text-center text-sm text-gray-600">{image.alt}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="footer-container">
            <img
              src="/images/greenlight-footer.png"
              alt="GreenLight Footer"
              className="w-full h-auto"
              crossOrigin="anonymous"
            />
          </div>

          <div className="absolute top-4 right-4 text-sm">Page {7 + pageIndex} of 21</div>
        </div>
      ))}
    </>
  )
}

// Add default export
export default ReportDetailPage

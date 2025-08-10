import type { AeratorData } from "@/lib/types"

export const calculateAeratorSavings = (data: AeratorData[]) => {
  return data.map((item) => {
    const currentGPM = Number.parseFloat(item["Current GPM"]) || 0
    const newGPM = Number.parseFloat(item["New GPM"]) || 0
    const quantity = Number.parseInt(item.Quantity) || 0

    const savings = (currentGPM - newGPM) * quantity
    return {
      ...item,
      "Water Savings (GPM)": savings,
    }
  })
}

export const summarizeAeratorSavings = (data: AeratorData[]) => {
  const totalSavings = data.reduce(
    (sum, item) => sum + (Number.parseFloat(item["Water Savings (GPM)"] as string) || 0),
    0,
  )
  return totalSavings
}

export const getAeratorSummaryTable = (data: AeratorData[]) => {
  const summary: { [key: string]: { current: number; new: number; quantity: number; savings: number } } = {}

  data.forEach((item) => {
    const type = item["Aerator Type"]
    const currentGPM = Number.parseFloat(item["Current GPM"]) || 0
    const newGPM = Number.parseFloat(item["New GPM"]) || 0
    const quantity = Number.parseInt(item.Quantity) || 0
    const savings = (currentGPM - newGPM) * quantity

    if (!summary[type]) {
      summary[type] = { current: 0, new: 0, quantity: 0, savings: 0 }
    }
    summary[type].current += currentGPM * quantity
    summary[type].new += newGPM * quantity
    summary[type].quantity += quantity
    summary[type].savings += savings
  })

  return Object.entries(summary).map(([type, values]) => ({
    "Aerator Type": type,
    "Total Current GPM": values.current.toFixed(2),
    "Total New GPM": values.new.toFixed(2),
    "Total Quantity": values.quantity,
    "Total Water Savings (GPM)": values.savings.toFixed(2),
  }))
}

export function formatNote(note: string): string {
  // Capitalize the first letter of the note
  if (!note) return ""
  return note.charAt(0).toUpperCase() + note.slice(1)
}

// Helper function to detect installation columns dynamically
const detectInstallationColumns = (data: any[]) => {
  if (!data || data.length === 0) return []

  const sampleItem = data[0]
  const installationColumns: string[] = []

  // Look for common installation column patterns
  const patterns = [
    /kitchen.*aerator/i,
    /bathroom.*aerator/i,
    /bath.*aerator/i,
    /shower.*head/i,
    /shower/i,
    /toilet/i,
    /faucet/i,
    /installed/i,
  ]

  Object.keys(sampleItem).forEach((key) => {
    if (patterns.some((pattern) => pattern.test(key))) {
      installationColumns.push(key)
    }
  })

  return installationColumns
}

// Helper function to get the base value for an installation type
const getBaseValue = (columnName: string, value: any) => {
  if (!value || value === "0" || value === "") return null

  const columnLower = columnName.toLowerCase()
  if (columnLower.includes("kitchen") && columnLower.includes("aerator")) {
    return "1.0 GPM"
  }
  if (columnLower.includes("bathroom") && columnLower.includes("aerator")) {
    return "1.0 GPM"
  }
  if (columnLower.includes("shower")) {
    return "1.75 GPM"
  }
  if (columnLower.includes("toilet")) {
    return "Toilet"
  }

  return "1"
}

export function getAeratorDescription(columnName: string, value: any): string {
  if (!value || value === "0" || value === "") return ""

  // If the value already contains GPM or other units, use it as is
  if (typeof value === "string" && (value.includes("GPM") || value.includes("Touch"))) {
    return value
  }

  // Default values based on column type
  const columnLower = columnName.toLowerCase()
  if (columnLower.includes("kitchen") && columnLower.includes("aerator")) {
    return "1.0 GPM Kitchen Aerator"
  }
  if (columnLower.includes("bathroom") && columnLower.includes("aerator")) {
    return "1.0 GPM Bathroom Aerator"
  }
  if (columnLower.includes("shower")) {
    return "1.75 GPM Shower Head"
  }
  if (columnLower.includes("toilet")) {
    return "Toilet Replacement"
  }

  // If we can't determine the type, use the original value
  return value.toString()
}

export const consolidateInstallationsByUnitV2 = (data: any[]) => {
  if (!data || data.length === 0) return []

  // Find the unit column dynamically
  const findUnitColumn = (item: any): string => {
    const unitKeywords = ["unit", "apt", "apartment", "room", "bldg/unit"]

    // First, look for exact matches
    for (const key of Object.keys(item)) {
      if (unitKeywords.some((keyword) => key.toLowerCase() === keyword)) {
        return key
      }
    }

    // Then look for partial matches
    for (const key of Object.keys(item)) {
      if (unitKeywords.some((keyword) => key.toLowerCase().includes(keyword))) {
        return key
      }
    }

    // Fallback to first column
    return Object.keys(item)[0]
  }

  const unitColumn = findUnitColumn(data[0])
  const installationColumns = detectInstallationColumns(data)

  const consolidated: { [key: string]: any } = {}

  data.forEach((item) => {
    const unit = item[unitColumn] || "Unknown"

    if (!consolidated[unit]) {
      consolidated[unit] = {
        [unitColumn]: unit,
        ...installationColumns.reduce((acc, col) => {
          acc[col] = 0
          return acc
        }, {} as any),
        Notes: [],
        // Keep other non-installation fields from the first occurrence
        ...Object.keys(item).reduce((acc, key) => {
          if (key !== unitColumn && !installationColumns.includes(key) && key !== "Notes") {
            acc[key] = item[key]
          }
          return acc
        }, {} as any),
      }
    }

    // Count installations for each column
    installationColumns.forEach((col) => {
      const value = item[col]
      if (value && value !== "0" && value !== "" && value.toString().trim() !== "") {
        consolidated[unit][col]++
      }
    })

    // Collect notes
    if (item.Notes && item.Notes.trim() !== "") {
      consolidated[unit].Notes.push(item.Notes.trim())
    }
  })

  // Format the consolidated data with proper display values
  return Object.values(consolidated)
    .map((unit: any) => {
      const formattedUnit = { ...unit }

      installationColumns.forEach((col) => {
        const count = unit[col]
        if (count === 0) {
          formattedUnit[col] = ""
        } else if (count === 1) {
          // For single installations, just show the base value without count
          const baseValue = getBaseValue(col, "1")
          formattedUnit[col] = baseValue
        } else {
          // For multiple installations, show base value with count
          const baseValue = getBaseValue(col, "1")
          formattedUnit[col] = `${baseValue} (${count})`
        }
      })

      // Join notes
      formattedUnit.Notes = unit.Notes.join("; ")

      return formattedUnit
    })
    .sort((a, b) => {
      const unitA = a[unitColumn]
      const unitB = b[unitColumn]

      // Try numeric sort first
      const numA = Number.parseInt(unitA) || 0
      const numB = Number.parseInt(unitB) || 0

      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB
      }

      // Fallback to string sort
      return String(unitA).localeCompare(String(unitB), undefined, {
        numeric: true,
        sensitivity: "base",
      })
    })
}

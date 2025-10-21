import { SxProps, Theme } from '@mui/material'
import { Severity } from '../types'

// Severity ordering
export const SEVERITY_ORDER = [
  Severity.INFO, 
  Severity.WARNING, 
  Severity.ERROR, 
  Severity.CRITICAL, 
  Severity.DEBUG
]

// Sort items by severity
export const sortBySeverity = <T extends { label: string }>(items: T[]): T[] =>
    items.sort((a, b) => SEVERITY_ORDER.indexOf(a.label as Severity) - SEVERITY_ORDER.indexOf(b.label as Severity))

// Severity color mapping
export const SEVERITY_COLORS: Record<Severity, string> = {
  [Severity.DEBUG]: 'rgba(156, 39, 176, 0.8)',     // Purple
  [Severity.INFO]: 'rgba(33, 150, 243, 0.8)',      // Blue
  [Severity.WARNING]: 'rgba(255, 193, 7, 0.8)',    // Yellow/Amber
  [Severity.ERROR]: 'rgba(244, 67, 54, 0.8)',      // Red
  [Severity.CRITICAL]: 'rgba(183, 28, 28, 0.8)',   // Dark Red
}

/**
 * Get chip styling for severity badges
 * @param severity - The severity level
 * @returns SxProps for MUI Chip component
 */
export const getSeverityChipStyle = (severity: Severity): SxProps<Theme> => ({
  backgroundColor: SEVERITY_COLORS[severity],
  color: '#fff',
  fontWeight: 500,
})

/**
 * Get chart colors based on severity labels
 * @param labels - Array of severity labels from chart data
 * @returns Array of colors matching the severity order
 */
export const getSeverityColors = (labels: string[]): string[] => {
  return labels.map(label => {
    const severity = label.toUpperCase() as Severity
    return SEVERITY_COLORS[severity] || 'rgba(158, 158, 158, 0.8)' // Gray fallback
  })
}

// Auth pages (Login/Register) styles
export const authContainerBox: SxProps<Theme> = {
  marginTop: 8,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
}

export const authPaper: SxProps<Theme> = {
  p: 4,
  width: '100%',
}

export const authFormBox: SxProps<Theme> = {
  mt: 3,
}

export const authSubmitButton: SxProps<Theme> = {
  mt: 3,
  mb: 2,
}

export const errorAlert: SxProps<Theme> = {
  mt: 2,
}

// Navigation active state
export const getNavButtonStyle = (isActive: boolean): SxProps<Theme> => ({
  backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
})

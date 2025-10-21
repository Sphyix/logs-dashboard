import { SxProps, Theme } from '@mui/material'

/**
 * Common style constants to reduce repetition across components
 */

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

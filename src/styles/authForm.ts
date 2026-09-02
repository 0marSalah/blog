import type { SxProps, Theme } from '@mui/material/styles'

export const authPageSx: SxProps<Theme> = {
  minHeight: '100svh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export const authCardSx: SxProps<Theme> = {
  width: 360,
  maxWidth: '100%',
  padding: 4,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
}

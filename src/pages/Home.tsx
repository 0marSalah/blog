import { Navigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useAuth } from '../hooks/useAuth'

export function Home() {
  const { did, signOut } = useAuth()

  if (!did) {
    return <Navigate to="/signin" replace />
  }

  return (
    <Box sx={{ padding: 4 }}>
      <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Typography variant="h5" component="h1">
          Signed in
        </Typography>
        <Typography variant="body1">{did}</Typography>
        <Button variant="outlined" onClick={signOut}>
          Sign out
        </Button>
      </Stack>
    </Box>
  )
}

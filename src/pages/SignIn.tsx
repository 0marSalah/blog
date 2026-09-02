import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useAuth } from '../hooks/useAuth'
import { authCardSx, authPageSx } from '../styles/authForm'

export function SignIn() {
  const [did, setDid] = useState('')
  const { signIn } = useAuth()
  const navigate = useNavigate()

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    signIn(did)
    navigate('/')
  }

  return (
    <Box sx={authPageSx}>
      <Paper component="form" onSubmit={handleSubmit} sx={authCardSx}>
        <Typography variant="h5" component="h1">
          Sign in
        </Typography>
        <TextField
          label="DID"
          placeholder="did:key:z..."
          value={did}
          onChange={(event) => setDid(event.target.value)}
          required
          fullWidth
        />
        <Button type="submit" variant="contained">
          Sign in
        </Button>
        <Typography variant="body2">
          No identity yet?{' '}
          <Link component={RouterLink} to="/signup">
            Sign up
          </Link>
        </Typography>
      </Paper>
    </Box>
  )
}

import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Ed25519VerificationKey } from '@interop/ed25519-verification-key'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useAuth } from '../hooks/useAuth'
import { authCardSx, authPageSx } from '../styles/authForm'

export function SignUp() {
  const [did, setDid] = useState('')
  const [copied, setCopied] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  async function handleGenerate() {
    const keyPair = await Ed25519VerificationKey.generate()
    const generatedDid = `did:key:${keyPair.fingerprint()}`
    setDid(generatedDid)
    await navigator.clipboard.writeText(generatedDid)
    setCopied(true)
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    signUp(did)
    navigate('/')
  }

  return (
    <Box sx={authPageSx}>
      <Paper component="form" onSubmit={handleSubmit} sx={authCardSx}>
        <Typography variant="h5" component="h1">
          Sign up
        </Typography>
        <Stack direction="row" spacing={1}>
          <TextField
            label="DID"
            placeholder="did:key:z..."
            value={did}
            onChange={(event) => setDid(event.target.value)}
            required
            fullWidth
          />
          <Button variant="outlined" onClick={handleGenerate}>
            Generate
          </Button>
        </Stack>
        <Button type="submit" variant="contained">
          Sign up
        </Button>
        <Typography variant="body2">
          Already have an identity?{' '}
          <Link component={RouterLink} to="/signin">
            Sign in
          </Link>
        </Typography>
      </Paper>
      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="DID copied to clipboard"
      />
    </Box>
  )
}

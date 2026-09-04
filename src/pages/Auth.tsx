import { useState } from 'react'
import { registerAuthor, loginAuthor, type AuthorSession } from '../lib/authIdentity'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

/**
 * The auth screen: one passphrase field, a Register/Login switch, and
 * nothing else. See `lib/authIdentity.ts` and ARCHITECTURE.md's Phase 2 for
 * what actually happens behind the one button.
 */
export function Auth({
  onAuthenticated,
}: {
  onAuthenticated: (session: AuthorSession) => void
}) {
  const [mode, setMode] = useState<'register' | 'login'>('register')
  const [passphrase, setPassphrase] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      if (mode === 'register') {
        const session = await registerAuthor({ passphrase })
        // WAS does not auto-create parents, so `posts` has to exist before
        // the first publish -- do it once, right after registering. Also
        // make it world-readable: writes still need the author's capability,
        // but any visitor's plain GET should work with no signing at all.
        const posts = await session.client.space(session.spaceId).createCollection({ id: 'posts' })
        await posts.setPublic()
        onAuthenticated(session)
      } else {
        const session = await loginAuthor({ passphrase })
        if (!session) {
          setError('No account is registered for that passphrase.')
          return
        }
        onAuthenticated(session)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ paddingY: 4 }}>
      <Paper
        component="form"
        onSubmit={handleSubmit}
        sx={{ padding: 3, display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <Typography variant="h4" component="h1">
          {mode === 'register' ? 'Register' : 'Login'}
        </Typography>
        <TextField
          label="Passphrase"
          type="password"
          value={passphrase}
          onChange={(event) => setPassphrase(event.target.value)}
          required
          fullWidth
        />
        {error && <Alert severity="error">{error}</Alert>}
        <Button type="submit" variant="contained" disabled={pending || !passphrase}>
          {mode === 'register' ? 'Register' : 'Login'}
        </Button>
        <Typography variant="body2">
          {mode === 'register' ? 'Already have an account? ' : "Don't have an account? "}
          <Link
            component="button"
            type="button"
            onClick={() => setMode(mode === 'register' ? 'login' : 'register')}
          >
            {mode === 'register' ? 'Login' : 'Register'}
          </Link>
        </Typography>
      </Paper>
    </Container>
  )
}

import { useLogin } from '@interop/was-react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'

/**
 * The auth screen. One button. `useLogin()` runs the real App Connect
 * flow -- one CHAPI popup that proves DID Authentication and gets a
 * wallet-delegated capability on the `posts` collection, via an
 * app-specific key the wallet mints. No passphrase, no separate register
 * step: the first connection *is* the account.
 */
export function Auth() {
  const { login, authenticating, error } = useLogin()

  return (
    <Container maxWidth="sm" sx={{ paddingY: 4 }}>
      <Paper sx={{ padding: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h4" component="h1">
          Blog
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Connect your wallet to publish.
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
        <Button variant="contained" onClick={() => void login()} disabled={authenticating}>
          {authenticating ? 'Connecting your wallet...' : 'Login with wallet'}
        </Button>
      </Paper>
    </Container>
  )
}

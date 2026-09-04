import { useSession } from '@interop/was-react'
import { Auth } from './pages/Auth'
import { Home } from './pages/Home'

/**
 * Switches between the auth screen and the protected home screen based on
 * `useSession().status` -- the four-state machine `was-react` owns
 * (`boot` | `local` | `connected` | `reconnect`). Doing this by hand rather
 * than the library's own `<ProtectedRoute>` (from `@interop/was-react/mui`)
 * since that one expects `react-router`, which this app doesn't have.
 */
export function WasConnection() {
  const { status } = useSession()

  if (status === 'boot') {
    return null
  }

  if (status !== 'connected') {
    return <Auth />
  }

  return <Home />
}

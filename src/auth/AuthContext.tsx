import { useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type AuthContextValue } from './context'

const SESSION_KEY = 'blog.session.did'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [did, setDid] = useState<string | null>(() =>
    sessionStorage.getItem(SESSION_KEY),
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      did,
      signIn: (nextDid: string) => {
        sessionStorage.setItem(SESSION_KEY, nextDid)
        setDid(nextDid)
      },
      signUp: (nextDid: string) => {
        sessionStorage.setItem(SESSION_KEY, nextDid)
        setDid(nextDid)
      },
      signOut: () => {
        sessionStorage.removeItem(SESSION_KEY)
        setDid(null)
      },
    }),
    [did],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

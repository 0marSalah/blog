import { createContext } from 'react'

export interface AuthContextValue {
  did: string | null
  signIn: (did: string) => void
  signUp: (did: string) => void
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

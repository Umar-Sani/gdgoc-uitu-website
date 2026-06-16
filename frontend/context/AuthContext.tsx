'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { MOCK_ENABLED, ACTIVE_MOCK_USER } from '@/lib/mockAuth'
import type { User } from '@shared/types'

type AuthContextType = {
  user: User | null
  loading: boolean
  token: string | null
  signOut: () => Promise<void>
  refreshUser: (overrideToken?: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  token: null,
  signOut: async () => {},
  refreshUser: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(
    MOCK_ENABLED ? ACTIVE_MOCK_USER : null
  )
  const [token, setToken] = useState<string | null>(
    MOCK_ENABLED ? 'mock-token' : null
  )
  const [loading, setLoading] = useState(!MOCK_ENABLED)

  useEffect(() => {
    if (MOCK_ENABLED) return

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setToken(session.access_token)
        await fetchUserProfile(session.user.id, session.access_token)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: any, session: any) => {
        if (session) {
          setToken(session.access_token)
          await fetchUserProfile(session.user.id, session.access_token)
        } else {
          setUser(null)
          setToken(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string, accessToken: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/me`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      if (res.ok) {
        const json = await res.json()
        if (!json.data?.is_active) {
          await supabase.auth.signOut()
          setUser(null)
          setToken(null)
          return
        }
        setUser(json.data)
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err)
    }
  }

  const signOut = async () => {
    if (!MOCK_ENABLED) await supabase.auth.signOut()
    setUser(null)
    setToken(null)
  }

  const refreshUser = async (overrideToken?: string) => {
    const t = overrideToken ?? token
    if (!t) return
    await fetchUserProfile('', t)
  }

  return (
    <AuthContext.Provider value={{ user, loading, token, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
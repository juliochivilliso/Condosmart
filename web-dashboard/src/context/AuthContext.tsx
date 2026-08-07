import { createContext, useContext, useEffect, useState, useCallback } from "react"
import type { ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"

export type UserRole = 'super_admin' | 'admin_condominio' | 'inquilino' | 'tecnico'

export type UserProfile = {
  id: string
  email: string
  nombre_completo: string
  rol: UserRole
  condominio_id: string | null
  condominio_nombre: string | null
}

type AuthContextValue = {
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>")
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchFullProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, email, nombre_completo, rol, condominio_id, condominios(nombre)')
        .eq('id', userId)
        .single()

      if (error || !data) {
        console.error("Error fetching profile:", error)
        setProfile(null)
      } else {
        setProfile({
          id: data.id,
          email: data.email,
          nombre_completo: data.nombre_completo,
          rol: data.rol as UserRole,
          condominio_id: data.condominio_id,
          condominio_nombre: (data.condominios as any)?.nombre || null
        })
      }
    } catch (err) {
      console.error("Auth process error:", err)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // 1. Verificar sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchFullProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // 2. Escuchar cambios
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchFullProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchFullProfile])

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    navigate('/login', { replace: true })
  }

  return (
    <AuthContext.Provider value={{ profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

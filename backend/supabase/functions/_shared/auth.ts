// _shared/auth.ts
// Helpers de autenticación y autorización compartidos para Edge Functions de Supabase.
//
// El gateway de Supabase valida la firma JWT por defecto (verify_jwt=true), por lo que
// cualquier request que llegue aquí ya tiene un token firmado válido. Este módulo
// decodifica el payload para determinar el rol (service_role vs usuario autenticado)
// y devuelve un cliente Supabase con el token del llamante para que RLS aplique.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

export interface AuthResult {
  role: string
  userId: string | null
  condominioId: string | null
  supabase: ReturnType<typeof createClient>
}

export function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.')
  if (parts.length !== 3) return {}
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=')
    return JSON.parse(atob(padded))
  } catch {
    return {}
  }
}

/**
 * Extrae el token Bearer del header Authorization.
 */
export function getToken(req: Request): string {
  const auth = req.headers.get('Authorization') ?? ''
  return auth.replace(/^Bearer\s+/i, '').trim()
}

/**
 * Autentica la request. Devuelve el rol, el usuario (si aplica) y un cliente Supabase
 * configurado con el token del llamante para que RLS se aplique.
 */
export async function authenticate(req: Request): Promise<AuthResult> {
  const token = getToken(req)
  if (!token) {
    throw new AuthError('Missing authorization header', 401)
  }

  const payload = decodeJwtPayload(token)
  const role = (payload.role as string) ?? 'anon'

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  return {
    role,
    userId: (payload.sub as string) ?? null,
    condominioId: (payload.condominio_id as string) ?? null,
    supabase,
  }
}

/**
 * Exige que la request provenga de un proceso de sistema (service_role / cron).
 */
export async function requireServiceRole(req: Request): Promise<AuthResult> {
  const auth = await authenticate(req)
  if (auth.role !== 'service_role') {
    throw new AuthError('Forbidden: se requiere service role', 403)
  }
  return auth
}

/**
 * Exige un usuario autenticado. Opcionalmente valida que sea super_admin o
 * admin del condominio indicado.
 */
export async function requireUser(req: Request, condominioId?: string): Promise<AuthResult> {
  const auth = await authenticate(req)
  if (!auth.userId || (auth.role !== 'authenticated' && auth.role !== 'service_role')) {
    throw new AuthError('Forbidden: usuario autenticado requerido', 401)
  }

  if (condominioId) {
    // Verificar el rol del usuario en la tabla usuarios (via RLS del token)
    const { data: profile, error } = await auth.supabase
      .from('usuarios')
      .select('rol, condominio_id')
      .eq('id', auth.userId)
      .maybeSingle()

    if (error || !profile) {
      throw new AuthError('Forbidden: perfil de usuario no encontrado', 403)
    }

    const isAdmin = profile.rol === 'super_admin' || profile.rol === 'admin_condominio'
    const isSameCondominio = profile.condominio_id === condominioId
    if (!isAdmin || !isSameCondominio) {
      throw new AuthError('Forbidden: sin acceso a este condominio', 403)
    }
  }

  return auth
}

export class AuthError extends Error {
  status: number
  constructor(message: string, status = 401) {
    super(message)
    this.status = status
  }
}

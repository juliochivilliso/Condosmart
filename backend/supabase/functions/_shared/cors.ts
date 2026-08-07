// _shared/cors.ts
// CORS restringido a dominios conocidos de CondoSmart.
// Nunca usa wildcard: devuelve el origen solo si está en la whitelist.

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:4173',
  'https://admin.condosmart.do',
  'https://app.condosmart.do',
  'https://condosmart.do',
  'https://www.condosmart.do',
  'https://condosmart.vercel.app',
]

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Vary': 'Origin',
  }
}

export function corsResponse(): Response {
  return new Response('ok', { status: 204 })
}

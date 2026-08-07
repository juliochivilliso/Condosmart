import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Mapeo de categorías CondoSmart -> FixSeek (Firestore service_categories.name)
const CATEGORIA_MAP: Record<string, string> = {
  'plomería': 'Plomería',
  'plomeria': 'Plomería',
  'fontaneria': 'Plomería',
  'electricidad': 'Electricidad',
  'pintura': 'Pintura',
  'carpintería': 'Carpintería',
  'carpinteria': 'Carpintería',
  'jardinería': 'Jardinería',
  'jardineria': 'Jardinería',
  'limpieza': 'Limpieza',
  'cerrajeria': 'Cerrajería',
  'climatizacion': 'Aire Acondicionado',
  'aire acondicionado': 'Aire Acondicionado',
  'albañilería': 'Albañilería',
  'albanileria': 'Albañilería',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { ticket_id, shared_secret } = await req.json()

    // Validar secreto compartido
    if (!shared_secret || shared_secret !== Deno.env.get('BRIDGE_SHARED_SECRET')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!ticket_id) {
      return new Response(
        JSON.stringify({ error: 'ticket_id es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Leer el ticket
    const { data: ticket, error: tErr } = await supabase
      .from('tickets_tecnicos')
      .select('id, condominio_id, unidad_id, categoria, titulo, descripcion, estado, fixseek_request_id, unidades(condominios(nombre))')
      .eq('id', ticket_id)
      .maybeSingle()

    if (tErr) throw tErr
    if (!ticket) {
      return new Response(
        JSON.stringify({ error: 'Ticket no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Si ya tiene request de FixSeek, no duplicar
    if (ticket.fixseek_request_id) {
      return new Response(
        JSON.stringify({ message: 'Ticket ya vinculado a FixSeek', fixseek_request_id: ticket.fixseek_request_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Mapear categoría
    const fixseekCategory = CATEGORIA_MAP[(ticket.categoria || '').toLowerCase()] ?? null
    if (!fixseekCategory) {
      return new Response(
        JSON.stringify({ error: `Categoría "${ticket.categoria}" no tiene equivalente en FixSeek` }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const condominioNombre = ticket.unidades?.condominios?.nombre ?? 'Condominio CondoSmart'

    // 4. Llamar a la Cloud Function HTTP de FixSeek
    const fixseekUrl = Deno.env.get('FIXSEEK_CLOUD_FUNCTION_URL') ?? ''
    if (!fixseekUrl) {
      return new Response(
        JSON.stringify({ error: 'FIXSEEK_CLOUD_FUNCTION_URL no configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fixseekRes = await fetch(fixseekUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'condosmart_web',
        externalId: ticket.id,
        category: fixseekCategory,
        title: ticket.titulo,
        description: ticket.descripcion,
        location: condominioNombre,
        urgency: 'normal',
        shared_secret,
      }),
    })

    const fixseekBody = await fixseekRes.json().catch(() => ({}))
    if (!fixseekRes.ok) {
      return new Response(
        JSON.stringify({ error: `FixSeek respondió ${fixseekRes.status}: ${fixseekBody.error ?? fixseekRes.statusText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const requestId = fixseekBody.requestId
    if (!requestId) {
      return new Response(
        JSON.stringify({ error: 'FixSeek no devolvió requestId' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Vincular el ticket con el request de FixSeek y marcar como asignado
    const { error: uErr } = await supabase
      .from('tickets_tecnicos')
      .update({
        fixseek_request_id: requestId,
        estado: 'asignado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticket.id)

    if (uErr) throw uErr

    return new Response(
      JSON.stringify({ message: 'Ticket enviado a FixSeek', fixseek_request_id: requestId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

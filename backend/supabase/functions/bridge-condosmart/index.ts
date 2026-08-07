import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Endpoint server-to-server: lo invoca la Cloud Function de FixSeek.
// No requiere CORS para navegador.

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const { externalId, status, professionalName, estimatedCost, shared_secret } = body

    // Validar secreto compartido
    if (!shared_secret || shared_secret !== Deno.env.get('BRIDGE_SHARED_SECRET')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    if (!externalId || !status) {
      return new Response(
        JSON.stringify({ error: 'externalId y status son requeridos' }),
        { status: 400 }
      )
    }

    // 1. Buscar el ticket por fixseek_request_id (o por id si es UUID válido)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(externalId)

    let query = supabase.from('tickets_tecnicos').select('id, estado, fixseek_request_id')
    if (isUuid) {
      query = query.or(`id.eq.${externalId},fixseek_request_id.eq.${externalId}`)
    } else {
      query = query.eq('fixseek_request_id', externalId)
    }
    const { data: ticket, error: tErr } = await query.maybeSingle()

    if (tErr) throw tErr
    if (!ticket) {
      return new Response(JSON.stringify({ error: 'Ticket no encontrado' }), { status: 404 })
    }

    // 2. Actualizar estado (y datos del profesional si vienen)
    const update: Record<string, unknown> = {
      estado: status,
      updated_at: new Date().toISOString(),
    }

    if (professionalName) {
      update.fixseek_profesional_nombre = professionalName
    }
    if (estimatedCost !== undefined && estimatedCost !== null) {
      update.costo_estimado = Number(estimatedCost)
    }

    const { error: uErr } = await supabase
      .from('tickets_tecnicos')
      .update(update)
      .eq('id', ticket.id)

    if (uErr) throw uErr

    // 3. El trigger trg_ticket_fixseek_update se encarga de las notificaciones.
    return new Response(JSON.stringify({ message: 'Ticket actualizado', id: ticket.id }), { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})

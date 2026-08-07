import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { requireServiceRole } from "../_shared/auth.ts"
import { getCorsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(req) })

  try {
    // Solo procesos de sistema (cron) pueden invocar esta función.
    await requireServiceRole(req)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const hoy = new Date().toISOString().split('T')[0]

    // 1. Buscar transacciones vencidas o por vencer (últimos 90 días para evitar spam masivo)
    const { data: pendientes, error: pErr } = await supabase
      .from('transacciones')
      .select('id, concepto, monto, unidad_id, unidades(usuario_id)')
      .eq('estado', 'pendiente')
      .lte('fecha_vencimiento', hoy)
      .gte('fecha_vencimiento', new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0])
      .limit(500)

    if (pErr) throw pErr

    const logs = []

    for (const tx of pendientes) {
      const usuarioId = tx.unidades?.usuario_id
      if (usuarioId) {
        // 2. Crear notificación en la tabla
        await supabase.from('notificaciones').insert({
          usuario_id: usuarioId,
          titulo: 'Recordatorio de Pago',
          mensaje: `Tu pago de "${tx.concepto}" por $${tx.monto} está vencido o por vencer.`,
          tipo: 'recordatorio',
          prioridad: 'alta',
          canal: 'push',
        })
        logs.push(`Recordatorio enviado a usuario ${usuarioId} por tx ${tx.id}`)
      }
    }

    return new Response(
      JSON.stringify({ message: `Procesados ${pendientes.length} recordatorios`, logs }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const status = error.status ?? 400
    return new Response(
      JSON.stringify({ error: error.message }),
      { status, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }
})

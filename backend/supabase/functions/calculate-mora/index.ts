import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { requireServiceRole } from "../_shared/auth.ts"
import { getCorsHeaders } from "../_shared/cors.ts"

const corsHeaders = getCorsHeaders

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })

  try {
    // Solo procesos de sistema (cron) pueden invocar esta función.
    await requireServiceRole(req)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Select all pending/overdue txs (limitado a 1000 por ejecución para evitar DoS)
    const { data: txs, error: txError } = await supabaseClient
      .from('transacciones')
      .select('id, condominio_id, unidad_id, monto, concepto, estado, fecha_vencimiento, interes_mora')
      .limit(1000)

    if (txError) throw txError

    const hoyStr = new Date().toISOString().split('T')[0]
    const MORA_MENSUAL = 0.05

    const vencibles = (txs ?? []).filter(
      t => (t.estado === 'pendiente' || t.estado === 'vencido') && t.fecha_vencimiento < hoyStr
    )

    let updatedCount = 0

    for (const tx of vencibles) {
      const hoy = new Date()
      const venc = new Date(tx.fecha_vencimiento)
      let meses = 0
      if (hoy > venc) {
        meses = Math.max(1, Math.ceil((hoy.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24 * 30)))
      }
      const nuevaMora = Number((Number(tx.monto) * MORA_MENSUAL * meses).toFixed(2))

      if (tx.estado === 'pendiente' || Number(tx.interes_mora) !== nuevaMora) {
        const { error: updateError } = await supabaseClient
          .from('transacciones')
          .update({
            estado: 'vencido',
            interes_mora: nuevaMora,
            updated_at: new Date().toISOString()
          })
          .eq('id', tx.id)

        if (updateError) continue
        updatedCount++

        // Try to insert in-app notification
        const { data: unidadData } = await supabaseClient
          .from('unidades')
          .select('usuario_id')
          .eq('id', tx.unidad_id)
          .maybeSingle()

        if (unidadData?.usuario_id) {
          await supabaseClient.from('notificaciones').insert({
            condominio_id: tx.condominio_id,
            usuario_id: unidadData.usuario_id,
            titulo: 'Recargo de Mora Aplicado',
            mensaje: `La cuota '${tx.concepto}' ha vencido. Se aplicó una mora de RD$${nuevaMora.toLocaleString('es-DO')} (5% mensual).`,
            tipo: 'alerta',
            prioridad: 'alta'
          })
        }
      }
    }

    return new Response(
      JSON.stringify({ message: 'Success', evaluated: vencibles.length, updated: updatedCount }),
      { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    const status = error.status ?? 500
    return new Response(
      JSON.stringify({ error: error.message }),
      { status, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }
})

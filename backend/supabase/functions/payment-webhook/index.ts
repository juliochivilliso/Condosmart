import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Webhook server-to-server: no CORS necesaria.
// Autenticación: valida un header X-Webhook-Secret contra PAYMENT_WEBHOOK_SECRET
// para que solo la pasarela de pago configurada pueda marcar transacciones como pagadas.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

serve(async (req) => {
  try {
    // 1. Verificar secreto del webhook
    const secret = req.headers.get('X-Webhook-Secret')
    const expected = Deno.env.get('PAYMENT_WEBHOOK_SECRET') ?? ''
    if (!expected) {
      return new Response(JSON.stringify({ error: 'PAYMENT_WEBHOOK_SECRET no configurado' }), { status: 500 })
    }
    if (!secret || secret !== expected) {
      return new Response(JSON.stringify({ error: 'Invalid webhook secret' }), { status: 401 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const { transaction_id, status, reference } = body

    // 2. Validar input en runtime
    if (!transaction_id || typeof transaction_id !== 'string' || !UUID_RE.test(transaction_id)) {
      return new Response(JSON.stringify({ error: 'transaction_id inválido' }), { status: 400 })
    }
    if (status !== 'success') {
      return new Response(JSON.stringify({ received: true, updated: false }), { status: 200 })
    }

    // 3. Actualizar transacción solo si sigue pendiente (idempotencia)
    const { data: tx, error: tErr } = await supabase
      .from('transacciones')
      .select('id, estado')
      .eq('id', transaction_id)
      .maybeSingle()

    if (tErr) throw tErr
    if (!tx) {
      return new Response(JSON.stringify({ error: 'Transacción no encontrada' }), { status: 404 })
    }
    if (tx.estado === 'pagado') {
      return new Response(JSON.stringify({ received: true, updated: false, duplicate: true }), { status: 200 })
    }

    const { error } = await supabase
      .from('transacciones')
      .update({
        estado: 'pagado',
        fecha_pago: new Date().toISOString(),
        referencia_pago: reference ? String(reference).slice(0, 255) : null,
        metodo_pago: 'tarjeta',
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction_id)

    if (error) throw error

    return new Response(JSON.stringify({ received: true, updated: true }), { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})

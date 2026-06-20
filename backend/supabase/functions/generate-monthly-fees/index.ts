import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { condominio_id, mes, anio } = await req.json()

    if (!condominio_id || !mes || !anio) {
      throw new Error('Se requieren condominio_id, mes y anio')
    }

    // 1. Verificar qué unidades ya tienen cuota para este mes
    const inicioMes = `${anio}-${String(mes).padStart(2, '0')}-01`
    const finMes    = `${anio}-${String(mes).padStart(2, '0')}-28`

    const { data: existentes } = await supabase
      .from('transacciones')
      .select('unidad_id')
      .eq('condominio_id', condominio_id)
      .eq('tipo_servicio', 'mantenimiento')
      .gte('fecha_vencimiento', inicioMes)
      .lte('fecha_vencimiento', finMes)

    const conCuota = new Set((existentes ?? []).map((t: any) => t.unidad_id))

    // 2. Obtener unidades activas sin cuota aún
    const { data: unidades, error: uErr } = await supabase
      .from('unidades')
      .select('id, cuota_mantenimiento')
      .eq('condominio_id', condominio_id)
      .eq('activo', true)

    if (uErr) throw uErr

    const pendientes = (unidades ?? []).filter((u: any) => !conCuota.has(u.id))
    const omitidas = (unidades ?? []).length - pendientes.length

    if (pendientes.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Ya existen cuotas para todas las unidades este mes', generadas: 0, omitidas }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const mesLabel = new Intl.DateTimeFormat('es-DO', { month: 'long' }).format(new Date(anio, mes - 1))
    const fechaVenc = `${anio}-${String(mes).padStart(2, '0')}-05`

    const nuevasTransacciones = pendientes.map((u: any) => ({
      condominio_id,
      unidad_id: u.id,
      monto: u.cuota_mantenimiento,
      tipo_servicio: 'mantenimiento',
      concepto: `Cuota de mantenimiento ${mesLabel} ${anio}`,
      estado: 'pendiente',
      fecha_vencimiento: fechaVenc,
    }))

    const { data, error: iErr } = await supabase
      .from('transacciones')
      .insert(nuevasTransacciones)
      .select()

    if (iErr) throw iErr

    return new Response(
      JSON.stringify({ message: `Generadas ${data.length} cuotas con éxito`, generadas: data.length, omitidas, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

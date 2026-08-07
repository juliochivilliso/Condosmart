# CondoSmart — Finanzas Críticos: Duplicados, Mora Automática y Morosidad

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolver los 3 bloqueantes financieros críticos: duplicados en generación de cuotas, mora que no se calcula sola, y falta de vista de morosidad.

**Architecture:** Tres cambios independientes. Task 1 corrige la Edge Function del backend. Task 2 agrega un cron job en PostgreSQL (pg_cron) que llama a `calculate-mora` diariamente. Task 3 agrega un widget de morosidad en `Cobros.tsx` con la lista de unidades en mora.

**Tech Stack:** Supabase Edge Functions (Deno), PostgreSQL pg_cron, React 19 + TypeScript + Tailwind

## Global Constraints

- No introducir librerías nuevas — usar solo lo que ya está en el proyecto
- Todos los cambios de base de datos van en un nuevo archivo de migración numerado (`00015_*.sql`)
- El sistema debe seguir funcionando con datos demo si no hay condominio_id
- Idioma del UI: español (usar "RD$", formato "es-DO")
- Desplegar Edge Functions siempre desde la carpeta `backend/` con `supabase functions deploy`

---

## Task 1: Protección contra duplicados en Edge Function + condominio_nombre dinámico

**Problema actual:**
- `generate-monthly-fees/index.ts` no verifica si ya existen cuotas para ese mes antes de insertar — ejecutarlo dos veces duplica los cobros
- `Cobros.tsx` línea 145: `condominio_nombre` está hardcodeado como "Residencial Las Palmas"

**Files:**
- Modify: `backend/supabase/functions/generate-monthly-fees/index.ts`
- Modify: `web-dashboard/src/pages/Cobros.tsx` (línea 145)

**Interfaces:**
- Consumes: Nada de otras tasks
- Produces: `generate-monthly-fees` retorna `{ message, generadas, omitidas, data }` en lugar de solo `{ message, data }`

- [ ] **Step 1: Reemplazar generate-monthly-fees/index.ts completo**

  Abrir `backend/supabase/functions/generate-monthly-fees/index.ts` y reemplazar todo el contenido con:

  ```typescript
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
  ```

- [ ] **Step 2: Corregir condominio_nombre hardcodeado en Cobros.tsx**

  En `web-dashboard/src/pages/Cobros.tsx`, agregar estado para el nombre del condominio. Buscar el bloque de estados al inicio del componente (alrededor de línea 64) y agregar:

  ```typescript
  const [condominioNombre, setCondominioNombre] = useState("Residencial")
  ```

  En el `useEffect` donde se llama a `fetchTransacciones()` (línea 116), agregar la carga del nombre:

  ```typescript
  useEffect(() => {
    fetchTransacciones()
    if (CONDOMINIO_ID) {
      supabase
        .from("condominios")
        .select("nombre")
        .eq("id", CONDOMINIO_ID)
        .single()
        .then(({ data }) => { if (data?.nombre) setCondominioNombre(data.nombre) })
    }
  }, [CONDOMINIO_ID])
  ```

  Reemplazar línea 145 (el hardcode):
  ```typescript
  condominio_nombre: "Residencial Las Palmas"
  ```
  por:
  ```typescript
  condominio_nombre: condominioNombre
  ```

- [ ] **Step 3: Redesplegar la Edge Function**

  ```bash
  cd "C:\Users\j.chivilli\Documents\Proyectos de Aplicaciones\condosmart\backend"
  supabase functions deploy generate-monthly-fees --project-ref ofjsodxsdbkiugonnmkh
  ```

  Expected output:
  ```
  Deployed Functions on project ofjsodxsdbkiugonnmkh: generate-monthly-fees
  ```

- [ ] **Step 4: Verificar protección contra duplicados**

  1. Iniciar la app: `.\start-demo.ps1` desde la raíz del proyecto
  2. Login como admin (`admin@laspalmas.do`)
  3. Ir a Cobros → "Generar Cuotas" → seleccionar el mes actual → Generar
  4. Anotar cuántas cuotas se generaron (ej: "40 cuotas generadas")
  5. Volver a hacer clic en Generar con el mismo mes
  6. Expected: mensaje "Ya existen cuotas para todas las unidades este mes" — sin duplicados

- [ ] **Step 5: Commit**

  ```bash
  git add backend/supabase/functions/generate-monthly-fees/index.ts \
          web-dashboard/src/pages/Cobros.tsx
  git commit -m "fix: proteccion contra duplicados en generacion de cuotas y condominio_nombre dinamico"
  ```

---

## Task 2: Cron automático para cálculo diario de mora

**Problema actual:** `calculate-mora` solo corre cuando el admin hace clic manualmente. Las moras se acumulan sin notificar al inquilino.

**Solución:** Usar `pg_cron` (extensión PostgreSQL disponible en Supabase) para llamar a la Edge Function `calculate-mora` todos los días a las 8am.

**Files:**
- Create: `backend/supabase/migrations/00015_mora_cron.sql`

**Interfaces:**
- Consumes: Edge Function `calculate-mora` ya existente en `backend/supabase/functions/calculate-mora/index.ts`
- Produces: Job `calcular-mora-diario` en `cron.job` de PostgreSQL ejecutándose cada día a las 8:00 AM UTC-4

- [ ] **Step 1: Crear migración para el cron job**

  Crear `backend/supabase/migrations/00015_mora_cron.sql`:

  ```sql
  -- 00015_mora_cron.sql
  -- Cron job diario para calcular mora automáticamente a las 8am (hora RD = UTC-4 = 12:00 UTC)

  -- Habilitar extensión pg_cron (ya disponible en Supabase)
  CREATE EXTENSION IF NOT EXISTS pg_cron;

  -- Habilitar extensión pg_net para llamadas HTTP desde PostgreSQL
  CREATE EXTENSION IF NOT EXISTS pg_net;

  -- Eliminar job anterior si existe (para idempotencia)
  SELECT cron.unschedule('calcular-mora-diario') 
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'calcular-mora-diario');

  -- Crear cron: cada día a las 12:00 UTC (8:00 AM hora RD)
  SELECT cron.schedule(
    'calcular-mora-diario',
    '0 12 * * *',
    $$
    SELECT net.http_post(
      url := 'https://ofjsodxsdbkiugonnmkh.supabase.co/functions/v1/calculate-mora',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_key', true)
      ),
      body := '{}'::jsonb
    ) AS request_id;
    $$
  );
  ```

- [ ] **Step 2: Configurar la service key como setting de PostgreSQL**

  En Supabase Dashboard → SQL Editor, ejecutar (reemplazando con tu service key real):

  ```sql
  ALTER DATABASE postgres SET app.supabase_service_key = 'sb_secret_Q-CzZ...TU_KEY_AQUI';
  ```

  > Esto guarda la key como configuración de la base de datos, no en código fuente.

- [ ] **Step 3: Ejecutar la migración del cron**

  En Supabase Dashboard → SQL Editor, ejecutar el contenido completo de `00015_mora_cron.sql`.

  O desde terminal:
  ```bash
  cd "C:\Users\j.chivilli\Documents\Proyectos de Aplicaciones\condosmart\backend"
  supabase db push --project-ref ofjsodxsdbkiugonnmkh
  ```

- [ ] **Step 4: Verificar que el job fue creado**

  En Supabase Dashboard → SQL Editor, ejecutar:

  ```sql
  SELECT jobname, schedule, command FROM cron.job;
  ```

  Expected output:
  ```
  jobname                | schedule   | command
  calcular-mora-diario   | 0 12 * * * | SELECT net.http_post(...)
  ```

- [ ] **Step 5: Probar el cron manualmente**

  En Supabase Dashboard → SQL Editor, ejecutar el job ahora mismo para verificar que funciona:

  ```sql
  SELECT cron.run_job('calcular-mora-diario');
  ```

  Luego verificar en Supabase Dashboard → Edge Functions → `calculate-mora` → Logs que aparece una invocación reciente con respuesta exitosa.

- [ ] **Step 6: Verificar resultado en base de datos**

  En SQL Editor:

  ```sql
  SELECT id, concepto, estado, fecha_vencimiento, interes_mora
  FROM transacciones
  WHERE estado = 'vencido'
  ORDER BY updated_at DESC
  LIMIT 10;
  ```

  Expected: transacciones vencidas con `interes_mora > 0`.

- [ ] **Step 7: Commit**

  ```bash
  git add backend/supabase/migrations/00015_mora_cron.sql
  git commit -m "feat: cron automatico diario para calculo de mora via pg_cron"
  ```

---

## Task 3: Widget de morosidad en Cobros

**Problema actual:** No hay forma de ver de un vistazo qué unidades están en mora, cuánto deben y hace cuánto tiempo.

**Solución:** Agregar una sección colapsable "Resumen de Morosidad" al tope de Cobros.tsx, visible solo para admin, con tabla de unidades morosas y totales.

**Files:**
- Modify: `web-dashboard/src/pages/Cobros.tsx`

**Interfaces:**
- Consumes: Datos ya cargados en `transacciones` (estado del componente existente)
- Produces: `unidadesMorosas` — array derivado de `transacciones` con estructura `{ unidad: string, totalDeuda: number, totalMora: number, cuotasVencidas: number, diasMaxVencido: number }`

- [ ] **Step 1: Agregar tipo y cálculo derivado en Cobros.tsx**

  En `web-dashboard/src/pages/Cobros.tsx`, agregar el tipo y cálculo derivado dentro del componente, justo antes del `return`. Buscar el bloque de funciones y agregar después de ellas:

  ```typescript
  type UnidadMorosa = {
    unidad: string
    totalDeuda: number
    totalMora: number
    cuotasVencidas: number
    diasMaxVencido: number
  }

  const unidadesMorosas: UnidadMorosa[] = useMemo(() => {
    const hoy = new Date()
    const morosas = transacciones.filter(t => t.estado === 'vencido')
    const grouped: Record<string, UnidadMorosa> = {}

    for (const t of morosas) {
      const key = t.unidad_numero ?? t.unidad_id
      const venc = new Date(t.fecha_vencimiento)
      const dias = Math.floor((hoy.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24))

      if (!grouped[key]) {
        grouped[key] = { unidad: key, totalDeuda: 0, totalMora: 0, cuotasVencidas: 0, diasMaxVencido: 0 }
      }
      grouped[key].totalDeuda += Number(t.monto)
      grouped[key].totalMora += Number(t.interes_mora ?? 0)
      grouped[key].cuotasVencidas += 1
      grouped[key].diasMaxVencido = Math.max(grouped[key].diasMaxVencido, dias)
    }

    return Object.values(grouped).sort((a, b) => b.totalDeuda - a.totalDeuda)
  }, [transacciones])

  const [mostrarMorosidad, setMostrarMorosidad] = useState(true)
  ```

  Agregar import de `useMemo` al inicio del archivo si no está (buscar la línea de imports de React):
  ```typescript
  import { useEffect, useState, useRef, useMemo } from "react"
  ```

- [ ] **Step 2: Agregar íconos necesarios en Cobros.tsx**

  Buscar la línea de imports de lucide-react y agregar `ChevronDown`, `ChevronUp`, `TrendingDown`:

  ```typescript
  import {
    DollarSign, Plus, Loader2, AlertCircle, CheckCircle2,
    Clock, Upload, FileText, AlertTriangle, User, ShieldCheck,
    Pencil, ChevronDown, ChevronUp, TrendingDown
  } from "lucide-react"
  ```

- [ ] **Step 3: Agregar widget de morosidad en el JSX de Cobros.tsx**

  En el JSX del componente `Cobros`, agregar este bloque justo después de la card de cuenta bancaria (Task 3 del plan anterior) y antes de la tabla de transacciones. Si no está la card de cuenta bancaria, agregar antes del primer `<Card>` de transacciones:

  ```tsx
  {profile?.rol === 'admin_condominio' && unidadesMorosas.length > 0 && (
    <Card className="border-red-500/20 bg-red-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-400" />
            <CardTitle className="text-sm font-medium text-red-400">
              Resumen de Morosidad — {unidadesMorosas.length} unidad(es) en mora
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={calcularMora}
              disabled={calculandoMora}
              className="text-xs text-red-400 hover:text-red-300 h-7 px-2"
            >
              {calculandoMora ? <Loader2 className="h-3 w-3 animate-spin" /> : "Actualizar mora"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMostrarMorosidad(p => !p)}
              className="h-7 w-7 p-0"
            >
              {mostrarMorosidad
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </div>
        </div>

        {/* Totales rápidos */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total adeudado</p>
            <p className="text-sm font-bold text-red-400">
              RD${unidadesMorosas.reduce((s, u) => s + u.totalDeuda, 0).toLocaleString('es-DO')}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total en mora</p>
            <p className="text-sm font-bold text-orange-400">
              RD${unidadesMorosas.reduce((s, u) => s + u.totalMora, 0).toLocaleString('es-DO')}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Cuotas vencidas</p>
            <p className="text-sm font-bold text-yellow-400">
              {unidadesMorosas.reduce((s, u) => s + u.cuotasVencidas, 0)}
            </p>
          </div>
        </div>
      </CardHeader>

      {mostrarMorosidad && (
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="text-left py-2 pr-3">Unidad</th>
                  <th className="text-right py-2 pr-3">Cuotas</th>
                  <th className="text-right py-2 pr-3">Deuda</th>
                  <th className="text-right py-2 pr-3">Mora</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {unidadesMorosas.map(u => (
                  <tr key={u.unidad} className="border-b border-border/20 hover:bg-red-500/5">
                    <td className="py-2 pr-3 font-medium">Apt. {u.unidad}</td>
                    <td className="py-2 pr-3 text-right text-yellow-400">{u.cuotasVencidas}</td>
                    <td className="py-2 pr-3 text-right">RD${u.totalDeuda.toLocaleString('es-DO')}</td>
                    <td className="py-2 pr-3 text-right text-orange-400">RD${u.totalMora.toLocaleString('es-DO')}</td>
                    <td className="py-2 text-right font-bold text-red-400">
                      RD${(u.totalDeuda + u.totalMora).toLocaleString('es-DO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  )}
  ```

- [ ] **Step 4: Verificar el widget**

  1. Iniciar la app: `.\start-demo.ps1`
  2. Login como admin (`admin@laspalmas.do`)
  3. Ir a Cobros
  4. Si no hay transacciones vencidas: en Cobros generar cuotas de un mes pasado y luego hacer clic en "Actualizar mora" para marcarlas como vencidas
  5. Expected: aparece la card roja "Resumen de Morosidad" con la tabla de unidades, totales de deuda, mora y total por unidad
  6. Hacer clic en la flecha para colapsar/expandir
  7. Hacer clic en "Actualizar mora" — debe recalcular y refrescar los datos

- [ ] **Step 5: Commit**

  ```bash
  git add web-dashboard/src/pages/Cobros.tsx
  git commit -m "feat: widget de morosidad con totales por unidad en panel de cobros"
  ```

---

## Checklist de Verificación Final

- [ ] Generar cuotas dos veces el mismo mes → solo genera la primera vez, la segunda dice "Ya existen"
- [ ] `cron.job` en Supabase muestra `calcular-mora-diario` programado para `0 12 * * *`
- [ ] Ejecutar `cron.run_job('calcular-mora-diario')` en SQL Editor → logs de `calculate-mora` muestran ejecución exitosa
- [ ] Widget de morosidad visible en Cobros cuando hay transacciones vencidas
- [ ] Widget muestra totales correctos: deuda + mora por unidad
- [ ] Los emails de confirmación de pago muestran el nombre real del residencial (no "Las Palmas" hardcodeado)

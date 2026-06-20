# Features: Cuenta Bancaria · CSV Inquilinos · IoT URL · Auditoría — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar 4 mejoras que bloquean el uso en producción: cuenta bancaria configurable por condominio, importación masiva de inquilinos por CSV, URL del simulador IoT configurable por env var, y log de auditoría de aprobaciones/rechazos.

**Architecture:** Cada feature toca capas distintas pero sin interdependencias horizontales — la migración DB va primero, luego los cambios de frontend se pueden hacer en cualquier orden excepto que Cobros.tsx depende de que PaymentGateway.tsx ya tenga la prop `bancoCuenta`. El audit_log se inserta desde Cobros.tsx y Configuracion.tsx usando el cliente Supabase anon con RLS.

**Tech Stack:** React 19 · TypeScript · Vite · Tailwind CSS · Radix UI · Supabase (PostgreSQL + RLS) · PapaParse (CSV)

## Global Constraints

- Seguir exactamente el patrón de componentes existente (Card, CardContent, CardHeader, Button, Input, Label, Dialog de `@/components/ui/*`)
- Importar `supabase` de `@/lib/supabase`, `useAuth` de `@/context/AuthContext`
- No usar `supabaseAdmin` para operaciones que el cliente anon puede hacer con RLS correcta
- Todas las páginas nuevas de `admin_condominio` van en `navLinksAdminCondominio` en `App.tsx`
- Sin comentarios en el código salvo que el WHY sea no obvio

---

### Task 1: Migration 00013 — Cuenta bancaria + Audit log

**Files:**
- Create: `backend/supabase/migrations/00013_bank_config_audit.sql`

**Interfaces:**
- Produces: tabla `condominios` con columnas `banco, tipo_cuenta, numero_cuenta, beneficiario, rnc`; tabla `audit_log(id, condominio_id, usuario_id, accion, descripcion, metadata, created_at)`; políticas RLS de SELECT/INSERT en `audit_log` y UPDATE en `condominios`

- [ ] **Step 1: Crear el archivo de migración**

Contenido completo de `backend/supabase/migrations/00013_bank_config_audit.sql`:

```sql
-- 00013_bank_config_audit.sql

-- Feature 1: Columnas de cuenta bancaria en condominios
ALTER TABLE condominios
  ADD COLUMN IF NOT EXISTS banco TEXT,
  ADD COLUMN IF NOT EXISTS tipo_cuenta TEXT,
  ADD COLUMN IF NOT EXISTS numero_cuenta TEXT,
  ADD COLUMN IF NOT EXISTS beneficiario TEXT,
  ADD COLUMN IF NOT EXISTS rnc TEXT;

-- Permitir que el admin de cada condominio actualice sus datos bancarios
CREATE POLICY "admin puede actualizar su condominio"
  ON condominios FOR UPDATE
  USING (id IN (
    SELECT condominio_id FROM usuarios WHERE id = auth.uid()
  ));

-- Feature 4: Tabla de auditoría
CREATE TABLE IF NOT EXISTS audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  usuario_id    UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  accion        TEXT NOT NULL,
  descripcion   TEXT NOT NULL,
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin puede ver audit_log de su condominio"
  ON audit_log FOR SELECT
  USING (condominio_id IN (
    SELECT condominio_id FROM usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "admin puede insertar en audit_log"
  ON audit_log FOR INSERT
  WITH CHECK (condominio_id IN (
    SELECT condominio_id FROM usuarios WHERE id = auth.uid()
  ));
```

- [ ] **Step 2: Ejecutar la migración en Supabase**

Ir al dashboard de Supabase → SQL Editor → pegar el contenido del archivo → Run.

Verificar que no haya errores. Si la tabla `condominios` ya tiene una política de UPDATE que conflictúe, ajustar el nombre de la política.

- [ ] **Step 3: Verificar en Table Editor**

En Supabase → Table Editor → `condominios`: confirmar que aparecen las 5 columnas nuevas (`banco`, `tipo_cuenta`, `numero_cuenta`, `beneficiario`, `rnc`).

En Table Editor → `audit_log`: confirmar que la tabla existe con las 6 columnas.

- [ ] **Step 4: Commit**

```bash
git add backend/supabase/migrations/00013_bank_config_audit.sql
git commit -m "feat: add bank config columns to condominios and audit_log table"
```

---

### Task 2: IoT URL — Variable de entorno VITE_IOT_URL

**Files:**
- Modify: `web-dashboard/.env` (agregar línea)
- Create: `web-dashboard/.env.production`
- Modify: `web-dashboard/src/pages/IotControl.tsx:96`

**Interfaces:**
- Consumes: nada
- Produces: `import.meta.env.VITE_IOT_URL` disponible en runtime; fallback a `http://localhost:3001`

- [ ] **Step 1: Agregar VITE_IOT_URL al .env existente**

El archivo `.env` ya existe con las claves de Supabase. Agregar al final:

```
VITE_IOT_URL=http://localhost:3001
```

El archivo completo queda:
```
VITE_SUPABASE_URL="https://ofjsodxsdbkiugonnmkh.supabase.co"
VITE_SUPABASE_ANON_KEY="sb_publishable_NxGCb5HAXwmFzW0lkfKBqQ_8H7X9-y0"
VITE_SUPABASE_SERVICE_KEY="REPLACE_WITH_YOUR_SERVICE_ROLE_KEY"
VITE_IOT_URL=http://localhost:3001
```

- [ ] **Step 2: Crear .env.production**

Crear `web-dashboard/.env.production` con:

```
VITE_IOT_URL=
```

*(Vacío — el deployer completa la URL del servidor IoT de producción antes de hacer build)*

- [ ] **Step 3: Modificar IotControl.tsx línea 96**

En `web-dashboard/src/pages/IotControl.tsx`, dentro del segundo `useEffect` (línea ~94), reemplazar:

```ts
// antes
const socket = io("http://localhost:3001", { timeout: 3000, reconnectionAttempts: 2 })
```

por:

```ts
// después
const IOT_URL = import.meta.env.VITE_IOT_URL || "http://localhost:3001"
const socket = io(IOT_URL, { timeout: 3000, reconnectionAttempts: 2 })
```

- [ ] **Step 4: Verificar**

Reiniciar el dev server (`npm run dev` en `web-dashboard/`). Abrir la página IoT Control — la badge de conexión debe mostrar "Sin servidor IoT" (igual que antes, porque localhost:3001 no corre), pero sin errores de consola relacionados con URL indefinida.

- [ ] **Step 5: Commit**

```bash
git add web-dashboard/.env web-dashboard/.env.production web-dashboard/src/pages/IotControl.tsx
git commit -m "feat: make IoT simulator URL configurable via VITE_IOT_URL env var"
```

---

### Task 3: PaymentGateway — Prop bancoCuenta

**Files:**
- Modify: `web-dashboard/src/components/PaymentGateway.tsx`

**Interfaces:**
- Consumes: nada nuevo
- Produces: tipo `BancoCuenta` exportado; prop `bancoCuenta: BancoCuenta | null` en `PaymentGatewayProps`; tab de transferencia deshabilitada si `bancoCuenta` es null/vacío

- [ ] **Step 1: Agregar tipo BancoCuenta y prop a PaymentGateway.tsx**

Al inicio de `web-dashboard/src/components/PaymentGateway.tsx`, agregar después de los imports existentes:

```ts
export type BancoCuenta = {
  banco: string
  tipo_cuenta: string
  numero_cuenta: string
  beneficiario: string
  rnc: string
}
```

Modificar la interfaz `PaymentGatewayProps` (actualmente línea ~17) para agregar la prop:

```ts
interface PaymentGatewayProps {
  monto: number
  concepto: string
  txId: string
  condominioId: string
  bancoCuenta: BancoCuenta | null
  onSuccess: (captureId: string, metodo: "tarjeta" | "transferencia", comprobanteUrl?: string, referencia?: string) => void
  onCancel: () => void
}
```

Agregar `bancoCuenta` a la desestructuración del componente (línea ~26):

```ts
export default function PaymentGateway({
  monto,
  concepto,
  txId,
  condominioId,
  bancoCuenta,
  onSuccess,
  onCancel
}: PaymentGatewayProps) {
```

- [ ] **Step 2: Reemplazar datos bancarios hardcodeados**

Localizar el bloque de líneas 354–365 (tab de transferencia, instrucciones de banco):

```tsx
// BLOQUE A REEMPLAZAR (líneas ~354-365):
<div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-400 leading-normal space-y-1">
  <p className="font-semibold">Instrucciones de Transferencia:</p>
  <p>Realice la transferencia bancaria a la siguiente cuenta:</p>
  <ul className="list-disc pl-4 space-y-0.5">
    <li><strong>Banco:</strong> Banco de Reservas (Banreservas)</li>
    <li><strong>Tipo:</strong> Corriente</li>
    <li><strong>Cuenta:</strong> 960-123456-7</li>
    <li><strong>Beneficiario:</strong> CondoSmart Residencial</li>
    <li><strong>RNC:</strong> 1-32-12345-6</li>
  </ul>
</div>
```

Reemplazar por:

```tsx
{bancoCuenta ? (
  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-400 leading-normal space-y-1">
    <p className="font-semibold">Instrucciones de Transferencia:</p>
    <p>Realice la transferencia bancaria a la siguiente cuenta:</p>
    <ul className="list-disc pl-4 space-y-0.5">
      {bancoCuenta.banco      && <li><strong>Banco:</strong> {bancoCuenta.banco}</li>}
      {bancoCuenta.tipo_cuenta && <li><strong>Tipo:</strong> {bancoCuenta.tipo_cuenta}</li>}
      {bancoCuenta.numero_cuenta && <li><strong>Cuenta:</strong> {bancoCuenta.numero_cuenta}</li>}
      {bancoCuenta.beneficiario && <li><strong>Beneficiario:</strong> {bancoCuenta.beneficiario}</li>}
      {bancoCuenta.rnc          && <li><strong>RNC:</strong> {bancoCuenta.rnc}</li>}
    </ul>
  </div>
) : (
  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-400 leading-normal">
    <p className="font-semibold">Cuenta bancaria no configurada</p>
    <p className="mt-1">El administrador aún no ha configurado la cuenta bancaria de este condominio. Contacte al administrador o use la opción de tarjeta.</p>
  </div>
)}
```

- [ ] **Step 3: Deshabilitar tab de transferencia si no hay bancoCuenta**

Localizar el `<TabsTrigger value="transferencia" ...>` (línea ~249) y agregar `disabled`:

```tsx
<TabsTrigger value="transferencia" className="flex items-center gap-2" disabled={!bancoCuenta}>
  <Upload className="h-4 w-4" /> Transferencia Bancaria
</TabsTrigger>
```

- [ ] **Step 4: Verificar que TypeScript compila**

```bash
cd "web-dashboard" && npm run build 2>&1 | head -30
```

Esperado: error de tipo en `Cobros.tsx` porque `PaymentGateway` ahora requiere `bancoCuenta` — esto es correcto, se corrige en Task 6.

- [ ] **Step 5: Commit**

```bash
git add web-dashboard/src/components/PaymentGateway.tsx
git commit -m "feat: add bancoCuenta prop to PaymentGateway, replace hardcoded bank data"
```

---

### Task 4: Configuracion.tsx — Página de configuración bancaria

**Files:**
- Create: `web-dashboard/src/pages/Configuracion.tsx`
- Modify: `web-dashboard/src/App.tsx`

**Interfaces:**
- Consumes: `supabase` de `@/lib/supabase`; `useAuth` → `profile.condominio_id`, `profile.id`; tabla `condominios` (columnas banco/tipo_cuenta/numero_cuenta/beneficiario/rnc); tabla `audit_log`
- Produces: ruta `/configuracion` accesible para `admin_condominio`; nav link "Configuración" en sidebar

- [ ] **Step 1: Crear Configuracion.tsx**

Crear `web-dashboard/src/pages/Configuracion.tsx` con el siguiente contenido:

```tsx
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, Loader2, CheckCircle2, AlertCircle } from "lucide-react"

type BancoForm = {
  banco: string
  tipo_cuenta: string
  numero_cuenta: string
  beneficiario: string
  rnc: string
}

export default function Configuracion() {
  const { profile } = useAuth()
  const CONDOMINIO_ID = profile?.condominio_id ?? ''
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<BancoForm>({
    banco: '', tipo_cuenta: '', numero_cuenta: '', beneficiario: '', rnc: '',
  })

  useEffect(() => {
    async function fetchConfig() {
      if (!CONDOMINIO_ID) { setLoading(false); return }
      const { data } = await supabase
        .from("condominios")
        .select("banco, tipo_cuenta, numero_cuenta, beneficiario, rnc")
        .eq("id", CONDOMINIO_ID)
        .single()
      if (data) {
        setForm({
          banco:         data.banco         ?? '',
          tipo_cuenta:   data.tipo_cuenta   ?? '',
          numero_cuenta: data.numero_cuenta ?? '',
          beneficiario:  data.beneficiario  ?? '',
          rnc:           data.rnc           ?? '',
        })
      }
      setLoading(false)
    }
    fetchConfig()
  }, [CONDOMINIO_ID])

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.banco.trim() || !form.numero_cuenta.trim() || !form.beneficiario.trim()) {
      setError("Banco, número de cuenta y beneficiario son requeridos.")
      return
    }
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const { error: updErr } = await supabase
        .from("condominios")
        .update({
          banco:         form.banco.trim(),
          tipo_cuenta:   form.tipo_cuenta.trim(),
          numero_cuenta: form.numero_cuenta.trim(),
          beneficiario:  form.beneficiario.trim(),
          rnc:           form.rnc.trim(),
        })
        .eq("id", CONDOMINIO_ID)
      if (updErr) throw updErr

      await supabase.from("audit_log").insert({
        condominio_id: CONDOMINIO_ID,
        usuario_id:    profile?.id,
        accion:        "cambio_cuenta_bancaria",
        descripcion:   `Cuenta bancaria actualizada: ${form.banco.trim()} · ${form.numero_cuenta.trim()}`,
        metadata:      { banco: form.banco.trim(), numero_cuenta: form.numero_cuenta.trim() },
      })

      setSaved(true)
    } catch (err: any) {
      setError(err.message ?? "Error al guardar la configuración.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configuración</h2>
        <p className="text-muted-foreground mt-1">Datos bancarios para pagos por transferencia</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-4">
          <Settings className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Cuenta Bancaria</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGuardar} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cfg-banco">Banco *</Label>
                <Input id="cfg-banco" placeholder="Ej. Banco de Reservas" value={form.banco}
                  onChange={e => setForm(f => ({ ...f, banco: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cfg-tipo">Tipo de Cuenta</Label>
                <Input id="cfg-tipo" placeholder="Ej. Corriente" value={form.tipo_cuenta}
                  onChange={e => setForm(f => ({ ...f, tipo_cuenta: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cfg-cuenta">Número de Cuenta *</Label>
                <Input id="cfg-cuenta" placeholder="Ej. 960-123456-7" value={form.numero_cuenta}
                  onChange={e => setForm(f => ({ ...f, numero_cuenta: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cfg-rnc">RNC</Label>
                <Input id="cfg-rnc" placeholder="Ej. 1-32-12345-6" value={form.rnc}
                  onChange={e => setForm(f => ({ ...f, rnc: e.target.value }))} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cfg-benef">Beneficiario *</Label>
                <Input id="cfg-benef" placeholder="Ej. Residencial Las Palmas" value={form.beneficiario}
                  onChange={e => setForm(f => ({ ...f, beneficiario: e.target.value }))} />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-4 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />{error}
              </div>
            )}
            {saved && (
              <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-md px-4 py-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />Configuración guardada exitosamente.
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar Cambios
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Agregar Configuracion a App.tsx**

En `web-dashboard/src/App.tsx`:

**2a.** Agregar import al bloque de imports de páginas (después de `import Visitantes`):
```ts
import Configuracion from "@/pages/Configuracion"
```

**2b.** Agregar `Settings` al import de lucide-react (ya importa otros iconos):
```ts
// Buscar la línea que importa iconos lucide y agregar Settings
import { LayoutDashboard, Wrench, DollarSign, Activity, Users, Building2, LogOut, UserCog, CreditCard, Layers, BarChart3, FileBarChart2, PlusCircle, Megaphone, CalendarDays, ShieldCheck, Settings } from "lucide-react"
```

**2c.** Agregar a `navLinksAdminCondominio` (después de `visitantes`):
```ts
const navLinksAdminCondominio = [
  { to: "/finanzas",       label: "Finanzas",        icon: DollarSign },
  { to: "/cobros",         label: "Cobros",           icon: CreditCard },
  { to: "/planes",         label: "Mi Plan",          icon: Layers },
  { to: "/visitantes",     label: "Visitantes",       icon: ShieldCheck },
  { to: "/configuracion",  label: "Configuración",    icon: Settings },
]
```

**2d.** Agregar ruta dentro del bloque `ProtectedRoute allowedRoles={['admin_condominio']}`:
```tsx
<Route element={<ProtectedRoute allowedRoles={['admin_condominio']} />}>
  <Route path="finanzas"         element={<Finanzas />} />
  <Route path="cobros"           element={<Cobros />} />
  <Route path="suscripcion/pago" element={<PagoSuscripcion />} />
  <Route path="visitantes"       element={<Visitantes />} />
  <Route path="configuracion"    element={<Configuracion />} />
</Route>
```

- [ ] **Step 3: Verificar en el navegador**

Iniciar dev server si no está corriendo: `npm run dev` en `web-dashboard/`.

Iniciar sesión como `admin_condominio`. Verificar:
- "Configuración" aparece en el sidebar
- `/configuracion` carga sin errores
- Los campos se pre-llenan si el condominio ya tenía datos (estarán vacíos por ahora)
- Llenar los 3 campos requeridos y guardar → mensaje verde "Configuración guardada"
- En Supabase Table Editor → `condominios`: confirmar que la fila del condominio tiene los valores actualizados

- [ ] **Step 4: Commit**

```bash
git add web-dashboard/src/pages/Configuracion.tsx web-dashboard/src/App.tsx
git commit -m "feat: add Configuracion page for per-condominio bank account settings"
```

---

### Task 5: Auditoria.tsx — Página de log de auditoría

**Files:**
- Create: `web-dashboard/src/pages/Auditoria.tsx`
- Modify: `web-dashboard/src/App.tsx`

**Interfaces:**
- Consumes: tabla `audit_log(id, accion, descripcion, metadata, created_at, usuarios(nombre_completo))`
- Produces: ruta `/auditoria` solo para `admin_condominio`; nav link "Auditoría" en sidebar

- [ ] **Step 1: Crear Auditoria.tsx**

Crear `web-dashboard/src/pages/Auditoria.tsx`:

```tsx
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClipboardList, Loader2, AlertCircle } from "lucide-react"

type AuditEntry = {
  id: string
  accion: string
  descripcion: string
  metadata: Record<string, any> | null
  created_at: string
  usuarios: { nombre_completo: string } | null
}

const accionBadge: Record<string, string> = {
  aprobar_transferencia:  "bg-green-500/20 text-green-400 border border-green-500/30",
  rechazar_transferencia: "bg-red-500/20 text-red-400 border border-red-500/30",
  cambio_cuenta_bancaria: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
}

const accionLabel: Record<string, string> = {
  aprobar_transferencia:  "Transferencia aprobada",
  rechazar_transferencia: "Transferencia rechazada",
  cambio_cuenta_bancaria: "Cuenta bancaria modificada",
}

export default function Auditoria() {
  const { profile } = useAuth()
  const CONDOMINIO_ID = profile?.condominio_id ?? ''
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAudit() {
      if (!CONDOMINIO_ID) { setLoading(false); return }
      try {
        const { data, error: err } = await supabase
          .from("audit_log")
          .select("id, accion, descripcion, metadata, created_at, usuarios(nombre_completo)")
          .eq("condominio_id", CONDOMINIO_ID)
          .order("created_at", { ascending: false })
          .limit(100)
        if (err) throw err
        setEntries((data ?? []) as AuditEntry[])
      } catch {
        setError("No se pudo cargar el log de auditoría.")
      } finally {
        setLoading(false)
      }
    }
    fetchAudit()
  }, [CONDOMINIO_ID])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="ml-3 text-muted-foreground">Cargando auditoría...</span>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Auditoría</h2>
        <p className="text-muted-foreground mt-1">Registro de acciones administrativas</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-md px-4 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-4">
          <ClipboardList className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Log de Auditoría ({entries.length} registros)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-10">
              Sin registros de auditoría aún.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-6 py-3 text-muted-foreground font-medium">Fecha/Hora</th>
                    <th className="text-left px-6 py-3 text-muted-foreground font-medium">Acción</th>
                    <th className="text-left px-6 py-3 text-muted-foreground font-medium">Descripción</th>
                    <th className="text-left px-6 py-3 text-muted-foreground font-medium">Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="px-6 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(e.created_at).toLocaleString("es-DO")}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${accionBadge[e.accion] ?? "bg-secondary text-muted-foreground"}`}>
                          {accionLabel[e.accion] ?? e.accion}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-xs text-muted-foreground">{e.descripcion}</td>
                      <td className="px-6 py-3 text-xs text-muted-foreground">
                        {e.usuarios?.nombre_completo ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Agregar Auditoria a App.tsx**

**2a.** Agregar import:
```ts
import Auditoria from "@/pages/Auditoria"
```

**2b.** Agregar `ClipboardList` al import de lucide-react (ya tiene otros):
```ts
import { ..., Settings, ClipboardList } from "lucide-react"
```

**2c.** Agregar a `navLinksAdminCondominio` después de Configuración:
```ts
const navLinksAdminCondominio = [
  { to: "/finanzas",       label: "Finanzas",        icon: DollarSign },
  { to: "/cobros",         label: "Cobros",           icon: CreditCard },
  { to: "/planes",         label: "Mi Plan",          icon: Layers },
  { to: "/visitantes",     label: "Visitantes",       icon: ShieldCheck },
  { to: "/configuracion",  label: "Configuración",    icon: Settings },
  { to: "/auditoria",      label: "Auditoría",        icon: ClipboardList },
]
```

**2d.** Agregar ruta en el bloque `admin_condominio`:
```tsx
<Route path="configuracion" element={<Configuracion />} />
<Route path="auditoria"     element={<Auditoria />} />
```

- [ ] **Step 3: Verificar en el navegador**

- "Auditoría" aparece en el sidebar de `admin_condominio`
- `/auditoria` carga y muestra "Sin registros de auditoría aún."
- Al ir a Configuración y guardar datos bancarios, volver a Auditoría → debe aparecer 1 entrada con badge azul "Cuenta bancaria modificada"

- [ ] **Step 4: Commit**

```bash
git add web-dashboard/src/pages/Auditoria.tsx web-dashboard/src/App.tsx
git commit -m "feat: add Auditoria page showing audit log entries"
```

---

### Task 6: Cobros.tsx — Fetch banco + pasar a PaymentGateway + audit_log

**Files:**
- Modify: `web-dashboard/src/pages/Cobros.tsx`

**Interfaces:**
- Consumes: `BancoCuenta` tipo de `@/components/PaymentGateway`; tabla `condominios` (columnas banco/tipo_cuenta/numero_cuenta/beneficiario/rnc); tabla `audit_log`
- Produces: `PaymentGateway` recibe `bancoCuenta` prop; cada aprobación/rechazo de transferencia genera una entrada en `audit_log`

- [ ] **Step 1: Importar BancoCuenta en Cobros.tsx**

En `web-dashboard/src/pages/Cobros.tsx`, modificar el import de PaymentGateway:

```ts
// antes
import PaymentGateway from "@/components/PaymentGateway"

// después
import PaymentGateway, { type BancoCuenta } from "@/components/PaymentGateway"
```

- [ ] **Step 2: Agregar estado bancoCuenta**

Dentro del componente `Cobros()`, después de las declaraciones de estado existentes (línea ~86, cerca de `const [cuentaUnidad, ...]`), agregar:

```ts
const [bancoCuenta, setBancoCuenta] = useState<BancoCuenta | null>(null)
```

- [ ] **Step 3: Fetch bancoCuenta al cargar**

Modificar la función `fetchTransacciones` para que también cargue la config bancaria, o agregar un `useEffect` separado. Agregar este `useEffect` justo después del `useEffect(() => { fetchTransacciones() }, [CONDOMINIO_ID])`:

```ts
useEffect(() => {
  async function fetchBanco() {
    if (!CONDOMINIO_ID) return
    const { data } = await supabase
      .from("condominios")
      .select("banco, tipo_cuenta, numero_cuenta, beneficiario, rnc")
      .eq("id", CONDOMINIO_ID)
      .single()
    if (data?.banco) {
      setBancoCuenta({
        banco:         data.banco         ?? '',
        tipo_cuenta:   data.tipo_cuenta   ?? '',
        numero_cuenta: data.numero_cuenta ?? '',
        beneficiario:  data.beneficiario  ?? '',
        rnc:           data.rnc           ?? '',
      })
    }
  }
  fetchBanco()
}, [CONDOMINIO_ID])
```

- [ ] **Step 4: Pasar bancoCuenta al componente PaymentGateway**

Localizar el uso de `<PaymentGateway` dentro del Dialog de "Registrar Pago" (línea ~658) y agregar la prop:

```tsx
{pagoTx && useGateway && (
  <PaymentGateway
    monto={Number(pagoTx.monto) + Number(pagoTx.interes_mora ?? 0)}
    concepto={pagoTx.concepto}
    txId={pagoTx.id}
    condominioId={CONDOMINIO_ID}
    bancoCuenta={bancoCuenta}
    onCancel={() => setPagoTx(null)}
    onSuccess={async (capId, method, compUrl, ref) => {
      // ... código existente sin cambios
    }}
  />
)}
```

- [ ] **Step 5: Insertar audit_log en aprobarTransferencia**

En la función `aprobarTransferencia` (línea ~304), después del `await triggerEmailNotification(...)` y antes del `alert(...)`:

```ts
async function aprobarTransferencia(tx: Transaccion) {
  if (!confirm(`¿Está seguro de que desea aprobar el pago por transferencia de Apt ${tx.unidad_numero}?`)) return
  try {
    const generatedCapId = `CS-TRF-${Date.now()}`
    const { error: txErr } = await supabase
      .from("transacciones")
      .update({
        estado: "pagado",
        fecha_pago: new Date().toISOString().split("T")[0],
        capture_id: generatedCapId,
        interes_mora: 0,
        updated_at: new Date().toISOString()
      })
      .eq("id", tx.id)

    if (txErr) throw txErr

    await triggerEmailNotification("pago_confirmado", tx, generatedCapId, tx.comprobante_url ?? undefined)

    // Registro de auditoría
    await supabase.from("audit_log").insert({
      condominio_id: CONDOMINIO_ID,
      usuario_id:    profile?.id,
      accion:        "aprobar_transferencia",
      descripcion:   `Transferencia aprobada — Apt ${tx.unidad_numero} · ${tx.concepto}`,
      metadata:      { tx_id: tx.id, monto: tx.monto, unidad: tx.unidad_numero, capture_id: generatedCapId },
    })

    alert("Transferencia aprobada con éxito.")
    await fetchTransacciones()
  } catch (e: any) {
    alert(e.message ?? "Error al aprobar la transferencia.")
  }
}
```

- [ ] **Step 6: Insertar audit_log en rechazarTransferencia**

En la función `rechazarTransferencia` (línea ~331), después del insert de notificaciones y antes del `alert(...)`:

```ts
// Después del bloque que inserta en notificaciones (if unidadData?.usuario_id), agregar:
await supabase.from("audit_log").insert({
  condominio_id: CONDOMINIO_ID,
  usuario_id:    profile?.id,
  accion:        "rechazar_transferencia",
  descripcion:   `Transferencia rechazada — Apt ${tx.unidad_numero} · ${tx.concepto}`,
  metadata:      { tx_id: tx.id, monto: tx.monto, unidad: tx.unidad_numero, motivo: motivo || null },
})
```

- [ ] **Step 7: Verificar en el navegador**

1. Ir a Cobros → clic en "Pagar" sobre cualquier cuota → Dialog → tab "Transferencia Bancaria"
   - Si la cuenta bancaria está configurada: se muestran los datos reales del condominio
   - Si no está configurada: aparece aviso amarillo y tab deshabilitada
2. Aprobar una transferencia `pendiente_verificacion` → ir a `/auditoria` → debe aparecer entrada verde "Transferencia aprobada"
3. Rechazar una transferencia → ir a `/auditoria` → entrada roja "Transferencia rechazada"

- [ ] **Step 8: Commit**

```bash
git add web-dashboard/src/pages/Cobros.tsx
git commit -m "feat: wire bancoCuenta to PaymentGateway and log transfer approvals to audit_log"
```

---

### Task 7: CSV Import — Importar inquilinos masivamente

**Files:**
- Modify: `web-dashboard/package.json` (dependencia papaparse)
- Modify: `web-dashboard/src/pages/Inquilinos.tsx`

**Interfaces:**
- Consumes: `Papa.parse` de `papaparse`; tabla `usuarios`; tabla `unidades`
- Produces: botón "Importar CSV" en página Inquilinos; Dialog con preview y resumen de importación

- [ ] **Step 1: Instalar papaparse**

```bash
cd "web-dashboard" && npm install papaparse @types/papaparse
```

Verificar que el install termina sin errores.

- [ ] **Step 2: Agregar imports y tipos en Inquilinos.tsx**

Al inicio de `web-dashboard/src/pages/Inquilinos.tsx`, agregar después de los imports existentes:

```ts
import Papa from "papaparse"
import { Upload, FileUp, CheckCircle2, XCircle } from "lucide-react"
```

Agregar el icono `Upload` al import de lucide-react existente (si no está ya). Los iconos `FileUp`, `CheckCircle2`, `XCircle` también.

Agregar tipo para filas del CSV después de los tipos `Inquilino` y `Unidad`:

```ts
type CsvRow = {
  nombre_completo: string
  email: string
  telefono?: string
  numero_apartamento?: string
}

type ImportResult = {
  importados: number
  saltados: number
  errores: number
  detalle: string[]
}
```

- [ ] **Step 3: Agregar estado para el dialog de importación**

Dentro del componente `Inquilinos()`, después de las declaraciones de estado existentes:

```ts
const [csvOpen, setCsvOpen] = useState(false)
const [csvFile, setCsvFile] = useState<File | null>(null)
const [csvPreview, setCsvPreview] = useState<CsvRow[]>([])
const [importing, setImporting] = useState(false)
const [importResult, setImportResult] = useState<ImportResult | null>(null)
const csvInputRef = useRef<HTMLInputElement>(null)
```

El `useRef` ya está importado al inicio del archivo.

- [ ] **Step 4: Agregar función handleCsvFile**

Agregar esta función dentro del componente, después de `resetForm()`:

```ts
function handleCsvFile(file: File) {
  setCsvFile(file)
  setImportResult(null)
  Papa.parse<CsvRow>(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      setCsvPreview(results.data.slice(0, 5))
    },
  })
}
```

- [ ] **Step 5: Agregar función handleImportar**

```ts
async function handleImportar() {
  if (!csvFile || !CONDOMINIO_ID) return
  setImporting(true)
  setImportResult(null)

  Papa.parse<CsvRow>(csvFile, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      const filas = results.data
      let importados = 0
      let saltados = 0
      let errores = 0
      const detalle: string[] = []

      try {
        // 1. Obtener emails existentes en el condominio
        const { data: existentes } = await supabase
          .from("usuarios")
          .select("email")
          .eq("condominio_id", CONDOMINIO_ID)
        const emailsExistentes = new Set((existentes ?? []).map((u: any) => u.email.toLowerCase()))

        // 2. Obtener unidades del condominio para mapear numero_apartamento → unidad_id
        const { data: unidadesData } = await supabase
          .from("unidades")
          .select("id, numero_apartamento")
          .eq("condominio_id", CONDOMINIO_ID)
        const unidadesMap: Record<string, string> = {}
        for (const u of (unidadesData ?? [])) {
          unidadesMap[u.numero_apartamento] = u.id
        }

        // 3. Procesar filas
        for (const fila of filas) {
          const nombre = fila.nombre_completo?.trim()
          const email  = fila.email?.trim().toLowerCase()

          if (!nombre || !email) {
            errores++
            detalle.push(`Fila inválida (faltan nombre o email): "${fila.nombre_completo}" / "${fila.email}"`)
            continue
          }

          if (emailsExistentes.has(email)) {
            saltados++
            detalle.push(`Saltado (duplicado): ${email}`)
            continue
          }

          const unidad_id = fila.numero_apartamento?.trim()
            ? unidadesMap[fila.numero_apartamento.trim()] ?? null
            : null

          const { error: insErr } = await supabase.from("usuarios").insert({
            id:              crypto.randomUUID(),
            nombre_completo: nombre,
            email:           email,
            telefono:        fila.telefono?.trim() || null,
            rol:             "inquilino",
            condominio_id:   CONDOMINIO_ID,
            unidad_id,
          })

          if (insErr) {
            errores++
            detalle.push(`Error al insertar ${email}: ${insErr.message}`)
          } else {
            importados++
            emailsExistentes.add(email)
          }
        }
      } catch (err: any) {
        detalle.push(`Error general: ${err.message}`)
      }

      setImportResult({ importados, saltados, errores, detalle })
      setImporting(false)
      if (importados > 0) {
        await fetchInquilinos()
      }
    },
  })
}
```

- [ ] **Step 6: Agregar botón "Importar CSV" en el header**

En el JSX del componente, localizar el `<div className="flex items-center justify-between flex-wrap gap-4">` al inicio del return. Agregar el botón antes del `<Dialog>` existente:

```tsx
<div className="flex items-center justify-between flex-wrap gap-4">
  <div>
    <h2 className="text-3xl font-bold tracking-tight">Inquilinos</h2>
    <p className="text-muted-foreground mt-1">{inquilinos.length} residentes registrados</p>
  </div>
  <div className="flex gap-2">
    <Button variant="outline" className="gap-2" onClick={() => { setCsvOpen(true); setCsvFile(null); setCsvPreview([]); setImportResult(null) }}>
      <FileUp className="h-4 w-4" />Importar CSV
    </Button>
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
      {/* ... Dialog existente de Agregar Inquilino sin cambios ... */}
    </Dialog>
  </div>
</div>
```

- [ ] **Step 7: Agregar Dialog de importación CSV**

Después del Dialog de "Agregar Inquilino" (cierre del `</Dialog>`), agregar el nuevo Dialog:

```tsx
{/* Dialog: Importar CSV */}
<Dialog open={csvOpen} onOpenChange={v => { if (!v) { setCsvOpen(false); setCsvFile(null); setCsvPreview([]); setImportResult(null) } }}>
  <DialogContent className="sm:max-w-2xl">
    <DialogHeader>
      <DialogTitle>Importar Inquilinos desde CSV</DialogTitle>
    </DialogHeader>
    <div className="space-y-4 py-2">

      {/* Zona de selección de archivo */}
      <div
        className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer bg-secondary/10 hover:bg-secondary/20 transition-all"
        onClick={() => csvInputRef.current?.click()}
      >
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleCsvFile(f) }}
        />
        {csvFile ? (
          <div className="flex flex-col items-center">
            <Upload className="h-10 w-10 text-primary mb-1" />
            <p className="text-sm font-semibold text-primary">{csvFile.name}</p>
            <p className="text-xs text-muted-foreground">Clic para cambiar archivo</p>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Clic para seleccionar un archivo .csv</p>
            <p className="text-xs text-muted-foreground/60">
              Columnas: nombre_completo, email, telefono (opcional), numero_apartamento (opcional)
            </p>
          </>
        )}
      </div>

      {/* Preview de primeras 5 filas */}
      {csvPreview.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Vista previa (primeras {csvPreview.length} filas):</p>
          <div className="overflow-x-auto border border-border rounded-md">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-3 py-2 text-muted-foreground">Nombre</th>
                  <th className="text-left px-3 py-2 text-muted-foreground">Email</th>
                  <th className="text-left px-3 py-2 text-muted-foreground">Teléfono</th>
                  <th className="text-left px-3 py-2 text-muted-foreground">Apt.</th>
                </tr>
              </thead>
              <tbody>
                {csvPreview.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="px-3 py-1.5">{row.nombre_completo || "—"}</td>
                    <td className="px-3 py-1.5">{row.email || "—"}</td>
                    <td className="px-3 py-1.5">{row.telefono || "—"}</td>
                    <td className="px-3 py-1.5">{row.numero_apartamento || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resultado de la importación */}
      {importResult && (
        <div className="space-y-2">
          <div className="flex gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-md px-3 py-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />{importResult.importados} importados
            </span>
            <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-md px-3 py-1.5">
              {importResult.saltados} saltados (duplicados)
            </span>
            {importResult.errores > 0 && (
              <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-1.5">
                <XCircle className="h-3.5 w-3.5" />{importResult.errores} errores
              </span>
            )}
          </div>
          {importResult.detalle.length > 0 && (
            <div className="max-h-32 overflow-y-auto bg-secondary/20 rounded-md p-2 text-xs text-muted-foreground space-y-0.5">
              {importResult.detalle.map((d, i) => <p key={i}>{d}</p>)}
            </div>
          )}
        </div>
      )}
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setCsvOpen(false)}>Cerrar</Button>
      <Button
        onClick={handleImportar}
        disabled={!csvFile || importing}
        className="gap-2"
      >
        {importing && <Loader2 className="h-4 w-4 animate-spin" />}
        Importar
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

- [ ] **Step 8: Verificar en el navegador**

1. Crear un archivo `test.csv` con este contenido:
```
nombre_completo,email,telefono,numero_apartamento
Juan Test,juan.test@email.com,809-111-0001,101
María Test,maria.test@email.com,,
Email Repetido,maria.gonzalez@email.com,,
Sin Email,,809-000-0000,
```

2. Ir a Inquilinos → clic "Importar CSV" → seleccionar `test.csv`
3. Verificar preview: 4 filas con sus datos
4. Clic "Importar"
5. Resultado esperado: `2 importados · 1 saltado (email María González ya existe) · 1 error (sin email)`
6. La tabla de inquilinos se actualiza automáticamente mostrando los 2 nuevos

- [ ] **Step 9: Commit**

```bash
git add web-dashboard/src/pages/Inquilinos.tsx web-dashboard/package.json web-dashboard/package-lock.json
git commit -m "feat: add CSV bulk import for inquilinos with preview and result summary"
```

---

## Self-Review

**Spec coverage:**
- [x] Feature 1 — cuenta bancaria configurable: Task 1 (migración), Task 3 (PaymentGateway prop), Task 4 (Configuracion.tsx), Task 6 (Cobros.tsx fetch + pass)
- [x] Feature 2 — CSV import: Task 7 completo con PapaParse, validación, skip duplicados, bulk insert, resumen
- [x] Feature 3 — IoT URL: Task 2 (.env + IotControl.tsx)
- [x] Feature 4 — audit_log: Task 1 (migración + RLS), Task 4 (insert en Configuracion), Task 5 (página Auditoria.tsx), Task 6 (inserts en Cobros)
- [x] Página /auditoria dedicada solo para admin_condominio: Task 5
- [x] Campos bancarios (banco, tipo_cuenta, numero_cuenta, beneficiario, rnc): consistentes en Tasks 1, 4, 6

**Placeholder scan:** Sin TBD/TODO. Todo el código es completo.

**Type consistency:**
- `BancoCuenta` definido en `PaymentGateway.tsx` y exportado; importado en `Cobros.tsx` con `import PaymentGateway, { type BancoCuenta }`
- `CsvRow` y `ImportResult` definidos en `Inquilinos.tsx` antes de usarse
- `AuditEntry` definido en `Auditoria.tsx` con `usuarios` tipado correctamente
- `profile?.id` usado para `usuario_id` — `profile.id: string` confirmado en `AuthContext.tsx:9`

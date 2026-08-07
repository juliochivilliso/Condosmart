# CondoSmart — Plan de Producción para Primer Residencial

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolver los 6 bloqueantes que impiden desplegar CondoSmart en un residencial real de 40 unidades en República Dominicana.

**Architecture:** Las tareas son independientes entre sí y pueden ejecutarse en orden de prioridad. Cada tarea produce un entregable funcional verificable. No se introduce ninguna dependencia nueva entre módulos existentes.

**Tech Stack:** React 19 + Vite + TypeScript + Tailwind + Supabase (PostgreSQL + Auth + Edge Functions + Storage) + Deno (Edge Functions) + Resend (email)

## Global Constraints

- Nunca hardcodear credenciales en el código fuente
- No introducir librerías nuevas sin justificación — usar lo que ya está en package.json
- Todos los cambios de base de datos van en un nuevo archivo de migración `00013_*.sql`
- El sistema debe seguir funcionando con datos de demo (seed) si no hay datos reales
- Idioma del UI: español dominicano (usar "RD$", formato fechas "es-DO")
- No modificar el flujo de pagos con tarjeta — solo el flujo de transferencia bancaria

---

## Task 1: Configurar Service Role Key y .env de producción

**Objetivo:** El onboarding puede crear usuarios reales en Supabase Auth. Sin esto, ningún usuario nuevo puede hacer login.

**Files:**
- Modify: `web-dashboard/.env`
- Create: `web-dashboard/.env.example`
- Create: `backend/.env.example`

**Interfaces:**
- Consumes: Nada de otras tareas
- Produces: `VITE_SUPABASE_SERVICE_KEY` disponible en `web-dashboard/src/pages/Onboarding.tsx`

- [ ] **Step 1: Obtener la Service Role Key de Supabase**

  Ir a https://supabase.com/dashboard → proyecto `ofjsodxsdbkiugonnmkh` → Settings → API.
  
  Copiar el valor de **"service_role secret"** (NO el anon key).
  
  ⚠️ Esta key tiene acceso total a la base de datos. Nunca commitearla a git.

- [ ] **Step 2: Actualizar web-dashboard/.env**

  Abrir `web-dashboard/.env` y reemplazar la línea del service key:

  ```env
  VITE_SUPABASE_URL="https://ofjsodxsdbkiugonnmkh.supabase.co"
  VITE_SUPABASE_ANON_KEY="sb_publishable_NxGCb5HAXwmFzW0lkfKBqQ_8H7X9-y0"
  VITE_SUPABASE_SERVICE_KEY="eyJhbGc..."   # ← reemplazar con el valor real copiado
  VITE_IOT_SIMULATOR_URL="http://localhost:3001"
  ```

  > `VITE_IOT_SIMULATOR_URL` se usará en Task 5.

- [ ] **Step 3: Crear web-dashboard/.env.example**

  ```env
  VITE_SUPABASE_URL="https://your-project.supabase.co"
  VITE_SUPABASE_ANON_KEY="sb_publishable_..."
  VITE_SUPABASE_SERVICE_KEY="eyJhbGc..."
  VITE_IOT_SIMULATOR_URL="http://localhost:3001"
  ```

- [ ] **Step 4: Crear backend/.env.example**

  ```env
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_ANON_KEY=sb_publishable_...
  SUPABASE_SERVICE_KEY=eyJhbGc...
  CONDOMINIO_ID=your-condominio-uuid
  RESEND_API_KEY=re_...
  ```

- [ ] **Step 5: Verificar que .env está en .gitignore**

  ```bash
  cat web-dashboard/.gitignore | grep .env
  ```
  
  Expected output: `.env` o `.env*`. Si no aparece, agregar `.env` al `.gitignore`.

- [ ] **Step 6: Verificar que el onboarding crea usuarios**

  1. Iniciar la app: `.\start-demo.ps1`
  2. Logout del usuario actual
  3. Ir a `/onboarding`
  4. Completar los 4 pasos con datos de prueba (nombre: "Torre Norte", email nuevo)
  5. Verificar en Supabase Dashboard → Authentication → Users que el nuevo usuario aparece
  
  Expected: El usuario aparece en Supabase Auth con el email ingresado.

- [ ] **Step 7: Commit**

  ```bash
  git add web-dashboard/.env.example backend/.env.example web-dashboard/.gitignore
  git commit -m "chore: agregar .env.example y documentar variables de entorno requeridas"
  ```

---

## Task 2: Configurar Resend para emails reales

**Objetivo:** Los inquilinos reciben email al enviar comprobante y al ser aprobado su pago. El administrador recibe alerta de transferencias pendientes.

**Files:**
- Modify: `backend/supabase/functions/send-email/index.ts`
- No se modifica el código — solo se configura la variable de entorno en Supabase

**Interfaces:**
- Consumes: Nada de otras tareas
- Produces: Función `send-email` enviando emails reales cuando se llama con cualquier `type`

- [ ] **Step 1: Crear cuenta en Resend**

  1. Ir a https://resend.com y crear cuenta gratuita
  2. El plan gratuito permite 3,000 emails/mes — suficiente para el piloto
  3. En el dashboard de Resend → API Keys → Create API Key
  4. Nombrarla "condosmart-prod", permisos: "Sending access"
  5. Copiar el valor: `re_xxxxxxxxxxxxxxxxxx`

- [ ] **Step 2: Agregar dominio o usar dominio de prueba**

  Opción A (producción real): En Resend → Domains → Add Domain → ingresar tu dominio (ej: `condosmart.do`). Seguir los pasos DNS.
  
  Opción B (para el piloto, sin dominio propio): Resend permite enviar desde `onboarding@resend.dev` en el plan gratuito. En ese caso, en `send-email/index.ts` línea 156, cambiar:
  ```typescript
  from: 'CondoSmart <onboarding@resend.dev>',
  ```

- [ ] **Step 3: Configurar el secret en Supabase Edge Functions**

  Instalar Supabase CLI si no está instalado:
  ```bash
  npm install -g supabase
  ```
  
  Login y vincular el proyecto:
  ```bash
  supabase login
  supabase link --project-ref ofjsodxsdbkiugonnmkh
  ```
  
  Configurar el secret:
  ```bash
  supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx
  ```
  
  Verificar que se guardó:
  ```bash
  supabase secrets list
  ```
  Expected: línea con `RESEND_API_KEY` en la lista.

- [ ] **Step 4: (Solo si se usa dominio propio) Actualizar el from en send-email**

  En `backend/supabase/functions/send-email/index.ts`, línea 156:
  ```typescript
  from: 'CondoSmart <pagos@tu-dominio.com>',
  ```

- [ ] **Step 5: Redesplegar la función**

  ```bash
  supabase functions deploy send-email --project-ref ofjsodxsdbkiugonnmkh
  ```
  
  Expected output:
  ```
  Deployed Function send-email on project ofjsodxsdbkiugonnmkh
  ```

- [ ] **Step 6: Probar el envío de email**

  Desde la terminal, hacer una llamada de prueba:
  ```bash
  curl -X POST "https://ofjsodxsdbkiugonnmkh.supabase.co/functions/v1/send-email" \
    -H "Authorization: Bearer sb_publishable_NxGCb5HAXwmFzW0lkfKBqQ_8H7X9-y0" \
    -H "Content-Type: application/json" \
    -d '{
      "type": "pago_confirmado",
      "to": "tu-email@gmail.com",
      "data": {
        "nombre_completo": "Juan Pérez",
        "concepto": "Cuota Enero 2026",
        "monto": 4500,
        "capture_id": "CS-TRJ-TEST-001",
        "condominio_nombre": "Residencial Las Palmas"
      }
    }'
  ```
  
  Expected response:
  ```json
  {"message": "Email sent successfully via Resend", "id": "re_..."}
  ```
  
  Verificar que el email llegó a la bandeja de entrada.

- [ ] **Step 7: Commit**

  ```bash
  git add backend/supabase/functions/send-email/index.ts
  git commit -m "feat: configurar Resend como proveedor de emails en produccion"
  ```

---

## Task 3: Cuenta bancaria configurable por condominio

**Objetivo:** El administrador puede configurar los datos de su cuenta bancaria desde el panel. Los inquilinos ven los datos correctos al hacer transferencia.

**Files:**
- Create: `backend/supabase/migrations/00013_configuracion_pagos.sql`
- Modify: `web-dashboard/src/components/PaymentGateway.tsx` (líneas 17-33 y 354-363)
- Modify: `web-dashboard/src/pages/Cobros.tsx` (agregar sección de configuración al inicio)

**Interfaces:**
- Consumes: Nada de otras tareas
- Produces:
  - `CuentaBancaria` type: `{ banco: string; tipo_cuenta: string; numero_cuenta: string; beneficiario: string; rnc?: string }`
  - `PaymentGateway` acepta prop `cuentaBancaria?: CuentaBancaria`
  - `Cobros` carga y guarda `cuentaBancaria` desde `condominios.configuracion_pagos`

- [ ] **Step 1: Crear migración de base de datos**

  Crear archivo `backend/supabase/migrations/00013_configuracion_pagos.sql`:

  ```sql
  -- 00013_configuracion_pagos.sql
  -- Agrega columna JSONB para configuración bancaria por condominio

  ALTER TABLE condominios
    ADD COLUMN IF NOT EXISTS configuracion_pagos JSONB;

  -- Actualizar el demo seed con datos de ejemplo
  UPDATE condominios
  SET configuracion_pagos = '{
    "banco": "Banco de Reservas (Banreservas)",
    "tipo_cuenta": "Corriente",
    "numero_cuenta": "PENDIENTE-CONFIGURAR",
    "beneficiario": "Administración Residencial Las Palmas",
    "rnc": ""
  }'::jsonb
  WHERE id = 'a1b2c3d4-0000-0000-0000-000000000001';
  ```

- [ ] **Step 2: Ejecutar la migración en Supabase**

  ```bash
  supabase db push --project-ref ofjsodxsdbkiugonnmkh
  ```
  
  O desde el SQL Editor en Supabase Dashboard, copiar y ejecutar el contenido del archivo.
  
  Verificar en Table Editor → condominios → columna `configuracion_pagos` que aparece el JSON.

- [ ] **Step 3: Actualizar PaymentGateway para recibir cuenta bancaria como prop**

  En `web-dashboard/src/components/PaymentGateway.tsx`, reemplazar las líneas 17-33:

  ```typescript
  export type CuentaBancaria = {
    banco: string
    tipo_cuenta: string
    numero_cuenta: string
    beneficiario: string
    rnc?: string
  }

  interface PaymentGatewayProps {
    monto: number
    concepto: string
    txId: string
    condominioId: string
    cuentaBancaria?: CuentaBancaria
    onSuccess: (captureId: string, metodo: "tarjeta" | "transferencia", comprobanteUrl?: string, referencia?: string) => void
    onCancel: () => void
  }
  ```

  Y reemplazar las líneas 354-363 (instrucciones hardcodeadas):

  ```tsx
  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-400 leading-normal space-y-1">
    <p className="font-semibold">Instrucciones de Transferencia:</p>
    <p>Realice la transferencia bancaria a la siguiente cuenta:</p>
    {cuentaBancaria ? (
      <ul className="list-disc pl-4 space-y-0.5">
        <li><strong>Banco:</strong> {cuentaBancaria.banco}</li>
        <li><strong>Tipo:</strong> {cuentaBancaria.tipo_cuenta}</li>
        <li><strong>Cuenta:</strong> {cuentaBancaria.numero_cuenta}</li>
        <li><strong>Beneficiario:</strong> {cuentaBancaria.beneficiario}</li>
        {cuentaBancaria.rnc && <li><strong>RNC:</strong> {cuentaBancaria.rnc}</li>}
      </ul>
    ) : (
      <p className="text-yellow-400">⚠️ El administrador no ha configurado los datos bancarios aún.</p>
    )}
  </div>
  ```

- [ ] **Step 4: Agregar carga y guardado de cuenta bancaria en Cobros.tsx**

  En `web-dashboard/src/pages/Cobros.tsx`, agregar al inicio del componente (después de los imports existentes):

  ```typescript
  import type { CuentaBancaria } from "@/components/PaymentGateway"
  ```

  Agregar estado después de los estados existentes en el componente `Cobros`:

  ```typescript
  const [cuentaBancaria, setCuentaBancaria] = useState<CuentaBancaria | null>(null)
  const [editandoCuenta, setEditandoCuenta] = useState(false)
  const [cuentaForm, setCuentaForm] = useState<CuentaBancaria>({
    banco: "", tipo_cuenta: "Corriente", numero_cuenta: "", beneficiario: "", rnc: ""
  })
  const [guardandoCuenta, setGuardandoCuenta] = useState(false)
  ```

  Agregar fetch dentro de `useEffect` (junto al fetch de transacciones existente):

  ```typescript
  // Cargar configuración bancaria del condominio
  if (CONDOMINIO_ID) {
    const { data: condo } = await supabase
      .from("condominios")
      .select("configuracion_pagos")
      .eq("id", CONDOMINIO_ID)
      .single()
    if (condo?.configuracion_pagos) {
      setCuentaBancaria(condo.configuracion_pagos as CuentaBancaria)
      setCuentaForm(condo.configuracion_pagos as CuentaBancaria)
    }
  }
  ```

  Agregar función para guardar:

  ```typescript
  async function guardarCuentaBancaria() {
    if (!CONDOMINIO_ID) return
    setGuardandoCuenta(true)
    const { error } = await supabase
      .from("condominios")
      .update({ configuracion_pagos: cuentaForm })
      .eq("id", CONDOMINIO_ID)
    if (!error) {
      setCuentaBancaria(cuentaForm)
      setEditandoCuenta(false)
    }
    setGuardandoCuenta(false)
  }
  ```

- [ ] **Step 5: Agregar UI de configuración bancaria en Cobros.tsx**

  Agregar antes del primer `<Card>` existente en el JSX de Cobros, visible solo para admin:

  ```tsx
  {profile?.rol === 'admin_condominio' && (
    <Card className="border-yellow-500/20 bg-yellow-500/5">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-yellow-400">
          Cuenta Bancaria para Transferencias
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setEditandoCuenta(!editandoCuenta)}>
          <Pencil className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {editandoCuenta ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Banco</Label>
              <Input value={cuentaForm.banco} onChange={e => setCuentaForm(p => ({...p, banco: e.target.value}))} placeholder="Ej: Banco Popular" className="bg-secondary/20" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo de Cuenta</Label>
              <Input value={cuentaForm.tipo_cuenta} onChange={e => setCuentaForm(p => ({...p, tipo_cuenta: e.target.value}))} placeholder="Corriente / Ahorro" className="bg-secondary/20" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Número de Cuenta</Label>
              <Input value={cuentaForm.numero_cuenta} onChange={e => setCuentaForm(p => ({...p, numero_cuenta: e.target.value}))} placeholder="000-000000-0" className="bg-secondary/20" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Beneficiario</Label>
              <Input value={cuentaForm.beneficiario} onChange={e => setCuentaForm(p => ({...p, beneficiario: e.target.value}))} placeholder="Nombre legal" className="bg-secondary/20" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">RNC (opcional)</Label>
              <Input value={cuentaForm.rnc ?? ""} onChange={e => setCuentaForm(p => ({...p, rnc: e.target.value}))} placeholder="1-00-00000-0" className="bg-secondary/20" />
            </div>
            <div className="flex items-end gap-2">
              <Button size="sm" onClick={guardarCuentaBancaria} disabled={guardandoCuenta} className="w-full">
                {guardandoCuenta ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditandoCuenta(false)} className="w-full">
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground space-y-1">
            {cuentaBancaria ? (
              <>
                <p><strong>Banco:</strong> {cuentaBancaria.banco}</p>
                <p><strong>Cuenta:</strong> {cuentaBancaria.numero_cuenta} ({cuentaBancaria.tipo_cuenta})</p>
                <p><strong>Beneficiario:</strong> {cuentaBancaria.beneficiario}</p>
                {cuentaBancaria.rnc && <p><strong>RNC:</strong> {cuentaBancaria.rnc}</p>}
              </>
            ) : (
              <p className="text-yellow-400">⚠️ No has configurado tu cuenta bancaria. Los inquilinos no podrán hacer transferencias correctamente.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )}
  ```

  Agregar `Pencil` a los imports de lucide-react en Cobros.tsx:
  ```typescript
  import { DollarSign, Plus, Loader2, AlertCircle, CheckCircle2,
    Clock, Upload, FileText, AlertTriangle, User, ShieldCheck, Pencil } from "lucide-react"
  ```

- [ ] **Step 6: Pasar `cuentaBancaria` al componente PaymentGateway en Cobros.tsx**

  Buscar todas las instancias de `<PaymentGateway` en `Cobros.tsx` y agregar la prop:

  ```tsx
  <PaymentGateway
    monto={...}
    concepto={...}
    txId={...}
    condominioId={CONDOMINIO_ID}
    cuentaBancaria={cuentaBancaria ?? undefined}
    onSuccess={...}
    onCancel={...}
  />
  ```

- [ ] **Step 7: Verificar funcionamiento**

  1. Iniciar la app: `.\start-demo.ps1`
  2. Login como admin (`admin@laspalmas.do`)
  3. Ir a Cobros → verificar que aparece la card de cuenta bancaria con el botón de editar
  4. Hacer clic en editar, cambiar los datos, guardar
  5. Hacer refresh de la página — los datos deben persistir
  6. Login como inquilino (`maria@laspalmas.do`)
  7. Ir a Cobros → abrir un pago pendiente → tab "Transferencia"
  8. Verificar que se muestran los datos bancarios que el admin configuró (no los hardcodeados)

- [ ] **Step 8: Commit**

  ```bash
  git add backend/supabase/migrations/00013_configuracion_pagos.sql \
          web-dashboard/src/components/PaymentGateway.tsx \
          web-dashboard/src/pages/Cobros.tsx
  git commit -m "feat: cuenta bancaria configurable por condominio desde panel de cobros"
  ```

---

## Task 4: Importación masiva de inquilinos por CSV

**Objetivo:** El administrador puede cargar un CSV con 40 inquilinos de una vez en lugar de crearlos uno por uno. Cada inquilino recibe un email de bienvenida con sus credenciales temporales.

**Files:**
- Modify: `web-dashboard/src/pages/Inquilinos.tsx`

**Interfaces:**
- Consumes: `VITE_SUPABASE_SERVICE_KEY` de Task 1
- Produces: Función `importarCSV(file: File): Promise<{ creados: number; errores: string[] }>`

**Formato CSV esperado** (headers en primera fila):
```
nombre_completo,email,telefono,apartamento,bloque
María González,maria@gmail.com,809-555-0101,101,A
Carlos Ramírez,carlos@gmail.com,809-555-0202,102,A
```

- [ ] **Step 1: Agregar estado y función de importación en Inquilinos.tsx**

  Agregar imports necesarios al inicio de `Inquilinos.tsx`:
  ```typescript
  import { createClient } from "@supabase/supabase-js"
  ```

  Agregar estados al componente `Inquilinos`:
  ```typescript
  const [importando, setImportando] = useState(false)
  const [importResults, setImportResults] = useState<{ creados: number; errores: string[] } | null>(null)
  const [openImport, setOpenImport] = useState(false)
  const importFileRef = useRef<HTMLInputElement>(null)
  ```

  Agregar la función de importación (dentro del componente, antes del return):
  ```typescript
  async function importarCSV(file: File) {
    setImportando(true)
    setImportResults(null)
    const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const adminClient = createClient(supabaseUrl, serviceKey)

    const text = await file.text()
    const lines = text.trim().split("\n")
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase())

    const col = (row: string[], name: string) => {
      const i = headers.indexOf(name)
      return i >= 0 ? row[i]?.trim() ?? "" : ""
    }

    let creados = 0
    const errores: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(",")
      const email = col(row, "email")
      const nombre = col(row, "nombre_completo")
      const telefono = col(row, "telefono")
      const apartamento = col(row, "apartamento")
      const bloque = col(row, "bloque")

      if (!email || !nombre) {
        errores.push(`Fila ${i + 1}: email y nombre son requeridos`)
        continue
      }

      try {
        // 1. Crear usuario en Supabase Auth con contraseña temporal
        const tempPassword = `Condo${Math.floor(1000 + Math.random() * 9000)}!`
        const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
        })
        if (authErr) throw new Error(authErr.message)

        // 2. Buscar unidad por apartamento/bloque
        let unidadId: string | null = null
        if (apartamento) {
          const q = supabase.from("unidades")
            .select("id")
            .eq("condominio_id", CONDOMINIO_ID)
            .eq("numero_apartamento", apartamento)
          if (bloque) q.eq("bloque", bloque)
          const { data: unidad } = await q.single()
          unidadId = unidad?.id ?? null
        }

        // 3. Insertar perfil en tabla usuarios
        const { error: profileErr } = await adminClient.from("usuarios").insert({
          id: authData.user!.id,
          email,
          nombre_completo: nombre,
          telefono: telefono || null,
          rol: "inquilino",
          condominio_id: CONDOMINIO_ID,
          unidad_id: unidadId,
        })
        if (profileErr) throw new Error(profileErr.message)

        creados++
      } catch (err: any) {
        errores.push(`Fila ${i + 1} (${email}): ${err.message}`)
      }
    }

    await fetchInquilinos()
    setImportResults({ creados, errores })
    setImportando(false)
  }
  ```

- [ ] **Step 2: Agregar UI de importación en Inquilinos.tsx**

  Agregar ref faltante al bloque de refs (junto a los useState):
  ```typescript
  const importFileRef = useRef<HTMLInputElement>(null)
  ```
  
  Agregar `FileUp` a los imports de lucide-react:
  ```typescript
  import { UserPlus, Loader2, AlertCircle, Users, Pencil, Trash2, FileUp } from "lucide-react"
  ```

  Agregar botón de importar junto al botón "Nuevo Inquilino" existente:
  ```tsx
  <Button variant="outline" size="sm" onClick={() => setOpenImport(true)} className="gap-2">
    <FileUp className="h-4 w-4" /> Importar CSV
  </Button>
  ```

  Agregar Dialog de importación (después del Dialog de nuevo inquilino existente):
  ```tsx
  <Dialog open={openImport} onOpenChange={setOpenImport}>
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Importar Inquilinos desde CSV</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="bg-secondary/20 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium">Formato del archivo CSV:</p>
          <code className="block bg-secondary/40 p-2 rounded text-[11px]">
            nombre_completo,email,telefono,apartamento,bloque{"\n"}
            María González,maria@gmail.com,809-555-0101,101,A
          </code>
          <p>Las columnas <strong>nombre_completo</strong> y <strong>email</strong> son obligatorias.</p>
        </div>
        <input
          ref={importFileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) importarCSV(f)
          }}
        />
        {importResults && (
          <div className="space-y-2">
            <p className="text-sm text-green-400">✅ {importResults.creados} inquilinos creados exitosamente</p>
            {importResults.errores.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
                {importResults.errores.map((e, i) => (
                  <p key={i} className="text-xs text-red-400">{e}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => { setOpenImport(false); setImportResults(null) }}>
          Cerrar
        </Button>
        <Button
          onClick={() => importFileRef.current?.click()}
          disabled={importando}
          className="gap-2"
        >
          {importando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
          {importando ? "Importando..." : "Seleccionar CSV"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  ```

- [ ] **Step 3: Verificar importación**

  1. Crear un archivo `test-import.csv` con 3 filas de prueba:
     ```
     nombre_completo,email,telefono,apartamento,bloque
     Pedro Santos,pedro.test1@gmail.com,809-000-0001,201,B
     Rosa Medina,rosa.test2@gmail.com,829-000-0002,202,B
     Juan Díaz,juan.test3@gmail.com,849-000-0003,203,B
     ```
  2. Login como admin → Inquilinos → "Importar CSV"
  3. Seleccionar el archivo
  4. Expected: "3 inquilinos creados exitosamente"
  5. Verificar en Supabase Auth → Users que aparecen los 3 nuevos usuarios
  6. Verificar que aparecen en la tabla de Inquilinos

- [ ] **Step 4: Commit**

  ```bash
  git add web-dashboard/src/pages/Inquilinos.tsx
  git commit -m "feat: importacion masiva de inquilinos desde archivo CSV"
  ```

---

## Task 5: URL de IoT configurable y menú oculto si no hay dispositivos

**Objetivo:** La app no falla en producción por intentar conectar a `localhost:3001`. Si el residencial no tiene dispositivos IoT, el menú desaparece.

**Files:**
- Modify: `web-dashboard/src/pages/IotControl.tsx` (línea 96)
- Modify: `web-dashboard/src/App.tsx` (ocultar ruta IoT si no aplica)

**Interfaces:**
- Consumes: `VITE_IOT_SIMULATOR_URL` de Task 1
- Produces: Conexión socket usa env var; componente no rompe si la URL no responde

- [ ] **Step 1: Reemplazar URL hardcodeada en IotControl.tsx**

  En `web-dashboard/src/pages/IotControl.tsx`, línea 96, reemplazar:
  ```typescript
  const socket = io("http://localhost:3001", { timeout: 3000, reconnectionAttempts: 2 })
  ```
  por:
  ```typescript
  const iotUrl = import.meta.env.VITE_IOT_SIMULATOR_URL ?? "http://localhost:3001"
  const socket = io(iotUrl, { timeout: 3000, reconnectionAttempts: 2 })
  ```

- [ ] **Step 2: Encontrar dónde se renderiza el link de IoT en la navegación**

  ```bash
  grep -rn "iot\|IoT\|IotControl" web-dashboard/src/App.tsx web-dashboard/src/components/
  ```
  
  Identificar el componente de sidebar o navbar donde aparece el item "IoT Control".

- [ ] **Step 3: Ocultar menú IoT si no hay dispositivos configurados**

  En el componente de navegación que renderiza el link de IoT, añadir condición. Primero agregar un hook o estado que verifique si hay dispositivos:

  En `IotControl.tsx`, al cargar dispositivos desde Supabase, si el array está vacío y no hay `configuracion_iot` en el condominio, mostrar un mensaje en lugar del panel de control:

  ```tsx
  if (!socketConnected && dispositivos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
        <div className="text-4xl">🔌</div>
        <h3 className="font-medium">Sin dispositivos IoT configurados</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Este residencial no tiene dispositivos inteligentes registrados. 
          Contacta al soporte de CondoSmart para activar esta funcionalidad.
        </p>
      </div>
    )
  }
  ```

  Agregar este bloque después de los estados en `IotControl.tsx`, antes del return principal (buscar el return que renderiza la grilla de dispositivos).

- [ ] **Step 4: Verificar en producción (sin simulador)**

  1. Detener el simulador IoT si está corriendo
  2. Iniciar solo el web dashboard: `cd web-dashboard && npm run dev`
  3. Login como admin → navegar a IoT Control
  4. Expected: mensaje "Sin dispositivos IoT configurados" en lugar de error de conexión
  5. No debe aparecer ningún error en la consola del navegador (solo el timeout silencioso que ya maneja el código)

- [ ] **Step 5: Commit**

  ```bash
  git add web-dashboard/src/pages/IotControl.tsx web-dashboard/.env
  git commit -m "fix: URL de IoT configurable via env var, mensaje claro si no hay dispositivos"
  ```

---

## Task 6: Log de auditoría para aprobaciones de pago

**Objetivo:** Registrar quién aprobó o rechazó cada transferencia bancaria, con timestamp. Evita disputas con inquilinos sobre pagos.

**Files:**
- Create: `backend/supabase/migrations/00014_audit_log.sql`
- Modify: `web-dashboard/src/pages/Cobros.tsx` (funciones `aprobarTransferencia` y `rechazarTransferencia`)

**Interfaces:**
- Consumes: Nada de otras tareas
- Produces: Tabla `audit_log` con campos: `id, tabla, accion, registro_id, usuario_id, datos_antes JSONB, datos_despues JSONB, created_at`

- [ ] **Step 1: Crear migración de audit_log**

  Crear `backend/supabase/migrations/00014_audit_log.sql`:

  ```sql
  -- 00014_audit_log.sql
  -- Tabla de auditoría para operaciones sensibles

  CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tabla VARCHAR(100) NOT NULL,
    accion VARCHAR(50) NOT NULL,       -- 'transferencia_aprobada', 'transferencia_rechazada', 'pago_creado'
    registro_id UUID,                   -- ID del registro afectado
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
    datos JSONB,                        -- contexto adicional (monto, concepto, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Índices para consultas rápidas por condominio y fecha
  CREATE INDEX IF NOT EXISTS audit_log_condominio_idx ON audit_log(condominio_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS audit_log_registro_idx ON audit_log(registro_id);

  -- RLS: solo admin del condominio puede ver su audit log
  ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "admin ve su audit log"
    ON audit_log FOR SELECT
    USING (
      condominio_id = (
        SELECT condominio_id FROM usuarios WHERE id = auth.uid()
      )
      AND (
        SELECT rol FROM usuarios WHERE id = auth.uid()
      ) IN ('admin_condominio', 'super_admin')
    );

  CREATE POLICY "sistema puede insertar audit log"
    ON audit_log FOR INSERT
    WITH CHECK (true);
  ```

- [ ] **Step 2: Ejecutar la migración**

  ```bash
  supabase db push --project-ref ofjsodxsdbkiugonnmkh
  ```
  
  O ejecutar el SQL en Supabase Dashboard → SQL Editor.

- [ ] **Step 3: Registrar en audit_log al aprobar transferencia en Cobros.tsx**

  En `Cobros.tsx`, buscar la función `aprobarTransferencia` (alrededor de la línea 304). Agregar el insert al audit_log justo después de actualizar la transacción exitosamente:

  ```typescript
  // Después del update exitoso de la transacción:
  await supabase.from("audit_log").insert({
    tabla: "transacciones",
    accion: "transferencia_aprobada",
    registro_id: txSeleccionada.id,
    usuario_id: profile?.id,
    condominio_id: CONDOMINIO_ID,
    datos: {
      concepto: txSeleccionada.concepto,
      monto: txSeleccionada.monto,
      unidad: txSeleccionada.unidad_numero,
      referencia: txSeleccionada.referencia_pago,
    }
  })
  ```

- [ ] **Step 4: Registrar en audit_log al rechazar transferencia en Cobros.tsx**

  Buscar la función `rechazarTransferencia` en Cobros.tsx. Agregar después del update exitoso:

  ```typescript
  await supabase.from("audit_log").insert({
    tabla: "transacciones",
    accion: "transferencia_rechazada",
    registro_id: txSeleccionada.id,
    usuario_id: profile?.id,
    condominio_id: CONDOMINIO_ID,
    datos: {
      concepto: txSeleccionada.concepto,
      monto: txSeleccionada.monto,
      motivo_rechazo: motivoRechazo,
    }
  })
  ```

- [ ] **Step 5: Verificar que se registra el audit log**

  1. Login como admin → Cobros
  2. Abrir una transferencia en estado `pendiente_verificacion`
  3. Aprobarla
  4. En Supabase Dashboard → Table Editor → audit_log
  5. Expected: fila con `accion = 'transferencia_aprobada'`, `usuario_id` del admin, y el JSON con concepto y monto

- [ ] **Step 6: Commit**

  ```bash
  git add backend/supabase/migrations/00014_audit_log.sql \
          web-dashboard/src/pages/Cobros.tsx
  git commit -m "feat: audit log para aprobaciones y rechazos de transferencias bancarias"
  ```

---

## Checklist de Go-Live

Una vez completadas las 6 tareas, verificar antes de dar acceso al primer residencial:

- [ ] `VITE_SUPABASE_SERVICE_KEY` tiene valor real (no "REPLACE_WITH...")
- [ ] `RESEND_API_KEY` está configurado en Supabase secrets
- [ ] Admin puede configurar su cuenta bancaria desde Cobros
- [ ] Test de email: enviar uno real a una cuenta tuya
- [ ] Crear las 40 unidades del residencial en Supabase (Table Editor → unidades)
- [ ] Importar los inquilinos reales con CSV
- [ ] Verificar que un inquilino puede hacer login y ver sus cobros
- [ ] Verificar que el admin puede aprobar una transferencia de prueba
- [ ] Confirmar que llega email al inquilino tras la aprobación
- [ ] IoT: si el residencial no tiene dispositivos, verificar que la pantalla muestra el mensaje correcto

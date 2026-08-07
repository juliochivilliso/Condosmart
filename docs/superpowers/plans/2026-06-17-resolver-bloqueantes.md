# Resolver Bloqueantes CondoSmart — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolver los 3 bloqueantes que impiden una demo limpia: (1) configurar la service key de Supabase, (2) mover credenciales hardcodeadas de setup-db.mjs a variables de entorno, (3) agregar flujo completo de recuperación de contraseña.

**Architecture:** Cambios de configuración en .env y setup-db.mjs, plus dos nuevos archivos en el web dashboard (UpdatePassword.tsx) y modificaciones a Login.tsx y App.tsx para el flujo de reset.

**Tech Stack:** React 19 + TypeScript + Vite + Supabase JS v2 + react-router-dom v7 + Tailwind + Radix UI

---

## Pre-requisito manual (REQUERIDO antes del Task 1)

El usuario debe obtener la **Service Role Key** de Supabase:

1. Ir a [https://supabase.com/dashboard](https://supabase.com/dashboard) → proyecto `ofjsodxsdbkiugonnmkh`
2. Settings → API → copiar **service_role** key (empieza con `eyJ...`)
3. Tener el valor listo para el Task 1

---

## File Map

| Archivo | Acción | Propósito |
|---|---|---|
| `web-dashboard/.env` | Modificar | Agregar service key real |
| `backend/.env` | Crear | Variables para setup-db.mjs |
| `backend/setup-db.mjs` | Modificar | Leer credenciales desde process.env |
| `web-dashboard/src/pages/Login.tsx` | Modificar | Agregar link "¿Olvidaste tu contraseña?" |
| `web-dashboard/src/pages/UpdatePassword.tsx` | Crear | Página para establecer nueva contraseña |
| `web-dashboard/src/App.tsx` | Modificar | Agregar ruta `/update-password` (pública) |

---

## Task 1: Configurar VITE_SUPABASE_SERVICE_KEY

**Files:**
- Modify: `web-dashboard/.env`

- [ ] **Step 1: Reemplazar el placeholder en .env**

Abrir `web-dashboard/.env` y reemplazar la línea:
```
VITE_SUPABASE_SERVICE_KEY="REPLACE_WITH_YOUR_SERVICE_ROLE_KEY"
```
con:
```
VITE_SUPABASE_SERVICE_KEY="eyJ..."   ← pegar aquí la service_role key real
```

- [ ] **Step 2: Verificar que supabaseAdmin ya no es null**

Abrir `web-dashboard/src/lib/supabase.ts`. Confirmar que la lógica existente ya maneja el caso correcto:

```typescript
export const supabaseAdmin: SupabaseClient | null =
  isValidUrl(supabaseUrl) && supabaseServiceKey && !supabaseServiceKey.startsWith('REPLACE')
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
```

Con la key real configurada, `supabaseAdmin` dejará de ser `null` automáticamente. No hay cambio de código necesario aquí.

- [ ] **Step 3: Probar que Onboarding puede crear usuarios**

Ejecutar `.\start-demo.ps1`, iniciar sesión como super admin (`superadmin@condosmart.do` / `CondoSmart2026!`), ir a **Nuevo Residencial**, completar los 4 pasos.

Verificar en Supabase Dashboard → Authentication → Users que el nuevo usuario aparece creado.

Si aparece el banner amarillo *"VITE_SUPABASE_SERVICE_KEY no configurada"* en el Step 2 del Onboarding, la key no está siendo leída — verificar que no hay espacios extra ni comillas dobles anidadas en el `.env`.

---

## Task 2: Mover credenciales hardcodeadas en setup-db.mjs

**Files:**
- Create: `backend/.env`
- Modify: `backend/setup-db.mjs`

- [ ] **Step 1: Crear `backend/.env`**

Crear el archivo `backend/.env` con el siguiente contenido (mismas credenciales que ya existen en el código, más la service key):

```env
SUPABASE_URL=https://ofjsodxsdbkiugonnmkh.supabase.co
SUPABASE_ANON_KEY=sb_publishable_NxGCb5HAXwmFzW0lkfKBqQ_8H7X9-y0
SUPABASE_SERVICE_KEY=eyJ...   ← misma service_role key del Task 1
CONDOMINIO_ID=a1b2c3d4-0000-0000-0000-000000000001
```

- [ ] **Step 2: Instalar dotenv en backend**

Ejecutar en terminal desde `backend/`:
```bash
npm init -y
npm install dotenv
```

Verificar que aparece `node_modules/` y `package.json` en `backend/`.

- [ ] **Step 3: Actualizar setup-db.mjs para leer desde process.env**

Reemplazar el bloque de constantes hardcodeadas al inicio de `backend/setup-db.mjs`:

```javascript
// ANTES (eliminar estas líneas):
const SUPABASE_URL = 'https://ofjsodxsdbkiugonnmkh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NxGCb5HAXwmFzW0lkfKBqQ_8H7X9-y0';
const CONDOMINIO_ID = 'a1b2c3d4-0000-0000-0000-000000000001';
```

```javascript
// DESPUÉS (agregar al inicio del archivo, antes del import de supabase-js):
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const CONDOMINIO_ID = process.env.CONDOMINIO_ID ?? 'a1b2c3d4-0000-0000-0000-000000000001';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Falta SUPABASE_URL o SUPABASE_ANON_KEY en backend/.env');
  process.exit(1);
}
```

- [ ] **Step 4: Verificar que setup-db.mjs sigue funcionando**

Desde `backend/`, ejecutar:
```bash
node setup-db.mjs
```

Salida esperada (sin errores):
```
🚀 Iniciando configuración de base de datos CondoSmart...
📦 Insertando condominio...
  ✅ Condominio OK
🏠 Insertando unidades...
  ✅ Unidades OK (5)
...
✅ ¡Setup completado!
```

Si aparece `❌ Falta SUPABASE_URL`, verificar que el archivo `backend/.env` existe y que `dotenv` está instalado.

- [ ] **Step 5: Aplicar el mismo fix a `backend/test-db.mjs`**

Abrir `backend/test-db.mjs`. Si también tiene credenciales hardcodeadas, aplicar el mismo bloque de dotenv al inicio:

```javascript
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();
```

Y reemplazar las constantes hardcodeadas con `process.env.SUPABASE_URL`, `process.env.SUPABASE_ANON_KEY`.

---

## Task 3: Flujo de recuperación de contraseña

**Files:**
- Create: `web-dashboard/src/pages/UpdatePassword.tsx`
- Modify: `web-dashboard/src/pages/Login.tsx`
- Modify: `web-dashboard/src/App.tsx`

### Contexto

Supabase envía un email con un link que redirige a la app con un token en el hash de la URL. El evento `PASSWORD_RECOVERY` en `onAuthStateChange` indica que el usuario llegó desde ese link. Se necesita:

1. Un link "¿Olvidaste tu contraseña?" en Login que llama a `supabase.auth.resetPasswordForEmail()`
2. Una página `/update-password` donde el usuario ingresa su nueva contraseña

### Configuración en Supabase Dashboard (manual, hacer primero)

Ir a Supabase Dashboard → Authentication → URL Configuration → añadir a **Redirect URLs**:
```
http://localhost:5173/update-password
```

- [ ] **Step 1: Crear `UpdatePassword.tsx`**

Crear `web-dashboard/src/pages/UpdatePassword.tsx`:

```typescript
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Building2, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function UpdatePassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Supabase establece sesión automáticamente al detectar el token en el hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        // sesión activa — el usuario puede cambiar su contraseña
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.")
      return
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setDone(true)
      setTimeout(() => navigate("/login"), 2500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al actualizar la contraseña.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-10 w-10 text-primary" />
            <span className="text-4xl font-bold text-foreground tracking-tighter">CondoSmart</span>
          </div>
          <p className="text-muted-foreground text-sm font-medium">Establece tu nueva contraseña</p>
        </div>

        <Card className="border-border/60 shadow-2xl bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2 pt-6 px-6">
            <h2 className="text-lg font-semibold text-foreground text-center">Nueva contraseña</h2>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {done ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle2 className="h-12 w-12 text-green-400" />
                <p className="text-sm text-center text-muted-foreground">
                  Contraseña actualizada. Redirigiendo al inicio de sesión...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-password">Nueva contraseña</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Repite la contraseña"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="text-sm text-destructive font-medium bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 text-center">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full mt-2" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    "Actualizar contraseña"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Agregar estado y lógica de reset en Login.tsx**

En `web-dashboard/src/pages/Login.tsx`, reemplazar el estado inicial:

```typescript
// ANTES:
const [email, setEmail] = useState("")
const [password, setPassword] = useState("")
const [showPassword, setShowPassword] = useState(false)
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
```

```typescript
// DESPUÉS:
const [email, setEmail] = useState("")
const [password, setPassword] = useState("")
const [showPassword, setShowPassword] = useState(false)
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const [resetMode, setResetMode] = useState(false)
const [resetSent, setResetSent] = useState(false)
```

- [ ] **Step 3: Agregar función handleReset en Login.tsx**

Justo después de `handleSubmit`, agregar:

```typescript
const handleReset = async (e: React.FormEvent) => {
  e.preventDefault()
  setError(null)
  setLoading(true)
  try {
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })
    if (resetError) throw resetError
    setResetSent(true)
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : "No se pudo enviar el correo.")
  } finally {
    setLoading(false)
  }
}
```

- [ ] **Step 4: Agregar UI de reset en el JSX de Login.tsx**

Localizar el bloque dentro de `<CardContent>` que contiene el `<form onSubmit={handleSubmit}>`. Reemplazar **todo** el contenido de `<CardContent>` con:

```typescript
<CardContent className="px-6 pb-6">
  {resetMode ? (
    resetSent ? (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <p className="text-sm text-muted-foreground">
          Si el correo existe, recibirás un enlace para restablecer tu contraseña.
        </p>
        <button
          className="text-xs text-primary underline underline-offset-2"
          onClick={() => { setResetMode(false); setResetSent(false); setError(null) }}
        >
          Volver al inicio de sesión
        </button>
      </div>
    ) : (
      <form onSubmit={handleReset} className="flex flex-col gap-5">
        <p className="text-sm text-muted-foreground text-center">
          Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
        </p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reset-email">Correo electrónico</Label>
          <Input
            id="reset-email"
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        {error && (
          <div className="text-sm text-destructive font-medium bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 text-center">
            {error}
          </div>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</> : "Enviar enlace"}
        </Button>
        <button
          type="button"
          className="text-xs text-muted-foreground underline underline-offset-2 text-center"
          onClick={() => { setResetMode(false); setError(null) }}
        >
          Cancelar
        </button>
      </form>
    )
  ) : (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-email">Correo electrónico</Label>
        <Input
          id="login-email"
          type="email"
          placeholder="correo@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <Label htmlFor="login-password">Contraseña</Label>
          <button
            type="button"
            className="text-xs text-primary underline underline-offset-2"
            onClick={() => { setResetMode(true); setError(null) }}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-destructive font-medium bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 text-center">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full mt-2" disabled={loading}>
        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Autenticando...</> : "Iniciar sesión"}
      </Button>
    </form>
  )}
</CardContent>
```

- [ ] **Step 5: Registrar la ruta `/update-password` en App.tsx**

En `web-dashboard/src/App.tsx`:

1. Agregar el import al inicio (junto a los demás imports de páginas):
```typescript
import UpdatePassword from "@/pages/UpdatePassword"
```

2. Localizar el bloque de rutas. La ruta `path="/login"` ya existe. Agregar inmediatamente después:
```typescript
<Route path="/update-password" element={<UpdatePassword />} />
```

El bloque de rutas en `App.tsx` quedará así:
```typescript
function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/update-password" element={<UpdatePassword />} />

      {/* Rutas para admin_condominio y super_admin */}
      <Route element={<ProtectedRoute allowedRoles={['admin_condominio', 'super_admin']} />}>
        ...
```

- [ ] **Step 6: Verificar el flujo completo**

1. Ejecutar `.\start-demo.ps1`
2. Ir a `http://localhost:5173/login`
3. Verificar que aparece el link "¿Olvidaste tu contraseña?" debajo del label de contraseña
4. Hacer clic → verificar que aparece el formulario de email
5. Ingresar `superadmin@condosmart.do` → clic en "Enviar enlace"
6. Verificar el mensaje de confirmación: *"Si el correo existe, recibirás un enlace..."*
7. Verificar que "Cancelar" vuelve al formulario de login normalmente
8. (Opcional si hay email real configurado en Supabase): Abrir el email y verificar que el link redirige a `/update-password` correctamente

---

## Verificación final

Después de completar los 3 tasks:

- [ ] `supabaseAdmin` no es null (verificar que el banner amarillo desaparece en Onboarding step 2)
- [ ] `node setup-db.mjs` corre sin errores desde `backend/` sin credenciales en el código
- [ ] Login muestra "¿Olvidaste tu contraseña?" y el flujo de reset funciona
- [ ] `start-demo.ps1` levanta todo sin errores

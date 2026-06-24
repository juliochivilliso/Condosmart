# CondoSmart — Publicación y Comercialización: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auditar el sistema, resolver issues bloqueantes, elevar la UI/UX, y desplegar CondoSmart a Vercel con el primer residencial real operando.

**Architecture:** 5 fases secuenciales — cada fase produce un entregable verificable antes de avanzar a la siguiente. La Fase 1 (Audit) es prerequisito de todas las demás. Las Fases 3 y 4 (diseño) se ejecutan solo cuando no queden issues P0/P1 abiertos. El deploy (Fase 5) ocurre después de que el diseño esté aplicado.

**Tech Stack:** React 19 + Vite + TypeScript + Tailwind + Radix UI + Supabase (PostgreSQL + Auth + Edge Functions + pg_cron) + Resend (email) + Flutter (mobile) + Vercel (deploy)

## Global Constraints

- Nunca hardcodear credenciales en el código fuente
- No introducir librerías nuevas sin justificación — usar lo que ya está en `package.json`
- El sistema debe seguir funcionando con datos de demo (seed) si no hay datos reales
- Idioma del UI: español dominicano (RD$, formato fechas es-DO)
- No modificar el flujo de pagos con tarjeta — solo flujo de transferencia bancaria
- Proyecto Supabase: `ofjsodxsdbkiugonnmkh`
- Web dashboard en: `web-dashboard/`
- Mobile app en: `mobile-app/`
- Edge functions en: `backend/supabase/functions/`

---

## Task 1: Audit Funcional Completo

**Files:**
- Read: `web-dashboard/.env`
- Read: `web-dashboard/src/pages/IotControl.tsx`
- Read: `web-dashboard/src/pages/Onboarding.tsx`
- Read: `backend/supabase/functions/send-email/index.ts`

**Interfaces:**
- Consumes: Nada
- Produces: Lista de hallazgos clasificados P0/P1/P2 en comentario o documento temporal. Todos los Tasks siguientes asumen que este audit fue completado y los P0 confirmados.

- [ ] **Step 1: Verificar variables de entorno**

  Abrir `web-dashboard/.env` y verificar que cada variable tiene un valor real (no placeholder):

  ```
  VITE_SUPABASE_URL          → debe ser "https://ofjsodxsdbkiugonnmkh.supabase.co"
  VITE_SUPABASE_ANON_KEY     → debe comenzar con "sb_publishable_"
  VITE_SUPABASE_SERVICE_KEY  → debe comenzar con "eyJ" (NO "REPLACE_WITH...")
  VITE_IOT_URL               → cualquier valor (localhost o URL real)
  ```

  Verificar también si el código usa `VITE_IOT_SIMULATOR_URL` en lugar de `VITE_IOT_URL`:
  ```bash
  grep -r "VITE_IOT" web-dashboard/src/
  ```
  Expected: todas las referencias deben usar el mismo nombre de variable que está en `.env`.

  **Hallazgo esperado (P0):** `VITE_SUPABASE_SERVICE_KEY` es placeholder → se resuelve en Task 2.
  **Hallazgo esperado (P1):** inconsistencia `VITE_IOT_URL` vs `VITE_IOT_SIMULATOR_URL` → se resuelve en Task 4.

- [ ] **Step 2: Verificar que Resend está configurado**

  ```bash
  npx supabase secrets list --project-ref ofjsodxsdbkiugonnmkh
  ```

  Expected: línea que incluya `RESEND_API_KEY`.

  Si no aparece → **hallazgo P1**, se resuelve en Task 3.

- [ ] **Step 3: Verificar que las Edge Functions están desplegadas**

  ```bash
  npx supabase functions list --project-ref ofjsodxsdbkiugonnmkh
  ```

  Expected: aparecen `send-email`, `calculate-mora`, `generate-monthly-fees`, `payment-reminders`, `payment-webhook`.

  Si alguna falta → **hallazgo P0/P1**, anotar cuáles.

- [ ] **Step 4: Levantar la app localmente y verificar Auth**

  ```bash
  cd web-dashboard && npm run dev
  ```

  Abrir `http://localhost:5173` y probar:
  1. Login con credenciales demo (admin del seed) — Expected: redirige al Dashboard
  2. Logout — Expected: redirige a `/login`
  3. Intentar navegar a `/` sin estar logueado — Expected: redirige a `/login`
  4. Ir a `/update-password` — Expected: carga la página (no 404)

  Si alguno falla → **hallazgo P0**.

- [ ] **Step 5: Verificar Onboarding**

  Con la app corriendo en `http://localhost:5173`:

  1. Logout y navegar a `/onboarding`
  2. Completar Paso 1 (nombre residencial: "Test Audit", ciudad: "Santo Domingo")
  3. Completar Paso 2 (email nuevo que no exista: `audit-test-TIMESTAMP@gmail.com`, contraseña: `TestAudit123!`)
  4. Completar Paso 3 (seleccionar plan "Lite")
  5. Paso 4 → hacer clic en "Confirmar"

  Expected: el onboarding completa y redirige al dashboard.

  Verificar en Supabase Dashboard → Authentication → Users que el email `audit-test-TIMESTAMP@gmail.com` aparece.

  Si falla con error de auth → **hallazgo P0** (Service Key no configurada, resuelto en Task 2).

- [ ] **Step 6: Verificar flujo de cobros / transferencia**

  Login como admin del seed → ir a `/cobros`.

  1. Verificar que aparece la card "Cuenta Bancaria para Transferencias" → si no aparece → **hallazgo P1**
  2. Verificar que existen transacciones en estado `pendiente_verificacion`
  3. Abrir una transferencia → hacer clic en "Aprobar"
  4. Ir a Supabase Dashboard → Table Editor → `audit_log` → verificar que aparece una fila con `accion = 'transferencia_aprobada'`

  Si el audit_log no registra → **hallazgo P1**.

- [ ] **Step 7: Verificar módulo Inquilinos**

  Login como admin → ir a `/inquilinos`.

  1. Verificar que aparece botón "Importar CSV" → si no aparece → **hallazgo P1**
  2. Crear un CSV de prueba `test-audit.csv`:
     ```
     nombre_completo,email,telefono,apartamento,bloque
     Test Persona,test.audit.2@example.com,809-000-0000,101,A
     ```
  3. Importar el CSV → Expected: "1 inquilino creado exitosamente"
  4. Si falla → anotar el mensaje de error → **hallazgo P1**

- [ ] **Step 8: Verificar página IoT sin simulador**

  Con el simulador IoT detenido:
  1. Navegar a `/iot`
  2. Expected: mensaje "Sin dispositivos IoT configurados" o similar — NO un error de consola rojo ni pantalla en blanco
  3. Abrir DevTools → Console → verificar que no haya errores no manejados

  Si hay crash → **hallazgo P1**.

- [ ] **Step 9: Verificar build de producción**

  ```bash
  cd web-dashboard && npm run build
  ```

  Expected: termina sin errores. Warnings de TypeScript son aceptables solo si no son errores de tipo.

  ```bash
  npm run preview
  ```

  Abrir `http://localhost:4173` → verificar que el login carga correctamente.

  Si `npm run build` falla → **hallazgo P0** — anotar el error exacto.

- [ ] **Step 10: Consolidar hallazgos**

  Crear lista con este formato exacto (puede ser en un comentario o en papel):

  ```
  P0 — BLOQUEANTES DE GO-LIVE:
  - [ ] VITE_SUPABASE_SERVICE_KEY es placeholder → Task 2
  - [ ] [otros P0 encontrados]

  P1 — AFECTAN PRIMER CLIENTE:
  - [ ] RESEND_API_KEY no configurado → Task 3
  - [ ] [otros P1 encontrados]

  P2 — MEJORAS DESEABLES:
  - [ ] [P2 encontrados]
  ```

- [ ] **Step 11: Commit del estado del audit**

  ```bash
  git add -A
  git commit -m "audit: estado del sistema previo a produccion - $(date +%Y-%m-%d)"
  ```

---

## Task 2: Fix P0 — Configurar Service Role Key

**Files:**
- Modify: `web-dashboard/.env`
- Create: `web-dashboard/.env.example` (si no existe)

**Interfaces:**
- Consumes: Nada de otras tareas
- Produces: `VITE_SUPABASE_SERVICE_KEY` con valor real → desbloquea Onboarding y creación de usuarios

- [ ] **Step 1: Obtener la Service Role Key**

  Ir a https://supabase.com/dashboard → proyecto `ofjsodxsdbkiugonnmkh` → Settings → API.

  Copiar el valor de **"service_role secret"** (sección "Project API keys", NO el anon key).

  ⚠️ Esta key tiene acceso total a la DB. Nunca commitearla a git.

- [ ] **Step 2: Actualizar web-dashboard/.env**

  Abrir `web-dashboard/.env` y reemplazar la línea del service key:

  ```env
  VITE_SUPABASE_URL="https://ofjsodxsdbkiugonnmkh.supabase.co"
  VITE_SUPABASE_ANON_KEY="sb_publishable_NxGCb5HAXwmFzW0lkfKBqQ_8H7X9-y0"
  VITE_SUPABASE_SERVICE_KEY="eyJhbGc..."
  VITE_IOT_URL=http://localhost:3001
  ```

  Verificar que `.gitignore` incluye `.env`:
  ```bash
  grep "\.env" web-dashboard/.gitignore
  ```
  Expected: `.env` o `.env*` aparece. Si no, agregar `.env` al archivo.

- [ ] **Step 3: Crear .env.example si no existe**

  Verificar:
  ```bash
  ls web-dashboard/.env.example
  ```

  Si no existe, crear `web-dashboard/.env.example`:
  ```env
  VITE_SUPABASE_URL="https://your-project.supabase.co"
  VITE_SUPABASE_ANON_KEY="sb_publishable_..."
  VITE_SUPABASE_SERVICE_KEY="eyJhbGc..."
  VITE_IOT_URL=http://localhost:3001
  ```

- [ ] **Step 4: Verificar que el onboarding crea usuarios**

  ```bash
  cd web-dashboard && npm run dev
  ```

  1. Logout → navegar a `/onboarding`
  2. Completar los 4 pasos con email nuevo: `verificacion-key@test.com`, contraseña: `Verify123!`
  3. Expected: onboarding completa sin error

  Verificar en Supabase Dashboard → Authentication → Users que `verificacion-key@test.com` aparece.

- [ ] **Step 5: Commit**

  ```bash
  git add web-dashboard/.env.example web-dashboard/.gitignore
  git commit -m "fix: agregar .env.example y documentar Service Key requerida para produccion"
  ```

  ⚠️ NO agregar `web-dashboard/.env` al commit (está en .gitignore).

---

## Task 3: Fix P1 — Configurar Resend para Emails Reales

**Files:**
- Modify: `backend/supabase/functions/send-email/index.ts` (solo si se usa dominio propio)

**Interfaces:**
- Consumes: Cuenta Resend creada
- Produces: Edge function `send-email` enviando emails reales

- [ ] **Step 1: Crear cuenta en Resend**

  1. Ir a https://resend.com → crear cuenta gratuita (3,000 emails/mes — suficiente para el piloto)
  2. Dashboard de Resend → API Keys → Create API Key
  3. Nombre: `condosmart-prod`, permisos: "Sending access"
  4. Copiar el valor: `re_xxxxxxxxxxxxxxxxxx`

- [ ] **Step 2: Configurar el secret en Supabase**

  Instalar Supabase CLI si no está:
  ```bash
  npm install -g supabase
  ```

  Login y vincular:
  ```bash
  npx supabase login
  npx supabase link --project-ref ofjsodxsdbkiugonnmkh
  ```

  Configurar el secret:
  ```bash
  npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx --project-ref ofjsodxsdbkiugonnmkh
  ```

  Verificar:
  ```bash
  npx supabase secrets list --project-ref ofjsodxsdbkiugonnmkh
  ```
  Expected: aparece `RESEND_API_KEY` en la lista.

- [ ] **Step 3: Verificar el from en send-email**

  Abrir `backend/supabase/functions/send-email/index.ts` y buscar el campo `from:`.

  - Si dice `onboarding@resend.dev` → OK para el piloto, no cambiar nada.
  - Si dice un dominio propio que no has verificado en Resend → cambiar a `onboarding@resend.dev` temporalmente.

- [ ] **Step 4: Redesplegar la función**

  ```bash
  npx supabase functions deploy send-email --project-ref ofjsodxsdbkiugonnmkh
  ```

  Expected output:
  ```
  Deployed Function send-email on project ofjsodxsdbkiugonnmkh
  ```

- [ ] **Step 5: Probar envío de email**

  ```bash
  curl -X POST "https://ofjsodxsdbkiugonnmkh.supabase.co/functions/v1/send-email" \
    -H "Authorization: Bearer sb_publishable_NxGCb5HAXwmFzW0lkfKBqQ_8H7X9-y0" \
    -H "Content-Type: application/json" \
    -d '{
      "type": "pago_confirmado",
      "to": "juliochivilli.so@gmail.com",
      "data": {
        "nombre_completo": "Test Audit",
        "concepto": "Cuota Enero 2026",
        "monto": 4500,
        "capture_id": "CS-TEST-001",
        "condominio_nombre": "Residencial Las Palmas"
      }
    }'
  ```

  Expected response:
  ```json
  {"message": "Email sent successfully via Resend", "id": "re_..."}
  ```

  Verificar que el email llegó a `juliochivilli.so@gmail.com`.

- [ ] **Step 6: Commit**

  ```bash
  git commit -m "fix: configurar Resend API key y redesplegar send-email para produccion"
  ```

---

## Task 4: Fix — Producción Build y Consistencia de Env Vars

**Files:**
- Modify: `web-dashboard/src/pages/IotControl.tsx` (si hay inconsistencia de env var)
- Modify: `web-dashboard/.env` (si hay inconsistencia de nombre de var)

**Interfaces:**
- Consumes: Hallazgos del Task 1 (Step 1 sobre VITE_IOT_URL vs VITE_IOT_SIMULATOR_URL)
- Produces: `npm run build` sin errores, variable IoT consistente en código y .env

- [ ] **Step 1: Verificar el nombre exacto que usa el código para IoT URL**

  ```bash
  grep -r "VITE_IOT" web-dashboard/src/
  ```

  Nota el nombre exacto que aparece (puede ser `VITE_IOT_URL` o `VITE_IOT_SIMULATOR_URL`).

- [ ] **Step 2: Unificar la variable a VITE_IOT_URL**

  Si el código usa `VITE_IOT_SIMULATOR_URL` pero el `.env` tiene `VITE_IOT_URL`:

  En `web-dashboard/src/pages/IotControl.tsx`, reemplazar:
  ```typescript
  const iotUrl = import.meta.env.VITE_IOT_SIMULATOR_URL ?? "http://localhost:3001"
  ```
  por:
  ```typescript
  const iotUrl = import.meta.env.VITE_IOT_URL ?? "http://localhost:3001"
  ```

  Si el `.env` tiene `VITE_IOT_SIMULATOR_URL` pero el código usa `VITE_IOT_URL`:

  En `web-dashboard/.env`, renombrar la variable:
  ```env
  VITE_IOT_URL=http://localhost:3001
  ```

  Regla: el `.env` manda — ajustar el código para que use el mismo nombre.

- [ ] **Step 3: Ejecutar build de producción**

  ```bash
  cd web-dashboard && npm run build
  ```

  Si hay errores TypeScript, resolverlos uno por uno. Los errores más comunes:
  - `Type 'X' is not assignable to type 'Y'` → ajustar el tipo o agregar cast
  - `Property 'X' does not exist` → verificar que la prop existe en la interfaz
  - `Cannot find module` → verificar el import path

  Volver a correr `npm run build` hasta que no haya errores.

- [ ] **Step 4: Verificar preview de producción**

  ```bash
  npm run preview
  ```

  Abrir `http://localhost:4173` → verificar login, dashboard y navegación básica.

- [ ] **Step 5: Commit**

  ```bash
  git add web-dashboard/src/ web-dashboard/.env.example
  git commit -m "fix: unificar nombre de env var IoT y resolver errores de build de produccion"
  ```

---

## Task 5: Frontend-Design — Web Dashboard

**Files:**
- A determinar por el skill frontend-design durante su ejecución

**Interfaces:**
- Consumes: Web dashboard con build limpio (Task 4 completada)
- Produces: Dashboard con identidad visual elevada, spec de diseño en `docs/superpowers/specs/`

- [ ] **Step 1: Verificar prerequisitos**

  Confirmar que Task 2, 3 y 4 están completadas:
  - `npm run build` corre sin errores
  - Login y Dashboard cargan correctamente en `npm run preview`

- [ ] **Step 2: Invocar el skill frontend-design para el web dashboard**

  En Claude Code, escribir el siguiente prompt:

  ```
  /frontend-design

  Quiero hacer un análisis y mejora de identidad visual completa del web dashboard de CondoSmart.

  Contexto:
  - Es un SaaS de gestión de condominios dirigido a administradores en República Dominicana
  - Stack: React 19 + Vite + TypeScript + Tailwind CSS + Radix UI + Recharts
  - El dashboard tiene tema oscuro (dark mode)
  - Está en producción próximamente — debe verse profesional y confiable

  Páginas críticas a revisar:
  1. Login (web-dashboard/src/pages/Login.tsx)
  2. Dashboard principal (web-dashboard/src/pages/Dashboard.tsx)
  3. Cobros (web-dashboard/src/pages/Cobros.tsx)
  4. Inquilinos (web-dashboard/src/pages/Inquilinos.tsx)
  5. Onboarding de nuevo residencial (web-dashboard/src/pages/Onboarding.tsx)
  6. Finanzas (web-dashboard/src/pages/Finanzas.tsx)

  Quiero que evalúes: tipografía, paleta de color, consistencia de componentes, jerarquía visual, estados vacíos y UX del onboarding.
  ```

- [ ] **Step 3: Seguir las instrucciones del skill frontend-design**

  El skill guiará el proceso de brainstorming visual, propuestas de diseño e implementación. Seguir sus instrucciones hasta que el spec de diseño esté aprobado e implementado.

- [ ] **Step 4: Verificar que el build sigue limpio tras los cambios de diseño**

  ```bash
  cd web-dashboard && npm run build
  ```

  Expected: sin errores TypeScript.

---

## Task 6: Frontend-Design — App Móvil Flutter

**Files:**
- A determinar por el skill frontend-design durante su ejecución
- Directorio base: `mobile-app/lib/`
- Features: `mobile-app/lib/features/` (auth, dashboard, pagos, tickets, reservas, notificaciones, iot)

**Interfaces:**
- Consumes: Task 5 completada (diseño web aplicado)
- Produces: App móvil con identidad visual elevada, spec de diseño en `docs/superpowers/specs/`

- [ ] **Step 1: Verificar que la app compila**

  ```bash
  cd mobile-app && flutter pub get && flutter build apk --debug
  ```

  Expected: compila sin errores. Si hay errores de dependencias, correrlos primero.

- [ ] **Step 2: Invocar el skill frontend-design para la app móvil**

  En Claude Code, escribir el siguiente prompt:

  ```
  /frontend-design

  Quiero hacer un análisis y mejora de identidad visual de la app móvil Flutter de CondoSmart.

  Contexto:
  - Es la app que usan los inquilinos del condominio (no los administradores)
  - Stack: Flutter (Dart)
  - Los inquilinos son residentes en República Dominicana, sin necesariamente alto nivel técnico
  - Flujo crítico: ver cuota pendiente → pagar (tarjeta o transferencia) → subir comprobante → confirmación

  Estructura de la app:
  - mobile-app/lib/main.dart (entry point)
  - mobile-app/lib/features/auth/ (login/registro)
  - mobile-app/lib/features/dashboard/ (pantalla principal del inquilino)
  - mobile-app/lib/features/pagos/ (ver y pagar cuotas)
  - mobile-app/lib/features/tickets/ (reportar problemas)
  - mobile-app/lib/features/reservas/ (reservar amenidades)
  - mobile-app/lib/features/notificaciones/

  Quiero que evalúes: navegación, jerarquía visual, flujo del pago, estados vacíos y consistencia con la identidad del producto.
  ```

- [ ] **Step 3: Seguir las instrucciones del skill frontend-design**

  El skill guiará el proceso. Seguir sus instrucciones hasta que el spec de diseño esté aprobado e implementado.

- [ ] **Step 4: Verificar que la app sigue compilando tras los cambios**

  ```bash
  cd mobile-app && flutter build apk --debug
  ```

  Expected: sin errores de compilación.

---

## Task 7: Deploy a Vercel

**Files:**
- Create: `web-dashboard/vercel.json`

**Interfaces:**
- Consumes: `npm run build` limpio (Task 4), diseño aplicado (Task 5)
- Produces: URL pública de CondoSmart en Vercel funcionando end-to-end

- [ ] **Step 1: Instalar Vercel CLI**

  ```bash
  npm install -g vercel
  vercel --version
  ```

  Expected: muestra la versión instalada (ej. `Vercel CLI 39.x.x`).

- [ ] **Step 2: Login en Vercel**

  ```bash
  vercel login
  ```

  Seguir el flujo de autenticación en el navegador.

- [ ] **Step 3: Crear vercel.json para SPA routing**

  Crear `web-dashboard/vercel.json` con el siguiente contenido (necesario para que React Router funcione con URLs directas):

  ```json
  {
    "rewrites": [
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```

- [ ] **Step 4: Hacer el primer deploy desde web-dashboard/**

  ```bash
  cd web-dashboard && vercel
  ```

  Durante el wizard interactivo, responder:
  - `Set up and deploy?` → Y
  - `Which scope?` → tu cuenta personal
  - `Link to existing project?` → N (nuevo proyecto)
  - `Project name:` → `condosmart-dashboard`
  - `In which directory is your code located?` → `./` (ya estás en web-dashboard/)
  - `Want to modify settings?` → N

  Expected al finalizar: URL de preview como `https://condosmart-dashboard-xxx.vercel.app`

- [ ] **Step 5: Configurar variables de entorno en Vercel**

  ```bash
  vercel env add VITE_SUPABASE_URL production
  ```
  Valor: `https://ofjsodxsdbkiugonnmkh.supabase.co`

  ```bash
  vercel env add VITE_SUPABASE_ANON_KEY production
  ```
  Valor: `sb_publishable_NxGCb5HAXwmFzW0lkfKBqQ_8H7X9-y0`

  ```bash
  vercel env add VITE_SUPABASE_SERVICE_KEY production
  ```
  Valor: `eyJhbGc...` (la Service Role Key real del Step 1 del Task 2)

  ```bash
  vercel env add VITE_IOT_URL production
  ```
  Valor: `http://localhost:3001` (o URL real si hay servidor IoT en producción)

- [ ] **Step 6: Deploy a producción**

  ```bash
  vercel --prod
  ```

  Expected: URL de producción como `https://condosmart-dashboard.vercel.app`

- [ ] **Step 7: Verificar la URL pública**

  Abrir la URL de producción en el navegador:

  1. Login con credenciales del admin demo → Expected: carga el Dashboard
  2. Navegar a `/cobros` → Expected: carga la página
  3. Navegar a una URL directa (ej. `https://condosmart-dashboard.vercel.app/inquilinos`) → Expected: carga correctamente (verifica que el `vercel.json` funciona)
  4. Abrir DevTools → Console → no debe haber errores de env vars faltantes

- [ ] **Step 8: Configurar deploy automático (opcional)**

  En el dashboard de Vercel → Project Settings → Git → conectar el repositorio de GitHub.

  Con esto, cada push a `master` triggerea un deploy automático.

- [ ] **Step 9: Commit**

  ```bash
  git add web-dashboard/vercel.json
  git commit -m "feat: agregar vercel.json para deploy de SPA con React Router"
  ```

---

## Task 8: Onboarding del Primer Residencial Real

**Files:**
- No hay archivos de código a modificar — este task es de configuración de datos

**Interfaces:**
- Consumes: URL pública funcionando (Task 7), onboarding operativo (Task 2)
- Produces: Primer administrador real logueado, 40 unidades creadas, inquilinos importados, flujo de pago verificado end-to-end

- [ ] **Step 1: Crear las unidades del residencial en Supabase**

  Ir a Supabase Dashboard → proyecto `ofjsodxsdbkiugonnmkh` → Table Editor → tabla `unidades`.

  Insertar las 40 unidades. Si la tabla ya tiene un seed de demo, verificar si el `condominio_id` del residencial real es diferente al del demo.

  Para insertar en bulk, usar el SQL Editor:
  ```sql
  -- Ajustar condominio_id al UUID del residencial real (obtenido del onboarding)
  -- Ajustar numero_apartamento y bloque según el residencial
  INSERT INTO unidades (condominio_id, numero_apartamento, bloque, piso)
  VALUES
    ('UUID-DEL-CONDOMINIO-REAL', '101', 'A', 1),
    ('UUID-DEL-CONDOMINIO-REAL', '102', 'A', 1),
    -- ... repetir para las 40 unidades
    ('UUID-DEL-CONDOMINIO-REAL', '140', 'D', 10);
  ```

  Verificar en Table Editor → `unidades` que aparecen las 40 filas con el `condominio_id` correcto.

- [ ] **Step 2: Crear el administrador real vía Onboarding**

  Abrir la URL pública de producción → `/onboarding`:

  1. Paso 1 — Residencial: nombre real, dirección real, ciudad real
  2. Paso 2 — Administrador: email real del administrador, contraseña segura (mínimo 8 caracteres, una mayúscula, un número)
  3. Paso 3 — Plan: seleccionar "Lite" (hasta 50 unidades, RD$49/mes)
  4. Paso 4 — Confirmar

  Verificar en Supabase → Authentication → Users que el email del admin aparece.
  Verificar en Table Editor → `condominios` que el residencial aparece con el nombre correcto.

- [ ] **Step 3: Preparar el CSV de inquilinos reales**

  Crear el archivo `inquilinos-residencial.csv` con los datos reales:
  ```
  nombre_completo,email,telefono,apartamento,bloque
  [Nombre Real 1],[email1@gmail.com],[809-xxx-xxxx],101,A
  [Nombre Real 2],[email2@gmail.com],[829-xxx-xxxx],102,A
  ...
  ```

  Columnas requeridas: `nombre_completo`, `email`
  Columnas opcionales: `telefono`, `apartamento`, `bloque`

- [ ] **Step 4: Importar inquilinos desde el panel**

  1. Login como el admin real en la URL de producción
  2. Ir a `/inquilinos` → hacer clic en "Importar CSV"
  3. Seleccionar el archivo `inquilinos-residencial.csv`
  4. Expected: `X inquilinos creados exitosamente` (donde X = total de filas del CSV)
  5. Si hay errores, leerlos y corregir los datos del CSV

  Verificar en Supabase → Authentication → Users que los inquilinos aparecen.

- [ ] **Step 5: Verificar login de un inquilino real**

  Tomar uno de los emails del CSV e intentar hacer login en la URL de producción.

  Si el inquilino no tiene contraseña configurada, usar la función "Recuperar contraseña" en `/login`:
  1. Hacer clic en "¿Olvidaste tu contraseña?"
  2. Ingresar el email del inquilino
  3. El inquilino recibe el email de recuperación → establece su contraseña → puede hacer login

  Verificar que el inquilino puede:
  - Ver el dashboard con sus datos
  - Ver sus cobros/cuotas pendientes

- [ ] **Step 6: Verificar flujo de pago end-to-end**

  Con el inquilino real logueado:
  1. Ir a `/cobros` → seleccionar una cuota pendiente
  2. Seleccionar "Transferencia bancaria"
  3. Verificar que se muestran los datos bancarios del admin (configurados en Task 2)
  4. Subir un comprobante de prueba (imagen cualquiera)
  5. Enviar el comprobante

  Con el admin real logueado en otra pestaña:
  1. Ir a `/cobros` → verificar que aparece la transferencia en estado "Pendiente Verificación"
  2. Aprobar la transferencia
  3. Verificar en `/auditoria` que aparece el registro de la aprobación

  Verificar que el inquilino recibe email de confirmación (revisar bandeja de entrada del email real).

- [ ] **Step 7: Verificar pg_cron de mora activo**

  En Supabase Dashboard → SQL Editor, ejecutar:
  ```sql
  SELECT jobname, schedule, active
  FROM cron.job
  WHERE jobname LIKE '%mora%';
  ```

  Expected: aparece el job de cálculo de mora con `active = true`.

  Si no aparece → ejecutar la migración de pg_cron (revisar el archivo de migración `00015_cron_mora.sql` o el más reciente que configure pg_cron).

- [ ] **Step 8: Verificar configuración bancaria del admin**

  Login como admin real → ir a `/cobros`.

  1. Verificar que la card "Cuenta Bancaria para Transferencias" muestra datos reales (no "PENDIENTE-CONFIGURAR")
  2. Si muestra placeholder → hacer clic en el ícono de editar → ingresar los datos bancarios reales del residencial → Guardar

---

## Checklist Final de Go-Live

- [ ] Audit completado — todos los módulos evaluados (Task 1)
- [ ] `VITE_SUPABASE_SERVICE_KEY` tiene valor real — onboarding crea usuarios (Task 2)
- [ ] `RESEND_API_KEY` configurado — emails llegan (Task 3)
- [ ] `npm run build` limpio sin errores TypeScript (Task 4)
- [ ] Frontend-design web dashboard aplicado (Task 5)
- [ ] Frontend-design app móvil Flutter aplicado (Task 6)
- [ ] URL pública en Vercel respondiendo: login, dashboard, routing directo (Task 7)
- [ ] Variables de entorno configuradas en Vercel dashboard (Task 7)
- [ ] 40 unidades del residencial creadas en Supabase (Task 8)
- [ ] Admin real logueado y con datos bancarios configurados (Task 8)
- [ ] Inquilinos reales importados (Task 8)
- [ ] Un inquilino real puede hacer login y ver sus cobros (Task 8)
- [ ] Flujo de pago end-to-end verificado: subir comprobante → admin aprueba → inquilino recibe email (Task 8)
- [ ] pg_cron de mora activo en producción (Task 8)

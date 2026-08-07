# Integración CondoSmart ↔ FixSeek

Bridge bidireccional entre el sistema de gestión de condominios (Supabase) y la red de
profesionales de FixSeek / MoneyAPP (Firebase). Los residentes crean tickets en CondoSmart,
se publican como solicitudes de servicio en FixSeek, y el estado se sincroniza de vuelta.

## Arquitectura

```
┌─────────────────────────┐        ┌─────────────────────────┐
│       CONDOSMART        │        │     FIXSEEK (MoneyAPP)   │
│        (Supabase)       │        │        (Firebase)        │
├─────────────────────────┤        ├─────────────────────────┤
│ tickets_tecnicos        │        │ service_requests         │
│  + fixseek_request_id   │        │  + source (condosmart_*) │
│  + fixseek_profesional  │        │  + externalId            │
│                         │        │                         │
│ Edge Function           │  POST  │ Cloud Function HTTP      │
│  bridge-fixseek        ─────────▶  handleExternalRequest    │
│  (envía ticket a FixSeek)        │  (crea service_request + │
│                         │        │   FCM a profesionales)   │
│                         │        │                         │
│ Edge Function           │◀───────│ Trigger Firestore        │
│  bridge-condosmart     │  POST   │  onCondoSmartRequestStatus│
│  (actualiza ticket +    │        │  (avisa cambios de estado)│
│   notificaciones)       │        │                         │
└─────────────────────────┘        └─────────────────────────┘
```

## Componentes creados

### CondoSmart

| Archivo | Descripción |
|---|---|
| `backend/supabase/migrations/00017_fixseek_bridge.sql` | Columna `fixseek_request_id`, `fixseek_profesional_nombre`, índice y trigger de notificaciones |
| `backend/supabase/functions/bridge-fixseek/index.ts` | Edge Function: envía ticket a FixSeek, vincula `request_id` |
| `backend/supabase/functions/bridge-condosmart/index.ts` | Edge Function: recibe updates de estado desde FixSeek |
| `web-dashboard/src/pages/Tickets.tsx` | Botón "Buscar profesional", columna FixSeek, realtime updates |
| `web-dashboard/.env(.example)` | `VITE_BRIDGE_SHARED_SECRET` |

### FixSeek / MoneyAPP

| Archivo | Descripción |
|---|---|
| `functions/src/index.ts` | HTTP `handleExternalRequest` + trigger `onCondoSmartRequestUpdated` |
| `lib/features/home/presentation/screens/opportunity_feed_screen.dart` | Badge "CONDOMINIO" y filtro de solicitudes externas |

## Mapeos

### Categorías (CondoSmart → FixSeek)

| CondoSmart | FixSeek |
|---|---|
| `plomería` | Plomería |
| `electricidad` | Electricidad |
| `pintura` | Pintura |
| `carpintería` | Carpintería |
| `jardinería` | Jardinería |
| `limpieza` | Limpieza |

### Estados (FixSeek → CondoSmart)

| FixSeek | CondoSmart |
|---|---|
| `searching` | `pendiente` |
| `quotes_received` | `asignado` |
| `confirmed` | `en_progreso` |
| `completed` | `completado` |
| `cancelled` | `rechazado` |

## Setup

### 1. Generar el secreto compartido

```powershell
$bytes = New-Object byte[] 32; [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes); [Convert]::ToBase64String($bytes)
```

Usar **el mismo valor** en los 3 lugares:

### 2. CondoSmart (Supabase)

1. Aplicar la migración:
   ```powershell
   cd backend
   npx supabase db push --project-ref ofjsodxsdbkiugonnmkh
   ```

2. Desplegar Edge Functions y configurar secrets:
   ```powershell
   npx supabase functions deploy bridge-fixseek --project-ref ofjsodxsdbkiugonnmkh
   npx supabase functions deploy bridge-condosmart --project-ref ofjsodxsdbkiugonnmkh
   npx supabase secrets set BRIDGE_SHARED_SECRET="<SECRETO>" --project-ref ofjsodxsdbkiugonnmkh
   npx supabase secrets set FIXSEEK_CLOUD_FUNCTION_URL="https://<region>-<project>.cloudfunctions.net/handleExternalRequest" --project-ref ofjsodxsdbkiugonnmkh
   ```

3. Web dashboard `.env`:
   ```
   VITE_BRIDGE_SHARED_SECRET="<SECRETO>"
   ```

### 3. FixSeek / MoneyAPP (Firebase)

1. Compilar y desplegar:
   ```powershell
   cd functions
   npm run build
   firebase deploy --only functions
   ```

2. Configurar variables de entorno de las funciones (Google Cloud Console → Cloud Functions → `handleExternalRequest` y `onCondoSmartRequestUpdated` → Editar → Variables de entorno):
   ```
   BRIDGE_SHARED_SECRET=<SECRETO>
   CONDOSMART_BRIDGE_URL=https://ofjsodxsdbkiugonnmkh.supabase.co/functions/v1/bridge-condosmart
   ```

   Alternativa por CLI:
   ```bash
   gcloud functions deploy handleExternalRequest --set-env-vars BRIDGE_SHARED_SECRET=<SECRETO>,CONDOSMART_BRIDGE_URL=...
   ```

> **Nota:** `onCondoSmartRequestUpdated` y `handleExternalRequest` son funciones de tipo HTTP y
> Firestore. Si solo se cambian variables de entorno, es suficiente redeployar las funciones.

## Flujo end-to-end

1. Un admin crea un ticket en el Web Dashboard de CondoSmart (ej. "Fuga de agua" → plomería).
2. Hace clic en **"Buscar profesional"** en la fila del ticket.
3. La Edge Function `bridge-fixseek` valida el secreto, lee el ticket y hace POST a
   `handleExternalRequest`.
4. `handleExternalRequest` crea un `service_request` en Firestore con
   `source: 'condosmart_web'` y `externalId: <ticket_id>`.
5. Los profesionales verificados de la categoría reciben FCM y una notificación in-app
   ("Nueva solicitud de condominio").
6. Cuando el profesional envía una cotización o el estado cambia, el trigger
   `onCondoSmartRequestUpdated` hace POST a `bridge-condosmart`.
7. `bridge-condosmart` actualiza `tickets_tecnicos` (estado, profesional, costo estimado)
   y el trigger `trg_ticket_fixseek_update` crea notificaciones para el inquilino y el admin.
8. El dashboard se actualiza en tiempo real vía Supabase Realtime.

## Seguridad

- **Secreto compartido**: todas las llamadas entre sistemas validan `BRIDGE_SHARED_SECRET`.
- **Service role**: las Edge Functions usan `SUPABASE_SERVICE_ROLE_KEY` (solo server-side).
- **FCM**: solo profesionales con `verificationStatus == 'verified'` reciben notificaciones.
- **Firestore rules**: los `service_requests` externos se crean con la Cloud Function
  (privilegios de admin SDK) y respetan las reglas existentes de lectura/actualización.

## Troubleshooting

| Síntoma | Causa probable |
|---|---|
| `401 Unauthorized` | Secreto compartido distinto entre sistemas |
| `FixSeek respondió 404` | URL de `handleExternalRequest` mal configurada |
| `Categoría X no tiene equivalente` | La categoría del ticket no está en el mapeo |
| El estado no se refleja en CondoSmart | `CONDOSMART_BRIDGE_URL` no configurada en Firebase, o `externalId` no coincide |
| No llegan notificaciones FCM | El profesional no está verificado o no tiene `fcm_tokens` registrados |

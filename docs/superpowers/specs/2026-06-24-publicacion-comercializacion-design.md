# CondoSmart — Publicación y Comercialización: Design Spec

**Fecha:** 2026-06-24  
**Objetivo:** Validar el sistema, elevar la identidad visual y desplegar CondoSmart a producción para onboardear el primer residencial real.  
**Enfoque:** Opción A — Secuencial (Audit → Fixes → Design Web → Design Mobile → Deploy + Onboarding)

---

## Contexto

CondoSmart es un SaaS de gestión de condominios con 4 componentes: web dashboard (React 19 + Vite + TypeScript + Tailwind), app móvil (Flutter), backend (Supabase: PostgreSQL + Auth + Edge Functions + pg_cron) e IoT simulator (Node.js). El proyecto tiene infraestructura comercial construida (planes Lite/Pro/Enterprise, página de pago de suscripción, métricas SaaS) y un plan de producción previo (2026-06-19) que implementó varias features críticas. El estado actual es "parcialmente configurado": el proyecto Supabase existe con datos piloto pero faltan variables de entorno de producción y validación de flujos end-to-end.

**Plataforma de deploy:** Vercel  
**Primer cliente:** Residencial de 40 unidades en República Dominicana  
**Idioma del UI:** Español dominicano (RD$, formato es-DO)

---

## Fase 1 — Audit Funcional

**Objetivo:** Mapa exacto del estado del sistema (✅ OK / ⚠️ Incompleto / ❌ Roto) antes de tocar diseño o deploy.

### Módulos a auditar

| Módulo | Qué verificar |
|--------|--------------|
| Variables de entorno | `.env` tiene valores reales (no placeholders) para `VITE_SUPABASE_SERVICE_KEY`, `VITE_IOT_SIMULATOR_URL`; secret `RESEND_API_KEY` configurado en Supabase |
| Auth flows | Login, logout, recuperar contraseña, UpdatePassword, ProtectedRoute bloqueando rutas correctamente |
| Onboarding | Los 4 pasos crean condominio + admin real en Supabase Auth (requiere Service Key real) |
| Flujos de pago | Transferencia: subir comprobante → aprobar/rechazar → audit_log registra la acción |
| Inquilinos | CRUD completo + importación CSV (creado en commits recientes) |
| Cobros y cuotas | Generación de cuotas mensuales, pg_cron de mora corriendo diario, visualización correcta por inquilino |
| Edge Functions | `send-email` (Resend), `calculate-mora`, `payment-webhook` desplegadas y respondiendo |
| Páginas de riesgo | IoT no crashea sin simulador, FinanzasGlobal carga, MetricasSaaS muestra datos reales si los hay |
| Build de producción | `npm run build` sin errores TypeScript ni warnings críticos |

### Entregable

Lista priorizada de hallazgos:
- **P0 — Bloqueantes de go-live:** Auth roto, onboarding no crea usuarios, pagos no registran, build falla
- **P1 — Afectan experiencia del primer cliente:** Emails no llegan, cuotas no generan, audit log no registra
- **P2 — Mejoras deseables:** IoT, datos reales en MetricasSaaS, edge cases menores

---

## Fase 2 — Fixes Post-Audit

**Objetivo:** Resolver todos los issues P0 y P1 antes de avanzar al diseño.

**Regla de avance:** No se pasa a Fase 3 hasta que no queden P0 ni P1 abiertos. P2 no es bloqueante.

**Entregable:** Todos los fixes commiteados, `npm run build` limpio, checklist de go-live del plan 2026-06-19 verificado ítem por ítem.

---

## Fase 3 — Frontend-Design: Web Dashboard

**Objetivo:** Elevar la identidad visual del dashboard web para que el producto se vea profesional ante el primer cliente pagante (el administrador del condominio).

**Alcance:**
- Tipografía, paleta de color, consistencia de componentes Radix/Tailwind
- Jerarquía visual por página: Dashboard, Cobros, Inquilinos, Finanzas, Onboarding
- Estados vacíos (cuando no hay datos), estados de error, estados de carga
- UX del onboarding (primer login, configuración inicial)

**Herramienta:** Skill `frontend-design`

**Entregable:** Spec de diseño aprobado + cambios implementados en el dashboard

---

## Fase 4 — Frontend-Design: App Móvil Flutter

**Objetivo:** Elevar la identidad visual de la app móvil que usa el inquilino (pagar, ver cobros, abrir tickets, recibir notificaciones).

**Alcance:**
- Navegación y flujo principal del inquilino
- Componentes nativos vs custom — consistencia con Material 3 o diseño propio
- Flujo crítico: ver cuota pendiente → seleccionar método → subir comprobante → confirmación
- Estados vacíos y manejo de errores en mobile

**Herramienta:** Skill `frontend-design`

**Entregable:** Spec de diseño aprobado + cambios implementados en la app Flutter

---

## Fase 5 — Deploy Vercel + Onboarding Primer Residencial

**Objetivo:** Sistema publicado y primer cliente real operando.

### Deploy a Vercel

1. Crear proyecto en Vercel conectado al repositorio git (directorio `web-dashboard`)
2. Configurar variables de entorno en Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_SERVICE_KEY`
   - `VITE_IOT_SIMULATOR_URL` (puede ser vacío o URL real si aplica)
3. Trigger deploy desde `master` — verificar build exitoso en Vercel
4. Verificar URL pública: login funciona, dashboard carga, no hay errores de CORS ni env vars faltantes

### Onboarding Primer Residencial

1. Crear las unidades del residencial en Supabase (Table Editor → `unidades`, 40 filas)
2. Usar el onboarding de la app para crear el admin del residencial
3. Importar inquilinos reales con CSV (página Inquilinos → "Importar CSV")
4. Verificar: inquilino puede hacer login, ve sus cobros, puede subir comprobante
5. Verificar: admin recibe notificación de transferencia pendiente, puede aprobarla, inquilino recibe email de confirmación
6. Confirmar que pg_cron de mora está activo en el proyecto Supabase de producción

**Entregable:** URL pública funcional + primer admin logueado en el residencial real con datos reales

---

## Checklist de Éxito

- [ ] Audit completado — todos los módulos evaluados
- [ ] Cero issues P0 y P1 en producción
- [ ] Build de producción limpio (`npm run build`)
- [ ] Frontend-design aplicado al dashboard web
- [ ] Frontend-design aplicado a la app móvil Flutter
- [ ] URL pública en Vercel respondiendo correctamente
- [ ] Variables de entorno de producción configuradas en Vercel
- [ ] Primer administrador real logueado
- [ ] 40 unidades creadas en Supabase
- [ ] Inquilinos reales importados
- [ ] Flujo de pago end-to-end verificado con datos reales
- [ ] Email de confirmación llegando al inquilino real

---

## Restricciones

- Nunca hardcodear credenciales en el código fuente
- No introducir librerías nuevas sin justificación — usar lo que ya está en `package.json`
- El sistema debe seguir funcionando con datos de demo (seed) si no hay datos reales
- No modificar el flujo de pagos con tarjeta durante esta fase — solo el flujo de transferencia bancaria
- Idioma del UI: español dominicano (RD$, formato fechas es-DO)

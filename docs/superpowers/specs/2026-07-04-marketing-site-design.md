# Landing de Ventas CondoSmart — Design Spec

**Fecha:** 2026-07-04
**Estado:** Aprobado para pasar a plan de implementación

## Contexto y objetivo

CondoSmart hoy es un sistema funcional (web dashboard + app móvil + backend Supabase) sin ninguna presencia pública de ventas. Se necesita un sitio web tipo landing page, estilo 2026, que le explique a un administrador de condominios qué hace el sistema y lo lleve a solicitar una demo.

Una auditoría previa del código (2026-07-03) confirmó qué funciones existen realmente hoy y cuáles del checklist ideal de un sistema de condominios todavía no están implementadas (ver resumen abajo). El copy de esta landing debe basarse **solo en lo verificado como funcional**, sin prometer capacidades pendientes.

## Audiencia y objetivo de conversión

- **Audiencia principal:** administradores de condominios (comprador B2B). No se diseña contenido dedicado a residentes/inquilinos ni a inversionistas en esta fase.
- **CTA principal:** "Solicitar demo" / "Hablar con ventas". No hay registro self-service ni pago directo desde la landing, porque el flujo de alta de un nuevo residencial (`web-dashboard/src/pages/Onboarding.tsx`) es un wizard interno protegido para `super_admin` — no existe todavía un flujo público de autoregistro. Prometer "regístrate gratis" o un botón de pago directo generaría una promesa que el producto no puede cumplir hoy.

## Ubicación en el repo y arquitectura

Proyecto nuevo e independiente: `marketing-site/`, hermano de `web-dashboard/`, `mobile-app/`, `backend/`, `iot-simulator/`.

- **Stack:** React 19 + Vite + TypeScript + Tailwind CSS (mismo stack que `web-dashboard`, para reusar patrones y `components/ui` donde aplique vía copiar/adaptar, no import cruzado de paquete).
- **Sin Supabase Auth ni rutas protegidas.** Es contenido público estático de una sola página (single-page, secciones ancladas con scroll, no multi-ruta).
- **Formulario de contacto:** único punto dinámico del sitio. Envía los datos del lead a Supabase (mismo proyecto `ofjsodxsdbkiugonnmkh` que usa el backend) insertando en una tabla nueva `leads` (a definir en el plan de implementación: nombre, email, teléfono, nombre del condominio, número de unidades aproximado, fecha de creación). Opcionalmente dispara la función Edge `send-email` ya existente para notificar al equipo de ventas por correo cuando llega un lead nuevo.
- **Deploy:** proyecto Vercel separado del dashboard, apuntando al dominio raíz (ej. `condosmart.do`), mientras el dashboard vive en un subdominio (ej. `app.condosmart.do`).

## Identidad visual

- Hereda del dashboard: paleta de color azul primaria, logo/nombre "CondoSmart", tipografía base.
- No copia 1:1 el estilo oscuro/glassmorphism completo del dashboard — usa una composición propia de landing "SaaS 2026 editorial": tipografía grande y expresiva, alto contraste, mucho espacio en blanco, animaciones sutiles de entrada al hacer scroll (fade/slide-in).
- Hero y sección de CTA final en fondo oscuro con gradientes (impacto + coherencia con la marca del producto). Secciones de features alternan fondo claro/oscuro para dar ritmo visual.
- Mockups del dashboard: como aún no hay screenshots reales ni logo formal, se usan capturas ilustrativas/recreadas de las pantallas reales del dashboard (Finanzas, Tickets, Reservas) en vez de placeholders genéricos, para que el admin vea el producto real.

## Estructura de secciones (single page, en orden)

1. **Hero** — titular + subtítulo + CTA "Solicitar demo" + mockup flotante del dashboard.
2. **Problema/Agitación** — 2-3 líneas sobre el dolor de administrar un condominio manualmente (Excel, WhatsApp, papeles).
3. **Features por categoría** — solo funciones verificadas como funcionales en la auditoría del 2026-07-03:
   - **Gestión Financiera:** generación de cuotas mensuales, cálculo automático de mora (5% mensual vía cron diario), pasarela de pago con tarjeta y transferencia bancaria (con verificación de comprobante).
   - **Comunidad:** cartelera de anuncios/comunicados, módulo de tickets de incidencias con seguimiento de estado.
   - **Operaciones:** reserva de áreas comunes, control de visitantes (registro de entrada/salida).
   - **Seguridad:** roles diferenciados (administrador, residente, técnico) con permisos por rol, log de auditoría de acciones sensibles.

   **Explícitamente NO se mencionan** (por no estar implementadas): cálculo de cuota por coeficiente de copropiedad/m², monederos virtuales, bloqueo automático de morosos, votaciones/encuestas, asambleas virtuales, códigos QR para visitantes, bitácora de paquetería, mantenimiento preventivo, caja chica/pago a proveedores.
4. **Cómo funciona** — 3 pasos: "Solicitas una demo" → "Configuramos tu residencial" → "Tu equipo y residentes empiezan a usarlo".
5. **Planes y precios** — Lite ($49/mes), Pro ($149/mes), Enterprise ($399/mes), con sus límites (unidades/usuarios) y features (IoT, reportes, API), tomados de los datos reales en `web-dashboard/src/pages/Planes.tsx`. Cada botón de plan lleva al formulario de contacto, no a pago directo.
6. **Prueba social** — sección preparada con estructura (logos/testimonios) pero con placeholder visible de "próximamente", ya que aún no hay clientes reales que mostrar.
7. **CTA final + formulario de contacto** — nombre, email, teléfono, nombre del condominio, número aproximado de unidades.
8. **Footer** — simple, con enlace a login del dashboard para clientes existentes.

## Idioma y tono

Español dominicano (consistente con el resto del sistema), tono profesional pero directo — hablando a un administrador ocupado, no a un desarrollador.

## Testing / validación

Al ser una landing estática sin lógica de negocio compleja, no aplica TDD tradicional. La validación es:
- Visual: revisar en navegador en desktop y mobile.
- Funcional: confirmar que el formulario de contacto efectivamente inserta el lead en Supabase (y/o dispara el correo) sin errores.

## Fuera de alcance (explícitamente)

- Registro/self-service de nuevos clientes.
- Pago directo desde la landing.
- Contenido dirigido a residentes o inversionistas.
- Cualquier mención de features no verificadas como funcionales (ver lista de exclusión arriba).

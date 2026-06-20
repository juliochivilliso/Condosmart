# Design: Cuenta Bancaria Configurable · CSV Inquilinos · IoT URL · Log de Auditoría

**Fecha:** 2026-06-19  
**Estado:** Aprobado  

---

## Contexto

Cuatro mejoras priorizadas sobre el sistema CondoSmart que bloquean el uso real en producción:

1. **Cuenta bancaria configurable** — `PaymentGateway.tsx` muestra datos bancarios hardcodeados (Banreservas 960-123456-7). Los inquilinos ven una cuenta falsa al pagar por transferencia.
2. **Importar inquilinos por CSV** — solo existe creación uno a uno. Cargar 40 inquilinos manualmente es inviable.
3. **URL del simulador IoT hardcodeada** — `IotControl.tsx:96` apunta a `http://localhost:3001`. En producción la app tira error de conexión.
4. **Log de auditoría** — no existe registro de quién aprobó qué transferencia, ni quién cambió la cuenta bancaria.

---

## Decisiones de diseño

| Feature | Decisión | Razón |
|---|---|---|
| Cuenta bancaria | Columnas en tabla `condominios` | Sin tabla extra, datos inherentes al condominio |
| Edición cuenta bancaria | Solo `admin_condominio` | Responsabilidad del propietario del condominio, no de CondoSmart |
| CSV duplicados | Saltar (skip) | Evitar pisar cambios manuales; los saltados se reportan |
| Audit log scope | Aprobación/rechazo transferencias + cambios cuenta bancaria | YAGNI — no registrar todas las acciones admin |
| Audit log ubicación | Página dedicada `/auditoria` | Crece con el tiempo; propósito distinto a Finanzas/Cobros |
| IoT URL | Variable de entorno `VITE_IOT_URL` | Config de despliegue, no runtime; cero DB reads |
| CSV parser | PapaParse (cliente) | Stack actual React+Vite, caso de uso ≤40 filas no requiere Edge Function |

---

## Feature 1: Cuenta Bancaria Configurable

### Base de datos (migration `00013`)
```sql
ALTER TABLE condominios
  ADD COLUMN IF NOT EXISTS banco TEXT,
  ADD COLUMN IF NOT EXISTS tipo_cuenta TEXT,
  ADD COLUMN IF NOT EXISTS numero_cuenta TEXT,
  ADD COLUMN IF NOT EXISTS beneficiario TEXT,
  ADD COLUMN IF NOT EXISTS rnc TEXT;
```

RLS: política de UPDATE en `condominios` para `admin_condominio` usando:
```sql
CREATE POLICY "admin puede actualizar su condominio"
  ON condominios FOR UPDATE
  USING (id IN (SELECT condominio_id FROM usuarios WHERE id = auth.uid()));
```

### Frontend

**Nueva página `Configuracion.tsx`**
- Ruta: `/configuracion` (solo `admin_condominio`)
- Formulario con los 5 campos bancarios
- Al guardar: `UPDATE condominios SET banco, tipo_cuenta, numero_cuenta, beneficiario, rnc WHERE id = condominio_id`
- Después del UPDATE exitoso: insertar en `audit_log` con `accion = 'cambio_cuenta_bancaria'`
- Icono en nav: `Settings`

**`PaymentGateway.tsx`**
- Nueva prop: `bancoCuenta: { banco: string; tipo_cuenta: string; numero_cuenta: string; beneficiario: string; rnc: string } | null`
- Reemplazar bloque hardcodeado (líneas 357–365) con los valores de la prop
- Si `bancoCuenta` es null o campos vacíos: mostrar aviso amarillo *"El administrador aún no ha configurado la cuenta bancaria de este condominio."* y deshabilitar tab de transferencia

**`Cobros.tsx`**
- Al cargar: fetch `SELECT banco, tipo_cuenta, numero_cuenta, beneficiario, rnc FROM condominios WHERE id = condominio_id`
- Pasar resultado como prop `bancoCuenta` al componente `PaymentGateway`

---

## Feature 2: Importar Inquilinos por CSV

### Librería
```bash
npm install papaparse @types/papaparse
```

### Formato CSV esperado
```
nombre_completo,email,telefono,numero_apartamento
María González,maria@email.com,809-555-0101,101
Carlos Ramírez,carlos@email.com,,
```
- `nombre_completo` y `email`: requeridos
- `telefono` y `numero_apartamento`: opcionales

### Flujo de importación
1. Parsear con `Papa.parse(file, { header: true, skipEmptyLines: true })`
2. Validar que cada fila tenga `nombre_completo` y `email` — filas inválidas van a errores
3. Fetch de emails existentes en el condominio → skip duplicados (registrar cuántos)
4. Fetch de unidades del condominio → mapear `numero_apartamento` → `unidad_id`
5. Bulk insert en `usuarios` con `rol = 'inquilino'`, `condominio_id` actual
6. Mostrar resumen: **X importados · Y saltados (email duplicado) · Z con error**

### UI en `Inquilinos.tsx`
- Botón "Importar CSV" al lado de "Agregar Inquilino"
- Dialog con:
  1. Zona drag-and-drop / selector de archivo `.csv`
  2. Preview: tabla con primeras 5 filas parseadas
  3. Botón "Importar" (deshabilitado hasta que haya archivo válido)
  4. Bloque de resultados post-importación con el resumen

---

## Feature 3: URL del Simulador IoT

### Archivos a crear/modificar

**`web-dashboard/.env`** (nuevo):
```
VITE_IOT_URL=http://localhost:3001
```

**`web-dashboard/.env.production`** (nuevo):
```
VITE_IOT_URL=
```
*(El admin llena la URL de producción al hacer deploy)*

**`IotControl.tsx:96`** — reemplazar:
```ts
// antes
const socket = io("http://localhost:3001", { timeout: 3000, reconnectionAttempts: 2 })
// después
const IOT_URL = import.meta.env.VITE_IOT_URL || "http://localhost:3001"
const socket = io(IOT_URL, { timeout: 3000, reconnectionAttempts: 2 })
```

---

## Feature 4: Log de Auditoría

### Base de datos (migration `00013`, misma que Feature 1)
```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  usuario_id   UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  accion       TEXT NOT NULL,   -- 'aprobar_transferencia' | 'rechazar_transferencia' | 'cambio_cuenta_bancaria'
  descripcion  TEXT NOT NULL,
  metadata     JSONB,           -- { monto, tx_id, referencia, motivo, etc. }
  created_at   TIMESTAMPTZ DEFAULT now()
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

### Puntos de inserción

| Ubicación | Acción | metadata |
|---|---|---|
| `Cobros.tsx → aprobarTransferencia()` | `aprobar_transferencia` | `{ tx_id, monto, unidad, capture_id }` |
| `Cobros.tsx → rechazarTransferencia()` | `rechazar_transferencia` | `{ tx_id, monto, unidad, motivo }` |
| `Configuracion.tsx → handleGuardar()` | `cambio_cuenta_bancaria` | `{ banco, numero_cuenta }` |

### Nueva página `Auditoria.tsx`
- Ruta: `/auditoria` (solo `admin_condominio`)
- Icono en nav: `ClipboardList`
- Tabla con columnas: Fecha/Hora · Acción (badge de color) · Descripción · Detalles
- Badges: `aprobar_transferencia` → verde · `rechazar_transferencia` → rojo · `cambio_cuenta_bancaria` → azul
- Ordenado por `created_at DESC`, límite 100 registros

---

## Archivos a crear/modificar

| Archivo | Tipo | Descripción |
|---|---|---|
| `backend/supabase/migrations/00013_bank_config_audit.sql` | Nuevo | Columnas banco en condominios + tabla audit_log + RLS |
| `web-dashboard/src/pages/Configuracion.tsx` | Nuevo | Página de configuración cuenta bancaria |
| `web-dashboard/src/pages/Auditoria.tsx` | Nuevo | Página de log de auditoría |
| `web-dashboard/src/App.tsx` | Modificar | Agregar rutas y nav links para Configuracion y Auditoria |
| `web-dashboard/src/components/PaymentGateway.tsx` | Modificar | Reemplazar hardcode con prop `bancoCuenta` |
| `web-dashboard/src/pages/Cobros.tsx` | Modificar | Fetch banco, pasar prop, insertar audit_log |
| `web-dashboard/src/pages/IotControl.tsx` | Modificar | Usar `VITE_IOT_URL` env var |
| `web-dashboard/src/pages/Inquilinos.tsx` | Modificar | Agregar botón + dialog de importación CSV |
| `web-dashboard/.env` | Nuevo | `VITE_IOT_URL=http://localhost:3001` |
| `web-dashboard/.env.production` | Nuevo | `VITE_IOT_URL=` (vacío, para completar en deploy) |

---

## Criterios de éxito

- [ ] El admin puede guardar datos bancarios reales desde `/configuracion` y los inquilinos los ven en el PaymentGateway al pagar por transferencia
- [ ] El CSV de 40 inquilinos se importa en ≤10 segundos con reporte de resultados claro
- [ ] La página IoT no tira errores de conexión en producción (URL configurable por env)
- [ ] Cada aprobación/rechazo de transferencia aparece en `/auditoria` con usuario, monto y fecha

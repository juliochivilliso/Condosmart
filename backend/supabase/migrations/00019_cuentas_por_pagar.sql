-- ============================================================
--  Migration 00019 — Cuentas por Pagar / Proveedores
--  Módulo de gestión de proveedores y egresos del condominio
-- ============================================================

-- 1. Tabla proveedores
CREATE TABLE IF NOT EXISTS public.proveedores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id     UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  nombre            VARCHAR(255) NOT NULL,
  rnc               VARCHAR(20),
  categoria_servicio VARCHAR(100),   -- plomeria, electricidad, jardineria, seguridad, limpieza, administracion, otro
  telefono          VARCHAR(20),
  email             VARCHAR(255),
  direccion         TEXT,
  activo            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabla cuentas_por_pagar (facturas de proveedores)
CREATE TABLE IF NOT EXISTS public.cuentas_por_pagar (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id     UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  proveedor_id      UUID NOT NULL REFERENCES public.proveedores(id) ON DELETE RESTRICT,
  numero_factura    VARCHAR(100),
  descripcion       TEXT,
  categoria_gasto   VARCHAR(100) NOT NULL DEFAULT 'servicios',
  monto             DECIMAL(12, 2) NOT NULL CHECK (monto >= 0),
  saldo_pendiente   DECIMAL(12, 2) NOT NULL CHECK (saldo_pendiente >= 0),
  estado            VARCHAR(50) NOT NULL DEFAULT 'pendiente',  -- pendiente, pagado_parcial, pagado, vencido, cancelado
  fecha_emision     DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE NOT NULL,
  fecha_pago        DATE,
  metodo_pago       VARCHAR(50),    -- transferencia, cheque, efectivo, tarjeta
  referencia_pago   VARCHAR(255),
  comprobante_url   VARCHAR(1024),
  notas             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_proveedores_condominio
  ON public.proveedores (condominio_id, activo);

CREATE INDEX IF NOT EXISTS idx_cpp_condominio_estado
  ON public.cuentas_por_pagar (condominio_id, estado);

CREATE INDEX IF NOT EXISTS idx_cpp_proveedor
  ON public.cuentas_por_pagar (proveedor_id);

CREATE INDEX IF NOT EXISTS idx_cpp_vencimiento
  ON public.cuentas_por_pagar (condominio_id, fecha_vencimiento);

-- 4. Trigger updated_at
CREATE TRIGGER trg_proveedores_updated_at
  BEFORE UPDATE ON public.proveedores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_cuentas_por_pagar_updated_at
  BEFORE UPDATE ON public.cuentas_por_pagar
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
--  5. RLS — proveedores
-- ============================================================
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;

-- Admin: gestión completa de su condominio
DROP POLICY IF EXISTS "proveedores_admin_all" ON public.proveedores;
CREATE POLICY "proveedores_admin_all" ON public.proveedores
  FOR ALL USING (
    condominio_id = (SELECT condominio_id FROM public.usuarios WHERE id = auth.uid())
    AND (SELECT rol FROM public.usuarios WHERE id = auth.uid()) IN ('admin_condominio', 'super_admin')
  );

-- ============================================================
--  6. RLS — cuentas_por_pagar
-- ============================================================
ALTER TABLE public.cuentas_por_pagar ENABLE ROW LEVEL SECURITY;

-- Admin: gestión completa de su condominio
DROP POLICY IF EXISTS "cuentas_por_pagar_admin_all" ON public.cuentas_por_pagar;
CREATE POLICY "cuentas_por_pagar_admin_all" ON public.cuentas_por_pagar
  FOR ALL USING (
    condominio_id = (SELECT condominio_id FROM public.usuarios WHERE id = auth.uid())
    AND (SELECT rol FROM public.usuarios WHERE id = auth.uid()) IN ('admin_condominio', 'super_admin')
  );

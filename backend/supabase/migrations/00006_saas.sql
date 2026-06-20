-- Phase 5: SaaS Multi-residencial
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS planes_suscripcion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(50) NOT NULL UNIQUE,
  precio_mensual DECIMAL(10,2) NOT NULL,
  max_unidades INT NOT NULL,
  max_usuarios INT NOT NULL,
  tiene_iot BOOLEAN DEFAULT false,
  tiene_reportes BOOLEAN DEFAULT false,
  tiene_api BOOLEAN DEFAULT false,
  color VARCHAR(20) DEFAULT 'blue',
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suscripciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES planes_suscripcion(id),
  estado VARCHAR(20) DEFAULT 'trial',  -- trial | activa | cancelada | vencida
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  monto_mensual DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(condominio_id)
);

CREATE TABLE IF NOT EXISTS pagos_suscripcion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suscripcion_id UUID REFERENCES suscripciones(id),
  condominio_id UUID NOT NULL REFERENCES condominios(id),
  monto DECIMAL(10,2) NOT NULL,
  metodo_pago VARCHAR(30) DEFAULT 'tarjeta',  -- tarjeta | paypal | transferencia
  estado VARCHAR(20) DEFAULT 'completado',    -- completado | fallido | pendiente
  referencia VARCHAR(100),
  ultimos4 VARCHAR(4),
  descripcion TEXT,
  fecha_pago TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE planes_suscripcion ENABLE ROW LEVEL SECURITY;
ALTER TABLE suscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_suscripcion ENABLE ROW LEVEL SECURITY;

-- Planes: todos los autenticados pueden leer
CREATE POLICY "planes_select" ON planes_suscripcion
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "planes_superadmin_manage" ON planes_suscripcion
  FOR ALL
  USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'super_admin'));

-- Suscripciones: super_admin gestiona todo
CREATE POLICY "suscripciones_superadmin" ON suscripciones
  FOR ALL
  USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'super_admin'));

-- Admin condominio: ver y actualizar su propia suscripción
CREATE POLICY "suscripciones_admin_select" ON suscripciones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuarios u WHERE u.id = auth.uid()
      AND u.rol = 'admin_condominio' AND u.condominio_id = suscripciones.condominio_id
    )
  );

CREATE POLICY "suscripciones_admin_update" ON suscripciones
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM usuarios u WHERE u.id = auth.uid()
      AND u.rol = 'admin_condominio' AND u.condominio_id = suscripciones.condominio_id
    )
  );

CREATE POLICY "suscripciones_admin_insert" ON suscripciones
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios u WHERE u.id = auth.uid()
      AND u.rol = 'admin_condominio' AND u.condominio_id = suscripciones.condominio_id
    )
  );

-- Pagos suscripción: super_admin todo
CREATE POLICY "pagos_sus_superadmin" ON pagos_suscripcion
  FOR ALL
  USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'super_admin'));

-- Admin condominio: ver e insertar sus propios pagos
CREATE POLICY "pagos_sus_admin_select" ON pagos_suscripcion
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuarios u WHERE u.id = auth.uid()
      AND u.rol = 'admin_condominio' AND u.condominio_id = pagos_suscripcion.condominio_id
    )
  );

CREATE POLICY "pagos_sus_admin_insert" ON pagos_suscripcion
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios u WHERE u.id = auth.uid()
      AND u.rol = 'admin_condominio' AND u.condominio_id = pagos_suscripcion.condominio_id
    )
  );

-- Seed: Planes de suscripción
INSERT INTO planes_suscripcion (nombre, precio_mensual, max_unidades, max_usuarios, tiene_iot, tiene_reportes, tiene_api, color, descripcion)
VALUES
  ('Lite',        49.00,   50,  3, false, false, false, 'slate',
   'Ideal para condominios pequeños. Gestión básica de unidades, cobros y tickets.'),
  ('Pro',        149.00,  200, 10,  true,  true, false, 'blue',
   'Para condominios medianos. Incluye IoT, reportes ejecutivos y soporte estándar.'),
  ('Enterprise', 399.00, 1000, 50,  true,  true,  true, 'violet',
   'Solución empresarial completa. API pública, SLA garantizado y soporte 24/7.')
ON CONFLICT (nombre) DO NOTHING;

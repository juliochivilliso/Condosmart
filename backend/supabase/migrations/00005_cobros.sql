-- 00005_cobros.sql
-- Motor de Cobros: comprobante de pago en transacciones + políticas RLS para admin

-- Agregar columna comprobante a transacciones
ALTER TABLE transacciones
  ADD COLUMN IF NOT EXISTS comprobante_url VARCHAR(1024);

-- Políticas RLS para admin_condominio sobre transacciones
DROP POLICY IF EXISTS "Transacciones: admin_condominio CRUD" ON transacciones;
CREATE POLICY "Transacciones: admin_condominio CRUD" ON transacciones FOR ALL
  USING (
    condominio_id = (SELECT condominio_id FROM usuarios WHERE id = auth.uid())
    AND (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'admin_condominio'
  )
  WITH CHECK (
    condominio_id = (SELECT condominio_id FROM usuarios WHERE id = auth.uid())
    AND (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'admin_condominio'
  );

-- Política RLS para super_admin sobre transacciones (lectura global)
DROP POLICY IF EXISTS "Transacciones: super_admin SELECT" ON transacciones;
CREATE POLICY "Transacciones: super_admin SELECT" ON transacciones FOR SELECT
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'super_admin'
  );

-- Política RLS para admin_condominio sobre unidades (necesaria para generar cuotas)
DROP POLICY IF EXISTS "Unidades: admin_condominio SELECT" ON unidades;
CREATE POLICY "Unidades: admin_condominio SELECT" ON unidades FOR SELECT
  USING (
    condominio_id = (SELECT condominio_id FROM usuarios WHERE id = auth.uid())
    AND (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('admin_condominio', 'super_admin')
  );

-- Política RLS para inquilinos (actualizar para subir comprobante o simular pago)
DROP POLICY IF EXISTS "Transacciones: inquilino UPDATE" ON transacciones;
CREATE POLICY "Transacciones: inquilino UPDATE" ON transacciones FOR UPDATE
  USING (
    unidad_id IN (SELECT unidad_id FROM usuarios WHERE id = auth.uid() AND rol = 'inquilino')
  )
  WITH CHECK (
    unidad_id IN (SELECT unidad_id FROM usuarios WHERE id = auth.uid() AND rol = 'inquilino')
  );

-- Storage bucket para comprobantes (ejecutar en Supabase Dashboard > Storage si no existe)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('comprobantes', 'comprobantes', false) ON CONFLICT DO NOTHING;

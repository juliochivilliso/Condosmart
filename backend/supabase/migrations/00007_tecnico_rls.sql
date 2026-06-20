-- 00007_tecnico_rls.sql
-- Políticas RLS para el rol 'tecnico'

-- Tickets: Los técnicos pueden ver y actualizar los tickets que tienen asignados.
DROP POLICY IF EXISTS "Tickets: tecnico SELECT" ON tickets_tecnicos;
CREATE POLICY "Tickets: tecnico SELECT" ON tickets_tecnicos FOR SELECT
  USING (
    tecnico_id = auth.uid() OR 
    (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('admin_condominio', 'super_admin')
  );

DROP POLICY IF EXISTS "Tickets: tecnico UPDATE" ON tickets_tecnicos;
CREATE POLICY "Tickets: tecnico UPDATE" ON tickets_tecnicos FOR UPDATE
  USING (
    tecnico_id = auth.uid()
  )
  WITH CHECK (
    tecnico_id = auth.uid()
  );

-- Storage bucket para evidencias (ejecutar en Supabase Dashboard > Storage si no existe)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('evidencias', 'evidencias', true) ON CONFLICT DO NOTHING;

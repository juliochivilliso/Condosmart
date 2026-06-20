-- Super Admin puede hacer CRUD completo en la tabla usuarios
DROP POLICY IF EXISTS "Usuarios: super_admin CRUD" ON usuarios;
CREATE POLICY "Usuarios: super_admin CRUD" ON usuarios FOR ALL
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'super_admin'
  )
  WITH CHECK (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'super_admin'
  );

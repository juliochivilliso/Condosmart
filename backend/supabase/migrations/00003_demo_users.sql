-- =============================================================================
-- USUARIOS DEMO CONDOSMART — Auth + Profiles + RLS
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- Proyecto: ofjsodxsdbkiugonnmkh
--
-- CREDENCIALES:
--   superadmin@condosmart.do  /  CondoSmart2026!  →  Super Admin
--   admin@laspalmas.do        /  CondoSmart2026!  →  Admin Residencial
--   maria@laspalmas.do        /  CondoSmart2026!  →  Inquilino Apto 101
--
-- IMPORTANTE: Ejecutar DESPUÉS de 00002_seed_demo.sql
-- =============================================================================

-- UUIDs fijos para los 3 usuarios
-- Super Admin:       a0000001-0000-0000-0000-000000000001
-- Admin Residencial: a0000002-0000-0000-0000-000000000001
-- Inquilino (María): a0000003-0000-0000-0000-000000000001

-- =============================================================================
-- PASO 1: Crear en auth.users (habilita el login en Supabase)
-- =============================================================================

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES
  (
    'a0000001-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'superadmin@condosmart.do',
    crypt('CondoSmart2026!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"nombre_completo":"Super Administrador"}',
    now(), now(), '', '', '', ''
  ),
  (
    'a0000002-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'admin@laspalmas.do',
    crypt('CondoSmart2026!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"nombre_completo":"Administrador Las Palmas"}',
    now(), now(), '', '', '', ''
  ),
  (
    'a0000003-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'maria@laspalmas.do',
    crypt('CondoSmart2026!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"nombre_completo":"María González"}',
    now(), now(), '', '', '', ''
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PASO 2: Crear identidades (requerido para login con email/password)
-- =============================================================================

INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES
  (
    gen_random_uuid(),
    'a0000001-0000-0000-0000-000000000001',
    'superadmin@condosmart.do',
    '{"sub":"a0000001-0000-0000-0000-000000000001","email":"superadmin@condosmart.do","email_verified":true}',
    'email', now(), now(), now()
  ),
  (
    gen_random_uuid(),
    'a0000002-0000-0000-0000-000000000001',
    'admin@laspalmas.do',
    '{"sub":"a0000002-0000-0000-0000-000000000001","email":"admin@laspalmas.do","email_verified":true}',
    'email', now(), now(), now()
  ),
  (
    gen_random_uuid(),
    'a0000003-0000-0000-0000-000000000001',
    'maria@laspalmas.do',
    '{"sub":"a0000003-0000-0000-0000-000000000001","email":"maria@laspalmas.do","email_verified":true}',
    'email', now(), now(), now()
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- PASO 3: Crear perfiles en public.usuarios (datos del dashboard)
-- =============================================================================

INSERT INTO usuarios (id, email, nombre_completo, telefono, rol, condominio_id, unidad_id, activo)
VALUES
  (
    'a0000001-0000-0000-0000-000000000001',
    'superadmin@condosmart.do',
    'Super Administrador',
    '809-500-0001',
    'super_admin',
    NULL,
    NULL,
    TRUE
  ),
  (
    'a0000002-0000-0000-0000-000000000001',
    'admin@laspalmas.do',
    'Administrador Las Palmas',
    '809-500-0002',
    'admin_condominio',
    'a1b2c3d4-0000-0000-0000-000000000001',
    NULL,
    TRUE
  ),
  (
    'a0000003-0000-0000-0000-000000000001',
    'maria@laspalmas.do',
    'María González',
    '809-555-0101',
    'inquilino',
    'a1b2c3d4-0000-0000-0000-000000000001',
    '00000001-0000-0000-0000-000000000001',
    TRUE
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PASO 4: Actualizar RLS para que admins puedan ver todos los datos
-- =============================================================================

-- Usuarios: cada uno ve el suyo; admins ven todos los de su condominio
DROP POLICY IF EXISTS "Usuarios ven sus propios perfiles" ON usuarios;
CREATE POLICY "Usuarios: acceso por rol" ON usuarios FOR SELECT
  USING (
    id = auth.uid()
    OR (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'super_admin'
    OR (
      (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'admin_condominio'
      AND condominio_id = (SELECT condominio_id FROM usuarios WHERE id = auth.uid())
    )
  );

-- Transacciones: admins ven todas las de su condominio; inquilinos las suyas
DROP POLICY IF EXISTS "Transacciones inquilino" ON transacciones;
CREATE POLICY "Transacciones: acceso por rol" ON transacciones FOR SELECT
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'super_admin'
    OR condominio_id = (SELECT condominio_id FROM usuarios WHERE id = auth.uid())
  );

-- Unidades: admins ven todas las de su condominio
DROP POLICY IF EXISTS "Unidades inquilino" ON unidades;
CREATE POLICY "Unidades: acceso por rol" ON unidades FOR SELECT
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'super_admin'
    OR condominio_id = (SELECT condominio_id FROM usuarios WHERE id = auth.uid())
    OR id = (SELECT unidad_id FROM usuarios WHERE id = auth.uid())
  );

-- Tickets: admins ven todos los de su condominio
DROP POLICY IF EXISTS "Tickets inquilino" ON tickets_tecnicos;
DROP POLICY IF EXISTS "Tickets tecnico" ON tickets_tecnicos;
CREATE POLICY "Tickets: acceso por rol" ON tickets_tecnicos FOR SELECT
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'super_admin'
    OR condominio_id = (SELECT condominio_id FROM usuarios WHERE id = auth.uid())
  );

-- IoT: admins pueden leer y modificar
DROP POLICY IF EXISTS "IoT visible para admins" ON dispositivos_iot;
CREATE POLICY "IoT: acceso por rol" ON dispositivos_iot FOR ALL
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'super_admin'
    OR condominio_id = (SELECT condominio_id FROM usuarios WHERE id = auth.uid())
  );

-- Condominios: super_admin ve todos; admin_condominio ve el suyo
CREATE POLICY "Condominios: acceso por rol" ON condominios FOR SELECT
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'super_admin'
    OR id = (SELECT condominio_id FROM usuarios WHERE id = auth.uid())
  );

-- =============================================================================
-- VERIFICACIÓN — debe retornar 3 filas en cada tabla
-- =============================================================================
SELECT 'auth.users'      AS tabla, COUNT(*) AS total FROM auth.users
  WHERE id IN (
    'a0000001-0000-0000-0000-000000000001',
    'a0000002-0000-0000-0000-000000000001',
    'a0000003-0000-0000-0000-000000000001'
  )
UNION ALL
SELECT 'auth.identities', COUNT(*) FROM auth.identities
  WHERE user_id IN (
    'a0000001-0000-0000-0000-000000000001',
    'a0000002-0000-0000-0000-000000000001',
    'a0000003-0000-0000-0000-000000000001'
  )
UNION ALL
SELECT 'public.usuarios', COUNT(*) FROM usuarios
  WHERE id IN (
    'a0000001-0000-0000-0000-000000000001',
    'a0000002-0000-0000-0000-000000000001',
    'a0000003-0000-0000-0000-000000000001'
  );

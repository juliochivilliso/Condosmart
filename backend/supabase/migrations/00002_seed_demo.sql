-- =============================================================================
-- SEED DATA para CondoSmart Demo
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- Proyecto: ofjsodxsdbkiugonnmkh
-- =============================================================================

-- 1. Condominio principal
INSERT INTO condominios (id, nombre, direccion, ciudad, cantidad_unidades, activo)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Residencial Las Palmas',
  'Av. Winston Churchill 152',
  'Santo Domingo',
  24,
  TRUE
) ON CONFLICT (id) DO NOTHING;

-- 2. Unidades
INSERT INTO unidades (id, condominio_id, numero_apartamento, bloque, piso, cuota_mantenimiento, activo)
VALUES
  ('00000001-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', '101', 'A', 1, 8500.00, TRUE),
  ('00000002-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', '102', 'A', 1, 8500.00, TRUE),
  ('00000003-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', '203', 'B', 2, 9200.00, TRUE),
  ('00000004-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', '305', 'C', 3, 9200.00, TRUE),
  ('00000005-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', '401', 'D', 4, 11000.00, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 3. Usuarios (inquilinos) — IDs ficticios, no vinculados a auth.users para demo
INSERT INTO usuarios (id, email, nombre_completo, telefono, rol, condominio_id, unidad_id, activo)
VALUES
  ('f1000001-0000-0000-0000-000000000001', 'maria.gonzalez@email.com',  'María González',  '809-555-0101', 'inquilino', 'a1b2c3d4-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', TRUE),
  ('f1000002-0000-0000-0000-000000000001', 'carlos.ramirez@email.com',  'Carlos Ramírez',  '809-555-0202', 'inquilino', 'a1b2c3d4-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000001', TRUE),
  ('f1000003-0000-0000-0000-000000000001', 'ana.martinez@email.com',    'Ana Martínez',    '809-555-0303', 'inquilino', 'a1b2c3d4-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000001', TRUE),
  ('f1000004-0000-0000-0000-000000000001', 'luis.perez@email.com',      'Luis Pérez',      '809-555-0404', 'inquilino', 'a1b2c3d4-0000-0000-0000-000000000001', NULL, TRUE),
  ('f1000005-0000-0000-0000-000000000001', 'carmen.jimenez@email.com',  'Carmen Jiménez',  '829-555-0505', 'inquilino', 'a1b2c3d4-0000-0000-0000-000000000001', '00000004-0000-0000-0000-000000000001', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 4. Transacciones
INSERT INTO transacciones (id, condominio_id, unidad_id, monto, tipo_servicio, concepto, estado, metodo_pago, fecha_vencimiento, fecha_pago)
VALUES
  (uuid_generate_v4(), 'a1b2c3d4-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 8500.00,  'mantenimiento', 'Cuota Mayo 2026',      'pagado',    'transferencia', '2026-05-05', '2026-05-01'),
  (uuid_generate_v4(), 'a1b2c3d4-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000001', 8500.00,  'mantenimiento', 'Cuota Mayo 2026',      'pagado',    'billetera',     '2026-05-05', '2026-04-30'),
  (uuid_generate_v4(), 'a1b2c3d4-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000001', 9200.00,  'mantenimiento', 'Cuota Mayo 2026',      'pendiente', NULL,            '2026-05-05', NULL),
  (uuid_generate_v4(), 'a1b2c3d4-0000-0000-0000-000000000001', '00000004-0000-0000-0000-000000000001', 9200.00,  'mantenimiento', 'Cuota Mayo 2026',      'pagado',    'tarjeta',       '2026-05-05', '2026-04-29'),
  (uuid_generate_v4(), 'a1b2c3d4-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 3200.00,  'fondo_reserva', 'Fondo Reserva Q2',     'pagado',    'transferencia', '2026-04-30', '2026-04-28'),
  (uuid_generate_v4(), 'a1b2c3d4-0000-0000-0000-000000000001', '00000005-0000-0000-0000-000000000001', 11000.00, 'mantenimiento', 'Cuota Mayo 2026',      'pagado',    'transferencia', '2026-05-05', '2026-05-01'),
  (uuid_generate_v4(), 'a1b2c3d4-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000001', 1800.00,  'agua',          'Consumo agua Abril',   'pagado',    'otro',          '2026-04-30', '2026-04-25'),
  (uuid_generate_v4(), 'a1b2c3d4-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000001', 900.00,   'luz',           'Consumo luz Abril',    'pagado',    'billetera',     '2026-04-30', '2026-04-26')
ON CONFLICT DO NOTHING;

-- 5. Tickets Técnicos
INSERT INTO tickets_tecnicos (id, condominio_id, unidad_id, categoria, titulo, descripcion, estado, created_at)
VALUES
  (uuid_generate_v4(), 'a1b2c3d4-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'plomería',     'Filtración en techo',          'Goteo en el pasillo principal',     'pendiente',   '2026-04-28 10:00:00+00'),
  (uuid_generate_v4(), 'a1b2c3d4-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000001', 'electricidad', 'Ascensor B sin funcionar',     'Ascensor parado desde el lunes',    'en_progreso', '2026-04-27 09:00:00+00'),
  (uuid_generate_v4(), 'a1b2c3d4-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000001', 'pintura',      'Humedad en pared corredor',    'Mancha de humedad visible',         'completado',  '2026-04-20 14:00:00+00'),
  (uuid_generate_v4(), 'a1b2c3d4-0000-0000-0000-000000000001', '00000004-0000-0000-0000-000000000001', 'carpintería',  'Puerta de acceso dañada',      'No cierra correctamente',           'pendiente',   '2026-04-29 16:30:00+00'),
  (uuid_generate_v4(), 'a1b2c3d4-0000-0000-0000-000000000001', '00000005-0000-0000-0000-000000000001', 'jardinería',   'Sistema de riego automático',  'No enciende en horario programado', 'en_progreso', '2026-04-26 11:00:00+00')
ON CONFLICT DO NOTHING;

-- 6. Dispositivos IoT
INSERT INTO dispositivos_iot (id, condominio_id, nombre, tipo, ubicacion, estado_actual, activo)
VALUES
  (uuid_generate_v4(), 'a1b2c3d4-0000-0000-0000-000000000001', 'Bomba Principal',       'bomba_agua',  'Cuarto técnico',        TRUE,  TRUE),
  (uuid_generate_v4(), 'a1b2c3d4-0000-0000-0000-000000000001', 'Bomba Secundaria',      'bomba_agua',  'Cuarto técnico',        FALSE, TRUE),
  (uuid_generate_v4(), 'a1b2c3d4-0000-0000-0000-000000000001', 'Luminaria Entrada',     'luminaria',   'Lobby principal',       TRUE,  TRUE),
  (uuid_generate_v4(), 'a1b2c3d4-0000-0000-0000-000000000001', 'Luminaria Estacionam.', 'luminaria',   'Estacionamiento',       TRUE,  TRUE),
  (uuid_generate_v4(), 'a1b2c3d4-0000-0000-0000-000000000001', 'Cerradura Acceso A',    'cerradura',   'Entrada bloque A',      TRUE,  TRUE),
  (uuid_generate_v4(), 'a1b2c3d4-0000-0000-0000-000000000001', 'Cerradura Acceso B',    'cerradura',   'Entrada bloque B',      FALSE, TRUE),
  (uuid_generate_v4(), 'a1b2c3d4-0000-0000-0000-000000000001', 'Termostato Lobby',      'termostato',  'Lobby principal',       TRUE,  TRUE),
  (uuid_generate_v4(), 'a1b2c3d4-0000-0000-0000-000000000001', 'Termostato Piscina',    'termostato',  'Área piscina',          FALSE, TRUE)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- Verificación rápida
-- =============================================================================
SELECT 'condominios'    AS tabla, COUNT(*) FROM condominios    WHERE id = 'a1b2c3d4-0000-0000-0000-000000000001'
UNION ALL
SELECT 'unidades',       COUNT(*) FROM unidades        WHERE condominio_id = 'a1b2c3d4-0000-0000-0000-000000000001'
UNION ALL
SELECT 'usuarios',       COUNT(*) FROM usuarios        WHERE condominio_id = 'a1b2c3d4-0000-0000-0000-000000000001'
UNION ALL
SELECT 'transacciones',  COUNT(*) FROM transacciones   WHERE condominio_id = 'a1b2c3d4-0000-0000-0000-000000000001'
UNION ALL
SELECT 'tickets',        COUNT(*) FROM tickets_tecnicos WHERE condominio_id = 'a1b2c3d4-0000-0000-0000-000000000001'
UNION ALL
SELECT 'iot',            COUNT(*) FROM dispositivos_iot WHERE condominio_id = 'a1b2c3d4-0000-0000-0000-000000000001';

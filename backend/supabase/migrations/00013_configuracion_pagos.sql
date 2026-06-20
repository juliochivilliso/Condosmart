-- 00013_configuracion_pagos.sql
-- Agrega columna JSONB para configuración bancaria por condominio

ALTER TABLE condominios
  ADD COLUMN IF NOT EXISTS configuracion_pagos JSONB;

-- Actualizar el demo seed con datos de ejemplo
UPDATE condominios
SET configuracion_pagos = '{
  "banco": "Banco de Reservas (Banreservas)",
  "tipo_cuenta": "Corriente",
  "numero_cuenta": "PENDIENTE-CONFIGURAR",
  "beneficiario": "Administración Residencial Las Palmas",
  "rnc": ""
}'::jsonb
WHERE id = 'a1b2c3d4-0000-0000-0000-000000000001';

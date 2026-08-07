-- 00018_performance_constraints.sql
-- Índices compuestos, trigger genérico de updated_at y constraints de unicidad.

-------------------------------------------------------------------------------
-- 1. ÍNDICES COMPUESTOS (queries más frecuentes por página)
-------------------------------------------------------------------------------

-- transacciones: dashboard financiero, cobros, estado de cuenta por unidad
CREATE INDEX IF NOT EXISTS idx_transacciones_condominio_estado_venc
  ON transacciones (condominio_id, estado, fecha_vencimiento);

CREATE INDEX IF NOT EXISTS idx_transacciones_unidad
  ON transacciones (unidad_id);

CREATE INDEX IF NOT EXISTS idx_transacciones_condominio_tipo_mes
  ON transacciones (condominio_id, tipo_servicio, fecha_vencimiento);

-- usuarios: scope por condominio y rol
CREATE INDEX IF NOT EXISTS idx_usuarios_condominio_rol
  ON usuarios (condominio_id, rol);

CREATE INDEX IF NOT EXISTS idx_usuarios_rol
  ON usuarios (rol);

-- unidades: listas por condominio
CREATE INDEX IF NOT EXISTS idx_unidades_condominio_activo
  ON unidades (condominio_id, activo);

-- tickets_tecnicos: filtro por condominio y estado
CREATE INDEX IF NOT EXISTS idx_tickets_condominio_estado
  ON tickets_tecnicos (condominio_id, estado);

CREATE INDEX IF NOT EXISTS idx_tickets_tecnico
  ON tickets_tecnicos (tecnico_id);

-- notificaciones: bandeja del usuario
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario_leido
  ON notificaciones (usuario_id, leido);

-- anuncios: listado por condominio
CREATE INDEX IF NOT EXISTS idx_anuncios_condominio_fecha
  ON anuncios (condominio_id, created_at DESC);

-- dispositivos_iot: control por condominio y tipo
CREATE INDEX IF NOT EXISTS idx_iot_condominio_tipo
  ON dispositivos_iot (condominio_id, tipo);

-- visitantes: bitácora por condominio (ya existe idx_visitantes_condominio_entrada en 00010)
CREATE INDEX IF NOT EXISTS idx_visitantes_condominio_hora
  ON visitantes (condominio_id, hora_entrada DESC);

-- reservas: ya tiene idx_reservas_area_fecha e idx_reservas_condominio en 00009

-- leads: captación de marketing
CREATE INDEX IF NOT EXISTS idx_leads_created_at
  ON leads (created_at DESC);

-------------------------------------------------------------------------------
-- 2. TRIGGER GENÉRICO DE updated_at
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas con columna updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'condominios', 'transacciones', 'tickets_tecnicos', 'servicios_publicos',
    'dispositivos_iot', 'notificaciones_preferencias', 'anuncios', 'app_config'
  ]
  LOOP
    BEGIN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON %1$I;
         CREATE TRIGGER trg_%1$s_updated_at
         BEFORE UPDATE ON %1$I
         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        tbl
      );
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'Tabla % no existe, omitiendo trigger', tbl;
    END;
  END LOOP;
END $$;

-------------------------------------------------------------------------------
-- 3. CONSTRAINTS DE UNICIDAD (evitar duplicados de negocio)
-------------------------------------------------------------------------------

-- NOTA: El seed de demo (00002) creó unidades duplicadas en 3 formatos de ID
-- (0000000x, 1000000x, e000000x) referenciadas por transacciones. Por eso NO se
-- aplica UNIQUE en unidades/transacciones hasta limpiar los datos demo.

-- Una preferencia por usuario y tipo de notificación
CREATE UNIQUE INDEX IF NOT EXISTS uq_notif_prefs_usuario_tipo
  ON notificaciones_preferencias (usuario_id, tipo_notificacion);

-- No duplicar áreas comunes con el mismo nombre en un condominio
CREATE UNIQUE INDEX IF NOT EXISTS uq_areas_comunes_condominio_nombre
  ON areas_comunes (condominio_id, nombre);

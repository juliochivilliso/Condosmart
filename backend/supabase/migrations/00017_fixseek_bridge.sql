-- 00017_fixseek_bridge.sql
-- Integración con FixSeek (MoneyAPP): vincula tickets_tecnicos con service_requests de Firestore.

-- Columna para guardar el ID del service_request creado en Firestore por FixSeek.
ALTER TABLE tickets_tecnicos
  ADD COLUMN IF NOT EXISTS fixseek_request_id VARCHAR(255);

-- Metadatos del profesional/cotización devueltos por FixSeek.
ALTER TABLE tickets_tecnicos
  ADD COLUMN IF NOT EXISTS fixseek_profesional_nombre VARCHAR(255);

-- Índice para búsquedas por request_id externo.
CREATE INDEX IF NOT EXISTS idx_tickets_fixseek_request_id
  ON tickets_tecnicos(fixseek_request_id);

-- Trigger: cuando FixSeek actualiza el estado de un ticket vinculado,
-- se inserta una notificación para el inquilino de la unidad (y admin del condominio).
CREATE OR REPLACE FUNCTION notify_ticket_fixseek_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado IS DISTINCT FROM OLD.estado AND NEW.fixseek_request_id IS NOT NULL THEN
    -- Notificar al inquilino asociado a la unidad
    INSERT INTO notificaciones (condominio_id, usuario_id, titulo, mensaje, tipo, prioridad, canal)
    SELECT
      NEW.condominio_id,
      u.usuario_id,
      'Ticket actualizado',
      format('Tu ticket "%s" cambió a estado: %s', NEW.titulo, NEW.estado),
      'tecnico',
      'normal',
      'inapp'
    FROM unidades u
    WHERE u.id = NEW.unidad_id AND u.usuario_id IS NOT NULL;

    -- Notificar a los administradores del condominio
    INSERT INTO notificaciones (condominio_id, usuario_id, titulo, mensaje, tipo, prioridad, canal)
    SELECT
      NEW.condominio_id,
      adm.id,
      'Ticket actualizado por FixSeek',
      format('El ticket "%s" (solicitado en FixSeek) cambió a estado: %s', NEW.titulo, NEW.estado),
      'tecnico',
      'normal',
      'inapp'
    FROM usuarios adm
    WHERE adm.condominio_id = NEW.condominio_id
      AND adm.rol = 'admin_condominio'
      AND adm.activo = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_ticket_fixseek_update ON tickets_tecnicos;
CREATE TRIGGER trg_ticket_fixseek_update
AFTER UPDATE ON tickets_tecnicos
FOR EACH ROW
EXECUTE FUNCTION notify_ticket_fixseek_update();

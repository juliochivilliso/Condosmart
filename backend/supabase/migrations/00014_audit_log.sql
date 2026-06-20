-- 00014_audit_log.sql
-- Nota: La columna configuracion_pagos JSONB ya existe en condominios (migration 00013).
-- Esta migración agrega: política RLS de UPDATE en condominios + tabla audit_log.

-- Permitir que el admin de cada condominio actualice sus datos bancarios
CREATE POLICY "admin puede actualizar su condominio"
  ON condominios FOR UPDATE
  USING (id IN (
    SELECT condominio_id FROM usuarios WHERE id = auth.uid()
  ));

-- Feature 4: Tabla de auditoría
CREATE TABLE IF NOT EXISTS audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  usuario_id    UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  accion        TEXT NOT NULL,
  descripcion   TEXT NOT NULL,
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin puede ver audit_log de su condominio"
  ON audit_log FOR SELECT
  USING (condominio_id IN (
    SELECT condominio_id FROM usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "admin puede insertar en audit_log"
  ON audit_log FOR INSERT
  WITH CHECK (condominio_id IN (
    SELECT condominio_id FROM usuarios WHERE id = auth.uid()
  ));

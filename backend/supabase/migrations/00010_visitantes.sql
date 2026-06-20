-- ============================================================
--  Migration 00010 — Control de Visitantes
-- ============================================================

-- 1. Enum tipo_documento
DO $$ BEGIN
  CREATE TYPE tipo_documento AS ENUM ('cedula', 'pasaporte', 'otro');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Tabla visitantes
CREATE TABLE IF NOT EXISTS public.visitantes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id     UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  unidad_id         UUID REFERENCES public.unidades(id) ON DELETE SET NULL,
  nombre_visitante  VARCHAR(255) NOT NULL,
  tipo_documento    tipo_documento NOT NULL DEFAULT 'cedula',
  numero_documento  VARCHAR(50),
  placa_vehiculo    VARCHAR(20),
  hora_entrada      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hora_salida       TIMESTAMPTZ,
  registrado_por    UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  notas             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Índice
CREATE INDEX IF NOT EXISTS idx_visitantes_condominio_entrada
  ON public.visitantes(condominio_id, hora_entrada DESC);

-- ============================================================
--  4. RLS
-- ============================================================
ALTER TABLE public.visitantes ENABLE ROW LEVEL SECURITY;

-- Admin: gestión completa de su condominio
DROP POLICY IF EXISTS "visitantes_admin_all" ON public.visitantes;
CREATE POLICY "visitantes_admin_all" ON public.visitantes
  FOR ALL USING (
    condominio_id = (SELECT condominio_id FROM public.usuarios WHERE id = auth.uid())
    AND (SELECT rol FROM public.usuarios WHERE id = auth.uid()) IN ('admin_condominio', 'super_admin')
  );

-- Inquilino: solo puede ver las visitas de su unidad
DROP POLICY IF EXISTS "visitantes_inquilino_select" ON public.visitantes;
CREATE POLICY "visitantes_inquilino_select" ON public.visitantes
  FOR SELECT USING (
    unidad_id = (SELECT unidad_id FROM public.usuarios WHERE id = auth.uid())
    AND condominio_id = (SELECT condominio_id FROM public.usuarios WHERE id = auth.uid())
  );

-- ============================================================
--  Migration 00009 — Reservas de Áreas Comunes
-- ============================================================

-- 1. Tabla de áreas comunes
CREATE TABLE IF NOT EXISTS public.areas_comunes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id       UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  nombre              VARCHAR(150) NOT NULL,
  descripcion         TEXT,
  capacidad           INT NOT NULL DEFAULT 1,
  requiere_aprobacion BOOLEAN NOT NULL DEFAULT FALSE,
  activo              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabla de reservas
CREATE TYPE IF NOT EXISTS estado_reserva AS ENUM ('pendiente', 'confirmada', 'cancelada');

CREATE TABLE IF NOT EXISTS public.reservas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id         UUID NOT NULL REFERENCES public.areas_comunes(id) ON DELETE CASCADE,
  condominio_id   UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  usuario_id      UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  unidad_id       UUID REFERENCES public.unidades(id) ON DELETE SET NULL,
  fecha           DATE NOT NULL,
  hora_inicio     TIME NOT NULL,
  hora_fin        TIME NOT NULL,
  proposito       VARCHAR(255),
  num_asistentes  INT NOT NULL DEFAULT 1,
  estado          estado_reserva NOT NULL DEFAULT 'confirmada',
  nota_admin      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_reservas_area_fecha ON public.reservas(area_id, fecha);
CREATE INDEX IF NOT EXISTS idx_reservas_condominio ON public.reservas(condominio_id, fecha DESC);

-- 4. Trigger anti-solapamiento
CREATE OR REPLACE FUNCTION check_reserva_solapamiento()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.reservas
    WHERE area_id   = NEW.area_id
      AND fecha     = NEW.fecha
      AND id       != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND estado   != 'cancelada'
      AND (
        (NEW.hora_inicio >= hora_inicio AND NEW.hora_inicio < hora_fin)
        OR
        (NEW.hora_fin > hora_inicio AND NEW.hora_fin <= hora_fin)
        OR
        (NEW.hora_inicio <= hora_inicio AND NEW.hora_fin >= hora_fin)
      )
  ) THEN
    RAISE EXCEPTION 'El área ya tiene una reserva en ese horario';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_solapamiento ON public.reservas;
CREATE TRIGGER trg_check_solapamiento
  BEFORE INSERT OR UPDATE ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION check_reserva_solapamiento();

-- 5. Trigger updated_at
CREATE OR REPLACE FUNCTION update_reservas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reservas_updated_at ON public.reservas;
CREATE TRIGGER trg_reservas_updated_at
  BEFORE UPDATE ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION update_reservas_updated_at();

-- ============================================================
--  6. RLS
-- ============================================================
ALTER TABLE public.areas_comunes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas       ENABLE ROW LEVEL SECURITY;

-- areas_comunes: todos los del condominio pueden leer
DROP POLICY IF EXISTS "areas_comunes_select" ON public.areas_comunes;
CREATE POLICY "areas_comunes_select" ON public.areas_comunes
  FOR SELECT USING (
    condominio_id = (
      SELECT condominio_id FROM public.usuarios WHERE id = auth.uid()
    )
  );

-- areas_comunes: admin puede gestionar
DROP POLICY IF EXISTS "areas_comunes_admin_all" ON public.areas_comunes;
CREATE POLICY "areas_comunes_admin_all" ON public.areas_comunes
  FOR ALL USING (
    (SELECT rol FROM public.usuarios WHERE id = auth.uid()) IN ('admin_condominio', 'super_admin')
  );

-- reservas: todos del condominio pueden leer
DROP POLICY IF EXISTS "reservas_select" ON public.reservas;
CREATE POLICY "reservas_select" ON public.reservas
  FOR SELECT USING (
    condominio_id = (
      SELECT condominio_id FROM public.usuarios WHERE id = auth.uid()
    )
  );

-- reservas: usuario puede crear sus propias reservas
DROP POLICY IF EXISTS "reservas_insert" ON public.reservas;
CREATE POLICY "reservas_insert" ON public.reservas
  FOR INSERT WITH CHECK (
    usuario_id = auth.uid()
    AND condominio_id = (
      SELECT condominio_id FROM public.usuarios WHERE id = auth.uid()
    )
  );

-- reservas: admin puede gestionar todo
DROP POLICY IF EXISTS "reservas_admin_all" ON public.reservas;
CREATE POLICY "reservas_admin_all" ON public.reservas
  FOR ALL USING (
    (SELECT rol FROM public.usuarios WHERE id = auth.uid()) IN ('admin_condominio', 'super_admin')
  );

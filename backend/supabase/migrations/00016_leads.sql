-- 00016_leads.sql
-- Tabla de leads capturados desde el sitio de marketing (marketing-site).

CREATE TABLE IF NOT EXISTS leads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre              TEXT NOT NULL,
  email               TEXT NOT NULL,
  telefono            TEXT,
  condominio_nombre   TEXT NOT NULL,
  num_unidades_aprox  INTEGER,
  created_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Cualquiera (incluido anon) puede insertar un lead desde el formulario público.
CREATE POLICY "Cualquiera puede insertar un lead"
  ON leads FOR INSERT
  WITH CHECK (true);

-- Solo super_admin puede leer los leads (no hay UI para esto todavía, es para uso futuro/manual).
CREATE POLICY "super_admin puede ver leads"
  ON leads FOR SELECT
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'super_admin'
  );

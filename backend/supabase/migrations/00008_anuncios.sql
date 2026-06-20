-- 00008_anuncios.sql
-- Tabla de Anuncios / Comunicados

CREATE TABLE anuncios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  contenido TEXT NOT NULL,
  imagen_url VARCHAR(1024),
  prioridad prioridad_notificacion DEFAULT 'normal',
  creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Habilitar RLS
ALTER TABLE anuncios ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Anuncios: visible para todos en el condominio" ON anuncios FOR SELECT
  USING (
    condominio_id = (SELECT condominio_id FROM usuarios WHERE id = auth.uid())
  );

CREATE POLICY "Anuncios: admin puede CRUD" ON anuncios FOR ALL
  USING (
    condominio_id = (SELECT condominio_id FROM usuarios WHERE id = auth.uid())
    AND (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('admin_condominio', 'super_admin')
  )
  WITH CHECK (
    condominio_id = (SELECT condominio_id FROM usuarios WHERE id = auth.uid())
    AND (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('admin_condominio', 'super_admin')
  );

-- Trigger para generar notificaciones automáticamente al crear un anuncio
CREATE OR REPLACE FUNCTION notify_anuncio_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar notificación para todos los inquilinos del condominio
  INSERT INTO notificaciones (condominio_id, usuario_id, titulo, mensaje, tipo, canal, prioridad)
  SELECT 
    NEW.condominio_id, 
    id, 
    NEW.titulo, 
    NEW.contenido, 
    'anuncio', 
    'push', 
    NEW.prioridad
  FROM usuarios 
  WHERE condominio_id = NEW.condominio_id AND rol = 'inquilino' AND activo = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_anuncio_created
AFTER INSERT ON anuncios
FOR EACH ROW
EXECUTE FUNCTION notify_anuncio_created();

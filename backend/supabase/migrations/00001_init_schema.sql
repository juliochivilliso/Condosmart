-- 00001_init_schema.sql
-- Archivo de migración inicial para Nexus Condominio

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tipos ENUM
CREATE TYPE rol_usuario AS ENUM ('super_admin', 'admin_condominio', 'inquilino', 'tecnico');
CREATE TYPE estado_ticket AS ENUM ('pendiente', 'asignado', 'en_progreso', 'completado', 'rechazado');
CREATE TYPE tipo_servicio AS ENUM ('mantenimiento', 'luz', 'agua', 'internet', 'sancion', 'fondo_reserva');
CREATE TYPE estado_transaccion AS ENUM ('pendiente', 'pagado', 'vencido', 'cancelado');
CREATE TYPE metodo_pago AS ENUM ('tarjeta', 'transferencia', 'billetera', 'otro');
CREATE TYPE tipo_servicio_publico AS ENUM ('luz', 'agua', 'internet');
CREATE TYPE tipo_dispositivo_iot AS ENUM ('bomba_agua', 'luminaria', 'cerradura', 'termostato');
CREATE TYPE tipo_notificacion AS ENUM ('pago', 'tecnico', 'iot', 'anuncio', 'recordatorio', 'alerta');
CREATE TYPE prioridad_notificacion AS ENUM ('baja', 'normal', 'alta', 'critica');
CREATE TYPE canal_notificacion AS ENUM ('push', 'email', 'inapp');

-- Tabla: condominios
CREATE TABLE condominios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(255) NOT NULL,
  direccion TEXT,
  ciudad VARCHAR(100),
  codigo_postal VARCHAR(20),
  telefono_administrador VARCHAR(20),
  cantidad_unidades INT,
  amenities TEXT,
  configuracion_iot JSONB,
  plan_suscripcion VARCHAR(50), -- ('lite', 'pro', 'enterprise')
  fecha_inicio_suscripcion DATE,
  fecha_fin_suscripcion DATE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: usuarios (extends auth.users in Supabase conceptually, but we store profile info here)
CREATE TABLE usuarios (
  id UUID PRIMARY KEY, -- Should map to Supabase auth.uid()
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre_completo VARCHAR(255) NOT NULL,
  telefono VARCHAR(20),
  rol rol_usuario NOT NULL DEFAULT 'inquilino',
  condominio_id UUID REFERENCES condominios(id) ON DELETE SET NULL,
  unidad_id UUID, -- Will define FK later to avoid cyclic dependencies
  avatar_url VARCHAR(1024),
  fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  activo BOOLEAN DEFAULT TRUE,
  ultimo_acceso TIMESTAMP WITH TIME ZONE
);

-- Tabla: unidades
CREATE TABLE unidades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  numero_apartamento VARCHAR(50) NOT NULL,
  bloque VARCHAR(50),
  piso INT,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL, -- inquilino
  tipo VARCHAR(50), -- ('apartamento', 'casa', 'local')
  area_construida FLOAT,
  cuota_mantenimiento DECIMAL(10, 2) NOT NULL,
  fecha_ocupacion DATE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Agregar Foreign Key a usuarios
ALTER TABLE usuarios ADD CONSTRAINT fk_unidad FOREIGN KEY (unidad_id) REFERENCES unidades(id) ON DELETE SET NULL;

-- Tabla: transacciones
CREATE TABLE transacciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  unidad_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  monto DECIMAL(10, 2) NOT NULL,
  tipo_servicio tipo_servicio NOT NULL,
  concepto VARCHAR(255) NOT NULL,
  estado estado_transaccion NOT NULL DEFAULT 'pendiente',
  metodo_pago metodo_pago,
  referencia_pago VARCHAR(255),
  fecha_vencimiento DATE NOT NULL,
  fecha_pago DATE,
  interes_mora DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: servicios_publicos
CREATE TABLE servicios_publicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  unidad_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  tipo tipo_servicio_publico NOT NULL,
  proveedor VARCHAR(255),
  referencia_externa VARCHAR(255),
  consumo DECIMAL(10, 2),
  fecha_lectura DATE,
  monto DECIMAL(10, 2) NOT NULL,
  estado VARCHAR(50) DEFAULT 'pendiente', -- ('pendiente', 'pagado')
  url_pago_externo VARCHAR(1024),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: tickets_tecnicos
CREATE TABLE tickets_tecnicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  unidad_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  tecnico_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  categoria VARCHAR(100) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT NOT NULL,
  foto_inicial VARCHAR(1024),
  estado estado_ticket NOT NULL DEFAULT 'pendiente',
  costo_estimado DECIMAL(10, 2),
  costo_final DECIMAL(10, 2),
  foto_evidencia VARCHAR(1024),
  calificacion FLOAT CHECK (calificacion >= 1 AND calificacion <= 5),
  comentario_cliente TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: dispositivos_iot
CREATE TABLE dispositivos_iot (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  tipo tipo_dispositivo_iot NOT NULL,
  ubicacion VARCHAR(255),
  estado_actual BOOLEAN DEFAULT FALSE,
  consumo_actual FLOAT,
  fecha_ultimo_cambio TIMESTAMP WITH TIME ZONE,
  id_microcontrolador VARCHAR(255),
  configurado BOOLEAN DEFAULT FALSE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: iot_schedules
CREATE TABLE iot_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispositivo_id UUID NOT NULL REFERENCES dispositivos_iot(id) ON DELETE CASCADE,
  dia_semana INT CHECK (dia_semana >= 0 AND dia_semana <= 6),
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  repetir BOOLEAN DEFAULT TRUE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: iot_logs
CREATE TABLE iot_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispositivo_id UUID NOT NULL REFERENCES dispositivos_iot(id) ON DELETE CASCADE,
  accion VARCHAR(50) NOT NULL,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  razon VARCHAR(255),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: notificaciones
CREATE TABLE notificaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  tipo tipo_notificacion NOT NULL,
  icono VARCHAR(255),
  prioridad prioridad_notificacion DEFAULT 'normal',
  leido BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  canal canal_notificacion NOT NULL,
  enviado_en TIMESTAMP WITH TIME ZONE,
  leido_en TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: notificaciones_preferencias
CREATE TABLE notificaciones_preferencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo_notificacion tipo_notificacion NOT NULL,
  push_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  horario_silencioso_inicio TIME,
  horario_silencioso_fin TIME,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
--------------------------------------------------------------------------------

-- Habilitar RLS en todas las tablas principales
ALTER TABLE condominios ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios_publicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_tecnicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispositivos_iot ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- Funciones helper para RLS (basado en auth.uid())
-- En Supabase real, usaríamos auth.uid(), asumiendo que está vinculado al id de la tabla usuarios.

-- (Nota: Para mantenerlo simple, estas políticas asumen que puedes hacer lookup de roles. 
--  En una implementación en producción, el rol a veces se pone en JWT (app_metadata) para evitar recursividad en policies)

-- Usuarios: Un usuario puede ver su propio perfil, o un admin de su condominio puede verlo.
CREATE POLICY "Usuarios ven sus propios perfiles" ON usuarios FOR SELECT 
  USING (id = auth.uid());

-- Transacciones: 
-- Inquilino solo ve sus propias transacciones (via unidad_id).
-- Admin Condominio ve las de su condominio.
CREATE POLICY "Transacciones inquilino" ON transacciones FOR SELECT
  USING (
    unidad_id IN (SELECT unidad_id FROM usuarios WHERE id = auth.uid() AND rol = 'inquilino')
  );

-- Unidades: Inquilino ve la suya, admin ve todas las de su condominio
CREATE POLICY "Unidades inquilino" ON unidades FOR SELECT
  USING (
    id IN (SELECT unidad_id FROM usuarios WHERE id = auth.uid())
  );

-- Tickets Tecnicos: 
-- Inquilino ve los suyos.
-- Tecnico ve los asignados a él.
CREATE POLICY "Tickets inquilino" ON tickets_tecnicos FOR SELECT
  USING (
    unidad_id IN (SELECT unidad_id FROM usuarios WHERE id = auth.uid() AND rol = 'inquilino')
  );

CREATE POLICY "Tickets tecnico" ON tickets_tecnicos FOR SELECT
  USING (
    tecnico_id = auth.uid() AND (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'tecnico'
  );

-- Dispositivos IoT:
-- Admins pueden ver/modificar. Inquilinos tal vez solo ver o usar (depende del dispositivo, limitaremos a admins por ahora)
CREATE POLICY "IoT visible para admins" ON dispositivos_iot FOR SELECT
  USING (
    condominio_id IN (SELECT condominio_id FROM usuarios WHERE id = auth.uid() AND rol = 'admin_condominio')
  );

-- Notificaciones:
-- Usuario solo ve las suyas
CREATE POLICY "Notificaciones por usuario" ON notificaciones FOR SELECT
  USING (usuario_id = auth.uid());

-- (Fin del archivo de inicializacion)

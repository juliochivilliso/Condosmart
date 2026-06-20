-- 00012_payment_gateway.sql
-- Updates for Simulated Payment Gateway & Transfer Verification

-- 1. Add 'pendiente_verificacion' to transaction states
-- Note: ALTER TYPE ADD VALUE cannot run inside a transaction block in some postgres setups,
-- but this is a standard migration. If it fails, run it separately.
ALTER TYPE estado_transaccion ADD VALUE IF NOT EXISTS 'pendiente_verificacion';

-- 2. Add capture_id column to transacciones
ALTER TABLE transacciones ADD COLUMN IF NOT EXISTS capture_id TEXT;
CREATE INDEX IF NOT EXISTS idx_transacciones_capture_id ON transacciones(capture_id);

-- 3. Create payment attempts logging table
CREATE TABLE IF NOT EXISTS payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaccion_id UUID REFERENCES transacciones(id) ON DELETE CASCADE,
  resultado TEXT NOT NULL,       -- 'aprobado' | 'rechazado'
  capture_id TEXT,               -- present if approved
  codigo_error TEXT,             -- present if rejected
  ultimos_4_digitos TEXT,        -- last 4 digits of card if applicable
  metodo_pago TEXT NOT NULL,     -- 'tarjeta' | 'transferencia'
  referencia_pago TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add email fields to notifications for tracking email sync
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS email_enviado BOOLEAN DEFAULT FALSE;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS email_enviado_at TIMESTAMPTZ;

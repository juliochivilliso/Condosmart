-- 00015_mora_cron.sql
-- Cron job diario para calcular mora automáticamente a las 8am (hora RD = UTC-4 = 12:00 UTC)
-- Nota: pg_cron y pg_net ya están habilitados en Supabase por defecto.

-- Eliminar job anterior si existe (para idempotencia)
SELECT cron.unschedule('calcular-mora-diario')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'calcular-mora-diario');

-- Crear cron: cada día a las 12:00 UTC (8:00 AM hora RD)
SELECT cron.schedule(
  'calcular-mora-diario',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ofjsodxsdbkiugonnmkh.supabase.co/functions/v1/calculate-mora',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

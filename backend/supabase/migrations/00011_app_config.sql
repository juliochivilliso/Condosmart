create table if not exists app_config (
  id uuid primary key default gen_random_uuid(),
  platform text not null unique,       -- 'android' | 'ios'
  latest_version text not null,        -- ej: '1.0.0+2'
  apk_url text not null,               -- link de descarga del APK
  release_notes text,
  updated_at timestamptz default now()
);

-- Solo lectura pública (no requiere auth para chequear versión)
alter table app_config enable row level security;

create policy "public read app_config"
  on app_config for select
  using (true);

-- Seed inicial
insert into app_config (platform, latest_version, apk_url, release_notes)
values (
  'android',
  '1.0.0+1',
  'https://appdistribution.firebase.google.com/testerapps/1:525332268078:android:a3522458f1be55bf368bbf',
  'Primera versión de CondoSmart.'
)
on conflict (platform) do nothing;

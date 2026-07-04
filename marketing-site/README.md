# CondoSmart — Marketing Site

Landing page de ventas, independiente del dashboard (`web-dashboard/`).

## Desarrollo

```bash
cd marketing-site
npm install
cp .env.example .env.local   # completar VITE_SUPABASE_ANON_KEY y VITE_DASHBOARD_URL
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy

Proyecto Vercel independiente apuntando a esta carpeta como root, con el mismo
proyecto Supabase que el backend (`ofjsodxsdbkiugonnmkh`). Variables de entorno
requeridas en Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DASHBOARD_URL`
(URL del dashboard, ej. `https://app.condosmart.do`, usada por el enlace de login del footer).

# Landing de Ventas CondoSmart — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir `marketing-site/`, una landing page pública de una sola página que le explique a un administrador de condominios qué hace CondoSmart y lo lleve a solicitar una demo, con un formulario de contacto que guarda leads en Supabase.

**Architecture:** Proyecto Vite + React 19 + TypeScript + Tailwind independiente del dashboard, sin autenticación, secciones ancladas en una sola página. El único punto dinámico es el formulario de contacto, que inserta en una tabla nueva `leads` en el mismo proyecto Supabase del backend y opcionalmente dispara un correo de notificación vía la función Edge `send-email` ya existente.

**Tech Stack:** React 19, Vite 8, TypeScript, Tailwind CSS 3, `@supabase/supabase-js`, Deno Edge Functions (Supabase), sin framework de testing (el proyecto no usa ninguno en `web-dashboard` tampoco — la verificación es visual/funcional en navegador, consistente con el resto del repo).

## Global Constraints

- Español dominicano en todo el copy.
- No mencionar funciones no verificadas como funcionales: coeficiente de copropiedad, monederos virtuales, bloqueo automático de morosos, votaciones/encuestas, asambleas virtuales, QR de visitantes, bitácora de paquetería, mantenimiento preventivo, caja chica/proveedores.
- CTA principal: "Solicitar demo" — nunca registro self-service ni pago directo.
- Proyecto Supabase existente: `ofjsodxsdbkiugonnmkh` (mismo del backend). No crear un proyecto Supabase nuevo.
- No introducir librerías de testing ni de UI (ej. Radix) que no sean necesarias — el marketing site usa componentes propios simples, no reimporta `web-dashboard/src/components/ui`.
- Nunca hardcodear credenciales — usar variables de entorno `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

---

## File Structure

```
marketing-site/
  package.json
  vite.config.ts
  tailwind.config.js
  postcss.config.js
  tsconfig.json
  tsconfig.app.json
  tsconfig.node.json
  index.html
  .env.example
  src/
    main.tsx
    App.tsx
    index.css
    lib/
      supabase.ts
    data/
      planes.ts
      features.ts
    components/
      ui/
        Button.tsx
        Input.tsx
        Label.tsx
        Textarea.tsx
      Header.tsx
      Hero.tsx
      ProblemSection.tsx
      FeaturesSection.tsx
      HowItWorksSection.tsx
      PricingSection.tsx
      SocialProofSection.tsx
      ContactSection.tsx
      Footer.tsx

backend/supabase/migrations/
  00016_leads.sql

backend/supabase/functions/send-email/
  index.ts (modificado)
```

---

## Task 1: Scaffold del proyecto Vite

**Files:**
- Create: `marketing-site/package.json`
- Create: `marketing-site/vite.config.ts`
- Create: `marketing-site/tsconfig.json`
- Create: `marketing-site/tsconfig.app.json`
- Create: `marketing-site/tsconfig.node.json`
- Create: `marketing-site/postcss.config.js`
- Create: `marketing-site/tailwind.config.js`
- Create: `marketing-site/index.html`
- Create: `marketing-site/src/main.tsx`
- Create: `marketing-site/src/App.tsx`
- Create: `marketing-site/src/index.css`
- Create: `marketing-site/.env.example`
- Create: `marketing-site/.gitignore`

**Interfaces:**
- Consumes: nada (primer task)
- Produces: proyecto ejecutable con `npm run dev`, alias `@` apuntando a `src/`, clases Tailwind con tokens de color (`--primary`, `--background`, etc.) disponibles para todos los tasks siguientes.

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "marketing-site",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.105.1",
    "clsx": "^2.1.1",
    "lucide-react": "^1.14.0",
    "react": "^19.2.5",
    "react-dom": "^19.2.5",
    "tailwind-merge": "^3.5.0"
  },
  "devDependencies": {
    "@types/node": "^24.12.2",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "autoprefixer": "^10.5.0",
    "postcss": "^8.5.13",
    "tailwindcss": "^3.4.19",
    "typescript": "~6.0.2",
    "vite": "^8.0.10"
  }
}
```

- [ ] **Step 2: Crear `vite.config.ts`**

```typescript
import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

- [ ] **Step 3: Crear `tsconfig.json`**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 4: Crear `tsconfig.app.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Crear `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 6: Crear `postcss.config.js`**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 7: Crear `tailwind.config.js`**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 8: Crear `index.html`**

```html
<!doctype html>
<html lang="es-DO">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CondoSmart — Software de gestión para condominios</title>
    <meta name="description" content="Automatiza cobros, mora, tickets y comunicación de tu residencial con CondoSmart. Solicita una demo." />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: Crear `src/index.css`** (tokens de color copiados de `web-dashboard/src/index.css`, tema claro por defecto)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --border: 214.3 31.8% 91.4%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 217.2 32.6% 12%;
    --card-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --border: 217.2 32.6% 17.5%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground antialiased;
  }
}
```

- [ ] **Step 10: Crear `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 11: Crear `src/App.tsx`** (placeholder temporal, se completa en Task 8)

```tsx
export default function App() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">CondoSmart — landing en construcción</p>
    </main>
  )
}
```

- [ ] **Step 12: Crear `.env.example`**

```
VITE_SUPABASE_URL=https://ofjsodxsdbkiugonnmkh.supabase.co
VITE_SUPABASE_ANON_KEY=REPLACE_WITH_ANON_KEY
```

- [ ] **Step 13: Crear `.gitignore`**

```
node_modules
dist
.env
```

- [ ] **Step 14: Instalar dependencias y verificar que levanta**

Run: `cd marketing-site && npm install && npm run dev`
Expected: servidor Vite corriendo en `http://localhost:5173` (o similar), la página muestra "CondoSmart — landing en construcción" sin errores en consola. Detener el servidor con Ctrl+C después de verificar.

- [ ] **Step 15: Commit**

```bash
git add marketing-site/package.json marketing-site/vite.config.ts marketing-site/tsconfig*.json marketing-site/postcss.config.js marketing-site/tailwind.config.js marketing-site/index.html marketing-site/src/main.tsx marketing-site/src/App.tsx marketing-site/src/index.css marketing-site/.env.example marketing-site/.gitignore
git commit -m "feat: scaffold marketing-site project"
```

---

## Task 2: Cliente de Supabase y componentes UI base

**Files:**
- Create: `marketing-site/src/lib/supabase.ts`
- Create: `marketing-site/src/components/ui/Button.tsx`
- Create: `marketing-site/src/components/ui/Input.tsx`
- Create: `marketing-site/src/components/ui/Label.tsx`
- Create: `marketing-site/src/components/ui/Textarea.tsx`
- Create: `marketing-site/src/lib/utils.ts`

**Interfaces:**
- Consumes: variables de entorno `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (Task 1)
- Produces: `export const supabase: SupabaseClient` desde `lib/supabase.ts`; componentes `<Button variant?, size?>`, `<Input>`, `<Label>`, `<Textarea>` reutilizados por `ContactSection` (Task 7) y `PricingSection` (Task 6).

- [ ] **Step 1: Crear `src/lib/utils.ts`** (helper `cn` para mezclar clases, mismo patrón que shadcn/ui)

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 2: Crear `src/lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 3: Crear `src/components/ui/Button.tsx`**

```tsx
import { ButtonHTMLAttributes, forwardRef } from "react"
import { cn } from "@/lib/utils"

type Variant = "primary" | "outline" | "ghost"
type Size = "default" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20",
  outline: "border border-border bg-transparent hover:bg-secondary/50",
  ghost: "bg-transparent hover:bg-secondary/50",
}

const sizeClasses: Record<Size, string> = {
  default: "px-4 py-2 text-sm",
  lg: "px-8 py-4 text-base",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
)
Button.displayName = "Button"
```

- [ ] **Step 4: Crear `src/components/ui/Input.tsx`**

```tsx
import { InputHTMLAttributes, forwardRef } from "react"
import { cn } from "@/lib/utils"

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40",
        className
      )}
      {...props}
    />
  )
)
Input.displayName = "Input"
```

- [ ] **Step 5: Crear `src/components/ui/Label.tsx`**

```tsx
import { LabelHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-medium", className)} {...props} />
}
```

- [ ] **Step 6: Crear `src/components/ui/Textarea.tsx`**

```tsx
import { TextareaHTMLAttributes, forwardRef } from "react"
import { cn } from "@/lib/utils"

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40",
        className
      )}
      {...props}
    />
  )
)
Textarea.displayName = "Textarea"
```

- [ ] **Step 7: Verificar que compila**

Run: `cd marketing-site && npx tsc -b`
Expected: sin errores (los componentes no se usan todavía en `App.tsx`, pero deben compilar de forma aislada).

- [ ] **Step 8: Commit**

```bash
git add marketing-site/src/lib marketing-site/src/components/ui
git commit -m "feat: add supabase client and base ui components to marketing-site"
```

---

## Task 3: Datos estáticos de contenido (features y planes)

**Files:**
- Create: `marketing-site/src/data/features.ts`
- Create: `marketing-site/src/data/planes.ts`

**Interfaces:**
- Consumes: nada
- Produces: `export const FEATURE_CATEGORIES: FeatureCategory[]` y `export const PLANES: Plan[]`, consumidos por `FeaturesSection` (Task 5) y `PricingSection` (Task 6).

- [ ] **Step 1: Crear `src/data/features.ts`** (solo funciones verificadas como funcionales — ver spec)

```typescript
export interface FeatureCategory {
  id: string
  titulo: string
  items: string[]
}

export const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    id: "financiero",
    titulo: "Gestión Financiera",
    items: [
      "Generación automática de cuotas de mantenimiento mensuales por unidad",
      "Cálculo automático de mora con recargo del 5% mensual, corre solo todos los días",
      "Pasarela de pago con tarjeta y transferencia bancaria, con verificación de comprobante",
    ],
  },
  {
    id: "comunidad",
    titulo: "Comunidad",
    items: [
      "Cartelera digital de anuncios y comunicados",
      "Módulo de tickets de incidencias con seguimiento de estado en tiempo real",
    ],
  },
  {
    id: "operaciones",
    titulo: "Operaciones",
    items: [
      "Reserva de áreas comunes (piscina, salón de eventos, gimnasio, canchas)",
      "Registro de entradas y salidas de visitantes",
    ],
  },
  {
    id: "seguridad",
    titulo: "Seguridad y Auditoría",
    items: [
      "Roles diferenciados: administrador, residente y técnico, cada uno viendo solo lo que le corresponde",
      "Historial de auditoría de acciones sensibles como aprobación de pagos",
    ],
  },
]
```

- [ ] **Step 2: Crear `src/data/planes.ts`** (mismos valores que `web-dashboard/src/pages/Planes.tsx`, `SEED_PLANES`)

```typescript
export interface Plan {
  nombre: string
  precioMensual: number
  maxUnidades: number
  maxUsuarios: number
  tieneIot: boolean
  tieneReportes: boolean
  tieneApi: boolean
  descripcion: string
  destacado: boolean
}

export const PLANES: Plan[] = [
  {
    nombre: "Lite",
    precioMensual: 49,
    maxUnidades: 50,
    maxUsuarios: 3,
    tieneIot: false,
    tieneReportes: false,
    tieneApi: false,
    descripcion: "Ideal para condominios pequeños. Gestión básica de unidades, cobros y tickets.",
    destacado: false,
  },
  {
    nombre: "Pro",
    precioMensual: 149,
    maxUnidades: 200,
    maxUsuarios: 10,
    tieneIot: true,
    tieneReportes: true,
    tieneApi: false,
    descripcion: "Para condominios medianos. Incluye IoT, reportes ejecutivos y soporte estándar.",
    destacado: true,
  },
  {
    nombre: "Enterprise",
    precioMensual: 399,
    maxUnidades: 1000,
    maxUsuarios: 50,
    tieneIot: true,
    tieneReportes: true,
    tieneApi: true,
    descripcion: "Solución empresarial completa. API pública, SLA garantizado y soporte 24/7.",
    destacado: false,
  },
]
```

- [ ] **Step 3: Verificar que compila**

Run: `cd marketing-site && npx tsc -b`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add marketing-site/src/data
git commit -m "feat: add static content data for features and pricing"
```

---

## Task 4: Header y Hero

**Files:**
- Create: `marketing-site/src/components/Header.tsx`
- Create: `marketing-site/src/components/Hero.tsx`

**Interfaces:**
- Consumes: `Button` de `@/components/ui/Button` (Task 2)
- Produces: `export default function Header()`, `export default function Hero()`, montados en `App.tsx` en Task 8. Ambos usan anclas `#contacto` y `#precios` que deben coincidir con los `id` que se definan en `ContactSection` (Task 7) y `PricingSection` (Task 6).

- [ ] **Step 1: Crear `src/components/Header.tsx`**

`Button` no soporta `asChild` (no usamos Radix Slot en este proyecto), así que los enlaces de acción se estilizan directamente como `<a>`, sin pasar por el componente `Button`.

```tsx
import { Building2 } from "lucide-react"

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Building2 className="h-5 w-5 text-primary" />
          CondoSmart
        </div>
        <nav className="hidden gap-6 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">Funciones</a>
          <a href="#precios" className="hover:text-foreground">Precios</a>
        </nav>
        <a
          href="#contacto"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
        >
          Solicitar demo
        </a>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Crear `src/components/Hero.tsx`**

```tsx
export default function Hero() {
  return (
    <section className="dark relative overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-10 px-6 py-24 text-center md:py-32">
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
          Administra tu residencial sin Excel, sin WhatsApp, sin caos.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          CondoSmart automatiza cobros, mora, tickets de mantenimiento y comunicación
          con tus residentes, todo desde un solo panel.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <a
            href="#contacto"
            className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90"
          >
            Solicitar demo
          </a>
          <a
            href="#features"
            className="inline-flex items-center justify-center rounded-md border border-border px-8 py-4 text-base font-semibold hover:bg-secondary/50"
          >
            Ver qué incluye
          </a>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Verificar que compila**

Run: `cd marketing-site && npx tsc -b`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add marketing-site/src/components/Header.tsx marketing-site/src/components/Hero.tsx
git commit -m "feat: add header and hero sections to marketing-site"
```

---

## Task 5: Sección de problema y sección de features

**Files:**
- Create: `marketing-site/src/components/ProblemSection.tsx`
- Create: `marketing-site/src/components/FeaturesSection.tsx`

**Interfaces:**
- Consumes: `FEATURE_CATEGORIES` de `@/data/features` (Task 3)
- Produces: `export default function ProblemSection()`, `export default function FeaturesSection()` con `id="features"`, montados en Task 8.

- [ ] **Step 1: Crear `src/components/ProblemSection.tsx`**

```tsx
export default function ProblemSection() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20 text-center">
      <h2 className="text-2xl font-bold md:text-3xl">
        ¿Sigues cobrando el mantenimiento por WhatsApp y anotando la mora en una hoja de cálculo?
      </h2>
      <p className="mt-4 text-muted-foreground">
        Cada mes se repite lo mismo: recordar a los morosos, cuadrar transferencias a mano,
        perder el hilo de qué ticket ya se resolvió. CondoSmart pone todo eso en un solo lugar.
      </p>
    </section>
  )
}
```

- [ ] **Step 2: Crear `src/components/FeaturesSection.tsx`**

```tsx
import { CheckCircle2 } from "lucide-react"
import { FEATURE_CATEGORIES } from "@/data/features"

export default function FeaturesSection() {
  return (
    <section id="features" className="bg-secondary/20 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="mb-12 text-center text-3xl font-bold">Todo lo que necesita tu residencial</h2>
        <div className="grid gap-8 md:grid-cols-2">
          {FEATURE_CATEGORIES.map((cat) => (
            <div key={cat.id} className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold text-primary">{cat.titulo}</h3>
              <ul className="space-y-3">
                {cat.items.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Verificar que compila**

Run: `cd marketing-site && npx tsc -b`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add marketing-site/src/components/ProblemSection.tsx marketing-site/src/components/FeaturesSection.tsx
git commit -m "feat: add problem and features sections to marketing-site"
```

---

## Task 6: Cómo funciona y sección de precios

**Files:**
- Create: `marketing-site/src/components/HowItWorksSection.tsx`
- Create: `marketing-site/src/components/PricingSection.tsx`

**Interfaces:**
- Consumes: `PLANES` de `@/data/planes` (Task 3)
- Produces: `export default function HowItWorksSection()`, `export default function PricingSection()` con `id="precios"`, montados en Task 8.

- [ ] **Step 1: Crear `src/components/HowItWorksSection.tsx`**

```tsx
const PASOS = [
  { numero: "1", titulo: "Solicitas una demo", detalle: "Nos cuentas cuántas unidades tiene tu residencial y qué necesitas." },
  { numero: "2", titulo: "Configuramos tu residencial", detalle: "Cargamos tus unidades, residentes y cuotas. Tú apruebas antes de lanzar." },
  { numero: "3", titulo: "Tu equipo empieza a usarlo", detalle: "Administradores, conserjes, técnicos y residentes, cada uno con su acceso." },
]

export default function HowItWorksSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <h2 className="mb-12 text-center text-3xl font-bold">Cómo funciona</h2>
      <div className="grid gap-8 md:grid-cols-3">
        {PASOS.map((paso) => (
          <div key={paso.numero} className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              {paso.numero}
            </div>
            <h3 className="mb-2 font-semibold">{paso.titulo}</h3>
            <p className="text-sm text-muted-foreground">{paso.detalle}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Crear `src/components/PricingSection.tsx`**

```tsx
import { cn } from "@/lib/utils"
import { PLANES } from "@/data/planes"

export default function PricingSection() {
  return (
    <section id="precios" className="bg-secondary/20 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="mb-12 text-center text-3xl font-bold">Planes y precios</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {PLANES.map((plan) => (
            <div
              key={plan.nombre}
              className={cn(
                "flex flex-col rounded-lg border bg-card p-8",
                plan.destacado ? "border-primary ring-2 ring-primary/20" : "border-border"
              )}
            >
              <h3 className="text-xl font-bold">{plan.nombre}</h3>
              <p className="mt-2 text-3xl font-bold">
                ${plan.precioMensual}<span className="text-base font-normal text-muted-foreground">/mes</span>
              </p>
              <p className="mt-4 text-sm text-muted-foreground">{plan.descripcion}</p>
              <ul className="mt-6 flex-1 space-y-2 text-sm">
                <li>Hasta {plan.maxUnidades} unidades</li>
                <li>Hasta {plan.maxUsuarios} usuarios administradores</li>
                {plan.tieneIot && <li>Monitoreo IoT</li>}
                {plan.tieneReportes && <li>Reportes ejecutivos</li>}
                {plan.tieneApi && <li>API pública</li>}
              </ul>
              <a
                href="#contacto"
                className="mt-8 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Solicitar demo
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Verificar que compila**

Run: `cd marketing-site && npx tsc -b`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add marketing-site/src/components/HowItWorksSection.tsx marketing-site/src/components/PricingSection.tsx
git commit -m "feat: add how-it-works and pricing sections to marketing-site"
```

---

## Task 7: Prueba social, footer y formulario de contacto

**Files:**
- Create: `marketing-site/src/components/SocialProofSection.tsx`
- Create: `marketing-site/src/components/Footer.tsx`
- Create: `marketing-site/src/components/ContactSection.tsx`

**Interfaces:**
- Consumes: `supabase` de `@/lib/supabase` (Task 2), `Button`/`Input`/`Label`/`Textarea` de `@/components/ui` (Task 2)
- Produces: `export default function SocialProofSection()`, `export default function Footer()`, `export default function ContactSection()` con `id="contacto"`. `ContactSection` inserta filas en la tabla `leads` (definida en Task 9) con columnas `nombre`, `email`, `telefono`, `condominio_nombre`, `num_unidades_aprox`.

- [ ] **Step 1: Crear `src/components/SocialProofSection.tsx`**

```tsx
export default function SocialProofSection() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16 text-center">
      <p className="text-sm uppercase tracking-wider text-muted-foreground">Próximamente</p>
      <h2 className="mt-2 text-2xl font-bold">Residenciales que ya confían en CondoSmart</h2>
      <p className="mt-4 text-muted-foreground">
        Estamos incorporando nuestros primeros residenciales. Sé de los primeros en probarlo.
      </p>
    </section>
  )
}
```

- [ ] **Step 2: Crear `src/components/Footer.tsx`**

```tsx
export default function Footer() {
  return (
    <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
      <p>© 2026 CondoSmart. Todos los derechos reservados.</p>
      <a href="/login" className="mt-2 inline-block hover:text-foreground">
        ¿Ya eres cliente? Inicia sesión
      </a>
    </footer>
  )
}
```

- [ ] **Step 3: Crear `src/components/ContactSection.tsx`**

```tsx
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"

type FormState = {
  nombre: string
  email: string
  telefono: string
  condominioNombre: string
  numUnidadesAprox: string
}

const INITIAL_STATE: FormState = {
  nombre: "",
  email: "",
  telefono: "",
  condominioNombre: "",
  numUnidadesAprox: "",
}

export default function ContactSection() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setError(null)
    try {
      const { error: insertError } = await supabase.from("leads").insert({
        nombre: form.nombre,
        email: form.email,
        telefono: form.telefono || null,
        condominio_nombre: form.condominioNombre,
        num_unidades_aprox: form.numUnidadesAprox ? Number(form.numUnidadesAprox) : null,
      })
      if (insertError) throw insertError

      try {
        await supabase.functions.invoke("send-email", {
          body: {
            type: "nuevo_lead",
            to: "ventas@condosmart.do",
            data: {
              nombre_completo: form.nombre,
              condominio_nombre: form.condominioNombre,
              email: form.email,
              telefono: form.telefono,
              num_unidades_aprox: form.numUnidadesAprox,
            },
          },
        })
      } catch {
        // Notificación por correo es best-effort; el lead ya quedó guardado.
      }

      setSent(true)
      setForm(INITIAL_STATE)
    } catch {
      setError("No pudimos enviar tu solicitud. Intenta de nuevo o escríbenos directamente.")
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <section id="contacto" className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h2 className="text-2xl font-bold">¡Listo! Recibimos tu solicitud.</h2>
        <p className="mt-2 text-muted-foreground">Te contactaremos pronto para coordinar tu demo.</p>
      </section>
    )
  }

  return (
    <section id="contacto" className="mx-auto max-w-2xl px-6 py-24">
      <h2 className="mb-8 text-center text-3xl font-bold">Solicita tu demo</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre completo</Label>
          <Input
            id="nombre"
            required
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefono">Teléfono</Label>
          <Input
            id="telefono"
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="condominio">Nombre del condominio</Label>
          <Input
            id="condominio"
            required
            value={form.condominioNombre}
            onChange={(e) => setForm({ ...form, condominioNombre: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unidades">Número aproximado de unidades</Label>
          <Input
            id="unidades"
            type="number"
            min={1}
            value={form.numUnidadesAprox}
            onChange={(e) => setForm({ ...form, numUnidadesAprox: e.target.value })}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" disabled={sending} className="w-full">
          {sending ? "Enviando..." : "Solicitar demo"}
        </Button>
      </form>
    </section>
  )
}
```

- [ ] **Step 4: Verificar que compila**

Run: `cd marketing-site && npx tsc -b`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add marketing-site/src/components/SocialProofSection.tsx marketing-site/src/components/Footer.tsx marketing-site/src/components/ContactSection.tsx
git commit -m "feat: add social proof, footer and contact form sections to marketing-site"
```

---

## Task 8: Ensamblar App.tsx y verificar la página completa

**Files:**
- Modify: `marketing-site/src/App.tsx`

**Interfaces:**
- Consumes: todos los componentes de Tasks 4-7
- Produces: página completa navegable, verificada en navegador.

- [ ] **Step 1: Reescribir `src/App.tsx`**

```tsx
import Header from "@/components/Header"
import Hero from "@/components/Hero"
import ProblemSection from "@/components/ProblemSection"
import FeaturesSection from "@/components/FeaturesSection"
import HowItWorksSection from "@/components/HowItWorksSection"
import PricingSection from "@/components/PricingSection"
import SocialProofSection from "@/components/SocialProofSection"
import ContactSection from "@/components/ContactSection"
import Footer from "@/components/Footer"

export default function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <ProblemSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <SocialProofSection />
      <ContactSection />
      <Footer />
    </div>
  )
}
```

- [ ] **Step 2: Crear archivo `.env.local` de desarrollo (no versionado)**

Copiar `.env.example` a `.env.local` y completar `VITE_SUPABASE_ANON_KEY` con la anon key real del proyecto `ofjsodxsdbkiugonnmkh` (tomarla de `web-dashboard/.env` si ya está configurada ahí).

Run: `cd marketing-site && cp .env.example .env.local`

- [ ] **Step 3: Levantar el servidor y verificar visualmente**

Run: `cd marketing-site && npm run dev`
Expected: abrir `http://localhost:5173` en el navegador y confirmar:
- El header queda fijo arriba al hacer scroll.
- Las 8 secciones aparecen en orden: Hero, Problema, Features, Cómo funciona, Precios, Prueba social, Contacto, Footer.
- Los enlaces "Solicitar demo" del header y del hero saltan a la sección de contacto (`#contacto`).
- En una ventana angosta (simular mobile en devtools), las secciones se apilan en una columna sin overflow horizontal.

Detener el servidor con Ctrl+C después de verificar.

- [ ] **Step 4: Commit**

```bash
git add marketing-site/src/App.tsx
git commit -m "feat: assemble full marketing-site landing page"
```

---

## Task 9: Migración de base de datos para tabla `leads`

**Files:**
- Create: `backend/supabase/migrations/00016_leads.sql`

**Interfaces:**
- Consumes: nada
- Produces: tabla `leads` con columnas `id, nombre, email, telefono, condominio_nombre, num_unidades_aprox, created_at`, con RLS que permite `INSERT` anónimo pero no `SELECT`/`UPDATE`/`DELETE` públicos. Consumida por `ContactSection.tsx` (Task 7, ya escrito) y por cualquier vista interna futura de leads (fuera de alcance de este plan).

- [ ] **Step 1: Crear `backend/supabase/migrations/00016_leads.sql`**

```sql
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
```

- [ ] **Step 2: Aplicar la migración al proyecto Supabase**

Run: `cd backend && npx supabase db push --project-ref ofjsodxsdbkiugonnmkh`
Expected: salida confirmando que `00016_leads.sql` se aplicó sin errores.

- [ ] **Step 3: Verificar la tabla desde el SQL editor o CLI**

Run: `cd backend && npx supabase db execute --project-ref ofjsodxsdbkiugonnmkh --sql "select column_name from information_schema.columns where table_name = 'leads'"`
Expected: lista con `id, nombre, email, telefono, condominio_nombre, num_unidades_aprox, created_at`.

- [ ] **Step 4: Commit**

```bash
git add backend/supabase/migrations/00016_leads.sql
git commit -m "feat: add leads table for marketing-site contact form"
```

---

## Task 10: Notificación por correo de nuevo lead

**Files:**
- Modify: `backend/supabase/functions/send-email/index.ts:8-21` (interfaz `EmailRequest`)
- Modify: `backend/supabase/functions/send-email/index.ts:23-125` (función `getHtmlTemplate`)
- Modify: `backend/supabase/functions/send-email/index.ts:136-142` (`subjectMap`)

**Interfaces:**
- Consumes: invocación desde `ContactSection.tsx` (Task 7, ya escrita) con `{ type: "nuevo_lead", to, data: { nombre_completo, condominio_nombre, email, telefono, num_unidades_aprox } }`
- Produces: correo HTML enviado (o log en stdout si no hay `RESEND_API_KEY`, igual que los otros tipos existentes).

- [ ] **Step 1: Ampliar el tipo `EmailRequest`**

En `backend/supabase/functions/send-email/index.ts:8-21`, reemplazar:

```typescript
interface EmailRequest {
  type: 'pago_confirmado' | 'pendiente_verificacion' | 'mora_aplicada';
  to: string;
  data: {
    nombre_completo: string;
    concepto: string;
    monto: number;
    fecha_vencimiento?: string;
    capture_id?: string;
    referencia?: string;
    comprobante_url?: string;
    condominio_nombre: string;
  };
}
```

por:

```typescript
interface EmailRequest {
  type: 'pago_confirmado' | 'pendiente_verificacion' | 'mora_aplicada' | 'nuevo_lead';
  to: string;
  data: {
    nombre_completo: string;
    concepto?: string;
    monto?: number;
    fecha_vencimiento?: string;
    capture_id?: string;
    referencia?: string;
    comprobante_url?: string;
    condominio_nombre: string;
    email?: string;
    telefono?: string;
    num_unidades_aprox?: string;
  };
}
```

- [ ] **Step 2: Agregar el template de `nuevo_lead`**

En `backend/supabase/functions/send-email/index.ts`, dentro de `getHtmlTemplate`, justo antes del comentario `// default template` (línea 113), agregar este bloque completo (mismo patrón de cierre — backtick, punto y coma, llave — que los demás `if` de la función):

```typescript
  if (type === 'nuevo_lead') {
    return `
      <div style="max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 8px; font-family: sans-serif;">
        ${header}
        <div style="padding: 24px; color: #1F2937;">
          <h2 style="color: ${brandColor}; margin-top: 0;">Nuevo lead desde la landing</h2>
          <div style="background-color: #F3F4F6; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #4B5563;">Nombre:</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right;">${data.nombre_completo}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #4B5563;">Condominio:</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right;">${data.condominio_nombre}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #4B5563;">Email:</td>
                <td style="padding: 6px 0; text-align: right;">${data.email || '—'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #4B5563;">Teléfono:</td>
                <td style="padding: 6px 0; text-align: right;">${data.telefono || '—'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #4B5563;">Unidades aprox.:</td>
                <td style="padding: 6px 0; text-align: right;">${data.num_unidades_aprox || '—'}</td>
              </tr>
            </table>
          </div>
        </div>
        ${footer}
      </div>
    `;
  }
```

- [ ] **Step 3: Agregar el subject al `subjectMap`**

En `backend/supabase/functions/send-email/index.ts:136-140`, reemplazar:

```typescript
    const subjectMap = {
      pago_confirmado: `Confirmación de Pago - ${data.concepto}`,
      pendiente_verificacion: `Transferencia Recibida - ${data.concepto}`,
      mora_aplicada: `AVISO: Recargo de mora aplicado - ${data.concepto}`,
    }
```

por:

```typescript
    const subjectMap = {
      pago_confirmado: `Confirmación de Pago - ${data.concepto}`,
      pendiente_verificacion: `Transferencia Recibida - ${data.concepto}`,
      mora_aplicada: `AVISO: Recargo de mora aplicado - ${data.concepto}`,
      nuevo_lead: `Nuevo lead: ${data.condominio_nombre}`,
    }
```

- [ ] **Step 4: Verificar localmente con Deno (si está instalado) o revisar sintaxis**

Run: `cd backend/supabase/functions/send-email && deno check index.ts`
Expected: sin errores de tipos. Si Deno no está instalado localmente, al menos revisar visualmente que las llaves/backticks cierran correctamente antes de desplegar.

- [ ] **Step 5: Desplegar la función actualizada**

Run: `cd backend && npx supabase functions deploy send-email --project-ref ofjsodxsdbkiugonnmkh`
Expected: confirmación de deploy exitoso.

- [ ] **Step 6: Commit**

```bash
git add backend/supabase/functions/send-email/index.ts
git commit -m "feat: add nuevo_lead email template for marketing-site contact form"
```

---

## Task 11: Documentación y verificación final

**Files:**
- Create: `marketing-site/README.md`

**Interfaces:**
- Consumes: nada
- Produces: instrucciones de desarrollo y deploy para el equipo.

- [ ] **Step 1: Crear `marketing-site/README.md`**

```markdown
# CondoSmart — Marketing Site

Landing page de ventas, independiente del dashboard (`web-dashboard/`).

## Desarrollo

\`\`\`bash
cd marketing-site
npm install
cp .env.example .env.local   # completar VITE_SUPABASE_ANON_KEY
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
npm run preview
\`\`\`

## Deploy

Proyecto Vercel independiente apuntando a esta carpeta como root, con el mismo
proyecto Supabase que el backend (`ofjsodxsdbkiugonnmkh`). Variables de entorno
requeridas en Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
```

- [ ] **Step 2: Build de producción completo**

Run: `cd marketing-site && npm run build`
Expected: build exitoso, carpeta `dist/` generada sin errores de TypeScript.

- [ ] **Step 3: Preview del build de producción**

Run: `cd marketing-site && npm run preview`
Expected: abrir la URL que muestre la terminal (usualmente `http://localhost:4173`) y repetir la verificación visual del Task 8 Step 3 sobre el build ya compilado (no el dev server).

- [ ] **Step 4: Probar el formulario de contacto end-to-end**

Con el preview corriendo y `.env.local` apuntando al proyecto Supabase real:
1. Llenar el formulario de contacto con datos de prueba.
2. Enviar.
3. Expected: mensaje "¡Listo! Recibimos tu solicitud." en pantalla.
4. Verificar en Supabase (Table Editor o `npx supabase db execute --project-ref ofjsodxsdbkiugonnmkh --sql "select * from leads order by created_at desc limit 1"`) que el registro de prueba quedó insertado con los datos correctos.

- [ ] **Step 5: Commit**

```bash
git add marketing-site/README.md
git commit -m "docs: add marketing-site README with dev and deploy instructions"
```

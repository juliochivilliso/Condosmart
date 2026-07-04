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

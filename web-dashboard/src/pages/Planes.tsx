import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, Loader2, Star, Zap, Building2, AlertCircle } from "lucide-react"

type Plan = {
  id: string
  nombre: string
  precio_mensual: number
  max_unidades: number
  max_usuarios: number
  tiene_iot: boolean
  tiene_reportes: boolean
  tiene_api: boolean
  color: string
  descripcion: string
}

type Suscripcion = {
  id: string
  plan_id: string
  estado: string
  fecha_vencimiento: string | null
  monto_mensual: number
}

const SEED_PLANES: Plan[] = [
  {
    id: "1", nombre: "Lite", precio_mensual: 49, max_unidades: 50, max_usuarios: 3,
    tiene_iot: false, tiene_reportes: false, tiene_api: false, color: "slate",
    descripcion: "Ideal para condominios pequeños. Gestión básica de unidades, cobros y tickets."
  },
  {
    id: "2", nombre: "Pro", precio_mensual: 149, max_unidades: 200, max_usuarios: 10,
    tiene_iot: true, tiene_reportes: true, tiene_api: false, color: "blue",
    descripcion: "Para condominios medianos. Incluye IoT, reportes ejecutivos y soporte estándar."
  },
  {
    id: "3", nombre: "Enterprise", precio_mensual: 399, max_unidades: 1000, max_usuarios: 50,
    tiene_iot: true, tiene_reportes: true, tiene_api: true, color: "violet",
    descripcion: "Solución empresarial completa. API pública, SLA garantizado y soporte 24/7."
  },
]

const PLAN_STYLES: Record<string, { border: string; ring: string; badge: string; button: string }> = {
  slate:  { border: "border-slate-500/30",  ring: "",                      badge: "bg-slate-500/10 text-slate-300",   button: "bg-slate-600 hover:bg-slate-500 text-white" },
  blue:   { border: "border-blue-500/40",   ring: "ring-2 ring-blue-500/20",   badge: "bg-blue-500/10 text-blue-300",    button: "bg-blue-600 hover:bg-blue-500 text-white" },
  violet: { border: "border-violet-500/40", ring: "ring-2 ring-violet-500/20", badge: "bg-violet-500/10 text-violet-300", button: "bg-violet-600 hover:bg-violet-500 text-white" },
}

const PLAN_ICONS: Record<string, React.ElementType> = {
  Lite: Building2,
  Pro: Star,
  Enterprise: Zap,
}

export default function Planes() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [planes, setPlanes] = useState<Plan[]>([])
  const [suscripcion, setSuscripcion] = useState<Suscripcion | null>(null)
  const [loading, setLoading] = useState(true)

  const isAdmin = profile?.rol === "admin_condominio"

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: ps } = await supabase
          .from("planes_suscripcion")
          .select("*")
          .eq("activo", true)
          .order("precio_mensual")

        setPlanes(ps && ps.length > 0 ? ps : SEED_PLANES)

        if (isAdmin && profile?.condominio_id) {
          const { data: sus } = await supabase
            .from("suscripciones")
            .select("id, plan_id, estado, fecha_vencimiento, monto_mensual")
            .eq("condominio_id", profile.condominio_id)
            .maybeSingle()
          if (sus) setSuscripcion(sus)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [isAdmin, profile?.condominio_id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const currentPlanId = suscripcion?.plan_id

  const estadoColor =
    suscripcion?.estado === "activa"
      ? "border-green-500/30 bg-green-500/10 text-green-400"
      : suscripcion?.estado === "trial"
      ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
      : "border-red-500/30 bg-red-500/10 text-red-400"

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display font-bold tracking-tight">Planes de Suscripción</h2>
        <p className="text-muted-foreground mt-1">
          {isAdmin
            ? "Selecciona el plan que mejor se adapte a tu residencial."
            : "Comparación de planes disponibles en la plataforma CondoSmart."}
        </p>
      </div>

      {isAdmin && suscripcion && (
        <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${estadoColor}`}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            Suscripción actual:{" "}
            <strong className="capitalize">{suscripcion.estado}</strong>
            {suscripcion.fecha_vencimiento &&
              ` · Vence el ${new Date(suscripcion.fecha_vencimiento).toLocaleDateString("es-DO")}`}
          </span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {planes.map((plan) => {
          const styles = PLAN_STYLES[plan.color] ?? PLAN_STYLES.blue
          const Icon = PLAN_ICONS[plan.nombre] ?? Star
          const isCurrent = currentPlanId === plan.id
          const isPopular = plan.nombre === "Pro"

          return (
            <Card
              key={plan.id}
              className={`relative border-2 ${styles.border} ${isCurrent ? "border-primary ring-2 ring-primary/30" : styles.ring}`}
            >
              {isPopular && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground px-3 py-1 rounded-full whitespace-nowrap">
                    Más popular
                  </span>
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-green-600 text-white px-3 py-1 rounded-full whitespace-nowrap">
                    Plan actual
                  </span>
                </div>
              )}

              <CardHeader className="pb-4 pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`rounded-lg p-2 ${styles.badge}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl">{plan.nombre}</CardTitle>
                </div>
                <div>
                  <span className="text-4xl font-bold">${plan.precio_mensual}</span>
                  <span className="text-muted-foreground text-sm"> USD/mes</span>
                </div>
                <p className="text-sm text-muted-foreground">{plan.descripcion}</p>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-2.5 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    Hasta {plan.max_unidades} unidades
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    Hasta {plan.max_usuarios} usuarios
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    Motor de cobros y mora
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    Tickets técnicos
                  </li>
                  {plan.tiene_iot && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      Control IoT
                    </li>
                  )}
                  {plan.tiene_reportes && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      Reportes ejecutivos
                    </li>
                  )}
                  {plan.tiene_api && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      API pública + webhooks
                    </li>
                  )}
                  {plan.nombre === "Enterprise" && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      SLA + soporte 24/7
                    </li>
                  )}
                </ul>

                {isAdmin && (
                  isCurrent ? (
                    <Button className="w-full" variant="outline" disabled>
                      Plan actual
                    </Button>
                  ) : (
                    <button
                      className={`w-full h-10 rounded-md text-sm font-medium transition-colors ${styles.button}`}
                      onClick={() =>
                        navigate("/suscripcion/pago", { state: { plan } })
                      }
                    >
                      {currentPlanId ? `Cambiar a ${plan.nombre}` : `Contratar ${plan.nombre}`}
                    </button>
                  )
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {!isAdmin && (
        <p className="text-center text-sm text-muted-foreground">
          Para cambiar el plan de un residencial, usa la sección <strong>Onboarding</strong> o contacta al administrador del sistema.
        </p>
      )}
    </div>
  )
}

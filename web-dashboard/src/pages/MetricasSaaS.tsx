import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, TrendingUp, DollarSign, Users, AlertCircle, BarChart3 } from "lucide-react"
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts"

type MetricaData = {
  mrr: number
  arr: number
  clientes: number
  churn: number
  arpu: number
  planDist: { nombre: string; count: number; pct: number; color: string }[]
  ingresoPorMes: { mes: string; ingresos: number }[]
  pagosRecientes: { fecha: string; condominio: string; monto: number; metodo: string }[]
}

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]

const formatUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)

const SEED: MetricaData = {
  mrr: 2086, arr: 25032, clientes: 8, churn: 3.2, arpu: 260.75,
  planDist: [
    { nombre: "Lite",       count: 3, pct: 37, color: "#64748b" },
    { nombre: "Pro",        count: 4, pct: 50, color: "#3b82f6" },
    { nombre: "Enterprise", count: 1, pct: 13, color: "#8b5cf6" },
  ],
  ingresoPorMes: [
    { mes: "Dic", ingresos: 1200 },
    { mes: "Ene", ingresos: 1450 },
    { mes: "Feb", ingresos: 1600 },
    { mes: "Mar", ingresos: 1750 },
    { mes: "Abr", ingresos: 1900 },
    { mes: "May", ingresos: 2086 },
  ],
  pagosRecientes: [
    { fecha: "2026-05-01", condominio: "Torres del Norte",          monto: 149, metodo: "tarjeta" },
    { fecha: "2026-05-01", condominio: "Villas del Este",           monto: 399, metodo: "transferencia" },
    { fecha: "2026-04-30", condominio: "Residencial Las Palmas",    monto: 149, metodo: "paypal" },
    { fecha: "2026-04-29", condominio: "Residencias San Cristóbal", monto: 49,  metodo: "tarjeta" },
    { fecha: "2026-04-28", condominio: "Torre Mirador Norte",       monto: 149, metodo: "tarjeta" },
  ],
}

const KPI_DEFS = [
  { key: "mrr",      label: "MRR",      sub: "Ingreso mensual recurrente", icon: DollarSign, cardClass: "from-emerald-500/10 border-emerald-500/20", iconClass: "text-emerald-400" },
  { key: "arr",      label: "ARR",      sub: "Ingreso anual recurrente",   icon: TrendingUp, cardClass: "from-blue-500/10 border-blue-500/20",     iconClass: "text-blue-400" },
  { key: "clientes", label: "Clientes", sub: "Suscripciones activas",      icon: Users,      cardClass: "from-violet-500/10 border-violet-500/20", iconClass: "text-violet-400", isInt: true },
  { key: "churn",    label: "Churn",    sub: "Tasa de cancelación",        icon: AlertCircle,cardClass: "from-rose-500/10 border-rose-500/20",     iconClass: "text-rose-400",   isPct: true },
  { key: "arpu",     label: "ARPU",     sub: "Ingreso promedio por cliente",icon: BarChart3,  cardClass: "from-yellow-500/10 border-yellow-500/20", iconClass: "text-yellow-400" },
] as const

const COLOR_HEX: Record<string, string> = {
  slate: "#64748b",
  blue: "#3b82f6",
  violet: "#8b5cf6",
}

export default function MetricasSaaS() {
  const [data, setData] = useState<MetricaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [usingSeed, setUsingSeed] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: sus } = await supabase
          .from("suscripciones")
          .select("estado, monto_mensual, plan_id, planes_suscripcion(nombre, color)")
          .eq("estado", "activa")

        const { data: pagos } = await supabase
          .from("pagos_suscripcion")
          .select("monto, metodo_pago, fecha_pago, condominios(nombre)")
          .order("fecha_pago", { ascending: false })
          .limit(10)

        if (!sus || sus.length === 0) {
          setData(SEED)
          setUsingSeed(true)
          return
        }

        const mrr = sus.reduce((s, e) => s + (e.monto_mensual ?? 0), 0)
        const arr = mrr * 12
        const clientes = sus.length
        const arpu = clientes > 0 ? mrr / clientes : 0

        // Distribución por plan
        const planMap: Record<string, { count: number; color: string }> = {}
        sus.forEach((s) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const planNombre = (s as any).planes_suscripcion?.nombre ?? "Otro"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const planColor = (s as any).planes_suscripcion?.color ?? "blue"
          planMap[planNombre] = {
            count: (planMap[planNombre]?.count ?? 0) + 1,
            color: COLOR_HEX[planColor] ?? "#3b82f6",
          }
        })
        const planDist = Object.entries(planMap).map(([nombre, v]) => ({
          nombre,
          count: v.count,
          pct: clientes > 0 ? Math.round((v.count / clientes) * 100) : 0,
          color: v.color,
        }))

        // Ingresos por mes (últimos 6)
        const now = new Date()
        const ingresoPorMes = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
          const mes = MESES[d.getMonth()]
          const mm = d.getMonth()
          const yy = d.getFullYear()
          const filtrados = (pagos ?? []).filter((p) => {
            const pd = new Date(p.fecha_pago)
            return pd.getMonth() === mm && pd.getFullYear() === yy
          })
          return { mes, ingresos: filtrados.reduce((s, p) => s + (p.monto ?? 0), 0) }
        })

        const pagosRecientes = (pagos ?? []).slice(0, 5).map((p) => ({
          fecha: (p.fecha_pago ?? "").split("T")[0],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          condominio: (p as any).condominios?.nombre ?? "—",
          monto: p.monto ?? 0,
          metodo: p.metodo_pago ?? "—",
        }))

        setData({ mrr, arr, clientes, churn: 0, arpu, planDist, ingresoPorMes, pagosRecientes })
        setUsingSeed(false)
      } catch {
        setData(SEED)
        setUsingSeed(true)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-card border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold mb-1">{label}</p>
        <p className="text-emerald-400">MRR: {formatUSD(payload[0].value)}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const d = data!

  function kpiValue(key: typeof KPI_DEFS[number]["key"], def: typeof KPI_DEFS[number]): string {
    const v = d[key] as number
    if ("isInt" in def && def.isInt) return String(v)
    if ("isPct" in def && def.isPct) return `${v.toFixed(1)}%`
    return formatUSD(v)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Métricas SaaS</h2>
        <p className="text-muted-foreground mt-1">
          Indicadores clave del negocio en tiempo real.
        </p>
      </div>

      {usingSeed && (
        <div className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-md px-4 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Datos de demostración — sin suscripciones activas en la base de datos.
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {KPI_DEFS.map((k) => {
          const Icon = k.icon
          return (
            <Card key={k.key} className={`bg-gradient-to-br ${k.cardClass} to-transparent border`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {k.label}
                </CardTitle>
                <Icon className={`h-4 w-4 ${k.iconClass}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpiValue(k.key, k)}</div>
                <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Gráfico MRR */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolución MRR — últimos 6 meses</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={d.ingresoPorMes} barCategoryGap="40%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="ingresos" name="MRR" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Distribución por plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución por Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {d.planDist.map((p) => (
              <div key={p.nombre}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium">{p.nombre}</span>
                  <span className="text-muted-foreground">
                    {p.count} clientes · {p.pct}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${p.pct}%`, backgroundColor: p.color }}
                  />
                </div>
              </div>
            ))}
            <div className="pt-2 border-t text-sm">
              <p className="text-muted-foreground">
                MRR potencial si todos fueran <strong className="text-violet-400">Enterprise</strong>:{" "}
                <span className="font-semibold">{formatUSD(d.clientes * 399)}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Últimos pagos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos pagos de suscripción</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Fecha</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Residencial</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Método</th>
                  <th className="text-right px-6 py-3 font-medium text-muted-foreground">Monto</th>
                </tr>
              </thead>
              <tbody>
                {d.pagosRecientes.map((p, i) => (
                  <tr key={i} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3 text-muted-foreground tabular-nums">{p.fecha}</td>
                    <td className="px-6 py-3 font-medium">{p.condominio}</td>
                    <td className="px-6 py-3">
                      <span className="capitalize text-xs px-2 py-0.5 rounded-full bg-muted">
                        {p.metodo}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-semibold">
                      {formatUSD(p.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

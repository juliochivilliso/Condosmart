import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Wrench, Activity, TrendingUp, Loader2, AlertCircle, Building2 } from "lucide-react"
import FinanceChart from "@/components/FinanceChart"

const SEED_KPI = { ingresos: 45200, gastos: 5900, tickets: 3, iot: 5 }

const SEED_TRANSACCIONES = [
  { id: "1", monto: 8500,  concepto: "Cuota mantenimiento mayo",  tipo_servicio: "mantenimiento", estado: "pagado",    metodo_pago: "transferencia", unidad_id: "u0000001", created_at: "2026-05-01T10:00:00Z" },
  { id: "2", monto: 8500,  concepto: "Cuota mantenimiento mayo",  tipo_servicio: "mantenimiento", estado: "pagado",    metodo_pago: "billetera",     unidad_id: "u0000002", created_at: "2026-04-30T09:00:00Z" },
  { id: "3", monto: 9200,  concepto: "Cuota mantenimiento abril", tipo_servicio: "mantenimiento", estado: "pendiente", metodo_pago: null,            unidad_id: "u0000003", created_at: "2026-04-29T11:00:00Z" },
  { id: "4", monto: 9200,  concepto: "Cuota mantenimiento abril", tipo_servicio: "mantenimiento", estado: "pagado",    metodo_pago: "tarjeta",       unidad_id: "u0000004", created_at: "2026-04-29T08:00:00Z" },
  { id: "5", monto: 3200,  concepto: "Aporte fondo de reserva",  tipo_servicio: "fondo_reserva", estado: "pagado",    metodo_pago: "transferencia", unidad_id: "u0000001", created_at: "2026-04-28T14:00:00Z" },
]

type Transaccion = {
  id: string
  monto: number
  concepto: string
  tipo_servicio: string
  estado: string
  metodo_pago: string | null
  unidad_id: string
  created_at: string
  unidades?: any
}

const estadoBadge: Record<string, string> = {
  pagado:    "bg-green-500/20 text-green-400 border border-green-500/30",
  pendiente: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  vencido:   "bg-red-500/20 text-red-400 border border-red-500/30",
  cancelado: "bg-secondary text-muted-foreground",
}

export default function Dashboard() {
  const { profile } = useAuth()
  const CONDOMINIO_ID = profile?.condominio_id ?? ''
  
  const [kpi, setKpi] = useState<typeof SEED_KPI | null>(null)
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!CONDOMINIO_ID) {
      setKpi(SEED_KPI)
      setTransacciones(SEED_TRANSACCIONES)
      if (profile?.rol !== 'super_admin') {
        setError("Sin condominio asignado — mostrando datos de demostración.")
      }
      setLoading(false)
      return
    }
    async function fetchData() {
      try {
        setLoading(true)
        const primerDiaMes = new Date()
        primerDiaMes.setDate(1); primerDiaMes.setHours(0, 0, 0, 0)

        // Ingresos y gastos del mes
        const { data: txMes, error: txError } = await supabase
          .from("transacciones")
          .select("monto, tipo_servicio, estado")
          .eq("condominio_id", CONDOMINIO_ID)
          .gte("created_at", primerDiaMes.toISOString())

        if (txError) throw txError

        const ingresos = (txMes ?? []).reduce((acc, t) =>
          ["mantenimiento","fondo_reserva"].includes(t.tipo_servicio) && t.estado === "pagado"
            ? acc + (Number(t.monto) || 0) : acc, 0)

        const gastos = (txMes ?? []).reduce((acc, t) =>
          ["luz","agua","internet"].includes(t.tipo_servicio)
            ? acc + (Number(t.monto) || 0) : acc, 0)

        // Tickets abiertos
        const { count: ticketsCount, error: tErr } = await supabase
          .from("tickets_tecnicos")
          .select("*", { count: "exact", head: true })
          .eq("condominio_id", CONDOMINIO_ID)
          .in("estado", ["pendiente", "asignado", "en_progreso"])
        if (tErr) throw tErr

        // Dispositivos IoT activos
        const { count: iotCount, error: iotErr } = await supabase
          .from("dispositivos_iot")
          .select("*", { count: "exact", head: true })
          .eq("condominio_id", CONDOMINIO_ID)
          .eq("estado_actual", true)
        if (iotErr) throw iotErr

        // Últimas 5 transacciones
        const { data: recientes, error: rErr } = await supabase
          .from("transacciones")
          .select("id, monto, concepto, tipo_servicio, estado, metodo_pago, unidad_id, created_at, unidades(numero_apartamento, bloque)")
          .eq("condominio_id", CONDOMINIO_ID)
          .order("created_at", { ascending: false })
          .limit(5)
        if (rErr) throw rErr

        const useSeed = !txMes || txMes.length === 0
        setKpi(useSeed ? SEED_KPI : { ingresos, gastos, tickets: ticketsCount ?? 0, iot: iotCount ?? 0 })
        setTransacciones(useSeed || !recientes?.length ? SEED_TRANSACCIONES : recientes as unknown as Transaccion[])
      } catch (err) {
        console.error(err)
        setKpi(SEED_KPI)
        setTransacciones(SEED_TRANSACCIONES)
        setError("Usando datos de demostración.")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [CONDOMINIO_ID])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="ml-3 text-muted-foreground">Cargando datos...</span>
    </div>
  )

  if (!CONDOMINIO_ID && profile?.rol === 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Building2 className="h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-xl font-medium text-muted-foreground">Selecciona un residencial para ver los datos.</h2>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Salud del Condominio</h2>
        <p className="text-muted-foreground mt-1">Resumen ejecutivo del mes actual.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-md px-4 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos del Mes</CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${kpi!.ingresos.toLocaleString("es-DO")}</div>
            <p className="text-xs text-muted-foreground mt-1">Cuotas pagadas este mes</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-rose-500/5 border-red-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gastos del Mes</CardTitle>
            <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${kpi!.gastos.toLocaleString("es-DO")}</div>
            <p className="text-xs text-muted-foreground mt-1">Servicios y gastos operacionales</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border-yellow-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tickets Abiertos</CardTitle>
            <div className="h-8 w-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Wrench className="h-4 w-4 text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi!.tickets}</div>
            <p className="text-xs text-muted-foreground mt-1">Pendientes o en progreso</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dispositivos IoT</CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Activity className="h-4 w-4 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi!.iot}</div>
            <p className="text-xs text-muted-foreground mt-1">Dispositivos en línea</p>
          </CardContent>
        </Card>
      </div>

      <FinanceChart condominioId={CONDOMINIO_ID} />

      <Card>
        <CardHeader><CardTitle className="text-lg">Últimas Transacciones</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Unidad</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Concepto</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Método</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Estado</th>
                  <th className="text-right px-6 py-3 text-muted-foreground font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {transacciones.map(t => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-3 font-medium text-xs">
                      {(() => {
                        const u = Array.isArray(t.unidades) ? t.unidades[0] : t.unidades;
                        return u ? (
                          <span>
                            Apt {u.numero_apartamento}
                            {u.bloque ? ` · Bl. ${u.bloque}` : ""}
                          </span>
                        ) : (
                          <span className="font-mono text-muted-foreground">{t.unidad_id ? t.unidad_id.substring(0, 8) : "—"}</span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">{t.concepto}</td>
                    <td className="px-6 py-3 capitalize text-muted-foreground">{t.metodo_pago ?? "—"}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${estadoBadge[t.estado] || "bg-secondary"}`}>{t.estado}</span>
                    </td>
                    <td className="px-6 py-3 text-right font-semibold">${Number(t.monto).toLocaleString("es-DO")}</td>
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

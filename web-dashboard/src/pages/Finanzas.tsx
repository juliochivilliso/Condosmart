import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, TrendingDown, Loader2, AlertCircle, BarChart3 } from "lucide-react"
import FinanceChart from "@/components/FinanceChart"

type Transaccion = {
  id: string
  monto: number
  concepto: string
  tipo_servicio: string
  estado: string
  metodo_pago: string | null
  unidad_id: string
  created_at: string
}

const SEED_TX: Transaccion[] = [
  { id: "1", monto: 8500,  concepto: "Cuota mantenimiento mayo",   tipo_servicio: "mantenimiento", estado: "pagado",    metodo_pago: "transferencia", unidad_id: "u0000001", created_at: "2026-05-01T09:00:00Z" },
  { id: "2", monto: 8500,  concepto: "Cuota mantenimiento mayo",   tipo_servicio: "mantenimiento", estado: "pagado",    metodo_pago: "billetera",     unidad_id: "u0000002", created_at: "2026-04-30T10:00:00Z" },
  { id: "3", monto: 9200,  concepto: "Cuota mantenimiento abril",  tipo_servicio: "mantenimiento", estado: "pendiente", metodo_pago: null,            unidad_id: "u0000003", created_at: "2026-04-29T11:00:00Z" },
  { id: "4", monto: 9200,  concepto: "Cuota mantenimiento abril",  tipo_servicio: "mantenimiento", estado: "pagado",    metodo_pago: "tarjeta",       unidad_id: "u0000004", created_at: "2026-04-29T08:00:00Z" },
  { id: "5", monto: 3200,  concepto: "Aporte fondo de reserva",   tipo_servicio: "fondo_reserva", estado: "pagado",    metodo_pago: "transferencia", unidad_id: "u0000001", created_at: "2026-04-28T14:00:00Z" },
  { id: "6", monto: 11000, concepto: "Cuota mantenimiento mayo",   tipo_servicio: "mantenimiento", estado: "pagado",    metodo_pago: "transferencia", unidad_id: "u0000005", created_at: "2026-05-01T08:00:00Z" },
  { id: "7", monto: 1800,  concepto: "Servicio agua abril",        tipo_servicio: "agua",          estado: "pagado",    metodo_pago: "otro",          unidad_id: "u0000002", created_at: "2026-04-25T09:30:00Z" },
  { id: "8", monto: 900,   concepto: "Servicio luz abril",         tipo_servicio: "luz",           estado: "pagado",    metodo_pago: "billetera",     unidad_id: "u0000003", created_at: "2026-04-26T11:00:00Z" },
]

const estadoBadge: Record<string, string> = {
  pagado:    "bg-green-500/20 text-green-400 border border-green-500/30",
  pendiente: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  vencido:   "bg-red-500/20 text-red-400 border border-red-500/30",
  cancelado: "bg-secondary text-muted-foreground",
}

export default function Finanzas() {
  const { profile } = useAuth()
  const CONDOMINIO_ID = profile?.condominio_id ?? ''
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [gastosProveedores, setGastosProveedores] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      if (!CONDOMINIO_ID) {
        setTransacciones(SEED_TX)
        setGastosProveedores(0)
        if (profile?.rol !== 'super_admin') {
          setError("Sin condominio asignado — mostrando datos de demostración.")
        }
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("transacciones")
          .select("id, monto, concepto, tipo_servicio, estado, metodo_pago, unidad_id, created_at")
          .eq("condominio_id", CONDOMINIO_ID)
          .order("created_at", { ascending: false })
          .limit(20)

        if (error) throw error

        // Egresos reales a proveedores pagados
        const { data: cpp, error: cppErr } = await supabase
          .from("cuentas_por_pagar")
          .select("monto, estado")
          .eq("condominio_id", CONDOMINIO_ID)
          .eq("estado", "pagado")
        if (cppErr) throw cppErr

        const totalPagosProveedores = (cpp ?? []).reduce((a, c) => a + Number(c.monto), 0)
        setGastosProveedores(totalPagosProveedores)

        if (!data || data.length === 0) {
          setTransacciones(SEED_TX)
          setError("Usando datos de demostración.")
        } else {
          setTransacciones(data as Transaccion[])
        }
      } catch {
        setTransacciones(SEED_TX)
        setError("Usando datos de demostración (Supabase no configurado).")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [CONDOMINIO_ID])

  const ingresos = transacciones.filter(t => ["mantenimiento","fondo_reserva","sancion"].includes(t.tipo_servicio) && t.estado === "pagado").reduce((a, t) => a + Number(t.monto), 0)
  const gastosUtilidades = transacciones.filter(t => ["luz","agua","internet"].includes(t.tipo_servicio)).reduce((a, t) => a + Number(t.monto), 0)
  const gastos = gastosUtilidades + gastosProveedores
  const pendientes = transacciones.filter(t => t.estado === "pendiente").reduce((a, t) => a + Number(t.monto), 0)
  const balance = ingresos - gastos

  if (!CONDOMINIO_ID && profile?.rol === 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <DollarSign className="h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-xl font-medium text-muted-foreground">Selecciona un residencial para ver los datos.</h2>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Cargando finanzas...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display font-bold tracking-tight">Finanzas</h2>
        <p className="text-muted-foreground mt-1">Resumen financiero del condominio</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-md px-4 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Ingresos</CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">${ingresos.toLocaleString("es-DO")}</div>
            <p className="text-xs text-muted-foreground mt-1">Cuotas cobradas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-rose-500/5 border-red-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Gastos</CardTitle>
            <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">${gastos.toLocaleString("es-DO")}</div>
            <p className="text-xs text-muted-foreground mt-1">Egresos + proveedores</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border-yellow-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Por Cobrar</CardTitle>
            <div className="h-8 w-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">${pendientes.toLocaleString("es-DO")}</div>
            <p className="text-xs text-muted-foreground mt-1">Pagos pendientes</p>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${balance >= 0 ? "from-blue-500/10 to-cyan-500/5 border-blue-500/20" : "from-red-500/10 to-rose-500/5 border-red-500/20"}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Balance Neto</CardTitle>
            <div className={`h-8 w-8 rounded-full ${balance >= 0 ? "bg-blue-500/20" : "bg-red-500/20"} flex items-center justify-center`}>
              <BarChart3 className={`h-4 w-4 ${balance >= 0 ? "text-blue-400" : "text-red-400"}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance >= 0 ? "text-blue-400" : "text-red-400"}`}>${balance.toLocaleString("es-DO")}</div>
            <p className="text-xs text-muted-foreground mt-1">Ingresos - Gastos</p>
          </CardContent>
        </Card>
      </div>

      <FinanceChart condominioId={CONDOMINIO_ID} title="Ingresos vs Gastos — Últimos 6 meses" />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Historial de Transacciones</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Fecha</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Unidad</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Concepto</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Método</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Estado</th>
                  <th className="text-right px-6 py-3 text-muted-foreground font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {transacciones.map(t => {
                  const esGasto = ["luz","agua","internet"].includes(t.tipo_servicio)
                  return (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-3 text-muted-foreground text-xs">{new Date(t.created_at).toLocaleDateString("es-DO")}</td>
                    <td className="px-6 py-3 font-mono text-xs">{t.unidad_id}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${esGasto ? "bg-orange-500/20 text-orange-400" : "bg-blue-500/20 text-blue-400"}`}>
                        {t.concepto}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground capitalize">{t.metodo_pago ?? "—"}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${estadoBadge[t.estado] || "bg-secondary"}`}>
                        {t.estado}
                      </span>
                    </td>
                    <td className={`px-6 py-3 text-right font-semibold ${esGasto ? "text-red-400" : "text-green-400"}`}>
                      {esGasto ? "-" : "+"}${Number(t.monto).toLocaleString("es-DO")}
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

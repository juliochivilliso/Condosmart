import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Loader2, AlertCircle } from "lucide-react"
import FinanceChart from "@/components/FinanceChart"

type ResumenCondominio = {
  id: string
  nombre: string
  ingresos: number
  gastos: number
  pendientes: number
  balance: number
}

const SEED_RESUMEN: ResumenCondominio[] = [
  { id: "c1", nombre: "Residencial Las Palmas",    ingresos: 45200, gastos: 5900, pendientes: 9200,  balance: 39300 },
  { id: "c2", nombre: "Torres del Norte",          ingresos: 38700, gastos: 4200, pendientes: 5800,  balance: 34500 },
  { id: "c3", nombre: "Villas del Este",           ingresos: 52100, gastos: 7100, pendientes: 11000, balance: 45000 },
  { id: "c4", nombre: "Residencias San Cristóbal", ingresos: 29500, gastos: 3800, pendientes: 4500,  balance: 25700 },
]

export default function FinanzasGlobal() {
  const [resumenes, setResumenes] = useState<ResumenCondominio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)

        const { data: condos, error: condoErr } = await supabase
          .from("condominios")
          .select("id, nombre")
          .eq("activo", true)

        if (condoErr) throw condoErr

        if (!condos || condos.length === 0) {
          setResumenes(SEED_RESUMEN)
          setError("Usando datos de demostración.")
          return
        }

        const { data: txs, error: txErr } = await supabase
          .from("transacciones")
          .select("condominio_id, monto, tipo_servicio, estado")

        if (txErr) throw txErr

        const resumenMap: Record<string, ResumenCondominio> = {}
        condos.forEach(c => {
          resumenMap[c.id] = { id: c.id, nombre: c.nombre, ingresos: 0, gastos: 0, pendientes: 0, balance: 0 }
        })

        ;(txs ?? []).forEach(t => {
          const r = resumenMap[t.condominio_id]
          if (!r) return
          const esIngreso = ["mantenimiento","fondo_reserva","sancion"].includes(t.tipo_servicio) && t.estado === "pagado"
          const esGasto   = ["luz","agua","internet"].includes(t.tipo_servicio)
          const esPendiente = t.estado === "pendiente"
          if (esIngreso)   r.ingresos   += Number(t.monto)
          if (esGasto)     r.gastos     += Number(t.monto)
          if (esPendiente) r.pendientes += Number(t.monto)
        })

        Object.values(resumenMap).forEach(r => { r.balance = r.ingresos - r.gastos })

        const result = Object.values(resumenMap)
        setResumenes(result.some(r => r.ingresos > 0 || r.gastos > 0) ? result : SEED_RESUMEN)
        if (!result.some(r => r.ingresos > 0)) setError("Usando datos de demostración.")
      } catch {
        setResumenes(SEED_RESUMEN)
        setError("Usando datos de demostración.")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const totalIngresos   = resumenes.reduce((a, r) => a + r.ingresos, 0)
  const totalGastos     = resumenes.reduce((a, r) => a + r.gastos, 0)
  const totalPendientes = resumenes.reduce((a, r) => a + r.pendientes, 0)
  const totalBalance    = totalIngresos - totalGastos

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="ml-3 text-muted-foreground">Cargando finanzas globales...</span>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display font-bold tracking-tight">Finanzas Globales</h2>
        <p className="text-muted-foreground mt-1">Resumen financiero consolidado de todos los residenciales</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-md px-4 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Totales</CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">${totalIngresos.toLocaleString("es-DO")}</div>
            <p className="text-xs text-muted-foreground mt-1">{resumenes.length} residenciales</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-rose-500/5 border-red-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gastos Totales</CardTitle>
            <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">${totalGastos.toLocaleString("es-DO")}</div>
            <p className="text-xs text-muted-foreground mt-1">Egresos operacionales</p>
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
            <div className="text-2xl font-bold text-yellow-400">${totalPendientes.toLocaleString("es-DO")}</div>
            <p className="text-xs text-muted-foreground mt-1">Pagos pendientes</p>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${totalBalance >= 0 ? "from-blue-500/10 to-cyan-500/5 border-blue-500/20" : "from-red-500/10 to-rose-500/5 border-red-500/20"}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Balance Global</CardTitle>
            <div className={`h-8 w-8 rounded-full ${totalBalance >= 0 ? "bg-blue-500/20" : "bg-red-500/20"} flex items-center justify-center`}>
              <BarChart3 className={`h-4 w-4 ${totalBalance >= 0 ? "text-blue-400" : "text-red-400"}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalBalance >= 0 ? "text-blue-400" : "text-red-400"}`}>
              ${totalBalance.toLocaleString("es-DO")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ingresos - Gastos</p>
          </CardContent>
        </Card>
      </div>

      <FinanceChart title="Tendencia Global — Últimos 6 meses" />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Desglose por Residencial</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Residencial</th>
                  <th className="text-right px-6 py-3 text-muted-foreground font-medium">Ingresos</th>
                  <th className="text-right px-6 py-3 text-muted-foreground font-medium">Gastos</th>
                  <th className="text-right px-6 py-3 text-muted-foreground font-medium">Por cobrar</th>
                  <th className="text-right px-6 py-3 text-muted-foreground font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {resumenes.map(r => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-3 font-medium">{r.nombre}</td>
                    <td className="px-6 py-3 text-right text-green-400 font-semibold">
                      ${r.ingresos.toLocaleString("es-DO")}
                    </td>
                    <td className="px-6 py-3 text-right text-red-400 font-semibold">
                      ${r.gastos.toLocaleString("es-DO")}
                    </td>
                    <td className="px-6 py-3 text-right text-yellow-400">
                      ${r.pendientes.toLocaleString("es-DO")}
                    </td>
                    <td className={`px-6 py-3 text-right font-bold ${r.balance >= 0 ? "text-blue-400" : "text-red-400"}`}>
                      ${r.balance.toLocaleString("es-DO")}
                    </td>
                  </tr>
                ))}
                <tr className="bg-secondary/20 font-bold">
                  <td className="px-6 py-3">Total plataforma</td>
                  <td className="px-6 py-3 text-right text-green-400">${totalIngresos.toLocaleString("es-DO")}</td>
                  <td className="px-6 py-3 text-right text-red-400">${totalGastos.toLocaleString("es-DO")}</td>
                  <td className="px-6 py-3 text-right text-yellow-400">${totalPendientes.toLocaleString("es-DO")}</td>
                  <td className={`px-6 py-3 text-right ${totalBalance >= 0 ? "text-blue-400" : "text-red-400"}`}>
                    ${totalBalance.toLocaleString("es-DO")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

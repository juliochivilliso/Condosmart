import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

type MesData = { mes: string; Ingresos: number; Gastos: number }

const MESES_LABEL = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]

const SEED: MesData[] = [
  { mes: "Dic", Ingresos: 32000, Gastos: 4200 },
  { mes: "Ene", Ingresos: 38500, Gastos: 5100 },
  { mes: "Feb", Ingresos: 35000, Gastos: 4800 },
  { mes: "Mar", Ingresos: 41200, Gastos: 5300 },
  { mes: "Abr", Ingresos: 39400, Gastos: 2700 },
  { mes: "May", Ingresos: 45200, Gastos: 5900 },
]

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-medium">${Number(p.value).toLocaleString("es-DO")}</span>
        </p>
      ))}
    </div>
  )
}

export default function FinanceChart({ condominioId, title = "Ingresos vs Gastos — Últimos 6 meses" }: { condominioId?: string; title?: string }) {
  const [data, setData] = useState<MesData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const since = new Date()
        since.setMonth(since.getMonth() - 5)
        since.setDate(1)
        since.setHours(0, 0, 0, 0)

        let query = supabase
          .from("transacciones")
          .select("monto, tipo_servicio, estado, created_at")
          .gte("created_at", since.toISOString())

        if (condominioId) query = query.eq("condominio_id", condominioId)

        const { data: txs } = await query

        if (!txs || txs.length === 0) {
          setData(SEED)
          return
        }

        const map: Record<string, MesData> = {}
        txs.forEach(t => {
          const d = new Date(t.created_at)
          const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`
          if (!map[key]) map[key] = { mes: MESES_LABEL[d.getMonth()], Ingresos: 0, Gastos: 0 }
          const esIngreso = ["mantenimiento","fondo_reserva","sancion"].includes(t.tipo_servicio) && t.estado === "pagado"
          const esGasto   = ["luz","agua","internet"].includes(t.tipo_servicio)
          if (esIngreso) map[key].Ingresos += Number(t.monto)
          if (esGasto)   map[key].Gastos   += Number(t.monto)
        })

        const sorted = Object.entries(map)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, v]) => v)

        setData(sorted.length ? sorted : SEED)
      } catch {
        setData(SEED)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [condominioId])

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="mes"
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--secondary))" }} />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                formatter={(v) => <span style={{ color: "hsl(var(--muted-foreground))" }}>{v}</span>}
              />
              <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="Gastos"   fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

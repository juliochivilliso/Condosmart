import { useEffect, useState } from "react"
// @ts-ignore
import jsPDF from "jspdf"
// @ts-ignore
import autoTable from "jspdf-autotable"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Loader2, Download, TrendingUp, TrendingDown, AlertCircle, FileBarChart2, Wrench
} from "lucide-react"
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts"

type Condominio = { id: string; nombre: string }

type ReporteData = {
  nombre: string
  ingresos: number
  gastos: number
  pendientes: number
  balance: number
  ticketsAbiertos: number
  ticketsCerrados: number
  unidades: number
  mensualData: { mes: string; ingresos: number; gastos: number }[]
}

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]

const formatDOP = (n: number) =>
  new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(n)

const SEED_REPORTE: ReporteData = {
  nombre: "Residencial Las Palmas (Demo)",
  ingresos: 145200, gastos: 18900, pendientes: 22400, balance: 126300,
  ticketsAbiertos: 4, ticketsCerrados: 18, unidades: 24,
  mensualData: [
    { mes: "Dic", ingresos: 20000, gastos: 2900 },
    { mes: "Ene", ingresos: 22500, gastos: 3100 },
    { mes: "Feb", ingresos: 21800, gastos: 2700 },
    { mes: "Mar", ingresos: 24000, gastos: 3300 },
    { mes: "Abr", ingresos: 27500, gastos: 3200 },
    { mes: "May", ingresos: 29400, gastos: 3700 },
  ],
}

const KPIS = [
  { key: "ingresos",   label: "Ingresos",   icon: TrendingUp,   cardClass: "from-emerald-500/10 to-transparent border-emerald-500/20", iconClass: "text-emerald-400" },
  { key: "gastos",     label: "Gastos",     icon: TrendingDown, cardClass: "from-rose-500/10 to-transparent border-rose-500/20",     iconClass: "text-rose-400" },
  { key: "pendientes", label: "Pendiente",  icon: AlertCircle,  cardClass: "from-yellow-500/10 to-transparent border-yellow-500/20", iconClass: "text-yellow-400" },
  { key: "balance",    label: "Balance",    icon: TrendingUp,   cardClass: "from-blue-500/10 to-transparent border-blue-500/20",     iconClass: "text-blue-400" },
] as const

export default function Reportes() {
  const [condominios, setCondominios] = useState<Condominio[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [reporte, setReporte] = useState<ReporteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingReporte, setLoadingReporte] = useState(false)
  const [usingSeed, setUsingSeed] = useState(false)

  function exportarPDF() {
    if (!reporte) return
    const doc = new jsPDF()
    const fecha = new Date().toLocaleDateString("es-DO")
    const nombreSlug = reporte.nombre.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    const totalTickets = (reporte.ticketsAbiertos ?? 0) + (reporte.ticketsCerrados ?? 0)
    const tasaResolucion = totalTickets > 0
      ? Math.round((reporte.ticketsCerrados / totalTickets) * 100)
      : 0

    // === Encabezado ===
    doc.setFontSize(20)
    doc.setTextColor(30, 41, 59)
    doc.text("CondoSmart — Reporte Ejecutivo", 14, 20)

    doc.setFontSize(12)
    doc.setTextColor(71, 85, 105)
    doc.text(`Residencial: ${reporte.nombre}`, 14, 30)
    doc.text(`Fecha de generación: ${fecha}`, 14, 37)

    doc.setDrawColor(226, 232, 240)
    doc.line(14, 42, 196, 42)

    // === Tabla KPIs ===
    doc.setFontSize(13)
    doc.setTextColor(30, 41, 59)
    doc.text("Indicadores Clave (KPIs)", 14, 50)

    autoTable(doc, {
      startY: 55,
      head: [["Indicador", "Valor"]],
      body: [
        ["Ingresos",          formatDOP(reporte.ingresos)],
        ["Gastos",            formatDOP(reporte.gastos)],
        ["Balance",           formatDOP(reporte.balance)],
        ["Por cobrar",        formatDOP(reporte.pendientes)],
        ["Unidades registradas", String(reporte.unidades)],
        ["Tickets abiertos",  String(reporte.ticketsAbiertos)],
        ["Tasa de resolución", `${tasaResolucion}%`],
      ],
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [241, 245, 249] },
    })

    // === Tabla Flujo Financiero ===
    // @ts-ignore
    const afterKpis = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(13)
    doc.setTextColor(30, 41, 59)
    doc.text("Flujo Financiero — Últimos 6 Meses", 14, afterKpis)

    autoTable(doc, {
      startY: afterKpis + 5,
      head: [["Mes", "Ingresos", "Gastos"]],
      body: reporte.mensualData.map((m) => [
        m.mes,
        formatDOP(m.ingresos),
        formatDOP(m.gastos),
      ]),
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [240, 253, 244] },
    })

    doc.save(`reporte-${nombreSlug}-${fecha.replace(/\//g, "-")}.pdf`)
  }

  useEffect(() => {
    supabase
      .from("condominios")
      .select("id, nombre")
      .eq("activo", true)
      .order("nombre")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setCondominios(data)
          setSelectedId(data[0].id)
        } else {
          setReporte(SEED_REPORTE)
          setUsingSeed(true)
        }
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (selectedId) fetchReporte(selectedId)
  }, [selectedId])

  async function fetchReporte(condoId: string) {
    setLoadingReporte(true)
    try {
      const [condoRes, txRes, ticketsRes] = await Promise.all([
        supabase
          .from("condominios")
          .select("nombre, cantidad_unidades")
          .eq("id", condoId)
          .single(),
        supabase
          .from("transacciones")
          .select("monto, tipo_servicio, estado, created_at")
          .eq("condominio_id", condoId),
        supabase
          .from("tickets_tecnicos")
          .select("estado")
          .eq("condominio_id", condoId),
      ])

      const condo = condoRes.data
      const txs = txRes.data ?? []
      const tickets = ticketsRes.data ?? []

      if (!condo || txs.length === 0) {
        setReporte({
          ...SEED_REPORTE,
          nombre: condo?.nombre ?? SEED_REPORTE.nombre,
          unidades: condo?.cantidad_unidades ?? SEED_REPORTE.unidades,
        })
        setUsingSeed(txs.length === 0)
        return
      }

      const ingresos = txs
        .filter((t) => t.estado === "pagado")
        .reduce((s, t) => s + (t.monto ?? 0), 0)

      const gastos = txs
        .filter((t) => t.tipo_servicio === "gasto" && t.estado === "pagado")
        .reduce((s, t) => s + (t.monto ?? 0), 0)

      const pendientes = txs
        .filter((t) => t.estado === "pendiente")
        .reduce((s, t) => s + (t.monto ?? 0), 0)

      const now = new Date()
      const mensualData = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
        const mes = MESES[d.getMonth()]
        const mm = d.getMonth() + 1
        const yy = d.getFullYear()
        const filtradas = txs.filter((t) => {
          const td = new Date(t.created_at)
          return td.getMonth() + 1 === mm && td.getFullYear() === yy
        })
        return {
          mes,
          ingresos: filtradas.filter((t) => t.estado === "pagado").reduce((s, t) => s + (t.monto ?? 0), 0),
          gastos: filtradas.filter((t) => t.tipo_servicio === "gasto").reduce((s, t) => s + (t.monto ?? 0), 0),
        }
      })

      setReporte({
        nombre: condo.nombre,
        ingresos,
        gastos,
        pendientes,
        balance: ingresos - gastos,
        ticketsAbiertos: tickets.filter((t) => t.estado !== "cerrado").length,
        ticketsCerrados: tickets.filter((t) => t.estado === "cerrado").length,
        unidades: condo.cantidad_unidades ?? 0,
        mensualData,
      })
      setUsingSeed(false)
    } catch {
      setReporte(SEED_REPORTE)
      setUsingSeed(true)
    } finally {
      setLoadingReporte(false)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-card border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((p: { dataKey: string; color: string; name: string; value: number }) => (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.name}: {formatDOP(p.value)}
          </p>
        ))}
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

  const totalTickets = (reporte?.ticketsAbiertos ?? 0) + (reporte?.ticketsCerrados ?? 0)
  const tasaResolucion = totalTickets > 0
    ? Math.round(((reporte?.ticketsCerrados ?? 0) / totalTickets) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reportes Ejecutivos</h2>
          <p className="text-muted-foreground mt-1">
            Análisis financiero y operativo por residencial.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {condominios.length > 0 && (
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {condominios.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          )}
          <Button
            variant="outline"
            className="gap-2"
          onClick={exportarPDF}
          >
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {usingSeed && (
        <div className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-md px-4 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Datos de demostración — sin transacciones registradas en este residencial.
        </div>
      )}

      {loadingReporte ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        reporte && (
          <>
            <div className="flex items-center gap-2 text-base font-semibold">
              <FileBarChart2 className="h-5 w-5 text-primary" />
              {reporte.nombre}
            </div>

            {/* KPIs financieros */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {KPIS.map((k) => {
                const Icon = k.icon
                return (
                  <Card key={k.key} className={`bg-gradient-to-br ${k.cardClass} border`}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium">{k.label}</CardTitle>
                      <Icon className={`h-4 w-4 ${k.iconClass}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold truncate">
                        {formatDOP(reporte[k.key])}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* KPIs operativos */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Unidades registradas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reporte.unidades}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm">Tickets abiertos</CardTitle>
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${reporte.ticketsAbiertos > 0 ? "text-yellow-400" : "text-green-400"}`}>
                    {reporte.ticketsAbiertos}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{reporte.ticketsCerrados} cerrados</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Tasa de resolución</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{tasaResolucion}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {reporte.ticketsCerrados}/{totalTickets} tickets resueltos
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico 6 meses */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Flujo financiero — últimos 6 meses</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={reporte.mensualData} barCategoryGap="30%" barGap={4}>
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
                      tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="gastos"   name="Gastos"   fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        )
      )}
    </div>
  )
}

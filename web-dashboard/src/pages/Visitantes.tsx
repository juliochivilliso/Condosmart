import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  ShieldCheck, Plus, Loader2, AlertCircle, Search, Users, Building2, LogIn, LogOut, Clock
} from "lucide-react"
import { format, isToday, isThisWeek } from "date-fns"
import { es } from "date-fns/locale"

// ── Types ─────────────────────────────────────────────────────────────────────
type Visitante = {
  id: string
  nombre_visitante: string
  tipo_documento: "cedula" | "pasaporte" | "otro"
  numero_documento: string | null
  placa_vehiculo: string | null
  hora_entrada: string
  hora_salida: string | null
  notas: string | null
  unidades?: { numero_apartamento: string; bloque: string } | null
}

type Unidad = { id: string; numero_apartamento: string; bloque: string }

// ── Seed fallback ──────────────────────────────────────────────────────────────
const SEED_VISITANTES: Visitante[] = [
  {
    id: "v1", nombre_visitante: "José Herrera", tipo_documento: "cedula",
    numero_documento: "001-0012345-6", placa_vehiculo: null,
    hora_entrada: new Date(Date.now() - 2 * 3600000).toISOString(), hora_salida: null,
    notas: "Visita familiar",
    unidades: { numero_apartamento: "101", bloque: "A" },
  },
  {
    id: "v2", nombre_visitante: "Servicios CLARO", tipo_documento: "otro",
    numero_documento: null, placa_vehiculo: "A123456",
    hora_entrada: new Date(Date.now() - 86400000).toISOString(),
    hora_salida: new Date(Date.now() - 86400000 + 90 * 60000).toISOString(),
    notas: "Instalación de fibra óptica",
    unidades: null,
  },
  {
    id: "v3", nombre_visitante: "Laura Peña", tipo_documento: "cedula",
    numero_documento: "001-9876543-2", placa_vehiculo: null,
    hora_entrada: new Date().toISOString(), hora_salida: null,
    notas: null,
    unidades: { numero_apartamento: "102", bloque: "A" },
  },
]

const TIPOS_DOC = ["cedula", "pasaporte", "otro"]

// ═════════════════════════════════════════════════════════════════════════════
export default function Visitantes() {
  const { profile } = useAuth()
  const CONDOMINIO_ID = profile?.condominio_id ?? ""

  const [visitantes, setVisitantes] = useState<Visitante[]>([])
  const [unidades,   setUnidades]   = useState<Unidad[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [open,       setOpen]       = useState(false)
  const [saving,     setSaving]     = useState(false)

  // Filtros
  const [busqueda,    setBusqueda]    = useState("")
  const [soloActivos, setSoloActivos] = useState(false)

  // Formulario
  const [form, setForm] = useState({
    nombre_visitante: "",
    tipo_documento:   "cedula",
    numero_documento: "",
    placa_vehiculo:   "",
    unidad_id:        "",
    notas:            "",
  })

  // ── Fetch ─────────────────────────────────────────────────────────────────
  async function fetchVisitantes() {
    if (!CONDOMINIO_ID) {
      setVisitantes(SEED_VISITANTES)
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const { data, error: err } = await supabase
        .from("visitantes")
        .select(`
          id, nombre_visitante, tipo_documento, numero_documento,
          placa_vehiculo, hora_entrada, hora_salida, notas,
          unidades(numero_apartamento, bloque)
        `)
        .eq("condominio_id", CONDOMINIO_ID)
        .order("hora_entrada", { ascending: false })
        .limit(50)
      if (err) throw err
      setVisitantes((data ?? []) as unknown as Visitante[])
    } catch {
      setVisitantes(SEED_VISITANTES)
      setError("Mostrando datos de demostración.")
    } finally {
      setLoading(false)
    }
  }

  async function fetchUnidades() {
    if (!CONDOMINIO_ID) return
    const { data } = await supabase
      .from("unidades")
      .select("id, numero_apartamento, bloque")
      .eq("condominio_id", CONDOMINIO_ID)
      .eq("activo", true)
      .order("bloque")
    setUnidades((data ?? []) as Unidad[])
  }

  useEffect(() => {
    fetchVisitantes()
    fetchUnidades()
  }, [CONDOMINIO_ID])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const enEdificio = visitantes.filter(v => !v.hora_salida).length
  const visitasHoy   = visitantes.filter(v => isToday(new Date(v.hora_entrada))).length
  const visitasSemana = visitantes.filter(v => isThisWeek(new Date(v.hora_entrada), { locale: es })).length

  // ── Registrar entrada ──────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre_visitante.trim()) return
    setSaving(true)
    try {
      const { error: err } = await supabase.from("visitantes").insert({
        condominio_id:    CONDOMINIO_ID,
        unidad_id:        form.unidad_id || null,
        nombre_visitante: form.nombre_visitante.trim(),
        tipo_documento:   form.tipo_documento,
        numero_documento: form.numero_documento || null,
        placa_vehiculo:   form.placa_vehiculo || null,
        notas:            form.notas || null,
        hora_entrada:     new Date().toISOString(),
        registrado_por:   profile!.id,
      })
      if (err) throw err
      setOpen(false)
      resetForm()
      await fetchVisitantes()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar"
      alert(msg)
    } finally {
      setSaving(false)
    }
  }

  // ── Registrar salida ───────────────────────────────────────────────────────
  async function registrarSalida(id: string) {
    const horaSalida = new Date().toISOString()
    setVisitantes(prev =>
      prev.map(v => v.id === id ? { ...v, hora_salida: horaSalida } : v)
    )
    await supabase.from("visitantes").update({ hora_salida: horaSalida }).eq("id", id)
  }

  function resetForm() {
    setForm({ nombre_visitante: "", tipo_documento: "cedula", numero_documento: "", placa_vehiculo: "", unidad_id: "", notas: "" })
  }

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const filtrados = visitantes.filter(v => {
    const matchBusqueda = !busqueda ||
      v.nombre_visitante.toLowerCase().includes(busqueda.toLowerCase()) ||
      (v.numero_documento ?? "").toLowerCase().includes(busqueda.toLowerCase())
    const matchActivos = !soloActivos || !v.hora_salida
    return matchBusqueda && matchActivos
  })

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              Control de Visitantes
            </h2>
            {enEdificio > 0 && (
              <span className="text-sm font-semibold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {enEdificio} en edificio
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-2 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Registro de entradas y salidas de visitantes.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" />
              Registrar Entrada
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] border-border bg-card/95 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Registrar Visitante</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-3">
              <div className="space-y-2">
                <Label htmlFor="vis-nombre">Nombre *</Label>
                <Input
                  id="vis-nombre"
                  required
                  placeholder="Nombre completo del visitante"
                  value={form.nombre_visitante}
                  onChange={e => setForm({ ...form, nombre_visitante: e.target.value })}
                  className="bg-secondary/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tipo documento</Label>
                  <Select value={form.tipo_documento} onValueChange={v => setForm({ ...form, tipo_documento: v })}>
                    <SelectTrigger className="bg-secondary/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_DOC.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vis-doc">Número documento</Label>
                  <Input
                    id="vis-doc"
                    placeholder="000-0000000-0"
                    value={form.numero_documento}
                    onChange={e => setForm({ ...form, numero_documento: e.target.value })}
                    className="bg-secondary/30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vis-placa">Placa vehículo</Label>
                <Input
                  id="vis-placa"
                  placeholder="Ej: A123456"
                  value={form.placa_vehiculo}
                  onChange={e => setForm({ ...form, placa_vehiculo: e.target.value })}
                  className="bg-secondary/30"
                />
              </div>

              <div className="space-y-2">
                <Label>Unidad visitada</Label>
                <Select value={form.unidad_id} onValueChange={v => setForm({ ...form, unidad_id: v })}>
                  <SelectTrigger className="bg-secondary/30">
                    <SelectValue placeholder="Selecciona una unidad..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin unidad específica</SelectItem>
                    {unidades.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        Bloque {u.bloque} — Apto {u.numero_apartamento}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vis-notas">Notas</Label>
                <Input
                  id="vis-notas"
                  placeholder="Observaciones adicionales..."
                  value={form.notas}
                  onChange={e => setForm({ ...form, notas: e.target.value })}
                  className="bg-secondary/30"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving || !form.nombre_visitante} className="min-w-[140px]">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
                  Registrar Entrada
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-md px-4 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border bg-gradient-to-br from-blue-500/10 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Visitas hoy</CardTitle>
            <Clock className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visitasHoy}</div>
          </CardContent>
        </Card>
        <Card className="border-border bg-gradient-to-br from-emerald-500/10 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">En edificio ahora</CardTitle>
            <Users className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{enEdificio}</div>
          </CardContent>
        </Card>
        <Card className="border-border bg-gradient-to-br from-purple-500/10 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Esta semana</CardTitle>
            <Building2 className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visitasSemana}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o documento..."
            className="pl-10 bg-secondary/30"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <Button
          variant={soloActivos ? "secondary" : "outline"}
          size="sm"
          onClick={() => setSoloActivos(!soloActivos)}
          className="gap-2"
        >
          <Users className="h-4 w-4" />
          Solo en edificio
        </Button>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Registro de Visitantes ({filtrados.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtrados.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No hay visitantes que coincidan con los filtros.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Visitante</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Doc / Placa</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Unidad</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Hora Entrada</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Hora Salida</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Notas</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(v => (
                    <tr key={v.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">{v.nombre_visitante}</div>
                        <div className="text-xs text-muted-foreground capitalize">{v.tipo_documento}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {v.numero_documento && <div>{v.numero_documento}</div>}
                        {v.placa_vehiculo && <div className="text-xs">🚗 {v.placa_vehiculo}</div>}
                        {!v.numero_documento && !v.placa_vehiculo && "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {v.unidades
                          ? `${v.unidades.bloque}-${v.unidades.numero_apartamento}`
                          : <span className="text-muted-foreground/50">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {format(new Date(v.hora_entrada), "dd MMM, HH:mm", { locale: es })}
                      </td>
                      <td className="px-4 py-3">
                        {v.hora_salida ? (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(v.hora_salida), "dd MMM, HH:mm", { locale: es })}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            En edificio
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[160px] truncate text-muted-foreground text-xs">
                        {v.notas ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {!v.hora_salida && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 gap-1"
                            onClick={() => registrarSalida(v.id)}
                          >
                            <LogOut className="h-3 w-3" /> Salida
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

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
  Waves, Dumbbell, PartyPopper, Trophy, Plus, Loader2, AlertCircle, CalendarDays, Users, XCircle
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// ── Types ─────────────────────────────────────────────────────────────────────
type AreaComun = {
  id: string
  nombre: string
  descripcion?: string
  capacidad: number
  requiere_aprobacion: boolean
}

type Reserva = {
  id: string
  area_id: string
  usuario_id: string
  unidad_id: string | null
  fecha: string
  hora_inicio: string
  hora_fin: string
  proposito: string | null
  num_asistentes: number
  estado: "pendiente" | "confirmada" | "cancelada"
  areas_comunes?: { nombre: string }
  usuarios?: { nombre_completo: string }
  unidades?: { numero_apartamento: string; bloque: string } | null
}

// ── Seed fallback ──────────────────────────────────────────────────────────────
const SEED_AREAS: AreaComun[] = [
  { id: "1", nombre: "Piscina",          capacidad: 20, requiere_aprobacion: false },
  { id: "2", nombre: "Salón de Eventos", capacidad: 80, requiere_aprobacion: true  },
  { id: "3", nombre: "Gimnasio",         capacidad: 10, requiere_aprobacion: false },
  { id: "4", nombre: "Cancha Multiuso",  capacidad: 22, requiere_aprobacion: false },
]

const SEED_RESERVAS: Reserva[] = [
  {
    id: "r1", area_id: "1", usuario_id: "u1", unidad_id: "un1",
    fecha: new Date().toISOString().split("T")[0],
    hora_inicio: "10:00", hora_fin: "12:00",
    proposito: "Tarde de natación familiar", num_asistentes: 4, estado: "confirmada",
    areas_comunes: { nombre: "Piscina" },
    usuarios: { nombre_completo: "María González" },
    unidades: { numero_apartamento: "101", bloque: "A" },
  },
  {
    id: "r2", area_id: "2", usuario_id: "u2", unidad_id: "un2",
    fecha: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    hora_inicio: "18:00", hora_fin: "23:00",
    proposito: "Cumpleaños de Ana", num_asistentes: 50, estado: "pendiente",
    areas_comunes: { nombre: "Salón de Eventos" },
    usuarios: { nombre_completo: "Carlos Ramírez" },
    unidades: { numero_apartamento: "102", bloque: "A" },
  },
  {
    id: "r3", area_id: "3", usuario_id: "u3", unidad_id: "un3",
    fecha: new Date().toISOString().split("T")[0],
    hora_inicio: "07:00", hora_fin: "08:30",
    proposito: "Entrenamiento matutino", num_asistentes: 1, estado: "confirmada",
    areas_comunes: { nombre: "Gimnasio" },
    usuarios: { nombre_completo: "Ana Martínez" },
    unidades: { numero_apartamento: "203", bloque: "B" },
  },
]

// ── Icon map ───────────────────────────────────────────────────────────────────
const areaIcon = (nombre: string) => {
  const n = nombre.toLowerCase()
  if (n.includes("piscina") || n.includes("agua"))  return Waves
  if (n.includes("gimnas"))                          return Dumbbell
  if (n.includes("sal") || n.includes("event"))     return PartyPopper
  return Trophy
}

// ── Estado badge ───────────────────────────────────────────────────────────────
const estadoBadge: Record<string, string> = {
  confirmada: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  pendiente:  "bg-yellow-500/20  text-yellow-400  border-yellow-500/30",
  cancelada:  "bg-red-500/20     text-red-400     border-red-500/30",
}

// ── Hoy (YYYY-MM-DD) ──────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split("T")[0]

// ═════════════════════════════════════════════════════════════════════════════
export default function Reservas() {
  const { profile } = useAuth()
  const CONDOMINIO_ID = profile?.condominio_id ?? ""

  const [areas,   setAreas]   = useState<AreaComun[]>([])
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [open,    setOpen]    = useState(false)
  const [saving,  setSaving]  = useState(false)

  // Filtros
  const [filtroArea,  setFiltroArea]  = useState("todas")
  const [filtroFecha, setFiltroFecha] = useState("")

  // Formulario nueva reserva
  const [form, setForm] = useState({
    area_id:        "",
    fecha:          todayStr(),
    hora_inicio:    "08:00",
    hora_fin:       "10:00",
    proposito:      "",
    num_asistentes: 1,
  })

  // ── Fetch ─────────────────────────────────────────────────────────────────
  async function fetchAreas() {
    if (!CONDOMINIO_ID) { setAreas(SEED_AREAS); return }
    const { data, error: err } = await supabase
      .from("areas_comunes")
      .select("id, nombre, descripcion, capacidad, requiere_aprobacion")
      .eq("condominio_id", CONDOMINIO_ID)
      .eq("activo", true)
    if (err || !data?.length) { setAreas(SEED_AREAS); setError("Mostrando áreas de demostración.") }
    else setAreas(data as AreaComun[])
  }

  async function fetchReservas() {
    if (!CONDOMINIO_ID) { setReservas(SEED_RESERVAS); setLoading(false); return }
    try {
      const { data, error: err } = await supabase
        .from("reservas")
        .select(`
          id, area_id, usuario_id, unidad_id, fecha,
          hora_inicio, hora_fin, proposito, num_asistentes, estado,
          areas_comunes(nombre),
          usuarios(nombre_completo),
          unidades(numero_apartamento, bloque)
        `)
        .eq("condominio_id", CONDOMINIO_ID)
        .order("fecha", { ascending: false })
      if (err) throw err
      setReservas((data ?? []) as unknown as Reserva[])
    } catch {
      setReservas(SEED_RESERVAS)
      setError("Mostrando reservas de demostración.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAreas()
    fetchReservas()
  }, [CONDOMINIO_ID])

  // ── Crear reserva ─────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.area_id || !form.fecha) return
    setSaving(true)
    try {
      const { error: err } = await supabase.from("reservas").insert({
        area_id:        form.area_id,
        condominio_id:  CONDOMINIO_ID,
        usuario_id:     profile!.id,
        unidad_id:      null,
        fecha:          form.fecha,
        hora_inicio:    form.hora_inicio,
        hora_fin:       form.hora_fin,
        proposito:      form.proposito,
        num_asistentes: form.num_asistentes,
      })
      if (err) throw err
      setOpen(false)
      resetForm()
      await fetchReservas()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al crear la reserva"
      alert(msg)
    } finally {
      setSaving(false)
    }
  }

  // ── Cancelar reserva ──────────────────────────────────────────────────────
  async function cancelarReserva(id: string) {
    if (!confirm("¿Cancelar esta reserva?")) return
    setReservas(prev => prev.map(r => r.id === id ? { ...r, estado: "cancelada" } : r))
    await supabase.from("reservas").update({ estado: "cancelada" }).eq("id", id)
  }

  function resetForm() {
    setForm({ area_id: "", fecha: todayStr(), hora_inicio: "08:00", hora_fin: "10:00", proposito: "", num_asistentes: 1 })
  }

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const reservasFiltradas = reservas.filter(r => {
    const byArea  = filtroArea  === "todas" || r.area_id === filtroArea
    const byFecha = !filtroFecha || r.fecha === filtroFecha
    return byArea && byFecha
  })

  const isAdmin = profile?.rol === "admin_condominio" || profile?.rol === "super_admin"

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
          <h2 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Reservas de Áreas Comunes
          </h2>
          <p className="text-muted-foreground mt-2 flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Gestiona el uso de los espacios compartidos del residencial.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" />
              Nueva Reserva
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] border-border bg-card/95 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Nueva Reserva</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-3">
              {/* Área */}
              <div className="space-y-2">
                <Label>Área Común *</Label>
                <Select value={form.area_id} onValueChange={v => setForm({ ...form, area_id: v })}>
                  <SelectTrigger className="bg-secondary/30">
                    <SelectValue placeholder="Selecciona un área..." />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nombre} — cap. {a.capacidad}
                        {a.requiere_aprobacion ? " (requiere aprobación)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fecha */}
              <div className="space-y-2">
                <Label htmlFor="res-fecha">Fecha *</Label>
                <Input
                  id="res-fecha"
                  type="date"
                  min={todayStr()}
                  required
                  value={form.fecha}
                  onChange={e => setForm({ ...form, fecha: e.target.value })}
                  className="bg-secondary/30"
                />
              </div>

              {/* Horas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="res-inicio">Hora inicio</Label>
                  <Input
                    id="res-inicio"
                    type="time"
                    value={form.hora_inicio}
                    onChange={e => setForm({ ...form, hora_inicio: e.target.value })}
                    className="bg-secondary/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="res-fin">Hora fin</Label>
                  <Input
                    id="res-fin"
                    type="time"
                    value={form.hora_fin}
                    onChange={e => setForm({ ...form, hora_fin: e.target.value })}
                    className="bg-secondary/30"
                  />
                </div>
              </div>

              {/* Propósito */}
              <div className="space-y-2">
                <Label htmlFor="res-prop">Propósito</Label>
                <Input
                  id="res-prop"
                  placeholder="Ej: Reunión de vecinos, cumpleaños..."
                  value={form.proposito}
                  onChange={e => setForm({ ...form, proposito: e.target.value })}
                  className="bg-secondary/30"
                />
              </div>

              {/* Asistentes */}
              <div className="space-y-2">
                <Label htmlFor="res-asist">Número de asistentes</Label>
                <Input
                  id="res-asist"
                  type="number"
                  min={1}
                  value={form.num_asistentes}
                  onChange={e => setForm({ ...form, num_asistentes: Number(e.target.value) })}
                  className="bg-secondary/30"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving || !form.area_id} className="min-w-[120px]">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CalendarDays className="h-4 w-4 mr-2" />}
                  Reservar
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

      {/* Grid de áreas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {areas.map(area => {
          const Icon = areaIcon(area.nombre)
          return (
            <Card key={area.id} className="group relative overflow-hidden border-border bg-card/40 hover:bg-card/60 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  {area.requiere_aprobacion && (
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full border bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                      Aprobación
                    </span>
                  )}
                </div>
                <CardTitle className="text-base mt-3">{area.nombre}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  Capacidad: <span className="font-semibold text-foreground ml-1">{area.capacidad}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={filtroArea} onValueChange={setFiltroArea}>
          <SelectTrigger className="w-48 bg-secondary/30">
            <SelectValue placeholder="Filtrar por área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las áreas</SelectItem>
            {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={filtroFecha}
          onChange={e => setFiltroFecha(e.target.value)}
          className="w-48 bg-secondary/30"
        />

        {(filtroArea !== "todas" || filtroFecha) && (
          <Button variant="ghost" size="sm" onClick={() => { setFiltroArea("todas"); setFiltroFecha("") }}>
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Tabla de reservas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            Reservas ({reservasFiltradas.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {reservasFiltradas.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No hay reservas para los filtros seleccionados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Área</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Residente</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Unidad</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Fecha</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Hora</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Propósito</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Asist.</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Estado</th>
                    {isAdmin && <th className="text-left px-4 py-3 text-muted-foreground font-medium">Acción</th>}
                  </tr>
                </thead>
                <tbody>
                  {reservasFiltradas.map(r => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{r.areas_comunes?.nombre ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.usuarios?.nombre_completo ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {r.unidades ? `${r.unidades.bloque}-${r.unidades.numero_apartamento}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {format(new Date(r.fecha + "T00:00:00"), "dd MMM yyyy", { locale: es })}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {r.hora_inicio} – {r.hora_fin}
                      </td>
                      <td className="px-4 py-3 max-w-[180px] truncate text-muted-foreground">
                        {r.proposito ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-center">{r.num_asistentes}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${estadoBadge[r.estado] ?? "bg-secondary"}`}>
                          {r.estado}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          {r.estado !== "cancelada" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1"
                              onClick={() => cancelarReserva(r.id)}
                            >
                              <XCircle className="h-3 w-3" /> Cancelar
                            </Button>
                          )}
                        </td>
                      )}
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

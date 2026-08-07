import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Loader2, AlertCircle, ChevronDown, Wrench, Building2 } from "lucide-react"

type Unidad = { id: string; numero_apartamento: string; bloque: string | null }

type Ticket = {
  id: string; titulo: string; descripcion: string; estado: string; categoria: string; created_at: string
  fixseek_request_id?: string | null; fixseek_profesional_nombre?: string | null
}

const SEED_TICKETS: Ticket[] = [
  { id: "1", titulo: "Filtración en techo",         descripcion: "Goteo en el pasillo",               estado: "pendiente",   categoria: "plomería",     created_at: "2026-04-28T10:00:00Z" },
  { id: "2", titulo: "Ascensor B sin funcionar",    descripcion: "Ascensor parado desde el lunes",    estado: "en_progreso", categoria: "electricidad", created_at: "2026-04-27T09:00:00Z" },
  { id: "3", titulo: "Humedad en pared corredor",   descripcion: "Mancha de humedad visible",          estado: "completado",  categoria: "pintura",      created_at: "2026-04-20T14:00:00Z" },
  { id: "4", titulo: "Puerta de acceso dañada",     descripcion: "No cierra correctamente",            estado: "pendiente",   categoria: "carpintería",  created_at: "2026-04-29T16:30:00Z" },
  { id: "5", titulo: "Sistema de riego automático", descripcion: "No enciende en horario programado", estado: "en_progreso", categoria: "jardinería",   created_at: "2026-04-26T11:00:00Z" },
]

const estadoConfig: Record<string, { label: string; className: string }> = {
  pendiente:   { label: "Pendiente",   className: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" },
  asignado:    { label: "Asignado",    className: "bg-purple-500/20 text-purple-400 border border-purple-500/30" },
  en_progreso: { label: "En Progreso", className: "bg-blue-500/20 text-blue-400 border border-blue-500/30" },
  completado:  { label: "Completado",  className: "bg-green-500/20 text-green-400 border border-green-500/30" },
  rechazado:   { label: "Rechazado",   className: "bg-red-500/20 text-red-400 border border-red-500/30" },
}

const ESTADOS = ["pendiente", "asignado", "en_progreso", "completado", "rechazado"]
const CATEGORIAS = ["plomería", "electricidad", "pintura", "carpintería", "jardinería", "limpieza", "otro"]

export default function Tickets() {
  const { profile } = useAuth()
  const CONDOMINIO_ID = profile?.condominio_id ?? ''
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [unidadIdSeleccionada, setUnidadIdSeleccionada] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [titulo, setTitulo] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [categoria, setCategoria] = useState("plomería")
  const [fixseekLoading, setFixseekLoading] = useState<string | null>(null)
  const [fixseekMsg, setFixseekMsg] = useState<string | null>(null)

  async function fetchTickets() {
    if (!CONDOMINIO_ID) {
      setTickets(SEED_TICKETS)
      if (profile?.rol !== 'super_admin') {
        setError("Sin condominio asignado — mostrando datos de demostración.")
      }
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("tickets_tecnicos")
        .select("id, titulo, descripcion, estado, categoria, created_at, fixseek_request_id, fixseek_profesional_nombre")
        .eq("condominio_id", CONDOMINIO_ID)
        .order("created_at", { ascending: false })
      if (error) throw error
      if (!data || data.length === 0) { setTickets(SEED_TICKETS); setError("Usando datos de demostración.") }
      else setTickets(data as Ticket[])
    } catch { setTickets(SEED_TICKETS); setError("Usando datos de demostración.") }
    finally { setLoading(false) }
  }

  async function fetchUnidades() {
    if (!CONDOMINIO_ID) return
    try {
      const { data, error } = await supabase
        .from("unidades")
        .select("id, numero_apartamento, bloque")
        .eq("condominio_id", CONDOMINIO_ID)
        .order("numero_apartamento")
      if (error) throw error
      if (data) {
        setUnidades(data)
        if (data.length > 0) setUnidadIdSeleccionada(data[0].id)
      }
    } catch (err) {
      console.error("fetchUnidades error:", err)
    }
  }

  useEffect(() => {
    fetchTickets()
    fetchUnidades()
  }, [CONDOMINIO_ID])

  useEffect(() => {
    if (!CONDOMINIO_ID) return
    const channel = supabase
      .channel('tickets-fixseek-realtime')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tickets_tecnicos', filter: `condominio_id=eq.${CONDOMINIO_ID}` },
        () => fetchTickets())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [CONDOMINIO_ID])

  async function buscarProfesional(ticketId: string) {
    setFixseekLoading(ticketId)
    setFixseekMsg(null)
    try {
      const { data, error } = await supabase.functions.invoke('bridge-fixseek', {
        body: {
          ticket_id: ticketId,
          shared_secret: import.meta.env.VITE_BRIDGE_SHARED_SECRET ?? '',
        },
      })
      if (error) throw error
      setFixseekMsg(`Ticket enviado a FixSeek. ${(data as { fixseek_request_id?: string })?.fixseek_request_id ? "Solicitud creada en la red de profesionales." : ""}`)
      await fetchTickets()
    } catch (err) {
      setFixseekMsg(`Error: ${err instanceof Error ? err.message : "No se pudo contactar FixSeek"}`)
    } finally {
      setFixseekLoading(null)
    }
  }

  async function handleGuardar() {
    if (!titulo.trim()) return
    setSaving(true)
    try {
      const { error } = await supabase.from("tickets_tecnicos").insert({
        titulo: titulo.trim(), descripcion: descripcion.trim() || "Sin descripción",
        estado: "pendiente", categoria, condominio_id: CONDOMINIO_ID, unidad_id: unidadIdSeleccionada || null,
      })
      if (error) throw error
      setOpen(false); resetForm(); await fetchTickets()
    } catch {
      setTickets(prev => [{ id: Date.now().toString(), titulo, descripcion, estado: "pendiente", categoria, created_at: new Date().toISOString() }, ...prev])
      setOpen(false); resetForm()
    } finally { setSaving(false) }
  }

  async function cambiarEstado(id: string, nuevoEstado: string) {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, estado: nuevoEstado } : t))
    try { await supabase.from("tickets_tecnicos").update({ estado: nuevoEstado }).eq("id", id) } catch {}
  }

  function resetForm() { 
    setTitulo("")
    setDescripcion("")
    setCategoria("plomería")
    if (unidades.length > 0) setUnidadIdSeleccionada(unidades[0].id)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="ml-3 text-muted-foreground">Cargando tickets...</span>
    </div>
  )

  if (!CONDOMINIO_ID && profile?.rol === 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Wrench className="h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-xl font-medium text-muted-foreground">Selecciona un residencial para ver los datos.</h2>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">Servicios Técnicos</h2>
          <p className="text-muted-foreground mt-1">{tickets.length} tickets registrados</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Nuevo Ticket</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Crear Ticket Técnico</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="tk-titulo">Título *</Label>
                <Input id="tk-titulo" placeholder="Ej. Filtración en techo" value={titulo} onChange={e => setTitulo(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tk-desc">Descripción</Label>
                <Input id="tk-desc" placeholder="Detalles del problema..." value={descripcion} onChange={e => setDescripcion(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tk-unidad">Unidad / Apartamento *</Label>
                <select id="tk-unidad" value={unidadIdSeleccionada} onChange={e => setUnidadIdSeleccionada(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  {unidades.length === 0 ? (
                    <option value="">No hay unidades disponibles</option>
                  ) : (
                    unidades.map(u => (
                      <option key={u.id} value={u.id}>
                        Apt {u.numero_apartamento} {u.bloque ? `· Bl. ${u.bloque}` : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tk-cat">Categoría</Label>
                <select id="tk-cat" value={categoria} onChange={e => setCategoria(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={handleGuardar} disabled={saving || !titulo}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-md px-4 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {fixseekMsg && (
        <div className="flex items-center gap-2 text-sm text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-md px-4 py-2">
          <Building2 className="h-4 w-4 shrink-0" />{fixseekMsg}
        </div>
      )}

      <Card>
        <CardHeader className="pb-4"><CardTitle className="text-lg">Tickets Activos</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Título</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Categoría</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Estado</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">FixSeek</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Fecha</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => {
                  const est = estadoConfig[t.estado] || { label: t.estado, className: "bg-secondary" }
                  return (
                    <tr key={t.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="px-6 py-3 font-medium max-w-[200px] truncate">{t.titulo}</td>
                      <td className="px-6 py-3 text-muted-foreground capitalize">{t.categoria}</td>
                      <td className="px-6 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${est.className}`}>{est.label}</span></td>
                      <td className="px-6 py-3">
                        {t.fixseek_request_id ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <Building2 className="h-3 w-3" />
                            {t.fixseek_profesional_nombre ? t.fixseek_profesional_nombre : "En FixSeek"}
                          </span>
                        ) : t.estado === "pendiente" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs h-7"
                            onClick={() => buscarProfesional(t.id)}
                            disabled={fixseekLoading === t.id}
                          >
                            {fixseekLoading === t.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Building2 className="h-3 w-3" />}
                            Buscar profesional
                          </Button>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground text-xs">{new Date(t.created_at).toLocaleDateString("es-DO")}</td>
                      <td className="px-6 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">Cambiar <ChevronDown className="h-3 w-3" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {ESTADOS.filter(s => s !== t.estado).map(s => (
                              <DropdownMenuItem key={s} onClick={() => cambiarEstado(t.id, s)}>
                                {estadoConfig[s]?.label || s}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

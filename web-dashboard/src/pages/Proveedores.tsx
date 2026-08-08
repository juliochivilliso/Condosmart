import { useEffect, useMemo, useState } from "react"
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
  Truck, Plus, Loader2, AlertCircle, Search, Pencil, Power, Building2
} from "lucide-react"

type Proveedor = {
  id: string
  condominio_id: string
  nombre: string
  rnc: string | null
  categoria_servicio: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  activo: boolean
  created_at: string
}

const CATEGORIAS_SERVICIO = [
  "plomeria", "electricidad", "jardineria", "seguridad", "limpieza",
  "mantenimiento", "administracion", "construccion", "suministros", "otro",
]

const SEED_PROVEEDORES: Proveedor[] = [
  { id: "p1", condominio_id: "", nombre: "Inversiones Las Palmas SRL", rnc: "130-00001-0", categoria_servicio: "jardineria", telefono: "809-555-0101", email: "contacto@laspalmas.inv", direccion: "Av. Churchill", activo: true, created_at: "" },
  { id: "p2", condominio_id: "", nombre: "ElectroServicios RD", rnc: "130-00002-8", categoria_servicio: "electricidad", telefono: "809-555-0202", email: "ventas@electrosv.do", direccion: "Calle Duarte", activo: true, created_at: "" },
  { id: "p3", condominio_id: "", nombre: "Mantenimiento Pro SRL", rnc: "130-00003-6", categoria_servicio: "mantenimiento", telefono: "829-555-0303", email: "admin@mpro.do", direccion: null, activo: true, created_at: "" },
]

const categoriaLabel = (c: string | null) => {
  if (!c) return "—"
  return c.charAt(0).toUpperCase() + c.slice(1)
}

export default function Proveedores() {
  const { profile } = useAuth()
  const CONDOMINIO_ID = profile?.condominio_id ?? ""

  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState("")

  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Proveedor | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nombre: "", rnc: "", categoria_servicio: "otro", telefono: "", email: "", direccion: "",
  })

  async function fetchProveedores() {
    if (!CONDOMINIO_ID) {
      setProveedores(SEED_PROVEEDORES)
      if (profile?.rol !== "super_admin") setError("Sin condominio asignado — mostrando datos de demostración.")
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("proveedores")
        .select("*")
        .eq("condominio_id", CONDOMINIO_ID)
        .order("nombre")
      if (error) throw error
      if (!data || data.length === 0) { setProveedores([]); setError(null) }
      else setProveedores(data as Proveedor[])
    } catch {
      setProveedores([]); setError("Error al cargar proveedores.")
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchProveedores() }, [CONDOMINIO_ID])

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase()
    return proveedores.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      (p.categoria_servicio ?? "").toLowerCase().includes(q) ||
      (p.rnc ?? "").toLowerCase().includes(q)
    )
  }, [proveedores, busqueda])

  const activos = useMemo(() => proveedores.filter(p => p.activo).length, [proveedores])

  function resetForm() {
    setForm({ nombre: "", rnc: "", categoria_servicio: "otro", telefono: "", email: "", direccion: "" })
    setEditando(null)
  }

  function abrirNuevo() { resetForm(); setOpen(true) }
  function abrirEditar(p: Proveedor) {
    setEditando(p)
    setForm({
      nombre: p.nombre, rnc: p.rnc ?? "", categoria_servicio: p.categoria_servicio ?? "otro",
      telefono: p.telefono ?? "", email: p.email ?? "", direccion: p.direccion ?? "",
    })
    setOpen(true)
  }

  async function handleGuardar() {
    if (!form.nombre.trim()) return
    setSaving(true)
    try {
      const payload = {
        nombre: form.nombre.trim(),
        rnc: form.rnc.trim() || null,
        categoria_servicio: form.categoria_servicio,
        telefono: form.telefono.trim() || null,
        email: form.email.trim() || null,
        direccion: form.direccion.trim() || null,
      }
      if (editando) {
        await supabase.from("proveedores").update(payload).eq("id", editando.id)
      } else {
        await supabase.from("proveedores").insert({ ...payload, condominio_id: CONDOMINIO_ID })
      }
      setOpen(false); resetForm(); await fetchProveedores()
    } catch {
      setError("Error al guardar el proveedor.")
    } finally { setSaving(false) }
  }

  async function toggleActivo(p: Proveedor) {
    const nuevo = !p.activo
    setProveedores(prev => prev.map(x => x.id === p.id ? { ...x, activo: nuevo } : x))
    try {
      await supabase.from("proveedores").update({ activo: nuevo }).eq("id", p.id)
    } catch {
      setProveedores(prev => prev.map(x => x.id === p.id ? { ...x, activo: p.activo } : x))
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="ml-3 text-muted-foreground">Cargando proveedores...</span>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">Proveedores</h2>
          <p className="text-muted-foreground mt-1">{activos} proveedores activos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={abrirNuevo} className="gap-2"><Plus className="h-4 w-4" />Nuevo Proveedor</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editando ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="prov-nombre">Nombre *</Label>
                <Input id="prov-nombre" placeholder="Ej. Inversiones Las Palmas SRL" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prov-rnc">RNC</Label>
                  <Input id="prov-rnc" placeholder="130-00000-0" value={form.rnc} onChange={e => setForm({ ...form, rnc: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prov-cat">Categoría</Label>
                  <Select value={form.categoria_servicio} onValueChange={v => setForm({ ...form, categoria_servicio: v })}>
                    <SelectTrigger id="prov-cat"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS_SERVICIO.map(c => (
                        <SelectItem key={c} value={c}>{categoriaLabel(c)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prov-tel">Teléfono</Label>
                  <Input id="prov-tel" placeholder="809-000-0000" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prov-email">Email</Label>
                  <Input id="prov-email" type="email" placeholder="contacto@proveedor.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prov-dir">Dirección</Label>
                <Input id="prov-dir" placeholder="Dirección del proveedor" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={handleGuardar} disabled={saving || !form.nombre.trim()}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editando ? "Guardar cambios" : "Crear proveedor"}
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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar proveedor, categoría o RNC..."
          className="pl-9"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader className="pb-4"><CardTitle className="text-lg">Directorio de Proveedores</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Proveedor</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Categoría</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">RNC</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Contacto</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Estado</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                      <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      No hay proveedores registrados.
                    </td>
                  </tr>
                )}
                {filtrados.map(p => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-primary" />
                        <span className="font-medium">{p.nombre}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground capitalize">{categoriaLabel(p.categoria_servicio)}</td>
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{p.rnc || "—"}</td>
                    <td className="px-6 py-3 text-xs text-muted-foreground">
                      <div>{p.telefono || "—"}</div>
                      {p.email && <div className="truncate max-w-[180px]">{p.email}</div>}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.activo
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-gray-500/15 text-muted-foreground border border-gray-500/30"}`}>
                        {p.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => abrirEditar(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title={p.activo ? "Desactivar" : "Activar"} onClick={() => toggleActivo(p)}>
                          <Power className={`h-3.5 w-3.5 ${p.activo ? "text-destructive" : "text-emerald-500"}`} />
                        </Button>
                      </div>
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

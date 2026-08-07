import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Megaphone, Plus, Loader2, Trash2, Calendar,
  ArrowRight, Search, LayoutGrid, List as ListIcon
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

type Anuncio = {
  id: string
  titulo: string
  contenido: string
  prioridad: string
  created_at: string
  condominio_id: string
}

export default function Anuncios() {
  const { profile } = useAuth()
  const CONDOMINIO_ID = profile?.condominio_id ?? ""

  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [loading, setLoading] = useState(true)
  const [isViewGrid, setIsViewGrid] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Formulario nuevo anuncio
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    titulo: "",
    contenido: "",
    prioridad: "normal"
  })

  async function fetchAnuncios() {
    if (!CONDOMINIO_ID) return
    try {
      setLoading(true)
      const { data, error: err } = await supabase
        .from("anuncios")
        .select("*")
        .eq("condominio_id", CONDOMINIO_ID)
        .order("created_at", { ascending: false })

      if (err) throw err
      setAnuncios(data ?? [])
    } catch (err: unknown) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAnuncios() }, [CONDOMINIO_ID])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!CONDOMINIO_ID || !profile?.id) return

    setSaving(true)
    try {
      const { error: err } = await supabase.from("anuncios").insert([{
        ...form,
        condominio_id: CONDOMINIO_ID,
        creado_por: profile.id
      }])

      if (err) throw err
      setOpen(false)
      setForm({ titulo: "", contenido: "", prioridad: "normal" })
      fetchAnuncios()
    } catch (err: any) {
      alert("Error al crear el comunicado: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteAnuncio(id: string) {
    if (!confirm("¿Estás seguro de eliminar este comunicado?")) return
    try {
      const { error: err } = await supabase.from("anuncios").delete().eq("id", id)
      if (err) throw err
      setAnuncios(anuncios.filter(a => a.id !== id))
    } catch (err: any) {
      alert("Error al eliminar: " + err.message)
    }
  }

  const filteredAnuncios = anuncios.filter(a => 
    a.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.contenido.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const priorityColors: Record<string, string> = {
    baja: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    normal: "bg-green-500/10 text-green-400 border-green-500/20",
    alta: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    critica: "bg-red-500/10 text-red-400 border-red-500/20",
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Comunicados
          </h2>
          <p className="text-muted-foreground mt-2 flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Mantén a los residentes informados con anuncios oficiales.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-secondary/50 p-1 rounded-lg border border-border">
            <Button 
              variant={isViewGrid ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setIsViewGrid(true)}
              className="px-2 h-8"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant={!isViewGrid ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setIsViewGrid(false)}
              className="px-2 h-8"
            >
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4" />
                Nuevo Anuncio
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] border-border bg-card/95 backdrop-blur-xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Crear Comunicado</DialogTitle>
                <CardDescription>Completa la información para notificar a todos los residentes.</CardDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-5 py-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título del Comunicado</Label>
                  <Input 
                    id="titulo" 
                    required 
                    value={form.titulo} 
                    onChange={e => setForm({...form, titulo: e.target.value})}
                    placeholder="Ej: Mantenimiento de Ascensores"
                    className="bg-secondary/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contenido">Mensaje</Label>
                  <Textarea 
                    id="contenido" 
                    required 
                    rows={5}
                    value={form.contenido} 
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({...form, contenido: e.target.value})}
                    placeholder="Escribe el detalle del comunicado aquí..."
                    className="bg-secondary/30 resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prioridad</Label>
                  <Select value={form.prioridad} onValueChange={v => setForm({...form, prioridad: v})}>
                    <SelectTrigger className="bg-secondary/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baja">Baja</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={saving} className="min-w-[120px]">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Megaphone className="h-4 w-4 mr-2" />}
                    Publicar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar comunicados..." 
          className="pl-10 bg-secondary/30 border-border"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Obteniendo comunicados...</p>
        </div>
      ) : filteredAnuncios.length === 0 ? (
        <div className="text-center py-20 bg-secondary/10 rounded-3xl border border-dashed border-border">
          <Megaphone className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-medium">No se encontraron anuncios</h3>
          <p className="text-muted-foreground mt-2">Los comunicados que publiques aparecerán aquí.</p>
        </div>
      ) : (
        <div className={isViewGrid ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
          {filteredAnuncios.map((a) => (
            <Card key={a.id} className="group relative overflow-hidden border-border bg-card/40 hover:bg-card/60 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5">
              <div className={`absolute top-0 left-0 w-1 h-full ${
                a.prioridad === 'critica' ? 'bg-red-500' : 
                a.prioridad === 'alta' ? 'bg-orange-500' : 'bg-primary'
              }`} />
              
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full border ${priorityColors[a.prioridad]}`}>
                    {a.prioridad}
                  </span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="text-xs">{format(new Date(a.created_at), "dd MMM, yyyy", { locale: es })}</span>
                  </div>
                </div>
                <CardTitle className="mt-4 line-clamp-1 group-hover:text-primary transition-colors">
                  {a.titulo}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                  {a.contenido}
                </p>
                
                <div className="pt-4 flex items-center justify-between">
                  <Button variant="ghost" size="sm" className="px-0 hover:bg-transparent group-hover:text-primary gap-2 text-xs">
                    Ver detalles <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteAnuncio(a.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

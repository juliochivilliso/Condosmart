import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Building2, Plus, Users, UserPlus, Loader2, AlertCircle, MapPin } from "lucide-react"

type Condominio = {
  id: string
  nombre: string
  direccion: string | null
  ciudad: string | null
  cantidad_unidades: number
  plan_suscripcion: string
  activo: boolean
}

const SEED_RESIDENCIALES: Condominio[] = [
  { id: "1", nombre: "Residencial Torres del Este", ciudad: "Santo Domingo", direccion: "Av. España #45", cantidad_unidades: 24, plan_suscripcion: "pro", activo: true },
  { id: "2", nombre: "Torre Mirador Norte",         ciudad: "Santiago",      direccion: "Calle 10 #12",    cantidad_unidades: 48, plan_suscripcion: "enterprise", activo: true },
  { id: "3", nombre: "Residencias La Colina",       ciudad: "Santo Domingo", direccion: "Altos de Arroyo", cantidad_unidades: 16, plan_suscripcion: "lite", activo: true },
]

export default function Residenciales() {
  const [residenciales, setResidenciales] = useState<Condominio[]>([])
  const [counts, setCounts] = useState({ activos: 0, unidades: 0, admins: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // States para Nuevo Residencial
  const [openNew, setOpenNew] = useState(false)
  const [savingNew, setSavingNew] = useState(false)
  const [newNombre, setNewNombre] = useState("")
  const [newDireccion, setNewDireccion] = useState("")
  const [newCiudad, setNewCiudad] = useState("")
  const [newUnidades, setNewUnidades] = useState("0")
  const [newPlan, setNewPlan] = useState("lite")

  // States para Asignar Admin
  const [openAdmin, setOpenAdmin] = useState(false)
  const [savingAdmin, setSavingAdmin] = useState(false)
  const [selectedCondo, setSelectedCondo] = useState<Condominio | null>(null)
  const [adminEmail, setAdminEmail] = useState("")
  const [adminNombre, setAdminNombre] = useState("")
  const [adminTel, setAdminTel] = useState("")

  async function fetchData() {
    try {
      setLoading(true)
      
      // 1. Fetch Condominios
      const { data: condos, error: cErr } = await supabase
        .from('condominios')
        .select('*')
        .order('nombre')
      
      if (cErr) throw cErr

      // 2. Fetch Admin Count
      const { count: adminCount } = await supabase
        .from('usuarios')
        .select('*', { count: 'exact', head: true })
        .eq('rol', 'admin_condominio')

      if (!condos || condos.length === 0) {
        setResidenciales(SEED_RESIDENCIALES)
        setCounts({
          activos: SEED_RESIDENCIALES.filter(c => c.activo).length,
          unidades: SEED_RESIDENCIALES.reduce((acc, c) => acc + c.cantidad_unidades, 0),
          admins: 5 // Mock
        })
        setError("Usando datos de demostración.")
      } else {
        setResidenciales(condos)
        setCounts({
          activos: condos.filter(c => c.activo).length,
          unidades: condos.reduce((acc, c) => acc + (c.cantidad_unidades || 0), 0),
          admins: adminCount || 0
        })
        setError(null)
      }
    } catch (err) {
      console.error(err)
      setResidenciales(SEED_RESIDENCIALES)
      setError("Error al cargar datos. Usando demostración.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  async function handleCreateCondo() {
    if (!newNombre) return
    setSavingNew(true)
    try {
      const { error } = await supabase.from('condominios').insert({
        nombre: newNombre,
        direccion: newDireccion,
        ciudad: newCiudad,
        cantidad_unidades: parseInt(newUnidades),
        plan_suscripcion: newPlan,
        activo: true
      })
      if (error) throw error
      setOpenNew(false)
      fetchData()
    } catch (err) {
      console.error(err)
      alert("Error al crear residencial")
    } finally {
      setSavingNew(false)
    }
  }

  async function handleAssignAdmin() {
    if (!adminEmail || !adminNombre || !selectedCondo) return
    setSavingAdmin(true)
    try {
      // Nota: La creación de usuario auth requiere service_role key o Edge Function.
      // Aquí implementamos el insert en la tabla usuarios.
      const { error } = await supabase.from('usuarios').insert({
        id: crypto.randomUUID(), // Mock ID si no se crea vía Auth Admin API
        email: adminEmail,
        nombre_completo: adminNombre,
        telefono: adminTel,
        rol: 'admin_condominio',
        condominio_id: selectedCondo.id,
        activo: true
      })
      if (error) throw error
      setOpenAdmin(false)
      alert("Administrador asignado correctamente (Perfil creado)")
      fetchData()
    } catch (err) {
      console.error(err)
      alert("Error al asignar administrador")
    } finally {
      setSavingAdmin(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Residenciales</h2>
          <p className="text-muted-foreground mt-1">Panel de control de la plataforma SaaS</p>
        </div>
        
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Nuevo Residencial</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Registrar Residencial</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="c-name">Nombre *</Label>
                <Input id="c-name" value={newNombre} onChange={e => setNewNombre(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="c-ciudad">Ciudad</Label>
                  <Input id="c-ciudad" value={newCiudad} onChange={e => setNewCiudad(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-unidades">Unidades</Label>
                  <Input id="c-unidades" type="number" value={newUnidades} onChange={e => setNewUnidades(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-dir">Dirección</Label>
                <Input id="c-dir" value={newDireccion} onChange={e => setNewDireccion(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-plan">Plan</Label>
                <select id="c-plan" value={newPlan} onChange={e => setNewPlan(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="lite">Lite</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateCondo} disabled={savingNew || !newNombre}>
                {savingNew ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Guardar Residencial
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

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Residenciales Activos</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.activos}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Unidades Totales</CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.unidades}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <UserPlus className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.admins}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Cartera de Residenciales</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Nombre</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Ciudad</th>
                  <th className="text-center px-6 py-3 font-medium text-muted-foreground">Unidades</th>
                  <th className="text-center px-6 py-3 font-medium text-muted-foreground">Plan</th>
                  <th className="text-center px-6 py-3 font-medium text-muted-foreground">Estado</th>
                  <th className="text-right px-6 py-3 font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {residenciales.map(c => (
                  <tr key={c.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3 font-medium">{c.nombre}</td>
                    <td className="px-6 py-3 text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {c.ciudad || "—"}
                    </td>
                    <td className="px-6 py-3 text-center font-mono">{c.cantidad_unidades}</td>
                    <td className="px-6 py-3 text-center">
                      <span className="uppercase text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                        {c.plan_suscripcion}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`h-2 w-2 inline-block rounded-full mr-2 ${c.activo ? "bg-green-500" : "bg-red-500"}`} />
                      {c.activo ? "Activo" : "Inactivo"}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => { setSelectedCondo(c); setOpenAdmin(true); }}>
                        Asignar Admin
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={openAdmin} onOpenChange={setOpenAdmin}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Administrador</DialogTitle>
            <p className="text-sm text-muted-foreground">Para: {selectedCondo?.nombre}</p>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="a-email">Email del Admin *</Label>
              <Input id="a-email" type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="a-name">Nombre Completo *</Label>
              <Input id="a-name" value={adminNombre} onChange={e => setAdminNombre(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="a-tel">Teléfono</Label>
              <Input id="a-tel" value={adminTel} onChange={e => setAdminTel(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAssignAdmin} disabled={savingAdmin || !adminEmail || !adminNombre}>
              {savingAdmin ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar Asignación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

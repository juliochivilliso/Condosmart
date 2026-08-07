import { useEffect, useState } from "react"
import { supabase, supabaseAdmin } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Plus, Loader2, AlertCircle, UserCog, Users, ShieldCheck, Home, KeyRound, Mail } from "lucide-react"

type Usuario = {
  id: string
  email: string
  nombre_completo: string
  telefono: string | null
  rol: string
  condominio_id: string | null
  condominio_nombre?: string | null
  activo: boolean
}

type Condominio = { id: string; nombre: string }

const ROLES = ["super_admin", "admin_condominio", "inquilino", "tecnico"] as const

const rolBadge: Record<string, string> = {
  super_admin:      "bg-purple-500/20 text-purple-400 border border-purple-500/30",
  admin_condominio: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  inquilino:        "bg-green-500/20 text-green-400 border border-green-500/30",
  tecnico:          "bg-orange-500/20 text-orange-400 border border-orange-500/30",
}

const SEED_USUARIOS: Usuario[] = [
  { id: "a0000001-0000-0000-0000-000000000001", email: "superadmin@condosmart.do", nombre_completo: "Super Administrador", telefono: "809-500-0001", rol: "super_admin",      condominio_id: null, condominio_nombre: null, activo: true },
  { id: "a0000002-0000-0000-0000-000000000001", email: "admin@laspalmas.do",        nombre_completo: "Administrador Las Palmas", telefono: "809-500-0002", rol: "admin_condominio", condominio_id: "a1b2c3d4-0000-0000-0000-000000000001", condominio_nombre: "Residencial Las Palmas", activo: true },
  { id: "a0000003-0000-0000-0000-000000000001", email: "maria@laspalmas.do",        nombre_completo: "María González",          telefono: "809-555-0101", rol: "inquilino",        condominio_id: "a1b2c3d4-0000-0000-0000-000000000001", condominio_nombre: "Residencial Las Palmas", activo: true },
]

export default function Usuarios() {
  const { profile: _profile } = useAuth()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [condominios, setCondominios] = useState<Condominio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtroRol, setFiltroRol] = useState<string>("todos")
  const [filtroEstado, setFiltroEstado] = useState<string>("activos")

  // Form state
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [saving, setSaving] = useState(false)
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [nuevaPassword, setNuevaPassword] = useState("")
  const [telefono, setTelefono] = useState("")
  const [rol, setRol] = useState<string>("inquilino")
  const [condominioId, setCondominioId] = useState<string>("")
  const [resetingId, setResetingId] = useState<string | null>(null)

  async function fetchData() {
    try {
      setLoading(true)
      const [{ data: uData, error: uErr }, { data: cData }] = await Promise.all([
        supabase
          .from("usuarios")
          .select("id, email, nombre_completo, telefono, rol, condominio_id, activo, condominios(nombre)")
          .order("nombre_completo"),
        supabase.from("condominios").select("id, nombre").eq("activo", true),
      ])

      if (uErr) throw uErr

      if (!uData || uData.length === 0) {
        setUsuarios(SEED_USUARIOS)
        setError("Usando datos de demostración.")
      } else {
        setUsuarios(uData.map((u: any) => ({
          ...u,
          condominio_nombre: u.condominios?.nombre ?? null,
        })))
      }
      setCondominios(cData ?? [])
    } catch {
      setUsuarios(SEED_USUARIOS)
      setError("Usando datos de demostración.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  function resetForm() {
    setNombre(""); setEmail(""); setPassword(""); setNuevaPassword(""); setTelefono("")
    setRol("inquilino"); setCondominioId(""); setEditando(null)
  }

  function abrirEditar(u: Usuario) {
    setEditando(u)
    setNombre(u.nombre_completo)
    setEmail(u.email)
    setTelefono(u.telefono ?? "")
    setRol(u.rol)
    setCondominioId(u.condominio_id ?? "")
    setOpen(true)
  }

  async function enviarResetPassword(u: Usuario) {
    setResetingId(u.id)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(u.email, {
        redirectTo: `${window.location.origin}/login`,
      })
      if (error) throw error
      alert(`Email de reseteo enviado a ${u.email}`)
    } catch (e: any) {
      alert(e.message ?? "Error al enviar el email")
    } finally {
      setResetingId(null)
    }
  }

  async function guardar() {
    if (!nombre.trim() || !email.trim()) return
    if (!editando && !password.trim()) return
    setSaving(true)
    try {
      if (editando) {
        const { error } = await supabase
          .from("usuarios")
          .update({
            nombre_completo: nombre.trim(),
            telefono: telefono.trim() || null,
            rol,
            condominio_id: condominioId || null,
          })
          .eq("id", editando.id)
        if (error) throw error

        if (nuevaPassword.trim()) {
          if (!supabaseAdmin) {
            throw new Error("La Service Role Key no está configurada en el .env para cambiar contraseñas directamente.")
          }
          const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(editando.id, {
            password: nuevaPassword.trim(),
          })
          if (pwErr) throw pwErr
        }
      } else {
        // Crear auth user + perfil
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        })
        if (authErr) throw authErr
        const uid = authData.user?.id
        if (!uid) throw new Error("No se obtuvo UID del usuario")
        const { error: profileErr } = await supabase.from("usuarios").insert({
          id: uid,
          email: email.trim(),
          nombre_completo: nombre.trim(),
          telefono: telefono.trim() || null,
          rol,
          condominio_id: condominioId || null,
          activo: true,
        })
        if (profileErr) throw profileErr
      }
      setOpen(false); resetForm(); await fetchData()
    } catch (e: any) {
      alert(e.message ?? "Error al guardar usuario")
    } finally {
      setSaving(false)
    }
  }

  async function toggleActivo(u: Usuario) {
    const { error } = await supabase
      .from("usuarios")
      .update({ activo: !u.activo })
      .eq("id", u.id)
    if (!error) await fetchData()
  }

  const filtrados = usuarios.filter(u => {
    const matchRol = filtroRol === "todos" || u.rol === filtroRol
    const matchEstado = filtroEstado === "todos" || (filtroEstado === "activos" ? u.activo : !u.activo)
    return matchRol && matchEstado
  })

  const totalAdmins    = usuarios.filter(u => u.rol === "admin_condominio").length
  const totalInquilinos = usuarios.filter(u => u.rol === "inquilino").length
  const totalActivos   = usuarios.filter(u => u.activo).length

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="ml-3 text-muted-foreground">Cargando usuarios...</span>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">Usuarios</h2>
          <p className="text-muted-foreground mt-1">Gestión de accesos a la plataforma</p>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm() }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Nuevo Usuario</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editando ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Nombre completo *</Label>
                <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Juan Pérez" />
              </div>
              {!editando && (
                <>
                  <div className="grid gap-2">
                    <Label>Email *</Label>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@email.com" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Contraseña temporal *</Label>
                    <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                  </div>
                </>
              )}
              {editando && (
                <div className="grid gap-2">
                  <Label className="flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5" />
                    Nueva contraseña <span className="text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  <Input
                    type="password"
                    value={nuevaPassword}
                    onChange={e => setNuevaPassword(e.target.value)}
                    placeholder="Dejar vacío para no cambiar"
                  />
                  <p className="text-xs text-muted-foreground">Requiere Service Role Key configurada en el .env</p>
                </div>
              )}
              <div className="grid gap-2">
                <Label>Teléfono</Label>
                <Input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="809-555-0000" />
              </div>
              <div className="grid gap-2">
                <Label>Rol *</Label>
                <Select value={rol} onValueChange={setRol}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {rol !== "super_admin" && (
                <div className="grid gap-2">
                  <Label>Residencial</Label>
                  <Select value={condominioId} onValueChange={setCondominioId}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar residencial" /></SelectTrigger>
                    <SelectContent>
                      {condominios.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setOpen(false); resetForm() }}>Cancelar</Button>
              <Button onClick={guardar} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editando ? "Guardar cambios" : "Crear usuario"}
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

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{usuarios.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Administradores</CardTitle>
            <ShieldCheck className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-400">{totalAdmins}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inquilinos</CardTitle>
            <Home className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-400">{totalInquilinos}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Activos</CardTitle>
            <UserCog className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">{totalActivos}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <CardTitle className="text-lg">Directorio de Usuarios</CardTitle>
            <div className="flex gap-2 ml-auto">
              <Select value={filtroRol} onValueChange={setFiltroRol}>
                <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los roles</SelectItem>
                  {ROLES.map(r => <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activos">Activos</SelectItem>
                  <SelectItem value="inactivos">Inactivos</SelectItem>
                  <SelectItem value="todos">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Nombre</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Email</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Rol</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Residencial</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Estado</th>
                  <th className="text-right px-6 py-3 text-muted-foreground font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(u => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-3 font-medium">{u.nombre_completo}</td>
                    <td className="px-6 py-3 text-muted-foreground text-xs">{u.email}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${rolBadge[u.rol] ?? "bg-secondary"}`}>
                        {u.rol.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground text-xs">{u.condominio_nombre ?? "—"}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.activo ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-secondary text-muted-foreground"}`}>
                        {u.activo ? "activo" : "inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => abrirEditar(u)}>
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                          onClick={() => enviarResetPassword(u)}
                          disabled={resetingId === u.id}
                          title="Enviar email de reseteo de contraseña"
                        >
                          {resetingId === u.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Mail className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className={`h-7 text-xs ${u.activo ? "text-red-400 border-red-500/30 hover:bg-red-500/10" : "text-green-400 border-green-500/30 hover:bg-green-500/10"}`}
                          onClick={() => toggleActivo(u)}
                        >
                          {u.activo ? "Desactivar" : "Activar"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-sm">
                      No hay usuarios que coincidan con los filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

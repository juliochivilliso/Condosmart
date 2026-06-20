import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { UserPlus, Loader2, AlertCircle, Users, Pencil, Trash2, Upload, FileUp, CheckCircle2, XCircle } from "lucide-react"
import Papa from "papaparse"

type Inquilino = {
  id: string
  nombre_completo: string
  email: string
  telefono: string | null
  unidades?: { numero_apartamento: string; bloque: string | null } | null
}

type Unidad = { id: string; numero_apartamento: string; bloque: string | null }

type CsvRow = {
  nombre_completo: string
  email: string
  telefono?: string
  numero_apartamento?: string
}

type ImportResult = {
  importados: number
  saltados: number
  errores: number
  detalle: string[]
}

const SEED: Inquilino[] = [
  { id: "1", nombre_completo: "María González",  email: "maria.gonzalez@email.com",  telefono: "809-555-0101", unidades: { numero_apartamento: "101", bloque: "A" } },
  { id: "2", nombre_completo: "Carlos Ramírez",  email: "carlos.ramirez@email.com",  telefono: "809-555-0202", unidades: { numero_apartamento: "102", bloque: "A" } },
  { id: "3", nombre_completo: "Ana Martínez",    email: "ana.martinez@email.com",    telefono: "809-555-0303", unidades: { numero_apartamento: "203", bloque: "B" } },
  { id: "4", nombre_completo: "Luis Pérez",      email: "luis.perez@email.com",      telefono: "809-555-0404", unidades: null },
  { id: "5", nombre_completo: "Carmen Jiménez",  email: "carmen.jimenez@email.com",  telefono: "829-555-0505", unidades: { numero_apartamento: "305", bloque: "C" } },
]

export default function Inquilinos() {
  const { profile } = useAuth()
  const CONDOMINIO_ID = profile?.condominio_id ?? ''
  const [inquilinos, setInquilinos] = useState<Inquilino[]>([])
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [unidadIdSeleccionada, setUnidadIdSeleccionada] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [telefono, setTelefono] = useState("")
  const [editando, setEditando] = useState<Inquilino | null>(null)

  // CSV import state
  const [csvOpen, setCsvOpen] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<CsvRow[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)

  async function fetchInquilinos() {
    if (!CONDOMINIO_ID) {
      setInquilinos(SEED)
      if (profile?.rol !== 'super_admin') {
        setError("Sin condominio asignado — mostrando datos de demostración.")
      }
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const { data: users, error: usrErr } = await supabase
        .from("usuarios")
        .select("id, nombre_completo, email, telefono, unidad_id")
        .eq("rol", "inquilino")
        .eq("condominio_id", CONDOMINIO_ID)
        .order("nombre_completo")
      if (usrErr) throw usrErr
      if (!users || users.length === 0) { setInquilinos(SEED); setError("Usando datos de demostración."); return }

      // Fetch unidades para mapear
      const unidadIds = users.map(u => u.unidad_id).filter(Boolean)
      let unidadesMap: Record<string, { numero_apartamento: string; bloque: string | null }> = {}
      if (unidadIds.length > 0) {
        const { data: unidades } = await supabase
          .from("unidades")
          .select("id, numero_apartamento, bloque")
          .in("id", unidadIds)
        if (unidades) {
          unidadesMap = Object.fromEntries(unidades.map(u => [u.id, { numero_apartamento: u.numero_apartamento, bloque: u.bloque }]))
        }
      }

      setInquilinos(users.map(u => ({
        id: u.id,
        nombre_completo: u.nombre_completo,
        email: u.email,
        telefono: u.telefono,
        unidades: u.unidad_id ? (unidadesMap[u.unidad_id] || null) : null,
      })))
    } catch (err) {
      console.error("fetchInquilinos error:", err)
      setInquilinos(SEED); setError("Usando datos de demostración.")
    } finally { setLoading(false) }
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
    fetchInquilinos()
    fetchUnidades()
  }, [CONDOMINIO_ID])

  async function handleGuardar() {
    if (!nombre.trim() || !email.trim()) return
    setSaving(true)
    setError(null)
    try {
      if (editando) {
        const { error: err } = await supabase
          .from("usuarios")
          .update({
            nombre_completo: nombre.trim(),
            email: email.trim(),
            telefono: telefono.trim() || null,
            unidad_id: unidadIdSeleccionada || null,
          })
          .eq("id", editando.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from("usuarios").insert({
          id: crypto.randomUUID(),
          nombre_completo: nombre.trim(),
          email: email.trim(),
          telefono: telefono.trim() || null,
          rol: "inquilino",
          condominio_id: CONDOMINIO_ID,
          unidad_id: unidadIdSeleccionada || null,
        })
        if (err) throw err
      }
      setOpen(false)
      resetForm()
      await fetchInquilinos()
    } catch (err: any) {
      console.error(err)
      setError(err?.message || "Ocurrió un error al guardar el inquilino.")
    } finally {
      setSaving(false)
    }
  }

  async function handleEliminar(id: string) {
    if (!confirm("¿Está seguro de que desea eliminar este inquilino?")) return
    try {
      const { error: err } = await supabase
        .from("usuarios")
        .delete()
        .eq("id", id)
      if (err) throw err
      await fetchInquilinos()
    } catch (err: any) {
      console.error(err)
      setError(err?.message || "Ocurrió un error al eliminar el inquilino.")
    }
  }

  function handleEditar(inquilino: Inquilino) {
    setEditando(inquilino)
    setNombre(inquilino.nombre_completo)
    setEmail(inquilino.email)
    setTelefono(inquilino.telefono || "")

    if (inquilino.unidades) {
      const u = unidades.find(
        x => x.numero_apartamento === inquilino.unidades?.numero_apartamento &&
             x.bloque === inquilino.unidades?.bloque
      )
      if (u) setUnidadIdSeleccionada(u.id)
      else setUnidadIdSeleccionada("")
    } else {
      setUnidadIdSeleccionada("")
    }
    setOpen(true)
  }

  function resetForm() {
    setNombre("")
    setEmail("")
    setTelefono("")
    setEditando(null)
    if (unidades.length > 0) setUnidadIdSeleccionada(unidades[0].id)
    else setUnidadIdSeleccionada("")
  }

  function handleCsvFile(file: File) {
    setCsvFile(file)
    setImportResult(null)
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvPreview(results.data.slice(0, 5))
      },
    })
  }

  async function handleImportar() {
    if (!csvFile || !CONDOMINIO_ID) return
    setImporting(true)
    setImportResult(null)

    Papa.parse<CsvRow>(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const filas = results.data
        let importados = 0
        let saltados = 0
        let errores = 0
        const detalle: string[] = []

        try {
          // 1. Obtener emails existentes en el condominio
          const { data: existentes } = await supabase
            .from("usuarios")
            .select("email")
            .eq("condominio_id", CONDOMINIO_ID)
          const emailsExistentes = new Set((existentes ?? []).map((u: any) => u.email.toLowerCase()))

          // 2. Obtener unidades del condominio para mapear numero_apartamento → unidad_id
          const { data: unidadesData } = await supabase
            .from("unidades")
            .select("id, numero_apartamento")
            .eq("condominio_id", CONDOMINIO_ID)
          const unidadesMap: Record<string, string> = {}
          for (const u of (unidadesData ?? [])) {
            unidadesMap[u.numero_apartamento] = u.id
          }

          // 3. Procesar filas
          for (const fila of filas) {
            const nombre = fila.nombre_completo?.trim()
            const email  = fila.email?.trim().toLowerCase()

            if (!nombre || !email) {
              errores++
              detalle.push(`Fila inválida (faltan nombre o email): "${fila.nombre_completo}" / "${fila.email}"`)
              continue
            }

            if (emailsExistentes.has(email)) {
              saltados++
              detalle.push(`Saltado (duplicado): ${email}`)
              continue
            }

            const unidad_id = fila.numero_apartamento?.trim()
              ? unidadesMap[fila.numero_apartamento.trim()] ?? null
              : null

            const { error: insErr } = await supabase.from("usuarios").insert({
              id:              crypto.randomUUID(),
              nombre_completo: nombre,
              email:           email,
              telefono:        fila.telefono?.trim() || null,
              rol:             "inquilino",
              condominio_id:   CONDOMINIO_ID,
              unidad_id,
            })

            if (insErr) {
              errores++
              detalle.push(`Error al insertar ${email}: ${insErr.message}`)
            } else {
              importados++
              emailsExistentes.add(email)
            }
          }
        } catch (err: any) {
          detalle.push(`Error general: ${err.message}`)
        }

        setImportResult({ importados, saltados, errores, detalle })
        setImporting(false)
        if (importados > 0) {
          await fetchInquilinos()
        }
      },
    })
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="ml-3 text-muted-foreground">Cargando inquilinos...</span>
    </div>
  )

  if (!CONDOMINIO_ID && profile?.rol === 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Users className="h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-xl font-medium text-muted-foreground">Selecciona un residencial para ver los datos.</h2>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inquilinos</h2>
          <p className="text-muted-foreground mt-1">{inquilinos.length} residentes registrados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => { setCsvOpen(true); setCsvFile(null); setCsvPreview([]); setImportResult(null) }}>
            <FileUp className="h-4 w-4" />Importar CSV
          </Button>
          <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><UserPlus className="h-4 w-4" />Agregar Inquilino</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>{editando ? "Editar Inquilino" : "Nuevo Inquilino"}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="inq-nombre">Nombre Completo *</Label>
                  <Input id="inq-nombre" placeholder="Ej. María González" value={nombre} onChange={e => setNombre(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inq-email">Correo Electrónico *</Label>
                  <Input id="inq-email" type="email" placeholder="maria@email.com" value={email} onChange={e => setEmail(e.target.value)} disabled={!!editando} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inq-tel">Teléfono</Label>
                  <Input id="inq-tel" placeholder="809-555-0000" value={telefono} onChange={e => setTelefono(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inq-unidad">Unidad / Apartamento</Label>
                  <select id="inq-unidad" value={unidadIdSeleccionada} onChange={e => setUnidadIdSeleccionada(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="">Sin asignar</option>
                    {unidades.map(u => (
                      <option key={u.id} value={u.id}>
                        Apt {u.numero_apartamento} {u.bloque ? `· Bl. ${u.bloque}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }} disabled={saving}>Cancelar</Button>
                <Button onClick={handleGuardar} disabled={saving || !nombre || !email}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-md px-4 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-4">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Listado de Residentes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Nombre</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Correo</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Teléfono</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">Unidad</th>
                  <th className="text-right px-6 py-3 text-muted-foreground font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {inquilinos.map(i => (
                  <tr key={i.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-3 font-medium">{i.nombre_completo}</td>
                    <td className="px-6 py-3 text-muted-foreground">{i.email}</td>
                    <td className="px-6 py-3 text-muted-foreground">{i.telefono || "—"}</td>
                    <td className="px-6 py-3">
                      {i.unidades
                        ? <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">Bloque {i.unidades.bloque} · #{i.unidades.numero_apartamento}</span>
                        : <span className="text-muted-foreground text-xs">Sin asignar</span>
                      }
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleEditar(i)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => handleEliminar(i.id)}>
                          <Trash2 className="h-4 w-4" />
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

      {/* Dialog: Importar CSV */}
      <Dialog open={csvOpen} onOpenChange={v => { if (!v) { setCsvOpen(false); setCsvFile(null); setCsvPreview([]); setImportResult(null) } }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar Inquilinos desde CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Zona de selección de archivo */}
            <div
              className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer bg-secondary/10 hover:bg-secondary/20 transition-all"
              onClick={() => csvInputRef.current?.click()}
            >
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleCsvFile(f) }}
              />
              {csvFile ? (
                <div className="flex flex-col items-center">
                  <Upload className="h-10 w-10 text-primary mb-1" />
                  <p className="text-sm font-semibold text-primary">{csvFile.name}</p>
                  <p className="text-xs text-muted-foreground">Clic para cambiar archivo</p>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Clic para seleccionar un archivo .csv</p>
                  <p className="text-xs text-muted-foreground/60">
                    Columnas: nombre_completo, email, telefono (opcional), numero_apartamento (opcional)
                  </p>
                </>
              )}
            </div>

            {/* Preview de primeras 5 filas */}
            {csvPreview.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Vista previa (primeras {csvPreview.length} filas):</p>
                <div className="overflow-x-auto border border-border rounded-md">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        <th className="text-left px-3 py-2 text-muted-foreground">Nombre</th>
                        <th className="text-left px-3 py-2 text-muted-foreground">Email</th>
                        <th className="text-left px-3 py-2 text-muted-foreground">Teléfono</th>
                        <th className="text-left px-3 py-2 text-muted-foreground">Apt.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.map((row, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="px-3 py-1.5">{row.nombre_completo || "—"}</td>
                          <td className="px-3 py-1.5">{row.email || "—"}</td>
                          <td className="px-3 py-1.5">{row.telefono || "—"}</td>
                          <td className="px-3 py-1.5">{row.numero_apartamento || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Resultado de la importación */}
            {importResult && (
              <div className="space-y-2">
                <div className="flex gap-3 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-md px-3 py-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />{importResult.importados} importados
                  </span>
                  <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-md px-3 py-1.5">
                    {importResult.saltados} saltados (duplicados)
                  </span>
                  {importResult.errores > 0 && (
                    <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-1.5">
                      <XCircle className="h-3.5 w-3.5" />{importResult.errores} errores
                    </span>
                  )}
                </div>
                {importResult.detalle.length > 0 && (
                  <div className="max-h-32 overflow-y-auto bg-secondary/20 rounded-md p-2 text-xs text-muted-foreground space-y-0.5">
                    {importResult.detalle.map((d, i) => <p key={i}>{d}</p>)}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCsvOpen(false)}>Cerrar</Button>
            <Button
              onClick={handleImportar}
              disabled={!csvFile || importing}
              className="gap-2"
            >
              {importing && <Loader2 className="h-4 w-4 animate-spin" />}
              Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

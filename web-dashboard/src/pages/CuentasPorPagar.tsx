import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  FileText, Plus, Loader2, AlertCircle, ReceiptText, Banknote, Clock, CheckCircle2, Upload
} from "lucide-react"

type Proveedor = { id: string; nombre: string }
type Cuenta = {
  id: string
  proveedor_id: string
  numero_factura: string | null
  descripcion: string | null
  categoria_gasto: string
  monto: number
  saldo_pendiente: number
  estado: string
  fecha_emision: string
  fecha_vencimiento: string
  fecha_pago: string | null
  metodo_pago: string | null
  referencia_pago: string | null
  comprobante_url: string | null
  notas: string | null
  proveedores?: { nombre: string } | null
}

const CATEGORIAS_GASTO = [
  "servicios", "mantenimiento", "reparaciones", "nomina", "seguros",
  "impuestos", "suministros", "jardineria", "seguridad", "otro",
]

const ESTADO_CONFIG: Record<string, { label: string; className: string }> = {
  pendiente:     { label: "Pendiente",     className: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30" },
  pagado_parcial:{ label: "Pago Parcial",  className: "bg-blue-500/15 text-blue-400 border border-blue-500/30" },
  pagado:        { label: "Pagado",        className: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
  vencido:       { label: "Vencido",       className: "bg-red-500/15 text-red-400 border border-red-500/30" },
  cancelado:     { label: "Cancelado",     className: "bg-gray-500/15 text-muted-foreground border border-gray-500/30" },
}

const catLabel = (c: string) => c.charAt(0).toUpperCase() + c.slice(1)
const formatRD = (n: number) => `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`

export default function CuentasPorPagar() {
  const { profile } = useAuth()
  const CONDOMINIO_ID = profile?.condominio_id ?? ""

  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState("pendientes")

  // Dialog nueva factura
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    proveedor_id: "", numero_factura: "", descripcion: "", categoria_gasto: "servicios",
    monto: "", fecha_emision: new Date().toISOString().split("T")[0],
    fecha_vencimiento: "", notas: "",
  })
  const [archivo, setArchivo] = useState<File | null>(null)

  // Dialog registrar pago
  const [pagoCuenta, setPagoCuenta] = useState<Cuenta | null>(null)
  const [montoPago, setMontoPago] = useState("")
  const [metodoPago, setMetodoPago] = useState("transferencia")
  const [referencia, setReferencia] = useState("")
  const [pagoArchivo, setPagoArchivo] = useState<File | null>(null)

  async function fetchData() {
    if (!CONDOMINIO_ID) {
      setCuentas([]); setProveedores([]); setLoading(false); return
    }
    try {
      setLoading(true)
      const [cRes, pRes] = await Promise.all([
        supabase.from("cuentas_por_pagar").select("*, proveedores(nombre)").eq("condominio_id", CONDOMINIO_ID).order("fecha_vencimiento"),
        supabase.from("proveedores").select("id, nombre").eq("condominio_id", CONDOMINIO_ID).eq("activo", true).order("nombre"),
      ])
      if (cRes.error) throw cRes.error
      if (pRes.error) throw pRes.error
      setCuentas((cRes.data ?? []) as Cuenta[])
      setProveedores((pRes.data ?? []) as Proveedor[])
      setError(null)
    } catch {
      setCuentas([]); setError("Error al cargar las cuentas por pagar.")
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [CONDOMINIO_ID])

  const filtrar = (estados: string[]) => cuentas.filter(c => estados.includes(c.estado))

  const kpi = useMemo(() => {
    const pendientes = cuentas.filter(c => c.estado === "pendiente" || c.estado === "vencido")
    const porPagar = pendientes.reduce((a, c) => a + Number(c.saldo_pendiente), 0)
    const vencido = cuentas.filter(c => c.estado === "vencido").reduce((a, c) => a + Number(c.saldo_pendiente), 0)
    const mes = new Date().toISOString().slice(0, 7)
    const pagadoMes = cuentas.filter(c => c.fecha_pago?.startsWith(mes)).reduce((a, c) => a + Number(c.monto), 0)
    return { porPagar, vencido, pagadoMes, total: cuentas.length }
  }, [cuentas])

  function resetForm() {
    setForm({
      proveedor_id: proveedores[0]?.id ?? "", numero_factura: "", descripcion: "",
      categoria_gasto: "servicios", monto: "", fecha_emision: new Date().toISOString().split("T")[0],
      fecha_vencimiento: "", notas: "",
    })
    setArchivo(null)
  }

  async function subirArchivo(dir: string, id: string, file: File): Promise<string | null> {
    const ext = file.name.split(".").pop()
    const path = `${CONDOMINIO_ID}/${dir}/${id}.${ext}`
    const { error: upErr } = await supabase.storage.from("comprobantes").upload(path, file, { upsert: true })
    if (upErr) return null
    const { data: urlData } = supabase.storage.from("comprobantes").getPublicUrl(path)
    return urlData.publicUrl
  }

  async function crearFactura() {
    if (!form.proveedor_id || !form.monto || !form.fecha_vencimiento) return
    setSaving(true)
    try {
      const monto = Number(form.monto)
      const nuevoId = crypto.randomUUID()
      let comprobanteUrl: string | null = null
      if (archivo) comprobanteUrl = await subirArchivo("facturas", nuevoId, archivo)

      const { error } = await supabase.from("cuentas_por_pagar").insert({
        id: nuevoId, condominio_id: CONDOMINIO_ID, proveedor_id: form.proveedor_id,
        numero_factura: form.numero_factura.trim() || null,
        descripcion: form.descripcion.trim() || null,
        categoria_gasto: form.categoria_gasto,
        monto, saldo_pendiente: monto, estado: "pendiente",
        fecha_emision: form.fecha_emision, fecha_vencimiento: form.fecha_vencimiento,
        notas: form.notas.trim() || null, comprobante_url: comprobanteUrl,
      })
      if (error) throw error

      await supabase.from("audit_log").insert({
        condominio_id: CONDOMINIO_ID, usuario_id: profile?.id,
        accion: "factura_proveedor_creada",
        descripcion: `Factura ${form.numero_factura || ""} por ${formatRD(monto)} registrada`,
      })
      setOpen(false); resetForm(); await fetchData()
    } catch {
      setError("Error al crear la factura.")
    } finally { setSaving(false) }
  }

  async function registrarPago() {
    if (!pagoCuenta || !montoPago) return
    const monto = Number(montoPago)
    if (monto <= 0 || monto > Number(pagoCuenta.saldo_pendiente)) return
    setSaving(true)
    try {
      let comprobanteUrl: string | null = null
      if (pagoArchivo) comprobanteUrl = await subirArchivo("pagos", `${pagoCuenta.id}-${Date.now()}`, pagoArchivo)

      const nuevoSaldo = Number(pagoCuenta.saldo_pendiente) - monto
      const nuevoEstado = nuevoSaldo <= 0 ? "pagado" : "pagado_parcial"
      const update: Record<string, unknown> = {
        saldo_pendiente: nuevoSaldo, estado: nuevoEstado,
        metodo_pago: metodoPago, referencia_pago: referencia.trim() || null,
        fecha_pago: new Date().toISOString().split("T")[0],
      }
      if (comprobanteUrl) update.comprobante_url = comprobanteUrl

      const { error } = await supabase.from("cuentas_por_pagar").update(update).eq("id", pagoCuenta.id)
      if (error) throw error

      await supabase.from("audit_log").insert({
        condominio_id: CONDOMINIO_ID, usuario_id: profile?.id,
        accion: "pago_proveedor",
        descripcion: `Pago de ${formatRD(monto)} a ${pagoCuenta.proveedores?.nombre || "proveedor"} (${pagoCuenta.numero_factura || "s/f"})`,
      })

      setPagoCuenta(null); setMontoPago(""); setReferencia(""); setPagoArchivo(null)
      await fetchData()
    } catch {
      setError("Error al registrar el pago.")
    } finally { setSaving(false) }
  }

  const tabCuentas: Record<string, Cuenta[]> = {
    pendientes: filtrar(["pendiente", "pagado_parcial"]),
    vencidas: filtrar(["vencido"]),
    pagadas: filtrar(["pagado"]),
    todas: cuentas,
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="ml-3 text-muted-foreground">Cargando cuentas por pagar...</span>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">Cuentas por Pagar</h2>
          <p className="text-muted-foreground mt-1">Egresos y facturas de proveedores</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="gap-2"><Plus className="h-4 w-4" />Registrar Factura</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Registrar Factura de Proveedor</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Proveedor *</Label>
                <Select value={form.proveedor_id} onValueChange={v => setForm({ ...form, proveedor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                  <SelectContent>
                    {proveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
                {proveedores.length === 0 && (
                  <p className="text-xs text-yellow-400">Primero registra un proveedor en la sección Proveedores.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="c-fact">N° Factura</Label>
                  <Input id="c-fact" placeholder="FAC-0001" value={form.numero_factura} onChange={e => setForm({ ...form, numero_factura: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-cat">Categoría</Label>
                  <Select value={form.categoria_gasto} onValueChange={v => setForm({ ...form, categoria_gasto: v })}>
                    <SelectTrigger id="c-cat"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS_GASTO.map(c => <SelectItem key={c} value={c}>{catLabel(c)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-desc">Descripción</Label>
                <Textarea id="c-desc" placeholder="Detalle del servicio o bien" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="c-monto">Monto *</Label>
                  <Input id="c-monto" type="number" min="0" step="0.01" placeholder="0.00" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-emis">Emisión</Label>
                  <Input id="c-emis" type="date" value={form.fecha_emision} onChange={e => setForm({ ...form, fecha_emision: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-venc">Vence *</Label>
                  <Input id="c-venc" type="date" value={form.fecha_vencimiento} onChange={e => setForm({ ...form, fecha_vencimiento: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Archivo adjunto (opcional)</Label>
                <label className="flex items-center justify-center gap-2 border border-dashed border-border rounded-md px-4 py-3 cursor-pointer hover:bg-secondary/30 text-sm text-muted-foreground">
                  <Upload className="h-4 w-4" />
                  {archivo ? archivo.name : "Subir factura / comprobante"}
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => setArchivo(e.target.files?.[0] ?? null)} />
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={crearFactura} disabled={saving || !form.proveedor_id || !form.monto || !form.fecha_vencimiento}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Guardar factura
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Total por Pagar</p>
              <ReceiptText className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold mt-2">{formatRD(kpi.porPagar)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Vencido</p>
              <Clock className="h-4 w-4 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-red-400 mt-2">{formatRD(kpi.vencido)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Pagado este Mes</p>
              <Banknote className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-2">{formatRD(kpi.pagadoMes)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Facturas Registradas</p>
              <FileText className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold mt-2">{kpi.total}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
          <TabsTrigger value="vencidas">Vencidas</TabsTrigger>
          <TabsTrigger value="pagadas">Pagadas</TabsTrigger>
          <TabsTrigger value="todas">Todas</TabsTrigger>
        </TabsList>

        {Object.entries(tabCuentas).map(([key, list]) => (
          <TabsContent key={key} value={key}>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        <th className="text-left px-6 py-3 text-muted-foreground font-medium">Proveedor</th>
                        <th className="text-left px-6 py-3 text-muted-foreground font-medium">Concepto</th>
                        <th className="text-left px-6 py-3 text-muted-foreground font-medium">Categoría</th>
                        <th className="text-right px-6 py-3 text-muted-foreground font-medium">Monto</th>
                        <th className="text-right px-6 py-3 text-muted-foreground font-medium">Saldo</th>
                        <th className="text-left px-6 py-3 text-muted-foreground font-medium">Estado</th>
                        <th className="text-left px-6 py-3 text-muted-foreground font-medium">Vence</th>
                        <th className="text-left px-6 py-3 text-muted-foreground font-medium">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-6 py-10 text-center text-muted-foreground">
                            No hay facturas en esta categoría.
                          </td>
                        </tr>
                      )}
                      {list.map(c => {
                        const est = ESTADO_CONFIG[c.estado] || { label: c.estado, className: "bg-secondary" }
                        return (
                          <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                            <td className="px-6 py-3 font-medium">{c.proveedores?.nombre || "—"}</td>
                            <td className="px-6 py-3 text-muted-foreground max-w-[200px] truncate">
                              {c.numero_factura && <span className="font-mono text-xs mr-2">{c.numero_factura}</span>}
                              {c.descripcion}
                            </td>
                            <td className="px-6 py-3 text-muted-foreground text-xs">{catLabel(c.categoria_gasto)}</td>
                            <td className="px-6 py-3 text-right font-mono text-xs">{formatRD(c.monto)}</td>
                            <td className="px-6 py-3 text-right font-mono text-xs">{formatRD(c.saldo_pendiente)}</td>
                            <td className="px-6 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${est.className}`}>{est.label}</span></td>
                            <td className="px-6 py-3 text-xs text-muted-foreground">{new Date(c.fecha_vencimiento).toLocaleDateString("es-DO")}</td>
                            <td className="px-6 py-3">
                              {(c.estado === "pendiente" || c.estado === "pagado_parcial" || c.estado === "vencido") && (
                                <Button variant="outline" size="sm" className="gap-1 text-xs h-7"
                                  onClick={() => { setPagoCuenta(c); setMontoPago(String(c.saldo_pendiente)); setMetodoPago("transferencia"); setReferencia(""); setPagoArchivo(null) }}>
                                  <CheckCircle2 className="h-3 w-3" />Registrar Pago
                                </Button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Dialog registrar pago */}
      <Dialog open={!!pagoCuenta} onOpenChange={o => { if (!o) setPagoCuenta(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>
          {pagoCuenta && (
            <div className="space-y-4 py-2">
              <div className="rounded-md bg-secondary/40 p-3 text-sm">
                <p className="font-medium">{pagoCuenta.proveedores?.nombre}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Factura {pagoCuenta.numero_factura || "s/f"} · Saldo: <span className="font-mono">{formatRD(pagoCuenta.saldo_pendiente)}</span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pg-monto">Monto a pagar *</Label>
                  <Input id="pg-monto" type="number" min="0" step="0.01" value={montoPago} onChange={e => setMontoPago(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pg-metodo">Método</Label>
                  <Select value={metodoPago} onValueChange={setMetodoPago}>
                    <SelectTrigger id="pg-metodo"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pg-ref">Referencia</Label>
                <Input id="pg-ref" placeholder="N° de transferencia/cheque" value={referencia} onChange={e => setReferencia(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Comprobante (opcional)</Label>
                <label className="flex items-center justify-center gap-2 border border-dashed border-border rounded-md px-4 py-3 cursor-pointer hover:bg-secondary/30 text-sm text-muted-foreground">
                  <Upload className="h-4 w-4" />
                  {pagoArchivo ? pagoArchivo.name : "Subir comprobante"}
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => setPagoArchivo(e.target.files?.[0] ?? null)} />
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPagoCuenta(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={registrarPago} disabled={saving || !montoPago || Number(montoPago) <= 0}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Confirmar pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

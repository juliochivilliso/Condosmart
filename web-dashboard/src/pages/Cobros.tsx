import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DollarSign, Plus, Loader2, AlertCircle, CheckCircle2,
  Clock, Upload, FileText, AlertTriangle, User, ShieldCheck
} from "lucide-react"
import PaymentGateway, { type BancoCuenta } from "@/components/PaymentGateway"

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
const METODOS = ["transferencia","tarjeta","billetera","otro"] as const
const MORA_MENSUAL = 0.05 // 5% mensual

type Transaccion = {
  id: string
  unidad_id: string
  unidad_numero?: string
  monto: number
  concepto: string
  tipo_servicio: string
  estado: string
  metodo_pago: string | null
  referencia_pago: string | null
  comprobante_url: string | null
  fecha_vencimiento: string
  fecha_pago: string | null
  interes_mora: number
  created_at: string
  capture_id?: string | null
}

type Unidad = { id: string; numero_apartamento: string; cuota_mantenimiento: number }

const estadoBadge: Record<string, string> = {
  pagado:    "bg-green-500/20 text-green-400 border border-green-500/30",
  pendiente: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  vencido:   "bg-red-500/20 text-red-400 border border-red-500/30",
  cancelado: "bg-secondary text-muted-foreground",
  pendiente_verificacion: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
}

function mesesVencidos(fechaVenc: string): number {
  const hoy = new Date()
  const venc = new Date(fechaVenc)
  if (hoy <= venc) return 0
  return Math.max(1, Math.ceil((hoy.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24 * 30)))
}

export default function Cobros() {
  const { profile } = useAuth()
  const CONDOMINIO_ID = profile?.condominio_id ?? ""

  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Generar cuotas
  const [genOpen, setGenOpen] = useState(false)
  const [genMes, setGenMes] = useState(String(new Date().getMonth()))
  const [genAnio, setGenAnio] = useState(String(new Date().getFullYear()))
  const [generating, setGenerating] = useState(false)
  const [genMsg, setGenMsg] = useState<string | null>(null)

  // Calcular mora
  const [calculandoMora, setCalculandoMora] = useState(false)

  // Registrar pago
  const [pagoTx, setPagoTx] = useState<Transaccion | null>(null)
  const [useGateway, setUseGateway] = useState(true)
  const [metodo, setMetodo] = useState<string>("transferencia")
  const [referencia, setReferencia] = useState("")
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split("T")[0])
  const [archivo, setArchivo] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Banco cuenta
  const [bancoCuenta, setBancoCuenta] = useState<BancoCuenta | null>(null)

  // Estado de cuenta
  const [cuentaUnidad, setCuentaUnidad] = useState<Transaccion[] | null>(null)
  const [cuentaLabel, setCuentaLabel] = useState("")
  const [loadingCuenta, setLoadingCuenta] = useState(false)

  async function fetchTransacciones() {
    if (!CONDOMINIO_ID) { setLoading(false); return }
    try {
      setLoading(true)
      const { data, error: err } = await supabase
        .from("transacciones")
        .select("id, unidad_id, monto, concepto, tipo_servicio, estado, metodo_pago, referencia_pago, comprobante_url, fecha_vencimiento, fecha_pago, interes_mora, created_at, capture_id, unidades(numero_apartamento)")
        .eq("condominio_id", CONDOMINIO_ID)
        .order("created_at", { ascending: false })
        .limit(200)

      if (err) throw err
      setTransacciones((data ?? []).map((t: any) => ({
        ...t,
        unidad_numero: t.unidades?.numero_apartamento ?? t.unidad_id,
      })))
    } catch {
      setError("No se pudo cargar las transacciones.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTransacciones() }, [CONDOMINIO_ID])

  useEffect(() => {
    async function fetchBanco() {
      if (!CONDOMINIO_ID) return
      const { data } = await supabase
        .from("condominios")
        .select("configuracion_pagos")
        .eq("id", CONDOMINIO_ID)
        .single()
      if (data?.configuracion_pagos?.banco) {
        setBancoCuenta(data.configuracion_pagos as BancoCuenta)
      }
    }
    fetchBanco()
  }, [CONDOMINIO_ID])

  // Helper trigger email
  async function triggerEmailNotification(type: string, tx: Transaccion, capId?: string, compUrl?: string) {
    try {
      const { data: unidadData } = await supabase
        .from("unidades")
        .select("usuario_id, usuarios(email, nombre_completo)")
        .eq("id", tx.unidad_id)
        .single()
        
      const residentEmail = (unidadData as any)?.usuarios?.email
      const residentName = (unidadData as any)?.usuarios?.nombre_completo
      
      if (!residentEmail) return

      console.log(`[Notification Triggered] Type: ${type}, To: ${residentEmail}, Name: ${residentName}`)
      
      await supabase.functions.invoke("send-email", {
        body: {
          type,
          to: residentEmail,
          data: {
            nombre_completo: residentName,
            concepto: tx.concepto,
            monto: tx.monto,
            fecha_vencimiento: tx.fecha_vencimiento,
            capture_id: capId,
            comprobante_url: compUrl,
            condominio_nombre: "Residencial Las Palmas"
          }
        }
      })
    } catch (err) {
      console.log("Could not trigger email notification:", err)
    }
  }

  // ── Generar cuotas ──────────────────────────────────────────────────────────
  async function generarCuotas() {
    if (!CONDOMINIO_ID) return
    setGenerating(true); setGenMsg(null)
    try {
      const mes = parseInt(genMes)
      const anio = parseInt(genAnio)
      const mesLabel = MESES[mes]
      const fechaVenc = `${anio}-${String(mes + 1).padStart(2, "0")}-05`
      const inicioMes = `${anio}-${String(mes + 1).padStart(2, "0")}-01`
      const finMes    = `${anio}-${String(mes + 1).padStart(2, "0")}-28`

      const { data: existentes } = await supabase
        .from("transacciones")
        .select("unidad_id")
        .eq("condominio_id", CONDOMINIO_ID)
        .eq("tipo_servicio", "mantenimiento")
        .gte("fecha_vencimiento", inicioMes)
        .lte("fecha_vencimiento", finMes)

      const conCuota = new Set((existentes ?? []).map((t: any) => t.unidad_id))

      const { data: unidades, error: uErr } = await supabase
        .from("unidades")
        .select("id, numero_apartamento, cuota_mantenimiento")
        .eq("condominio_id", CONDOMINIO_ID)
        .eq("activo", true)

      if (uErr) throw uErr
      const pendientes = (unidades as Unidad[]).filter(u => !conCuota.has(u.id))

      if (pendientes.length === 0) {
        setGenMsg(`Ya existen cuotas para ${mesLabel} ${anio}.`); return
      }

      const nuevas = pendientes.map(u => ({
        condominio_id: CONDOMINIO_ID,
        unidad_id: u.id,
        monto: u.cuota_mantenimiento,
        tipo_servicio: "mantenimiento",
        concepto: `Cuota de mantenimiento ${mesLabel} ${anio}`,
        estado: "pendiente",
        fecha_vencimiento: fechaVenc,
      }))

      const { error: insErr } = await supabase.from("transacciones").insert(nuevas)
      if (insErr) throw insErr

      setGenMsg(`✓ ${pendientes.length} cuota(s) generadas para ${mesLabel} ${anio}.`)
      await fetchTransacciones()
    } catch (e: any) {
      setGenMsg(`Error: ${e.message ?? "No se pudo generar cuotas."}`)
    } finally {
      setGenerating(false)
    }
  }

  // ── Calcular mora ───────────────────────────────────────────────────────────
  async function calcularMora() {
    if (!CONDOMINIO_ID) return
    setCalculandoMora(true)
    try {
      const hoy = new Date().toISOString().split("T")[0]

      // Marcar como vencidas las pendientes que ya pasaron la fecha
      const vencibles = transacciones.filter(
        t => t.estado === "pendiente" && t.fecha_vencimiento < hoy
      )

      for (const t of vencibles) {
        const meses = mesesVencidos(t.fecha_vencimiento)
        const mora  = Number((Number(t.monto) * MORA_MENSUAL * meses).toFixed(2))
        await supabase
          .from("transacciones")
          .update({ estado: "vencido", interes_mora: mora, updated_at: new Date().toISOString() })
          .eq("id", t.id)
      }

      // Recalcular mora en las ya vencidas (por si pasó más tiempo)
      const yaVencidas = transacciones.filter(t => t.estado === "vencido")
      for (const t of yaVencidas) {
        const meses = mesesVencidos(t.fecha_vencimiento)
        const mora  = Number((Number(t.monto) * MORA_MENSUAL * meses).toFixed(2))
        if (mora !== Number(t.interes_mora)) {
          await supabase
            .from("transacciones")
            .update({ interes_mora: mora, updated_at: new Date().toISOString() })
            .eq("id", t.id)
        }
      }

      await fetchTransacciones()
      alert(`✓ Mora actualizada. ${vencibles.length} cuota(s) marcadas como vencidas.`)
    } catch {
      alert("Error al calcular mora.")
    } finally {
      setCalculandoMora(false)
    }
  }

  // ── Registrar pago (Manual) ──────────────────────────────────────────────────
  async function registrarPago() {
    if (!pagoTx) return
    setSaving(true)
    try {
      let comprobanteUrl: string | null = null

      if (archivo) {
        const ext = archivo.name.split(".").pop()
        const path = `${CONDOMINIO_ID}/${pagoTx.id}.${ext}`
        const { error: upErr } = await supabase.storage
          .from("comprobantes")
          .upload(path, archivo, { upsert: true })
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("comprobantes").getPublicUrl(path)
          comprobanteUrl = urlData.publicUrl
        }
      }

      const generatedCapId = metodo === "tarjeta" ? `CS-TRJ-${Date.now()}` : null;

      const { error: txErr } = await supabase
        .from("transacciones")
        .update({
          estado: "pagado",
          metodo_pago: metodo,
          referencia_pago: referencia.trim() || null,
          fecha_pago: fechaPago,
          comprobante_url: comprobanteUrl,
          capture_id: generatedCapId,
          interes_mora: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pagoTx.id)

      if (txErr) throw txErr
      
      const updatedTx = { ...pagoTx, metodo_pago: metodo, referencia_pago: referencia }
      await triggerEmailNotification("pago_confirmado", updatedTx, generatedCapId ?? undefined, comprobanteUrl ?? undefined)
      
      setPagoTx(null); setReferencia(""); setArchivo(null)
      await fetchTransacciones()
    } catch (e: any) {
      alert(e.message ?? "Error al registrar el pago.")
    } finally {
      setSaving(false)
    }
  }

  // ── Aprobar / Rechazar Transferencia ───────────────────────────────────────
  async function aprobarTransferencia(tx: Transaccion) {
    if (!confirm(`¿Está seguro de que desea aprobar el pago por transferencia de Apt ${tx.unidad_numero}?`)) return
    try {
      const generatedCapId = `CS-TRF-${Date.now()}`
      const { error: txErr } = await supabase
        .from("transacciones")
        .update({
          estado: "pagado",
          fecha_pago: new Date().toISOString().split("T")[0],
          capture_id: generatedCapId,
          interes_mora: 0,
          updated_at: new Date().toISOString()
        })
        .eq("id", tx.id)

      if (txErr) throw txErr
      
      // Intentar enviar email
      await triggerEmailNotification("pago_confirmado", tx, generatedCapId, tx.comprobante_url ?? undefined)

      // Registro de auditoría
      await supabase.from("audit_log").insert({
        condominio_id: CONDOMINIO_ID,
        usuario_id:    profile?.id,
        accion:        "aprobar_transferencia",
        descripcion:   `Transferencia aprobada — Apt ${tx.unidad_numero} · ${tx.concepto}`,
        metadata:      { tx_id: tx.id, monto: tx.monto, unidad: tx.unidad_numero, capture_id: generatedCapId },
      })

      alert("Transferencia aprobada con éxito.")
      await fetchTransacciones()
    } catch (e: any) {
      alert(e.message ?? "Error al aprobar la transferencia.")
    }
  }

  async function rechazarTransferencia(tx: Transaccion) {
    const motivo = prompt("Ingrese el motivo del rechazo de la transferencia (opcional):")
    if (motivo === null) return // Clic en cancelar
    try {
      const hoy = new Date().toISOString().split("T")[0]
      const nuevoEstado = tx.fecha_vencimiento < hoy ? "vencido" : "pendiente"
      const { error: txErr } = await supabase
        .from("transacciones")
        .update({
          estado: nuevoEstado,
          comprobante_url: null,
          referencia_pago: null,
          metodo_pago: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", tx.id)

      if (txErr) throw txErr

      // Insertar notificación de rechazo para el inquilino
      const { data: unidadData } = await supabase
        .from("unidades")
        .select("usuario_id")
        .eq("id", tx.unidad_id)
        .maybeSingle()

      if (unidadData?.usuario_id) {
        await supabase.from("notificaciones").insert({
          condominio_id: CONDOMINIO_ID,
          usuario_id: unidadData.usuario_id,
          titulo: "Comprobante de Pago Rechazado",
          mensaje: `Tu comprobante de transferencia para '${tx.concepto}' fue rechazado. ${motivo ? `Detalle: ${motivo}` : "Por favor sube una captura válida."}`,
          tipo: "alerta",
          prioridad: "alta"
        })
      }

      // Registro de auditoría
      await supabase.from("audit_log").insert({
        condominio_id: CONDOMINIO_ID,
        usuario_id:    profile?.id,
        accion:        "rechazar_transferencia",
        descripcion:   `Transferencia rechazada — Apt ${tx.unidad_numero} · ${tx.concepto}`,
        metadata:      { tx_id: tx.id, monto: tx.monto, unidad: tx.unidad_numero, motivo: motivo || null },
      })

      alert("Transferencia rechazada. La cuota ha vuelto a su estado original.")
      await fetchTransacciones()
    } catch (e: any) {
      alert(e.message ?? "Error al rechazar la transferencia.")
    }
  }

  // ── Estado de cuenta ────────────────────────────────────────────────────────
  async function verEstadoCuenta(tx: Transaccion) {
    setLoadingCuenta(true)
    setCuentaLabel(`Apt {tx.unidad_numero}`)
    setCuentaUnidad([])
    try {
      const { data } = await supabase
        .from("transacciones")
        .select("id, unidad_id, monto, concepto, tipo_servicio, estado, metodo_pago, referencia_pago, comprobante_url, fecha_vencimiento, fecha_pago, interes_mora, created_at, capture_id, unidades(numero_apartamento)")
        .eq("unidad_id", tx.unidad_id)
        .order("created_at", { ascending: false })

      setCuentaUnidad((data ?? []).map((t: any) => ({
        ...t,
        unidad_numero: t.unidades?.numero_apartamento ?? t.unidad_id,
      })))
    } catch {
      setCuentaUnidad([])
    } finally {
      setLoadingCuenta(false)
    }
  }

  function abrirPago(tx: Transaccion) {
    setPagoTx(tx)
    setUseGateway(true)
    setMetodo("transferencia"); setReferencia("")
    setFechaPago(new Date().toISOString().split("T")[0]); setArchivo(null)
  }

  const pendientes = transacciones.filter(t => t.estado === "pendiente")
  const pagadas    = transacciones.filter(t => t.estado === "pagado")
  const vencidas   = transacciones.filter(t => t.estado === "vencido")
  const verificaciones = transacciones.filter(t => t.estado === "pendiente_verificacion")

  const totalPendiente = pendientes.reduce((a, t) => a + Number(t.monto), 0)
  const totalCobrado   = pagadas.reduce((a, t) => a + Number(t.monto), 0)
  const totalVencido   = vencidas.reduce((a, t) => a + Number(t.monto) + Number(t.interes_mora ?? 0), 0)

  const aniosDisponibles = Array.from({ length: 3 }, (_, i) => String(new Date().getFullYear() - 1 + i))

  function TxTable({ items, showPagar, isVerificacion }: { items: Transaccion[]; showPagar?: boolean; isVerificacion?: boolean }) {
    if (items.length === 0) return (
      <p className="text-center text-muted-foreground text-sm py-10">No hay registros.</p>
    )
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Unidad</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Concepto</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Vencimiento</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Estado</th>
              <th className="text-right px-4 py-3 text-muted-foreground font-medium">Monto</th>
              {showPagar && <th className="text-right px-4 py-3 text-muted-foreground font-medium">Mora</th>}
              {!showPagar && <th className="text-left px-4 py-3 text-muted-foreground font-medium">Detalles Pago</th>}
              <th className="text-right px-4 py-3 text-muted-foreground font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map(t => (
              <tr key={t.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                <td className="px-4 py-3 font-medium">Apt {t.unidad_numero}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{t.concepto}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {new Date(t.fecha_vencimiento).toLocaleDateString("es-DO")}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${estadoBadge[t.estado] ?? "bg-secondary"}`}>
                    {t.estado === "pendiente_verificacion" ? "por verificar" : t.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  ${(Number(t.monto) + Number(t.interes_mora ?? 0)).toLocaleString("es-DO")}
                </td>
                {showPagar && (
                  <td className="px-4 py-3 text-right text-red-400 text-xs font-medium">
                    {Number(t.interes_mora) > 0 ? `+$${Number(t.interes_mora).toLocaleString("es-DO")}` : "—"}
                  </td>
                )}
                {!showPagar && (
                  <td className="px-4 py-3 text-xs">
                    <div className="flex flex-col gap-0.5">
                      {t.capture_id && <span className="font-mono text-slate-400">Capture: {t.capture_id}</span>}
                      {t.metodo_pago && <span className="capitalize text-muted-foreground font-medium">Método: {t.metodo_pago}</span>}
                      {t.referencia_pago && <span className="text-muted-foreground">Ref: {t.referencia_pago}</span>}
                      {t.comprobante_url && (
                        <a href={t.comprobante_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline mt-0.5 font-medium">
                          <FileText className="h-3.5 w-3.5" />Ver Comprobante
                        </a>
                      )}
                    </div>
                  </td>
                )}
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-1.5 justify-end">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                      onClick={() => verEstadoCuenta(t)}>
                      <User className="h-3 w-3" />
                    </Button>
                    {showPagar && (
                      <Button size="sm" className="h-7 text-xs gap-1" onClick={() => abrirPago(t)}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Pagar
                      </Button>
                    )}
                    {isVerificacion && (
                      <>
                        <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                          onClick={() => aprobarTransferencia(t)}>
                          Aprobar
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs gap-1 font-medium"
                          onClick={() => rechazarTransferencia(t)}>
                          Rechazar
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (!CONDOMINIO_ID) return (
    <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
      <DollarSign className="h-12 w-12 text-muted-foreground/40" />
      <h2 className="text-xl font-medium text-muted-foreground">Sin condominio asignado.</h2>
    </div>
  )

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="ml-3 text-muted-foreground">Cargando cobros...</span>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Motor de Cobros</h2>
          <p className="text-muted-foreground mt-1">Generación de cuotas, pagos y seguimiento de mora</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={calcularMora} disabled={calculandoMora}>
            {calculandoMora
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <AlertTriangle className="h-4 w-4 text-red-400" />}
            Actualizar mora
          </Button>
          <Button className="gap-2" onClick={() => { setGenOpen(true); setGenMsg(null) }}>
            <Plus className="h-4 w-4" />
            Generar cuotas
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-md px-4 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border-yellow-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Por cobrar</CardTitle>
            <Clock className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">${totalPendiente.toLocaleString("es-DO")}</div>
            <p className="text-xs text-muted-foreground mt-1">{pendientes.length} cuota(s) pendiente(s)</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cobrado</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">${totalCobrado.toLocaleString("es-DO")}</div>
            <p className="text-xs text-muted-foreground mt-1">{pagadas.length} pago(s) registrado(s)</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-rose-500/5 border-red-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vencido + mora</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">${totalVencido.toLocaleString("es-DO")}</div>
            <p className="text-xs text-muted-foreground mt-1">{vencidas.length} cuota(s) vencida(s) · mora {(MORA_MENSUAL * 100).toFixed(0)}%/mes</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="pendientes" className="w-full">
            <div className="px-4 pt-4">
              <TabsList className="mb-4">
                <TabsTrigger value="pendientes">Pendientes ({pendientes.length})</TabsTrigger>
                <TabsTrigger value="verificacion" className="flex items-center gap-1.5 bg-blue-500/5 text-blue-400 data-[state=active]:bg-blue-500/20">
                  <ShieldCheck className="h-4 w-4" />
                  Por Verificar ({verificaciones.length})
                </TabsTrigger>
                <TabsTrigger value="vencidas">Vencidas ({vencidas.length})</TabsTrigger>
                <TabsTrigger value="pagadas">Pagadas ({pagadas.length})</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="pendientes"><TxTable items={pendientes} showPagar /></TabsContent>
            <TabsContent value="verificacion"><TxTable items={verificaciones} isVerificacion /></TabsContent>
            <TabsContent value="vencidas"><TxTable items={vencidas} showPagar /></TabsContent>
            <TabsContent value="pagadas"><TxTable items={pagadas} /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog: Generar cuotas */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Generar cuotas del mes</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Mes</Label>
              <Select value={genMes} onValueChange={setGenMes}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Año</Label>
              <Select value={genAnio} onValueChange={setGenAnio}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {aniosDisponibles.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {genMsg && (
              <p className={`text-sm px-3 py-2 rounded-md ${genMsg.startsWith("✓") ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"}`}>
                {genMsg}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>Cancelar</Button>
            <Button onClick={generarCuotas} disabled={generating}>
              {generating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Generar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Registrar pago */}
      <Dialog open={!!pagoTx} onOpenChange={v => { if (!v) setPagoTx(null) }}>
        <DialogContent className={useGateway ? "sm:max-w-lg" : "sm:max-w-md"}>
          <DialogHeader>
            <div className="flex justify-between items-center mr-6">
              <DialogTitle>Registrar Pago</DialogTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                onClick={() => setUseGateway(!useGateway)}
              >
                {useGateway ? "Cambiar a Registro Manual" : "Cambiar a Pasarela"}
              </Button>
            </div>
          </DialogHeader>
          
          {pagoTx && useGateway && (
            <PaymentGateway
              monto={Number(pagoTx.monto) + Number(pagoTx.interes_mora ?? 0)}
              concepto={pagoTx.concepto}
              txId={pagoTx.id}
              condominioId={CONDOMINIO_ID}
              bancoCuenta={bancoCuenta}
              onCancel={() => setPagoTx(null)}
              onSuccess={async (capId, method, compUrl, ref) => {
                try {
                  const isTarjeta = method === "tarjeta";
                  const payload: any = {
                    estado: isTarjeta ? "pagado" : "pendiente_verificacion",
                    metodo_pago: method,
                    referencia_pago: ref || null,
                    fecha_pago: isTarjeta ? new Date().toISOString().split("T")[0] : null,
                    comprobante_url: compUrl || null,
                    interes_mora: isTarjeta ? 0 : pagoTx.interes_mora,
                    updated_at: new Date().toISOString()
                  }
                  if (capId) {
                    payload.capture_id = capId
                  }
                  
                  const { error: txErr } = await supabase
                    .from("transacciones")
                    .update(payload)
                    .eq("id", pagoTx.id)
                    
                  if (txErr) throw txErr
                  
                  // Enviar notificación
                  await triggerEmailNotification(isTarjeta ? "pago_confirmado" : "pendiente_verificacion", pagoTx, capId || undefined, compUrl || undefined)

                  setPagoTx(null)
                  await fetchTransacciones()
                } catch (err: any) {
                  alert(err.message ?? "Error al registrar el pago")
                }
              }}
            />
          )}

          {pagoTx && !useGateway && (
            <div className="grid gap-4 py-2">
              <div className="bg-secondary/30 rounded-md px-3 py-2 text-sm space-y-0.5">
                <p className="font-medium">Apt {pagoTx.unidad_numero}</p>
                <p className="text-muted-foreground text-xs">{pagoTx.concepto}</p>
                <p className="text-primary font-bold mt-1">
                  ${Number(pagoTx.monto).toLocaleString("es-DO")}
                  {Number(pagoTx.interes_mora) > 0 && (
                    <span className="text-red-400 ml-2 text-xs font-normal">
                      + ${Number(pagoTx.interes_mora).toLocaleString("es-DO")} mora
                    </span>
                  )}
                </p>
              </div>
              <div className="grid gap-2">
                <Label>Método de pago (Manual)</Label>
                <Select value={metodo} onValueChange={setMetodo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {METODOS.map(m => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Referencia / Nro. de confirmación</Label>
                <Input value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Ej: TRF-2026-00145" />
              </div>
              <div className="grid gap-2">
                <Label>Fecha de pago</Label>
                <Input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5" />
                  Comprobante <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <div
                  className="border border-dashed border-border rounded-md px-4 py-3 flex flex-col items-center gap-2 cursor-pointer hover:bg-secondary/30 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  {archivo ? (
                    <p className="text-sm text-primary font-medium truncate max-w-full">{archivo.name}</p>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Clic para subir imagen o PDF</p>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
                  onChange={e => setArchivo(e.target.files?.[0] ?? null)} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPagoTx(null)}>Cancelar</Button>
                <Button onClick={registrarPago} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Confirmar pago
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Estado de cuenta */}
      <Dialog open={cuentaUnidad !== null} onOpenChange={v => { if (!v) setCuentaUnidad(null) }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Estado de cuenta — {cuentaLabel}</DialogTitle>
          </DialogHeader>
          {loadingCuenta ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : cuentaUnidad && cuentaUnidad.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Sin transacciones registradas.</p>
          ) : (
            <>
              {/* Resumen */}
              {cuentaUnidad && (() => {
                const pagado   = cuentaUnidad.filter(t => t.estado === "pagado").reduce((a, t) => a + Number(t.monto), 0)
                const pendiente = cuentaUnidad.filter(t => t.estado === "pendiente").reduce((a, t) => a + Number(t.monto), 0)
                const mora     = cuentaUnidad.reduce((a, t) => a + Number(t.interes_mora ?? 0), 0)
                return (
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-md px-3 py-2 text-center">
                      <p className="text-xs text-muted-foreground">Pagado</p>
                      <p className="text-green-400 font-bold">${pagado.toLocaleString("es-DO")}</p>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md px-3 py-2 text-center">
                      <p className="text-xs text-muted-foreground">Pendiente</p>
                      <p className="text-yellow-400 font-bold">${pendiente.toLocaleString("es-DO")}</p>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2 text-center">
                      <p className="text-xs text-muted-foreground">Mora acumulada</p>
                      <p className="text-red-400 font-bold">${mora.toLocaleString("es-DO")}</p>
                    </div>
                  </div>
                )
              })()}
              {/* Historial completo */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium text-xs">Concepto</th>
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium text-xs">Vencimiento</th>
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium text-xs">Estado</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-medium text-xs">Monto</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-medium text-xs">Mora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(cuentaUnidad ?? []).map(t => (
                      <tr key={t.id} className="border-b border-border/50 text-sm">
                        <td className="px-3 py-2 text-xs">{t.concepto}</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">
                          {new Date(t.fecha_vencimiento).toLocaleDateString("es-DO")}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${estadoBadge[t.estado] ?? "bg-secondary"}`}>
                            {t.estado}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-medium">${Number(t.monto).toLocaleString("es-DO")}</td>
                        <td className="px-3 py-2 text-right text-red-400 text-xs">
                          {Number(t.interes_mora) > 0 ? `$${Number(t.interes_mora).toLocaleString("es-DO")}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

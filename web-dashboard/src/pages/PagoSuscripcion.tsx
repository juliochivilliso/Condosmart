import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CreditCard, Loader2, CheckCircle2, AlertCircle, Upload, Building, ArrowLeft
} from "lucide-react"

type Plan = {
  id: string
  nombre: string
  precio_mensual: number
}

function formatCard(val: string) {
  return val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim()
}

function formatExpiry(val: string) {
  const clean = val.replace(/\D/g, "").slice(0, 4)
  return clean.length > 2 ? `${clean.slice(0, 2)}/${clean.slice(2)}` : clean
}

const formatDOP = (n: number) =>
  new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(n)

const TC = 57 // tipo de cambio simulado USD → DOP

export default function PagoSuscripcion() {
  const { profile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const plan: Plan | undefined = location.state?.plan

  const [tab, setTab] = useState("tarjeta")
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Tarjeta
  const [cardNum, setCardNum] = useState("")
  const [cardName, setCardName] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvv, setCardCvv] = useState("")

  // PayPal
  const [ppStep, setPpStep] = useState<"idle" | "login" | "confirm">("idle")
  const [ppEmail, setPpEmail] = useState("")

  // Transferencia
  const [transRef, setTransRef] = useState("")
  const [comprobante, setComprobante] = useState<File | null>(null)

  async function processPayment(metodo: string, extra: Record<string, string> = {}) {
    if (!profile?.condominio_id) {
      setErrorMsg("Sin residencial asignado a tu usuario.")
      return
    }
    setProcessing(true)
    setErrorMsg(null)
    try {
      await new Promise((r) => setTimeout(r, 2000)) // simular procesamiento

      const { data: sus } = await supabase
        .from("suscripciones")
        .select("id, plan_id")
        .eq("condominio_id", profile.condominio_id)
        .maybeSingle()

      const referencia = extra.referencia ?? `CS-${Date.now().toString(36).toUpperCase()}`

      await supabase.from("pagos_suscripcion").insert({
        suscripcion_id: sus?.id ?? null,
        condominio_id: profile.condominio_id,
        monto: plan?.precio_mensual ?? 0,
        metodo_pago: metodo,
        estado: "completado",
        referencia,
        ultimos4: extra.ultimos4 ?? null,
        descripcion: `Suscripción ${plan?.nombre ?? ""} · ${new Date().toLocaleDateString("es-DO")}`,
      })

      const nextVence = new Date()
      nextVence.setMonth(nextVence.getMonth() + 1)

      await supabase.from("suscripciones").upsert(
        {
          condominio_id: profile.condominio_id,
          plan_id: plan?.id ?? sus?.plan_id ?? null,
          estado: "activa",
          fecha_inicio: new Date().toISOString().split("T")[0],
          fecha_vencimiento: nextVence.toISOString().split("T")[0],
          monto_mensual: plan?.precio_mensual ?? 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "condominio_id" }
      )

      setSuccess(true)
    } catch (e) {
      setErrorMsg((e as Error).message)
    } finally {
      setProcessing(false)
    }
  }

  function canPay(): boolean {
    if (tab === "tarjeta") {
      const nums = cardNum.replace(/\s/g, "")
      return nums.length === 16 && cardName.length > 2 && cardExpiry.length === 5 && cardCvv.length >= 3
    }
    if (tab === "paypal") return ppStep === "confirm" && ppEmail.includes("@")
    if (tab === "transferencia") return transRef.trim().length > 4
    return false
  }

  if (!plan) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto" />
        <p className="text-muted-foreground">No se seleccionó ningún plan. Vuelve a la página de planes.</p>
        <Button onClick={() => navigate("/planes")}>Ver Planes</Button>
      </div>
    )
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold">¡Pago procesado!</h2>
        <p className="text-muted-foreground">
          Tu suscripción <strong>Plan {plan.nombre}</strong> está activa por los próximos 30 días.
        </p>
        <Button onClick={() => navigate("/planes")}>Ver mi plan</Button>
      </div>
    )
  }

  const montoDOP = plan.precio_mensual * TC

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Portal de Pago</h2>
          <p className="text-muted-foreground text-sm">Entorno de pruebas simulado — sin cobro real</p>
        </div>
      </div>

      {/* Resumen de orden */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Resumen del pedido</p>
            <p className="font-bold text-lg">Plan {plan.nombre}</p>
            <p className="text-sm text-muted-foreground">
              1 mes · Vence el{" "}
              {new Date(Date.now() + 30 * 86400000).toLocaleDateString("es-DO")}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold">{formatDOP(montoDOP)}</p>
            <p className="text-xs text-muted-foreground">USD {plan.precio_mensual} · TC {TC}</p>
          </div>
        </CardContent>
      </Card>

      {errorMsg && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="tarjeta">Tarjeta</TabsTrigger>
          <TabsTrigger value="paypal">PayPal</TabsTrigger>
          <TabsTrigger value="transferencia">Transferencia</TabsTrigger>
        </TabsList>

        {/* TARJETA */}
        <TabsContent value="tarjeta">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Pago con tarjeta · Azul · Visa · Mastercard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Visual de la tarjeta */}
              <div className="rounded-xl bg-gradient-to-br from-primary/80 to-primary p-5 text-white shadow-lg select-none">
                <p className="text-xs opacity-60 uppercase tracking-wider mb-4">Tarjeta de crédito / débito</p>
                <p className="font-mono text-lg tracking-widest">{cardNum || "•••• •••• •••• ••••"}</p>
                <div className="flex justify-between mt-4 text-sm">
                  <div>
                    <p className="text-xs opacity-50">Titular</p>
                    <p className="font-medium uppercase">{cardName || "NOMBRE APELLIDO"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs opacity-50">Expira</p>
                    <p className="font-medium">{cardExpiry || "MM/AA"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Número de tarjeta</Label>
                <Input
                  inputMode="numeric"
                  placeholder="1234 5678 9012 3456"
                  value={cardNum}
                  onChange={(e) => setCardNum(formatCard(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre del titular</Label>
                <Input
                  placeholder="Como aparece en la tarjeta"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vencimiento</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="MM/AA"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CVV</Label>
                  <Input
                    inputMode="numeric"
                    type="password"
                    placeholder="•••"
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
              </div>

              <Button
                className="w-full"
                disabled={!canPay() || processing}
                onClick={() =>
                  processPayment("tarjeta", {
                    ultimos4: cardNum.replace(/\s/g, "").slice(-4),
                  })
                }
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                {processing ? "Procesando..." : `Pagar ${formatDOP(montoDOP)}`}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                🔒 Conexión segura · Simulación sin cobro real
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAYPAL */}
        <TabsContent value="paypal">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">PayPal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ppStep === "idle" && (
                <div className="text-center space-y-4 py-6">
                  <p className="text-5xl font-bold tracking-tighter">
                    <span className="text-blue-400">Pay</span>
                    <span className="text-blue-700">Pal</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Serás redirigido a PayPal para completar el pago de forma segura.
                  </p>
                  <Button
                    className="w-full bg-[#0070BA] hover:bg-[#005A94] text-white"
                    onClick={() => setPpStep("login")}
                  >
                    Continuar con PayPal
                  </Button>
                </div>
              )}

              {ppStep === "login" && (
                <div className="space-y-4 border rounded-xl p-5 bg-blue-500/5">
                  <p className="text-sm font-medium text-center text-blue-400">
                    Inicio de sesión PayPal (simulado)
                  </p>
                  <div className="space-y-2">
                    <Label>Email de PayPal</Label>
                    <Input
                      type="email"
                      placeholder="tu@email.com"
                      value={ppEmail}
                      onChange={(e) => setPpEmail(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full bg-[#0070BA] hover:bg-[#005A94] text-white"
                    onClick={() => setPpStep("confirm")}
                    disabled={!ppEmail.includes("@")}
                  >
                    Iniciar sesión
                  </Button>
                </div>
              )}

              {ppStep === "confirm" && (
                <div className="space-y-4 border rounded-xl p-5 bg-blue-500/5">
                  <p className="text-sm text-muted-foreground text-center">
                    ¿Confirmar pago de{" "}
                    <strong>{formatDOP(montoDOP)}</strong> a CondoSmart?
                  </p>
                  <p className="text-center text-sm">
                    Cuenta: <strong>{ppEmail}</strong>
                  </p>
                  <Button
                    className="w-full bg-[#0070BA] hover:bg-[#005A94] text-white"
                    disabled={processing}
                    onClick={() => processPayment("paypal")}
                  >
                    {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {processing ? "Procesando..." : "Confirmar pago"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRANSFERENCIA */}
        <TabsContent value="transferencia">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building className="h-4 w-4" />
                Transferencia bancaria
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-1.5">
                <p className="font-semibold mb-2">Datos para la transferencia:</p>
                <p>Banco: <strong>Banco Popular Dominicano</strong></p>
                <p>Cuenta corriente: <strong>012-3456789-0</strong></p>
                <p>Titular: <strong>CondoSmart SRL</strong></p>
                <p>RNC: <strong>1-30-12345-6</strong></p>
                <p className="pt-1 border-t mt-2">
                  Monto exacto: <strong className="text-primary">{formatDOP(montoDOP)}</strong>
                </p>
                <p>Concepto: <strong>Plan {plan.nombre} · {profile?.condominio_nombre ?? "Residencial"}</strong></p>
              </div>

              <div className="space-y-2">
                <Label>Número de referencia / confirmación *</Label>
                <Input
                  placeholder="Ej. TRF-2026-00123"
                  value={transRef}
                  onChange={(e) => setTransRef(e.target.value)}
                />
              </div>

              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  comprobante
                    ? "border-green-500/50 bg-green-500/10"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => document.getElementById("comp-upload")?.click()}
              >
                <input
                  id="comp-upload"
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => setComprobante(e.target.files?.[0] ?? null)}
                />
                {comprobante ? (
                  <p className="text-sm text-green-400">
                    <CheckCircle2 className="h-4 w-4 inline mr-1" />
                    {comprobante.name}
                  </p>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Subir comprobante de pago (opcional)</p>
                  </>
                )}
              </div>

              <Button
                className="w-full"
                disabled={!canPay() || processing}
                onClick={() => processPayment("transferencia", { referencia: transRef })}
              >
                {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {processing ? "Registrando..." : "Confirmar transferencia"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                La activación puede tardar 1–2 días hábiles tras verificar el pago.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

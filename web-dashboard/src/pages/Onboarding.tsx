import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase, supabaseAdmin } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Building2, User, Star, CheckCircle2,
  ChevronRight, ChevronLeft, Loader2
} from "lucide-react"

type Plan = {
  id: string
  nombre: string
  precio_mensual: number
  max_unidades: number
  max_usuarios: number
  tiene_iot: boolean
  tiene_reportes: boolean
  tiene_api: boolean
  color: string
  descripcion: string
}

const STEPS = [
  { id: 1, label: "Residencial",    icon: Building2 },
  { id: 2, label: "Administrador",  icon: User },
  { id: 3, label: "Plan",           icon: Star },
  { id: 4, label: "Confirmar",      icon: CheckCircle2 },
]

const PLAN_BORDER: Record<string, string> = {
  slate:  "border-slate-500/40",
  blue:   "border-blue-500/40",
  violet: "border-violet-500/40",
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [planes, setPlanes] = useState<Plan[]>([])
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Step 1
  const [nombre, setNombre] = useState("")
  const [direccion, setDireccion] = useState("")
  const [ciudad, setCiudad] = useState("")
  const [unidades, setUnidades] = useState("20")

  // Step 2
  const [adminNombre, setAdminNombre] = useState("")
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [adminTel, setAdminTel] = useState("")

  // Step 3
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)

  useEffect(() => {
    supabase
      .from("planes_suscripcion")
      .select("*")
      .eq("activo", true)
      .order("precio_mensual")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setPlanes(data)
          setSelectedPlan(data[1] ?? data[0]) // Default Pro
        }
      })
  }, [])

  function canNext(): boolean {
    if (step === 1) return nombre.trim().length > 0
    if (step === 2) {
      return (
        adminNombre.trim().length > 0 &&
        adminEmail.includes("@") &&
        adminPassword.length >= 8
      )
    }
    if (step === 3) return selectedPlan !== null
    return true
  }

  async function handleSubmit() {
    setSaving(true)
    setErrorMsg(null)
    try {
      // 1. Crear condominio
      const { data: condo, error: condoErr } = await supabase
        .from("condominios")
        .insert({
          nombre: nombre.trim(),
          direccion: direccion.trim() || null,
          ciudad: ciudad.trim() || null,
          cantidad_unidades: parseInt(unidades) || 0,
          plan_suscripcion: selectedPlan?.nombre.toLowerCase() ?? "lite",
          activo: true,
        })
        .select("id")
        .single()

      if (condoErr) throw condoErr

      // 2. Crear usuario en Auth + tabla usuarios
      let authUserId: string
      if (supabaseAdmin) {
        const { data: authUser, error: authErr } =
          await supabaseAdmin.auth.admin.createUser({
            email: adminEmail,
            password: adminPassword,
            email_confirm: true,
            user_metadata: { nombre_completo: adminNombre },
          })
        if (authErr) throw authErr
        authUserId = authUser.user.id
      } else {
        // Sin service key: generamos UUID placeholder
        authUserId = crypto.randomUUID()
      }

      await supabase.from("usuarios").insert({
        id: authUserId,
        email: adminEmail,
        nombre_completo: adminNombre,
        telefono: adminTel || null,
        rol: "admin_condominio",
        condominio_id: condo.id,
        activo: true,
      })

      // 3. Crear suscripción trial (30 días)
      if (selectedPlan) {
        const vence = new Date()
        vence.setDate(vence.getDate() + 30)
        await supabase.from("suscripciones").insert({
          condominio_id: condo.id,
          plan_id: selectedPlan.id,
          estado: "trial",
          fecha_inicio: new Date().toISOString().split("T")[0],
          fecha_vencimiento: vence.toISOString().split("T")[0],
          monto_mensual: selectedPlan.precio_mensual,
        })
      }

      setDone(true)
    } catch (e) {
      setErrorMsg((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <div className="h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold">¡Residencial creado!</h2>
        <p className="text-muted-foreground">
          <strong>{nombre}</strong> está activo en la plataforma con 30 días de prueba.
          El administrador puede acceder con <strong>{adminEmail}</strong>.
        </p>
        <div className="flex gap-3 justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => {
              setDone(false)
              setStep(1)
              setNombre("")
              setAdminNombre("")
              setAdminEmail("")
              setAdminPassword("")
            }}
          >
            Crear otro
          </Button>
          <Button onClick={() => navigate("/residenciales")}>Ver Residenciales</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-display font-bold tracking-tight">Nuevo Residencial</h2>
        <p className="text-muted-foreground mt-1">
          Completa los pasos para registrar un residencial en la plataforma.
        </p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const isActive = step === s.id
          const isDone = step > s.id
          return (
            <div key={s.id} className={`flex items-center ${i > 0 ? "flex-1" : ""}`}>
              {i > 0 && (
                <div className={`flex-1 h-0.5 ${isDone ? "bg-primary" : "bg-border"}`} />
              )}
              <div
                className={`flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isDone
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {step === 1 && "Datos del Residencial"}
            {step === 2 && "Administrador Principal"}
            {step === 3 && "Plan de Suscripción"}
            {step === 4 && "Revisión y Confirmación"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1 */}
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>Nombre del residencial *</Label>
                <Input
                  placeholder="Ej. Residencial Las Palmas"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ciudad</Label>
                  <Input
                    placeholder="Santo Domingo"
                    value={ciudad}
                    onChange={(e) => setCiudad(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unidades</Label>
                  <Input
                    type="number"
                    min="1"
                    value={unidades}
                    onChange={(e) => setUnidades(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input
                  placeholder="Av. Principal #45"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Nombre completo *</Label>
                <Input
                  placeholder="Juan Pérez"
                  value={adminNombre}
                  onChange={(e) => setAdminNombre(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="admin@residencial.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Contraseña temporal * (mínimo 8 caracteres)</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  placeholder="809-000-0000"
                  value={adminTel}
                  onChange={(e) => setAdminTel(e.target.value)}
                />
              </div>
              {!supabaseAdmin && (
                <p className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-md px-3 py-2">
                  VITE_SUPABASE_SERVICE_KEY no configurada — el usuario Auth no se creará automáticamente. Deberás crearlo manualmente en Supabase.
                </p>
              )}
            </>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-3">
              {planes.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                  Cargando planes...
                </p>
              ) : (
                planes.map((plan) => {
                  const borderClass = PLAN_BORDER[plan.color] ?? PLAN_BORDER.blue
                  const isSelected = selectedPlan?.id === plan.id
                  return (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                          : `${borderClass} hover:border-primary/50`
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-lg">{plan.nombre}</p>
                          <p className="text-muted-foreground text-sm mt-0.5">{plan.descripcion}</p>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="text-2xl font-bold">${plan.precio_mensual}</p>
                          <p className="text-xs text-muted-foreground">/mes</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="bg-muted px-2 py-0.5 rounded-full">
                          {plan.max_unidades} unidades
                        </span>
                        <span className="bg-muted px-2 py-0.5 rounded-full">
                          {plan.max_usuarios} usuarios
                        </span>
                        {plan.tiene_iot && (
                          <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">IoT</span>
                        )}
                        {plan.tiene_reportes && (
                          <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">Reportes</span>
                        )}
                        {plan.tiene_api && (
                          <span className="bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-full">API</span>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Residencial</p>
                  <p className="font-semibold">{nombre}</p>
                  {ciudad && <p className="text-sm text-muted-foreground">{ciudad}</p>}
                  {direccion && <p className="text-sm text-muted-foreground">{direccion}</p>}
                  <p className="text-sm text-muted-foreground">{unidades} unidades</p>
                </div>
                <div className="rounded-lg border p-4 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Administrador</p>
                  <p className="font-semibold">{adminNombre}</p>
                  <p className="text-sm text-muted-foreground">{adminEmail}</p>
                  {adminTel && <p className="text-sm text-muted-foreground">{adminTel}</p>}
                </div>
              </div>
              {selectedPlan && (
                <div className="rounded-lg border p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Plan seleccionado</p>
                    <p className="font-semibold text-lg">{selectedPlan.nombre}</p>
                    <p className="text-sm text-muted-foreground">30 días de prueba gratis</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">${selectedPlan.precio_mensual}</p>
                    <p className="text-xs text-muted-foreground">/mes después del trial</p>
                  </div>
                </div>
              )}
              {errorMsg && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                  Error: {errorMsg}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
          disabled={step === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>
        {step < 4 ? (
          <Button
            onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4)}
            disabled={!canNext()}
          >
            Siguiente <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Crear Residencial
          </Button>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, Loader2, CheckCircle2, AlertCircle } from "lucide-react"

type BancoForm = {
  banco: string
  tipo_cuenta: string
  numero_cuenta: string
  beneficiario: string
  rnc: string
}

export default function Configuracion() {
  const { profile } = useAuth()
  const CONDOMINIO_ID = profile?.condominio_id ?? ''
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<BancoForm>({
    banco: '', tipo_cuenta: '', numero_cuenta: '', beneficiario: '', rnc: '',
  })

  useEffect(() => {
    async function fetchConfig() {
      if (!CONDOMINIO_ID) { setLoading(false); return }
      const { data } = await supabase
        .from("condominios")
        .select("configuracion_pagos")
        .eq("id", CONDOMINIO_ID)
        .single()
      if (data?.configuracion_pagos) {
        const cfg = data.configuracion_pagos as BancoForm
        setForm({
          banco:         cfg.banco         ?? '',
          tipo_cuenta:   cfg.tipo_cuenta   ?? '',
          numero_cuenta: cfg.numero_cuenta ?? '',
          beneficiario:  cfg.beneficiario  ?? '',
          rnc:           cfg.rnc           ?? '',
        })
      }
      setLoading(false)
    }
    fetchConfig()
  }, [CONDOMINIO_ID])

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.banco.trim() || !form.numero_cuenta.trim() || !form.beneficiario.trim()) {
      setError("Banco, número de cuenta y beneficiario son requeridos.")
      return
    }
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const configuracion_pagos: BancoForm = {
        banco:         form.banco.trim(),
        tipo_cuenta:   form.tipo_cuenta.trim(),
        numero_cuenta: form.numero_cuenta.trim(),
        beneficiario:  form.beneficiario.trim(),
        rnc:           form.rnc.trim(),
      }

      const { error: updErr } = await supabase
        .from("condominios")
        .update({ configuracion_pagos })
        .eq("id", CONDOMINIO_ID)
      if (updErr) throw updErr

      await supabase.from("audit_log").insert({
        condominio_id: CONDOMINIO_ID,
        usuario_id:    profile?.id,
        accion:        "cambio_cuenta_bancaria",
        descripcion:   `Cuenta bancaria actualizada: ${configuracion_pagos.banco} · ${configuracion_pagos.numero_cuenta}`,
        metadata:      { banco: configuracion_pagos.banco, numero_cuenta: configuracion_pagos.numero_cuenta },
      })

      setSaved(true)
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? "Error al guardar la configuración.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configuración</h2>
        <p className="text-muted-foreground mt-1">Datos bancarios para pagos por transferencia</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-4">
          <Settings className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Cuenta Bancaria</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGuardar} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cfg-banco">Banco *</Label>
                <Input id="cfg-banco" placeholder="Ej. Banco de Reservas" value={form.banco}
                  onChange={e => setForm(f => ({ ...f, banco: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cfg-tipo">Tipo de Cuenta</Label>
                <Input id="cfg-tipo" placeholder="Ej. Corriente" value={form.tipo_cuenta}
                  onChange={e => setForm(f => ({ ...f, tipo_cuenta: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cfg-cuenta">Número de Cuenta *</Label>
                <Input id="cfg-cuenta" placeholder="Ej. 960-123456-7" value={form.numero_cuenta}
                  onChange={e => setForm(f => ({ ...f, numero_cuenta: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cfg-rnc">RNC</Label>
                <Input id="cfg-rnc" placeholder="Ej. 1-32-12345-6" value={form.rnc}
                  onChange={e => setForm(f => ({ ...f, rnc: e.target.value }))} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cfg-benef">Beneficiario *</Label>
                <Input id="cfg-benef" placeholder="Ej. Residencial Las Palmas" value={form.beneficiario}
                  onChange={e => setForm(f => ({ ...f, beneficiario: e.target.value }))} />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-4 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />{error}
              </div>
            )}
            {saved && (
              <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-md px-4 py-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />Configuración guardada exitosamente.
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar Cambios
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

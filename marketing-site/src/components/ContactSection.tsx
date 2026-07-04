import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"

type FormState = {
  nombre: string
  email: string
  telefono: string
  condominioNombre: string
  numUnidadesAprox: string
}

const INITIAL_STATE: FormState = {
  nombre: "",
  email: "",
  telefono: "",
  condominioNombre: "",
  numUnidadesAprox: "",
}

export default function ContactSection() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setError(null)
    try {
      const { error: insertError } = await supabase.from("leads").insert({
        nombre: form.nombre,
        email: form.email,
        telefono: form.telefono || null,
        condominio_nombre: form.condominioNombre,
        num_unidades_aprox: form.numUnidadesAprox ? Number(form.numUnidadesAprox) : null,
      })
      if (insertError) throw insertError

      try {
        await supabase.functions.invoke("send-email", {
          body: {
            type: "nuevo_lead",
            to: "ventas@condosmart.do",
            data: {
              nombre_completo: form.nombre,
              condominio_nombre: form.condominioNombre,
              email: form.email,
              telefono: form.telefono,
              num_unidades_aprox: form.numUnidadesAprox,
            },
          },
        })
      } catch {
        // Notificación por correo es best-effort; el lead ya quedó guardado.
      }

      setSent(true)
      setForm(INITIAL_STATE)
    } catch {
      setError("No pudimos enviar tu solicitud. Intenta de nuevo o escríbenos directamente.")
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <section id="contacto" className="dark bg-background py-24 text-center text-foreground">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="font-display text-2xl font-semibold">¡Listo! Recibimos tu solicitud.</h2>
          <p className="mt-2 text-muted-foreground">Te contactaremos pronto para coordinar tu demo.</p>
        </div>
      </section>
    )
  }

  return (
    <section id="contacto" className="dark bg-background py-24 text-foreground">
      <div className="mx-auto max-w-2xl px-6">
      <h2 className="font-display mb-8 text-center text-3xl font-semibold">Solicita tu demo</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre completo</Label>
          <Input
            id="nombre"
            required
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefono">Teléfono</Label>
          <Input
            id="telefono"
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="condominio">Nombre del condominio</Label>
          <Input
            id="condominio"
            required
            value={form.condominioNombre}
            onChange={(e) => setForm({ ...form, condominioNombre: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unidades">Número aproximado de unidades</Label>
          <Input
            id="unidades"
            type="number"
            min={1}
            value={form.numUnidadesAprox}
            onChange={(e) => setForm({ ...form, numUnidadesAprox: e.target.value })}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" disabled={sending} className="w-full">
          {sending ? "Enviando..." : "Solicitar demo"}
        </Button>
      </form>
      </div>
    </section>
  )
}

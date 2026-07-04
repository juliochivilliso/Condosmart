const PASOS = [
  { numero: "1", titulo: "Solicitas una demo", detalle: "Nos cuentas cuántas unidades tiene tu residencial y qué necesitas." },
  { numero: "2", titulo: "Configuramos tu residencial", detalle: "Cargamos tus unidades, residentes y cuotas. Tú apruebas antes de lanzar." },
  { numero: "3", titulo: "Tu equipo empieza a usarlo", detalle: "Administradores, conserjes, técnicos y residentes, cada uno con su acceso." },
]

export default function HowItWorksSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <h2 className="mb-12 text-center text-3xl font-bold">Cómo funciona</h2>
      <div className="grid gap-8 md:grid-cols-3">
        {PASOS.map((paso) => (
          <div key={paso.numero} className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              {paso.numero}
            </div>
            <h3 className="mb-2 font-semibold">{paso.titulo}</h3>
            <p className="text-sm text-muted-foreground">{paso.detalle}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

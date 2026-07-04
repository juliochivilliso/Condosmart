const PASOS = [
  { numero: "1", titulo: "Solicitas una demo", detalle: "Nos cuentas cuántas unidades tiene tu residencial y qué necesitas." },
  { numero: "2", titulo: "Configuramos tu residencial", detalle: "Cargamos tus unidades, residentes y cuotas. Tú apruebas antes de lanzar." },
  { numero: "3", titulo: "Tu equipo empieza a usarlo", detalle: "Administradores, conserjes, técnicos y residentes, cada uno con su acceso." },
]

export default function HowItWorksSection() {
  return (
    <section className="dark bg-background py-20 text-foreground">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="font-display mb-12 text-center text-3xl font-semibold">Cómo funciona</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {PASOS.map((paso, i) => (
            <div key={paso.numero} className="relative text-center">
              <div className="font-mono mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-primary text-lg text-primary">
                {paso.numero}
              </div>
              <h3 className="font-display mb-2 font-semibold">{paso.titulo}</h3>
              <p className="text-sm text-muted-foreground">{paso.detalle}</p>
              {i < PASOS.length - 1 && (
                <div
                  className="absolute top-6 left-[calc(50%+2rem)] hidden h-px w-[calc(100%-4rem)] bg-border md:block"
                  aria-hidden="true"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function Hero() {
  return (
    <section className="dark relative overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-10 px-6 py-24 text-center md:py-32">
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
          Administra tu residencial sin Excel, sin WhatsApp, sin caos.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          CondoSmart automatiza cobros, mora, tickets de mantenimiento y comunicación
          con tus residentes, todo desde un solo panel.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <a
            href="#contacto"
            className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90"
          >
            Solicitar demo
          </a>
          <a
            href="#features"
            className="inline-flex items-center justify-center rounded-md border border-border px-8 py-4 text-base font-semibold hover:bg-secondary/50"
          >
            Ver qué incluye
          </a>
        </div>
      </div>
    </section>
  )
}

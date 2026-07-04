import BuildingElevation from "@/components/BuildingElevation"

export default function Hero() {
  return (
    <section className="dark relative overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
      <div className="relative mx-auto grid max-w-6xl gap-16 px-6 py-28 md:grid-cols-2 md:items-center md:py-40">
        <div className="flex flex-col items-start gap-10 text-left">
          <h1 className="font-display max-w-xl text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl">
            Administra tu residencial sin Excel, sin WhatsApp, sin caos.
          </h1>
          <p className="max-w-md text-lg text-muted-foreground">
            CondoSmart automatiza cobros, mora, tickets de mantenimiento y comunicación
            con tus residentes, todo desde un solo panel.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <a
              href="#contacto"
              className="inline-flex items-center justify-center rounded bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
            >
              Solicitar demo
            </a>
            <a
              href="#features"
              className="inline-flex items-center justify-center rounded border border-border px-8 py-4 text-base font-semibold hover:bg-secondary/50"
            >
              Ver qué incluye
            </a>
          </div>
        </div>

        <div className="flex justify-center md:justify-end">
          <BuildingElevation />
        </div>
      </div>
    </section>
  )
}

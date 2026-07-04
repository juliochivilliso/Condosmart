import { cn } from "@/lib/utils"
import { PLANES } from "@/data/planes"

export default function PricingSection() {
  return (
    <section id="precios" className="bg-secondary/20 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="font-display mb-12 text-center text-3xl font-semibold">Planes y precios</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {PLANES.map((plan) => (
            <div
              key={plan.nombre}
              className={cn(
                "flex flex-col rounded border bg-card p-8",
                plan.destacado ? "border-primary ring-1 ring-primary" : "border-border"
              )}
            >
              <h3 className="font-display text-xl font-semibold">{plan.nombre}</h3>
              <p className="font-mono mt-2 text-3xl font-medium">
                ${plan.precioMensual}<span className="font-sans text-base font-normal text-muted-foreground">/mes</span>
              </p>
              <p className="mt-4 text-sm text-muted-foreground">{plan.descripcion}</p>
              <ul className="font-mono mt-6 flex-1 space-y-2 text-sm">
                <li>Hasta {plan.maxUnidades} unidades</li>
                <li>Hasta {plan.maxUsuarios} usuarios administradores</li>
                {plan.tieneIot && <li>Monitoreo IoT</li>}
                {plan.tieneReportes && <li>Reportes ejecutivos</li>}
                {plan.tieneApi && <li>API pública</li>}
              </ul>
              <a
                href="#contacto"
                className="mt-8 inline-flex items-center justify-center rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Solicitar demo
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

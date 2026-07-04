import { cn } from "@/lib/utils"
import { PLANES } from "@/data/planes"

export default function PricingSection() {
  return (
    <section id="precios" className="bg-secondary/20 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="mb-12 text-center text-3xl font-bold">Planes y precios</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {PLANES.map((plan) => (
            <div
              key={plan.nombre}
              className={cn(
                "flex flex-col rounded-lg border bg-card p-8",
                plan.destacado ? "border-primary ring-2 ring-primary/20" : "border-border"
              )}
            >
              <h3 className="text-xl font-bold">{plan.nombre}</h3>
              <p className="mt-2 text-3xl font-bold">
                ${plan.precioMensual}<span className="text-base font-normal text-muted-foreground">/mes</span>
              </p>
              <p className="mt-4 text-sm text-muted-foreground">{plan.descripcion}</p>
              <ul className="mt-6 flex-1 space-y-2 text-sm">
                <li>Hasta {plan.maxUnidades} unidades</li>
                <li>Hasta {plan.maxUsuarios} usuarios administradores</li>
                {plan.tieneIot && <li>Monitoreo IoT</li>}
                {plan.tieneReportes && <li>Reportes ejecutivos</li>}
                {plan.tieneApi && <li>API pública</li>}
              </ul>
              <a
                href="#contacto"
                className="mt-8 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
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

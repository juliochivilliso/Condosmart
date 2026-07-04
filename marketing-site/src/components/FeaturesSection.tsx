import { FEATURE_CATEGORIES } from "@/data/features"

const PLAN_CODES = ["A-1", "A-2", "B-1", "B-2"]

export default function FeaturesSection() {
  return (
    <section id="features" className="bg-secondary/30 py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-12 flex items-baseline justify-between gap-4 border-b border-border pb-4">
          <h2 className="font-display text-3xl font-semibold">Todo lo que necesita tu residencial</h2>
          <span className="font-mono hidden text-xs text-muted-foreground sm:block">LEYENDA DE PLANO</span>
        </div>
        <div className="divide-y divide-border">
          {FEATURE_CATEGORIES.map((cat, i) => (
            <div key={cat.id} className="grid gap-4 py-8 md:grid-cols-[5rem_1fr]">
              <span className="font-mono text-2xl font-medium text-primary">{PLAN_CODES[i]}</span>
              <div>
                <h3 className="font-display mb-3 text-lg font-semibold">{cat.titulo}</h3>
                <ul className="space-y-2.5">
                  {cat.items.map((item) => (
                    <li key={item} className="flex gap-3 text-sm text-muted-foreground">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 border border-current" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

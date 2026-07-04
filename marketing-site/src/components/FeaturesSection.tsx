import { CheckCircle2 } from "lucide-react"
import { FEATURE_CATEGORIES } from "@/data/features"

export default function FeaturesSection() {
  return (
    <section id="features" className="bg-secondary/20 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="mb-12 text-center text-3xl font-bold">Todo lo que necesita tu residencial</h2>
        <div className="grid gap-8 md:grid-cols-2">
          {FEATURE_CATEGORIES.map((cat) => (
            <div key={cat.id} className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold text-primary">{cat.titulo}</h3>
              <ul className="space-y-3">
                {cat.items.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

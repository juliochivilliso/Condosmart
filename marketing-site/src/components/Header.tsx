import { Building2 } from "lucide-react"

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="font-display flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Building2 className="h-5 w-5 text-primary" />
          CondoSmart
        </div>
        <nav className="hidden gap-6 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">Funciones</a>
          <a href="#precios" className="hover:text-foreground">Precios</a>
        </nav>
        <a
          href="#contacto"
          className="inline-flex items-center justify-center rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
        >
          Solicitar demo
        </a>
      </div>
    </header>
  )
}

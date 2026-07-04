export default function Footer() {
  const dashboardUrl = import.meta.env.VITE_DASHBOARD_URL ?? "https://app.condosmart.do"

  return (
    <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
      <p>© 2026 CondoSmart. Todos los derechos reservados.</p>
      <a href={`${dashboardUrl}/login`} className="mt-2 inline-block hover:text-foreground">
        ¿Ya eres cliente? Inicia sesión
      </a>
    </footer>
  )
}

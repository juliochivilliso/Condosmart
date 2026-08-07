import React from "react"
import { NavLink, Outlet, Routes, Route } from "react-router-dom"
import { LayoutDashboard, Wrench, DollarSign, Activity, Users, Building2, LogOut, UserCog, CreditCard, Layers, BarChart3, FileBarChart2, PlusCircle, Megaphone, CalendarDays, ShieldCheck, Settings, ClipboardList } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import NotificationsDropdown from "@/components/NotificationsDropdown"
import Dashboard from "@/pages/Dashboard"
import Inquilinos from "@/pages/Inquilinos"
import Tickets from "@/pages/Tickets"
import Finanzas from "@/pages/Finanzas"
import FinanzasGlobal from "@/pages/FinanzasGlobal"
import IotControl from "@/pages/IotControl"
import Login from "@/pages/Login"
import Residenciales from "@/pages/Residenciales"
import Usuarios from "@/pages/Usuarios"
import Cobros from "@/pages/Cobros"
import Onboarding from "@/pages/Onboarding"
import Planes from "@/pages/Planes"
import PagoSuscripcion from "@/pages/PagoSuscripcion"
import Reportes from "@/pages/Reportes"
import MetricasSaaS from "@/pages/MetricasSaaS"
import Anuncios from "@/pages/Anuncios"
import Reservas from "@/pages/Reservas"
import Visitantes from "@/pages/Visitantes"
import Configuracion from "@/pages/Configuracion"
import Auditoria from "@/pages/Auditoria"
import UpdatePassword from "@/pages/UpdatePassword"
import ProtectedRoute from "@/components/ProtectedRoute"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const navLinksComunes = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/inquilinos", label: "Inquilinos", icon: Users },
  { to: "/tecnicos", label: "Servicios Técnicos", icon: Wrench },
  { to: "/iot", label: "IoT Control", icon: Activity },
  { to: "/anuncios", label: "Comunicados", icon: Megaphone },
  { to: "/reservas", label: "Reservas", icon: CalendarDays },
]

const navLinksAdminCondominio = [
  { to: "/finanzas",       label: "Finanzas",       icon: DollarSign },
  { to: "/cobros",         label: "Cobros",         icon: CreditCard },
  { to: "/planes",         label: "Mi Plan",        icon: Layers },
  { to: "/visitantes",     label: "Visitantes",     icon: ShieldCheck },
  { to: "/configuracion",  label: "Configuración",  icon: Settings },
  { to: "/auditoria",      label: "Auditoría",      icon: ClipboardList },
]

const navLinksSuperAdmin = [
  { to: "/finanzas-global", label: "Finanzas Global",   icon: DollarSign },
  { to: "/metricas",        label: "Métricas SaaS",     icon: BarChart3 },
  { to: "/reportes",        label: "Reportes",           icon: FileBarChart2 },
  { to: "/planes",          label: "Planes",             icon: Layers },
  { to: "/onboarding",      label: "Nuevo Residencial",  icon: PlusCircle },
  { to: "/residenciales",   label: "Residenciales",      icon: Building2 },
  { to: "/usuarios",        label: "Usuarios",           icon: UserCog },
]

/** Genera iniciales del nombre completo (ej: Julio Chivilli -> JC) */
function getInitials(name: string): string {
  if (!name) return "AD"
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function Layout() {
  const { profile, signOut } = useAuth()
  
  const initials = profile?.nombre_completo 
    ? getInitials(profile.nombre_completo) 
    : "AD"

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans text-foreground relative">
      <div className="grain-overlay" aria-hidden="true" />
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r bg-card text-card-foreground p-4 flex flex-col gap-2 shrink-0">
        <div className="font-display font-bold text-2xl text-primary mb-2 flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          CondoSmart
        </div>

        {profile?.condominio_nombre && (
          <p className="text-xs text-muted-foreground px-1 mb-4 truncate italic">
            {profile.condominio_nombre}
          </p>
        )}

        <nav className="flex flex-col gap-1">
          {[
            ...navLinksComunes,
            ...(profile?.rol === 'admin_condominio' ? navLinksAdminCondominio : []),
            ...(profile?.rol === 'super_admin' ? navLinksSuperAdmin : []),
          ].map(({ to, label, icon: Icon, end }: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; end?: boolean }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md font-medium transition-colors ${
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
          
        </nav>

        <div className="mt-auto pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">v1.0 · CondoSmart SaaS</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex justify-between items-center px-6 lg:px-8 py-4 border-b bg-card/50 backdrop-blur-sm shrink-0">
          <h1 className="text-xl font-display font-semibold tracking-tight">Sistema de Gestión</h1>
          <div className="flex items-center gap-4">
            <NotificationsDropdown />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-8 w-8 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-primary font-bold text-sm hover:bg-primary/30 transition-colors">
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-semibold truncate">{profile?.nombre_completo || "Usuario"}</p>
                  <p className="text-xs text-muted-foreground truncate">{profile?.email || "sin email"}</p>
                  <p className="text-[10px] mt-1 uppercase tracking-wider text-primary font-bold">
                    {profile?.rol?.replace('_', ' ')}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/update-password" element={<UpdatePassword />} />

      {/* Rutas para admin_condominio y super_admin */}
      <Route element={<ProtectedRoute allowedRoles={['admin_condominio', 'super_admin']} />}>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="inquilinos" element={<Inquilinos />} />
          <Route path="tecnicos" element={<Tickets />} />
          <Route path="iot"      element={<IotControl />} />
          <Route path="anuncios"  element={<Anuncios />} />
          <Route path="reservas"  element={<Reservas />} />
          <Route path="planes"    element={<Planes />} />

          <Route element={<ProtectedRoute allowedRoles={['admin_condominio']} />}>
            <Route path="finanzas"         element={<Finanzas />} />
            <Route path="cobros"           element={<Cobros />} />
            <Route path="suscripcion/pago" element={<PagoSuscripcion />} />
            <Route path="visitantes"       element={<Visitantes />} />
            <Route path="configuracion"    element={<Configuracion />} />
            <Route path="auditoria"        element={<Auditoria />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
            <Route path="finanzas-global" element={<FinanzasGlobal />} />
            <Route path="residenciales"   element={<Residenciales />} />
            <Route path="usuarios"        element={<Usuarios />} />
            <Route path="metricas"        element={<MetricasSaaS />} />
            <Route path="reportes"        element={<Reportes />} />
            <Route path="onboarding"      element={<Onboarding />} />
          </Route>
        </Route>
      </Route>
      
      {/* Fallback */}
      <Route path="*" element={<Login />} />
    </Routes>
  )
}

export default App

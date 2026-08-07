import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { Loader2 } from "lucide-react"

type ProtectedRouteProps = {
  allowedRoles?: string[]
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Si no hay perfil (no autenticado o no existe en tabla usuarios)
  if (!profile) {
    return <Navigate to="/login" replace />
  }

  // Si hay roles permitidos definidos y el rol del usuario no está en la lista
  if (allowedRoles && !allowedRoles.includes(profile.rol)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

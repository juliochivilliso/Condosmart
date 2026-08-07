import { useEffect, useState, useCallback } from "react"
import { Bell, DollarSign, Wrench, Activity, AlertCircle, Megaphone, Clock, CheckCheck } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Notificacion = {
  id: string
  titulo: string
  mensaje: string
  tipo: string
  prioridad: string
  leido: boolean
  created_at: string
}

const SEED: Notificacion[] = [
  { id: "n1", titulo: "Pago recibido",          mensaje: "Cuota mayo confirmada — Apt 101",        tipo: "pago",         prioridad: "normal",  leido: false, created_at: "2026-05-01T10:00:00Z" },
  { id: "n2", titulo: "Ticket actualizado",      mensaje: "Ascensor B: técnico asignado",           tipo: "tecnico",      prioridad: "alta",    leido: false, created_at: "2026-04-30T09:00:00Z" },
  { id: "n3", titulo: "Alerta IoT",             mensaje: "Bomba Secundaria desconectada",           tipo: "iot",          prioridad: "critica", leido: true,  created_at: "2026-04-29T14:00:00Z" },
  { id: "n4", titulo: "Anuncio general",         mensaje: "Corte de agua programado el sábado",     tipo: "anuncio",      prioridad: "alta",    leido: true,  created_at: "2026-04-28T08:00:00Z" },
  { id: "n5", titulo: "Recordatorio de pago",    mensaje: "Apt 203 — cuota vence el 5 de mayo",     tipo: "recordatorio", prioridad: "normal",  leido: false, created_at: "2026-04-27T11:00:00Z" },
]

const tipoIcono: Record<string, React.ReactNode> = {
  pago:         <DollarSign className="h-4 w-4 text-green-400" />,
  tecnico:      <Wrench className="h-4 w-4 text-yellow-400" />,
  iot:          <Activity className="h-4 w-4 text-blue-400" />,
  anuncio:      <Megaphone className="h-4 w-4 text-purple-400" />,
  recordatorio: <Clock className="h-4 w-4 text-orange-400" />,
  alerta:       <AlertCircle className="h-4 w-4 text-red-400" />,
}

const prioridadBg: Record<string, string> = {
  critica: "border-l-2 border-l-red-500",
  alta:    "border-l-2 border-l-yellow-500",
  normal:  "",
  baja:    "",
}

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60)    return "ahora"
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export default function NotificationsDropdown() {
  const { profile } = useAuth()
  const [notifs, setNotifs] = useState<Notificacion[]>([])
  const [open, setOpen] = useState(false)

  const fetchNotifs = useCallback(async () => {
    if (!profile) return
    try {
      const { data } = await supabase
        .from("notificaciones")
        .select("id, titulo, mensaje, tipo, prioridad, leido, created_at")
        .eq("usuario_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(10)

      setNotifs(data && data.length > 0 ? data : SEED)
    } catch {
      setNotifs(SEED)
    }
  }, [profile])

  useEffect(() => { fetchNotifs() }, [fetchNotifs])

  const unread = notifs.filter(n => !n.leido).length

  async function marcarLeido(id: string) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, leido: true } : n))
    await supabase.from("notificaciones").update({ leido: true, leido_en: new Date().toISOString() }).eq("id", id)
  }

  async function marcarTodosLeidos() {
    setNotifs(prev => prev.map(n => ({ ...n, leido: true })))
    const ids = notifs.filter(n => !n.leido).map(n => n.id)
    if (ids.length) {
      await supabase.from("notificaciones").update({ leido: true, leido_en: new Date().toISOString() }).in("id", ids)
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-secondary transition-colors">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-destructive rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white px-0.5">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notificaciones</h3>
          {unread > 0 && (
            <button
              onClick={marcarTodosLeidos}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas
            </button>
          )}
        </div>

        <div className="max-h-[360px] overflow-y-auto">
          {notifs.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Sin notificaciones
            </div>
          ) : (
            notifs.map(n => (
              <button
                key={n.id}
                onClick={() => !n.leido && marcarLeido(n.id)}
                className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-secondary/50 transition-colors ${prioridadBg[n.prioridad]} ${!n.leido ? "bg-secondary/20" : ""}`}
              >
                <div className="mt-0.5 shrink-0">
                  {tipoIcono[n.tipo] ?? <Bell className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium truncate ${!n.leido ? "text-foreground" : "text-muted-foreground"}`}>
                      {n.titulo}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(n.created_at)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.mensaje}</p>
                </div>
                {!n.leido && (
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

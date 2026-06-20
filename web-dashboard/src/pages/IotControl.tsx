import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, AlertCircle, Wifi, WifiOff, Droplets, Lightbulb, Lock, Thermometer, Activity } from "lucide-react"
import { io, Socket } from "socket.io-client"

type Dispositivo = {
  id: string
  nombre: string
  tipo: string          // ENUM: bomba_agua | luminaria | cerradura | termostato
  ubicacion: string | null
  estado_actual: boolean
}

const SEED_DISPOSITIVOS: Dispositivo[] = [
  { id: "1", nombre: "Bomba Principal",       tipo: "bomba_agua",  ubicacion: "Cuarto técnico",     estado_actual: true  },
  { id: "2", nombre: "Bomba Secundaria",      tipo: "bomba_agua",  ubicacion: "Cuarto técnico",     estado_actual: false },
  { id: "3", nombre: "Luminaria Entrada",     tipo: "luminaria",   ubicacion: "Lobby principal",    estado_actual: true  },
  { id: "4", nombre: "Luminaria Estacionam.", tipo: "luminaria",   ubicacion: "Estacionamiento",    estado_actual: true  },
  { id: "5", nombre: "Cerradura Acceso A",    tipo: "cerradura",   ubicacion: "Entrada bloque A",   estado_actual: true  },
  { id: "6", nombre: "Cerradura Acceso B",    tipo: "cerradura",   ubicacion: "Entrada bloque B",   estado_actual: false },
  { id: "7", nombre: "Termostato Lobby",      tipo: "termostato",  ubicacion: "Lobby principal",    estado_actual: true  },
  { id: "8", nombre: "Termostato Piscina",    tipo: "termostato",  ubicacion: "Área piscina",       estado_actual: false },
]

const tipoIcono: Record<string, React.ElementType> = {
  bomba_agua:  Droplets,
  luminaria:   Lightbulb,
  cerradura:   Lock,
  termostato:  Thermometer,
}

const tipoColor: Record<string, string> = {
  bomba_agua:  "text-blue-400 bg-blue-500/20",
  luminaria:   "text-yellow-400 bg-yellow-500/20",
  cerradura:   "text-purple-400 bg-purple-500/20",
  termostato:  "text-orange-400 bg-orange-500/20",
}

const tipoLabel: Record<string, string> = {
  bomba_agua: "Bomba de Agua",
  luminaria:  "Luminaria",
  cerradura:  "Cerradura",
  termostato: "Termostato",
}

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button onClick={onChange} disabled={disabled} aria-label={checked ? "Desactivar" : "Activar"}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed ${checked ? "bg-primary" : "bg-secondary"}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  )
}

export default function IotControl() {
  const { profile } = useAuth()
  const CONDOMINIO_ID = profile?.condominio_id ?? ''
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [socketConnected, setSocketConnected] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    async function fetchDispositivos() {
      if (!CONDOMINIO_ID) {
        setDispositivos(SEED_DISPOSITIVOS)
        if (profile?.rol !== 'super_admin') {
          setError("Sin condominio asignado — mostrando datos de demostración.")
        }
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("dispositivos_iot")
          .select("id, nombre, tipo, ubicacion, estado_actual")
          .eq("condominio_id", CONDOMINIO_ID)
          .eq("activo", true)
          .order("nombre")
        if (error) throw error
        if (!data || data.length === 0) { setDispositivos(SEED_DISPOSITIVOS); setError("Usando datos de demostración.") }
        else setDispositivos(data as Dispositivo[])
      } catch { setDispositivos(SEED_DISPOSITIVOS); setError("Usando datos de demostración.") }
      finally { setLoading(false) }
    }
    fetchDispositivos()
  }, [CONDOMINIO_ID])

  useEffect(() => {
    try {
      const IOT_URL = import.meta.env.VITE_IOT_URL || "http://localhost:3001"
      const socket = io(IOT_URL, { timeout: 3000, reconnectionAttempts: 2 })
      socketRef.current = socket
      socket.on("connect", () => setSocketConnected(true))
      socket.on("disconnect", () => setSocketConnected(false))
      socket.on("connect_error", () => setSocketConnected(false))
      socket.on("device_updated", (payload: { id: string; estado_actual: boolean }) => {
        setDispositivos(prev => prev.map(d => d.id === payload.id ? { ...d, estado_actual: payload.estado_actual } : d))
      })
      return () => { socket.disconnect() }
    } catch { setSocketConnected(false) }
  }, [])

  async function handleToggle(dispositivo: Dispositivo) {
    const nuevoEstado = !dispositivo.estado_actual
    setToggling(dispositivo.id)
    setDispositivos(prev => prev.map(d => d.id === dispositivo.id ? { ...d, estado_actual: nuevoEstado } : d))
    if (socketRef.current?.connected) {
      socketRef.current.emit("toggle_device", { id: dispositivo.id, estado_actual: nuevoEstado })
    }
    try {
      await supabase.from("dispositivos_iot")
        .update({ estado_actual: nuevoEstado, fecha_ultimo_cambio: new Date().toISOString() })
        .eq("id", dispositivo.id)
    } catch {}
    setToggling(null)
  }

  const activos = dispositivos.filter(d => d.estado_actual).length
  const inactivos = dispositivos.filter(d => !d.estado_actual).length

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="ml-3 text-muted-foreground">Cargando dispositivos...</span>
    </div>
  )

  if (!CONDOMINIO_ID && profile?.rol === 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Activity className="h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-xl font-medium text-muted-foreground">Selecciona un residencial para ver los datos.</h2>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">IoT Control</h2>
          <p className="text-muted-foreground mt-1">{activos} activos · {inactivos} inactivos · {dispositivos.length} dispositivos</p>
        </div>
        <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border ${socketConnected ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-secondary border-border text-muted-foreground"}`}>
          {socketConnected ? <><Wifi className="h-3.5 w-3.5" /> WebSocket conectado</> : <><WifiOff className="h-3.5 w-3.5" /> Sin servidor IoT</>}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-md px-4 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {dispositivos.map(dispositivo => {
          const IconoTipo = tipoIcono[dispositivo.tipo] || Lightbulb
          const colorClass = tipoColor[dispositivo.tipo] || "text-slate-400 bg-slate-500/20"
          return (
            <Card key={dispositivo.id}
              className={`transition-all duration-300 ${dispositivo.estado_actual ? "border-primary/30 shadow-md shadow-primary/5" : "opacity-70"}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${colorClass}`}>
                    <IconoTipo className="h-5 w-5" />
                  </div>
                  <ToggleSwitch
                    checked={dispositivo.estado_actual}
                    onChange={() => handleToggle(dispositivo)}
                    disabled={toggling === dispositivo.id}
                  />
                </div>
                <CardTitle className="text-sm font-medium leading-tight mt-2">{dispositivo.nombre}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{tipoLabel[dispositivo.tipo] || dispositivo.tipo}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${dispositivo.estado_actual ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-secondary text-muted-foreground"}`}>
                    {dispositivo.estado_actual ? "Activo" : "Inactivo"}
                  </span>
                </div>
                {dispositivo.ubicacion && <p className="text-xs text-muted-foreground mt-1 truncate">{dispositivo.ubicacion}</p>}
                {toggling === dispositivo.id && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Actualizando...
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

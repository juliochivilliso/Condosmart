import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClipboardList, Loader2, AlertCircle } from "lucide-react"

type AuditEntry = {
  id: string
  accion: string
  descripcion: string
  metadata: Record<string, any> | null
  created_at: string
  usuarios: { nombre_completo: string } | null
}

const accionBadge: Record<string, string> = {
  aprobar_transferencia:  "bg-green-500/20 text-green-400 border border-green-500/30",
  rechazar_transferencia: "bg-red-500/20 text-red-400 border border-red-500/30",
  cambio_cuenta_bancaria: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
}

const accionLabel: Record<string, string> = {
  aprobar_transferencia:  "Transferencia aprobada",
  rechazar_transferencia: "Transferencia rechazada",
  cambio_cuenta_bancaria: "Cuenta bancaria modificada",
}

export default function Auditoria() {
  const { profile } = useAuth()
  const CONDOMINIO_ID = profile?.condominio_id ?? ''
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAudit() {
      if (!CONDOMINIO_ID) { setLoading(false); return }
      try {
        const { data, error: err } = await supabase
          .from("audit_log")
          .select("id, accion, descripcion, metadata, created_at, usuarios(nombre_completo)")
          .eq("condominio_id", CONDOMINIO_ID)
          .order("created_at", { ascending: false })
          .limit(100)
        if (err) throw err
        setEntries((data ?? []) as unknown as AuditEntry[])
      } catch {
        setError("No se pudo cargar el log de auditoría.")
      } finally {
        setLoading(false)
      }
    }
    fetchAudit()
  }, [CONDOMINIO_ID])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="ml-3 text-muted-foreground">Cargando auditoría...</span>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display font-bold tracking-tight">Auditoría</h2>
        <p className="text-muted-foreground mt-1">Registro de acciones administrativas</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-md px-4 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-4">
          <ClipboardList className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Log de Auditoría ({entries.length} registros)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-10">
              Sin registros de auditoría aún.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-6 py-3 text-muted-foreground font-medium">Fecha/Hora</th>
                    <th className="text-left px-6 py-3 text-muted-foreground font-medium">Acción</th>
                    <th className="text-left px-6 py-3 text-muted-foreground font-medium">Descripción</th>
                    <th className="text-left px-6 py-3 text-muted-foreground font-medium">Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="px-6 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(e.created_at).toLocaleString("es-DO")}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${accionBadge[e.accion] ?? "bg-secondary text-muted-foreground"}`}>
                          {accionLabel[e.accion] ?? e.accion}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-xs text-muted-foreground">{e.descripcion}</td>
                      <td className="px-6 py-3 text-xs text-muted-foreground">
                        {e.usuarios?.nombre_completo ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

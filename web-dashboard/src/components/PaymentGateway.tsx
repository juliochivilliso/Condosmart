import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  CreditCard, 
  Upload, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  FileText
} from "lucide-react"
import { supabase } from "@/lib/supabase"

export type BancoCuenta = {
  banco: string
  tipo_cuenta: string
  numero_cuenta: string
  beneficiario: string
  rnc: string
}

interface PaymentGatewayProps {
  monto: number
  concepto: string
  txId: string
  condominioId: string
  bancoCuenta: BancoCuenta | null
  onSuccess: (captureId: string, metodo: "tarjeta" | "transferencia", comprobanteUrl?: string, referencia?: string) => void
  onCancel: () => void
}

export default function PaymentGateway({
  monto,
  concepto,
  txId,
  condominioId,
  bancoCuenta,
  onSuccess,
  onCancel
}: PaymentGatewayProps) {
  const [activeTab, setActiveTab] = useState<"tarjeta" | "transferencia">("tarjeta")
  
  // Card Form State
  const [cardNumber, setCardNumber] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvc, setCvc] = useState("")
  const [cardName, setCardName] = useState("")
  
  // Transfer Form State
  const [transferRef, setTransferRef] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Global simulation states
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [captureId, setCaptureId] = useState("")


  // Formatter for Card Number (XXXX XXXX XXXX XXXX)
  const handleCardNumberChange = (value: string) => {
    const cleanValue = value.replace(/\D/g, "").slice(0, 16)
    const formatted = cleanValue.replace(/(\d{4})(?=\d)/g, "$1 ")
    setCardNumber(formatted)
  }

  // Formatter for Expiry Date (MM/YY)
  const handleExpiryChange = (value: string) => {
    const cleanValue = value.replace(/\D/g, "").slice(0, 4)
    if (cleanValue.length > 2) {
      setExpiry(`${cleanValue.slice(0, 2)}/${cleanValue.slice(2)}`)
    } else {
      setExpiry(cleanValue)
    }
  }

  // CVC max 4 digits
  const handleCvcChange = (value: string) => {
    const cleanValue = value.replace(/\D/g, "").slice(0, 4)
    setCvc(cleanValue)
  }

  // Execute Credit/Debit Card Simulation
  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cardNumber || !expiry || !cvc || !cardName) {
      setErrorMessage("Por favor complete todos los campos de la tarjeta.")
      setStatus("error")
      return
    }

    setStatus("processing")
    setErrorMessage("")
    
    // Simulate 3 seconds delay for gateway
    setTimeout(async () => {
      const lastDigit = cardNumber.replace(/\s/g, "").slice(-1)
      
      if (lastDigit === "0") {
        // Fail simulation
        setStatus("error")
        setErrorMessage("Transacción declinada. Fondos insuficientes o tarjeta inválida (Error Code: 51).")
        
        // Log attempt to database if txId is available
        try {
          await supabase.from("payment_attempts").insert({
            transaccion_id: txId,
            resultado: "rechazado",
            codigo_error: "DECLINED_CODE_51",
            ultimos_4_digitos: cardNumber.slice(-4),
            metodo_pago: "tarjeta"
          })
        } catch (err) {
          console.error("Error logging failed attempt:", err)
        }
      } else {
        // Success simulation
        const generatedCapId = `CS-TRJ-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`
        setCaptureId(generatedCapId)
        setStatus("success")
        
        // Log attempt and complete payment
        try {
          await supabase.from("payment_attempts").insert({
            transaccion_id: txId,
            resultado: "aprobado",
            capture_id: generatedCapId,
            ultimos_4_digitos: cardNumber.slice(-4),
            metodo_pago: "tarjeta"
          })
        } catch (err) {
          console.error("Error logging successful attempt:", err)
        }

        setTimeout(() => {
          onSuccess(generatedCapId, "tarjeta")
        }, 1500)
      }
    }, 2500)
  }

  // Execute Transfer Form Submission (updates state to pending verification)
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transferRef.trim()) {
      setErrorMessage("Por favor ingrese la referencia de la transferencia.")
      setStatus("error")
      return
    }
    if (!file) {
      setErrorMessage("Por favor adjunte una captura o comprobante de la transferencia.")
      setStatus("error")
      return
    }

    setStatus("processing")
    setErrorMessage("")

    try {
      // 1. Upload file to Supabase Storage
      const ext = file.name.split(".").pop()
      const path = `comprobantes/${condominioId}/${txId}_${Date.now()}.${ext}`
      
      const { error: uploadError } = await supabase.storage
        .from("comprobantes")
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage.from("comprobantes").getPublicUrl(path)
      const publicUrl = urlData.publicUrl


      // 2. Log payment attempt
      await supabase.from("payment_attempts").insert({
        transaccion_id: txId,
        resultado: "pendiente_verificacion",
        metodo_pago: "transferencia",
        referencia_pago: transferRef.trim()
      })

      setStatus("success")
      
      setTimeout(() => {
        onSuccess("", "transferencia", publicUrl, transferRef.trim())
      }, 1500)

    } catch (err: any) {
      setStatus("error")
      setErrorMessage(err.message ?? "Error al subir comprobante o procesar la transferencia.")
    }
  }

  if (status === "processing") {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <h3 className="text-lg font-medium">Procesando pago...</h3>
        <p className="text-sm text-muted-foreground text-center max-w-[280px]">
          {activeTab === "tarjeta" 
            ? "Conectando de forma segura con la pasarela de pagos..." 
            : "Subiendo comprobante bancario y registrando transferencia..."}
        </p>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-500 animate-bounce" />
        <h3 className="text-2xl font-bold text-green-500">
          {activeTab === "tarjeta" ? "¡Pago Aprobado!" : "¡Transferencia Enviada!"}
        </h3>
        <p className="text-sm text-muted-foreground max-w-[320px]">
          {activeTab === "tarjeta" 
            ? `La transacción se ha procesado exitosamente. Capture ID: ${captureId}`
            : "Su comprobante ha sido subido. El administrador residencial validará la transferencia para acreditar el pago."}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Resumen del Monto */}
      <div className="bg-secondary/40 border border-border/50 rounded-xl p-4 flex justify-between items-center">
        <div>
          <span className="text-xs text-muted-foreground block">Concepto</span>
          <span className="font-medium text-sm line-clamp-1">{concepto}</span>
        </div>
        <div className="text-right">
          <span className="text-xs text-muted-foreground block">Total a Pagar</span>
          <span className="text-xl font-bold text-primary">${monto.toLocaleString("es-DO")} RD$</span>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      <Tabs 
        defaultValue="tarjeta" 
        value={activeTab} 
        onValueChange={(v) => {
          setActiveTab(v as any)
          setErrorMessage("")
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="tarjeta" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Tarjeta de Crédito/Débito
          </TabsTrigger>
          <TabsTrigger value="transferencia" className="flex items-center gap-2" disabled={!bancoCuenta}>
            <Upload className="h-4 w-4" /> Transferencia Bancaria
          </TabsTrigger>
        </TabsList>

        {/* TARJETA TAB */}
        <TabsContent value="tarjeta">
          <form onSubmit={handleCardSubmit} className="space-y-4">
            {/* Visual Credit Card Preview */}
            <div className="relative h-44 w-full bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-5 shadow-lg overflow-hidden flex flex-col justify-between border border-white/10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl pointer-events-none" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Pasarela CondoSmart</p>
                  <p className="text-xs font-semibold text-slate-300">Simulación Visa / Mastercard</p>
                </div>
                <CreditCard className="h-8 w-8 text-slate-300" />
              </div>

              <div className="my-2">
                <p className="text-lg font-mono tracking-[0.2em] text-slate-100">
                  {cardNumber || "•••• •••• •••• ••••"}
                </p>
              </div>

              <div className="flex justify-between items-end">
                <div className="max-w-[70%]">
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider">Tarjetahabiente</p>
                  <p className="text-xs font-medium uppercase truncate tracking-wide text-slate-200">
                    {cardName || "Nombre Completo"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider">Vence</p>
                  <p className="text-xs font-mono text-slate-200">{expiry || "MM/YY"}</p>
                </div>
              </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="card-name" className="text-xs">Nombre en la Tarjeta</Label>
                <Input 
                  id="card-name"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="JUAN PEREZ"
                  className="bg-secondary/20"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="card-number" className="text-xs">Número de Tarjeta</Label>
                <Input 
                  id="card-number"
                  value={cardNumber}
                  onChange={(e) => handleCardNumberChange(e.target.value)}
                  placeholder="4111 1111 1111 1111"
                  className="font-mono bg-secondary/20"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="card-expiry" className="text-xs">Expiración</Label>
                <Input 
                  id="card-expiry"
                  value={expiry}
                  onChange={(e) => handleExpiryChange(e.target.value)}
                  placeholder="MM/YY"
                  className="font-mono bg-secondary/20 text-center"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="card-cvc" className="text-xs">CVC</Label>
                <Input 
                  id="card-cvc"
                  type="password"
                  value={cvc}
                  onChange={(e) => handleCvcChange(e.target.value)}
                  placeholder="123"
                  className="font-mono bg-secondary/20 text-center"
                />
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-normal">
              💡 <strong>Tip de simulación:</strong> Si el número de tarjeta termina en <strong>0</strong>, el pago fallará. Si termina en cualquier otro número, el pago será aprobado.
            </p>

            <div className="flex gap-2 pt-2 justify-end">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" className="gap-2">
                Pagar Ahora <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* TRANSFERENCIA TAB */}
        <TabsContent value="transferencia">
          <form onSubmit={handleTransferSubmit} className="space-y-4">
            {bancoCuenta ? (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-400 leading-normal space-y-1">
                <p className="font-semibold">Instrucciones de Transferencia:</p>
                <p>Realice la transferencia bancaria a la siguiente cuenta:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {bancoCuenta.banco && <li><strong>Banco:</strong> {bancoCuenta.banco}</li>}
                  {bancoCuenta.tipo_cuenta && <li><strong>Tipo:</strong> {bancoCuenta.tipo_cuenta}</li>}
                  {bancoCuenta.numero_cuenta && <li><strong>Cuenta:</strong> {bancoCuenta.numero_cuenta}</li>}
                  {bancoCuenta.beneficiario && <li><strong>Beneficiario:</strong> {bancoCuenta.beneficiario}</li>}
                  {bancoCuenta.rnc && <li><strong>RNC:</strong> {bancoCuenta.rnc}</li>}
                </ul>
              </div>
            ) : (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-400 leading-normal">
                <p className="font-semibold">Cuenta bancaria no configurada</p>
                <p className="mt-1">El administrador aún no ha configurado la cuenta bancaria de este condominio. Contacte al administrador o use la opción de tarjeta.</p>
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="trans-ref" className="text-xs">Número de Referencia de Transferencia</Label>
                <Input 
                  id="trans-ref"
                  value={transferRef}
                  onChange={(e) => setTransferRef(e.target.value)}
                  placeholder="Ej: TRF-1234567890"
                  className="bg-secondary/20"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Captura del Comprobante (Imagen o PDF)</Label>
                <div 
                  className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-secondary/10 hover:bg-secondary/20 transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    ref={fileInputRef} 
                    type="file" 
                    accept="image/*,application/pdf" 
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  {file ? (
                    <div className="flex flex-col items-center">
                      <FileText className="h-10 w-10 text-primary mb-1 animate-pulse" />
                      <p className="text-xs font-semibold text-primary truncate max-w-[240px]">{file.name}</p>
                      <p className="text-[10px] text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground text-center">
                        Haga clic para seleccionar o arrastrar el archivo de comprobante
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">
                        Formatos soportados: JPG, PNG, PDF. Máx: 5MB
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 justify-end">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" className="gap-2">
                Enviar Comprobante <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  )
}

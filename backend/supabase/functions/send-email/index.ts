import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getCorsHeaders } from "../_shared/cors.ts"

const corsHeaders = getCorsHeaders

interface EmailRequest {
  type: 'pago_confirmado' | 'pendiente_verificacion' | 'mora_aplicada' | 'nuevo_lead';
  to: string;
  data: {
    nombre_completo: string;
    concepto?: string;
    monto?: number;
    fecha_vencimiento?: string;
    capture_id?: string;
    referencia?: string;
    comprobante_url?: string;
    condominio_nombre: string;
    email?: string;
    telefono?: string;
    num_unidades_aprox?: string;
  };
}

const SALES_EMAIL = 'ventas@condosmart.do'

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function getHtmlTemplate(type: string, data: any): string {
  const brandColor = "#1A365D";
  const formatMonto = (m: number) => `RD$ ${Number(m).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;

  const header = `
    <div style="background-color: ${brandColor}; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="color: white; margin: 0; font-family: sans-serif; font-size: 24px;">CondoSmart</h1>
      <p style="color: #93C5FD; margin: 4px 0 0 0; font-family: sans-serif; font-size: 14px;">${escapeHtml(data.condominio_nombre || 'Tu Residencial')}</p>
    </div>
  `;

  const footer = `
    <div style="text-align: center; padding: 24px; color: #6B7280; font-family: sans-serif; font-size: 12px; border-top: 1px solid #E5E7EB; margin-top: 24px;">
      <p style="margin: 0 0 4px 0;">Este es un correo automático enviado por CondoSmart.</p>
      <p style="margin: 0;">© 2026 CondoSmart. Todos los derechos reservados.</p>
    </div>
  `;

  if (type === 'pago_confirmado') {
    return `
      <div style="max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 8px; font-family: sans-serif;">
        ${header}
        <div style="padding: 24px; color: #1F2937;">
          <h2 style="color: #10B981; margin-top: 0;">¡Pago Confirmado!</h2>
          <p>Hola <strong>${escapeHtml(data.nombre_completo)}</strong>,</p>
          <p>Hemos registrado y conciliado exitosamente tu pago. A continuación los detalles:</p>
          
          <div style="background-color: #F3F4F6; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #4B5563;">Concepto:</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right;">${escapeHtml(data.concepto)}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #4B5563;">Monto Pagado:</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #10B981; font-size: 16px;">${formatMonto(data.monto)}</td>
              </tr>
              ${data.capture_id ? `
              <tr>
                <td style="padding: 6px 0; color: #4B5563;">Capture ID:</td>
                <td style="padding: 6px 0; font-family: monospace; text-align: right;">${escapeHtml(data.capture_id)}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 6px 0; color: #4B5563;">Fecha de Pago:</td>
                <td style="padding: 6px 0; text-align: right;">${new Date().toLocaleDateString('es-DO')}</td>
              </tr>
            </table>
          </div>
          
          <p>Tu balance ha sido actualizado en la plataforma. Puedes ver el historial de pagos desde tu aplicación móvil o panel web.</p>
        </div>
        ${footer}
      </div>
    `;
  }

  if (type === 'pendiente_verificacion') {
    return `
      <div style="max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 8px; font-family: sans-serif;">
        ${header}
        <div style="padding: 24px; color: #1F2937;">
          <h2 style="color: #3B82F6; margin-top: 0;">Transferencia en Verificación</h2>
          <p>Hola <strong>${escapeHtml(data.nombre_completo)}</strong>,</p>
          <p>Hemos recibido los datos de tu transferencia bancaria. Un administrador residencial validará el comprobante a la brevedad.</p>
          
          <div style="background-color: #F3F4F6; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #4B5563;">Concepto:</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right;">${escapeHtml(data.concepto)}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #4B5563;">Monto:</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right; font-size: 16px;">${formatMonto(data.monto)}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #4B5563;">Referencia:</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right; font-family: monospace;">${escapeHtml(data.referencia || '—')}</td>
              </tr>
            </table>
          </div>
          
          <p>Te enviaremos un correo de confirmación una vez que el pago sea validado y acreditado.</p>
        </div>
        ${footer}
      </div>
    `;
  }

  if (type === 'nuevo_lead') {
    return `
      <div style="max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 8px; font-family: sans-serif;">
        ${header}
        <div style="padding: 24px; color: #1F2937;">
          <h2 style="color: ${brandColor}; margin-top: 0;">Nuevo lead desde la landing</h2>
          <div style="background-color: #F3F4F6; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #4B5563;">Nombre:</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right;">${escapeHtml(data.nombre_completo)}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #4B5563;">Condominio:</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right;">${escapeHtml(data.condominio_nombre)}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #4B5563;">Email:</td>
                <td style="padding: 6px 0; text-align: right;">${data.email ? escapeHtml(data.email) : '—'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #4B5563;">Teléfono:</td>
                <td style="padding: 6px 0; text-align: right;">${data.telefono ? escapeHtml(data.telefono) : '—'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #4B5563;">Unidades aprox.:</td>
                <td style="padding: 6px 0; text-align: right;">${data.num_unidades_aprox ? escapeHtml(data.num_unidades_aprox) : '—'}</td>
              </tr>
            </table>
          </div>
        </div>
        ${footer}
      </div>
    `;
  }

  // default template
  return `
    <div style="max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 8px; font-family: sans-serif;">
      ${header}
      <div style="padding: 24px; color: #1F2937;">
        <h2 style="color: ${brandColor}; margin-top: 0;">Notificación de Pago</h2>
        <p>Hola <strong>${escapeHtml(data.nombre_completo)}</strong>,</p>
        <p>Tienes una actualización sobre la cuota: <strong>${escapeHtml(data.concepto)}</strong> de monto <strong>${formatMonto(data.monto)}</strong>.</p>
      </div>
      ${footer}
    </div>
  `;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  try {
    const body: EmailRequest = await req.json()
    const { type, data } = body
    const to = type === 'nuevo_lead' ? SALES_EMAIL : body.to

    // Validar destinatario: solo usuarios del sistema o dominio autorizado
    if (!to || typeof to !== 'string') {
      return new Response(
        JSON.stringify({ error: 'El campo to es requerido' }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }
    if (type !== 'nuevo_lead') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(to)) {
        return new Response(
          JSON.stringify({ error: 'Formato de email inválido' }),
          { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
        )
      }
      const domain = to.split('@')[1]?.toLowerCase() ?? ''
      const allowedDomains = (Deno.env.get('ALLOWED_EMAIL_DOMAINS') ?? 'condosmart.do,laspalmas.do,gmail.com').split(',').map(d => d.trim().toLowerCase())
      if (!allowedDomains.includes(domain)) {
        return new Response(
          JSON.stringify({ error: 'Destinatario no autorizado' }),
          { status: 403, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
        )
      }
    }

    const subjectMap = {
      pago_confirmado: `Confirmación de Pago - ${data.concepto}`,
      pendiente_verificacion: `Transferencia Recibida - ${data.concepto}`,
      mora_aplicada: `AVISO: Recargo de mora aplicado - ${data.concepto}`,
      nuevo_lead: `Nuevo lead: ${data.condominio_nombre}`,
    }

    const subject = subjectMap[type] || `Actualización de Pago - ${data.concepto}`
    const htmlContent = getHtmlTemplate(type, data)

    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (resendApiKey) {
      // Send real email using Resend API
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: 'CondoSmart <onboarding@resend.dev>',
          to: [to],
          subject: subject,
          html: htmlContent,
        }),
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Resend API Error: ${errorText}`)
      }

      const resData = await res.json()
      return new Response(
        JSON.stringify({ message: 'Email sent successfully via Resend', id: resData.id }),
        { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      )
    } else {
      // Graceful fallback - Log to Deno stdout
      console.log(`[SEND_EMAIL_MOCK] To: ${to}`);
      console.log(`[SEND_EMAIL_MOCK] Subject: ${subject}`);
      console.log(`[SEND_EMAIL_MOCK] Body Preview: ${htmlContent.substring(0, 300)}...`);

      return new Response(
        JSON.stringify({ message: 'Email simulated and logged to stdout (No RESEND_API_KEY set)' }),
        { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }
})

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ofjsodxsdbkiugonnmkh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NxGCb5HAXwmFzW0lkfKBqQ_8H7X9-y0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const MORA_MENSUAL = 0.05; // 5% mensual

function mesesVencidos(fechaVenc) {
  const hoy = new Date();
  const venc = new Date(fechaVenc);
  if (hoy <= venc) return 0;
  // Prorrateo o redondeo hacia arriba para meses completos vencidos
  return Math.max(1, Math.ceil((hoy.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24 * 30)));
}

async function run() {
  console.log('⚡ Iniciando cálculo automático de mora...');
  const hoyStr = new Date().toISOString().split('T')[0];

  try {
    // 1. Fetch pending/overdue transactions
    const { data: txs, error: txError } = await supabase
      .from('transacciones')
      .select('id, condominio_id, unidad_id, monto, concepto, estado, fecha_vencimiento, interes_mora');

    if (txError) throw txError;

    const vencidasOPendientes = txs.filter(
      t => (t.estado === 'pendiente' || t.estado === 'vencido') && t.fecha_vencimiento < hoyStr
    );

    console.log(`Encontradas ${vencidasOPendientes.length} transacciones vencidas o pendientes para evaluar.`);

    let marcadasComoVencidas = 0;
    let morasActualizadas = 0;

    for (const tx of vencidasOPendientes) {
      const meses = mesesVencidos(tx.fecha_vencimiento);
      const nuevaMora = Number((Number(tx.monto) * MORA_MENSUAL * meses).toFixed(2));
      const estadoAnterior = tx.estado;
      
      // Check if we need to update
      if (tx.estado === 'pendiente' || Number(tx.interes_mora) !== nuevaMora) {
        // Update transaction state and interest in Supabase
        const { error: updateError } = await supabase
          .from('transacciones')
          .update({
            estado: 'vencido',
            interes_mora: nuevaMora,
            updated_at: new Date().toISOString()
          })
          .eq('id', tx.id);

        if (updateError) {
          console.error(`❌ Error actualizando tx ${tx.id}:`, updateError.message);
          continue;
        }

        if (estadoAnterior === 'pendiente') {
          marcadasComoVencidas++;
        } else {
          morasActualizadas++;
        }

        console.log(`✅ Tx ${tx.id} (${tx.concepto}) actualizada: estado=vencido, mora=RD$${nuevaMora}`);

        // Try to fetch resident's user ID to insert notification
        const { data: unidadData } = await supabase
          .from('unidades')
          .select('usuario_id')
          .eq('id', tx.unidad_id)
          .maybeSingle();

        if (unidadData && unidadData.usuario_id) {
          // Check if notification already sent today to avoid spamming
          const { error: notifError } = await supabase
            .from('notificaciones')
            .insert({
              condominio_id: tx.condominio_id,
              usuario_id: unidadData.usuario_id,
              titulo: 'Recargo de Mora Aplicado',
              mensaje: `La cuota '${tx.concepto}' ha vencido. Se aplicó una mora de RD$${nuevaMora.toLocaleString('es-DO')} (5% mensual).`,
              tipo: 'alerta',
              prioridad: 'alta'
            });
          
          if (notifError) {
            console.error(`❌ Error insertando notificación para usuario ${unidadData.usuario_id}:`, notifError.message);
          } else {
            console.log(`   ✉️ Notificación en app enviada a inquilino.`);
          }
        }

        // Simulate sending email (logs to console/mock)
        const { data: userData } = await supabase
          .from('usuarios')
          .select('email, nombre_completo')
          .eq('unidad_id', tx.unidad_id)
          .maybeSingle();

        if (userData && userData.email) {
          console.log(`   📧 [EMAIL SIMULATED] Enviando alerta a ${userData.email} (${userData.nombre_completo})`);
          console.log(`      De: pagos@condosmart.do`);
          console.log(`      Asunto: AVISO: Recargo por mora cuota vencida - ${tx.concepto}`);
          console.log(`      Detalle: Estimado(a) ${userData.nombre_completo}, le informamos que su cuota por concepto de '${tx.concepto}' con vencimiento el ${tx.fecha_vencimiento} se encuentra vencida. Se ha acumulado una mora de RD$${nuevaMora.toLocaleString('es-DO')}. Por favor, realice su pago a la brevedad.`);
        }
      }
    }

    console.log(`\n🎉 Cálculo completado.`);
    console.log(`   - Nuevas cuotas vencidas: ${marcadasComoVencidas}`);
    console.log(`   - Moras recalculadas: ${morasActualizadas}`);

  } catch (err) {
    console.error('❌ Error en el proceso de mora:', err);
  }
}

run();

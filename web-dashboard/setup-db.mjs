/**
 * Script para aplicar schema y seed data a Supabase
 * Ejecutar con: node setup-db.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ofjsodxsdbkiugonnmkh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NxGCb5HAXwmFzW0lkfKBqQ_8H7X9-y0';
const CONDOMINIO_ID = 'a1b2c3d4-0000-0000-0000-000000000001';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log('🚀 Iniciando configuración de base de datos CondoSmart...\n');

  // 1. Condominio
  console.log('📦 Insertando condominio...');
  const { error: condErr } = await supabase.from('condominios').upsert({
    id: CONDOMINIO_ID,
    nombre: 'Residencial Las Palmas',
    direccion: 'Av. Winston Churchill 152',
    ciudad: 'Santo Domingo',
    cantidad_unidades: 24,
    activo: true,
  }, { onConflict: 'id' });
  if (condErr) { console.error('  ❌ Condominio:', condErr.message); } else { console.log('  ✅ Condominio OK'); }

  // 2. Unidades
  console.log('🏠 Insertando unidades...');
  const unidades = [
    { id: 'e0000001-0000-0000-0000-000000000001', condominio_id: CONDOMINIO_ID, numero_apartamento: '101', bloque: 'A', piso: 1, cuota_mantenimiento: 8500.00, activo: true },
    { id: 'e0000002-0000-0000-0000-000000000001', condominio_id: CONDOMINIO_ID, numero_apartamento: '102', bloque: 'A', piso: 1, cuota_mantenimiento: 8500.00, activo: true },
    { id: 'e0000003-0000-0000-0000-000000000001', condominio_id: CONDOMINIO_ID, numero_apartamento: '203', bloque: 'B', piso: 2, cuota_mantenimiento: 9200.00, activo: true },
    { id: 'e0000004-0000-0000-0000-000000000001', condominio_id: CONDOMINIO_ID, numero_apartamento: '305', bloque: 'C', piso: 3, cuota_mantenimiento: 9200.00, activo: true },
    { id: 'e0000005-0000-0000-0000-000000000001', condominio_id: CONDOMINIO_ID, numero_apartamento: '401', bloque: 'D', piso: 4, cuota_mantenimiento: 11000.00, activo: true },
  ];
  const { error: unidErr } = await supabase.from('unidades').upsert(unidades, { onConflict: 'id' });
  if (unidErr) { console.error('  ❌ Unidades:', unidErr.message); } else { console.log('  ✅ Unidades OK (5)'); }

  // 3. Usuarios (inquilinos)
  console.log('👥 Insertando inquilinos...');
  const usuarios = [
    { id: 'f1000001-0000-0000-0000-000000000001', email: 'maria.gonzalez@email.com', nombre_completo: 'María González', telefono: '809-555-0101', rol: 'inquilino', condominio_id: CONDOMINIO_ID, unidad_id: 'e0000001-0000-0000-0000-000000000001', activo: true },
    { id: 'f1000002-0000-0000-0000-000000000001', email: 'carlos.ramirez@email.com',  nombre_completo: 'Carlos Ramírez',  telefono: '809-555-0202', rol: 'inquilino', condominio_id: CONDOMINIO_ID, unidad_id: 'e0000002-0000-0000-0000-000000000001', activo: true },
    { id: 'f1000003-0000-0000-0000-000000000001', email: 'ana.martinez@email.com',    nombre_completo: 'Ana Martínez',    telefono: '809-555-0303', rol: 'inquilino', condominio_id: CONDOMINIO_ID, unidad_id: 'e0000003-0000-0000-0000-000000000001', activo: true },
    { id: 'f1000004-0000-0000-0000-000000000001', email: 'luis.perez@email.com',      nombre_completo: 'Luis Pérez',      telefono: '809-555-0404', rol: 'inquilino', condominio_id: CONDOMINIO_ID, unidad_id: null, activo: true },
    { id: 'f1000005-0000-0000-0000-000000000001', email: 'carmen.jimenez@email.com',  nombre_completo: 'Carmen Jiménez',  telefono: '829-555-0505', rol: 'inquilino', condominio_id: CONDOMINIO_ID, unidad_id: 'e0000004-0000-0000-0000-000000000001', activo: true },
  ];
  const { error: userErr } = await supabase.from('usuarios').upsert(usuarios, { onConflict: 'id' });
  if (userErr) { console.error('  ❌ Usuarios:', userErr.message); } else { console.log('  ✅ Usuarios OK (5)'); }

  // 4. Transacciones
  console.log('💰 Insertando transacciones...');
  const tx = [
    { condominio_id: CONDOMINIO_ID, unidad_id: 'e0000001-0000-0000-0000-000000000001', monto: 8500.00,  tipo_servicio: 'mantenimiento', concepto: 'Cuota Mayo 2026',      estado: 'pagado',   metodo_pago: 'transferencia', fecha_vencimiento: '2026-05-05', fecha_pago: '2026-05-01' },
    { condominio_id: CONDOMINIO_ID, unidad_id: 'e0000002-0000-0000-0000-000000000001', monto: 8500.00,  tipo_servicio: 'mantenimiento', concepto: 'Cuota Mayo 2026',      estado: 'pagado',   metodo_pago: 'billetera',     fecha_vencimiento: '2026-05-05', fecha_pago: '2026-04-30' },
    { condominio_id: CONDOMINIO_ID, unidad_id: 'e0000003-0000-0000-0000-000000000001', monto: 9200.00,  tipo_servicio: 'mantenimiento', concepto: 'Cuota Mayo 2026',      estado: 'pendiente',metodo_pago: null,            fecha_vencimiento: '2026-05-05', fecha_pago: null },
    { condominio_id: CONDOMINIO_ID, unidad_id: 'e0000004-0000-0000-0000-000000000001', monto: 9200.00,  tipo_servicio: 'mantenimiento', concepto: 'Cuota Mayo 2026',      estado: 'pagado',   metodo_pago: 'tarjeta',       fecha_vencimiento: '2026-05-05', fecha_pago: '2026-04-29' },
    { condominio_id: CONDOMINIO_ID, unidad_id: 'e0000001-0000-0000-0000-000000000001', monto: 3200.00,  tipo_servicio: 'fondo_reserva', concepto: 'Fondo Reserva Q2',     estado: 'pagado',   metodo_pago: 'transferencia', fecha_vencimiento: '2026-04-30', fecha_pago: '2026-04-28' },
    { condominio_id: CONDOMINIO_ID, unidad_id: 'e0000005-0000-0000-0000-000000000001', monto: 11000.00, tipo_servicio: 'mantenimiento', concepto: 'Cuota Mayo 2026',      estado: 'pagado',   metodo_pago: 'transferencia', fecha_vencimiento: '2026-05-05', fecha_pago: '2026-05-01' },
    { condominio_id: CONDOMINIO_ID, unidad_id: 'e0000002-0000-0000-0000-000000000001', monto: 1800.00,  tipo_servicio: 'agua',          concepto: 'Consumo agua Abril',  estado: 'pagado',   metodo_pago: 'otro',          fecha_vencimiento: '2026-04-30', fecha_pago: '2026-04-25' },
    { condominio_id: CONDOMINIO_ID, unidad_id: 'e0000003-0000-0000-0000-000000000001', monto: 900.00,   tipo_servicio: 'luz',           concepto: 'Consumo luz Abril',   estado: 'pagado',   metodo_pago: 'billetera',     fecha_vencimiento: '2026-04-30', fecha_pago: '2026-04-26' },
  ];
  const { error: txErr } = await supabase.from('transacciones').insert(tx);
  if (txErr) { console.error('  ❌ Transacciones:', txErr.message); } else { console.log('  ✅ Transacciones OK (8)'); }

  // 5. Tickets
  console.log('🔧 Insertando tickets técnicos...');
  const tickets = [
    { condominio_id: CONDOMINIO_ID, unidad_id: 'e0000001-0000-0000-0000-000000000001', categoria: 'plomería',     titulo: 'Filtración en techo',          descripcion: 'Goteo en el pasillo principal',          estado: 'pendiente',   created_at: '2026-04-28T10:00:00Z' },
    { condominio_id: CONDOMINIO_ID, unidad_id: 'e0000002-0000-0000-0000-000000000001', categoria: 'electricidad', titulo: 'Ascensor B sin funcionar',     descripcion: 'Ascensor parado desde el lunes',         estado: 'en_progreso', created_at: '2026-04-27T09:00:00Z' },
    { condominio_id: CONDOMINIO_ID, unidad_id: 'e0000003-0000-0000-0000-000000000001', categoria: 'pintura',      titulo: 'Humedad en pared corredor',    descripcion: 'Mancha de humedad visible',               estado: 'completado',  created_at: '2026-04-20T14:00:00Z' },
    { condominio_id: CONDOMINIO_ID, unidad_id: 'e0000004-0000-0000-0000-000000000001', categoria: 'carpintería',  titulo: 'Puerta de acceso dañada',      descripcion: 'No cierra correctamente',                 estado: 'pendiente',   created_at: '2026-04-29T16:30:00Z' },
    { condominio_id: CONDOMINIO_ID, unidad_id: 'e0000005-0000-0000-0000-000000000001', categoria: 'jardinería',   titulo: 'Sistema de riego automático',  descripcion: 'No enciende en horario programado',      estado: 'en_progreso', created_at: '2026-04-26T11:00:00Z' },
  ];
  const { error: tkErr } = await supabase.from('tickets_tecnicos').insert(tickets);
  if (tkErr) { console.error('  ❌ Tickets:', tkErr.message); } else { console.log('  ✅ Tickets OK (5)'); }

  // 6. Dispositivos IoT
  console.log('📡 Insertando dispositivos IoT...');
  const iot = [
    { condominio_id: CONDOMINIO_ID, nombre: 'Bomba Principal',           tipo: 'bomba_agua', ubicacion: 'Cuarto técnico',     estado_actual: true,  activo: true },
    { condominio_id: CONDOMINIO_ID, nombre: 'Bomba Secundaria',          tipo: 'bomba_agua', ubicacion: 'Cuarto técnico',     estado_actual: false, activo: true },
    { condominio_id: CONDOMINIO_ID, nombre: 'Luminaria Entrada',         tipo: 'luminaria',  ubicacion: 'Lobby principal',    estado_actual: true,  activo: true },
    { condominio_id: CONDOMINIO_ID, nombre: 'Luminaria Estacionamiento', tipo: 'luminaria',  ubicacion: 'Estacionamiento',    estado_actual: true,  activo: true },
    { condominio_id: CONDOMINIO_ID, nombre: 'Cerradura Acceso A',        tipo: 'cerradura',  ubicacion: 'Entrada bloque A',   estado_actual: true,  activo: true },
    { condominio_id: CONDOMINIO_ID, nombre: 'Cerradura Acceso B',        tipo: 'cerradura',  ubicacion: 'Entrada bloque B',   estado_actual: false, activo: true },
    { condominio_id: CONDOMINIO_ID, nombre: 'Termostato Lobby',          tipo: 'termostato', ubicacion: 'Lobby principal',    estado_actual: true,  activo: true },
    { condominio_id: CONDOMINIO_ID, nombre: 'Termostato Piscina',        tipo: 'termostato', ubicacion: 'Área piscina',       estado_actual: false, activo: true },
  ];
  const { error: iotErr } = await supabase.from('dispositivos_iot').insert(iot);
  if (iotErr) { console.error('  ❌ IoT:', iotErr.message); } else { console.log('  ✅ Dispositivos IoT OK (8)'); }

  // Verificación final
  console.log('\n📊 Verificando conteos...');
  const tablas = ['condominios', 'unidades', 'usuarios', 'transacciones', 'tickets_tecnicos', 'dispositivos_iot'];
  for (const tabla of tablas) {
    const { count } = await supabase.from(tabla).select('*', { count: 'exact', head: true }).eq('condominio_id', CONDOMINIO_ID);
    console.log(`  ${tabla}: ${count ?? 0} registros`);
  }

  console.log('\n✅ ¡Setup completado! Abre http://localhost:5175/ para ver los datos reales.');
}

main().catch(console.error);

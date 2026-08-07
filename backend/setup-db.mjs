/**
 * Script para aplicar schema y seed data a Supabase
 * Ejecutar con: node setup-db.mjs
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const CONDOMINIO_ID = process.env.CONDOMINIO_ID ?? 'a1b2c3d4-0000-0000-0000-000000000001';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Falta SUPABASE_URL o SUPABASE_ANON_KEY en backend/.env');
  process.exit(1);
}

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
    { id: 'u0000001-0000-0000-0000-000000000001', condominio_id: CONDOMINIO_ID, numero_apartamento: '101', bloque: 'A', piso: 1, cuota_mantenimiento: 8500.00, activo: true },
    { id: 'u0000002-0000-0000-0000-000000000001', condominio_id: CONDOMINIO_ID, numero_apartamento: '102', bloque: 'A', piso: 1, cuota_mantenimiento: 8500.00, activo: true },
    { id: 'u0000003-0000-0000-0000-000000000001', condominio_id: CONDOMINIO_ID, numero_apartamento: '203', bloque: 'B', piso: 2, cuota_mantenimiento: 9200.00, activo: true },
    { id: 'u0000004-0000-0000-0000-000000000001', condominio_id: CONDOMINIO_ID, numero_apartamento: '305', bloque: 'C', piso: 3, cuota_mantenimiento: 9200.00, activo: true },
    { id: 'u0000005-0000-0000-0000-000000000001', condominio_id: CONDOMINIO_ID, numero_apartamento: '401', bloque: 'D', piso: 4, cuota_mantenimiento: 11000.00, activo: true },
  ];
  const { error: unidErr } = await supabase.from('unidades').upsert(unidades, { onConflict: 'id' });
  if (unidErr) { console.error('  ❌ Unidades:', unidErr.message); } else { console.log('  ✅ Unidades OK (5)'); }

  // 3. Usuarios (inquilinos)
  console.log('👥 Insertando inquilinos...');
  const usuarios = [
    { id: 'f1000001-0000-0000-0000-000000000001', email: 'maria.gonzalez@email.com', nombre_completo: 'María González', telefono: '809-555-0101', rol: 'inquilino', condominio_id: CONDOMINIO_ID, unidad_id: 'u0000001-0000-0000-0000-000000000001', activo: true },
    { id: 'f1000002-0000-0000-0000-000000000001', email: 'carlos.ramirez@email.com',  nombre_completo: 'Carlos Ramírez',  telefono: '809-555-0202', rol: 'inquilino', condominio_id: CONDOMINIO_ID, unidad_id: 'u0000002-0000-0000-0000-000000000001', activo: true },
    { id: 'f1000003-0000-0000-0000-000000000001', email: 'ana.martinez@email.com',    nombre_completo: 'Ana Martínez',    telefono: '809-555-0303', rol: 'inquilino', condominio_id: CONDOMINIO_ID, unidad_id: 'u0000003-0000-0000-0000-000000000001', activo: true },
    { id: 'f1000004-0000-0000-0000-000000000001', email: 'luis.perez@email.com',      nombre_completo: 'Luis Pérez',      telefono: '809-555-0404', rol: 'inquilino', condominio_id: CONDOMINIO_ID, unidad_id: null, activo: true },
    { id: 'f1000005-0000-0000-0000-000000000001', email: 'carmen.jimenez@email.com',  nombre_completo: 'Carmen Jiménez',  telefono: '829-555-0505', rol: 'inquilino', condominio_id: CONDOMINIO_ID, unidad_id: 'u0000004-0000-0000-0000-000000000001', activo: true },
  ];
  const { error: userErr } = await supabase.from('usuarios').upsert(usuarios, { onConflict: 'id' });
  if (userErr) { console.error('  ❌ Usuarios:', userErr.message); } else { console.log('  ✅ Usuarios OK (5)'); }

  // 4. Transacciones
  console.log('💰 Insertando transacciones...');
  const tx = [
    { condominio_id: CONDOMINIO_ID, unidad_id: 'u0000001-0000-0000-0000-000000000001', monto: 8500.00,  tipo_servicio: 'mantenimiento', concepto: 'Cuota Mayo 2026',      estado: 'pagado',   metodo_pago: 'transferencia', fecha_vencimiento: '2026-05-05', fecha_pago: '2026-05-01' },
    { condominio_id: CONDOMINIO_ID, unidad_id: 'u0000002-0000-0000-0000-000000000001', monto: 8500.00,  tipo_servicio: 'mantenimiento', concepto: 'Cuota Mayo 2026',      estado: 'pagado',   metodo_pago: 'billetera',     fecha_vencimiento: '2026-05-05', fecha_pago: '2026-04-30' },
    { condominio_id: CONDOMINIO_ID, unidad_id: 'u0000003-0000-0000-0000-000000000001', monto: 9200.00,  tipo_servicio: 'mantenimiento', concepto: 'Cuota Mayo 2026',      estado: 'pendiente',metodo_pago: null,            fecha_vencimiento: '2026-05-05', fecha_pago: null },
    { condominio_id: CONDOMINIO_ID, unidad_id: 'u0000004-0000-0000-0000-000000000001', monto: 9200.00,  tipo_servicio: 'mantenimiento', concepto: 'Cuota Mayo 2026',      estado: 'pagado',   metodo_pago: 'tarjeta',       fecha_vencimiento: '2026-05-05', fecha_pago: '2026-04-29' },
    { condominio_id: CONDOMINIO_ID, unidad_id: 'u0000001-0000-0000-0000-000000000001', monto: 3200.00,  tipo_servicio: 'fondo_reserva', concepto: 'Fondo Reserva Q2',     estado: 'pagado',   metodo_pago: 'transferencia', fecha_vencimiento: '2026-04-30', fecha_pago: '2026-04-28' },
    { condominio_id: CONDOMINIO_ID, unidad_id: 'u0000005-0000-0000-0000-000000000001', monto: 11000.00, tipo_servicio: 'mantenimiento', concepto: 'Cuota Mayo 2026',      estado: 'pagado',   metodo_pago: 'transferencia', fecha_vencimiento: '2026-05-05', fecha_pago: '2026-05-01' },
    { condominio_id: CONDOMINIO_ID, unidad_id: 'u0000002-0000-0000-0000-000000000001', monto: 1800.00,  tipo_servicio: 'agua',          concepto: 'Consumo agua Abril',  estado: 'pagado',   metodo_pago: 'otro',          fecha_vencimiento: '2026-04-30', fecha_pago: '2026-04-25' },
    { condominio_id: CONDOMINIO_ID, unidad_id: 'u0000003-0000-0000-0000-000000000001', monto: 900.00,   tipo_servicio: 'luz',           concepto: 'Consumo luz Abril',   estado: 'pagado',   metodo_pago: 'billetera',     fecha_vencimiento: '2026-04-30', fecha_pago: '2026-04-26' },
  ];
  const { error: txErr } = await supabase.from('transacciones').insert(tx);
  if (txErr) { console.error('  ❌ Transacciones:', txErr.message); } else { console.log('  ✅ Transacciones OK (8)'); }

  // 5. Tickets
  console.log('🔧 Insertando tickets técnicos...');
  const tickets = [
    { condominio_id: CONDOMINIO_ID, unidad_id: 'u0000001-0000-0000-0000-000000000001', categoria: 'plomería',     titulo: 'Filtración en techo',          descripcion: 'Goteo en el pasillo principal',          estado: 'pendiente',   created_at: '2026-04-28T10:00:00Z' },
    { condominio_id: CONDOMINIO_ID, unidad_id: 'u0000002-0000-0000-0000-000000000001', categoria: 'electricidad', titulo: 'Ascensor B sin funcionar',     descripcion: 'Ascensor parado desde el lunes',         estado: 'en_progreso', created_at: '2026-04-27T09:00:00Z' },
    { condominio_id: CONDOMINIO_ID, unidad_id: 'u0000003-0000-0000-0000-000000000001', categoria: 'pintura',      titulo: 'Humedad en pared corredor',    descripcion: 'Mancha de humedad visible',               estado: 'completado',  created_at: '2026-04-20T14:00:00Z' },
    { condominio_id: CONDOMINIO_ID, unidad_id: 'u0000004-0000-0000-0000-000000000001', categoria: 'carpintería',  titulo: 'Puerta de acceso dañada',      descripcion: 'No cierra correctamente',                 estado: 'pendiente',   created_at: '2026-04-29T16:30:00Z' },
    { condominio_id: CONDOMINIO_ID, unidad_id: 'u0000005-0000-0000-0000-000000000001', categoria: 'jardinería',   titulo: 'Sistema de riego automático',  descripcion: 'No enciende en horario programado',      estado: 'en_progreso', created_at: '2026-04-26T11:00:00Z' },
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

  // 7. Áreas comunes
  console.log('🏊 Insertando áreas comunes...');
  const areas = [
    { id: 'ac000001-0000-0000-0000-000000000001', condominio_id: CONDOMINIO_ID, nombre: 'Piscina',           descripcion: 'Piscina olímpica con area de descanso', capacidad: 20,  requiere_aprobacion: false, activo: true },
    { id: 'ac000002-0000-0000-0000-000000000002', condominio_id: CONDOMINIO_ID, nombre: 'Salón de Eventos',  descripcion: 'Salón para celebraciones y reuniones',   capacidad: 80,  requiere_aprobacion: true,  activo: true },
    { id: 'ac000003-0000-0000-0000-000000000003', condominio_id: CONDOMINIO_ID, nombre: 'Gimnasio',          descripcion: 'Equipos cardiovasculares y de fuerza',   capacidad: 10,  requiere_aprobacion: false, activo: true },
    { id: 'ac000004-0000-0000-0000-000000000004', condominio_id: CONDOMINIO_ID, nombre: 'Cancha Multiuso',   descripcion: 'Cancha para fútbol, básquetbol y más',   capacidad: 22,  requiere_aprobacion: false, activo: true },
  ];
  const { error: areasErr } = await supabase.from('areas_comunes').upsert(areas, { onConflict: 'id' });
  if (areasErr) { console.error('  ❌ Áreas comunes:', areasErr.message); } else { console.log('  ✅ Áreas comunes OK (4)'); }

  // 8. Reservas demo
  console.log('📅 Insertando reservas demo...');
  const hoy = new Date().toISOString().split('T')[0];
  const manana = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const reservas = [
    { condominio_id: CONDOMINIO_ID, area_id: 'ac000001-0000-0000-0000-000000000001', usuario_id: 'f1000001-0000-0000-0000-000000000001', unidad_id: 'u0000001-0000-0000-0000-000000000001', fecha: hoy,    hora_inicio: '10:00', hora_fin: '12:00', proposito: 'Tarde de natación familiar', num_asistentes: 4, estado: 'confirmada' },
    { condominio_id: CONDOMINIO_ID, area_id: 'ac000002-0000-0000-0000-000000000002', usuario_id: 'f1000002-0000-0000-0000-000000000001', unidad_id: 'u0000002-0000-0000-0000-000000000001', fecha: manana, hora_inicio: '18:00', hora_fin: '23:00', proposito: 'Cumpleaños de Ana', num_asistentes: 50, estado: 'pendiente' },
    { condominio_id: CONDOMINIO_ID, area_id: 'ac000003-0000-0000-0000-000000000003', usuario_id: 'f1000003-0000-0000-0000-000000000001', unidad_id: 'u0000003-0000-0000-0000-000000000001', fecha: hoy,    hora_inicio: '07:00', hora_fin: '08:30', proposito: 'Entrenamiento matutino', num_asistentes: 1,  estado: 'confirmada' },
  ];
  const { error: resErr } = await supabase.from('reservas').insert(reservas);
  if (resErr) { console.error('  ❌ Reservas:', resErr.message); } else { console.log('  ✅ Reservas demo OK (3)'); }

  // 9. Visitantes demo
  console.log('👤 Insertando visitantes demo...');
  const ahora = new Date();
  const haceDoHoras  = new Date(ahora - 2 * 3600000).toISOString();
  const ayer         = new Date(ahora - 86400000).toISOString();
  const ayerMas15h   = new Date(ahora - 86400000 + 90 * 60000).toISOString();
  const visitantes = [
    {
      condominio_id: CONDOMINIO_ID, unidad_id: 'u0000001-0000-0000-0000-000000000001',
      nombre_visitante: 'José Herrera', tipo_documento: 'cedula',
      numero_documento: '001-0012345-6', hora_entrada: haceDoHoras, hora_salida: null,
      registrado_por: null, notas: 'Visita familiar',
    },
    {
      condominio_id: CONDOMINIO_ID, unidad_id: null,
      nombre_visitante: 'Servicios CLARO', tipo_documento: 'otro',
      placa_vehiculo: 'A123456', hora_entrada: ayer, hora_salida: ayerMas15h,
      registrado_por: null, notas: 'Instalación de fibra óptica',
    },
    {
      condominio_id: CONDOMINIO_ID, unidad_id: 'u0000002-0000-0000-0000-000000000001',
      nombre_visitante: 'Laura Peña', tipo_documento: 'cedula',
      numero_documento: '001-9876543-2', hora_entrada: ahora.toISOString(), hora_salida: null,
      registrado_por: null, notas: null,
    },
  ];
  const { error: visErr } = await supabase.from('visitantes').insert(visitantes);
  if (visErr) { console.error('  ❌ Visitantes:', visErr.message); } else { console.log('  ✅ Visitantes demo OK (3)'); }

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

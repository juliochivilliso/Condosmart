import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class IotScreen extends StatefulWidget {
  const IotScreen({super.key});

  @override
  State<IotScreen> createState() => _IotScreenState();
}

class _IotScreenState extends State<IotScreen> {
  List<Map<String, dynamic>> _dispositivos = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchDispositivos();
  }

  Future<void> _fetchDispositivos() async {
    setState(() => _loading = true);
    try {
      final client = Supabase.instance.client;
      final userId = client.auth.currentUser?.id;
      if (userId == null) return;

      final userRes = await client
          .from('usuarios')
          .select('condominio_id')
          .eq('id', userId)
          .single();

      final condoId = userRes['condominio_id'] as String?;
      if (condoId == null) return;

      final data = await client
          .from('dispositivos_iot')
          .select('id, nombre, tipo, ubicacion, estado_actual, consumo_actual, activo')
          .eq('condominio_id', condoId)
          .eq('activo', true)
          .order('tipo')
          .order('nombre');

      if (mounted) setState(() => _dispositivos = List<Map<String, dynamic>>.from(data));
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  IconData _tipoIcono(String tipo) {
    switch (tipo) {
      case 'bomba_agua':   return Icons.water_drop_rounded;
      case 'luminaria':    return Icons.lightbulb_rounded;
      case 'cerradura':    return Icons.lock_rounded;
      case 'termostato':   return Icons.thermostat_rounded;
      default:             return Icons.device_hub_rounded;
    }
  }

  Color _tipoColor(String tipo) {
    switch (tipo) {
      case 'bomba_agua':   return const Color(0xFF3B82F6);
      case 'luminaria':    return const Color(0xFFF59E0B);
      case 'cerradura':    return const Color(0xFF8B5CF6);
      case 'termostato':   return const Color(0xFF10B981);
      default:             return const Color(0xFF6B7280);
    }
  }

  String _tipoLabel(String tipo) {
    switch (tipo) {
      case 'bomba_agua':   return 'Bomba de agua';
      case 'luminaria':    return 'Luminaria';
      case 'cerradura':    return 'Cerradura';
      case 'termostato':   return 'Termostato';
      default:             return tipo;
    }
  }

  Map<String, List<Map<String, dynamic>>> get _agrupados {
    final Map<String, List<Map<String, dynamic>>> grupos = {};
    for (final d in _dispositivos) {
      final tipo = d['tipo'] as String? ?? 'otro';
      grupos.putIfAbsent(tipo, () => []).add(d);
    }
    return grupos;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dispositivos IoT'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _fetchDispositivos,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _dispositivos.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.device_hub_rounded, size: 64, color: Colors.grey),
                      SizedBox(height: 12),
                      Text('Sin dispositivos registrados',
                          style: TextStyle(color: Colors.grey)),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _fetchDispositivos,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      // Resumen
                      _ResumenCard(dispositivos: _dispositivos),
                      const SizedBox(height: 20),

                      // Grupos por tipo
                      ..._agrupados.entries.map((entry) {
                        final tipo = entry.key;
                        final lista = entry.value;
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Padding(
                              padding: const EdgeInsets.only(bottom: 8, top: 4),
                              child: Row(
                                children: [
                                  Icon(_tipoIcono(tipo),
                                      size: 18, color: _tipoColor(tipo)),
                                  const SizedBox(width: 6),
                                  Text(
                                    _tipoLabel(tipo),
                                    style: TextStyle(
                                      fontWeight: FontWeight.w600,
                                      fontSize: 14,
                                      color: _tipoColor(tipo),
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Text('(${lista.length})',
                                      style: const TextStyle(
                                          fontSize: 12, color: Colors.grey)),
                                ],
                              ),
                            ),
                            ...lista.map((d) => _DeviceCard(
                                  dispositivo: d,
                                  iconoColor: _tipoColor(tipo),
                                  icono: _tipoIcono(tipo),
                                )),
                            const SizedBox(height: 12),
                          ],
                        );
                      }),
                    ],
                  ),
                ),
    );
  }
}

class _ResumenCard extends StatelessWidget {
  final List<Map<String, dynamic>> dispositivos;
  const _ResumenCard({required this.dispositivos});

  @override
  Widget build(BuildContext context) {
    final activos = dispositivos.where((d) => d['estado_actual'] == true).length;
    final total   = dispositivos.length;
    final consumo = dispositivos.fold<double>(
        0, (s, d) => s + ((d['consumo_actual'] as num?)?.toDouble() ?? 0));

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _Stat(label: 'Total', value: '$total', color: Colors.blueGrey),
            _Stat(label: 'Activos', value: '$activos',
                color: const Color(0xFF10B981)),
            _Stat(label: 'Consumo', value: '${consumo.toStringAsFixed(1)} kW',
                color: const Color(0xFFF59E0B)),
          ],
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  final String label, value;
  final Color color;
  const _Stat({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value,
            style: TextStyle(
                fontSize: 22, fontWeight: FontWeight.bold, color: color)),
        const SizedBox(height: 2),
        Text(label,
            style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }
}

class _DeviceCard extends StatelessWidget {
  final Map<String, dynamic> dispositivo;
  final Color iconoColor;
  final IconData icono;
  const _DeviceCard(
      {required this.dispositivo,
      required this.iconoColor,
      required this.icono});

  @override
  Widget build(BuildContext context) {
    final encendido = dispositivo['estado_actual'] == true;
    final consumo   = (dispositivo['consumo_actual'] as num?)?.toDouble() ?? 0;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: iconoColor.withOpacity(0.15),
          child: Icon(icono, color: iconoColor, size: 22),
        ),
        title: Text(
          dispositivo['nombre'] as String? ?? '—',
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
        subtitle: Text(
          dispositivo['ubicacion'] as String? ?? '—',
          style: const TextStyle(fontSize: 12),
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: encendido
                    ? const Color(0xFF10B981).withOpacity(0.15)
                    : Colors.grey.withOpacity(0.15),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                    color: encendido
                        ? const Color(0xFF10B981).withOpacity(0.4)
                        : Colors.grey.withOpacity(0.4)),
              ),
              child: Text(
                encendido ? 'ON' : 'OFF',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: encendido ? const Color(0xFF10B981) : Colors.grey,
                ),
              ),
            ),
            if (encendido && consumo > 0) ...[
              const SizedBox(height: 4),
              Text('${consumo.toStringAsFixed(1)} kW',
                  style: const TextStyle(fontSize: 10, color: Colors.grey)),
            ],
          ],
        ),
      ),
    );
  }
}

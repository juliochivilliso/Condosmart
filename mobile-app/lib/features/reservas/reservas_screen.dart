import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ReservasScreen extends StatefulWidget {
  const ReservasScreen({super.key});

  @override
  State<ReservasScreen> createState() => _ReservasScreenState();
}

class _ReservasScreenState extends State<ReservasScreen> {
  bool _loading = true;
  List<Map<String, dynamic>> _areas = [];
  List<Map<String, dynamic>> _reservas = [];
  String? _condominioId;
  String? _userId;

  // Form state
  String? _formAreaId;
  DateTime _formFecha = DateTime.now();
  TimeOfDay _formHoraInicio = const TimeOfDay(hour: 8, minute: 0);
  TimeOfDay _formHoraFin = const TimeOfDay(hour: 10, minute: 0);
  String _formProposito = '';

  static final _supabase = Supabase.instance.client;

  @override
  void initState() {
    super.initState();
    _initData();
  }

  Future<void> _initData() async {
    final user = _supabase.auth.currentUser;
    if (user == null) {
      setState(() => _loading = false);
      return;
    }
    _userId = user.id;

    try {
      final userRow = await _supabase
          .from('usuarios')
          .select('condominio_id')
          .eq('id', user.id)
          .maybeSingle();

      _condominioId = userRow?['condominio_id'];
      await Future.wait([_loadAreas(), _loadReservas()]);
    } catch (_) {
      _loadSeedData();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadAreas() async {
    if (_condominioId == null) return;
    try {
      final data = await _supabase
          .from('areas_comunes')
          .select('id, nombre, capacidad, requiere_aprobacion')
          .eq('condominio_id', _condominioId!)
          .eq('activo', true);
      if (mounted) setState(() => _areas = List<Map<String, dynamic>>.from(data));
    } catch (_) {
      _areas = _seedAreas();
    }
  }

  Future<void> _loadReservas() async {
    if (_condominioId == null) return;
    try {
      final data = await _supabase
          .from('reservas')
          .select('''
            id, area_id, usuario_id, fecha, hora_inicio, hora_fin,
            proposito, num_asistentes, estado,
            areas_comunes(nombre),
            usuarios(nombre_completo)
          ''')
          .eq('condominio_id', _condominioId!)
          .order('fecha', ascending: false)
          .limit(30);
      if (mounted) setState(() => _reservas = List<Map<String, dynamic>>.from(data));
    } catch (_) {
      _reservas = _seedReservas();
    }
  }

  void _loadSeedData() {
    _areas = _seedAreas();
    _reservas = _seedReservas();
  }

  List<Map<String, dynamic>> _seedAreas() => [
    {'id': '1', 'nombre': 'Piscina',          'capacidad': 20, 'requiere_aprobacion': false},
    {'id': '2', 'nombre': 'Salón de Eventos',  'capacidad': 80, 'requiere_aprobacion': true},
    {'id': '3', 'nombre': 'Gimnasio',          'capacidad': 10, 'requiere_aprobacion': false},
    {'id': '4', 'nombre': 'Cancha Multiuso',   'capacidad': 22, 'requiere_aprobacion': false},
  ];

  List<Map<String, dynamic>> _seedReservas() {
    final hoy = DateTime.now().toIso8601String().split('T').first;
    final manana = DateTime.now().add(const Duration(days: 1)).toIso8601String().split('T').first;
    return [
      {'id': 'r1', 'fecha': hoy,    'hora_inicio': '10:00', 'hora_fin': '12:00', 'proposito': 'Natación familiar',    'num_asistentes': 4,  'estado': 'confirmada', 'areas_comunes': {'nombre': 'Piscina'},          'usuarios': {'nombre_completo': 'María González'}},
      {'id': 'r2', 'fecha': manana, 'hora_inicio': '18:00', 'hora_fin': '23:00', 'proposito': 'Cumpleaños de Ana',   'num_asistentes': 50, 'estado': 'pendiente',  'areas_comunes': {'nombre': 'Salón de Eventos'}, 'usuarios': {'nombre_completo': 'Carlos Ramírez'}},
      {'id': 'r3', 'fecha': hoy,    'hora_inicio': '07:00', 'hora_fin': '08:30', 'proposito': 'Entrenamiento matut.', 'num_asistentes': 1,  'estado': 'confirmada', 'areas_comunes': {'nombre': 'Gimnasio'},         'usuarios': {'nombre_completo': 'Ana Martínez'}},
    ];
  }

  IconData _areaIcon(String nombre) {
    final n = nombre.toLowerCase();
    if (n.contains('piscina') || n.contains('agua')) return Icons.pool_rounded;
    if (n.contains('gimnas'))                         return Icons.fitness_center_rounded;
    if (n.contains('sal') || n.contains('event'))    return Icons.celebration_rounded;
    return Icons.sports_rounded;
  }

  Color _estadoColor(String estado) {
    switch (estado) {
      case 'confirmada': return Colors.green;
      case 'pendiente':  return Colors.amber;
      case 'cancelada':  return Colors.red;
      default:           return Colors.grey;
    }
  }

  String _formatTime(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  Future<void> _crearReserva() async {
    if (_formAreaId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecciona un área')),
      );
      return;
    }
    try {
      await _supabase.from('reservas').insert({
        'area_id':        _formAreaId,
        'condominio_id':  _condominioId,
        'usuario_id':     _userId,
        'fecha':          _formFecha.toIso8601String().split('T').first,
        'hora_inicio':    _formatTime(_formHoraInicio),
        'hora_fin':       _formatTime(_formHoraFin),
        'proposito':      _formProposito.isNotEmpty ? _formProposito : null,
        'num_asistentes': 1,
      });
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ Reserva creada exitosamente')),
        );
        await _loadReservas();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _showReservaDialog() {
    _formAreaId = _areas.isNotEmpty ? _areas.first['id'] : null;
    _formFecha = DateTime.now();
    _formHoraInicio = const TimeOfDay(hour: 8, minute: 0);
    _formHoraFin = const TimeOfDay(hour: 10, minute: 0);
    _formProposito = '';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Nueva Reserva'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Área
                const Text('Área', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                DropdownButton<String>(
                  isExpanded: true,
                  value: _formAreaId,
                  items: _areas.map((a) => DropdownMenuItem(
                    value: a['id'] as String,
                    child: Text('${a['nombre']} (cap. ${a['capacidad']})'),
                  )).toList(),
                  onChanged: (v) => setDialogState(() => _formAreaId = v),
                ),
                const SizedBox(height: 12),

                // Fecha
                const Text('Fecha', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                TextButton.icon(
                  icon: const Icon(Icons.calendar_today_rounded),
                  label: Text(
                    '${_formFecha.day}/${_formFecha.month}/${_formFecha.year}',
                  ),
                  onPressed: () async {
                    final picked = await showDatePicker(
                      context: ctx,
                      initialDate: _formFecha,
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 90)),
                    );
                    if (picked != null) setDialogState(() => _formFecha = picked);
                  },
                ),
                const SizedBox(height: 12),

                // Hora inicio
                const Text('Hora inicio', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                TextButton.icon(
                  icon: const Icon(Icons.access_time_rounded),
                  label: Text(_formHoraInicio.format(ctx)),
                  onPressed: () async {
                    final picked = await showTimePicker(
                      context: ctx,
                      initialTime: _formHoraInicio,
                    );
                    if (picked != null) setDialogState(() => _formHoraInicio = picked);
                  },
                ),
                const SizedBox(height: 8),

                // Hora fin
                const Text('Hora fin', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                TextButton.icon(
                  icon: const Icon(Icons.access_time_filled_rounded),
                  label: Text(_formHoraFin.format(ctx)),
                  onPressed: () async {
                    final picked = await showTimePicker(
                      context: ctx,
                      initialTime: _formHoraFin,
                    );
                    if (picked != null) setDialogState(() => _formHoraFin = picked);
                  },
                ),
                const SizedBox(height: 12),

                // Propósito
                const Text('Propósito', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                TextField(
                  decoration: const InputDecoration(
                    hintText: 'Ej: Reunión de vecinos...',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                  onChanged: (v) => _formProposito = v,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: _crearReserva,
              child: const Text('Confirmar'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // App Bar
          SliverAppBar(
            expandedHeight: 120,
            floating: false,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              title: const Text('Reservas', style: TextStyle(fontWeight: FontWeight.bold)),
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Theme.of(context).colorScheme.primary,
                      Theme.of(context).colorScheme.primary.withValues(alpha: 0.6),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // Grid de áreas
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            sliver: SliverGrid(
              delegate: SliverChildBuilderDelegate(
                (context, i) {
                  final area = _areas[i];
                  return Card(
                    elevation: 2,
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(_areaIcon(area['nombre'] ?? ''), size: 28,
                              color: Theme.of(context).colorScheme.primary),
                          const SizedBox(height: 8),
                          Text(area['nombre'] ?? '',
                              style: const TextStyle(fontWeight: FontWeight.bold),
                              maxLines: 1, overflow: TextOverflow.ellipsis),
                          const SizedBox(height: 4),
                          Text('Cap. ${area['capacidad']}',
                              style: Theme.of(context).textTheme.bodySmall),
                          if (area['requiere_aprobacion'] == true)
                            Container(
                              margin: const EdgeInsets.only(top: 4),
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.amber.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text('Aprobación',
                                  style: TextStyle(fontSize: 10, color: Colors.amber)),
                            ),
                        ],
                      ),
                    ),
                  );
                },
                childCount: _areas.length,
              ),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.3,
              ),
            ),
          ),

          // Título sección reservas
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Text('Reservas recientes',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ),

          // Lista de reservas
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, i) {
                final r = _reservas[i];
                final areaName = (r['areas_comunes'] as Map?)?['nombre'] ?? '—';
                final residenteName = (r['usuarios'] as Map?)?['nombre_completo'] ?? '—';
                final estado = r['estado'] ?? 'confirmada';
                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor: _estadoColor(estado).withValues(alpha: 0.15),
                    child: Icon(_areaIcon(areaName),
                        color: _estadoColor(estado), size: 20),
                  ),
                  title: Text(areaName, style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text('$residenteName · ${r['hora_inicio']}–${r['hora_fin']}'),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: _estadoColor(estado).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(estado,
                        style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: _estadoColor(estado))),
                  ),
                );
              },
              childCount: _reservas.length,
            ),
          ),

          const SliverPadding(padding: EdgeInsets.only(bottom: 80)),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showReservaDialog,
        icon: const Icon(Icons.calendar_month_rounded),
        label: const Text('Reservar'),
      ),
    );
  }
}

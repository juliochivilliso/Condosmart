import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _loading = true;
  String _nombre = '';
  Map<String, dynamic>? _unidad;
  int _pagosPendientes = 0;
  int _ticketsAbiertos = 0;
  int _notifNoLeidas = 0;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final client = Supabase.instance.client;
    final userId = client.auth.currentUser?.id;
    if (userId == null) return;

    try {
      // 1. Fetch user profile
      final userRes = await client
          .from('usuarios')
          .select('nombre_completo, unidad_id, condominio_id')
          .eq('id', userId)
          .maybeSingle();

      if (userRes == null) {
        setState(() {
          _nombre = client.auth.currentUser?.email ?? 'Usuario';
          _loading = false;
        });
        return;
      }

      _nombre = userRes['nombre_completo'] ?? 'Usuario';
      final unidadId = userRes['unidad_id'] as String?;
      final condominioId = userRes['condominio_id'] as String?;

      // 2. Fetch unidad details
      if (unidadId != null) {
        final unidadRes = await client
            .from('unidades')
            .select('numero_apartamento, bloque, piso, cuota_mantenimiento')
            .eq('id', unidadId)
            .maybeSingle();
        if (unidadRes != null) _unidad = unidadRes;
      }

      // 3. Pagos pendientes
      if (unidadId != null && condominioId != null) {
        final pagosRes = await client
            .from('transacciones')
            .select('id')
            .eq('unidad_id', unidadId)
            .eq('condominio_id', condominioId)
            .eq('estado', 'pendiente');
        _pagosPendientes = (pagosRes as List).length;
      }

      // 4. Tickets abiertos
      if (unidadId != null && condominioId != null) {
        final ticketsRes = await client
            .from('tickets_tecnicos')
            .select('id')
            .eq('unidad_id', unidadId)
            .eq('condominio_id', condominioId)
            .inFilter('estado', ['pendiente', 'asignado', 'en_progreso']);
        _ticketsAbiertos = (ticketsRes as List).length;
      }

      // 5. Notificaciones no leídas
      final notifRes = await client
          .from('notificaciones')
          .select('id')
          .eq('usuario_id', userId)
          .eq('leido', false);
      _notifNoLeidas = (notifRes as List).length;

      setState(() => _loading = false);
    } catch (e) {
      setState(() {
        _error = 'Error al cargar datos';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('CondoSmart'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            tooltip: 'Cerrar Sesión',
            onPressed: () async {
              await Supabase.instance.client.auth.signOut();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  // Saludo
                  Text(
                    'Hola, ${_nombre.split(' ').first} 👋',
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF1A365D),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Bienvenido a tu portal',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 24),

                  if (_error != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.orange.shade50,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.info_outline,
                              color: Colors.orange.shade700, size: 20),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(_error!,
                                style:
                                    TextStyle(color: Colors.orange.shade700)),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Mi Unidad card
                  if (_unidad != null) ...[
                    _buildUnitCard(theme),
                    const SizedBox(height: 20),
                  ],

                  // Summary cards
                  Text(
                    'Resumen',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF1A365D),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _SummaryCard(
                          icon: Icons.payments_rounded,
                          label: 'Pendientes',
                          value: '$_pagosPendientes',
                          color: _pagosPendientes > 0
                              ? Colors.orange
                              : Colors.green,
                          onTap: () => context.go('/pagos'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _SummaryCard(
                          icon: Icons.build_rounded,
                          label: 'Tickets',
                          value: '$_ticketsAbiertos',
                          color: _ticketsAbiertos > 0
                              ? Colors.blue
                              : Colors.green,
                          onTap: () => context.go('/tickets'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _SummaryCard(
                          icon: Icons.notifications_rounded,
                          label: 'Avisos',
                          value: '$_notifNoLeidas',
                          color: _notifNoLeidas > 0
                              ? Colors.red
                              : Colors.green,
                          onTap: () => context.go('/notificaciones'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildUnitCard(ThemeData theme) {
    return Card(
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: const LinearGradient(
            colors: [Color(0xFF1A365D), Color(0xFF2B6CB0)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child:
                      const Icon(Icons.home_rounded, color: Colors.white, size: 24),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Text(
                    'Mi Unidad',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                _UnitDetail(
                    label: 'Apartamento',
                    value: '#${_unidad!['numero_apartamento']}'),
                const SizedBox(width: 24),
                _UnitDetail(
                    label: 'Bloque',
                    value: _unidad!['bloque'] ?? '—'),
                const SizedBox(width: 24),
                _UnitDetail(
                    label: 'Piso', value: '${_unidad!['piso'] ?? '—'}'),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.attach_money_rounded,
                      color: Colors.white70, size: 18),
                  const SizedBox(width: 4),
                  Text(
                    'Cuota: RD\$${_formatMoney(_unidad!['cuota_mantenimiento'])}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatMoney(dynamic amount) {
    final num = double.tryParse(amount.toString()) ?? 0;
    return num
        .toStringAsFixed(2)
        .replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+\.)'), (m) => '${m[1]},');
  }
}

class _UnitDetail extends StatelessWidget {
  final String label;
  final String value;
  const _UnitDetail({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: TextStyle(
                color: Colors.white.withValues(alpha: 0.7), fontSize: 11)),
        const SizedBox(height: 2),
        Text(value,
            style: const TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold)),
      ],
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  final VoidCallback onTap;

  const _SummaryCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 12),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(height: 10),
              Text(
                value,
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

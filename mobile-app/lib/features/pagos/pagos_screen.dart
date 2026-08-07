import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class PagosScreen extends StatefulWidget {
  const PagosScreen({super.key});

  @override
  State<PagosScreen> createState() => _PagosScreenState();
}

class _PagosScreenState extends State<PagosScreen> {
  List<Map<String, dynamic>> _allPagos = [];
  List<Map<String, dynamic>> _filteredPagos = [];
  bool _loading = true;
  String _filtro = 'todos'; // todos | pendiente | pagado

  @override
  void initState() {
    super.initState();
    _loadPagos();
  }

  Future<void> _loadPagos() async {
    setState(() => _loading = true);
    final client = Supabase.instance.client;
    final userId = client.auth.currentUser?.id;
    if (userId == null) return;

    try {
      final userRes = await client
          .from('usuarios')
          .select('unidad_id, condominio_id')
          .eq('id', userId)
          .maybeSingle();

      if (userRes == null || userRes['unidad_id'] == null) {
        setState(() => _loading = false);
        return;
      }

      final res = await client
          .from('transacciones')
          .select('*')
          .eq('unidad_id', userRes['unidad_id'])
          .eq('condominio_id', userRes['condominio_id'])
          .order('created_at', ascending: false);

      setState(() {
        _allPagos = List<Map<String, dynamic>>.from(res);
        _applyFilter();
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  void _applyFilter() {
    if (_filtro == 'todos') {
      _filteredPagos = List.from(_allPagos);
    } else if (_filtro == 'pendiente') {
      _filteredPagos = _allPagos
          .where((pago) =>
              pago['estado'] == 'pendiente' ||
              pago['estado'] == 'vencido' ||
              pago['estado'] == 'pendiente_verificacion')
          .toList();
    } else {
      _filteredPagos = _allPagos
          .where((pago) => pago['estado'] == 'pagado')
          .toList();
    }
  }

  Color _estadoColor(String estado) {
    switch (estado) {
      case 'pagado':
        return Colors.green;
      case 'pendiente':
        return Colors.orange;
      case 'pendiente_verificacion':
        return Colors.blue;
      case 'vencido':
        return Colors.red;
      case 'cancelado':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  String _estadoLabel(String estado) {
    if (estado == 'pendiente_verificacion') {
      return 'POR VERIFICAR';
    }
    return estado.toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mis Pagos')),
      body: Column(
        children: [
          // Filtros
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                _FilterChip(
                  label: 'Todos',
                  selected: _filtro == 'todos',
                  onTap: () {
                    setState(() {
                      _filtro = 'todos';
                      _applyFilter();
                    });
                  },
                ),
                const SizedBox(width: 8),
                _FilterChip(
                  label: 'Pendientes',
                  selected: _filtro == 'pendiente',
                  onTap: () {
                    setState(() {
                      _filtro = 'pendiente';
                      _applyFilter();
                    });
                  },
                ),
                const SizedBox(width: 8),
                _FilterChip(
                  label: 'Pagados',
                  selected: _filtro == 'pagado',
                  onTap: () {
                    setState(() {
                      _filtro = 'pagado';
                      _applyFilter();
                    });
                  },
                ),
              ],
            ),
          ),

          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _filteredPagos.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.receipt_long_outlined,
                                size: 64, color: Colors.grey[300]),
                            const SizedBox(height: 12),
                            Text('No hay pagos',
                                style: TextStyle(color: Colors.grey[500])),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadPagos,
                        child: ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _filteredPagos.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final pago = _filteredPagos[index];
                            final estado = pago['estado'] ?? '';
                            final baseMonto = double.tryParse(pago['monto']?.toString() ?? '0') ?? 0;
                            final moraMonto = double.tryParse(pago['interes_mora']?.toString() ?? '0') ?? 0;
                            final totalMonto = baseMonto + moraMonto;

                            return Card(
                              child: ListTile(
                                contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 16, vertical: 8),
                                leading: Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    color: _estadoColor(estado)
                                        .withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Icon(Icons.receipt_rounded,
                                      color: _estadoColor(estado)),
                                ),
                                title: Text(
                                  pago['concepto'] ?? 'Sin concepto',
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600),
                                ),
                                subtitle: Row(
                                  children: [
                                    Container(
                                      margin: const EdgeInsets.only(top: 4),
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: _estadoColor(estado)
                                            .withValues(alpha: 0.12),
                                        borderRadius:
                                            BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        _estadoLabel(estado),
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w700,
                                          color: _estadoColor(estado),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: Text(
                                        (pago['tipo_servicio'] ?? '')
                                            .toString()
                                            .replaceAll('_', ' '),
                                        style: TextStyle(
                                            fontSize: 12,
                                            color: Colors.grey[500]),
                                      ),
                                    ),
                                  ],
                                ),
                                trailing: Text(
                                  'RD\$${totalMonto.toStringAsFixed(0)}',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                    color: estado == 'pendiente' || estado == 'vencido'
                                        ? Colors.orange.shade750 ?? Colors.orange.shade700
                                        : estado == 'pendiente_verificacion'
                                            ? Colors.blue.shade700
                                            : const Color(0xFF1A365D),
                                  ),
                                ),
                                onTap: () async {
                                  await context.push('/pagos/detalle/${pago['id']}');
                                  _loadPagos(); // Reload when returning
                                },
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFF1A365D) : Colors.grey[100],
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : Colors.grey[600],
            fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}

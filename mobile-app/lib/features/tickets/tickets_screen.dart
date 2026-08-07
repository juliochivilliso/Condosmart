import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';

class TicketsScreen extends StatefulWidget {
  const TicketsScreen({super.key});

  @override
  State<TicketsScreen> createState() => _TicketsScreenState();
}

class _TicketsScreenState extends State<TicketsScreen> {
  List<Map<String, dynamic>> _tickets = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadTickets();
  }

  Future<void> _loadTickets() async {
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
          .from('tickets_tecnicos')
          .select('*')
          .eq('unidad_id', userRes['unidad_id'])
          .eq('condominio_id', userRes['condominio_id'])
          .order('created_at', ascending: false);

      setState(() {
        _tickets = List<Map<String, dynamic>>.from(res);
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Color _estadoColor(String estado) {
    switch (estado) {
      case 'pendiente':
        return Colors.orange;
      case 'asignado':
        return Colors.purple;
      case 'en_progreso':
        return Colors.blue;
      case 'completado':
        return Colors.green;
      case 'rechazado':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _estadoLabel(String estado) {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'asignado':
        return 'Asignado';
      case 'en_progreso':
        return 'En Progreso';
      case 'completado':
        return 'Completado';
      case 'rechazado':
        return 'Rechazado';
      default:
        return estado;
    }
  }

  IconData _categoriaIcon(String categoria) {
    switch (categoria.toLowerCase()) {
      case 'plomeria':
      case 'plomería':
      case 'fontaneria':
        return Icons.plumbing;
      case 'electricidad':
        return Icons.electrical_services;
      case 'pintura':
        return Icons.format_paint;
      case 'carpinteria':
      case 'carpintería':
        return Icons.carpenter;
      case 'jardineria':
      case 'jardinería':
        return Icons.grass;
      case 'climatizacion':
        return Icons.ac_unit;
      case 'cerrajeria':
        return Icons.lock_open;
      case 'limpieza':
        return Icons.cleaning_services;
      default:
        return Icons.build;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mis Tickets')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await context.push('/tickets/nuevo');
          _loadTickets(); // Refresh after creating
        },
        icon: const Icon(Icons.add_rounded),
        label: const Text('Nuevo'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _tickets.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.build_outlined,
                          size: 64, color: Colors.grey[300]),
                      const SizedBox(height: 12),
                      Text('No hay tickets',
                          style: TextStyle(color: Colors.grey[500])),
                      const SizedBox(height: 8),
                      Text('Presiona + para crear uno',
                          style:
                              TextStyle(color: Colors.grey[400], fontSize: 13)),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadTickets,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _tickets.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final ticket = _tickets[index];
                      final estado = ticket['estado'] ?? '';
                      final categoria = ticket['categoria'] ?? '';
                      return Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: _estadoColor(estado)
                                      .withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Icon(_categoriaIcon(categoria),
                                    color: _estadoColor(estado)),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      ticket['titulo'] ?? '',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w600,
                                        fontSize: 15,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      ticket['descripcion'] ?? '',
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                          fontSize: 13,
                                          color: Colors.grey[600]),
                                    ),
                                    const SizedBox(height: 8),
                                    Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: _estadoColor(estado)
                                                .withValues(alpha: 0.12),
                                            borderRadius:
                                                BorderRadius.circular(6),
                                          ),
                                          child: Text(
                                            _estadoLabel(estado),
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w700,
                                              color: _estadoColor(estado),
                                            ),
                                          ),
                                        ),
                                        const Spacer(),
                                        Text(
                                          _formatDate(ticket['created_at']),
                                          style: TextStyle(
                                              fontSize: 11,
                                              color: Colors.grey[400]),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }

  String _formatDate(dynamic date) {
    if (date == null) return '';
    try {
      final d = DateTime.parse(date.toString());
      return DateFormat('dd/MM/yyyy').format(d);
    } catch (_) {
      return '';
    }
  }
}

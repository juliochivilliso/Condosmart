import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';

class TicketsTecnicoScreen extends StatefulWidget {
  const TicketsTecnicoScreen({super.key});

  @override
  State<TicketsTecnicoScreen> createState() => _TicketsTecnicoScreenState();
}

class _TicketsTecnicoScreenState extends State<TicketsTecnicoScreen> {
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
      final res = await client
          .from('tickets_tecnicos')
          .select('*, unidades(numero_apartamento)')
          .eq('tecnico_id', userId)
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
      case 'pendiente': return Colors.orange;
      case 'asignado': return Colors.purple;
      case 'en_progreso': return Colors.blue;
      case 'completado': return Colors.green;
      case 'rechazado': return Colors.red;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tickets Asignados'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadTickets,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _tickets.isEmpty
              ? const Center(child: Text('No tienes tickets asignados'))
              : RefreshIndicator(
                  onRefresh: _loadTickets,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _tickets.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final ticket = _tickets[index];
                      final unidad = ticket['unidades']?['numero_apartamento'] ?? 'N/A';
                      return Card(
                        child: InkWell(
                          onTap: () async {
                            await context.push('/tickets/tecnico/detalle/${ticket['id']}');
                            _loadTickets();
                          },
                          borderRadius: BorderRadius.circular(12),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: _estadoColor(ticket['estado']).withValues(alpha: 0.1),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        ticket['estado'].toString().toUpperCase(),
                                        style: TextStyle(
                                          color: _estadoColor(ticket['estado']),
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                    const Spacer(),
                                    Text(
                                      'Apt $unidad',
                                      style: const TextStyle(fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  ticket['titulo'] ?? '',
                                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  ticket['descripcion'] ?? '',
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(color: Colors.grey[600], fontSize: 13),
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Icon(Icons.calendar_today_outlined, size: 14, color: Colors.grey[400]),
                                    const SizedBox(width: 4),
                                    Text(
                                      DateFormat('dd MMM yyyy').format(DateTime.parse(ticket['created_at'])),
                                      style: TextStyle(color: Colors.grey[400], fontSize: 12),
                                    ),
                                    const Spacer(),
                                    const Icon(Icons.chevron_right, color: Colors.grey),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}

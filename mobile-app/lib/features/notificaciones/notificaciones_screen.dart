import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';

class NotificacionesScreen extends StatefulWidget {
  const NotificacionesScreen({super.key});

  @override
  State<NotificacionesScreen> createState() => _NotificacionesScreenState();
}

class _NotificacionesScreenState extends State<NotificacionesScreen> {
  List<Map<String, dynamic>> _notifs = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadNotificaciones();
  }

  Future<void> _loadNotificaciones() async {
    setState(() => _loading = true);
    final client = Supabase.instance.client;
    final userId = client.auth.currentUser?.id;
    if (userId == null) return;

    try {
      final res = await client
          .from('notificaciones')
          .select('*')
          .eq('usuario_id', userId)
          .order('created_at', ascending: false);

      setState(() {
        _notifs = List<Map<String, dynamic>>.from(res);
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _marcarLeida(String id) async {
    try {
      await Supabase.instance.client
          .from('notificaciones')
          .update({'leido': true, 'leido_en': DateTime.now().toIso8601String()})
          .eq('id', id);

      setState(() {
        final idx = _notifs.indexWhere((n) => n['id'] == id);
        if (idx != -1) _notifs[idx]['leido'] = true;
      });
    } catch (_) {}
  }

  IconData _tipoIcon(String tipo) {
    switch (tipo) {
      case 'pago':
        return Icons.payments_rounded;
      case 'tecnico':
        return Icons.build_rounded;
      case 'iot':
        return Icons.router_rounded;
      case 'anuncio':
        return Icons.campaign_rounded;
      case 'recordatorio':
        return Icons.alarm_rounded;
      case 'alerta':
        return Icons.warning_rounded;
      default:
        return Icons.notifications_rounded;
    }
  }

  Color _tipoColor(String tipo) {
    switch (tipo) {
      case 'pago':
        return Colors.green;
      case 'tecnico':
        return Colors.blue;
      case 'iot':
        return Colors.purple;
      case 'anuncio':
        return Colors.orange;
      case 'recordatorio':
        return Colors.teal;
      case 'alerta':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notificaciones')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _notifs.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.notifications_off_outlined,
                          size: 64, color: Colors.grey[300]),
                      const SizedBox(height: 12),
                      Text('Sin notificaciones',
                          style: TextStyle(color: Colors.grey[500])),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadNotificaciones,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _notifs.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final notif = _notifs[index];
                      final leido = notif['leido'] == true;
                      final tipo = notif['tipo'] ?? '';

                      return Card(
                        color: leido ? null : Colors.blue.shade50,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(16),
                          onTap: leido
                              ? null
                              : () => _marcarLeida(notif['id']),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: 42,
                                  height: 42,
                                  decoration: BoxDecoration(
                                    color: _tipoColor(tipo)
                                        .withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Icon(_tipoIcon(tipo),
                                      color: _tipoColor(tipo), size: 22),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: Text(
                                              notif['titulo'] ?? '',
                                              style: TextStyle(
                                                fontWeight: leido
                                                    ? FontWeight.w500
                                                    : FontWeight.w700,
                                                fontSize: 14,
                                              ),
                                            ),
                                          ),
                                          if (!leido)
                                            Container(
                                              width: 8,
                                              height: 8,
                                              decoration: const BoxDecoration(
                                                color: Colors.blue,
                                                shape: BoxShape.circle,
                                              ),
                                            ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        notif['mensaje'] ?? '',
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: Colors.grey[600],
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        _formatDate(notif['created_at']),
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: Colors.grey[400],
                                        ),
                                      ),
                                    ],
                                  ),
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

  String _formatDate(dynamic date) {
    if (date == null) return '';
    try {
      final d = DateTime.parse(date.toString());
      return DateFormat('dd/MM/yyyy HH:mm').format(d);
    } catch (_) {
      return '';
    }
  }
}

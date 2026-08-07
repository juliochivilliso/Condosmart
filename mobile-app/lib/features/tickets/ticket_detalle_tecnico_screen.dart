import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

class TicketDetalleTecnicoScreen extends StatefulWidget {
  final String ticketId;
  const TicketDetalleTecnicoScreen({super.key, required this.ticketId});

  @override
  State<TicketDetalleTecnicoScreen> createState() => _TicketDetalleTecnicoScreenState();
}

class _TicketDetalleTecnicoScreenState extends State<TicketDetalleTecnicoScreen> {
  Map<String, dynamic>? _ticket;
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _loadTicket();
  }

  Future<void> _loadTicket() async {
    try {
      final res = await Supabase.instance.client
          .from('tickets_tecnicos')
          .select('*, unidades(numero_apartamento)')
          .eq('id', widget.ticketId)
          .maybeSingle();
      setState(() {
        _ticket = res;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _updateStatus(String newStatus) async {
    setState(() => _saving = true);
    try {
      await Supabase.instance.client
          .from('tickets_tecnicos')
          .update({'estado': newStatus, 'updated_at': DateTime.now().toIso8601String()})
          .eq('id', widget.ticketId);
      
      _loadTicket();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Estado actualizado a $newStatus')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _subirEvidencia() async {
    final picker = ImagePicker();
    final XFile? image = await picker.pickImage(source: ImageSource.camera, imageQuality: 60);

    if (image == null) return;

    setState(() => _saving = true);
    try {
      final fileBytes = await image.readAsBytes();
      final fileExt = image.path.split('.').last;
      final path = 'evidencias/${widget.ticketId}_${DateTime.now().millisecondsSinceEpoch}.$fileExt';

      await Supabase.instance.client.storage
          .from('evidencias')
          .uploadBinary(path, fileBytes);

      final String publicUrl = Supabase.instance.client.storage
          .from('evidencias')
          .getPublicUrl(path);

      await Supabase.instance.client
          .from('tickets_tecnicos')
          .update({
            'foto_evidencia': publicUrl,
            'estado': 'completado',
            'updated_at': DateTime.now().toIso8601String()
          })
          .eq('id', widget.ticketId);

      _loadTicket();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Evidencia subida y ticket completado')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al subir evidencia: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_ticket == null) return const Scaffold(body: Center(child: Text('Ticket no encontrado')));

    final estado = _ticket!['estado'];

    return Scaffold(
      appBar: AppBar(title: const Text('Detalle del Ticket')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Row(
            children: [
              const Icon(Icons.apartment, color: Color(0xFF1A365D)),
              const SizedBox(width: 8),
              Text(
                'Unidad: Apt ${_ticket!['unidades']?['numero_apartamento'] ?? 'N/A'}',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(_ticket!['titulo'] ?? '', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(_ticket!['descripcion'] ?? '', style: TextStyle(color: Colors.grey[700])),
                  const Divider(height: 32),
                  _InfoRow(label: 'Estado Actual', value: estado.toString().toUpperCase(), color: _estadoColor(estado)),
                  _InfoRow(label: 'Categoría', value: _ticket!['categoria'] ?? 'General'),
                  _InfoRow(label: 'Fecha', value: DateFormat('dd/MM/yyyy HH:mm').format(DateTime.parse(_ticket!['created_at']))),
                ],
              ),
            ),
          ),
          const SizedBox(height: 32),
          if (estado != 'completado' && estado != 'rechazado') ...[
            const Text('Acciones del Técnico', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 12),
            if (estado == 'asignado')
              ElevatedButton(
                onPressed: _saving ? null : () => _updateStatus('en_progreso'),
                style: ElevatedButton.styleFrom(backgroundColor: Colors.blue, foregroundColor: Colors.white),
                child: const Text('Iniciar Trabajo'),
              ),
            if (estado == 'en_progreso')
              ElevatedButton.icon(
                onPressed: _saving ? null : _subirEvidencia,
                icon: const Icon(Icons.camera_alt),
                label: const Text('Completar con Evidencia'),
                style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
              ),
            const SizedBox(height: 8),
            if (estado != 'en_progreso')
              OutlinedButton(
                onPressed: _saving ? null : () => _updateStatus('rechazado'),
                style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                child: const Text('Rechazar / No se puede realizar'),
              ),
          ],
          if (_ticket!['foto_evidencia'] != null) ...[
            const SizedBox(height: 32),
            const Text('Evidencia de Finalización', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.network(_ticket!['foto_evidencia'], height: 200, width: double.infinity, fit: BoxFit.cover),
            ),
          ],
        ],
      ),
    );
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
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? color;
  const _InfoRow({required this.label, required this.value, this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey)),
          Text(value, style: TextStyle(fontWeight: FontWeight.w600, color: color)),
        ],
      ),
    );
  }
}

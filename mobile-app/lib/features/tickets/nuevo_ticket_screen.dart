import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class NuevoTicketScreen extends StatefulWidget {
  const NuevoTicketScreen({super.key});

  @override
  State<NuevoTicketScreen> createState() => _NuevoTicketScreenState();
}

class _NuevoTicketScreenState extends State<NuevoTicketScreen> {
  final _formKey = GlobalKey<FormState>();
  final _tituloController = TextEditingController();
  final _descripcionController = TextEditingController();
  String _categoria = 'plomeria';
  bool _saving = false;
  File? _foto;

  static const _categorias = [
    {'value': 'plomeria',      'label': 'Plomería',       'icon': Icons.plumbing},
    {'value': 'electricidad',  'label': 'Electricidad',    'icon': Icons.electrical_services},
    {'value': 'pintura',       'label': 'Pintura',         'icon': Icons.format_paint},
    {'value': 'carpinteria',   'label': 'Carpintería',     'icon': Icons.carpenter},
    {'value': 'jardineria',    'label': 'Jardinería',      'icon': Icons.grass},
    {'value': 'climatizacion', 'label': 'Climatización',   'icon': Icons.ac_unit},
    {'value': 'cerrajeria',    'label': 'Cerrajería',      'icon': Icons.lock_open},
    {'value': 'limpieza',      'label': 'Limpieza',        'icon': Icons.cleaning_services},
  ];

  @override
  void dispose() {
    _tituloController.dispose();
    _descripcionController.dispose();
    super.dispose();
  }

  Future<void> _seleccionarFoto(ImageSource source) async {
    try {
      final picked = await ImagePicker().pickImage(
        source: source,
        maxWidth: 1280,
        maxHeight: 1280,
        imageQuality: 80,
      );
      if (picked != null && mounted) {
        setState(() => _foto = File(picked.path));
      }
    } catch (_) {}
  }

  void _mostrarOpcionesFoto() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            ListTile(
              leading: const Icon(Icons.camera_alt_rounded),
              title: const Text('Tomar foto'),
              onTap: () {
                Navigator.pop(context);
                _seleccionarFoto(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_rounded),
              title: const Text('Elegir de galería'),
              onTap: () {
                Navigator.pop(context);
                _seleccionarFoto(ImageSource.gallery);
              },
            ),
            if (_foto != null)
              ListTile(
                leading: const Icon(Icons.delete_outline, color: Colors.red),
                title: const Text('Eliminar foto', style: TextStyle(color: Colors.red)),
                onTap: () {
                  Navigator.pop(context);
                  setState(() => _foto = null);
                },
              ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Future<String?> _subirFoto(String ticketId) async {
    if (_foto == null) return null;
    try {
      final ext = _foto!.path.split('.').last.toLowerCase();
      final path = '$ticketId.$ext';
      final bytes = await _foto!.readAsBytes();
      await Supabase.instance.client.storage
          .from('ticket-fotos')
          .uploadBinary(path, bytes,
              fileOptions: FileOptions(contentType: 'image/$ext', upsert: true));
      return Supabase.instance.client.storage
          .from('ticket-fotos')
          .getPublicUrl(path);
    } catch (_) {
      return null;
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final client = Supabase.instance.client;
      final userId = client.auth.currentUser?.id;
      if (userId == null) throw Exception('No autenticado');

      final userRes = await client
          .from('usuarios')
          .select('unidad_id, condominio_id')
          .eq('id', userId)
          .single();

      // Insertar ticket y obtener el ID generado
      final res = await client.from('tickets_tecnicos').insert({
        'condominio_id': userRes['condominio_id'],
        'unidad_id': userRes['unidad_id'],
        'titulo': _tituloController.text.trim(),
        'descripcion': _descripcionController.text.trim(),
        'categoria': _categoria,
        'estado': 'pendiente',
      }).select('id').single();

      // Subir foto si existe
      final fotoUrl = await _subirFoto(res['id'] as String);
      if (fotoUrl != null) {
        await client
            .from('tickets_tecnicos')
            .update({'foto_inicial': fotoUrl})
            .eq('id', res['id']);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Ticket creado exitosamente'),
            backgroundColor: Colors.green,
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Nuevo Ticket')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // Título
            Text('Título',
                style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: Colors.grey[700],
                    fontSize: 14)),
            const SizedBox(height: 8),
            TextFormField(
              controller: _tituloController,
              decoration: const InputDecoration(
                hintText: 'Ej. Filtración en el techo',
                prefixIcon: Icon(Icons.title_outlined),
              ),
              validator: (v) =>
                  v == null || v.trim().isEmpty ? 'Ingrese un título' : null,
            ),
            const SizedBox(height: 20),

            // Descripción
            Text('Descripción',
                style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: Colors.grey[700],
                    fontSize: 14)),
            const SizedBox(height: 8),
            TextFormField(
              controller: _descripcionController,
              maxLines: 4,
              decoration: const InputDecoration(
                hintText: 'Describa el problema en detalle...',
                alignLabelWithHint: true,
              ),
              validator: (v) => v == null || v.trim().isEmpty
                  ? 'Ingrese una descripción'
                  : null,
            ),
            const SizedBox(height: 20),

            // Categoría
            Text('Categoría',
                style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: Colors.grey[700],
                    fontSize: 14)),
            const SizedBox(height: 8),
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade300),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _categoria,
                  isExpanded: true,
                  items: _categorias
                      .map((c) => DropdownMenuItem<String>(
                            value: c['value'] as String,
                            child: Row(
                              children: [
                                Icon(c['icon'] as IconData,
                                    size: 20,
                                    color: const Color(0xFF1A365D)),
                                const SizedBox(width: 10),
                                Text(c['label'] as String),
                              ],
                            ),
                          ))
                      .toList(),
                  onChanged: (v) {
                    if (v != null) setState(() => _categoria = v);
                  },
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Foto
            Text('Foto del problema',
                style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: Colors.grey[700],
                    fontSize: 14)),
            const SizedBox(height: 8),
            GestureDetector(
              onTap: _mostrarOpcionesFoto,
              child: Container(
                height: _foto != null ? 200 : 100,
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                      color: Colors.grey.shade300, style: BorderStyle.solid),
                ),
                clipBehavior: Clip.antiAlias,
                child: _foto != null
                    ? Stack(
                        fit: StackFit.expand,
                        children: [
                          Image.file(_foto!, fit: BoxFit.cover),
                          Positioned(
                            top: 8,
                            right: 8,
                            child: GestureDetector(
                              onTap: () => setState(() => _foto = null),
                              child: Container(
                                padding: const EdgeInsets.all(4),
                                decoration: const BoxDecoration(
                                  color: Colors.black54,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.close,
                                    color: Colors.white, size: 18),
                              ),
                            ),
                          ),
                        ],
                      )
                    : Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.add_a_photo_outlined,
                              size: 32, color: Colors.grey.shade400),
                          const SizedBox(height: 6),
                          Text('Toca para agregar foto (opcional)',
                              style: TextStyle(
                                  color: Colors.grey.shade500, fontSize: 12)),
                        ],
                      ),
              ),
            ),
            const SizedBox(height: 36),

            // Submit
            ElevatedButton(
              onPressed: _saving ? null : _submit,
              child: _saving
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(
                          strokeWidth: 2.5, color: Colors.white),
                    )
                  : const Text('Crear Ticket'),
            ),
          ],
        ),
      ),
    );
  }
}

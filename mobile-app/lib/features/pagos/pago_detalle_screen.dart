import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';
import 'widgets/payment_gateway_widget.dart';

class PagoDetalleScreen extends StatefulWidget {
  final String pagoId;
  const PagoDetalleScreen({super.key, required this.pagoId});

  @override
  State<PagoDetalleScreen> createState() => _PagoDetalleScreenState();
}

class _PagoDetalleScreenState extends State<PagoDetalleScreen> {
  Map<String, dynamic>? _pago;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadPago();
  }

  Future<void> _loadPago() async {
    try {
      final res = await Supabase.instance.client
          .from('transacciones')
          .select('*')
          .eq('id', widget.pagoId)
          .maybeSingle();
      setState(() {
        _pago = res;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
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
      appBar: AppBar(title: const Text('Detalle de Pago')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _pago == null
              ? const Center(child: Text('Pago no encontrado'))
              : ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    // Monto principal
                    Center(
                      child: Column(
                        children: [
                          Text(
                            'RD\$${(double.tryParse(_pago!['monto'].toString()) ?? 0.00).toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontSize: 36,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF1A365D),
                            ),
                          ),
                          if (double.tryParse(_pago!['interes_mora']?.toString() ?? '0') != null &&
                              (double.tryParse(_pago!['interes_mora']?.toString() ?? '0') ?? 0) > 0)
                            Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text(
                                '+ RD\$${(double.tryParse(_pago!['interes_mora'].toString()) ?? 0.00).toStringAsFixed(2)} interés mora',
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w500,
                                  color: Colors.red,
                                ),
                              ),
                            ),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 6),
                            decoration: BoxDecoration(
                              color: _estadoColor(_pago!['estado'])
                                  .withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              _estadoLabel(_pago!['estado'] ?? ''),
                              style: TextStyle(
                                color: _estadoColor(_pago!['estado']),
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),

                    // Detalles
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          children: [
                            _DetailRow(
                              icon: Icons.description_outlined,
                              label: 'Concepto',
                              value: _pago!['concepto'] ?? '—',
                            ),
                            const Divider(height: 24),
                            _DetailRow(
                              icon: Icons.category_outlined,
                              label: 'Tipo',
                              value: (_pago!['tipo_servicio'] ?? '—')
                                  .toString()
                                  .replaceAll('_', ' '),
                            ),
                            const Divider(height: 24),
                            _DetailRow(
                              icon: Icons.payment_outlined,
                              label: 'Método de Pago',
                              value: (_pago!['metodo_pago'] ?? 'No especificado')
                                  .toString()
                                  .replaceAll('_', ' '),
                            ),
                            const Divider(height: 24),
                            _DetailRow(
                              icon: Icons.calendar_today_outlined,
                              label: 'Vencimiento',
                              value: _formatDate(_pago!['fecha_vencimiento']),
                            ),
                            if (_pago!['fecha_pago'] != null) ...[
                              const Divider(height: 24),
                              _DetailRow(
                                icon: Icons.check_circle_outline,
                                label: 'Fecha de Pago',
                                value: _formatDate(_pago!['fecha_pago']),
                              ),
                            ],
                            if (_pago!['capture_id'] != null) ...[
                              const Divider(height: 24),
                              _DetailRow(
                                icon: Icons.vpn_key_outlined,
                                label: 'ID Transacción (Capture)',
                                value: _pago!['capture_id'].toString(),
                              ),
                            ],
                            if (_pago!['referencia_pago'] != null) ...[
                              const Divider(height: 24),
                              _DetailRow(
                                icon: Icons.numbers_outlined,
                                label: 'Referencia de Transferencia',
                                value: _pago!['referencia_pago'].toString(),
                              ),
                            ],
                            if (_pago!['comprobante_url'] != null) ...[
                              const Divider(height: 24),
                              Row(
                                children: [
                                  const Icon(Icons.receipt_long_outlined, size: 20, color: Colors.grey),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: TextButton(
                                      onPressed: () {
                                        showDialog(
                                          context: context,
                                          builder: (context) => Dialog(
                                            child: Container(
                                              padding: const EdgeInsets.all(16),
                                              child: Column(
                                                mainAxisSize: MainAxisSize.min,
                                                children: [
                                                  const Text('Comprobante Adjunto', style: TextStyle(fontWeight: FontWeight.bold)),
                                                  const SizedBox(height: 12),
                                                  Image.network(_pago!['comprobante_url']),
                                                  const SizedBox(height: 12),
                                                  TextButton(
                                                    onPressed: () => Navigator.pop(context),
                                                    child: const Text('Cerrar'),
                                                  )
                                                ],
                                              ),
                                            ),
                                          ),
                                        );
                                      },
                                      style: TextButton.styleFrom(alignment: Alignment.centerLeft),
                                      child: const Text('Ver Imagen de Comprobante'),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 32),

                    if (_pago!['estado'] == 'pendiente_verificacion')
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.blue.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.blue.withValues(alpha: 0.2)),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.info_outline, color: Colors.blue),
                            SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                'Tu comprobante de transferencia bancaria está siendo validado por el administrador del residencial. Recibirás una notificación por correo al confirmarse.',
                                style: TextStyle(color: Colors.blue, fontSize: 13, height: 1.4, fontWeight: FontWeight.w500),
                              ),
                            )
                          ],
                        ),
                      ),

                    if (_pago!['estado'] != 'pagado' && _pago!['estado'] != 'pendiente_verificacion') ...[
                      ElevatedButton.icon(
                        onPressed: () {
                          showModalBottomSheet(
                            context: context,
                            isScrollControlled: true,
                            backgroundColor: Colors.white,
                            shape: const RoundedRectangleBorder(
                              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                            ),
                            builder: (context) {
                              final double baseMonto = double.tryParse(_pago!['monto'].toString()) ?? 0;
                              final double moraMonto = double.tryParse(_pago!['interes_mora']?.toString() ?? '0') ?? 0;
                              return Padding(
                                padding: EdgeInsets.only(
                                  left: 20,
                                  right: 20,
                                  top: 20,
                                  bottom: MediaQuery.of(context).viewInsets.bottom + 20,
                                ),
                                child: PaymentGatewayWidget(
                                  monto: baseMonto + moraMonto,
                                  concepto: _pago!['concepto'] ?? '',
                                  pagoId: _pago!['id'],
                                  condominioId: _pago!['condominio_id'] ?? '',
                                  onSuccess: () {
                                    Navigator.pop(context);
                                    _loadPago();
                                  },
                                  onCancel: () => Navigator.pop(context),
                                ),
                              );
                            },
                          );
                        },
                        icon: const Icon(Icons.payment_rounded),
                        label: const Text('Proceder a Pagar'),
                        style: ElevatedButton.styleFrom(
                          minimumSize: const Size(double.infinity, 54),
                          backgroundColor: const Color(0xFF1A365D),
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ],
                  ],
                ),
    );
  }

  String _formatDate(dynamic date) {
    if (date == null) return '—';
    try {
      final d = DateTime.parse(date.toString());
      return DateFormat('dd/MM/yyyy').format(d);
    } catch (_) {
      return date.toString();
    }
  }
}

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _DetailRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 20, color: Colors.grey[500]),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: TextStyle(fontSize: 12, color: Colors.grey[500])),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1A365D),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

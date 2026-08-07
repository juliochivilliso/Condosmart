import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:image_picker/image_picker.dart';

class PaymentGatewayWidget extends StatefulWidget {
  final double monto;
  final String concepto;
  final String pagoId;
  final String condominioId;
  final VoidCallback onSuccess;
  final VoidCallback onCancel;

  const PaymentGatewayWidget({
    super.key,
    required this.monto,
    required this.concepto,
    required this.pagoId,
    required this.condominioId,
    required this.onSuccess,
    required this.onCancel,
  });

  @override
  State<PaymentGatewayWidget> createState() => _PaymentGatewayWidgetState();
}

class _PaymentGatewayWidgetState extends State<PaymentGatewayWidget> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  
  // Card Form Controllers
  final _cardNameController = TextEditingController();
  final _cardNumberController = TextEditingController();
  final _cardExpiryController = TextEditingController();
  final _cardCvcController = TextEditingController();

  // Transfer Form Controllers
  final _transferRefController = TextEditingController();
  XFile? _comprobanteImage;
  
  bool _processing = false;
  String? _errorMessage;
  String? _successMessage;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _cardNameController.dispose();
    _cardNumberController.dispose();
    _cardExpiryController.dispose();
    _cardCvcController.dispose();
    _transferRefController.dispose();
    super.dispose();
  }

  // Pick receipt image from gallery
  Future<void> _seleccionarComprobante() async {
    try {
      final picker = ImagePicker();
      final XFile? image = await picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 70,
      );
      if (image != null) {
        setState(() {
          _comprobanteImage = image;
          _errorMessage = null;
        });
      }
    } catch (e) {
      setState(() => _errorMessage = 'Error al seleccionar imagen: $e');
    }
  }

  // Credit Card Submit
  Future<void> _pagarConTarjeta() async {
    final name = _cardNameController.text.trim();
    final number = _cardNumberController.text.replaceAll(' ', '');
    final expiry = _cardExpiryController.text.trim();
    final cvc = _cardCvcController.text.trim();

    if (name.isEmpty || number.length < 16 || expiry.length < 5 || cvc.length < 3) {
      setState(() => _errorMessage = 'Por favor complete todos los datos de la tarjeta.');
      return;
    }

    setState(() {
      _processing = true;
      _errorMessage = null;
    });

    // Simulate 3 seconds payment processing
    await Future.delayed(const Duration(seconds: 3));

    try {
      final lastDigit = number.substring(number.length - 1);
      final client = Supabase.instance.client;

      if (lastDigit == '0') {
        // Failed payment simulation
        setState(() {
          _errorMessage = 'Transacción rechazada. Fondos insuficientes (Código 51).';
          _processing = false;
        });
        
        await client.from('payment_attempts').insert({
          'transaccion_id': widget.pagoId,
          'resultado': 'rechazado',
          'codigo_error': 'DECLINED_CODE_51',
          'ultimos_4_digitos': number.substring(number.length - 4),
          'metodo_pago': 'tarjeta'
        });
      } else {
        // Successful payment simulation
        final capId = 'CS-TRJ-${DateTime.now().millisecondsSinceEpoch}';
        
        await client.from('transacciones').update({
          'estado': 'pagado',
          'metodo_pago': 'tarjeta',
          'fecha_pago': DateTime.now().toIso8601String(),
          'capture_id': capId,
          'referencia_pago': 'SIM-${DateTime.now().millisecondsSinceEpoch}',
          'interes_mora': 0,
          'updated_at': DateTime.now().toIso8601String(),
        }).eq('id', widget.pagoId);

        await client.from('payment_attempts').insert({
          'transaccion_id': widget.pagoId,
          'resultado': 'aprobado',
          'capture_id': capId,
          'ultimos_4_digitos': number.substring(number.length - 4),
          'metodo_pago': 'tarjeta'
        });

        // Trigger email notification via Edge Function (gracefully fails if not running)
        try {
          final userRes = await client.from('usuarios').select('email, nombre_completo').eq('id', client.auth.currentUser!.id).single();
          await client.functions.invoke('send-email', body: {
            'type': 'pago_confirmado',
            'to': userRes['email'],
            'data': {
              'nombre_completo': userRes['nombre_completo'],
              'concepto': widget.concepto,
              'monto': widget.monto,
              'fecha_vencimiento': DateTime.now().toIso8601String(), // placeholder
              'capture_id': capId,
              'condominio_nombre': 'Residencial Las Palmas'
            }
          });
        } catch (_) {}

        if (mounted) {
          setState(() {
            _successMessage = '¡Pago aprobado con éxito!';
            _processing = false;
          });
          Future.delayed(const Duration(milliseconds: 1200), widget.onSuccess);
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Error al procesar el pago: $e';
          _processing = false;
        });
      }
    }
  }

  // Bank Transfer Submit
  Future<void> _enviarTransferencia() async {
    final ref = _transferRefController.text.trim();
    if (ref.isEmpty) {
      setState(() => _errorMessage = 'Por favor ingrese la referencia de transferencia.');
      return;
    }
    if (_comprobanteImage == null) {
      setState(() => _errorMessage = 'Por favor adjunte la captura del comprobante.');
      return;
    }

    setState(() {
      _processing = true;
      _errorMessage = null;
    });

    try {
      final client = Supabase.instance.client;
      final fileBytes = await _comprobanteImage!.readAsBytes();
      final fileExt = _comprobanteImage!.path.split('.').last;
      final fileName = '${widget.pagoId}_${DateTime.now().millisecondsSinceEpoch}.$fileExt';
      final storagePath = 'comprobantes/$fileName';

      // 1. Upload to Supabase Storage
      await client.storage.from('comprobantes').uploadBinary(storagePath, fileBytes);
      final publicUrl = client.storage.from('comprobantes').getPublicUrl(storagePath);

      // 2. Update transaction to pendiente_verificacion
      await client.from('transacciones').update({
        'estado': 'pendiente_verificacion',
        'metodo_pago': 'transferencia',
        'referencia_pago': ref,
        'comprobante_url': publicUrl,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', widget.pagoId);

      // 3. Log attempt
      await client.from('payment_attempts').insert({
        'transaccion_id': widget.pagoId,
        'resultado': 'pendiente_verificacion',
        'metodo_pago': 'transferencia',
        'referencia_pago': ref
      });

      // Trigger notification email (gracefully fails if not running)
      try {
        final userRes = await client.from('usuarios').select('email, nombre_completo').eq('id', client.auth.currentUser!.id).single();
        await client.functions.invoke('send-email', body: {
          'type': 'pendiente_verificacion',
          'to': userRes['email'],
          'data': {
            'nombre_completo': userRes['nombre_completo'],
            'concepto': widget.concepto,
            'monto': widget.monto,
            'referencia': ref,
            'comprobante_url': publicUrl,
            'condominio_nombre': 'Residencial Las Palmas'
          }
        });
      } catch (_) {}

      if (mounted) {
        setState(() {
          _successMessage = '¡Comprobante enviado! Pendiente de validación.';
          _processing = false;
        });
        Future.delayed(const Duration(milliseconds: 1500), widget.onSuccess);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Error al subir transferencia: $e';
          _processing = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_processing) {
      return Container(
        height: 380,
        alignment: Alignment.center,
        child: const Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(color: Color(0xFF1A365D)),
            SizedBox(height: 16),
            Text('Procesando pago de forma segura...', style: TextStyle(fontWeight: FontWeight.w500)),
            SizedBox(height: 8),
            Text('No cierre la aplicación.', style: TextStyle(color: Colors.grey, fontSize: 12)),
          ],
        ),
      );
    }

    if (_successMessage != null) {
      return Container(
        height: 380,
        alignment: Alignment.center,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.check_circle_rounded, color: Colors.green, size: 64),
            const SizedBox(height: 16),
            Text(_successMessage!, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.green)),
          ],
        ),
      );
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // TabBar headers
        TabBar(
          controller: _tabController,
          labelColor: const Color(0xFF1A365D),
          unselectedLabelColor: Colors.grey,
          indicatorColor: const Color(0xFF1A365D),
          tabs: const [
            Tab(icon: Icon(Icons.credit_card), text: 'Tarjeta'),
            Tab(icon: Icon(Icons.account_balance_outlined), text: 'Transferencia'),
          ],
        ),
        const SizedBox(height: 16),

        // Error message
        if (_errorMessage != null)
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: Colors.red[550]?.withValues(alpha: 0.1) ?? Colors.red.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.red.withValues(alpha: 0.2)),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline, color: Colors.red),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(_errorMessage!, style: const TextStyle(color: Colors.red, fontSize: 13, fontWeight: FontWeight.w500)),
                ),
              ],
            ),
          ),

        // Tab Content
        SizedBox(
          height: 340,
          child: TabBarView(
            controller: _tabController,
            children: [
              _buildTarjetaForm(),
              _buildTransferenciaForm(),
            ],
          ),
        ),
      ],
    );
  }

  // Widget Tarjeta
  Widget _buildTarjetaForm() {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Tarjeta Virtual Mini Preview
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.15),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                )
              ]
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  mainAxisAlignment: MainAxisAlignment.between,
                  children: [
                    Text('Pasarela CondoSmart', style: TextStyle(color: Colors.grey, fontSize: 10, letterSpacing: 1.2)),
                    Icon(Icons.credit_card_outlined, color: Colors.white70),
                  ],
                ),
                const SizedBox(height: 16),
                ValueListenableBuilder(
                  valueListenable: _cardNumberController,
                  builder: (context, val, _) {
                    return Text(
                      val.text.isEmpty ? '•••• •••• •••• ••••' : val.text,
                      style: const TextStyle(color: Colors.white, fontSize: 16, fontFamily: 'monospace', letterSpacing: 2.0),
                    );
                  },
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.between,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Titular', style: TextStyle(color: Colors.grey, fontSize: 8)),
                          ValueListenableBuilder(
                            valueListenable: _cardNameController,
                            builder: (context, val, _) {
                              return Text(
                                val.text.isEmpty ? 'NOMBRE COMPLETO' : val.text.toUpperCase(),
                                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w500),
                                overflow: TextOverflow.ellipsis,
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text('Vence', style: TextStyle(color: Colors.grey, fontSize: 8)),
                        ValueListenableBuilder(
                          valueListenable: _cardExpiryController,
                          builder: (context, val, _) {
                            return Text(
                              val.text.isEmpty ? 'MM/YY' : val.text,
                              style: const TextStyle(color: Colors.white, fontSize: 11, fontFamily: 'monospace'),
                            );
                          },
                        ),
                      ],
                    ),
                  ],
                )
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Inputs
          TextFormField(
            controller: _cardNameController,
            decoration: const InputDecoration(labelText: 'Nombre del Titular', isDense: true),
            textCapitalization: TextCapitalization.characters,
          ),
          const SizedBox(height: 10),
          TextFormField(
            controller: _cardNumberController,
            decoration: const InputDecoration(labelText: 'Número de Tarjeta', placeholder: '4111 1111 1111 1111', isDense: true),
            keyboardType: TextInputType.number,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              CardNumberInputFormatter(),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: _cardExpiryController,
                  decoration: const InputDecoration(labelText: 'Vencimiento', placeholder: 'MM/YY', isDense: true),
                  keyboardType: TextInputType.number,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    CardExpiryInputFormatter(),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextFormField(
                  controller: _cardCvcController,
                  decoration: const InputDecoration(labelText: 'CVC', placeholder: '123', isDense: true),
                  keyboardType: TextInputType.number,
                  obscureText: true,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(4),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _pagarConTarjeta,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1A365D),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
            child: Text('Pagar RD\$${widget.monto.toStringAsFixed(0)}'),
          ),
        ],
      ),
    );
  }

  // Widget Transferencia
  Widget _buildTransferenciaForm() {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.blue.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.blue.withValues(alpha: 0.15)),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Datos para Transferencia:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF1A365D))),
                SizedBox(height: 4),
                Text('Banco: Banreservas\nCuenta Corriente: 960-123456-7\nBeneficiario: CondoSmart Residencial', style: TextStyle(fontSize: 11, height: 1.4)),
              ],
            ),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _transferRefController,
            decoration: const InputDecoration(labelText: 'Referencia de Transferencia', placeholder: 'Ej: TRF-123456', isDense: true),
          ),
          const SizedBox(height: 12),
          
          // Screenshot selector
          GestureDetector(
            onTap: _seleccionarComprobante,
            child: Container(
              height: 90,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey.shade300, style: BorderStyle.values[1]),
                borderRadius: BorderRadius.circular(8),
                color: Colors.grey.shade50,
              ),
              child: _comprobanteImage != null
                  ? Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.check_circle, color: Colors.green),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(_comprobanteImage!.name, style: const TextStyle(fontSize: 12, color: Colors.green, fontWeight: FontWeight.w500), overflow: TextOverflow.ellipsis),
                        ),
                        TextButton(onPressed: _seleccionarComprobante, child: const Text('Cambiar', style: TextStyle(fontSize: 12))),
                      ],
                    )
                  : const Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.upload_file_rounded, color: Colors.grey),
                        SizedBox(height: 4),
                        Text('Subir Captura de Comprobante', style: TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.w500)),
                      ],
                    ),
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _enviarTransferencia,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1A365D),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
            child: const Text('Enviar Transferencia'),
          ),
        ],
      ),
    );
  }
}

// Custom Formatters
class CardNumberInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    var text = newValue.text.replaceAll(' ', '');
    if (text.length > 16) text = text.substring(0, 16);
    
    var buffer = StringBuffer();
    for (int i = 0; i < text.length; i++) {
      buffer.write(text[i]);
      var nonZeroIndex = i + 1;
      if (nonZeroIndex % 4 == 0 && nonZeroIndex != text.length) {
        buffer.write(' ');
      }
    }
    
    var string = buffer.toString();
    return newValue.copyWith(
      text: string,
      selection: TextSelection.collapsed(offset: string.length),
    );
  }
}

class CardExpiryInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    var text = newValue.text.replaceAll('/', '');
    if (text.length > 4) text = text.substring(0, 4);
    
    var buffer = StringBuffer();
    for (int i = 0; i < text.length; i++) {
      buffer.write(text[i]);
      if (i == 1 && text.length > 2) {
        buffer.write('/');
      }
    }
    
    var string = buffer.toString();
    return newValue.copyWith(
      text: string,
      selection: TextSelection.collapsed(offset: string.length),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ShellScreen extends StatefulWidget {
  final Widget child;
  const ShellScreen({super.key, required this.child});

  @override
  State<ShellScreen> createState() => _ShellScreenState();
}

class _ShellScreenState extends State<ShellScreen> {
  String _role = 'inquilino';
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadRole();
  }

  Future<void> _loadRole() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user != null) {
      final res = await Supabase.instance.client
          .from('usuarios')
          .select('rol')
          .eq('id', user.id)
          .maybeSingle();
      if (res != null) {
        setState(() {
          _role = res['rol'] ?? 'inquilino';
          _loading = false;
        });
        return;
      }
    }
    setState(() => _loading = false);
  }

  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    if (_role == 'tecnico') {
      if (location.startsWith('/tickets')) return 1;
      if (location.startsWith('/notificaciones')) return 2;
      return 0;
    } else {
      if (location.startsWith('/pagos')) return 1;
      if (location.startsWith('/tickets')) return 2;
      if (location.startsWith('/reservas')) return 3;
      if (location.startsWith('/notificaciones')) return 4;
      if (location.startsWith('/iot')) return 5;
      return 0;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    return Scaffold(
      body: widget.child,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex(context),
        type: BottomNavigationBarType.fixed,
        onTap: (index) {
          if (_role == 'tecnico') {
            switch (index) {
              case 0: context.go('/'); break;
              case 1: context.go('/tickets/tecnico'); break;
              case 2: context.go('/notificaciones'); break;
            }
          } else {
            switch (index) {
              case 0: context.go('/'); break;
              case 1: context.go('/pagos'); break;
              case 2: context.go('/tickets'); break;
              case 3: context.go('/reservas'); break;
              case 4: context.go('/notificaciones'); break;
              case 5: context.go('/iot'); break;
            }
          }
        },
        items: _role == 'tecnico'
            ? const [
                BottomNavigationBarItem(
                  icon: Icon(Icons.home_rounded),
                  label: 'Inicio',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.build_rounded),
                  label: 'Mis Tickets',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.notifications_rounded),
                  label: 'Avisos',
                ),
              ]
            : const [
                BottomNavigationBarItem(
                  icon: Icon(Icons.home_rounded),
                  label: 'Inicio',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.payments_rounded),
                  label: 'Pagos',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.build_rounded),
                  label: 'Tickets',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.calendar_month_rounded),
                  label: 'Reservas',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.notifications_rounded),
                  label: 'Avisos',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.device_hub_rounded),
                  label: 'IoT',
                ),
              ],
      ),
    );
  }
}

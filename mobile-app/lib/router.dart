import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'features/auth/login_screen.dart';
import 'features/dashboard/home_screen.dart';
import 'features/pagos/pagos_screen.dart';
import 'features/pagos/pago_detalle_screen.dart';
import 'features/tickets/tickets_screen.dart';
import 'features/tickets/nuevo_ticket_screen.dart';
import 'features/tickets/tickets_tecnico_screen.dart';
import 'features/tickets/ticket_detalle_tecnico_screen.dart';
import 'features/notificaciones/notificaciones_screen.dart';
import 'features/iot/iot_screen.dart';
import 'features/reservas/reservas_screen.dart';
import 'shell_screen.dart';

final GoRouter appRouter = GoRouter(
  initialLocation: '/',
  redirect: (context, state) {
    final session = Supabase.instance.client.auth.currentSession;
    final isLoggingIn = state.matchedLocation == '/login';

    if (session == null && !isLoggingIn) return '/login';
    if (session != null && isLoggingIn) return null;
    return null;
  },
  routes: [
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    ShellRoute(
      builder: (context, state, child) => ShellScreen(child: child),
      routes: [
        GoRoute(
          path: '/',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: HomeScreen(),
          ),
        ),
        GoRoute(
          path: '/pagos',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: PagosScreen(),
          ),
          routes: [
            GoRoute(
              path: 'detalle/:id',
              builder: (context, state) => PagoDetalleScreen(
                pagoId: state.pathParameters['id']!,
              ),
            ),
          ],
        ),
        GoRoute(
          path: '/tickets',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: TicketsScreen(),
          ),
          routes: [
            GoRoute(
              path: 'nuevo',
              builder: (context, state) => const NuevoTicketScreen(),
            ),
            GoRoute(
              path: 'tecnico',
              builder: (context, state) => const TicketsTecnicoScreen(),
            ),
            GoRoute(
              path: 'tecnico/detalle/:id',
              builder: (context, state) => TicketDetalleTecnicoScreen(
                ticketId: state.pathParameters['id']!,
              ),
            ),
          ],
        ),
        GoRoute(
          path: '/notificaciones',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: NotificacionesScreen(),
          ),
        ),
        GoRoute(
          path: '/reservas',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: ReservasScreen(),
          ),
        ),
        GoRoute(
          path: '/iot',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: IotScreen(),
          ),
        ),
      ],
    ),
  ],
);

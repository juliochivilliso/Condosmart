import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'supabase_config.dart';
import 'router.dart';
import 'theme.dart';
import 'services/notification_service.dart';
import 'services/update_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: '.env');
  await SupabaseConfig.initialize();
  await NotificationService.initialize();

  final session = Supabase.instance.client.auth.currentSession;
  if (session != null) NotificationService.subscribeRealtime();

  Supabase.instance.client.auth.onAuthStateChange.listen((data) {
    if (data.session != null) {
      NotificationService.subscribeRealtime();
    } else {
      NotificationService.unsubscribe();
    }
  });

  runApp(const ProviderScope(child: CondoSmartApp()));
}

class CondoSmartApp extends StatefulWidget {
  const CondoSmartApp({super.key});

  @override
  State<CondoSmartApp> createState() => _CondoSmartAppState();
}

class _CondoSmartAppState extends State<CondoSmartApp> {
  final _navigatorKey = GlobalKey<NavigatorState>();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _checkUpdates());
  }

  Future<void> _checkUpdates() async {
    final ctx = _navigatorKey.currentContext ?? context;
    await UpdateService.checkForUpdates(ctx);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'CondoSmart',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      routerConfig: appRouter,
    );
  }
}

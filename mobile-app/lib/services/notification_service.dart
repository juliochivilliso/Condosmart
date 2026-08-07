import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class NotificationService {
  static final _plugin = FlutterLocalNotificationsPlugin();
  static RealtimeChannel? _channel;

  static Future<void> initialize() async {
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    await _plugin.initialize(
      const InitializationSettings(android: android, iOS: ios),
    );

    const androidChannel = AndroidNotificationChannel(
      'condosmart_channel',
      'CondoSmart',
      description: 'Notificaciones de CondoSmart',
      importance: Importance.high,
    );
    await _plugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(androidChannel);
  }

  static Future<void> show(String titulo, String mensaje) async {
    const details = NotificationDetails(
      android: AndroidNotificationDetails(
        'condosmart_channel',
        'CondoSmart',
        channelDescription: 'Notificaciones de CondoSmart',
        importance: Importance.high,
        priority: Priority.high,
        icon: '@mipmap/ic_launcher',
      ),
      iOS: DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      ),
    );
    await _plugin.show(
      DateTime.now().millisecondsSinceEpoch & 0x7FFFFFFF,
      titulo,
      mensaje,
      details,
    );
  }

  /// Suscribirse a nuevas notificaciones en tiempo real para el usuario actual.
  static void subscribeRealtime() {
    final client = Supabase.instance.client;
    final userId = client.auth.currentUser?.id;
    if (userId == null) return;

    _channel?.unsubscribe();

    _channel = client
        .channel('notificaciones:$userId')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'notificaciones',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'usuario_id',
            value: userId,
          ),
          callback: (payload) {
            final row = payload.newRecord;
            final titulo = row['titulo'] as String? ?? 'CondoSmart';
            final mensaje = row['mensaje'] as String? ?? '';
            show(titulo, mensaje);
          },
        )
        .subscribe();
  }

  static void unsubscribe() {
    _channel?.unsubscribe();
    _channel = null;
  }
}

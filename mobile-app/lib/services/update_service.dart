import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

// Versión actual de la app — debe coincidir con pubspec.yaml version
const _currentVersion = '1.0.0+1';

class UpdateService {
  static Future<void> checkForUpdates(BuildContext context) async {
    try {
      final data = await Supabase.instance.client
          .from('app_config')
          .select('latest_version, apk_url, release_notes')
          .eq('platform', 'android')
          .maybeSingle();

      if (data == null) return;

      final latestVersion = data['latest_version'] as String?;
      final apkUrl = data['apk_url'] as String?;
      final notes = data['release_notes'] as String?;

      if (latestVersion == null || apkUrl == null) return;
      if (!_isNewer(latestVersion, _currentVersion)) return;
      if (!context.mounted) return;

      _showUpdateDialog(context, latestVersion, apkUrl, notes);
    } catch (_) {
      // No interrumpir el flujo si falla el chequeo
    }
  }

  // Retorna true si versionA > versionB (compara build number)
  static bool _isNewer(String versionA, String versionB) {
    final buildA = int.tryParse(versionA.contains('+') ? versionA.split('+').last : '0') ?? 0;
    final buildB = int.tryParse(versionB.contains('+') ? versionB.split('+').last : '0') ?? 0;
    return buildA > buildB;
  }

  static void _showUpdateDialog(
    BuildContext context,
    String version,
    String apkUrl,
    String? notes,
  ) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        title: const Text('Nueva versión disponible'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Versión $version está disponible.'),
            if (notes != null && notes.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(notes, style: const TextStyle(fontSize: 13)),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Después'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              final uri = Uri.parse(apkUrl);
              if (await canLaunchUrl(uri)) {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
              }
            },
            child: const Text('Actualizar ahora'),
          ),
        ],
      ),
    );
  }
}

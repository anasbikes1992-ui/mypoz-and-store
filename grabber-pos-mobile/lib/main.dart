import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/config.dart';
import 'core/theme.dart';
import 'router.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (AppConfig.isConfigured) {
    await Supabase.initialize(
      url: AppConfig.supabaseUrl,
      anonKey: AppConfig.supabaseAnonKey,
    );
  }

  runApp(const ProviderScope(child: GrabberPosApp()));
}

class GrabberPosApp extends ConsumerWidget {
  const GrabberPosApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!AppConfig.isConfigured) {
      return MaterialApp(
        title: AppConfig.appName,
        theme: AppTheme.build(),
        home: const _MissingConfigScreen(),
      );
    }

    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: AppConfig.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.build(),
      routerConfig: router,
    );
  }
}

class _MissingConfigScreen extends StatelessWidget {
  const _MissingConfigScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(32),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'GRABBER POS',
                style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              const Text(
                'Supabase is not configured.\nRun with:\n\n'
                'flutter run \\\n'
                '  --dart-define=SUPABASE_URL=... \\\n'
                '  --dart-define=SUPABASE_ANON_KEY=...',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppTheme.textDim, height: 1.5),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

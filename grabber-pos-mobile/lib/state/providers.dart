import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../data/offline_queue.dart';
import '../data/pos_repository.dart';

final supabaseProvider = Provider<SupabaseClient>(
  (ref) => Supabase.instance.client,
);

final offlineQueueProvider = Provider<OfflineQueue>((ref) => OfflineQueue());

final repositoryProvider = Provider<PosRepository>(
  (ref) =>
      PosRepository(ref.read(supabaseProvider), ref.read(offlineQueueProvider)),
);

/// Streams Supabase auth state so the router can react to sign-in/out.
final authStateProvider = StreamProvider<AuthState>(
  (ref) => ref.read(supabaseProvider).auth.onAuthStateChange,
);

/// Number of sales still waiting to sync (drives the offline badge).
final pendingSyncProvider = FutureProvider<int>(
  (ref) => ref.read(offlineQueueProvider).length,
);

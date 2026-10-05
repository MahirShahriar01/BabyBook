// Privacy-first analytics: anonymous events only (no name, no device/advertising IDs).
// Sent to the Supabase "events" table (insert-only with the public key).
import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:http/http.dart' as http;

import 'content_service.dart';

class Analytics {
  Analytics._();
  static final Analytics instance = Analytics._();

  final String _session = List.generate(16, (_) => Random().nextInt(36).toRadixString(36)).join();
  final List<Map<String, dynamic>> _queue = [];
  Map<String, String?> _ctx = {};
  Timer? _timer;

  void setContext({String? age, String? gender, String? theme}) => _ctx = {'age_group': age, 'gender': gender, 'theme': theme};

  void track(String event, {String? id, String? name, num? value, String? lang}) {
    if (!hasSupabase) return;
    _queue.add({
      'event': event,
      'item_id': id == null ? null : (id.length > 80 ? id.substring(0, 80) : id),
      'item_name': name == null ? null : (name.length > 120 ? name.substring(0, 120) : name),
      'value': value,
      'lang': lang,
      'platform': 'android',
      'session_id': _session,
      ..._ctx,
    });
    _timer?.cancel();
    _timer = Timer(const Duration(seconds: 3), flush);
  }

  Future<void> flush() async {
    if (_queue.isEmpty) return;
    final rows = List.of(_queue);
    _queue.clear();
    try {
      await http
          .post(supabaseRest('events'), headers: {...supabaseHeaders(), 'Prefer': 'return=minimal'}, body: jsonEncode(rows))
          .timeout(const Duration(seconds: 8));
    } catch (_) {
      /* offline: analytics must never break the kid experience */
    }
  }
}

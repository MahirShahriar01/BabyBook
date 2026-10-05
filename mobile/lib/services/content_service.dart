// Content loader: bundled seed -> cached remote copy -> fresh remote copy.
// Remote = Admin Panel's Supabase (read-only anon key) or a static content.json.
// Configure with --dart-define (see README):
//   --dart-define=SUPABASE_URL=https://xyz.supabase.co --dart-define=SUPABASE_ANON_KEY=...
//   --dart-define=CONTENT_URL=https://example.com/content.json
import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../models/content.dart';

const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
const supabaseKey = String.fromEnvironment('SUPABASE_ANON_KEY');
const contentUrl = String.fromEnvironment('CONTENT_URL');
const _cacheKey = 'kea.content.v1';

bool get hasSupabase => supabaseUrl.isNotEmpty && supabaseKey.isNotEmpty && !supabaseUrl.contains('YOUR-PROJECT');

Map<String, String> supabaseHeaders() => {'apikey': supabaseKey, 'Authorization': 'Bearer $supabaseKey', 'Content-Type': 'application/json'};
Uri supabaseRest(String path) => Uri.parse('${supabaseUrl.replaceAll(RegExp(r'/$'), '')}/rest/v1/$path');

class ContentService {
  Json _seed = {};

  Future<Content> loadInitial() async {
    _seed = Json.from(jsonDecode(await rootBundle.loadString('assets/content/seed.json')) as Map);
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_cacheKey);
      if (raw != null) return Content(merge(Json.from(jsonDecode(raw) as Map)));
    } catch (_) {
      /* corrupt cache: ignore */
    }
    return Content({..._seed, 'source': 'seed'});
  }

  /// Returns fresh content, or null when offline / not configured.
  Future<Content?> fetchRemote() async {
    try {
      Json? remote;
      if (hasSupabase) {
        remote = await _fetchSupabase();
      } else if (contentUrl.isNotEmpty) {
        final r = await http.get(Uri.parse(contentUrl)).timeout(const Duration(seconds: 10));
        if (r.statusCode == 200) remote = {...Json.from(jsonDecode(utf8.decode(r.bodyBytes)) as Map), 'source': 'json'};
      }
      if (remote == null) return null;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_cacheKey, jsonEncode(remote));
      return Content(merge(remote));
    } catch (_) {
      return null;
    }
  }

  Future<Json> _fetchSupabase() async {
    Future<List> get(String path) async {
      final r = await http.get(supabaseRest(path), headers: supabaseHeaders()).timeout(const Duration(seconds: 10));
      if (r.statusCode != 200) throw Exception('${r.statusCode} $path');
      return jsonDecode(utf8.decode(r.bodyBytes)) as List;
    }

    final results = await Future.wait([
      get('app_settings?select=id,data'),
      get('languages?select=id,data&enabled=eq.true&order=sort.asc'),
      get('stories?select=id,data&published=eq.true&order=sort.asc'),
      get('videos?select=id,data&published=eq.true&order=sort.asc'),
      get('topics?select=id,data&published=eq.true&order=sort.asc'),
      get('quiz?select=id,data&published=eq.true&order=sort.asc'),
    ]);
    final byId = {for (final r in results[0]) r['id']: r['data']};
    List items(List rows, [String key = 'id']) => rows.map((r) => {...Json.from(r['data'] as Map), key: r['id']}).toList();
    return {
      'settings': byId['global'] ?? {},
      'buddy': byId['buddy'] ?? {},
      'languages': items(results[1], 'code'),
      'stories': items(results[2]),
      'videos': items(results[3]),
      'topics': items(results[4]),
      'quiz': items(results[5]),
      'source': 'supabase',
    };
  }

  /// Deep-merge settings so keys added in newer app versions keep their defaults.
  Json merge(Json remote) {
    Json deep(Json base, Json over) {
      final out = Json.from(base);
      over.forEach((k, v) {
        out[k] = (v is Map && base[k] is Map) ? deep(Json.from(base[k] as Map), Json.from(v)) : v;
      });
      return out;
    }

    dynamic pick(String k) => (remote[k] is List && (remote[k] as List).isNotEmpty) ? remote[k] : _seed[k];
    return {
      ..._seed,
      'settings': deep(Json.from(_seed['settings'] as Map), Json.from((remote['settings'] as Map?) ?? {})),
      'buddy': deep(Json.from(_seed['buddy'] as Map), Json.from((remote['buddy'] as Map?) ?? {})),
      'languages': pick('languages'),
      'stories': pick('stories'),
      'videos': pick('videos'),
      'topics': pick('topics'),
      'quiz': pick('quiz'),
      'source': remote['source'] ?? 'remote',
    };
  }
}

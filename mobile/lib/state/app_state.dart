// Global app state: content (from Admin Panel), kid profile and progress.
// Everything about the kid is stored only on the device (SharedPreferences).
import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/content.dart';
import '../services/ads_service.dart';
import '../services/analytics.dart';
import '../services/content_service.dart';

class Profile {
  Profile({
    this.name = '',
    this.age = '',
    this.gender = '',
    this.avatar = '',
    this.themeId = '',
    this.uiLang = 'en',
    this.learnLang = 'en',
    this.persona = '',
    this.sound = true,
    this.done = false,
  });
  String name, age, gender, avatar, themeId, uiLang, learnLang, persona;
  bool sound, done;

  Json toJson() => {
    'name': name,
    'age': age,
    'gender': gender,
    'avatar': avatar,
    'themeId': themeId,
    'uiLang': uiLang,
    'learnLang': learnLang,
    'persona': persona,
    'sound': sound,
    'done': done,
  };
  factory Profile.fromJson(Json j) => Profile(
    name: j['name'] ?? '',
    age: j['age'] ?? '',
    gender: j['gender'] ?? '',
    avatar: j['avatar'] ?? '',
    themeId: j['themeId'] ?? '',
    uiLang: j['uiLang'] ?? 'en',
    learnLang: j['learnLang'] ?? 'en',
    persona: j['persona'] ?? '',
    sound: j['sound'] != false,
    done: j['done'] == true,
  );
}

class Mission {
  Mission(this.id, this.emoji, this.text, this.route, this.kind, this.goal, [this.count = 0]);
  final String id, emoji, text, route, kind;
  final int goal;
  int count;
  Json toJson() => {'id': id, 'count': count};
}

final _missionPool = [
  Mission('letter', '🔤', 'Learn 3 letters', 'alphabet', 'letter', 3),
  Mission('story', '📖', 'Read a story', 'stories', 'story', 1),
  Mission('game', '🧩', 'Win a brain game', 'games', 'game', 1),
  Mission('explore', '🦁', 'Discover 5 new things', 'explore', 'explore', 5),
  Mission('buddy', '🤖', 'Talk to your Buddy', 'buddy', 'buddy', 2),
  Mission('quiz', '❓', 'Answer 3 quiz questions', 'quiz', 'quiz', 3),
  Mission('ailab', '🧪', 'Try an AI experiment', 'ailab', 'ailab', 1),
];

String today() => DateTime.now().toIso8601String().substring(0, 10);

class AppState extends ChangeNotifier {
  final _service = ContentService();
  late SharedPreferences _prefs;
  late Content content;
  Profile profile = Profile();

  int stars = 0;
  List<String> stickers = [];
  Map<String, int> done = {};
  String dailyDate = '';
  int dailyMinutes = 0;
  List<Mission> missions = [];
  String streakLast = '';
  int streakCount = 0;
  int limitMinutes = 0;
  Timer? _clock;
  bool breakDue = false;

  Settings get settings => content.settings;
  KidTheme get theme => settings.themeFor(themeId: profile.themeId, gender: profile.gender);
  int get level => stars ~/ 10 + 1;
  int get limit => limitMinutes > 0 ? limitMinutes : settings.dailyLimit;
  bool get timeUp => profile.done && limit > 0 && dailyMinutes >= limit;

  /// [startClock] is false in widget tests (no periodic timer).
  Future<void> load({bool startClock = true}) async {
    _prefs = await SharedPreferences.getInstance();
    content = await _service.loadInitial();
    final p = _prefs.getString('kea.profile.v1');
    if (p != null) profile = Profile.fromJson(Json.from(jsonDecode(p) as Map));
    final g = _prefs.getString('kea.progress.v1');
    if (g != null) {
      final j = Json.from(jsonDecode(g) as Map);
      stars = j['stars'] ?? 0;
      stickers = strings(j['stickers']);
      done = Map<String, int>.from((j['done'] as Map?) ?? {});
      dailyDate = j['dailyDate'] ?? '';
      dailyMinutes = j['dailyMinutes'] ?? 0;
      streakLast = j['streakLast'] ?? '';
      streakCount = j['streakCount'] ?? 0;
      limitMinutes = j['limitMinutes'] ?? 0;
      final saved = {for (final m in (j['missions'] as List? ?? [])) m['id']: m['count'] as int};
      missions = _missionPool.where((m) => saved.containsKey(m.id)).map((m) => Mission(m.id, m.emoji, m.text, m.route, m.kind, m.goal, saved[m.id]!)).toList();
    }
    _freshDay();
    Analytics.instance.setContext(age: profile.age, gender: profile.gender, theme: theme.id);
    if (startClock) _clock = Timer.periodic(const Duration(minutes: 1), (_) => _tick());
    // pull latest Admin Panel content in the background
    unawaited(
      _service.fetchRemote().then((fresh) {
        if (fresh == null) return;
        content = fresh;
        AdsService.instance.updateConfig(settings.ads);
        notifyListeners();
      }),
    );
  }

  @override
  void dispose() {
    _clock?.cancel();
    super.dispose();
  }

  void _freshDay() {
    final d = today();
    if (dailyDate == d && missions.isNotEmpty) return;
    dailyDate = d;
    dailyMinutes = 0;
    final pool = _missionPool.where((m) => settings.feature(m.kind == 'letter' ? 'alphabet' : m.kind)).toList();
    final seed = d.codeUnits.fold<int>(0, (a, b) => a + b);
    // rotate through the pool so each day starts with a different mission
    final picked = [for (var i = 0; i < settings.dailyMissions.clamp(0, pool.length); i++) pool[(seed + i) % pool.length]];
    missions = picked.map((m) => Mission(m.id, m.emoji, m.text, m.route, m.kind, m.goal)).toList();
  }

  int _sinceBreak = 0;
  void _tick() {
    if (!profile.done) return;
    _freshDay();
    dailyMinutes++;
    _sinceBreak++;
    if (settings.breakEvery > 0 && _sinceBreak >= settings.breakEvery) {
      _sinceBreak = 0;
      breakDue = true;
    }
    _save();
    notifyListeners();
  }

  void dismissBreak() {
    breakDue = false;
    notifyListeners();
  }

  void _save() {
    _prefs.setString('kea.profile.v1', jsonEncode(profile.toJson()));
    _prefs.setString(
      'kea.progress.v1',
      jsonEncode({
        'stars': stars,
        'stickers': stickers,
        'done': done,
        'dailyDate': dailyDate,
        'dailyMinutes': dailyMinutes,
        'missions': missions.map((m) => m.toJson()).toList(),
        'streakLast': streakLast,
        'streakCount': streakCount,
        'limitMinutes': limitMinutes,
      }),
    );
  }

  void updateProfile(void Function(Profile p) fn) {
    fn(profile);
    Analytics.instance.setContext(age: profile.age, gender: profile.gender, theme: theme.id);
    _save();
    notifyListeners();
  }

  void setLimit(int minutes) {
    limitMinutes = minutes;
    _save();
    notifyListeners();
  }

  void addTime() {
    dailyMinutes = 0;
    _save();
    notifyListeners();
  }

  bool isDone(String key) => (done[key] ?? 0) > 0;

  /// Record a finished activity: stars, stickers, missions, streak, analytics, ads pacing.
  /// Returns true when a new sticker was earned.
  bool complete(String kind, {String id = 'x', String? name, int? starsEarned, String? lang}) {
    _freshDay();
    final add = starsEarned ?? settings.starsPerActivity;
    final d = today();
    final yesterday = DateTime.now().subtract(const Duration(days: 1)).toIso8601String().substring(0, 10);
    if (streakLast != d) {
      streakCount = streakLast == yesterday ? streakCount + 1 : 1;
      streakLast = d;
    }
    for (final m in missions) {
      if (m.kind == kind && m.count < m.goal) m.count++;
    }
    final before = stars;
    stars += add;
    var sticker = false;
    final pool = settings.stickers.isEmpty ? ['⭐'] : settings.stickers;
    if (stars ~/ 5 > before ~/ 5) {
      stickers.add(pool[stickers.length % pool.length]);
      sticker = true;
    }
    final key = '$kind:$id';
    done[key] = (done[key] ?? 0) + 1;
    _save();
    notifyListeners();
    Analytics.instance.track('${kind}_complete', id: id, name: name, value: add, lang: lang);
    if (kind == 'story' || kind == 'game') AdsService.instance.onActivityFinished();
    return sticker;
  }

  Future<void> eraseAll() async {
    await _prefs.remove('kea.profile.v1');
    await _prefs.remove('kea.progress.v1');
    profile = Profile();
    stars = 0;
    stickers = [];
    done = {};
    streakCount = 0;
    streakLast = '';
    limitMinutes = 0;
    missions = [];
    dailyDate = '';
    _freshDay();
    notifyListeners();
  }
}

// Typed views over the shared content bundle (shared/content/seed.json).
// The same JSON is edited in the Admin Panel and used by the website.
import 'package:flutter/material.dart';

typedef Json = Map<String, dynamic>;

List<T> _list<T>(dynamic v, T Function(Json) f) => (v as List? ?? const []).whereType<Map>().map((e) => f(Json.from(e))).toList();
List<String> strings(dynamic v) => (v as List? ?? const []).map((e) => '$e').toList();

Color hexColor(String? hex, [Color fallback = const Color(0xFFFF4FA3)]) {
  if (hex == null || hex.isEmpty) return fallback;
  var h = hex.replaceFirst('#', '');
  if (h.length == 3) h = h.split('').map((c) => '$c$c').join();
  final n = int.tryParse(h, radix: 16);
  return n == null ? fallback : Color(0xFF000000 | n);
}

class KidTheme {
  KidTheme(this.j);
  final Json j;
  String get id => j['id'] ?? '';
  String get name => j['name'] ?? '';
  String get emoji => j['emoji'] ?? '🎨';
  bool get dark => j['dark'] == true;
  Color get primary => hexColor(j['primary']);
  Color get secondary => hexColor(j['secondary'], const Color(0xFF9B5CFF));
  Color get accent => hexColor(j['accent'], const Color(0xFFFFC93C));
  Color get bgFrom => hexColor(j['bgFrom'], const Color(0xFFFFE3F1));
  Color get bgTo => hexColor(j['bgTo'], const Color(0xFFE9DDFF));
  Color get surface => hexColor(j['surface'], Colors.white);
  Color get text => hexColor(j['text'], const Color(0xFF4A1942));
}

class AgeGroup {
  AgeGroup(this.j);
  final Json j;
  String get id => j['id'] ?? '';
  String get label => j['label'] ?? '';
  String get emoji => j['emoji'] ?? '🎈';
  String get range => j['range'] ?? id;
}

class Avatar {
  Avatar(this.j);
  final Json j;
  String get id => j['id'] ?? '';
  String get emoji => j['emoji'] ?? '🙂';
  String get name => j['name'] ?? '';
  String get gender => j['gender'] ?? 'neutral';
}

class Persona {
  Persona(this.j);
  final Json j;
  String get id => j['id'] ?? '';
  String get name => j['name'] ?? 'Buddy';
  String get emoji => j['emoji'] ?? '🤖';
  double get pitch => (j['pitch'] as num?)?.toDouble() ?? 1.0;
  double get rate => (j['rate'] as num?)?.toDouble() ?? 1.0;
}

class Settings {
  Settings(this.j);
  final Json j;
  String get appName => j['appName'] ?? 'Kids Explorer AI';
  String get tagline => j['tagline'] ?? '';
  String get announcement => j['announcement'] ?? '';
  String get fontFamily => j['fontFamily'] ?? 'Baloo 2';
  String get themeMode => j['themeMode'] ?? 'kid_choice';
  String get defaultThemeId => j['defaultThemeId'] ?? '';
  String get forcedThemeId => j['forcedThemeId'] ?? '';
  Map<String, String> get genderThemes => Map<String, String>.from((j['genderThemes'] as Map?) ?? const {});
  List<KidTheme> get themes => _list(j['themes'], KidTheme.new);
  List<AgeGroup> get ageGroups => _list(j['ageGroups'], AgeGroup.new);
  List<Avatar> get avatars => _list(j['avatars'], Avatar.new);
  bool feature(String k) => (j['features'] as Map?)?[k] != false;
  List<String> get homeOrder => strings(j['homeOrder']);
  Json get ads => Json.from((j['ads'] as Map?) ?? const {});
  Json get buddy => Json.from((j['buddy'] as Map?) ?? const {});
  List<Persona> get personas => _list(buddy['personas'], Persona.new);
  int get dailyLimit => ((j['screenTime'] as Map?)?['defaultDailyMinutes'] as num?)?.toInt() ?? 0;
  int get breakEvery => ((j['screenTime'] as Map?)?['breakReminderMinutes'] as num?)?.toInt() ?? 0;
  int get starsPerActivity => ((j['rewards'] as Map?)?['starsPerActivity'] as num?)?.toInt() ?? 1;
  List<String> get stickers => strings((j['rewards'] as Map?)?['stickers']);
  int get dailyMissions => (j['dailyMissions'] as num?)?.toInt() ?? 3;
  bool get privacyVideo => (j['video'] as Map?)?['privacyEnhanced'] != false;

  KidTheme themeFor({String? themeId, String? gender}) {
    final all = themes;
    String? id;
    if (themeMode == 'forced') {
      id = forcedThemeId;
    } else if (themeMode == 'gender_auto') {
      id = genderThemes[gender ?? 'neutral'];
    } else {
      id = (themeId?.isNotEmpty ?? false) ? themeId : (genderThemes[gender ?? 'neutral'] ?? defaultThemeId);
    }
    return all.firstWhere((t) => t.id == id, orElse: () => all.firstWhere((t) => t.id == defaultThemeId, orElse: () => all.first));
  }
}

class Word {
  Word(this.j);
  final Json j;
  String get word => j['word'] ?? '';
  String get emoji => j['emoji'] ?? '';
  String get meaning => j['meaning'] ?? '';
}

class Letter {
  Letter(this.j);
  final Json j;
  String get char => j['char'] ?? '';
  String get sound => j['sound'] ?? '';
  String get audio => j['audio'] ?? '';
  List<Word> get words => _list(j['words'], Word.new);
}

class LetterGroup {
  LetterGroup(this.j);
  final Json j;
  String get title => j['title'] ?? '';
  List<Letter> get letters => _list(j['letters'], Letter.new);
}

class Language {
  Language(this.j);
  final Json j;
  String get code => j['code'] ?? 'en';
  String get name => j['name'] ?? '';
  String get nativeName => j['nativeName'] ?? name;
  String get flag => j['flag'] ?? '🏳️';
  String get ttsLocale => j['ttsLocale'] ?? code;
  bool get enabled => j['enabled'] != false;
  List<LetterGroup> get groups => _list(j['groups'], LetterGroup.new);
}

class StoryPage {
  StoryPage(this.j);
  final Json j;
  String get scene => j['scene'] ?? '';
  String get image => j['image'] ?? '';
  String get audio => j['audio'] ?? '';
  String get text => j['text'] ?? '';
}

class QuizQ {
  QuizQ(this.j);
  final Json j;
  String get id => j['id'] ?? question;
  String get question => j['question'] ?? j['q'] ?? '';
  String get emoji => j['emoji'] ?? '❓';
  List<String> get options => strings(j['options']);
  int get answer => (j['answer'] as num?)?.toInt() ?? 0;
  List<String> get ageGroups => strings(j['ageGroups']);
  bool get published => j['published'] != false;
}

class Story {
  Story(this.j);
  final Json j;
  String get id => j['id'] ?? '';
  String get title => j['title'] ?? '';
  String get language => j['language'] ?? 'en';
  String get emoji => j['emoji'] ?? '📘';
  Color get color => hexColor(j['color'], const Color(0xFF3DA5FF));
  List<String> get ageGroups => strings(j['ageGroups']);
  bool get published => j['published'] != false;
  List<StoryPage> get pages => _list(j['pages'], StoryPage.new);
  String get moral => j['moral'] ?? '';
  List<QuizQ> get quiz => _list(j['quiz'], QuizQ.new);
}

class Video {
  Video(this.j);
  final Json j;
  String get id => j['id'] ?? '';
  String get title => j['title'] ?? '';
  String get provider => j['provider'] ?? 'youtube';
  String get category => j['category'] ?? '';
  String get url => j['url'] ?? '';
  String get thumbnail => j['thumbnail'] ?? '';
  List<String> get ageGroups => strings(j['ageGroups']);
  bool get published => j['published'] != false;
  String get youtubeId {
    final v = (j['videoId'] ?? j['url'] ?? '').toString();
    if (RegExp(r'^[\w-]{11}$').hasMatch(v)) return v;
    return RegExp(r'(?:youtu\.be/|v=|embed/|shorts/|live/)([\w-]{11})').firstMatch(v)?.group(1) ?? '';
  }

  String get thumb => thumbnail.isNotEmpty ? thumbnail : (youtubeId.isNotEmpty ? 'https://i.ytimg.com/vi/$youtubeId/hqdefault.jpg' : '');
}

class TopicItem {
  TopicItem(this.j);
  final Json j;
  String get id => j['id'] ?? name;
  String get name => j['name'] ?? '';
  String get emoji => j['emoji'] ?? '';
  String get fact => j['fact'] ?? '';
  String get bn => j['bn'] ?? '';
  String get sound => j['sound'] ?? '';
  Color? get color => j['hex'] == null ? null : hexColor(j['hex']);
  int get count => (j['count'] as num?)?.toInt() ?? 0;
  String get object => j['object'] ?? '';
}

class Topic {
  Topic(this.j);
  final Json j;
  String get id => j['id'] ?? '';
  String get title => j['title'] ?? '';
  String get emoji => j['emoji'] ?? '✨';
  Color get color => hexColor(j['color'], const Color(0xFFFF8A3D));
  String get animation => j['animation'] ?? 'bounce';
  List<String> get ageGroups => strings(j['ageGroups']);
  bool get published => j['published'] != false;
  List<TopicItem> get items => _list(j['items'], TopicItem.new);
}

/// The whole content bundle.
class Content {
  Content(this.j);
  final Json j;
  Settings get settings => Settings(Json.from((j['settings'] as Map?) ?? const {}));
  Json get buddy => Json.from((j['buddy'] as Map?) ?? const {});
  List<Language> get languages => _list(j['languages'], Language.new).where((l) => l.enabled).toList();
  List<Story> get stories => _list(j['stories'], Story.new).where((s) => s.published).toList();
  List<Video> get videos => _list(j['videos'], Video.new).where((v) => v.published && (v.youtubeId.isNotEmpty || v.url.isNotEmpty)).toList();
  List<Topic> get topics => _list(j['topics'], Topic.new).where((t) => t.published).toList();
  List<QuizQ> get quiz => _list(j['quiz'], QuizQ.new).where((q) => q.published).toList();
  String get source => j['source'] ?? 'seed';
}

bool forAge(List<String> groups, String age) => age.isEmpty || groups.isEmpty || groups.contains(age);

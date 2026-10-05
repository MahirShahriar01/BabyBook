// Kids Explorer AI — Talking Buddy correction engine (100% free, on-device).
// Dart port of web/src/lib/buddyEngine.js; rules come from content (buddy.json)
// so the Admin Panel can extend them without an app update.
import 'dart:math';

const _lb = r'(^|[^\p{L}\p{M}])';
const _le = r'(?=$|[^\p{L}\p{M}])';

const _punctTips = {
  'en': {
    'cap': 'A sentence starts with a capital letter.',
    'q': 'A question ends with a question mark ( ? ).',
    'stop': 'A sentence ends with a full stop ( . ).',
    'i': 'When we talk about ourselves, "I" is always a capital letter.',
  },
  'bn': {'cap': '', 'q': 'প্রশ্নের শেষে প্রশ্নবোধক চিহ্ন ( ? ) বসে।', 'stop': 'বাক্যের শেষে দাঁড়ি ( । ) বসে।', 'i': ''},
  'hi': {'cap': '', 'q': 'प्रश्न के अंत में प्रश्नवाचक चिह्न ( ? ) लगता है।', 'stop': 'वाक्य के अंत में पूर्ण विराम ( । ) लगता है।', 'i': ''},
  'es': {
    'cap': 'Una oración empieza con letra mayúscula.',
    'q': 'En español, una pregunta empieza con ¿ y termina con ?',
    'stop': 'Una oración termina con un punto ( . ).',
    'i': '',
  },
  'fr': {
    'cap': 'Une phrase commence par une majuscule.',
    'q': "Une question se termine par un point d'interrogation ( ? ).",
    'stop': 'Une phrase se termine par un point ( . ).',
    'i': '',
  },
};

final _meaningPatterns = {
  'en': [
    r'''what (?:does|is) (?:the word )?["']?([\p{L}\s'-]+?)["']? mean''',
    r'''meaning of ["']?([\p{L}\s'-]+?)["']?$''',
    r"what is (?:a |an )?([\p{L}'-]+)$",
  ],
  'bn': [r'([\p{L}\p{M}]+) মানে কী', r'([\p{L}\p{M}]+) অর্থ কী', r'([\p{L}\p{M}]+) কী$'],
  'es': [r'''qué significa ["']?([\p{L}\s'-]+?)["']?$''', r"qué es (?:un |una )?([\p{L}'-]+)$"],
  'fr': [r'''que veut dire ["']?([\p{L}\s'-]+?)["']?$''', r"qu'est-ce qu(?:e|'un|'une) ([\p{L}'-]+)$"],
  'hi': [r'([\p{L}\p{M}]+) का मतलब क्या', r'([\p{L}\p{M}]+) क्या है$'],
};

String _meaningTemplate(String lang, String w, String m) => switch (lang) {
  'bn' => '"$w" মানে $m।',
  'es' => '"$w" significa $m.',
  'fr' => '« $w » veut dire $m.',
  'hi' => '"$w" का मतलब है $m।',
  _ => '"$w" means $m.',
};

const _latin = {'en', 'es', 'fr'};
const _fullStop = {'bn': '।', 'hi': '।'};

RegExp _re(String p, {bool ci = true}) => RegExp(p, caseSensitive: !ci, unicode: true);

String escapeRegExp(String s) => s.replaceAllMapped(RegExp(r'[.*+?^${}()|[\]\\]'), (m) => '\\${m[0]}');

/// Expand JS-style "$1" placeholders in a replacement template.
String _expand(String template, Match m) => template.replaceAllMapped(RegExp(r'\$(\d)'), (g) {
  final i = int.parse(g[1]!);
  return i <= m.groupCount ? (m.group(i) ?? '') : '';
});

String _fill(String? s, Map<String, String> vars) => (s ?? '').replaceAllMapped(RegExp(r'\{(\w+)\}'), (m) => vars[m[1]] ?? '');

bool _hasWord(String hay, String word) => _re(_lb + escapeRegExp(word.toLowerCase()) + _le).hasMatch(hay);

bool detectQuestion(String text, Map kb, String lang) {
  final t = text.trim().toLowerCase().replaceFirst(RegExp(r'^¿'), '');
  if (RegExp(r'\?\s*$').hasMatch(t)) return true;
  final starters = (kb['questionStarters'] as List? ?? const []).map((e) => '$e');
  if (starters.any((s) => t == s || t.startsWith('$s ') || t.startsWith("$s'"))) return true;
  if (lang == 'bn' || lang == 'hi') {
    final words = t.replaceAll(RegExp(r'[।?!.,]'), '').split(RegExp(r'\s+'));
    final enders = (kb['questionEnders'] as List? ?? const []).map((e) => '$e');
    if (enders.contains(words.last)) return true;
    if (lang == 'bn' && (words.contains('কি') || words.contains('কী'))) return true;
    if (lang == 'hi' && words.first == 'क्या') return true;
  }
  return false;
}

/// Capital letters + end punctuation.
String punctuate(String text, String lang, bool isQuestion, bool endedWithBang) {
  var s = text.trim().replaceAllMapped(RegExp(r'\s+([,.!?।])'), (m) => m[1]!).replaceAll(RegExp(r',(?=\S)'), ', ');
  s = s.replaceFirst(_re(r'[.!?।]+$'), '').trim();
  if (lang == 'es') s = s.replaceFirst(RegExp(r'^¿\s*'), '');
  if (_latin.contains(lang) && s.isNotEmpty) s = s[0].toUpperCase() + s.substring(1);
  if (lang == 'en') s = s.replaceAllMapped(_re(r'(^|[^\p{L}])i(?=$|[^\p{L}])', ci: false), (m) => '${m[1]}I');
  final end = isQuestion ? '?' : (endedWithBang ? '!' : (_fullStop[lang] ?? '.'));
  if (lang == 'es' && isQuestion) s = '¿$s';
  return s + end;
}

String _lettersOnly(String s) => s.toLowerCase().replaceAll(_re(r'[^\p{L}\p{M}\p{N}]+'), '');

class WordFix {
  WordFix(this.from, this.to, this.meaning);
  final String from, to, meaning;
}

class BuddyResult {
  String original = '', corrected = '', answer = '', praise = '', speech = '', lang = 'en';
  bool changed = false, isQuestion = false, safe = true;
  final List<String> tips = [];
  final List<WordFix> words = [];
}

/// Analyse what the kid said/typed.
BuddyResult analyze(
  String input,
  Map<String, dynamic> kbAll, {
  String lang = 'en',
  String name = 'friend',
  String buddy = 'Buddy',
  Map<String, String> dictionary = const {},
  int? seed,
}) {
  final code = kbAll.containsKey(lang) ? lang : 'en';
  final kb = (kbAll[code] as Map?) ?? const {};
  final vars = {'name': name, 'buddy': buddy};
  final r = BuddyResult()..lang = code;
  final text = input.trim().replaceAll(RegExp(r'\s+'), ' ');
  r.original = text;
  r.corrected = text;
  if (text.isEmpty) return r;

  final lower = text.toLowerCase();
  if ((kb['safety'] as List? ?? const []).any((w) => lower.contains('$w'.toLowerCase()))) {
    r.safe = false;
    r.answer = _fill(kb['safetyReply'], vars);
    r.speech = r.answer;
    return r;
  }

  final endedWithBang = RegExp(r'!\s*$').hasMatch(text);
  var isQuestion = detectQuestion(text, kb, code);
  var core = text.replaceFirst(_re(r'[.!?।]+$'), '').replaceFirst(RegExp(r'^¿'), '').trim();

  // 1) grammar / dialect corrections
  for (final rule in (kb['corrections'] as List? ?? const []).whereType<Map>()) {
    final re = _re('${rule['pattern']}');
    if (re.hasMatch(core)) {
      core = core.replaceAllMapped(re, (m) => _expand('${rule['replace']}', m));
      final tip = '${rule['tip'] ?? ''}';
      if (tip.isNotEmpty && !r.tips.contains(tip)) r.tips.add(tip);
    }
  }

  // 2) baby-talk -> formal words
  final kidWords = Map<String, dynamic>.from((kb['kidWords'] as Map?) ?? const {});
  kidWords.forEach((kid, v) {
    final pair = (v as List).map((e) => '$e').toList();
    final re = _re(_lb + escapeRegExp(kid) + _le);
    if (re.hasMatch(core)) {
      core = core.replaceAllMapped(re, (m) => '${m[1]}${pair[0]}');
      r.words.add(WordFix(kid, pair[0], pair.length > 1 ? pair[1] : ''));
    }
  });

  // 3) polite phrasing (first match wins)
  for (final rule in (kb['polite'] as List? ?? const []).whereType<Map>()) {
    final re = _re('${rule['pattern']}');
    if (re.hasMatch(core)) {
      core = core.replaceFirstMapped(re, (m) => _expand('${rule['replace']}', m));
      final tip = '${rule['tip'] ?? ''}';
      if (tip.isNotEmpty) r.tips.add(tip);
      isQuestion = detectQuestion(core, kb, code) || core.startsWith('¿');
      break;
    }
  }

  // 4) punctuation + capitals
  final corrected = punctuate(core, code, isQuestion, endedWithBang);
  final tp = _punctTips[code] ?? _punctTips['en']!;
  if (corrected != text && _lettersOnly(corrected) == _lettersOnly(text)) {
    final firstOut = corrected.replaceFirst(RegExp(r'^¿'), '');
    if (_latin.contains(code) && text[0] != firstOut[0] && tp['cap']!.isNotEmpty) r.tips.add(tp['cap']!);
    if (code == 'en' && _re(r'(^|[^\p{L}])i(?=$|[^\p{L}])', ci: false).hasMatch(text)) r.tips.add(tp['i']!);
    if (text[text.length - 1] != corrected[corrected.length - 1]) r.tips.add(isQuestion ? tp['q']! : tp['stop']!);
    if (code == 'es' && isQuestion && !text.startsWith('¿') && !r.tips.contains(tp['q'])) r.tips.add(tp['q']!);
  }
  r.corrected = corrected;
  r.changed = corrected != text;
  r.isQuestion = isQuestion;

  // 5) answer: meaning lookup -> knowledge base -> fallback
  final src = lower.replaceAll(RegExp(r'[?!.।¿]'), '').trim();
  final dict = <String, String>{...dictionary};
  kidWords.forEach((kid, v) {
    final pair = (v as List).map((e) => '$e').toList();
    final meaning = pair.length > 1 ? pair[1] : '';
    dict[kid.toLowerCase()] = meaning;
    dict[pair[0].toLowerCase()] = meaning;
  });
  for (final p in _meaningPatterns[code] ?? const <String>[]) {
    final m = _re(p).firstMatch(src);
    final w = m?.group(1)?.trim();
    if (w != null && dict[w.toLowerCase()] != null) {
      r.answer = _meaningTemplate(code, w, dict[w.toLowerCase()]!);
      break;
    }
  }
  if (r.answer.isEmpty) {
    Map? best;
    var bestScore = 0;
    for (final qa in (kb['qa'] as List? ?? const []).whereType<Map>()) {
      final score = (qa['keywords'] as List).fold<int>(0, (n, k) => n + (_hasWord(src, '$k') ? '$k'.split(' ').length : 0));
      if (score > bestScore) {
        best = qa;
        bestScore = score;
      }
    }
    if (best != null) {
      r.answer = _fill(best['answer'], vars);
    } else if (isQuestion) {
      r.answer = _fill(kb['fallback'], vars);
    }
  }

  final praise = (kb['praise'] as List? ?? const []).map((e) => '$e').toList();
  final s = seed ?? DateTime.now().millisecondsSinceEpoch;
  r.praise = praise.isEmpty ? '' : praise[s % praise.length];
  final parts = <String>[r.praise, r.changed ? '${kb['correctIntro'] ?? "Let's say it like this:"} $corrected' : '${kb['perfect'] ?? ''}'];
  for (final w in r.words) {
    parts.add('${w.to}: ${w.meaning}.');
  }
  if (r.answer.isNotEmpty) parts.add(r.answer);
  r.speech = parts.where((p) => p.isNotEmpty).join(' ');
  return r;
}

String greeting(Map<String, dynamic> kbAll, String lang, Map<String, String> vars) => _fill(((kbAll[lang] ?? kbAll['en']) as Map?)?['greeting'], vars);

// ------------------------------------------------------------------ pronunciation
int levenshtein(String a, String b) {
  final x = a.runes.toList();
  final y = b.runes.toList();
  var prev = List<int>.generate(y.length + 1, (j) => j);
  for (var i = 1; i <= x.length; i++) {
    final cur = List<int>.filled(y.length + 1, 0)..[0] = i;
    for (var j = 1; j <= y.length; j++) {
      cur[j] = min(min(prev[j] + 1, cur[j - 1] + 1), prev[j - 1] + (x[i - 1] == y[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[y.length];
}

String _norm(String s) => s.toLowerCase().replaceAll(_re(r'[^\p{L}\p{M}\p{N}\s]'), '').replaceAll(RegExp(r'\s+'), ' ').trim();

class PronunciationScore {
  PronunciationScore(this.score, this.stars, this.heard);
  final int score, stars;
  final String heard;
}

/// 0-100 score and 0-3 stars for how close the heard text is to the target word.
PronunciationScore pronunciationScore(String target, List<String> heard) {
  final t = _norm(target);
  final alts = heard.map(_norm).where((e) => e.isNotEmpty).toList();
  if (t.isEmpty || alts.isEmpty) return PronunciationScore(0, 0, alts.isEmpty ? '' : alts.first);
  var bestScore = 0;
  var bestHeard = alts.first;
  for (final h in alts) {
    for (final c in [h, ...h.split(' ')]) {
      final d = levenshtein(t, c);
      final score = max(0, ((1 - d / max(t.runes.length, c.runes.length)) * 100).round());
      if (score > bestScore) {
        bestScore = score;
        bestHeard = h;
      }
    }
  }
  final stars = bestScore >= 90
      ? 3
      : bestScore >= 70
      ? 2
      : bestScore >= 45
      ? 1
      : 0;
  return PronunciationScore(bestScore, stars, bestHeard);
}

/// Split a word into syllable-ish chunks for toddlers ("but-ter-fly").
List<String> syllables(String word) {
  if (!RegExp(r"^[a-z\s'-]+$", caseSensitive: false).hasMatch(word)) return [word];
  final re = RegExp(r'[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?', caseSensitive: false);
  return word
      .split(' ')
      .expand((w) {
        final m = re.allMatches(w).map((e) => e[0]!).toList();
        return m.isEmpty ? [w] : m;
      })
      .where((e) => e.isNotEmpty)
      .toList();
}

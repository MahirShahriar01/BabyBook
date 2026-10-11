import 'dart:math';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../i18n.dart';
import '../../models/content.dart';
import '../../services/logic.dart';
import '../../services/speech_service.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';

const _extra = {'en': 'ABCDEFGHIKLMNOPRSTU', 'bn': 'কখগচজতদনপবমরলস', 'hi': 'कखगजतदनपबमरलस', 'es': 'ABCDEGLMNOPRST', 'fr': 'ABCDEGLMNOPRST'};

/// Words easy to spell with tiles: no conjuncts (্), no spaces/digits, 2–6 letters.
List<(Word, List<String>)> spellableWords(Language l, String age) {
  final maxLen = age == '2-4' ? 3 : (age == '5-7' ? 4 : 6);
  return [
    for (final g in l.groups)
      for (final le in g.letters)
        for (final w in le.words)
          if (!RegExp(r'[\s্\d]').hasMatch(w.word) && w.word.characters.length >= 2 && w.word.characters.length <= maxLen) (w, w.word.characters.toList()),
  ];
}

/// Spell a picture word by tapping its letters in order (English, Bangla, …).
class WordBuilder extends StatefulWidget {
  const WordBuilder({super.key});
  @override
  State<WordBuilder> createState() => _WordBuilderState();
}

class _WordBuilderState extends State<WordBuilder> {
  late Language lang;
  late List<(Word, List<String>)> words;
  (Word, List<String>)? word;
  List<(String id, String ch)> tiles = [];
  final placed = <String>[];
  String? wrong;
  int score = 0;

  @override
  void initState() {
    super.initState();
    final st = context.read<AppState>();
    final langs = st.content.languages;
    lang = langs.firstWhere((l) => l.code == st.profile.learnLang, orElse: () => langs.first);
    words = spellableWords(lang, st.profile.age);
    _next();
  }

  void _next() {
    if (words.isEmpty) return;
    final age = context.read<AppState>().profile.age;
    word = words[Random().nextInt(words.length)];
    final parts = word!.$2;
    final extra = age == '2-4' ? 0 : (age == '5-7' ? 1 : 2);
    final pool = shuffled((_extra[lang.code] ?? _extra['en']!).characters.where((c) => !parts.contains(c)));
    tiles = shuffled([for (final (i, p) in parts.indexed) ('w$i', p), for (final (i, c) in pool.take(extra).indexed) ('x$i', c)]);
    placed.clear();
    SpeechService.instance.speak(word!.$1.word, lang: lang.code);
  }

  void _tap((String, String) tile) {
    final w = word;
    if (w == null || placed.length == w.$2.length || placed.contains(tile.$1)) return;
    if (tile.$2 == w.$2[placed.length]) {
      tapFeedback();
      setState(() => placed.add(tile.$1));
      if (placed.length == w.$2.length) {
        score++;
        finishActivity(context, 'game', id: 'word-builder', name: 'Word ${w.$1.word}', stars: 2, lang: lang.code);
        SpeechService.instance.speak('${w.$1.word}! ${tr(context.read<AppState>().profile.uiLang, 'great')}', lang: lang.code);
      }
    } else {
      setState(() => wrong = tile.$1);
      Future.delayed(const Duration(milliseconds: 450), () => mounted ? setState(() => wrong = null) : null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ui = context.watch<AppState>().profile.uiLang;
    final w = word;
    final done = w != null && placed.length == w.$2.length;
    return KidScaffold(
      title: tr(ui, 'buildWord'),
      emoji: '🔡',
      actions: [Padding(padding: const EdgeInsets.only(right: 8), child: Text('✅ $score', style: const TextStyle(fontWeight: FontWeight.w800)))],
      body: w == null
          ? const Center(child: Text('🔡'))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                VoiceHint(lang: lang.code),
                Center(child: Bouncy(onTap: () => SpeechService.instance.speak(w.$1.word, lang: lang.code), child: AnimatedEmoji(w.$1.emoji, size: 96, anim: 'bounce'))),
                const SizedBox(height: 16),
                Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final (i, p) in w.$2.indexed)
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 250),
                        width: 62,
                        height: 62,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(color: i < placed.length ? Colors.green : Colors.black12, borderRadius: BorderRadius.circular(18)),
                        child: Text(i < placed.length ? p : '?', style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w800, color: Colors.white)),
                      ),
                  ],
                ),
                if (done && (w.$1.sentence.isNotEmpty || w.$1.meaning.isNotEmpty))
                  Padding(padding: const EdgeInsets.only(top: 10), child: Text(w.$1.sentence.isNotEmpty ? w.$1.sentence : w.$1.meaning, textAlign: TextAlign.center)),
                const SizedBox(height: 22),
                Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    for (final (i, tile) in tiles.indexed)
                      AnimatedOpacity(
                        duration: const Duration(milliseconds: 200),
                        opacity: placed.contains(tile.$1) ? 0.15 : 1,
                        child: AnimatedSlide(
                          duration: const Duration(milliseconds: 120),
                          offset: wrong == tile.$1 ? const Offset(0.08, 0) : Offset.zero,
                          child: Bouncy(
                            onTap: () => _tap(tile),
                            child: Container(
                              width: 70,
                              height: 70,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(color: HSLColor.fromAHSL(1, (i * 47) % 360.0, 0.8, 0.55).toColor(), borderRadius: BorderRadius.circular(20)),
                              child: Text(tile.$2, style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: Colors.white)),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
                if (done) Padding(padding: const EdgeInsets.only(top: 20), child: Center(child: KidButton(big: true, label: '➡️ ${tr(ui, 'next')}', onTap: () => setState(_next)))),
              ],
            ),
    );
  }
}

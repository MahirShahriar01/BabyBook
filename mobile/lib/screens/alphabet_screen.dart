import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../i18n.dart';
import '../models/content.dart';
import '../services/speech_service.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';
import '../widgets/trace_pad.dart';

class AlphabetScreen extends StatefulWidget {
  const AlphabetScreen({super.key});
  @override
  State<AlphabetScreen> createState() => _AlphabetScreenState();
}

class _AlphabetScreenState extends State<AlphabetScreen> {
  int group = 0;

  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();
    final langs = st.content.languages;
    final lang = langs.firstWhere((l) => l.code == st.profile.learnLang, orElse: () => langs.first);
    final groups = lang.groups;
    final g = groups[group.clamp(0, groups.length - 1)];
    final uiLang = st.profile.uiLang;

    return KidScaffold(
      title: tr(uiLang, 'alphabet'),
      emoji: '🔤',
      body: Column(
        children: [
          SizedBox(
            height: 52,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              children: [
                for (final l in langs)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: KidButton(
                      label: '${l.flag} ${l.nativeName}',
                      ghost: l.code != lang.code,
                      onTap: () {
                        st.updateProfile((p) => p.learnLang = l.code);
                        setState(() => group = 0);
                        SpeechService.instance.speak(l.nativeName, lang: l.code);
                      },
                    ),
                  ),
              ],
            ),
          ),
          if (groups.length > 1)
            SizedBox(
              height: 52,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(12, 6, 12, 0),
                children: [
                  for (final (i, x) in groups.indexed)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: KidButton(label: x.title, ghost: i != group, onTap: () => setState(() => group = i)),
                    ),
                ],
              ),
            ),
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.all(14),
              gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(maxCrossAxisExtent: 96, mainAxisSpacing: 12, crossAxisSpacing: 12),
              itemCount: g.letters.length,
              itemBuilder: (_, i) {
                final l = g.letters[i];
                final learned = st.isDone('letter:${lang.code}:${l.char}');
                return TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0, end: 1),
                  duration: Duration(milliseconds: 300 + i * 25),
                  curve: Curves.elasticOut,
                  builder: (_, v, child) => Transform.scale(scale: v, child: child),
                  child: Bouncy(
                    onTap: () => _open(context, lang, g.letters, i),
                    child: Container(
                      decoration: BoxDecoration(
                        color: colorAt(i),
                        borderRadius: BorderRadius.circular(22),
                        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.15), offset: const Offset(0, 6))],
                      ),
                      alignment: Alignment.center,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          Text(
                            l.char,
                            style: const TextStyle(fontSize: 40, fontWeight: FontWeight.w800, color: Colors.white),
                          ),
                          if (learned) const Positioned(top: 4, right: 6, child: Text('⭐', style: TextStyle(fontSize: 14))),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _open(BuildContext context, Language lang, List<Letter> letters, int i) {
    tapFeedback();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ChangeNotifierProvider.value(
        value: context.read<AppState>(),
        child: LetterSheet(lang: lang, letters: letters, index: i),
      ),
    );
  }
}

class LetterSheet extends StatefulWidget {
  const LetterSheet({super.key, required this.lang, required this.letters, required this.index});
  final Language lang;
  final List<Letter> letters;
  final int index;
  @override
  State<LetterSheet> createState() => _LetterSheetState();
}

class _LetterSheetState extends State<LetterSheet> {
  late int i = widget.index;
  String tab = 'words';

  Letter get l => widget.letters[i];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _intro());
  }

  void _intro() {
    final w = l.words.isNotEmpty ? l.words.first.word : '';
    SpeechService.instance.speak(w.isEmpty ? l.char : '${l.char}. ${l.char} for $w', lang: widget.lang.code, rate: 0.85);
  }

  void _learn(int stars) {
    final st = context.read<AppState>();
    if (stars == 1 && st.isDone('letter:${widget.lang.code}:${l.char}')) return;
    finishActivity(context, 'letter', id: '${widget.lang.code}:${l.char}', name: l.char, stars: stars, lang: widget.lang.code, celebrate: stars > 1);
  }

  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();
    final t = st.theme;
    final code = widget.lang.code;
    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      maxChildSize: 0.95,
      builder: (_, scroll) => Container(
        decoration: BoxDecoration(
          color: t.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
        ),
        child: ListView(
          controller: scroll,
          padding: const EdgeInsets.all(18),
          children: [
            Row(
              children: [
                IconButton.filledTonal(
                  onPressed: i == 0
                      ? null
                      : () {
                          setState(() => i--);
                          _intro();
                        },
                  icon: const Text('⬅️', style: TextStyle(fontSize: 22)),
                ),
                Expanded(
                  child: GestureDetector(
                    onTap: () => SpeechService.instance.speak(l.char, lang: code, rate: 0.8),
                    child: TweenAnimationBuilder<double>(
                      key: ValueKey(l.char),
                      tween: Tween(begin: 0, end: 1),
                      duration: const Duration(milliseconds: 700),
                      curve: Curves.elasticOut,
                      builder: (_, v, child) => Transform.rotate(
                        angle: (1 - v) * -3,
                        child: Transform.scale(scale: v, child: child),
                      ),
                      child: ShaderMask(
                        shaderCallback: (r) => LinearGradient(colors: [t.primary, t.secondary, t.accent]).createShader(r),
                        child: Text(
                          l.char,
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 130, fontWeight: FontWeight.w800, color: Colors.white, height: 1.1),
                        ),
                      ),
                    ),
                  ),
                ),
                IconButton.filledTonal(
                  onPressed: i == widget.letters.length - 1
                      ? null
                      : () {
                          setState(() => i++);
                          _intro();
                        },
                  icon: const Text('➡️', style: TextStyle(fontSize: 22)),
                ),
              ],
            ),
            if (l.sound.isNotEmpty)
              Center(
                child: Text('🗣️ sounds like "${l.sound}"', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              ),
            const SizedBox(height: 12),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 8,
              children: [
                for (final (k, label) in [('words', '🍎 Words'), ('trace', '✏️ Trace'), ('say', '🎤 ${tr(st.profile.uiLang, 'sayIt')}')])
                  KidButton(label: label, ghost: tab != k, onTap: () => setState(() => tab = k)),
              ],
            ),
            const SizedBox(height: 14),
            if (tab == 'words')
              Wrap(
                spacing: 12,
                runSpacing: 12,
                alignment: WrapAlignment.center,
                children: [
                  for (final (k, w) in l.words.indexed)
                    Bouncy(
                      onTap: () {
                        SpeechService.instance.speak(w.word, lang: code, rate: 0.8);
                        _learn(1);
                      },
                      child: SizedBox(
                        width: 160,
                        child: GlassBox(
                          color: colorAt(k).withValues(alpha: 0.15),
                          child: Column(
                            children: [
                              AnimatedEmoji(w.emoji, size: 56, anim: 'bounce', delay: k * 200),
                              Text(w.word, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
                              if (w.meaning.isNotEmpty) Text(w.meaning, textAlign: TextAlign.center),
                              const Text('🔈', style: TextStyle(fontSize: 20)),
                            ],
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            if (tab == 'trace') TracePad(char: l.char, color: t.primary, onDone: () => _learn(2)),
            if (tab == 'say') SayItCard(word: l.words.isNotEmpty ? l.words.first.word : l.char, lang: code, onScore: (s) => s >= 2 ? _learn(s) : null),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}

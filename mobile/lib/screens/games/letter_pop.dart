import 'dart:math';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../i18n.dart';
import '../../models/content.dart';
import '../../services/logic.dart';
import '../../services/speech_service.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';

const _rounds = 6;
const _colors = [Color(0xFFFF4FA3), Color(0xFF1E90FF), Color(0xFF22B573), Color(0xFFFF8A3D), Color(0xFF9B5CFF), Color(0xFFFFC93C)];

/// Listen to a letter and pop the matching balloon.
class LetterPop extends StatefulWidget {
  const LetterPop({super.key});
  @override
  State<LetterPop> createState() => _LetterPopState();
}

class _LetterPopState extends State<LetterPop> with SingleTickerProviderStateMixin {
  late final AnimationController _float = AnimationController(vsync: this, duration: const Duration(seconds: 4))..repeat();
  late Language lang;
  late List<Letter> letters;
  List<Letter> opts = [];
  Letter? target;
  String? popped, wrong;
  int n = 0;

  @override
  void initState() {
    super.initState();
    final st = context.read<AppState>();
    lang = st.content.languages.firstWhere((l) => l.code == st.profile.learnLang, orElse: () => st.content.languages.first);
    letters = [for (final g in lang.groups) ...g.letters];
    _next();
  }

  @override
  void dispose() {
    _float.dispose();
    super.dispose();
  }

  int get _count => {'2-4': 3, '5-7': 4}[context.read<AppState>().profile.age] ?? 6;

  void _say() => SpeechService.instance.speak(tr(lang.code == 'bn' ? 'bn' : context.read<AppState>().profile.uiLang, 'popLetter', {'x': target!.name}), lang: lang.code);

  void _next() {
    opts = shuffled(letters).take(_count).toList();
    target = opts[Random().nextInt(opts.length)];
    popped = null;
    _say();
  }

  void _pop(Letter l) {
    if (popped != null) return;
    if (l.char == target!.char) {
      tapFeedback();
      setState(() {
        popped = l.char;
        n++;
      });
      if (n == _rounds) {
        finishActivity(context, 'game', id: 'letter-pop', name: 'Letter pop', stars: 3, lang: lang.code);
      } else {
        Future.delayed(const Duration(milliseconds: 900), () => mounted ? setState(_next) : null);
      }
    } else {
      setState(() => wrong = l.char);
      Future.delayed(const Duration(milliseconds: 450), () => mounted ? setState(() => wrong = null) : null);
      _say();
    }
  }

  @override
  Widget build(BuildContext context) {
    final ui = context.watch<AppState>().profile.uiLang;
    return KidScaffold(
      title: tr(ui, 'letterPop'),
      emoji: '🎈',
      body: Column(
        children: [
          VoiceHint(lang: lang.code),
          Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: KidProgress(value: n / _rounds)),
          const SizedBox(height: 10),
          if (n < _rounds) KidButton(label: '🔊 ${tr(ui, 'hearAgain')}', onTap: _say),
          Expanded(
            child: n >= _rounds
                ? Center(
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      const AnimatedEmoji('🏆', size: 90),
                      KidButton(
                        big: true,
                        label: '🔁 ${tr(ui, 'playAgain')}',
                        onTap: () => setState(() {
                          n = 0;
                          _next();
                        }),
                      ),
                    ]),
                  )
                : LayoutBuilder(
                    builder: (context, box) => AnimatedBuilder(
                      animation: _float,
                      builder: (context, _) => Stack(children: [
                        for (final (i, l) in opts.indexed)
                          Positioned(
                            left: (box.maxWidth - 90) * (opts.length == 1 ? 0.5 : i / (opts.length - 1)),
                            top: (box.maxHeight - 120) * (0.5 + 0.4 * sin((_float.value + i * 0.23) * 2 * pi)),
                            child: AnimatedScale(
                              scale: popped == l.char ? 1.8 : 1,
                              duration: const Duration(milliseconds: 300),
                              child: AnimatedOpacity(
                                opacity: popped == l.char ? 0 : 1,
                                duration: const Duration(milliseconds: 400),
                                child: Bouncy(
                                  onTap: () => _pop(l),
                                  child: Transform.translate(
                                    offset: Offset(wrong == l.char ? 8 : 0, 0),
                                    child: Container(
                                      width: 84,
                                      height: 102,
                                      alignment: Alignment.center,
                                      decoration: BoxDecoration(color: _colors[i % _colors.length], borderRadius: const BorderRadius.all(Radius.elliptical(42, 51))),
                                      child: Text(l.char, style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w800, color: Colors.white)),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                      ]),
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

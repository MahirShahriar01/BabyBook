import 'dart:math';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../services/logic.dart';
import '../../services/speech_service.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';

const _icons = ['🔴', '🔵', '🟡', '🟢', '🟣', '⭐', '🔺', '🟧', '❤️', '🌙'];

class PatternRound {
  PatternRound(this.seq, this.answer, this.options);
  final List<String> seq;
  final String answer;
  final List<String> options;
}

PatternRound makePattern(String age, [Random? rnd]) {
  final r = rnd ?? Random();
  final units = age == '2-4'
      ? ['AB', 'AAB']
      : age == '5-7'
      ? ['AB', 'ABC', 'AAB', 'ABB']
      : ['ABC', 'AABB', 'ABCD', 'NUM'];
  final unit = units[r.nextInt(units.length)];
  if (unit == 'NUM') {
    final start = 1 + r.nextInt(5), step = 2 + r.nextInt(4);
    final seq = [for (var i = 0; i < 5; i++) '${start + step * i}'];
    final ans = '${start + step * 5}';
    return PatternRound(seq, ans, shuffled([ans, '${start + step * 5 + 1}', '${start + step * 4 + 1}']));
  }
  final letters = unit.split('').toSet().toList();
  final icons = shuffled(_icons).take(letters.length).toList();
  final map = {for (var i = 0; i < letters.length; i++) letters[i]: icons[i]};
  final full = [for (var i = 0; i < unit.length * 3; i++) map[unit[i % unit.length]]!];
  final cut = unit.length * 2 + r.nextInt(unit.length);
  final ans = full[cut];
  return PatternRound(full.sublist(0, cut), ans, shuffled([ans, ...shuffled(_icons.where((x) => x != ans)).take(2)]));
}

class PatternGame extends StatefulWidget {
  const PatternGame({super.key});
  @override
  State<PatternGame> createState() => _PatternGameState();
}

class _PatternGameState extends State<PatternGame> {
  late PatternRound p = makePattern(context.read<AppState>().profile.age);
  int streak = 0;
  String? wrong;
  bool ok = false;

  void _choose(String o) {
    if (ok) return;
    if (o == p.answer) {
      setState(() {
        ok = true;
        streak++;
      });
      tapFeedback();
      if (streak % 3 == 0) finishActivity(context, 'game', id: 'pattern', name: 'Pattern x3', stars: 2);
      Future.delayed(const Duration(milliseconds: 1100), () {
        if (!mounted) return;
        setState(() {
          p = makePattern(context.read<AppState>().profile.age);
          ok = false;
          wrong = null;
        });
      });
    } else {
      setState(() => wrong = o);
      SpeechService.instance.speak('Look again. What repeats?');
    }
  }

  @override
  Widget build(BuildContext context) {
    return KidScaffold(
      title: 'What comes next?',
      emoji: '🔺',
      actions: [
        Padding(
          padding: const EdgeInsets.only(right: 8),
          child: Text('🔥 $streak', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        ),
      ],
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: GlassBox(
            padding: const EdgeInsets.all(22),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    for (final (i, x) in p.seq.indexed)
                      TweenAnimationBuilder<double>(
                        key: ValueKey('$i$x${p.answer}'),
                        tween: Tween(begin: -40, end: 0),
                        duration: Duration(milliseconds: 300 + i * 80),
                        builder: (_, y, child) => Transform.translate(offset: Offset(0, y), child: child),
                        child: Text(x, style: const TextStyle(fontSize: 38, fontWeight: FontWeight.w800)),
                      ),
                    AnimatedEmoji(ok ? p.answer : '❔', size: 38, anim: ok ? 'pop' : 'pulse'),
                  ],
                ),
                const SizedBox(height: 16),
                const Text('Drag or tap the one that comes next', style: TextStyle(fontSize: 16)),
                const SizedBox(height: 16),
                DragTarget<String>(
                  onAcceptWithDetails: (d) => _choose(d.data),
                  builder: (_, cand, _) => AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    height: 60,
                    width: 200,
                    decoration: BoxDecoration(
                      border: Border.all(width: 3, color: cand.isEmpty ? Colors.black12 : Colors.green),
                      borderRadius: BorderRadius.circular(18),
                    ),
                    alignment: Alignment.center,
                    child: const Text('⬇️ drop here'),
                  ),
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 14,
                  runSpacing: 14,
                  alignment: WrapAlignment.center,
                  children: [
                    for (final o in p.options)
                      Draggable<String>(
                        data: o,
                        feedback: Material(
                          color: Colors.transparent,
                          child: Text(o, style: const TextStyle(fontSize: 52)),
                        ),
                        childWhenDragging: Opacity(opacity: 0.3, child: _opt(o)),
                        child: Bouncy(onTap: () => _choose(o), child: _opt(o)),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _opt(String o) => Opacity(
    opacity: wrong == o ? 0.4 : 1,
    child: GlassBox(
      padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 10),
      child: Text(o, style: const TextStyle(fontSize: 44, fontWeight: FontWeight.w800)),
    ),
  );
}

import 'dart:math';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../services/logic.dart';
import '../../services/speech_service.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';

const _things = ['🍎', '🎈', '🐥', '⭐', '🍓', '🐟', '🚗', '🍪'];

class MathProblem {
  MathProblem(this.text, this.answer, this.a, this.b, this.thing, this.options);
  final String text, thing;
  final int answer, a, b;
  final List<int> options;
}

/// Toddlers count objects; middle kids add; older kids add / subtract / multiply.
MathProblem makeProblem(String age, [Random? rnd]) {
  final r = rnd ?? Random();
  int between(int a, int b) => a + r.nextInt(b - a + 1);
  final thing = _things[r.nextInt(_things.length)];
  late String text;
  late int answer;
  var a = 0, b = 0;
  if (age == '2-4') {
    answer = a = between(1, 6);
    text = 'How many?';
  } else if (age == '8-10') {
    final x = between(2, 10), y = between(2, 10);
    final kind = r.nextInt(3);
    final (m, n, sign) = switch (kind) {
      0 => (between(10, 50) + x, x * 3, '+'),
      1 => (between(20, 60), between(1, 19), '−'),
      _ => (x, y, '×'),
    };
    answer = switch (kind) {
      0 => m + n,
      1 => m - n,
      _ => m * n,
    };
    text = '$m $sign $n = ?';
  } else {
    a = between(1, 5);
    b = between(1, 4);
    answer = a + b;
    text = '$a + $b = ?';
  }
  final opts = <int>{answer};
  while (opts.length < 3) {
    opts.add(max(0, answer + between(-3, 3)));
  }
  return MathProblem(text, answer, a, b, thing, shuffled(opts));
}

class MathPop extends StatefulWidget {
  const MathPop({super.key});
  @override
  State<MathPop> createState() => _MathPopState();
}

class _MathPopState extends State<MathPop> with SingleTickerProviderStateMixin {
  late MathProblem p = makeProblem(context.read<AppState>().profile.age);
  late final AnimationController _float = AnimationController(vsync: this, duration: const Duration(seconds: 2))..repeat(reverse: true);
  int score = 0;
  int? popped;

  @override
  void dispose() {
    _float.dispose();
    super.dispose();
  }

  void _choose(int o) {
    if (popped != null) return;
    setState(() => popped = o);
    if (o == p.answer) {
      score++;
      SpeechService.instance.speak('$o! Correct!');
      if (score % 5 == 0) finishActivity(context, 'game', id: 'math', name: 'Number Pop x5', stars: 3);
    } else {
      SpeechService.instance.speak('Oops. The answer is ${p.answer}.');
    }
    Future.delayed(const Duration(milliseconds: 1300), () {
      if (!mounted) return;
      setState(() {
        popped = null;
        p = makeProblem(context.read<AppState>().profile.age);
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    const colors = [Color(0xFFFF4FA3), Color(0xFF1E90FF), Color(0xFF22B573)];
    return KidScaffold(
      title: 'Number Pop',
      emoji: '➕',
      actions: [
        Padding(
          padding: const EdgeInsets.only(right: 8),
          child: Text('✅ $score', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
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
                if (p.a > 0)
                  Wrap(
                    alignment: WrapAlignment.center,
                    children: [
                      for (var i = 0; i < p.a; i++) Text(p.thing, style: const TextStyle(fontSize: 36)),
                      if (p.b > 0) const Text('  +  ', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800)),
                      for (var i = 0; i < p.b; i++) Text(p.thing, style: const TextStyle(fontSize: 36)),
                    ],
                  ),
                const SizedBox(height: 10),
                Text(p.text, style: const TextStyle(fontSize: 40, fontWeight: FontWeight.w800)),
                const SizedBox(height: 24),
                AnimatedBuilder(
                  animation: _float,
                  builder: (_, _) => Wrap(
                    spacing: 18,
                    runSpacing: 18,
                    alignment: WrapAlignment.center,
                    children: [
                      for (final (i, o) in p.options.indexed)
                        Transform.translate(
                          offset: Offset(0, sin((_float.value + i * 0.3) * pi) * -12),
                          child: AnimatedScale(
                            scale: popped == o ? 1.5 : 1,
                            duration: const Duration(milliseconds: 300),
                            child: AnimatedOpacity(
                              opacity: popped == o ? 0 : 1,
                              duration: const Duration(milliseconds: 500),
                              child: Bouncy(
                                onTap: () => _choose(o),
                                child: Container(
                                  width: 96,
                                  height: 116,
                                  decoration: BoxDecoration(color: colors[i % 3], borderRadius: const BorderRadius.all(Radius.elliptical(48, 58))),
                                  alignment: Alignment.center,
                                  child: Text(
                                    '$o',
                                    style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.w800),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                const Text('Pop the balloon with the right answer! 🎈'),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

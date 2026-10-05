import 'dart:math';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../i18n.dart';
import '../services/logic.dart';
import '../services/speech_service.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';

class AiLabScreen extends StatefulWidget {
  const AiLabScreen({super.key});
  @override
  State<AiLabScreen> createState() => _AiLabScreenState();
}

class _AiLabScreenState extends State<AiLabScreen> {
  String lab = 'what';
  @override
  Widget build(BuildContext context) {
    final lang = context.watch<AppState>().profile.uiLang;
    const labs = [('what', '💡 What is AI?'), ('draw', '✏️ Draw & guess'), ('teach', '🧑‍🏫 Teach the Robot'), ('predict', '🔮 Can AI predict?')];
    return KidScaffold(
      title: tr(lang, 'ailab'),
      emoji: '🧪',
      body: Column(
        children: [
          SizedBox(
            height: 52,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              children: [
                for (final l in labs)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: KidButton(label: l.$2, ghost: l.$1 != lab, onTap: () => setState(() => lab = l.$1)),
                  ),
              ],
            ),
          ),
          Expanded(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 350),
              child: switch (lab) {
                'draw' => const _DrawGuess(key: ValueKey('draw')),
                'teach' => const _TeachRobot(key: ValueKey('teach')),
                'predict' => const _Predict(key: ValueKey('predict')),
                _ => _WhatIsAi(key: const ValueKey('what'), onNext: () => setState(() => lab = 'draw')),
              },
            ),
          ),
        ],
      ),
    );
  }
}

const _steps = [
  ('📸', '1. Look at examples', 'AI looks at LOTS of examples — like thousands of cat pictures.'),
  ('🧠', '2. Find patterns', 'It notices patterns: cats have pointy ears, whiskers and a tail.'),
  ('🔮', '3. Make a guess', 'When it sees a new picture, it guesses: "I think this is a cat!"'),
  ('🔁', '4. Learn from mistakes', 'If the guess is wrong, people help it fix it, and it gets better.'),
  ('🤝', 'AI is a helper', 'AI is a tool made by people. It can be wrong, so we always think for ourselves too!'),
];

class _WhatIsAi extends StatefulWidget {
  const _WhatIsAi({super.key, required this.onNext});
  final VoidCallback onNext;
  @override
  State<_WhatIsAi> createState() => _WhatIsAiState();
}

class _WhatIsAiState extends State<_WhatIsAi> {
  int i = 0;
  @override
  Widget build(BuildContext context) {
    final s = _steps[i];
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        GlassBox(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              KidProgress(value: (i + 1) / _steps.length),
              const SizedBox(height: 12),
              AnimatedEmoji(s.$1, key: ValueKey(i), size: 90, anim: 'pop'),
              Text(s.$2, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              Text(s.$3, textAlign: TextAlign.center, style: const TextStyle(fontSize: 20)),
              const SizedBox(height: 16),
              Wrap(
                spacing: 10,
                children: [
                  KidButton(label: '🔊', ghost: true, onTap: () => SpeechService.instance.speak('${s.$2}. ${s.$3}')),
                  if (i < _steps.length - 1)
                    KidButton(label: 'Next ➡️', onTap: () => setState(() => i++))
                  else
                    KidButton(
                      label: '🧪 Try an experiment!',
                      onTap: () {
                        finishActivity(context, 'ailab', id: 'what-is-ai', name: 'What is AI');
                        widget.onNext();
                      },
                    ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

const _shapes = {'circle': '⚪', 'triangle': '🔺', 'square': '🟥', 'star': '⭐', 'zigzag': '⚡', 'line': '➖'};

class _DrawGuess extends StatefulWidget {
  const _DrawGuess({super.key});
  @override
  State<_DrawGuess> createState() => _DrawGuessState();
}

class _DrawGuessState extends State<_DrawGuess> {
  final pts = <Offset>[];
  List<MapEntry<String, double>> guesses = [];
  String target = shuffled(['circle', 'triangle', 'square', 'line']).first;

  void _finish() {
    final g = recognizeShape(pts.map((p) => Point(p.dx, p.dy)).toList()).take(3).toList();
    setState(() => guesses = g);
    if (g.isEmpty) return;
    SpeechService.instance.speak('Hmm… I think it is a ${g.first.key}! I am ${(g.first.value * 100).round()} percent sure.');
    if (g.first.key == target) {
      finishActivity(context, 'ailab', id: 'draw', name: 'draw:$target', stars: 2);
      Future.delayed(const Duration(milliseconds: 2400), () {
        if (!mounted) return;
        setState(() {
          target = shuffled(['circle', 'triangle', 'square', 'line'].where((x) => x != target)).first;
          pts.clear();
          guesses = [];
        });
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.watch<AppState>().theme;
    return ListView(
      padding: const EdgeInsets.all(14),
      children: [
        Text(
          'Draw a $target ${_shapes[target]} in one line',
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 10),
        AspectRatio(
          aspectRatio: 1,
          child: GestureDetector(
            onPanStart: (d) => setState(() {
              pts
                ..clear()
                ..add(d.localPosition);
              guesses = [];
            }),
            onPanUpdate: (d) => setState(() => pts.add(d.localPosition)),
            onPanEnd: (_) => _finish(),
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: t.primary.withValues(alpha: 0.3), width: 4),
              ),
              child: CustomPaint(painter: _LinePainter(pts, t.primary)),
            ),
          ),
        ),
        const SizedBox(height: 12),
        GlassBox(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text("🤖 The AI's brain", style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
              if (guesses.isEmpty) const Text('Draw something and I will guess! I look at corners and roundness.'),
              for (final g in guesses) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    Text('${_shapes[g.key]} ${g.key}', style: const TextStyle(fontWeight: FontWeight.w800)),
                    const Spacer(),
                    Text('${(g.value * 100).round()}%'),
                  ],
                ),
                KidProgress(value: g.value),
              ],
              if (guesses.isNotEmpty)
                const Padding(
                  padding: EdgeInsets.only(top: 10),
                  child: Text('AI gives a score to every idea and picks the highest. That is how computers make a guess!'),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _LinePainter extends CustomPainter {
  _LinePainter(this.pts, this.color);
  final List<Offset> pts;
  final Color color;
  @override
  void paint(Canvas canvas, Size size) {
    if (pts.length < 2) return;
    final path = Path()..moveTo(pts.first.dx, pts.first.dy);
    for (final p in pts.skip(1)) {
      path.lineTo(p.dx, p.dy);
    }
    canvas.drawPath(
      path,
      Paint()
        ..color = color
        ..strokeWidth = 10
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..style = PaintingStyle.stroke,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

// features: [wings, fins, legs/4, fur, lives in water]
const _creatures = [
  ('🦅', 'eagle', [1.0, 0.0, 0.5, 0.0, 0.0]),
  ('🦜', 'parrot', [1.0, 0.0, 0.5, 0.0, 0.0]),
  ('🐟', 'fish', [0.0, 1.0, 0.0, 0.0, 1.0]),
  ('🐬', 'dolphin', [0.0, 1.0, 0.0, 0.0, 1.0]),
  ('🐶', 'dog', [0.0, 0.0, 1.0, 1.0, 0.0]),
  ('🐘', 'elephant', [0.0, 0.0, 1.0, 0.0, 0.0]),
  ('🦋', 'butterfly', [1.0, 0.0, 1.0, 0.0, 0.0]),
  ('🐴', 'horse', [0.0, 0.0, 1.0, 1.0, 0.0]),
  ('🦆', 'duck', [1.0, 0.0, 0.5, 0.0, 1.0]),
  ('🦈', 'shark', [0.0, 1.0, 0.0, 0.0, 1.0]),
  ('🐱', 'cat', [0.0, 0.0, 1.0, 1.0, 0.0]),
  ('🐦', 'bird', [1.0, 0.0, 0.5, 0.0, 0.0]),
];
const _labels = {'fly': '🪽 Flies', 'swim': '🌊 Swims', 'walk': '🐾 Walks'};

class _TeachRobot extends StatefulWidget {
  const _TeachRobot({super.key});
  @override
  State<_TeachRobot> createState() => _TeachRobotState();
}

class _TeachRobotState extends State<_TeachRobot> {
  final pool = shuffled(_creatures);
  final examples = <Map<String, dynamic>>[];
  int test = 0;
  KnnResult? result;

  @override
  Widget build(BuildContext context) {
    final train = pool.take(6).toList(), tests = pool.skip(6).toList();
    final teaching = examples.length < train.length;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        GlassBox(
          padding: const EdgeInsets.all(22),
          child: teaching
              ? Column(
                  children: [
                    Text('Teach me! (${examples.length + 1}/${train.length})', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                    AnimatedEmoji(train[examples.length].$1, key: ValueKey(examples.length), size: 90, anim: 'pop'),
                    Text(
                      'Does the ${train[examples.length].$2} mostly fly, swim or walk?',
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      alignment: WrapAlignment.center,
                      children: [
                        for (final l in _labels.entries)
                          KidButton(
                            label: l.value,
                            big: true,
                            onTap: () {
                              final c = train[examples.length];
                              setState(() => examples.add({'label': l.key, 'features': c.$3, 'emoji': c.$1, 'name': c.$2}));
                              if (examples.length == train.length) {
                                SpeechService.instance.speak('Thank you for teaching me! Now let me guess some new animals.');
                              }
                            },
                          ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    const Text('The robot only knows what YOU teach it. That is called training data!', textAlign: TextAlign.center),
                  ],
                )
              : Column(
                  children: [
                    const Text("🤖 Robot's memory", style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                    Wrap(spacing: 6, children: [for (final e in examples) Chip(label: Text('${e['emoji']} → ${_labels[e['label']]!.split(' ').first}'))]),
                    AnimatedEmoji(tests[test % tests.length].$1, key: ValueKey(test), size: 90, anim: 'pop'),
                    Text('New animal: ${tests[test % tests.length].$2}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 10),
                    if (result == null)
                      KidButton(
                        big: true,
                        label: '🔮 Robot, guess!',
                        onTap: () {
                          final r = knn(examples, tests[test % tests.length].$3);
                          setState(() => result = r);
                          SpeechService.instance.speak(
                            'I think the ${tests[test % tests.length].$2} ${_labels[r.label]!.split(' ').last.toLowerCase()}, because it is like the ${r.nearest['name']} you showed me.',
                          );
                        },
                      )
                    else ...[
                      SpeechBubble(
                        'I think it ${_labels[result!.label]!.split(' ').last.toLowerCase()} ${_labels[result!.label]!.split(' ').first} (${(result!.confidence * 100).round()}% sure), because it looks like the ${result!.nearest['emoji']} ${result!.nearest['name']}.',
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 10,
                        children: [
                          KidButton(
                            label: '👍 Right!',
                            onTap: () {
                              finishActivity(context, 'ailab', id: 'teach', name: 'teach robot');
                              setState(() {
                                result = null;
                                test++;
                              });
                            },
                          ),
                          KidButton(
                            label: '👎 Wrong',
                            ghost: true,
                            onTap: () {
                              SpeechService.instance.speak('Oops! Thank you. Teach me more and I will get smarter.');
                              setState(() {
                                result = null;
                                test++;
                              });
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      const Text('If you teach the robot something wrong, it will guess wrong too. Good data makes good AI!', textAlign: TextAlign.center),
                    ],
                    TextButton(
                      onPressed: () => setState(() {
                        examples.clear();
                        result = null;
                      }),
                      child: const Text('🔁 Teach again'),
                    ),
                  ],
                ),
        ),
      ],
    );
  }
}

class _Predict extends StatefulWidget {
  const _Predict({super.key});
  @override
  State<_Predict> createState() => _PredictState();
}

class _PredictState extends State<_Predict> {
  static const opts = ['🔴', '🔵', '🟡'];
  final hist = <String>[];
  int hits = 0, tries = 0;

  void _add(String o) {
    tapFeedback();
    final pred = predictNext(hist, opts);
    setState(() {
      if (hist.length >= 2) {
        tries++;
        if (pred.first.key == o) hits++;
      }
      hist.add(o);
      if (hist.length > 30) hist.removeAt(0);
    });
    if (hist.length == 12) finishActivity(context, 'ailab', id: 'predict', name: 'predict');
  }

  @override
  Widget build(BuildContext context) {
    final pred = predictNext(hist, opts);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        GlassBox(
          padding: const EdgeInsets.all(22),
          child: Column(
            children: [
              const Text(
                'Tap colors in a pattern. The AI tries to guess your next tap!',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 10),
              Text(hist.skip(max(0, hist.length - 12)).join(' '), style: const TextStyle(fontSize: 26)),
              const SizedBox(height: 10),
              if (hist.length >= 2) SpeechBubble('🔮 I predict you will tap ${pred.first.key} next (${(pred.first.value * 100).round()}%)'),
              const SizedBox(height: 14),
              Wrap(
                spacing: 14,
                children: [
                  for (final o in opts)
                    Bouncy(
                      onTap: () => _add(o),
                      child: GlassBox(
                        padding: const EdgeInsets.all(14),
                        child: Text(o, style: const TextStyle(fontSize: 48)),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              Text('🎯 AI guessed right $hits of $tries times', style: const TextStyle(fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              const Text(
                'The AI counts what you tapped after each color before. Follow a pattern and it gets better. Try being random to trick it! 😄',
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

import 'dart:math';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../services/logic.dart';
import '../../services/speech_service.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';

const _sets = {
  'Animals': ['🐶', '🐱', '🦁', '🐼', '🐸', '🐵', '🦊', '🐯'],
  'Fruits': ['🍎', '🍌', '🍇', '🍓', '🍉', '🍍', '🥭', '🍒'],
  'Space': ['🚀', '🪐', '🌙', '⭐', '☄️', '🛸', '🌍', '👽'],
  'Vehicles': ['🚗', '🚌', '🚂', '✈️', '🚁', '🚢', '🚲', '🚒'],
};

class MemoryGame extends StatefulWidget {
  const MemoryGame({super.key});
  @override
  State<MemoryGame> createState() => _MemoryGameState();
}

class _MemoryGameState extends State<MemoryGame> {
  String set = 'Animals';
  late int pairs;
  List<String> deck = [];
  List<int> open = [];
  Set<String> matched = {};
  int moves = 0;

  @override
  void initState() {
    super.initState();
    pairs = {'2-4': 3, '5-7': 6, '8-10': 8}[context.read<AppState>().profile.age] ?? 6;
    _deal();
  }

  void _deal() {
    final pick = shuffled(_sets[set]!).take(pairs).toList();
    deck = shuffled([...pick, ...pick]);
    open = [];
    matched = {};
    moves = 0;
  }

  void _flip(int k) {
    if (open.length == 2 || open.contains(k) || matched.contains(deck[k])) return;
    tapFeedback();
    setState(() => open.add(k));
    if (open.length < 2) return;
    moves++;
    final a = open[0], b = open[1];
    if (deck[a] == deck[b]) {
      Future.delayed(const Duration(milliseconds: 400), () {
        if (!mounted) return;
        setState(() {
          matched.add(deck[a]);
          open = [];
        });
        if (matched.length == pairs) {
          finishActivity(context, 'game', id: 'memory', name: 'Memory $set', stars: pairs >= 6 ? 3 : 2);
          SpeechService.instance.speak('You found all the pairs! Super memory!');
        }
      });
    } else {
      Future.delayed(const Duration(milliseconds: 900), () => mounted ? setState(() => open = []) : null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.watch<AppState>().theme;
    return KidScaffold(
      title: 'Memory Match',
      emoji: '🃏',
      body: ListView(
        padding: const EdgeInsets.all(14),
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.center,
            children: [
              for (final s in _sets.keys)
                KidButton(
                  label: '${_sets[s]![0]} $s',
                  ghost: s != set,
                  onTap: () => setState(() {
                    set = s;
                    _deal();
                  }),
                ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.all(8),
            child: Text(
              '👆 Moves: $moves',
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
          ),
          Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: deck.length,
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: pairs <= 3 ? 3 : 4,
                  mainAxisSpacing: 10,
                  crossAxisSpacing: 10,
                  childAspectRatio: 0.78,
                ),
                itemBuilder: (_, k) {
                  final isOpen = open.contains(k) || matched.contains(deck[k]);
                  return GestureDetector(
                    onTap: () => _flip(k),
                    child: TweenAnimationBuilder<double>(
                      tween: Tween(begin: 0, end: isOpen ? pi : 0),
                      duration: const Duration(milliseconds: 400),
                      builder: (_, a, _) {
                        final front = a < pi / 2;
                        return Transform(
                          alignment: Alignment.center,
                          transform: Matrix4.identity()
                            ..setEntry(3, 2, 0.001)
                            ..rotateY(a),
                          child: Container(
                            decoration: BoxDecoration(
                              gradient: front ? LinearGradient(colors: [t.primary, t.secondary]) : null,
                              color: front ? null : t.surface,
                              borderRadius: BorderRadius.circular(18),
                              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.12), offset: const Offset(0, 5))],
                            ),
                            alignment: Alignment.center,
                            child: Transform(
                              alignment: Alignment.center,
                              transform: Matrix4.rotationY(front ? 0 : pi),
                              child: Text(front ? '❔' : deck[k], style: const TextStyle(fontSize: 40)),
                            ),
                          ),
                        );
                      },
                    ),
                  );
                },
              ),
            ),
          ),
          if (matched.length == pairs)
            Padding(
              padding: const EdgeInsets.only(top: 16),
              child: Center(
                child: KidButton(big: true, label: '🎉 Play again', onTap: () => setState(_deal)),
              ),
            ),
        ],
      ),
    );
  }
}

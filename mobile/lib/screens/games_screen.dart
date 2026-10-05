import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../i18n.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';
import 'games/math_pop.dart';
import 'games/memory_game.dart';
import 'games/odd_one_out.dart';
import 'games/pattern_game.dart';
import 'games/sudoku_game.dart';

class GamesScreen extends StatelessWidget {
  const GamesScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();
    final games = [
      ('sudoku', '🔢', 'Kids Sudoku', '3×3 icons · 4×4 · 6×6', const Color(0xFF7C5CFF), () => const SudokuGame()),
      ('memory', '🃏', 'Memory Match', 'Flip & find pairs', const Color(0xFFFF4FA3), () => const MemoryGame()),
      ('pattern', '🔺', 'What comes next?', 'Patterns & logic', const Color(0xFF22B573), () => const PatternGame()),
      ('math', '➕', 'Number Pop', 'Count & add', const Color(0xFFFF8A3D), () => const MathPop()),
      ('odd', '🕵️', 'Odd One Out', 'Spot the different one', const Color(0xFF1E90FF), () => const OddOneOut()),
    ];
    return KidScaffold(
      title: tr(st.profile.uiLang, 'games'),
      emoji: '🧩',
      banner: true,
      body: GridView.builder(
        padding: const EdgeInsets.all(14),
        itemCount: games.length,
        gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
          maxCrossAxisExtent: 220,
          mainAxisSpacing: 14,
          crossAxisSpacing: 14,
          childAspectRatio: 0.95,
        ),
        itemBuilder: (_, i) {
          final g = games[i];
          final wins = st.done['game:${g.$1}'] ?? 0;
          return KidTile(emoji: g.$2, label: g.$3, sub: wins > 0 ? '${g.$4} · 🏅×$wins' : g.$4, color: g.$5, anim: 'wobble', onTap: () => go(context, g.$6()));
        },
      ),
    );
  }
}

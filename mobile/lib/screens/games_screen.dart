import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../i18n.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';
import 'games/math_pop.dart';
import 'games/memory_game.dart';
import 'games/odd_one_out.dart';
import 'games/pattern_game.dart';
import 'games/letter_pop.dart';
import 'games/more_or_less.dart';
import 'games/shadow_match.dart';
import 'games/sudoku_game.dart';
import 'games/tic_tac_toe.dart';
import 'games/word_builder.dart';

class GamesScreen extends StatelessWidget {
  const GamesScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();
    final bn = st.profile.uiLang == 'bn';
    final games = [
      ('sudoku', '🔢', bn ? 'শিশুদের সুডোকু' : 'Kids Sudoku', bn ? 'ছবি ও সংখ্যার ধাঁধা' : '3×3 icons · 4×4 · 6×6', const Color(0xFF7C5CFF), () => const SudokuGame()),
      ('memory', '🃏', bn ? 'জোড়া মেলাও' : 'Memory Match', bn ? 'কার্ড উল্টে জোড়া খোঁজো' : 'Flip & find pairs', const Color(0xFFFF4FA3), () => const MemoryGame()),
      ('word-builder', '🔡', bn ? 'শব্দ বানাও' : 'Word Builder', bn ? 'বর্ণ দিয়ে শব্দ গড়ো' : 'Spell with letters', const Color(0xFFFF8A3D), () => const WordBuilder()),
      ('letter-pop', '🎈', bn ? 'বর্ণ বেলুন' : 'Letter Pop', bn ? 'শোনো আর ফাটাও' : 'Listen & pop', const Color(0xFF1E90FF), () => const LetterPop()),
      ('pattern', '🔺', bn ? 'এরপর কোনটা?' : 'What comes next?', bn ? 'নকশা ও যুক্তি' : 'Patterns & logic', const Color(0xFF22B573), () => const PatternGame()),
      ('math', '➕', bn ? 'সংখ্যার বেলুন' : 'Number Pop', bn ? 'গোনো ও যোগ করো' : 'Count & add', const Color(0xFFFF5D73), () => const MathPop()),
      ('more-less', '⚖️', bn ? 'বেশি না কম?' : 'More or Less', bn ? 'তুলনা করো' : 'Compare amounts', const Color(0xFF00C2A8), () => const MoreOrLess()),
      ('shadow', '👤', bn ? 'ছায়া মেলাও' : 'Shadow Match', bn ? 'ঠিক ছায়াটা খোঁজো' : 'Find the shadow', const Color(0xFF3D2CFF), () => const ShadowMatch()),
      ('odd', '🕵️', bn ? 'কোনটা আলাদা?' : 'Odd One Out', bn ? 'আলাদাটা খুঁজে বের করো' : 'Spot the different one', const Color(0xFF9B5CFF), () => const OddOneOut()),
      ('tictactoe', '❌', bn ? 'রোবটের সাথে টিক-ট্যাক-টো' : 'Tic-Tac-Toe vs Robot', bn ? 'এআই-কে হারাও!' : 'Beat the AI!', const Color(0xFFFFB23F), () => const TicTacToe()),
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

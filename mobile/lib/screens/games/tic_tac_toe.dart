import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../i18n.dart';
import '../../services/logic.dart';
import '../../services/speech_service.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';

const _skill = {'2-4': 0.25, '5-7': 0.6, '8-10': 0.9};
const _mark = {'X': '⭐', 'O': '🤖'};

/// Tic-tac-toe against an AI robot that "thinks ahead" (minimax), tuned by age.
class TicTacToe extends StatefulWidget {
  const TicTacToe({super.key});
  @override
  State<TicTacToe> createState() => _TicTacToeState();
}

class _TicTacToeState extends State<TicTacToe> {
  List<String?> board = List.filled(9, null);
  bool thinking = false;
  int win = 0, lose = 0, draw = 0;

  String get _ui => context.read<AppState>().profile.uiLang;

  void _finish(String who) {
    if (who == 'X') {
      win++;
      SpeechService.instance.speak(tr(_ui, 'tttWin'), lang: _ui);
      finishActivity(context, 'game', id: 'tictactoe', name: 'Beat the robot', stars: 3);
    } else if (who == 'O') {
      lose++;
      SpeechService.instance.speak(tr(_ui, 'tttLose'), lang: _ui);
    } else {
      draw++;
      SpeechService.instance.speak(tr(_ui, 'tttDraw'), lang: _ui);
      finishActivity(context, 'game', id: 'tictactoe', name: 'Tie with robot', stars: 1, celebrate: false);
    }
  }

  void _play(int i) {
    if (board[i] != null || tttWinner(board).$1 != null || thinking) return;
    tapFeedback();
    setState(() => board[i] = 'X');
    final (w, _) = tttWinner(board);
    if (w != null) return setState(() => _finish(w));
    setState(() => thinking = true);
    Future.delayed(const Duration(milliseconds: 700), () {
      if (!mounted) return;
      final j = robotMove(board, skill: _skill[context.read<AppState>().profile.age] ?? 0.6);
      setState(() {
        board[j] = 'O';
        thinking = false;
        final (w2, _) = tttWinner(board);
        if (w2 != null) _finish(w2);
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final ui = context.watch<AppState>().profile.uiLang;
    final (result, line) = tttWinner(board);
    final t = context.watch<AppState>().theme;
    return KidScaffold(
      title: tr(ui, 'ticTacToe'),
      emoji: '❌',
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Center(child: Text('⭐ $win · 🤖 $lose · 🤝 $draw', style: const TextStyle(fontWeight: FontWeight.w800))),
          const SizedBox(height: 8),
          Text(
            result == 'X' ? tr(ui, 'tttWin') : result == 'O' ? tr(ui, 'tttLose') : result == 'draw' ? tr(ui, 'tttDraw') : thinking ? tr(ui, 'tttThinking') : tr(ui, 'tttYou'),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 12),
          Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 360),
              child: GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 3,
                mainAxisSpacing: 8,
                crossAxisSpacing: 8,
                children: [
                  for (var i = 0; i < 9; i++)
                    Bouncy(
                      onTap: () => _play(i),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        decoration: BoxDecoration(color: line.contains(i) ? t.primary.withValues(alpha: 0.3) : t.surface, borderRadius: BorderRadius.circular(18)),
                        alignment: Alignment.center,
                        child: AnimatedScale(scale: board[i] == null ? 0.3 : 1, duration: const Duration(milliseconds: 250), child: Text(board[i] == null ? '' : _mark[board[i]]!, style: const TextStyle(fontSize: 52))),
                      ),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          if (result != null) Center(child: KidButton(big: true, label: '🔁 ${tr(ui, 'playAgain')}', onTap: () => setState(() => board = List.filled(9, null)))),
          const SizedBox(height: 12),
          Text('🤖 ${tr(ui, 'tttExplain')}', textAlign: TextAlign.center, style: const TextStyle(fontSize: 14)),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../services/logic.dart';
import '../../services/speech_service.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';

const _icons = {1: '🍎', 2: '⭐', 3: '🐟'};
const _levels = [(3, 4, '3×3 Icons', '2-4'), (4, 7, '4×4 Numbers', '5-7'), (6, 16, '6×6 Numbers', '8-10')];

class SudokuGame extends StatefulWidget {
  const SudokuGame({super.key});
  @override
  State<SudokuGame> createState() => _SudokuGameState();
}

class _SudokuGameState extends State<SudokuGame> {
  late int lv;
  late SudokuPuzzle p;
  (int, int)? sel;
  bool won = false;

  @override
  void initState() {
    super.initState();
    final age = context.read<AppState>().profile.age;
    lv = _levels.indexWhere((l) => l.$4 == age).clamp(0, 2);
    _new();
  }

  void _new([int? level]) {
    lv = level ?? lv;
    p = sudokuPuzzle(_levels[lv].$1, _levels[lv].$2);
    sel = null;
    won = false;
  }

  int get n => _levels[lv].$1;
  String _show(int v) => v == 0 ? '' : (n == 3 ? _icons[v]! : '$v');

  void _put(int v) {
    final s = sel;
    if (s == null || p.given[s.$1][s.$2] || won) return;
    tapFeedback();
    setState(() => p.grid[s.$1][s.$2] = v);
    if (sudokuSolved(p.grid)) {
      setState(() => won = true);
      finishActivity(context, 'game', id: 'sudoku', name: 'Sudoku ${n}x$n', stars: n == 3 ? 2 : (n == 4 ? 3 : 5));
      SpeechService.instance.speak('You solved the Sudoku! Amazing brain power!');
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.watch<AppState>().theme;
    final bad = sudokuConflicts(p.grid);
    final box = sudokuBoxes[n];
    return KidScaffold(
      title: 'Kids Sudoku',
      emoji: '🔢',
      body: ListView(
        padding: const EdgeInsets.all(14),
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.center,
            children: [for (final (i, l) in _levels.indexed) KidButton(label: l.$3, ghost: i != lv, onTap: () => setState(() => _new(i)))],
          ),
          const SizedBox(height: 8),
          Text(
            'Every row${box != null ? ', column and box' : ' and column'} needs each ${n == 3 ? 'picture' : 'number'} once!',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 16),
          ),
          const SizedBox(height: 12),
          Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: n * n,
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: n, mainAxisSpacing: 6, crossAxisSpacing: 6),
                itemBuilder: (_, k) {
                  final r = k ~/ n, c = k % n;
                  final isSel = sel == (r, c);
                  final boxShade = box != null && ((r ~/ box[0]) + (c ~/ box[1])) % 2 == 0;
                  return Bouncy(
                    onTap: () => setState(() => sel = (r, c)),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      decoration: BoxDecoration(
                        color: bad.contains('$r,$c')
                            ? Colors.redAccent.withValues(alpha: 0.35)
                            : (p.given[r][c] ? t.primary.withValues(alpha: 0.2) : (boxShade ? t.surface : t.surface.withValues(alpha: 0.75))),
                        borderRadius: BorderRadius.circular(14),
                        border: isSel ? Border.all(color: t.secondary, width: 4) : null,
                        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), offset: const Offset(0, 4))],
                      ),
                      alignment: Alignment.center,
                      child: AnimatedRotation(
                        turns: won ? 1 : 0,
                        duration: Duration(milliseconds: 600 + (r + c) * 80),
                        child: Text(
                          _show(p.grid[r][c]),
                          style: TextStyle(fontSize: n == 3 ? 48 : (n == 4 ? 34 : 26), fontWeight: FontWeight.w800, color: t.text),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            alignment: WrapAlignment.center,
            children: [
              for (var v = 1; v <= n; v++) KidButton(label: _show(v), onTap: () => _put(v)),
              KidButton(label: '🧽', ghost: true, onTap: () => _put(0)),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 10,
            alignment: WrapAlignment.center,
            children: [
              KidButton(
                label: '💡 Hint',
                ghost: true,
                onTap: () {
                  for (var r = 0; r < n; r++) {
                    for (var c = 0; c < n; c++) {
                      if (p.grid[r][c] == 0) {
                        setState(() => sel = (r, c));
                        final v = p.solution[r][c];
                        SpeechService.instance.speak('Try ${n == 3 ? ['', 'apple', 'star', 'fish'][v] : v} here!');
                        return;
                      }
                    }
                  }
                },
              ),
              KidButton(label: '🔁 New puzzle', ghost: true, onTap: () => setState(_new)),
            ],
          ),
          if (won)
            Padding(
              padding: const EdgeInsets.only(top: 16),
              child: Center(
                child: GlassBox(
                  child: Text(
                    '🎉 Solved! +${n == 3
                        ? 2
                        : n == 4
                        ? 3
                        : 5} ⭐',
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

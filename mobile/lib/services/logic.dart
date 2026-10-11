// Pure game / AI-lab logic shared by several screens (unit-tested in test/).
import 'dart:math';

final _rnd = Random();

List<T> shuffled<T>(Iterable<T> items, [Random? rnd]) => items.toList()..shuffle(rnd ?? _rnd);

// ------------------------------------------------------------------ sudoku
/// Box sizes [rows, cols]; size 3 has no boxes (toddler picture sudoku).
const sudokuBoxes = {
  3: null,
  4: [2, 2],
  6: [2, 3],
};

List<List<int>> sudokuSolution(int n, [Random? rnd]) {
  final r = rnd ?? _rnd;
  final box = sudokuBoxes[n];
  final sym = shuffled(List.generate(n, (i) => i + 1), r);
  if (box == null) {
    final rows = shuffled(List.generate(n, (i) => i), r);
    final cols = shuffled(List.generate(n, (i) => i), r);
    return [
      for (final row in rows) [for (final c in cols) sym[(row + c) % n]],
    ];
  }
  final br = box[0], bc = box[1];
  int pattern(int row, int c) => (bc * (row % br) + row ~/ br + c) % n;
  final rows = shuffled(List.generate(n ~/ br, (i) => i), r).expand((b) => shuffled(List.generate(br, (i) => i), r).map((x) => b * br + x)).toList();
  final cols = shuffled(List.generate(n ~/ bc, (i) => i), r).expand((s) => shuffled(List.generate(bc, (i) => i), r).map((x) => s * bc + x)).toList();
  return [
    for (final row in rows) [for (final c in cols) sym[pattern(row, c)]],
  ];
}

class SudokuPuzzle {
  SudokuPuzzle(this.solution, this.grid)
    : given = [
        for (final row in grid) [for (final v in row) v != 0],
      ];
  final List<List<int>> solution;
  final List<List<int>> grid;
  final List<List<bool>> given;
}

SudokuPuzzle sudokuPuzzle(int n, int holes, [Random? rnd]) {
  final sol = sudokuSolution(n, rnd);
  final grid = [
    for (final row in sol) [...row],
  ];
  for (final k in shuffled(List.generate(n * n, (i) => i), rnd).take(holes)) {
    grid[k ~/ n][k % n] = 0;
  }
  return SudokuPuzzle(sol, grid);
}

/// Cells ("r,c") that break a rule.
Set<String> sudokuConflicts(List<List<int>> grid) {
  final n = grid.length;
  final box = sudokuBoxes[n];
  final groups = <List<List<int>>>[];
  for (var i = 0; i < n; i++) {
    groups.add([
      for (var c = 0; c < n; c++) [i, c],
    ]);
    groups.add([
      for (var r = 0; r < n; r++) [r, i],
    ]);
  }
  if (box != null) {
    for (var r0 = 0; r0 < n; r0 += box[0]) {
      for (var c0 = 0; c0 < n; c0 += box[1]) {
        groups.add([
          for (var r = r0; r < r0 + box[0]; r++)
            for (var c = c0; c < c0 + box[1]; c++) [r, c],
        ]);
      }
    }
  }
  final bad = <String>{};
  for (final g in groups) {
    final seen = <int, List<String>>{};
    for (final p in g) {
      final v = grid[p[0]][p[1]];
      if (v != 0) seen.putIfAbsent(v, () => []).add('${p[0]},${p[1]}');
    }
    for (final ks in seen.values) {
      if (ks.length > 1) bad.addAll(ks);
    }
  }
  return bad;
}

bool sudokuSolved(List<List<int>> grid) => grid.every((r) => r.every((v) => v != 0)) && sudokuConflicts(grid).isEmpty;

// ------------------------------------------------------------------ AI lab
class KnnResult {
  KnnResult(this.label, this.confidence, this.nearest);
  final String label;
  final double confidence;
  final Map<String, dynamic> nearest;
}

/// k-nearest-neighbour vote. Each example: `{'label': String, 'features': List<double>}`.
KnnResult knn(List<Map<String, dynamic>> examples, List<double> features, {int k = 3}) {
  double dist(List<double> a) => sqrt(List.generate(a.length, (i) => pow(a[i] - features[i], 2)).fold<double>(0, (s, v) => s + v));
  final scored = examples.map((e) => {...e, 'd': dist((e['features'] as List).cast<double>())}).toList()
    ..sort((a, b) => (a['d'] as double).compareTo(b['d'] as double));
  final top = scored.take(k).toList();
  final votes = <String, double>{};
  for (final e in top) {
    votes[e['label'] as String] = (votes[e['label']] ?? 0) + 1 / (1 + (e['d'] as double));
  }
  final ranked = votes.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
  final total = votes.values.fold<double>(0, (s, v) => s + v);
  return KnnResult(ranked.first.key, total == 0 ? 0 : ranked.first.value / total, top.first);
}

/// Predict the next tap from what followed the last item before (+1 smoothing).
List<MapEntry<String, double>> predictNext(List<String> history, List<String> options) {
  final counts = {for (final o in options) o: 1.0};
  if (history.isNotEmpty) {
    final last = history.last;
    for (var i = 0; i < history.length - 1; i++) {
      if (history[i] == last) counts[history[i + 1]] = (counts[history[i + 1]] ?? 1) + 1;
    }
  }
  final total = counts.values.fold<double>(0, (a, b) => a + b);
  return counts.entries.map((e) => MapEntry(e.key, e.value / total)).toList()..sort((a, b) => b.value.compareTo(a.value));
}

/// Very small shape recogniser for "Draw & AI guesses": counts corners of the
/// simplified stroke and checks closure/roundness. Returns scores 0..1 per shape.
List<MapEntry<String, double>> recognizeShape(List<Point<double>> pts) {
  if (pts.length < 10) return [];
  double d(Point<double> a, Point<double> b) => a.distanceTo(b);
  final length = [for (var i = 1; i < pts.length; i++) d(pts[i - 1], pts[i])].fold<double>(0, (s, v) => s + v);
  if (length < 60) return [];
  final xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  final w = xs.reduce(max) - xs.reduce(min), h = ys.reduce(max) - ys.reduce(min);
  final closed = d(pts.first, pts.last) < 0.25 * max(w, h);
  // Douglas-Peucker simplification -> corner count
  List<Point<double>> simplify(List<Point<double>> p, double eps) {
    if (p.length < 3) return p;
    var maxD = 0.0, idx = 0;
    final a = p.first, b = p.last;
    for (var i = 1; i < p.length - 1; i++) {
      final num = ((b.y - a.y) * p[i].x - (b.x - a.x) * p[i].y + b.x * a.y - b.y * a.x).abs();
      final den = max(1e-6, d(a, b));
      final dd = num / den;
      if (dd > maxD) {
        maxD = dd;
        idx = i;
      }
    }
    if (maxD > eps) return [...simplify(p.sublist(0, idx + 1), eps)..removeLast(), ...simplify(p.sublist(idx), eps)];
    return [a, b];
  }

  // corners of the simplified stroke + how evenly points sit around the centre
  final c = Point(xs.reduce((a, b) => a + b) / pts.length, ys.reduce((a, b) => a + b) / pts.length);
  final corners = simplify(pts, 0.12 * max(w, h)).length - (closed ? 1 : 0);
  final radii = pts.map((p) => d(p, c)).toList();
  final mean = radii.reduce((a, b) => a + b) / radii.length;
  final variance = radii.map((r) => (r - mean) * (r - mean)).reduce((a, b) => a + b) / radii.length;
  final roundness = 1.0 - min(1.0, sqrt(variance) / max(1.0, mean) * 3);
  double near(int n, int target) => max(0.0, 1.0 - (n - target).abs() * 0.3);
  final scores = <String, double>{
    'circle': closed ? roundness : 0.1,
    'triangle': closed ? near(corners, 3) * (1 - roundness * 0.5) : 0.1,
    'square': closed ? near(corners, 4) * (1 - roundness * 0.5) : 0.1,
    'star': closed ? near(corners, 10) * 0.95 : 0.05,
    'zigzag': closed ? 0.05 : near(corners, 5) * 0.9,
    'line': closed ? 0 : (corners <= 2 ? 0.9 : 0.2),
  };
  return scores.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
}

// ------------------------------------------------------------------ speech segments
class SpeechSegment {
  SpeechSegment(this.lang, this.start);
  String lang;
  final int start; // UTF-16 offset in the full text (TTS word callbacks are relative to this)
  String text = '';
}

final _letterRe = RegExp(r'\p{L}', unicode: true);

String? _charLang(int rune, String latinLang) {
  if (rune >= 0x0980 && rune <= 0x09FF) return 'bn';
  if (rune >= 0x0900 && rune <= 0x097F) return 'hi';
  if (_letterRe.hasMatch(String.fromCharCode(rune))) return latinLang;
  return null; // spaces, digits, punctuation, emoji: stay with the current run
}

/// Split mixed text ("Car. গাড়ি") into runs that each need one voice.
/// Latin text inside Bangla/Hindi is spoken in English.
List<SpeechSegment> speechSegments(String text, String lang) {
  final latinLang = (lang == 'bn' || lang == 'hi') ? 'en' : lang;
  final out = <SpeechSegment>[];
  SpeechSegment? cur;
  var hasLetter = false;
  var i = 0;
  for (final rune in text.runes) {
    final ch = String.fromCharCode(rune);
    final l = _charLang(rune, latinLang);
    if (cur == null) {
      cur = SpeechSegment(l ?? lang, i);
    } else if (l != null && l != cur.lang && hasLetter) {
      out.add(cur);
      cur = SpeechSegment(l, i);
      hasLetter = false;
    } else if (l != null && !hasLetter) {
      cur.lang = l;
    }
    if (l != null) hasLetter = true;
    cur.text += ch;
    i += ch.length;
  }
  if (cur != null && cur.text.trim().isNotEmpty) out.add(cur);
  return out;
}

// ------------------------------------------------------------------ tracing score
/// Coverage of a letter mask by the child's strokes on a [size]×[size] grid.
/// Returns (coverage 0..1, share of ink outside the letter 0..1).
(double, double) traceScore(List<bool> glyph, List<bool> drawn, int size, {int slack = 2}) {
  var inside = 0, hit = 0, ink = 0, outside = 0;
  bool nearGlyph(int x, int y) {
    for (var dy = -slack; dy <= slack; dy++) {
      for (var dx = -slack; dx <= slack; dx++) {
        final nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < size && ny < size && glyph[ny * size + nx]) return true;
      }
    }
    return false;
  }

  for (var y = 0; y < size; y++) {
    for (var x = 0; x < size; x++) {
      final k = y * size + x;
      if (glyph[k]) {
        inside++;
        if (drawn[k]) hit++;
      }
      if (drawn[k]) {
        ink++;
        if (!nearGlyph(x, y)) outside++;
      }
    }
  }
  return (inside == 0 ? 0 : hit / inside, ink == 0 ? 0 : outside / ink);
}

/// Stamp a stroke (in grid coordinates) into [drawn] with the given brush radius.
void stampStroke(List<bool> drawn, int size, List<Point<double>> pts, double radius) {
  void dot(double cx, double cy) {
    final r = radius.ceil();
    for (var y = (cy - r).floor(); y <= (cy + r).ceil(); y++) {
      for (var x = (cx - r).floor(); x <= (cx + r).ceil(); x++) {
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= radius * radius) drawn[y * size + x] = true;
      }
    }
  }

  for (var i = 0; i < pts.length; i++) {
    if (i == 0) {
      dot(pts[0].x, pts[0].y);
      continue;
    }
    final a = pts[i - 1], b = pts[i];
    final steps = max(1, (a.distanceTo(b) / max(0.5, radius / 2)).ceil());
    for (var s = 1; s <= steps; s++) {
      dot(a.x + (b.x - a.x) * s / steps, a.y + (b.y - a.y) * s / steps);
    }
  }
}

// ------------------------------------------------------------------ tic-tac-toe
const tttLines = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

/// 'X', 'O', 'draw' or null, plus the winning line.
(String?, List<int>) tttWinner(List<String?> b) {
  for (final l in tttLines) {
    if (b[l[0]] != null && b[l[0]] == b[l[1]] && b[l[0]] == b[l[2]]) return (b[l[0]], l);
  }
  return (b.every((v) => v != null) ? 'draw' : null, const []);
}

int _minimax(List<String?> b, String me, String turn, int depth) {
  final (w, _) = tttWinner(b);
  if (w != null) return w == me ? 10 - depth : (w == 'draw' ? 0 : depth - 10);
  var best = turn == me ? -1000 : 1000;
  for (var i = 0; i < 9; i++) {
    if (b[i] != null) continue;
    b[i] = turn;
    final v = _minimax(b, me, turn == 'X' ? 'O' : 'X', depth + 1);
    b[i] = null;
    best = turn == me ? max(best, v) : min(best, v);
  }
  return best;
}

/// Robot move; [skill] 0..1 = chance of the perfect move (low for toddlers).
int robotMove(List<String?> board, {double skill = 0.6, Random? rnd, String me = 'O'}) {
  final r = rnd ?? _rnd;
  final free = [for (var i = 0; i < 9; i++) if (board[i] == null) i];
  if (free.isEmpty) return -1;
  if (r.nextDouble() > skill) return free[r.nextInt(free.length)];
  var best = free.first, bestV = -1000;
  for (final i in free) {
    final b = [...board]..[i] = me;
    final v = _minimax(b, me, me == 'O' ? 'X' : 'O', 1);
    if (v > bestV) {
      bestV = v;
      best = i;
    }
  }
  return best;
}

// ------------------------------------------------------------------ more or less
class CompareRound {
  CompareRound(this.a, this.b, this.askMore, this.useNumbers, this.thing);
  final int a, b;
  final bool askMore, useNumbers;
  final String thing;
  int get answer => askMore ? (a > b ? 0 : 1) : (a < b ? 0 : 1);
}

CompareRound makeCompare(String age, [Random? rnd]) {
  final r = rnd ?? _rnd;
  int between(int lo, int hi) => lo + r.nextInt(hi - lo + 1);
  const things = ['🍎', '⭐', '🐟', '🎈', '🍓', '🚗', '🐥', '🍪'];
  final useNumbers = age == '8-10' || (age == '5-7' && r.nextBool());
  final maxN = age == '2-4' ? 6 : (age == '5-7' ? 10 : 99);
  final a = between(1, maxN);
  var b = between(1, maxN);
  while (a == b) {
    b = between(1, maxN);
  }
  final askMore = age == '2-4' ? true : r.nextBool();
  return CompareRound(a, b, askMore, useNumbers, things[r.nextInt(things.length)]);
}

import 'dart:math';

import 'package:flutter/material.dart';

/// Letter tracing pad with sparkle particles. Fires [onDone] once when the kid
/// has drawn across enough of the letter.
class TracePad extends StatefulWidget {
  const TracePad({super.key, required this.char, required this.color, this.onDone});
  final String char;
  final Color color;
  final VoidCallback? onDone;
  @override
  State<TracePad> createState() => _TracePadState();
}

class _Spark {
  _Spark(this.p, this.v, this.color) : life = 1;
  Offset p, v;
  double life;
  final Color color;
}

class _TracePadState extends State<TracePad> with SingleTickerProviderStateMixin {
  final List<List<Offset>> strokes = [];
  final List<_Spark> sparks = [];
  late final AnimationController _tick = AnimationController(vsync: this, duration: const Duration(seconds: 1))..addListener(_step);
  final _rnd = Random();
  bool _done = false;
  double coverage = 0;
  Size _size = Size.zero;

  @override
  void didUpdateWidget(covariant TracePad old) {
    super.didUpdateWidget(old);
    if (old.char != widget.char) _clear();
  }

  @override
  void dispose() {
    _tick.dispose();
    super.dispose();
  }

  void _step() {
    if (sparks.isEmpty) return;
    for (final s in sparks) {
      s.p += s.v;
      s.v += const Offset(0, 0.25);
      s.life -= 0.03;
    }
    sparks.removeWhere((s) => s.life <= 0);
    setState(() {});
  }

  void _spark(Offset p) {
    final colors = [widget.color, const Color(0xFFFFD23F), const Color(0xFF3DD6FF), const Color(0xFFFF5D73)];
    for (var i = 0; i < 3; i++) {
      sparks.add(_Spark(p, Offset((_rnd.nextDouble() - 0.5) * 6, -_rnd.nextDouble() * 4), colors[_rnd.nextInt(colors.length)]));
    }
    if (!_tick.isAnimating) _tick.repeat();
  }

  void _clear() {
    setState(() {
      strokes.clear();
      _done = false;
      coverage = 0;
    });
  }

  /// Approximate coverage: sample points inside the glyph's ink box and check
  /// distance to the drawn strokes. (Pixel-perfect checks need image decoding; this
  /// is fast and forgiving, which is what toddlers need.)
  void _measure() {
    if (_size == Size.zero) return;
    final tp = _glyph(_size);
    final box = Rect.fromCenter(center: _size.center(Offset.zero), width: tp.width * 0.8, height: tp.height * 0.7);
    final pts = strokes.expand((s) => s).toList();
    if (pts.isEmpty) return;
    var hit = 0, total = 0;
    final r = _size.width * 0.09;
    for (var y = box.top; y <= box.bottom; y += box.height / 6) {
      for (var x = box.left; x <= box.right; x += box.width / 6) {
        total++;
        if (pts.any((p) => (p - Offset(x, y)).distance < r)) hit++;
      }
    }
    final outside = pts.where((p) => !box.inflate(r).contains(p)).length / pts.length;
    setState(() => coverage = hit / max(1, total));
    if (coverage > 0.42 && outside < 0.35 && !_done) {
      _done = true;
      widget.onDone?.call();
    }
  }

  TextPainter _glyph(Size size) => TextPainter(
    text: TextSpan(
      text: widget.char,
      style: TextStyle(fontSize: size.width * (widget.char.characters.length > 1 ? 0.4 : 0.68), fontWeight: FontWeight.w800, color: Colors.black12),
    ),
    textDirection: TextDirection.ltr,
  )..layout();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        AspectRatio(
          aspectRatio: 1,
          child: LayoutBuilder(
            builder: (context, box) {
              _size = box.biggest;
              return GestureDetector(
                onPanStart: (d) => setState(() {
                  strokes.add([d.localPosition]);
                  _spark(d.localPosition);
                }),
                onPanUpdate: (d) => setState(() {
                  strokes.last.add(d.localPosition);
                  _spark(d.localPosition);
                }),
                onPanEnd: (_) => _measure(),
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(28),
                    border: Border.all(color: widget.color.withValues(alpha: 0.3), width: 4),
                  ),
                  child: CustomPaint(painter: _TracePainter(_glyph(_size), strokes, sparks, widget.color), size: Size.infinite),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('✏️ ${(coverage * 100).round()}% traced', style: const TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(width: 12),
            TextButton(
              onPressed: _clear,
              child: const Text('🧽 Clear', style: TextStyle(fontSize: 18)),
            ),
          ],
        ),
      ],
    );
  }
}

class _TracePainter extends CustomPainter {
  _TracePainter(this.glyph, this.strokes, this.sparks, this.color);
  final TextPainter glyph;
  final List<List<Offset>> strokes;
  final List<_Spark> sparks;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    glyph.paint(canvas, Offset((size.width - glyph.width) / 2, (size.height - glyph.height) / 2));
    final pen = Paint()
      ..color = color
      ..strokeWidth = size.width * 0.06
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;
    for (final s in strokes) {
      if (s.length == 1) {
        canvas.drawCircle(s.first, pen.strokeWidth / 2, Paint()..color = color);
        continue;
      }
      final path = Path()..moveTo(s.first.dx, s.first.dy);
      for (final p in s.skip(1)) {
        path.lineTo(p.dx, p.dy);
      }
      canvas.drawPath(path, pen);
    }
    for (final sp in sparks) {
      canvas.drawCircle(sp.p, 3 + 4 * sp.life, Paint()..color = sp.color.withValues(alpha: sp.life.clamp(0, 1)));
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

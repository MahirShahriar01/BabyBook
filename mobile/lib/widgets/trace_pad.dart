import 'dart:math';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/logic.dart';

/// Letter tracing pad with sparkles.
///
/// Uses raw pointer events (a `Listener`), so the scrolling bottom sheet can't steal
/// the finger mid-stroke, and tells the parent to lock scrolling while drawing.
/// Completion is measured against a pixel mask of the real glyph, so it works for
/// thin Bangla/Hindi letters as well as fat Latin ones.
class TracePad extends StatefulWidget {
  const TracePad({super.key, required this.char, required this.color, this.onDone, this.onDrawingChanged, this.fontFamily, this.label});
  final String char;
  final Color color;
  final String? fontFamily;
  final String Function(int percent)? label;
  final VoidCallback? onDone;
  final ValueChanged<bool>? onDrawingChanged;

  @override
  State<TracePad> createState() => _TracePadState();
}

class _Spark {
  _Spark(this.p, this.v, this.color);
  Offset p, v;
  double life = 1;
  final Color color;
}

const _grid = 64; // mask resolution (cells per side)

class _TracePadState extends State<TracePad> with SingleTickerProviderStateMixin {
  final List<List<Offset>> strokes = [];
  final List<_Spark> sparks = [];
  late final AnimationController _tick = AnimationController(vsync: this, duration: const Duration(seconds: 1))..addListener(_step);
  final _rnd = Random();
  bool _done = false;
  double coverage = 0;
  Size _size = Size.zero;
  List<bool>? _mask;
  String _maskKey = '';
  int? _pointer;

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

  TextStyle _style(double side, Paint? paint) => TextStyle(
        fontSize: side * (widget.char.characters.length > 1 ? 0.42 : 0.68),
        fontWeight: FontWeight.w800,
        fontFamily: widget.fontFamily,
        fontFamilyFallback: const ['Baloo2', 'HindSiliguri'],
        foreground: paint,
        color: paint == null ? const Color(0x22000000) : null,
        height: 1.15,
      );

  TextPainter _glyph(double side, {Paint? paint}) =>
      TextPainter(text: TextSpan(text: widget.char, style: _style(side, paint)), textDirection: TextDirection.ltr)..layout();

  Offset _glyphOffset(TextPainter tp, Size size) => Offset((size.width - tp.width) / 2, (size.height - tp.height) / 2);

  /// Rasterise the glyph at grid resolution once per letter/size.
  Future<void> _buildMask(Size size) async {
    final key = '${widget.char}@${size.width.round()}';
    if (_maskKey == key) return;
    _maskKey = key;
    final scale = _grid / size.width;
    final rec = ui.PictureRecorder();
    final canvas = Canvas(rec)..scale(scale);
    final tp = _glyph(size.width, paint: Paint()..color = Colors.black);
    tp.paint(canvas, _glyphOffset(tp, size));
    final img = await rec.endRecording().toImage(_grid, _grid);
    final data = await img.toByteData(format: ui.ImageByteFormat.rawRgba);
    img.dispose();
    if (data == null || !mounted || _maskKey != key) return;
    _mask = List.generate(_grid * _grid, (i) => data.getUint8(i * 4 + 3) > 60);
  }

  void _step() {
    if (sparks.isEmpty) {
      _tick.stop();
      return;
    }
    for (final s in sparks) {
      s.p += s.v;
      s.v += const Offset(0, 0.25);
      s.life -= 0.035;
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

  void _measure() {
    final mask = _mask;
    if (mask == null || _size == Size.zero) return;
    final k = _grid / _size.width;
    final drawn = List<bool>.filled(_grid * _grid, false);
    for (final s in strokes) {
      stampStroke(drawn, _grid, [for (final p in s) Point(p.dx * k, p.dy * k)], _brush(_size.width) * k / 2);
    }
    final (cov, outside) = traceScore(mask, drawn, _grid);
    setState(() => coverage = cov);
    if (cov > 0.6 && outside < 0.45 && !_done) {
      _done = true;
      HapticFeedback.mediumImpact();
      widget.onDone?.call();
    }
  }

  double _brush(double side) => side * 0.075;

  void _down(PointerDownEvent e) {
    if (_pointer != null) return; // one finger at a time
    _pointer = e.pointer;
    widget.onDrawingChanged?.call(true);
    HapticFeedback.selectionClick();
    setState(() => strokes.add([e.localPosition]));
    _spark(e.localPosition);
  }

  void _move(PointerMoveEvent e) {
    if (e.pointer != _pointer) return;
    setState(() => strokes.last.add(e.localPosition));
    _spark(e.localPosition);
  }

  void _up(PointerEvent e) {
    if (e.pointer != _pointer) return;
    _pointer = null;
    widget.onDrawingChanged?.call(false);
    _measure();
  }

  @override
  Widget build(BuildContext context) {
    final percent = (coverage * 100).round();
    return Column(children: [
      AspectRatio(
        aspectRatio: 1,
        child: LayoutBuilder(builder: (context, box) {
          final size = box.biggest;
          if (_size != size) {
            _size = size;
            _buildMask(size);
          }
          return Listener(
            behavior: HitTestBehavior.opaque,
            onPointerDown: _down,
            onPointerMove: _move,
            onPointerUp: _up,
            onPointerCancel: _up,
            // An empty pan handler wins the gesture arena on the pad, so parent scroll views
            // never start a drag from here (drawing itself uses the raw pointer events above).
            child: GestureDetector(
              onPanStart: (_) {},
              onPanUpdate: (_) {},
              child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: _done ? Colors.green : widget.color.withValues(alpha: 0.3), width: 4),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(24),
                child: CustomPaint(
                  painter: _TracePainter(
                    fill: _glyph(size.width),
                    outline: _glyph(
                      size.width,
                      paint: Paint()
                        ..style = PaintingStyle.stroke
                        ..strokeWidth = 2
                        ..color = widget.color.withValues(alpha: 0.55),
                    ),
                    offsetOf: (tp) => _glyphOffset(tp, size),
                    strokes: strokes,
                    sparks: sparks,
                    color: widget.color,
                    brush: _brush(size.width),
                  ),
                  size: Size.infinite,
                ),
              ),
            ),
            ),
          );
        }),
      ),
      const SizedBox(height: 8),
      Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        Text(_done ? '⭐⭐⭐ $percent%' : (widget.label?.call(percent) ?? '✏️ $percent%'), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        const SizedBox(width: 12),
        TextButton.icon(onPressed: _clear, icon: const Text('🧽', style: TextStyle(fontSize: 18)), label: const Text('')),
      ]),
    ]);
  }
}

class _TracePainter extends CustomPainter {
  _TracePainter({required this.fill, required this.outline, required this.offsetOf, required this.strokes, required this.sparks, required this.color, required this.brush});
  final TextPainter fill, outline;
  final Offset Function(TextPainter) offsetOf;
  final List<List<Offset>> strokes;
  final List<_Spark> sparks;
  final Color color;
  final double brush;

  @override
  void paint(Canvas canvas, Size size) {
    fill.paint(canvas, offsetOf(fill));
    outline.paint(canvas, offsetOf(outline));
    final pen = Paint()
      ..color = color
      ..strokeWidth = brush
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;
    for (final s in strokes) {
      if (s.length == 1) {
        canvas.drawCircle(s.first, brush / 2, Paint()..color = color);
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

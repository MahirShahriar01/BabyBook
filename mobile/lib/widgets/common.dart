import 'dart:math';

import 'package:confetti/confetti.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../models/content.dart';
import '../services/ads_service.dart';
import '../services/buddy_engine.dart';
import '../services/speech_service.dart';
import '../state/app_state.dart';

const palette = [
  Color(0xFFFF4FA3),
  Color(0xFF9B5CFF),
  Color(0xFF1E90FF),
  Color(0xFF22B573),
  Color(0xFFFF8A3D),
  Color(0xFFFFB23F),
  Color(0xFF00C2A8),
  Color(0xFFFF5D73),
  Color(0xFF7C5CFF),
  Color(0xFF3DA5FF),
];
Color colorAt(int i) => palette[i % palette.length];

void tapFeedback() {
  HapticFeedback.lightImpact();
  SystemSound.play(SystemSoundType.click);
}

Future<void> say(BuildContext context, String text, {String? lang, double? pitch, double? rate, void Function(int, int)? onWord}) {
  final st = context.read<AppState>();
  return SpeechService.instance.speak(text, lang: lang ?? st.profile.uiLang, pitch: pitch ?? 1.15, rate: rate ?? 0.95, onWord: onWord);
}

Future<T?> go<T>(BuildContext context, Widget page) {
  tapFeedback();
  return Navigator.of(context).push<T>(
    PageRouteBuilder(
      pageBuilder: (_, _, _) => page,
      transitionDuration: const Duration(milliseconds: 380),
      transitionsBuilder: (_, a, _, child) {
        final curved = CurvedAnimation(parent: a, curve: Curves.easeOutBack);
        return FadeTransition(
          opacity: a,
          child: ScaleTransition(scale: Tween(begin: 0.92, end: 1.0).animate(curved), child: child),
        );
      },
    ),
  );
}

// ------------------------------------------------------------------ celebration (confetti)
class Celebration {
  static final controller = ConfettiController(duration: const Duration(milliseconds: 900));
  static void fire() {
    HapticFeedback.mediumImpact();
    controller.play();
  }
}

class CelebrationLayer extends StatelessWidget {
  const CelebrationLayer({super.key, required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) {
    final t = context.watch<AppState>().theme;
    return Stack(
      children: [
        child,
        Align(
          alignment: Alignment.topCenter,
          child: ConfettiWidget(
            confettiController: Celebration.controller,
            blastDirectionality: BlastDirectionality.explosive,
            numberOfParticles: 30,
            gravity: 0.25,
            colors: [t.primary, t.secondary, t.accent, Colors.white],
          ),
        ),
      ],
    );
  }
}

/// Complete an activity with confetti and a sticker toast.
void finishActivity(BuildContext context, String kind, {String id = 'x', String? name, int? stars, String? lang, bool celebrate = true}) {
  final st = context.read<AppState>();
  final sticker = st.complete(kind, id: id, name: name, starsEarned: stars, lang: lang);
  if (celebrate) Celebration.fire();
  if (sticker) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('🎁 New sticker: ${st.stickers.last}', style: const TextStyle(fontSize: 18)),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}

// ------------------------------------------------------------------ background
class KidBackground extends StatefulWidget {
  const KidBackground({super.key, required this.child});
  final Widget child;
  @override
  State<KidBackground> createState() => _KidBackgroundState();
}

class _KidBackgroundState extends State<KidBackground> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(seconds: 14))..repeat();
  static const _floaters = ['⭐', '🎈', '☁️', '✨', '🪐', '🌈', '🫧', '💫', '🦋'];

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.watch<AppState>().theme;
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [t.bgFrom, t.bgTo]),
      ),
      child: Stack(
        children: [
          Positioned.fill(
            child: IgnorePointer(
              child: AnimatedBuilder(
                animation: _c,
                builder: (context, _) => LayoutBuilder(
                  builder: (context, box) {
                    return Stack(
                      children: [
                        for (var i = 0; i < 9; i++)
                          Positioned(
                            left: ((i * 37) % 100) / 100 * box.maxWidth,
                            top: ((i * 53) % 100) / 100 * box.maxHeight + sin(_c.value * 2 * pi + i) * 18,
                            child: Opacity(
                              opacity: t.dark ? 0.5 : 0.3,
                              child: Text(_floaters[i], style: const TextStyle(fontSize: 26)),
                            ),
                          ),
                      ],
                    );
                  },
                ),
              ),
            ),
          ),
          widget.child,
        ],
      ),
    );
  }
}

// ------------------------------------------------------------------ scaffold
class KidScaffold extends StatelessWidget {
  const KidScaffold({super.key, required this.title, required this.body, this.emoji = '', this.actions = const [], this.banner = false, this.showBack = true});
  final String title, emoji;
  final Widget body;
  final List<Widget> actions;
  final bool banner, showBack;

  @override
  Widget build(BuildContext context) {
    final t = context.watch<AppState>().theme;
    return Scaffold(
      backgroundColor: t.bgFrom,
      body: KidBackground(
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
                child: Row(
                  children: [
                    if (showBack) ...[
                      Bouncy(
                        onTap: () => Navigator.of(context).maybePop(),
                        child: GlassBox(
                          padding: const EdgeInsets.all(10),
                          child: const Text('⬅️', style: TextStyle(fontSize: 24)),
                        ),
                      ),
                      const SizedBox(width: 10),
                    ],
                    Expanded(
                      child: Text(
                        '$emoji $title'.trim(),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: t.text),
                      ),
                    ),
                    ...actions,
                    const StarChip(),
                  ],
                ),
              ),
              Expanded(child: body),
              if (banner) const BannerSlot(),
            ],
          ),
        ),
      ),
    );
  }
}

class GlassBox extends StatelessWidget {
  const GlassBox({super.key, required this.child, this.padding = const EdgeInsets.all(16), this.radius = 24, this.color});
  final Widget child;
  final EdgeInsets padding;
  final double radius;
  final Color? color;
  @override
  Widget build(BuildContext context) {
    final t = context.watch<AppState>().theme;
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color ?? t.surface.withValues(alpha: 0.85),
        borderRadius: BorderRadius.circular(radius),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.08), offset: const Offset(0, 6)),
          BoxShadow(color: t.primary.withValues(alpha: 0.12), blurRadius: 24, offset: const Offset(0, 10)),
        ],
      ),
      child: DefaultTextStyle.merge(
        style: TextStyle(color: t.text),
        child: child,
      ),
    );
  }
}

class StarChip extends StatelessWidget {
  const StarChip({super.key});
  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();
    return TweenAnimationBuilder<double>(
      key: ValueKey(st.stars),
      tween: Tween(begin: 1.3, end: 1),
      duration: const Duration(milliseconds: 400),
      curve: Curves.elasticOut,
      builder: (_, s, child) => Transform.scale(scale: s, child: child),
      child: GlassBox(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        radius: 999,
        child: Text('⭐ ${st.stars} · Lv ${st.level}', style: const TextStyle(fontWeight: FontWeight.w800)),
      ),
    );
  }
}

/// Squishy tap animation wrapper.
class Bouncy extends StatefulWidget {
  const Bouncy({super.key, required this.child, this.onTap});
  final Widget child;
  final VoidCallback? onTap;
  @override
  State<Bouncy> createState() => _BouncyState();
}

class _BouncyState extends State<Bouncy> {
  double _s = 1;
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _s = 0.9),
      onTapCancel: () => setState(() => _s = 1),
      onTapUp: (_) {
        setState(() => _s = 1);
        tapFeedback();
        widget.onTap?.call();
      },
      child: AnimatedScale(scale: _s, duration: const Duration(milliseconds: 120), child: widget.child),
    );
  }
}

class KidButton extends StatelessWidget {
  const KidButton({super.key, required this.label, this.onTap, this.ghost = false, this.big = false, this.color});
  final String label;
  final VoidCallback? onTap;
  final bool ghost, big;
  final Color? color;
  @override
  Widget build(BuildContext context) {
    final t = context.watch<AppState>().theme;
    final disabled = onTap == null;
    return Opacity(
      opacity: disabled ? 0.5 : 1,
      child: Bouncy(
        onTap: onTap,
        child: Container(
          padding: EdgeInsets.symmetric(horizontal: big ? 30 : 20, vertical: big ? 16 : 11),
          decoration: BoxDecoration(
            gradient: ghost || color != null ? null : LinearGradient(colors: [t.primary, t.secondary]),
            color: color ?? (ghost ? t.surface.withValues(alpha: 0.85) : null),
            borderRadius: BorderRadius.circular(999),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.15), offset: const Offset(0, 5))],
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: big ? 22 : 17, fontWeight: FontWeight.w800, color: ghost ? t.text : Colors.white),
          ),
        ),
      ),
    );
  }
}

/// Animated emoji: bounce | drive | sail | fly | spin | wobble | pulse | pop | float | orbit
class AnimatedEmoji extends StatefulWidget {
  const AnimatedEmoji(this.emoji, {super.key, this.size = 56, this.anim = 'bounce', this.delay = 0});
  final String emoji, anim;
  final double size;
  final int delay;
  @override
  State<AnimatedEmoji> createState() => _AnimatedEmojiState();
}

class _AnimatedEmojiState extends State<AnimatedEmoji> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: Duration(
      milliseconds: switch (widget.anim) {
        'drive' || 'fly' || 'sail' || 'spin' || 'orbit' => 3200,
        _ => 1300,
      },
    ),
  );

  @override
  void initState() {
    super.initState();
    Future.delayed(Duration(milliseconds: widget.delay), () => mounted ? _c.repeat() : null);
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final txt = Text(widget.emoji, style: TextStyle(fontSize: widget.size));
    return AnimatedBuilder(
      animation: _c,
      builder: (_, child) {
        final v = _c.value;
        final s = sin(v * 2 * pi);
        return switch (widget.anim) {
          'drive' => Transform.translate(offset: Offset(s * widget.size * 0.9, 0), child: child),
          'sail' => Transform.translate(
            offset: Offset(s * widget.size * 0.5, 0),
            child: Transform.rotate(angle: s * 0.12, child: child),
          ),
          'fly' => Transform.translate(
            offset: Offset(s * widget.size * 0.6, cos(v * 2 * pi) * widget.size * 0.25),
            child: Transform.rotate(angle: s * 0.15, child: child),
          ),
          'spin' => Transform.rotate(angle: v * 2 * pi, child: child),
          'wobble' => Transform.rotate(angle: s * 0.18, child: child),
          'pulse' || 'pop' => Transform.scale(scale: 1 + 0.15 * s.abs(), child: child),
          'float' => Transform.translate(offset: Offset(0, s * 10), child: child),
          'orbit' => Transform.translate(offset: Offset(cos(v * 2 * pi) * 30, s * 30), child: child),
          _ => Transform.translate(offset: Offset(0, -12 * s.abs()), child: child),
        };
      },
      child: txt,
    );
  }
}

/// Colorful menu tile.
class KidTile extends StatelessWidget {
  const KidTile({super.key, required this.emoji, required this.label, required this.color, this.sub, this.onTap, this.badge, this.anim = 'bounce'});
  final String emoji, label, anim;
  final String? sub, badge;
  final Color color;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) {
    return Bouncy(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [color, Color.lerp(color, Colors.black, 0.18)!]),
          borderRadius: BorderRadius.circular(26),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.16), offset: const Offset(0, 7))],
        ),
        child: Stack(
          children: [
            Positioned(
              top: -30,
              left: -20,
              child: Container(
                width: 110,
                height: 90,
                decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(60)),
              ),
            ),
            if (badge != null)
              Positioned(
                top: 8,
                left: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.9), borderRadius: BorderRadius.circular(99)),
                  child: Text(
                    badge!,
                    style: const TextStyle(fontSize: 11, color: Colors.black87, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            Center(
              child: Padding(
                padding: const EdgeInsets.all(8),
                // scaleDown keeps long labels (e.g. Bangla) inside small tiles
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 190),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        AnimatedEmoji(emoji, size: 44, anim: anim),
                        const SizedBox(height: 6),
                        Text(
                          label,
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w800),
                        ),
                        if (sub != null)
                          Text(
                            sub!,
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 12),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class SpeechBubble extends StatelessWidget {
  const SpeechBubble(this.text, {super.key});
  final String text;
  @override
  Widget build(BuildContext context) => GlassBox(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    radius: 22,
    child: Text(text, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
  );
}

class Mascot extends StatelessWidget {
  const Mascot({super.key, required this.emoji, required this.line, this.lang});
  final String emoji, line;
  final String? lang;
  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Bouncy(
          onTap: () => say(context, line, lang: lang),
          child: AnimatedEmoji(emoji, size: 64, anim: 'float'),
        ),
        const SizedBox(width: 8),
        Expanded(child: SpeechBubble(line)),
      ],
    );
  }
}

class KidProgress extends StatelessWidget {
  const KidProgress({super.key, required this.value, this.height = 12});
  final double value, height;
  @override
  Widget build(BuildContext context) {
    final t = context.watch<AppState>().theme;
    return ClipRRect(
      borderRadius: BorderRadius.circular(99),
      child: Container(
        height: height,
        color: Colors.black.withValues(alpha: 0.08),
        alignment: Alignment.centerLeft,
        child: FractionallySizedBox(
          widthFactor: value.clamp(0, 1).toDouble(),
          child: Container(
            decoration: BoxDecoration(gradient: LinearGradient(colors: [t.accent, t.primary])),
          ),
        ),
      ),
    );
  }
}

/// Grown-up check before settings / purchases / outbound actions (Play Families best practice).
Future<bool> parentalGate(BuildContext context) async {
  final r = Random();
  final a = 6 + r.nextInt(7), b = 3 + r.nextInt(7), ans = a * b;
  final opts = shuffledInts([ans, ans + a, ans - b, ans + 7]);
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      title: const Text('👨‍👩‍👧 For grown-ups only', textAlign: TextAlign.center),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('Please answer to continue:'),
          const SizedBox(height: 10),
          Text('$a × $b = ?', style: const TextStyle(fontSize: 34, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            alignment: WrapAlignment.center,
            children: [
              for (final o in opts)
                FilledButton.tonal(
                  onPressed: () => Navigator.pop(ctx, o == ans),
                  child: Text('$o', style: const TextStyle(fontSize: 20)),
                ),
            ],
          ),
        ],
      ),
    ),
  );
  return ok == true;
}

List<int> shuffledInts(List<int> l) => l..shuffle();

/// Lets the kid say a word; scores pronunciation 0-3 stars using on-device speech recognition.
class SayItCard extends StatefulWidget {
  const SayItCard({super.key, required this.word, this.lang = 'en', this.onScore});
  final String word, lang;
  final void Function(int stars)? onScore;
  @override
  State<SayItCard> createState() => _SayItCardState();
}

class _SayItCardState extends State<SayItCard> {
  String _state = 'idle';
  int _stars = 0, _score = 0;
  String _heard = '';

  static const _fb = {
    'en': ["Let's try again together!", 'Good try!', 'Very good!', 'Perfect pronunciation!'],
    'bn': ['চলো আবার একসাথে বলি!', 'ভালো চেষ্টা!', 'খুব ভালো!', 'একদম সঠিক উচ্চারণ!'],
    'es': ['¡Intentémoslo otra vez!', '¡Buen intento!', '¡Muy bien!', '¡Pronunciación perfecta!'],
    'fr': ['Essayons encore !', 'Bon essai !', 'Très bien !', 'Prononciation parfaite !'],
    'hi': ['चलो फिर से बोलें!', 'अच्छी कोशिश!', 'बहुत अच्छा!', 'बिल्कुल सही उच्चारण!'],
  };

  Future<void> _run() async {
    setState(() => _state = 'listening');
    try {
      final heard = await SpeechService.instance.listen(lang: widget.lang);
      final res = scoreWord(widget.word, [heard.text, ...heard.alternatives]);
      if (!mounted) return;
      setState(() {
        _state = 'result';
        _stars = res.$1;
        _score = res.$2;
        _heard = res.$3;
      });
      widget.onScore?.call(_stars);
      await SpeechService.instance.speak((_fb[widget.lang] ?? _fb['en']!)[_stars], lang: widget.lang);
      if (_stars < 3) await SpeechService.instance.speak(widget.word, lang: widget.lang, rate: 0.6);
    } catch (_) {
      if (mounted) setState(() => _state = 'error');
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.watch<AppState>().theme;
    return GlassBox(
      child: Column(
        children: [
          Bouncy(
            onTap: _state == 'listening' ? null : _run,
            child: Container(
              width: 84,
              height: 84,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(colors: [t.accent, t.primary]),
                boxShadow: [
                  BoxShadow(
                    color: t.primary.withValues(alpha: _state == 'listening' ? 0.6 : 0.2),
                    blurRadius: _state == 'listening' ? 30 : 8,
                    spreadRadius: _state == 'listening' ? 6 : 0,
                  ),
                ],
              ),
              alignment: Alignment.center,
              child: const Text('🎤', style: TextStyle(fontSize: 38)),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _state == 'listening' ? 'Listening… say it now!' : 'Tap and say "${widget.word}"',
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
            textAlign: TextAlign.center,
          ),
          if (_state == 'result') ...[
            const SizedBox(height: 6),
            Text('⭐' * _stars + '☆' * (3 - _stars), style: const TextStyle(fontSize: 32)),
            Text('I heard: "$_heard" · $_score%', style: const TextStyle(fontSize: 14)),
          ],
          if (_state == 'error') const Text('I could not hear you. Check the microphone 🎧', textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

/// (stars, score, heard)
(int, int, String) scoreWord(String target, List<String> heard) {
  final r = pronunciationScore(target, heard);
  return (r.stars, r.score, r.heard);
}

Color textOn(Color c) => c.computeLuminance() > 0.6 ? Colors.black87 : Colors.white;

bool forKid(BuildContext context, List<String> ages) => forAge(ages, context.read<AppState>().profile.age);

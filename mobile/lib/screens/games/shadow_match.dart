import 'dart:math';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../i18n.dart';
import '../../localize.dart';
import '../../models/content.dart';
import '../../services/logic.dart';
import '../../services/speech_service.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';

const _black = ColorFilter.matrix([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.75, 0]);

/// Match the picture to its shadow (visual discrimination).
class ShadowMatch extends StatefulWidget {
  const ShadowMatch({super.key});
  @override
  State<ShadowMatch> createState() => _ShadowMatchState();
}

class _ShadowMatchState extends State<ShadowMatch> {
  late List<TopicItem> pool;
  List<TopicItem> opts = [];
  late TopicItem target;
  final wrong = <String>{};
  bool found = false;
  int score = 0;

  String get _ui => context.read<AppState>().profile.uiLang == 'bn' ? 'bn' : 'en';
  int get _n => {'2-4': 3, '5-7': 4}[context.read<AppState>().profile.age] ?? 6;

  @override
  void initState() {
    super.initState();
    const ids = {'animals', 'birds', 'vehicles', 'fruits', 'sky', 'ships'};
    pool = [for (final t in context.read<AppState>().content.topics.where((t) => ids.contains(t.id))) ...t.items];
    _make();
  }

  void _make() {
    opts = shuffled(pool).take(_n).toList();
    target = opts[Random().nextInt(opts.length)];
    wrong.clear();
    found = false;
  }

  void _pick(TopicItem o) {
    if (found) return;
    if (o.id == target.id) {
      setState(() {
        found = true;
        score++;
      });
      SpeechService.instance.speak(tr(_ui, 'yesIt', {'x': itemName(o, _ui)}), lang: _ui);
      if (score % 3 == 0) finishActivity(context, 'game', id: 'shadow', name: 'Shadow match x3', stars: 2);
      Future.delayed(const Duration(milliseconds: 1400), () => mounted ? setState(_make) : null);
    } else {
      tapFeedback();
      setState(() => wrong.add(o.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    return KidScaffold(
      title: tr(_ui, 'findShadow'),
      emoji: '👤',
      actions: [Padding(padding: const EdgeInsets.only(right: 8), child: Text('✅ $score', style: const TextStyle(fontWeight: FontWeight.w800)))],
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Center(child: AnimatedEmoji(target.emoji, key: ValueKey(target.id), size: 96, anim: 'pop')),
          Center(child: Text(itemName(target, _ui), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800))),
          const SizedBox(height: 14),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: _n > 4 ? 3 : 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            children: [
              for (final o in opts)
                Bouncy(
                  onTap: () => _pick(o),
                  child: Opacity(
                    opacity: wrong.contains(o.id) ? 0.3 : 1,
                    child: GlassBox(
                      child: Center(
                        child: found && o.id == target.id
                            ? Text(o.emoji, style: const TextStyle(fontSize: 60))
                            : ColorFiltered(colorFilter: _black, child: Text(o.emoji, style: const TextStyle(fontSize: 60))),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

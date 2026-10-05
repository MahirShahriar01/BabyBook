import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/content.dart';
import '../../services/logic.dart';
import '../../services/speech_service.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';

/// Three items from one topic + one from another: find the odd one.
class OddOneOut extends StatefulWidget {
  const OddOneOut({super.key});
  @override
  State<OddOneOut> createState() => _OddOneOutState();
}

class _OddOneOutState extends State<OddOneOut> {
  late Topic group, oddGroup;
  late TopicItem odd;
  late List<TopicItem> cards;
  final wrong = <String>{};
  bool found = false;
  int score = 0;

  @override
  void initState() {
    super.initState();
    _make();
  }

  void _make() {
    final topics = shuffled(context.read<AppState>().content.topics.where((t) => t.items.length >= 3));
    group = topics[0];
    oddGroup = topics[1];
    odd = shuffled(oddGroup.items).first;
    cards = shuffled([...shuffled(group.items).take(3), odd]);
    wrong.clear();
    found = false;
  }

  void _pick(TopicItem it) {
    if (found) return;
    if (it.id == odd.id) {
      setState(() {
        found = true;
        score++;
      });
      SpeechService.instance.speak('Yes! ${it.name} is not in ${group.title}. It belongs to ${oddGroup.title}.');
      if (score % 3 == 0) finishActivity(context, 'game', id: 'odd', name: 'Odd one out x3', stars: 2);
    } else {
      tapFeedback();
      setState(() => wrong.add(it.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    return KidScaffold(
      title: 'Odd One Out',
      emoji: '🕵️',
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Which one does not belong?',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 14),
          Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                children: [
                  for (final it in cards)
                    Bouncy(
                      onTap: () => _pick(it),
                      child: Opacity(
                        opacity: wrong.contains(it.id) ? 0.35 : 1,
                        child: GlassBox(
                          color: found && it.id == odd.id ? Colors.green.withValues(alpha: 0.3) : null,
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              AnimatedEmoji(it.emoji, size: 56, anim: found && it.id == odd.id ? 'wobble' : 'float'),
                              Text(it.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                            ],
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          if (found) ...[
            const SizedBox(height: 14),
            Text(
              '${odd.emoji} belongs to ${oddGroup.emoji} ${oddGroup.title}; the others are ${group.emoji} ${group.title}!',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 10),
            Center(
              child: KidButton(label: '➡️ Next', onTap: () => setState(_make)),
            ),
          ],
        ],
      ),
    );
  }
}

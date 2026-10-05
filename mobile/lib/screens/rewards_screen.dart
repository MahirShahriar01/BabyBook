import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../i18n.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';

const _badges = [
  ('letter', '🔤', 'Letter Learner', 10),
  ('story', '📖', 'Bookworm', 3),
  ('game', '🧠', 'Brain Champ', 5),
  ('explore', '🧭', 'Explorer', 20),
  ('buddy', '🗣️', 'Super Speaker', 10),
  ('quiz', '🎓', 'Quiz Whiz', 10),
  ('ailab', '🤖', 'Future Scientist', 3),
];

class RewardsScreen extends StatelessWidget {
  const RewardsScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();
    final counts = <String, int>{};
    st.done.forEach((k, v) => counts[k.split(':').first] = (counts[k.split(':').first] ?? 0) + v);
    final lang = st.profile.uiLang;
    return KidScaffold(
      title: tr(lang, 'rewards'),
      emoji: '🎁',
      body: ListView(
        padding: const EdgeInsets.all(14),
        children: [
          GlassBox(
            child: Column(
              children: [
                const AnimatedEmoji('🏆', size: 70, anim: 'wobble'),
                Text('${tr(lang, 'level')} ${st.level} · ⭐ ${st.stars}', style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                KidProgress(value: (st.stars % 10) / 10),
                const SizedBox(height: 6),
                const Text('Every 5 stars = a new sticker!'),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text('🌟 Sticker book (${st.stickers.length})', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
          const SizedBox(height: 10),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              for (final s in st.settings.stickers)
                Bouncy(
                  onTap: () => st.stickers.contains(s) ? Celebration.fire() : null,
                  child: GlassBox(
                    padding: const EdgeInsets.all(10),
                    child: Opacity(
                      opacity: st.stickers.contains(s) ? 1 : 0.2,
                      child: Text(s, style: const TextStyle(fontSize: 40)),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          const Text('🏅 Badges', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
          const SizedBox(height: 10),
          for (final b in _badges)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: GlassBox(
                child: Row(
                  children: [
                    Opacity(
                      opacity: (counts[b.$1] ?? 0) >= b.$4 ? 1 : 0.35,
                      child: Text(b.$2, style: const TextStyle(fontSize: 40)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(b.$3, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                          const SizedBox(height: 4),
                          KidProgress(value: (counts[b.$1] ?? 0) / b.$4),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text('${(counts[b.$1] ?? 0).clamp(0, b.$4)}/${b.$4}'),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

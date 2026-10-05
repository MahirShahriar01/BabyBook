import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../i18n.dart';
import '../services/ads_service.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';
import 'ai_lab_screen.dart';
import 'alphabet_screen.dart';
import 'buddy_screen.dart';
import 'explore_screen.dart';
import 'games_screen.dart';
import 'parents_screen.dart';
import 'quiz_screen.dart';
import 'rewards_screen.dart';
import 'stories_screen.dart';
import 'videos_screen.dart';

class ModuleInfo {
  const ModuleInfo(this.emoji, this.color, this.sub, this.anim, this.page);
  final String emoji, sub, anim;
  final Color color;
  final Widget Function() page;
}

final modules = <String, ModuleInfo>{
  'alphabet': ModuleInfo('🔤', const Color(0xFFFF4FA3), 'ABC • অআ • ¡Hola!', 'wobble', () => const AlphabetScreen()),
  'explore': ModuleInfo('🦁', const Color(0xFFFF8A3D), 'Animals • Planes • World', 'bounce', () => const ExploreScreen()),
  'stories': ModuleInfo('📖', const Color(0xFF1E90FF), 'Read & learn morals', 'float', () => const StoriesScreen()),
  'games': ModuleInfo('🧩', const Color(0xFF22B573), 'Sudoku • Memory • Logic', 'wobble', () => const GamesScreen()),
  'buddy': ModuleInfo('🤖', const Color(0xFF7C5CFF), 'Talk & speak better', 'pulse', () => const BuddyScreen()),
  'quiz': ModuleInfo('❓', const Color(0xFFFF5D73), 'General knowledge', 'bounce', () => const QuizScreen()),
  'videos': ModuleInfo('📺', const Color(0xFF00C2A8), 'Safe cartoons', 'float', () => const VideosScreen()),
  'ailab': ModuleInfo('🧪', const Color(0xFF3D2CFF), 'How does AI think?', 'spin', () => const AiLabScreen()),
};

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();
    final s = st.settings;
    final lang = st.profile.uiLang;
    final avatar = s.avatars.where((a) => a.id == st.profile.avatar).firstOrNull;
    final order = (s.homeOrder.isEmpty ? modules.keys.toList() : s.homeOrder).where((k) => modules.containsKey(k) && s.feature(k)).toList();
    final h = DateTime.now().hour;
    final hi = lang == 'bn'
        ? tr(lang, 'hello')
        : (h < 12
              ? 'Good morning'
              : h < 17
              ? 'Good afternoon'
              : 'Good evening');

    return Scaffold(
      body: KidBackground(
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 10, 16, 24),
                  children: [
                    Row(
                      children: [
                        Bouncy(
                          onTap: () => say(context, '$hi, ${st.profile.name}!'),
                          child: GlassBox(
                            padding: const EdgeInsets.all(8),
                            child: AnimatedEmoji(avatar?.emoji ?? '🙂', size: 34, anim: 'wobble'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text('$hi, ${st.profile.name}! 👋', maxLines: 2, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                        ),
                        const StarChip(),
                      ],
                    ),
                    if (s.announcement.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      GlassBox(
                        child: Text('📣 ${s.announcement}', style: const TextStyle(fontWeight: FontWeight.w700)),
                      ),
                    ],
                    const SizedBox(height: 14),
                    GlassBox(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Wrap(
                            alignment: WrapAlignment.spaceBetween,
                            spacing: 10,
                            children: [
                              Text('🏆 ${tr(lang, 'level')} ${st.level}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),

                              Text('🔥 ${st.streakCount} day streak', style: const TextStyle(fontWeight: FontWeight.w700)),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text('${10 - st.stars % 10} more ⭐ to reach ${tr(lang, 'level')} ${st.level + 1}'),
                          const SizedBox(height: 6),
                          KidProgress(value: (st.stars % 10) / 10),
                        ],
                      ),
                    ),
                    if (s.feature('rewards') && st.missions.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      GlassBox(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('🎯 ${tr(lang, 'missions')}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                            for (final m in st.missions)
                              InkWell(
                                onTap: () => modules[m.route] != null ? go(context, modules[m.route]!.page()) : null,
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 6),
                                  child: Row(
                                    children: [
                                      Text(m.count >= m.goal ? '✅' : m.emoji, style: const TextStyle(fontSize: 24)),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Text(
                                          m.text,
                                          style: TextStyle(fontWeight: FontWeight.w700, decoration: m.count >= m.goal ? TextDecoration.lineThrough : null),
                                        ),
                                      ),
                                      Text('${m.count}/${m.goal}', style: const TextStyle(fontWeight: FontWeight.w800)),
                                    ],
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 18),
                    const Text('🗺️ Adventure Map', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 10),
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: order.length,
                      gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
                        maxCrossAxisExtent: 230,
                        mainAxisSpacing: 16,
                        crossAxisSpacing: 14,
                        childAspectRatio: 0.98,
                      ),
                      itemBuilder: (_, i) {
                        final k = order[i];
                        final m = modules[k]!;
                        return KidTile(
                          emoji: m.emoji,
                          label: tr(lang, k),
                          sub: m.sub,
                          color: m.color,
                          anim: m.anim,
                          badge: '${tr(lang, 'level')} ${i + 1}',
                          onTap: () => go(context, m.page()),
                        );
                      },
                    ),
                    const SizedBox(height: 20),
                    Wrap(
                      alignment: WrapAlignment.center,
                      spacing: 12,
                      runSpacing: 12,
                      children: [
                        if (s.feature('rewards'))
                          KidButton(label: '🎁 ${tr(lang, 'rewards')} (${st.stickers.length})', onTap: () => go(context, const RewardsScreen())),
                        if (s.feature('parents'))
                          KidButton(
                            label: '👨‍👩‍👧 ${tr(lang, 'parents')}',
                            ghost: true,
                            onTap: () async {
                              if (await parentalGate(context) && context.mounted) go(context, const ParentsScreen());
                            },
                          ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Text('${s.appName} · ${s.tagline}', textAlign: TextAlign.center, style: const TextStyle(fontSize: 12)),
                  ],
                ),
              ),
              if (AdsService.instance.bannerOn) const BannerSlot(),
            ],
          ),
        ),
      ),
    );
  }
}

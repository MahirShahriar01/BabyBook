import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../i18n.dart';
import '../services/ads_service.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';
import 'onboarding_screen.dart';

/// Grown-ups zone (opened only after the parental gate).
class ParentsScreen extends StatelessWidget {
  const ParentsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();
    final s = st.settings;
    final p = st.profile;
    final counts = <String, int>{};
    st.done.forEach((k, v) => counts[k.split(':').first] = (counts[k.split(':').first] ?? 0) + v);

    Widget row(String label, Widget field) => Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Row(
        children: [
          SizedBox(
            width: 130,
            child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
          ),
          Expanded(child: field),
        ],
      ),
    );
    DropdownButton<String> dd(String value, Map<String, String> items, void Function(String) on) => DropdownButton<String>(
      isExpanded: true,
      value: items.containsKey(value) ? value : items.keys.first,
      items: [for (final e in items.entries) DropdownMenuItem(value: e.key, child: Text(e.value))],
      onChanged: (v) => v == null ? null : on(v),
    );

    return KidScaffold(
      title: 'Grown-ups Zone',
      emoji: '👨‍👩‍👧',
      body: ListView(
        padding: const EdgeInsets.all(14),
        children: [
          GlassBox(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('👤 Child profile', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                row('Name', TextFormField(initialValue: p.name, maxLength: 20, onChanged: (v) => st.updateProfile((x) => x.name = v))),
                row('Age group', dd(p.age, {for (final g in s.ageGroups) g.id: '${g.range} · ${g.label}'}, (v) => st.updateProfile((x) => x.age = v))),
                row(
                  'Hero',
                  dd(p.avatar, {for (final a in s.avatars) a.id: '${a.emoji} ${a.name}'}, (v) {
                    final a = s.avatars.firstWhere((e) => e.id == v);
                    st.updateProfile((x) {
                      x.avatar = a.id;
                      x.gender = a.gender;
                    });
                  }),
                ),
                if (s.themeMode == 'kid_choice')
                  row('Theme', dd(st.theme.id, {for (final t in s.themes) t.id: '${t.emoji} ${t.name}'}, (v) => st.updateProfile((x) => x.themeId = v)))
                else
                  Padding(padding: const EdgeInsets.only(top: 10), child: Text('Theme is set by the administrator (${s.themeMode.replaceAll('_', ' ')}).')),
                row('App language', dd(p.uiLang, uiLanguages, (v) => st.updateProfile((x) => x.uiLang = v))),
                row(
                  'Learning',
                  dd(p.learnLang, {for (final l in st.content.languages) l.code: '${l.flag} ${l.name}'}, (v) => st.updateProfile((x) => x.learnLang = v)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          GlassBox(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('⏱️ Screen time', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                const SizedBox(height: 6),
                Text('Today: ${st.dailyMinutes} min${st.limit > 0 ? ' of ${st.limit} min' : ''}'),
                if (st.limit > 0)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: KidProgress(value: st.dailyMinutes / st.limit),
                  ),
                row(
                  'Daily limit',
                  dd('${st.limitMinutes}', {
                    '0': 'Default (${s.dailyLimit} min)',
                    for (final m in [15, 30, 45, 60, 90, 120]) '$m': '$m minutes',
                    '100000': 'No limit',
                  }, (v) => st.setLimit(int.parse(v))),
                ),
                const SizedBox(height: 10),
                KidButton(label: '⏳ Give more time today', ghost: true, onTap: st.addTime),
              ],
            ),
          ),
          const SizedBox(height: 12),
          GlassBox(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('📊 Learning report', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                Text('⭐ ${st.stars} stars · 🔥 ${st.streakCount} day streak · 🎁 ${st.stickers.length} stickers'),
                for (final e in {
                  'letter': '🔤 Letters',
                  'story': '📖 Stories',
                  'game': '🧩 Games',
                  'explore': '🌍 Explore',
                  'buddy': '🤖 Buddy',
                  'quiz': '❓ Quiz',
                  'ailab': '🧪 AI Lab',
                  'video': '📺 Videos',
                }.entries)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Row(
                      children: [
                        Expanded(child: Text(e.value)),
                        Text('${counts[e.key] ?? 0}', style: const TextStyle(fontWeight: FontWeight.w800)),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          if (AdsService.instance.enabled && s.ads['rewarded'] == true) ...[
            const SizedBox(height: 12),
            GlassBox(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('🎁 Bonus stickers', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                  const Text('Optional: watch a short, family-safe ad to give your child 5 bonus stars.'),
                  const SizedBox(height: 8),
                  KidButton(
                    label: '▶️ Watch ad for +5 ⭐',
                    ghost: true,
                    onTap: () => AdsService.instance.showRewarded(
                      () => st.complete('reward', id: 'rewarded-ad', starsEarned: 5),
                      onUnavailable: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No ad available right now'))),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 12),
          GlassBox(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('🔒 Privacy', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                const Text(
                  '• No sign-up, no account, no email.\n• Name and progress stay on this device only.\n• Only anonymous usage counts are sent (if enabled).\n• Ads are child-directed, non-personalised and G-rated.\n• Speech uses the device\'s own speech services.',
                ),
                const SizedBox(height: 10),
                KidButton(
                  label: '🗑️ Erase all data on this device',
                  color: Colors.redAccent,
                  onTap: () async {
                    final ok = await showDialog<bool>(
                      context: context,
                      builder: (c) => AlertDialog(
                        title: const Text('Erase everything?'),
                        content: const Text('The profile and all progress on this device will be deleted.'),
                        actions: [
                          TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
                          TextButton(onPressed: () => Navigator.pop(c, true), child: const Text('Erase')),
                        ],
                      ),
                    );
                    if (ok == true && context.mounted) {
                      await st.eraseAll();
                      if (context.mounted) Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const OnboardingScreen()), (_) => false);
                    }
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

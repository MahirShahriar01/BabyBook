import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../i18n.dart';
import '../services/analytics.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';
import 'home_screen.dart';

/// Four "levels": name -> age -> hero (gender) -> theme.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});
  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  int step = 1;
  final _name = TextEditingController();

  @override
  void initState() {
    super.initState();
    final st = context.read<AppState>();
    _name.text = st.profile.name;
    WidgetsBinding.instance.addPostFrameCallback((_) => say(context, tr(st.profile.uiLang, 'askName')));
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  void _go(int n, [String? line]) {
    tapFeedback();
    setState(() => step = n);
    if (line != null) say(context, line);
  }

  void _finish(String themeId) {
    final st = context.read<AppState>();
    st.updateProfile((p) {
      p.themeId = themeId;
      p.done = true;
    });
    Analytics.instance.track('onboarding_complete', name: themeId);
    Celebration.fire();
    say(context, '${tr(st.profile.uiLang, 'letsGo')} ${st.profile.name}!');
    Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const HomeScreen()));
  }

  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();
    final s = st.settings;
    final lang = st.profile.uiLang;
    final t = st.theme;

    Widget body = switch (step) {
      1 => Column(
        key: const ValueKey(1),
        children: [
          Mascot(emoji: '🤖', line: tr(lang, 'askName')),
          const SizedBox(height: 20),
          TextField(
            controller: _name,
            maxLength: 20,
            textAlign: TextAlign.center,
            textCapitalization: TextCapitalization.words,
            style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800),
            decoration: InputDecoration(
              hintText: tr(lang, 'namePlaceholder'),
              filled: true,
              fillColor: t.surface,
              counterText: '',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(22)),
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 14),
          if (_name.text.trim().isNotEmpty)
            Text('👋 ${tr(lang, 'hello')} ${_name.text.trim()}!', style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
          const SizedBox(height: 14),
          KidButton(
            big: true,
            label: '${tr(lang, 'next')} ➡️',
            onTap: _name.text.trim().isEmpty
                ? null
                : () {
                    FocusScope.of(context).unfocus();
                    st.updateProfile((p) => p.name = _name.text.trim());
                    _go(2, tr(lang, 'askAge', {'name': _name.text.trim()}));
                  },
          ),
        ],
      ),
      2 => Column(
        key: const ValueKey(2),
        children: [
          Mascot(emoji: '🎂', line: tr(lang, 'askAge', {'name': st.profile.name})),
          const SizedBox(height: 20),
          for (final (i, g) in s.ageGroups.indexed)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: SizedBox(
                height: 120,
                child: KidTile(
                  emoji: '🎈${g.emoji}',
                  label: g.range,
                  sub: g.label,
                  color: [const Color(0xFFFF8A3D), const Color(0xFF22B573), const Color(0xFF7C5CFF)][i % 3],
                  anim: 'float',
                  onTap: () {
                    st.updateProfile((p) => p.age = g.id);
                    _go(3, tr(lang, 'askHero'));
                  },
                ),
              ),
            ),
          KidButton(label: '⬅️ ${tr(lang, 'back')}', ghost: true, onTap: () => _go(1)),
        ],
      ),
      3 => Column(
        key: const ValueKey(3),
        children: [
          Mascot(emoji: '🦸', line: tr(lang, 'askHero')),
          const SizedBox(height: 20),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            mainAxisSpacing: 14,
            crossAxisSpacing: 14,
            childAspectRatio: 1.15,
            children: [
              for (final (i, a) in s.avatars.indexed)
                KidTile(
                  emoji: a.emoji,
                  label: a.name,
                  color: colorAt(i + 2),
                  anim: 'wobble',
                  onTap: () {
                    st.updateProfile((p) {
                      p.avatar = a.id;
                      p.gender = a.gender;
                    });
                    _go(4, tr(lang, 'askTheme'));
                  },
                ),
            ],
          ),
          const SizedBox(height: 14),
          KidButton(label: '⬅️ ${tr(lang, 'back')}', ghost: true, onTap: () => _go(2)),
        ],
      ),
      _ => Column(
        key: const ValueKey(4),
        children: [
          Mascot(emoji: '🎨', line: tr(lang, 'askTheme')),
          if (s.themeMode == 'forced') const Padding(padding: EdgeInsets.only(top: 8), child: Text('Your grown-ups picked a special theme for everyone ✨')),
          const SizedBox(height: 20),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            mainAxisSpacing: 14,
            crossAxisSpacing: 14,
            childAspectRatio: 1.15,
            children: [
              for (final th in s.themes)
                KidTile(
                  emoji: th.emoji,
                  label: th.name,
                  color: th.primary,
                  badge: th.id == (s.genderThemes[st.profile.gender] ?? s.defaultThemeId) ? '★ for you' : null,
                  onTap: () => _finish(th.id),
                ),
            ],
          ),
          const SizedBox(height: 14),
          KidButton(label: '⬅️ ${tr(lang, 'back')}', ghost: true, onTap: () => _go(3)),
        ],
      ),
    };

    return Scaffold(
      body: KidBackground(
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(18),
            children: [
              Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 8,
                runSpacing: 8,
                children: [
                  GlassBox(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    radius: 99,
                    child: Text('✨ ${s.appName}', style: const TextStyle(fontWeight: FontWeight.w800)),
                  ),

                  for (final e in uiLanguages.entries)
                    Padding(
                      padding: const EdgeInsets.only(left: 6),
                      child: KidButton(
                        label: e.value,
                        ghost: lang != e.key,
                        onTap: () => st.updateProfile((p) {
                          p.uiLang = e.key;
                          p.learnLang = e.key;
                        }),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 14),
              GlassBox(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(tr(lang, 'step', {'n': '$step'}), style: const TextStyle(fontWeight: FontWeight.w800)),
                        const Spacer(),
                        Text('⭐' * step + '☆' * (4 - step)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    KidProgress(value: step / 4),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 450),
                transitionBuilder: (c, a) => SlideTransition(
                  position: Tween(begin: const Offset(0.4, 0), end: Offset.zero).animate(CurvedAnimation(parent: a, curve: Curves.easeOutBack)),
                  child: FadeTransition(opacity: a, child: c),
                ),
                child: GlassBox(padding: const EdgeInsets.all(20), child: body),
              ),
              const SizedBox(height: 18),
              const Text('No sign-up. No account. Everything stays on this device. 💖', textAlign: TextAlign.center, style: TextStyle(fontSize: 13)),
            ],
          ),
        ),
      ),
    );
  }
}

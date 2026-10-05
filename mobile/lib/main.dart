import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import 'i18n.dart';
import 'screens/home_screen.dart';
import 'screens/onboarding_screen.dart';
import 'services/ads_service.dart';
import 'state/app_state.dart';
import 'widgets/common.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Fonts are fetched once and cached; the app falls back to system fonts offline.
  GoogleFonts.config.allowRuntimeFetching = true;
  final state = AppState();
  await state.load();
  // Ads are initialised with child-directed settings before any request is made.
  AdsService.instance.init(state.settings.ads);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(statusBarColor: Colors.transparent));
  runApp(ChangeNotifierProvider.value(value: state, child: const KidsExplorerApp()));
}

class KidsExplorerApp extends StatelessWidget {
  const KidsExplorerApp({super.key});

  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();
    final t = st.theme;
    final base = ThemeData(
      useMaterial3: true,
      brightness: t.dark ? Brightness.dark : Brightness.light,
      colorScheme: ColorScheme.fromSeed(
        seedColor: t.primary,
        brightness: t.dark ? Brightness.dark : Brightness.light,
        primary: t.primary,
        secondary: t.secondary,
        surface: t.surface,
      ),
      scaffoldBackgroundColor: t.bgFrom,
    );
    // Baloo 2 + Hind Siliguri (Bangla) are bundled for offline use; other admin-chosen
    // fonts are fetched once by google_fonts and cached.
    const bundled = ['Baloo 2', 'Baloo2', 'Hind Siliguri'];
    var text = base.textTheme.apply(fontFamily: 'Baloo2', fontFamilyFallback: const ['HindSiliguri']);
    if (!bundled.contains(st.settings.fontFamily)) {
      try {
        text = GoogleFonts.getTextTheme(st.settings.fontFamily, text);
      } catch (_) {/* unknown font name: keep bundled font */}
    }
    return MaterialApp(
      title: st.settings.appName,
      debugShowCheckedModeBanner: false,
      theme: base.copyWith(
        textTheme: text.apply(bodyColor: t.text, displayColor: t.text),
      ),
      builder: (context, child) => CelebrationLayer(child: _Guards(child: child!)),
      home: st.profile.done ? const HomeScreen() : const OnboardingScreen(),
    );
  }
}

/// Screen-time limit + wiggle-break reminders on top of every screen.
class _Guards extends StatelessWidget {
  const _Guards({required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();
    final lang = st.profile.uiLang;
    Widget overlay(String emoji, String msg, List<Widget> actions) => Positioned.fill(
      child: Material(
        color: Colors.black54,
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: GlassBox(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AnimatedEmoji(emoji, size: 72, anim: 'float'),
                  const SizedBox(height: 10),
                  Text(
                    msg,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 14),
                  ...actions,
                ],
              ),
            ),
          ),
        ),
      ),
    );
    return Stack(
      children: [
        child,
        if (st.timeUp)
          overlay('😴', tr(lang, 'timeUp'), [_InlineGate(onPass: st.addTime)])
        else if (st.breakDue)
          overlay('🙆', tr(lang, 'breakTime'), [KidButton(label: '✅ OK!', onTap: st.dismissBreak)]),
      ],
    );
  }
}

/// Grown-up check rendered inside the overlay (dialogs would open underneath it).
class _InlineGate extends StatefulWidget {
  const _InlineGate({required this.onPass});
  final VoidCallback onPass;
  @override
  State<_InlineGate> createState() => _InlineGateState();
}

class _InlineGateState extends State<_InlineGate> {
  bool open = false;
  late int a, b;
  late List<int> opts;

  void _new() {
    final r = DateTime.now().microsecond;
    a = 6 + r % 7;
    b = 3 + (r ~/ 7) % 7;
    opts = shuffledInts([a * b, a * b + a, a * b - b, a * b + 7]);
  }

  @override
  Widget build(BuildContext context) {
    if (!open) {
      return KidButton(
        label: '👨‍👩‍👧 Grown-ups: more time',
        ghost: true,
        onTap: () => setState(() {
          _new();
          open = true;
        }),
      );
    }
    return Column(
      children: [
        Text('$a × $b = ?', style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          alignment: WrapAlignment.center,
          children: [
            for (final o in opts)
              KidButton(
                label: '$o',
                ghost: true,
                onTap: () {
                  setState(() => open = false);
                  if (o == a * b) widget.onPass();
                },
              ),
          ],
        ),
      ],
    );
  }
}

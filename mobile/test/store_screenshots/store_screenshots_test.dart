// Renders Play Store screenshots of the real Flutter screens (no device needed).
// Skipped in normal test runs (see dart_test.yaml). Generate with:
//
//   flutter test --tags screenshots --run-skipped --update-goldens
//
// PNGs are written to test/store_screenshots/screenshots/. Colour emoji need a Noto Color Emoji font:
// set EMOJI_FONT=/path/to/NotoColorEmoji.ttf (Linux: /usr/share/fonts/truetype/noto/NotoColorEmoji.ttf).
@Tags(['screenshots'])
library;

import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kids_explorer/screens/ai_lab_screen.dart';
import 'package:kids_explorer/screens/alphabet_screen.dart';
import 'package:kids_explorer/screens/buddy_screen.dart';
import 'package:kids_explorer/screens/explore_screen.dart';
import 'package:kids_explorer/screens/games/sudoku_game.dart';
import 'package:kids_explorer/screens/games_screen.dart';
import 'package:kids_explorer/screens/home_screen.dart';
import 'package:kids_explorer/screens/onboarding_screen.dart';
import 'package:kids_explorer/screens/stories_screen.dart';
import 'package:kids_explorer/state/app_state.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

Future<void> _loadFont(String family, List<String> assets) async {
  final loader = FontLoader(family);
  for (final a in assets) {
    loader.addFont(rootBundle.load(a));
  }
  await loader.load();
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    await _loadFont('Baloo2', ['assets/fonts/Baloo2_400Regular.ttf', 'assets/fonts/Baloo2_600SemiBold.ttf', 'assets/fonts/Baloo2_700Bold.ttf', 'assets/fonts/Baloo2_800ExtraBold.ttf']);
    await _loadFont('HindSiliguri', ['assets/fonts/HindSiliguri_400Regular.ttf', 'assets/fonts/HindSiliguri_700Bold.ttf']);
    final emoji = Platform.environment['EMOJI_FONT'] ?? '/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf';
    if (File(emoji).existsSync()) {
      final loader = FontLoader('NotoColorEmoji')..addFont(Future.value(ByteData.sublistView(File(emoji).readAsBytesSync())));
      await loader.load();
    }
  });

  Future<AppState> state(WidgetTester tester, {required String theme, required String age, required String avatar, String gender = 'neutral', bool done = true}) async {
    SharedPreferences.setMockInitialValues({
      if (done) 'kea.profile.v1': '{"name":"Mahi","age":"$age","gender":"$gender","avatar":"$avatar","themeId":"$theme","done":true}',
      'kea.progress.v1': '{"stars":27,"stickers":["🦁","🐼","🦄","🐬","🚀"],"streakCount":4,"streakLast":"2026-10-05"}',
    });
    final st = AppState();
    await tester.runAsync(() => st.load(startClock: false));
    return st;
  }

  Future<void> shot(WidgetTester tester, AppState st, Widget screen, String name, {Future<void> Function()? interact}) async {
    tester.view.physicalSize = const Size(1080, 2160);
    tester.view.devicePixelRatio = 2.625;
    addTearDown(tester.view.reset);
    final t = st.theme;
    final theme = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(seedColor: t.primary, primary: t.primary, secondary: t.secondary, brightness: t.dark ? Brightness.dark : Brightness.light),
      fontFamily: 'Baloo2',
      fontFamilyFallback: const ['HindSiliguri', 'NotoColorEmoji'],
    );
    await tester.pumpWidget(ChangeNotifierProvider.value(
      value: st,
      child: MaterialApp(debugShowCheckedModeBanner: false, theme: theme, home: screen),
    ));
    await tester.pump(const Duration(milliseconds: 900));
    if (interact != null) await interact();
    await tester.pump(const Duration(milliseconds: 1200));
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('screenshots/$name.png'));
  }

  testWidgets('01 onboarding', (t) async => shot(t, await state(t, theme: 'bubblegum', age: '5-7', avatar: 'girl', done: false), const OnboardingScreen(), '01-onboarding'));
  testWidgets('02 home (girl, bubblegum)', (t) async => shot(t, await state(t, theme: 'bubblegum', age: '5-7', avatar: 'girl', gender: 'girl'), const HomeScreen(), '02-home-bubblegum'));
  testWidgets('03 home (boy, space)', (t) async => shot(t, await state(t, theme: 'space', age: '8-10', avatar: 'boy', gender: 'boy'), const HomeScreen(), '03-home-space'));
  testWidgets('04 alphabet bangla', (t) async {
    final st = await state(t, theme: 'jungle', age: '5-7', avatar: 'robot');
    st.updateProfile((p) => p.learnLang = 'bn');
    await shot(t, st, const AlphabetScreen(), '04-alphabet-bangla');
  });
  testWidgets('05 story', (t) async {
    final st = await state(t, theme: 'ocean', age: '5-7', avatar: 'boy');
    await shot(t, st, StoryReader(story: st.content.stories[1]), '05-story');
  });
  testWidgets('06 explore vehicles', (t) async {
    final st = await state(t, theme: 'sunshine', age: '2-4', avatar: 'superhero');
    await shot(t, st, TopicScreen(topic: st.content.topics.firstWhere((x) => x.id == 'vehicles')), '06-explore-vehicles');
  });
  testWidgets('07 games', (t) async => shot(t, await state(t, theme: 'cyber', age: '8-10', avatar: 'robot'), const GamesScreen(), '07-games'));
  testWidgets('08 sudoku toddler', (t) async => shot(t, await state(t, theme: 'bubblegum', age: '2-4', avatar: 'unicorn'), const SudokuGame(), '08-sudoku'));
  testWidgets('09 buddy', (t) async {
    final st = await state(t, theme: 'space', age: '5-7', avatar: 'astronaut');
    await shot(t, st, const BuddyScreen(), '09-buddy', interact: () async {
      for (final s in ['gimme water', 'i is happy']) {
        await t.tap(find.text(s));
        await t.pump(const Duration(milliseconds: 300));
      }
    });
  });
  testWidgets('10 ai lab', (t) async => shot(t, await state(t, theme: 'cyber', age: '8-10', avatar: 'robot'), const AiLabScreen(), '10-ai-lab'));
}

// Renders every screen at phone size to catch layout overflows and runtime errors.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:kids_explorer/main.dart';
import 'package:kids_explorer/screens/ai_lab_screen.dart';
import 'package:kids_explorer/screens/alphabet_screen.dart';
import 'package:kids_explorer/screens/buddy_screen.dart';
import 'package:kids_explorer/screens/explore_screen.dart';
import 'package:kids_explorer/screens/games/math_pop.dart';
import 'package:kids_explorer/screens/games/memory_game.dart';
import 'package:kids_explorer/screens/games/odd_one_out.dart';
import 'package:kids_explorer/screens/games/pattern_game.dart';
import 'package:kids_explorer/screens/games/sudoku_game.dart';
import 'package:kids_explorer/screens/games_screen.dart';
import 'package:kids_explorer/screens/home_screen.dart';
import 'package:kids_explorer/screens/onboarding_screen.dart';
import 'package:kids_explorer/screens/parents_screen.dart';
import 'package:kids_explorer/screens/quiz_screen.dart';
import 'package:kids_explorer/screens/rewards_screen.dart';
import 'package:kids_explorer/screens/stories_screen.dart';
import 'package:kids_explorer/screens/videos_screen.dart';
import 'package:kids_explorer/state/app_state.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  GoogleFonts.config.allowRuntimeFetching = false;

  // rootBundle decodes large assets on an isolate, so load real async inside tests.
  Future<AppState> makeState(WidgetTester tester, {bool done = true, String age = '5-7'}) async {
    SharedPreferences.setMockInitialValues({
      if (done) 'kea.profile.v1': '{"name":"Mahi","age":"$age","gender":"girl","avatar":"girl","themeId":"bubblegum","done":true}',
    });
    final st = AppState();
    await tester.runAsync(() => st.load(startClock: false));
    return st;
  }

  Future<void> show(WidgetTester tester, AppState st, Widget screen) async {
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      ChangeNotifierProvider.value(
        value: st,
        child: MaterialApp(home: screen),
      ),
    );
    await tester.pump(const Duration(milliseconds: 600));
    await tester.pump(const Duration(milliseconds: 600));
  }

  final screens = <String, Widget Function(AppState)>{
    'onboarding': (_) => const OnboardingScreen(),
    'home': (_) => const HomeScreen(),
    'alphabet': (_) => const AlphabetScreen(),
    'stories': (_) => const StoriesScreen(),
    'story reader': (s) => StoryReader(story: s.content.stories.first),
    'videos': (_) => const VideosScreen(),
    'games': (_) => const GamesScreen(),
    'sudoku': (_) => const SudokuGame(),
    'memory': (_) => const MemoryGame(),
    'pattern': (_) => const PatternGame(),
    'math': (_) => const MathPop(),
    'odd one out': (_) => const OddOneOut(),
    'explore': (_) => const ExploreScreen(),
    'topic': (s) => TopicScreen(topic: s.content.topics.first),
    'quiz': (_) => const QuizScreen(),
    'buddy': (_) => const BuddyScreen(),
    'ai lab': (_) => const AiLabScreen(),
    'rewards': (_) => const RewardsScreen(),
    'parents': (_) => const ParentsScreen(),
  };

  for (final age in ['2-4', '8-10']) {
    for (final e in screens.entries) {
      testWidgets('${e.key} renders (age $age)', (tester) async {
        final st = await makeState(tester, age: age);
        await show(tester, st, e.value(st));
        expect(tester.takeException(), isNull);
      });
    }
  }

  testWidgets('full app: onboarding flow reaches the home map', (tester) async {
    final st = await makeState(tester, done: false);
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(ChangeNotifierProvider.value(value: st, child: const KidsExplorerApp()));
    await tester.pump(const Duration(milliseconds: 500));
    await tester.enterText(find.byType(TextField), 'Rafi');
    await tester.pump();
    await tester.tap(find.textContaining('Next'));
    await tester.pump(const Duration(milliseconds: 800));
    await tester.tap(find.text('5 - 7'));
    await tester.pump(const Duration(milliseconds: 800));
    await tester.tap(find.text('Boy'));
    await tester.pump(const Duration(milliseconds: 800));
    await tester.tap(find.text('Ocean Blue'));
    await tester.pump(const Duration(seconds: 1));
    await tester.pump(const Duration(seconds: 1));
    expect(st.profile.done, isTrue);
    expect(st.profile.name, 'Rafi');
    expect(st.theme.id, 'ocean');
    expect(find.textContaining('Adventure Map'), findsOneWidget);
  });

  testWidgets('sudoku: completing the grid awards stars', (tester) async {
    final st = await makeState(tester, age: '2-4');
    final before = st.stars;
    st.complete('game', id: 'sudoku', starsEarned: 2);
    expect(st.stars, before + 2);
    expect(st.isDone('game:sudoku'), isTrue);
  });
}

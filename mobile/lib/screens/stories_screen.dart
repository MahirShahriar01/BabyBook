import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../i18n.dart';
import '../models/content.dart';
import '../services/speech_service.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';

class StoriesScreen extends StatefulWidget {
  const StoriesScreen({super.key});
  @override
  State<StoriesScreen> createState() => _StoriesScreenState();
}

class _StoriesScreenState extends State<StoriesScreen> {
  bool all = false;
  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();
    final stories = st.content.stories;
    final mine = stories.where((s) => forAge(s.ageGroups, st.profile.age)).toList();
    final list = all ? stories : mine;
    final flags = {for (final l in st.content.languages) l.code: l.flag};
    return KidScaffold(
      title: tr(st.profile.uiLang, 'stories'),
      emoji: '📖',
      banner: true,
      body: ListView(
        padding: const EdgeInsets.all(14),
        children: [
          if (mine.length != stories.length)
            Align(
              alignment: Alignment.centerLeft,
              child: KidButton(ghost: true, label: all ? '🎯 Just for my age' : '🌍 Show all stories', onTap: () => setState(() => all = !all)),
            ),
          const SizedBox(height: 12),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: list.length,
            gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
              maxCrossAxisExtent: 220,
              mainAxisSpacing: 14,
              crossAxisSpacing: 14,
              childAspectRatio: 0.95,
            ),
            itemBuilder: (_, i) {
              final s = list[i];
              return KidTile(
                emoji: s.emoji,
                label: s.title,
                sub: '${flags[s.language] ?? ''} ${s.pages.length} pages${st.isDone('story:${s.id}') ? ' · ⭐' : ''}',
                color: s.color,
                anim: 'float',
                onTap: () => go(context, StoryReader(story: s)),
              );
            },
          ),
        ],
      ),
    );
  }
}

class StoryReader extends StatefulWidget {
  const StoryReader({super.key, required this.story});
  final Story story;
  @override
  State<StoryReader> createState() => _StoryReaderState();
}

class _StoryReaderState extends State<StoryReader> {
  final _pager = PageController();
  int page = 0;
  int wordStart = -1, wordEnd = -1;
  bool reading = false, auto = false;
  String phase = 'read'; // read | moral | quiz | done
  int q = 0, score = 0;
  int? picked;

  Story get s => widget.story;

  @override
  void dispose() {
    SpeechService.instance.stop();
    _pager.dispose();
    super.dispose();
  }

  Future<void> _narrate() async {
    setState(() => reading = true);
    await SpeechService.instance.speak(
      s.pages[page].text,
      lang: s.language,
      rate: 0.88,
      onWord: (a, b) {
        if (!mounted) return;
        setState(() {
          wordStart = a;
          wordEnd = b;
        });
      },
    );
    if (!mounted) return;
    setState(() {
      reading = false;
      wordStart = wordEnd = -1;
    });
    if (auto) {
      await Future.delayed(const Duration(milliseconds: 600));
      if (mounted && auto) _turn(1);
    }
  }

  void _turn(int d) {
    SpeechService.instance.stop();
    tapFeedback();
    if (d > 0 && page == s.pages.length - 1) {
      setState(() {
        auto = false;
        phase = 'moral';
      });
      SpeechService.instance.speak(s.moral, lang: s.language);
      return;
    }
    final next = (page + d).clamp(0, s.pages.length - 1);
    _pager.animateToPage(next, duration: const Duration(milliseconds: 450), curve: Curves.easeOutCubic);
  }

  void _answer(int i) {
    if (picked != null) return;
    final ok = i == s.quiz[q].answer;
    setState(() {
      picked = i;
      if (ok) score++;
    });
    tapFeedback();
    Future.delayed(const Duration(milliseconds: 1100), () {
      if (!mounted) return;
      setState(() {
        picked = null;
        if (q + 1 < s.quiz.length) {
          q++;
        } else {
          phase = 'done';
          finishActivity(context, 'story', id: s.id, name: s.title, stars: 2 + score, lang: s.language);
        }
      });
    });
  }

  Widget _text(String text, KidTheme t) {
    if (wordStart < 0 || wordEnd > text.length) return Text(text, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600, height: 1.5));
    return Text.rich(
      TextSpan(
        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600, height: 1.5),
        children: [
          TextSpan(text: text.substring(0, wordStart)),
          TextSpan(
            text: text.substring(wordStart, wordEnd),
            style: TextStyle(backgroundColor: t.accent, color: Colors.black),
          ),
          TextSpan(text: text.substring(wordEnd)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = context.watch<AppState>().theme;
    return KidScaffold(
      title: s.title,
      emoji: s.emoji,
      body: Padding(
        padding: const EdgeInsets.all(14),
        child: switch (phase) {
          'read' => Column(
            children: [
              KidProgress(value: (page + 1) / s.pages.length),
              const SizedBox(height: 12),
              Expanded(
                child: PageView.builder(
                  controller: _pager,
                  itemCount: s.pages.length,
                  onPageChanged: (p) {
                    SpeechService.instance.stop();
                    setState(() {
                      page = p;
                      wordStart = wordEnd = -1;
                    });
                    if (auto) _narrate();
                  },
                  itemBuilder: (_, i) => AnimatedBuilder(
                    animation: _pager,
                    builder: (_, child) {
                      final delta = _pager.position.haveDimensions ? (_pager.page ?? 0) - i : 0.0;
                      return Transform(
                        alignment: delta > 0 ? Alignment.centerRight : Alignment.centerLeft,
                        transform: Matrix4.identity()
                          ..setEntry(3, 2, 0.001)
                          ..rotateY(delta * 1.2),
                        child: child,
                      );
                    },
                    child: GlassBox(
                      padding: EdgeInsets.zero,
                      radius: 30,
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(30),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Container(
                              height: 220,
                              decoration: BoxDecoration(gradient: LinearGradient(colors: [s.color.withValues(alpha: 0.25), s.color.withValues(alpha: 0.6)])),
                              alignment: Alignment.center,
                              child: s.pages[i].image.isNotEmpty
                                  ? Image.network(
                                      s.pages[i].image,
                                      fit: BoxFit.cover,
                                      width: double.infinity,
                                      errorBuilder: (_, _, _) => Text(s.pages[i].scene, style: const TextStyle(fontSize: 64)),
                                    )
                                  : AnimatedEmoji(s.pages[i].scene, size: 64, anim: 'pulse'),
                            ),
                            Expanded(
                              child: SingleChildScrollView(
                                padding: const EdgeInsets.all(20),
                                child: i == page ? _text(s.pages[i].text, t) : Text(s.pages[i].text, style: const TextStyle(fontSize: 22, height: 1.5)),
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.all(12),
                              child: Text('📄 ${i + 1} / ${s.pages.length}   · swipe ↔', style: const TextStyle(fontWeight: FontWeight.w700)),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                alignment: WrapAlignment.center,
                children: [
                  KidButton(label: '⬅️', ghost: true, onTap: page == 0 ? null : () => _turn(-1)),
                  KidButton(label: reading ? '⏹️ Stop' : '🔊 Read to me', onTap: reading ? () => SpeechService.instance.stop() : _narrate),
                  KidButton(
                    label: auto ? '⏸️ Auto' : '▶️ Auto',
                    ghost: !auto,
                    onTap: () {
                      setState(() => auto = !auto);
                      if (auto && !reading) _narrate();
                    },
                  ),
                  KidButton(label: '➡️', ghost: true, onTap: () => _turn(1)),
                ],
              ),
            ],
          ),
          'moral' => Center(
            child: GlassBox(
              padding: const EdgeInsets.all(26),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const AnimatedEmoji('💡', size: 80, anim: 'wobble'),
                  const Text('Moral of the story', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 10),
                  Text(
                    s.moral,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 18),
                  Wrap(
                    spacing: 10,
                    children: [
                      KidButton(
                        label: '🔊 Hear again',
                        ghost: true,
                        onTap: () => SpeechService.instance.speak(s.moral, lang: s.language),
                      ),
                      KidButton(
                        label: s.quiz.isEmpty ? '🎉 Finish' : '❓ Quiz time!',
                        onTap: () {
                          if (s.quiz.isEmpty) {
                            setState(() => phase = 'done');
                            finishActivity(context, 'story', id: s.id, name: s.title, stars: 2, lang: s.language);
                          } else {
                            setState(() => phase = 'quiz');
                          }
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          'quiz' => Center(
            child: GlassBox(
              padding: const EdgeInsets.all(22),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('Question ${q + 1} / ${s.quiz.length}', style: const TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 10),
                  Text(
                    s.quiz[q].question,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
                  ),
                  IconButton(
                    onPressed: () => SpeechService.instance.speak(s.quiz[q].question, lang: s.language),
                    icon: const Text('🔈', style: TextStyle(fontSize: 24)),
                  ),
                  const SizedBox(height: 10),
                  for (final (i, o) in s.quiz[q].options.indexed)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: SizedBox(
                        width: double.infinity,
                        child: KidButton(
                          label: o,
                          color: picked == null ? null : (i == s.quiz[q].answer ? Colors.green : (picked == i ? Colors.redAccent : null)),
                          onTap: () => _answer(i),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          _ => Center(
            child: GlassBox(
              padding: const EdgeInsets.all(26),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const AnimatedEmoji('🏆', size: 80),
                  const Text('You finished the story!', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
                  if (s.quiz.isNotEmpty) Text('Quiz: $score / ${s.quiz.length} ${'⭐' * score}', style: const TextStyle(fontSize: 20)),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 10,
                    children: [
                      KidButton(
                        label: '🔁 Read again',
                        ghost: true,
                        onTap: () => setState(() {
                          phase = 'read';
                          page = 0;
                          q = 0;
                          score = 0;
                        }),
                      ),
                      KidButton(label: '📚 More stories', onTap: () => Navigator.pop(context)),
                    ],
                  ),
                ],
              ),
            ),
          ),
        },
      ),
    );
  }
}

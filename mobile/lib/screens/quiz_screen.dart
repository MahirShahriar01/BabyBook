import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../i18n.dart';
import '../models/content.dart';
import '../services/logic.dart';
import '../services/speech_service.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';

class QuizScreen extends StatefulWidget {
  const QuizScreen({super.key});
  @override
  State<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen> {
  late List<QuizQ> qs;
  int i = 0, score = 0;
  int? picked;

  @override
  void initState() {
    super.initState();
    _new();
  }

  void _new() {
    final st = context.read<AppState>();
    final pool = st.content.quiz.where((q) => forAge(q.ageGroups, st.profile.age)).toList();
    qs = shuffled(pool.isEmpty ? st.content.quiz : pool).take(5).toList();
    i = 0;
    score = 0;
  }

  void _choose(int k) {
    if (picked != null) return;
    final q = qs[i];
    setState(() => picked = k);
    if (k == q.answer) {
      score++;
      finishActivity(context, 'quiz', id: q.id, name: q.question, celebrate: false);
      SpeechService.instance.speak('Correct!');
    } else {
      tapFeedback();
      SpeechService.instance.speak('The answer is ${q.options[q.answer]}');
    }
    Future.delayed(const Duration(milliseconds: 1500), () {
      if (mounted) {
        setState(() {
          picked = null;
          i++;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<AppState>().profile.uiLang;
    return KidScaffold(
      title: tr(lang, 'quiz'),
      emoji: '❓',
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: i < qs.length
              ? GlassBox(
                  key: ValueKey(i),
                  padding: const EdgeInsets.all(22),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      KidProgress(value: i / qs.length),
                      const SizedBox(height: 12),
                      AnimatedEmoji(qs[i].emoji, size: 72, anim: 'wobble'),
                      Text(
                        qs[i].question,
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800),
                      ),
                      TextButton(
                        onPressed: () => SpeechService.instance.speak(qs[i].question),
                        child: Text('🔈 ${tr(lang, 'listen')}', style: const TextStyle(fontSize: 18)),
                      ),
                      for (final (k, o) in qs[i].options.indexed)
                        Padding(
                          padding: const EdgeInsets.only(top: 10),
                          child: SizedBox(
                            width: double.infinity,
                            child: KidButton(
                              big: true,
                              label: o,
                              color: picked == null ? null : (k == qs[i].answer ? Colors.green : (picked == k ? Colors.redAccent : null)),
                              onTap: () => _choose(k),
                            ),
                          ),
                        ),
                    ],
                  ),
                )
              : GlassBox(
                  padding: const EdgeInsets.all(26),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      AnimatedEmoji(score >= qs.length - 1 ? '🏆' : '🌟', size: 80),
                      Text('$score / ${qs.length} correct!', style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800)),
                      Text('⭐' * score, style: const TextStyle(fontSize: 30)),
                      const SizedBox(height: 14),
                      KidButton(
                        big: true,
                        label: '🔁 Play again',
                        onTap: () {
                          if (score > 0) finishActivity(context, 'game', id: 'quiz-round', name: 'Quiz round');
                          setState(_new);
                        },
                      ),
                    ],
                  ),
                ),
        ),
      ),
    );
  }
}

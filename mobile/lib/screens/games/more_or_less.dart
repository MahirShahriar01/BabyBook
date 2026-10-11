import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../i18n.dart';
import '../../localize.dart';
import '../../services/logic.dart';
import '../../services/speech_service.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';

/// Compare amounts: toddlers count objects, older kids compare numbers.
class MoreOrLess extends StatefulWidget {
  const MoreOrLess({super.key});
  @override
  State<MoreOrLess> createState() => _MoreOrLessState();
}

class _MoreOrLessState extends State<MoreOrLess> {
  late CompareRound q = makeCompare(context.read<AppState>().profile.age);
  int? picked;
  int score = 0;

  String get _ui => context.read<AppState>().profile.uiLang;
  String get _prompt => tr(_ui, q.useNumbers ? (q.askMore ? 'biggerNumber' : 'smallerNumber') : (q.askMore ? 'whichMore' : 'whichLess'));

  void _choose(int side) {
    if (picked != null) return;
    setState(() => picked = side);
    if (side == q.answer) {
      score++;
      SpeechService.instance.speak(tr(_ui, 'correct'), lang: _ui);
      if (score % 5 == 0) finishActivity(context, 'game', id: 'more-less', name: 'More or less x5', stars: 3);
    } else {
      tapFeedback();
    }
    Future.delayed(const Duration(milliseconds: 1300), () {
      if (!mounted) return;
      setState(() {
        picked = null;
        q = makeCompare(context.read<AppState>().profile.age);
      });
    });
  }

  Widget _side(int n, int i) {
    final border = picked == null ? null : (i == q.answer ? Border.all(color: Colors.green, width: 5) : (picked == i ? Border.all(color: Colors.redAccent, width: 5) : null));
    return Expanded(
      child: Bouncy(
        onTap: () => _choose(i),
        child: Container(
          height: 220,
          margin: const EdgeInsets.all(6),
          decoration: BoxDecoration(color: context.watch<AppState>().theme.surface, borderRadius: BorderRadius.circular(24), border: border),
          alignment: Alignment.center,
          padding: const EdgeInsets.all(8),
          child: q.useNumbers
              ? Text(digits(n, _ui), style: const TextStyle(fontSize: 64, fontWeight: FontWeight.w800))
              : Wrap(alignment: WrapAlignment.center, children: [for (var k = 0; k < n; k++) Text(q.thing, style: const TextStyle(fontSize: 30))]),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return KidScaffold(
      title: tr(_ui, 'moreLess'),
      emoji: '⚖️',
      actions: [Padding(padding: const EdgeInsets.only(right: 8), child: Text('✅ $score', style: const TextStyle(fontWeight: FontWeight.w800)))],
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(_prompt, textAlign: TextAlign.center, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
          TextButton(onPressed: () => SpeechService.instance.speak(_prompt, lang: _ui), child: Text('🔈 ${tr(_ui, 'hearAgain')}', style: const TextStyle(fontSize: 18))),
          Row(children: [_side(q.a, 0), _side(q.b, 1)]),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../i18n.dart';
import '../localize.dart';
import '../models/content.dart';
import '../services/logic.dart';
import '../services/speech_service.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';

class ExploreScreen extends StatelessWidget {
  const ExploreScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();
    final topics = st.content.topics.where((t) => forAge(t.ageGroups, st.profile.age)).toList();
    return KidScaffold(
      title: tr(st.profile.uiLang, 'explore'),
      emoji: '🌍',
      banner: true,
      body: GridView.builder(
        padding: const EdgeInsets.all(14),
        itemCount: topics.length,
        gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
          maxCrossAxisExtent: 200,
          mainAxisSpacing: 14,
          crossAxisSpacing: 14,
          childAspectRatio: 0.95,
        ),
        itemBuilder: (_, i) {
          final tp = topics[i];
          final seen = tp.items.where((it) => st.isDone('explore:${tp.id}:${it.id}')).length;
          return KidTile(
            emoji: tp.emoji,
            label: topicTitle(tp, st.profile.uiLang),
            sub: tr(st.profile.uiLang, 'discovered', {'n': seen, 't': tp.items.length}),
            color: tp.color,
            anim: 'float',
            onTap: () => go(context, TopicScreen(topic: tp)),
          );
        },
      ),
    );
  }
}

class TopicScreen extends StatefulWidget {
  const TopicScreen({super.key, required this.topic});
  final Topic topic;
  @override
  State<TopicScreen> createState() => _TopicScreenState();
}

class _TopicScreenState extends State<TopicScreen> {
  int idx = 0;
  bool findMode = false;
  List<TopicItem> opts = [];
  TopicItem? target;
  final wrong = <String>{};

  Topic get tp => widget.topic;
  String get _ui => context.read<AppState>().profile.uiLang == 'bn' ? 'bn' : 'en';
  TopicItem get item => tp.items[idx];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _present(item));
  }

  Future<void> _present(TopicItem it) async {
    final st = context.read<AppState>();
    if (!st.isDone('explore:${tp.id}:${it.id}')) finishActivity(context, 'explore', id: '${tp.id}:${it.id}', name: it.name, celebrate: false);
    final ui = _ui;
    final stop = ui == 'bn' ? '।' : '.';
    // Bangla mode: Bangla name + Bangla fact, then the English word. English mode: English (+ Bangla name if learning Bangla).
    final line = '${itemName(it, ui)}$stop ${it.sound.isNotEmpty ? '${it.sound} ' : ''}${itemFact(it, ui)}';
    await SpeechService.instance.speak(ui == 'bn' ? '$line ইংরেজিতে, ${it.name}.' : line, lang: ui);
    if (ui != 'bn' && st.profile.learnLang == 'bn' && it.bn.isNotEmpty) await SpeechService.instance.speak(it.bn, lang: 'bn');
  }

  void _goTo(int d) {
    tapFeedback();
    setState(() => idx = (idx + d) % tp.items.length);
    _present(item);
  }

  void _round() {
    opts = shuffled(tp.items).take(4).toList();
    target = shuffled(opts).first;
    wrong.clear();
    SpeechService.instance.speak(tr(_ui, 'find', {'x': itemName(target!, _ui)}), lang: _ui);
  }

  void _pick(TopicItem o) {
    if (o.id == target!.id) {
      finishActivity(context, 'game', id: 'find:${tp.id}', name: 'Find ${tp.title}');
      SpeechService.instance.speak(tr(_ui, 'yesIt', {'x': itemName(o, _ui)}), lang: _ui);
      Future.delayed(const Duration(milliseconds: 1400), () => mounted ? setState(_round) : null);
    } else {
      tapFeedback();
      setState(() => wrong.add(o.id));
      SpeechService.instance.speak(tr(_ui, 'thatIs', {'x': itemName(o, _ui)}), lang: _ui);
    }
  }

  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();
    return KidScaffold(
      title: topicTitle(tp, _ui),
      emoji: tp.emoji,
      body: ListView(
        padding: const EdgeInsets.all(14),
        children: [
          Wrap(
            spacing: 8,
            alignment: WrapAlignment.center,
            children: [
              KidButton(label: '👀 ${tr(_ui, 'learn')}', ghost: findMode, onTap: () => setState(() => findMode = false)),
              KidButton(
                label: '🔍 ${tr(_ui, 'findGame')}',
                ghost: !findMode,
                onTap: () => setState(() {
                  findMode = true;
                  _round();
                }),
              ),
            ],
          ),
          const SizedBox(height: 14),
          if (!findMode) ...[
            GestureDetector(
              onHorizontalDragEnd: (d) => (d.primaryVelocity ?? 0) < -200 ? _goTo(1) : ((d.primaryVelocity ?? 0) > 200 ? _goTo(-1) : null),
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 350),
                transitionBuilder: (c, a) => ScaleTransition(scale: a, child: c),
                child: GlassBox(
                  key: ValueKey(item.id),
                  child: Column(
                    children: [
                      Container(
                        height: 190,
                        width: double.infinity,
                        decoration: BoxDecoration(color: item.color ?? tp.color.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(24)),
                        alignment: Alignment.center,
                        clipBehavior: Clip.hardEdge,
                        child: Bouncy(
                          onTap: () => _present(item),
                          child: AnimatedEmoji(item.emoji, size: 96, anim: tp.animation),
                        ),
                      ),
                      if (item.count > 0) Wrap(children: [for (var i = 0; i < item.count; i++) Text(item.object, style: const TextStyle(fontSize: 30))]),
                      const SizedBox(height: 10),
                      Text(item.count > 0 ? '${digits(item.count, _ui)} · ${itemName(item, _ui)}' : itemName(item, _ui), style: const TextStyle(fontSize: 34, fontWeight: FontWeight.w800)),
                      if (_ui == 'bn') Text('🇬🇧 ${item.name}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700)) else if (item.bn.isNotEmpty) Text(item.bn, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
                      if (item.sound.isNotEmpty) Text('🔊 "${item.sound}"', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 6),
                      Text(itemFact(item, _ui), textAlign: TextAlign.center, style: const TextStyle(fontSize: 18)),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 10,
              alignment: WrapAlignment.center,
              children: [
                KidButton(label: '⬅️', ghost: true, onTap: () => _goTo(-1)),
                KidButton(label: '🔊 ${tr(_ui, 'tellMe')}', onTap: () => _present(item)),
                KidButton(label: '➡️', ghost: true, onTap: () => _goTo(1)),
              ],
            ),
            const SizedBox(height: 12),
            SayItCard(
              key: ValueKey('say${item.id}'),
              word: itemName(item, _ui),
              lang: _ui,
              onScore: (s) => s >= 2 ? finishActivity(context, 'explore', id: 'say:${item.id}', name: item.name, stars: s) : null,
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.center,
              children: [
                for (final (i, it) in tp.items.indexed)
                  Bouncy(
                    onTap: () {
                      setState(() => idx = i);
                      _present(it);
                    },
                    child: GlassBox(
                      padding: const EdgeInsets.all(8),
                      color: i == idx ? st.theme.primary.withValues(alpha: 0.3) : null,
                      child: Column(
                        children: [
                          Text(it.emoji, style: const TextStyle(fontSize: 30)),
                          if (st.isDone('explore:${tp.id}:${it.id}')) const Text('⭐', style: TextStyle(fontSize: 10)),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ] else if (target != null) ...[
            Text(
              tr(_ui, 'find', {'x': itemName(target!, _ui)}),
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
            ),
            TextButton(
              onPressed: () => SpeechService.instance.speak(tr(_ui, 'find', {'x': itemName(target!, _ui)}), lang: _ui),
              child: Text('🔈 ${tr(_ui, 'hearAgain')}', style: const TextStyle(fontSize: 18)),
            ),
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              children: [
                for (final o in opts)
                  Bouncy(
                    onTap: () => _pick(o),
                    child: Opacity(
                      opacity: wrong.contains(o.id) ? 0.35 : 1,
                      child: GlassBox(
                        color: o.color,
                        child: Center(child: Text(o.emoji, style: const TextStyle(fontSize: 64))),
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

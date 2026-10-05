import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';

import '../i18n.dart';
import '../models/content.dart';
import '../services/buddy_engine.dart';
import '../services/speech_service.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';

class _Msg {
  _Msg.kid(this.text) : r = null, bot = false;
  _Msg.bot(this.text, [this.r]) : bot = true;
  final String text;
  final BuddyResult? r;
  final bool bot;
}

class BuddyScreen extends StatefulWidget {
  const BuddyScreen({super.key});
  @override
  State<BuddyScreen> createState() => _BuddyScreenState();
}

class _BuddyScreenState extends State<BuddyScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final List<_Msg> msgs = [];
  late String lang;
  String mode = 'chat';
  bool listening = false, talking = false;
  int wordIdx = 0;
  late Map<String, String> dictionary;

  AppState get st => context.read<AppState>();
  Persona get persona {
    final ps = st.settings.personas;
    final id = st.profile.persona.isNotEmpty ? st.profile.persona : '${st.settings.buddy['defaultPersona'] ?? ''}';
    return ps.firstWhere((p) => p.id == id, orElse: () => ps.isNotEmpty ? ps.first : Persona({}));
  }

  List<String> get buddyLangs => strings(st.settings.buddy['languages']);

  @override
  void initState() {
    super.initState();
    lang = buddyLangs.contains(st.profile.learnLang) ? st.profile.learnLang : 'en';
    dictionary = {
      for (final l in st.content.languages)
        for (final g in l.groups)
          for (final le in g.letters)
            for (final w in le.words)
              if (w.meaning.isNotEmpty) w.word.toLowerCase(): w.meaning,
      for (final t in st.content.topics)
        for (final it in t.items) it.name.toLowerCase(): it.fact.replaceAll(RegExp(r'\.$'), '').toLowerCase(),
    };
    _greet();
  }

  @override
  void dispose() {
    SpeechService.instance.stop();
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _greet() {
    msgs
      ..clear()
      ..add(_Msg.bot(greeting(st.content.buddy, lang, {'name': st.profile.name, 'buddy': persona.name})));
  }

  Future<void> _say(String text) async {
    setState(() => talking = true);
    await SpeechService.instance.speak(text, lang: lang, pitch: persona.pitch, rate: persona.rate);
    if (mounted) setState(() => talking = false);
  }

  Future<BuddyResult> _remote(BuddyResult r, String said) async {
    final cfg = st.settings.buddy;
    final url = '${cfg['remoteAiUrl'] ?? ''}';
    if (cfg['useRemoteAi'] != true || url.isEmpty || !r.safe) return r;
    try {
      final res = await http
          .post(
            Uri.parse(url),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'text': said, 'lang': lang, 'age': st.profile.age, 'buddy': persona.name}),
          )
          .timeout(const Duration(seconds: 9));
      if (res.statusCode != 200) return r;
      final j = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
      if ('${j['corrected'] ?? ''}'.isNotEmpty) {
        r.corrected = j['corrected'];
        r.changed = r.corrected != said;
      }
      for (final t in (j['tips'] as List? ?? [])) {
        if (!r.tips.contains('$t')) r.tips.add('$t');
      }
      for (final w in (j['words'] as List? ?? [])) {
        r.words.add(WordFix('${w['from']}', '${w['to']}', '${w['meaning']}'));
      }
      if ('${j['answer'] ?? ''}'.isNotEmpty) r.answer = j['answer'];
      final kb = (st.content.buddy[lang] as Map?) ?? {};
      r.speech = [
        r.praise,
        r.changed ? '${kb['correctIntro'] ?? ''} ${r.corrected}' : '',
        ...r.words.map((w) => '${w.to}: ${w.meaning}.'),
        r.answer,
      ].where((e) => e.isNotEmpty).join(' ');
    } catch (_) {
      /* fall back to on-device answer */
    }
    return r;
  }

  Future<void> _send(String said) async {
    said = said.trim();
    if (said.isEmpty) return;
    _input.clear();
    tapFeedback();
    setState(() => msgs.add(_Msg.kid(said)));
    var r = analyze(said, st.content.buddy, lang: lang, name: st.profile.name, buddy: persona.name, dictionary: dictionary);
    r = await _remote(r, said);
    if (!mounted) return;
    setState(() => msgs.add(_Msg.bot('', r)));
    finishActivity(context, 'buddy', id: lang, name: 'buddy_chat', lang: lang, celebrate: false);
    WidgetsBinding.instance.addPostFrameCallback(
      (_) =>
          _scroll.hasClients ? _scroll.animateTo(_scroll.position.maxScrollExtent, duration: const Duration(milliseconds: 300), curve: Curves.easeOut) : null,
    );
    _say(r.speech);
  }

  Future<void> _mic() async {
    if (listening) {
      await SpeechService.instance.stopListening();
      return;
    }
    setState(() => listening = true);
    try {
      final heard = await SpeechService.instance.listen(lang: lang);
      if (!mounted) return;
      setState(() => listening = false);
      _send(heard.text);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        listening = false;
        msgs.add(_Msg.bot('🎧 I could not hear you. Tap the mic and talk a little louder!'));
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final t = app.theme;
    final toddler = app.profile.age == '2-4';
    final langs = app.content.languages.where((l) => buddyLangs.contains(l.code)).toList();
    final kb = (app.content.buddy[lang] as Map?) ?? {};
    final practice = strings(kb['practiceWords']);
    final samples = lang == 'en'
        ? ['gimme water', 'i is happy', 'what does elephant mean', 'why is the sky blue', 'me want my doggy']
        : (lang == 'bn' ? ['পানি খামু', 'আকাশ নীল কেন', 'তুমি কে'] : <String>[]);

    return KidScaffold(
      title: tr(app.profile.uiLang, 'buddy'),
      emoji: '🤖',
      body: Column(
        children: [
          SizedBox(
            height: 50,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              children: [
                for (final p in app.settings.personas)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: KidButton(
                      label: '${p.emoji} ${p.name}',
                      ghost: p.id != persona.id,
                      onTap: () {
                        app.updateProfile((x) => x.persona = p.id);
                        SpeechService.instance.speak('Hi! I am ${p.name}!', pitch: p.pitch, rate: p.rate);
                      },
                    ),
                  ),
              ],
            ),
          ),
          SizedBox(
            height: 50,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(12, 6, 12, 0),
              children: [
                for (final l in langs)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: KidButton(
                      label: '${l.flag} ${l.nativeName}',
                      ghost: l.code != lang,
                      onTap: () => setState(() {
                        lang = l.code;
                        _greet();
                      }),
                    ),
                  ),
              ],
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              AnimatedEmoji(persona.emoji, size: toddler ? 80 : 60, anim: talking ? 'pulse' : (listening ? 'pop' : 'float')),
              const SizedBox(width: 10),
              Flexible(
                child: Column(
                  children: [
                    Text(
                      talking ? '${persona.name} is talking…' : (listening ? 'I am listening… 👂' : persona.name),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                    ),
                    Wrap(
                      alignment: WrapAlignment.center,
                      children: [
                        TextButton(
                          onPressed: () => setState(() => mode = 'chat'),
                          child: Text('💬 Talk', style: TextStyle(fontWeight: mode == 'chat' ? FontWeight.w900 : FontWeight.w400)),
                        ),
                        TextButton(
                          onPressed: () => setState(() => mode = 'words'),
                          child: Text('🗣️ Say it right', style: TextStyle(fontWeight: mode == 'words' ? FontWeight.w900 : FontWeight.w400)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          Expanded(
            child: mode == 'words' && practice.isNotEmpty
                ? ListView(
                    padding: const EdgeInsets.all(14),
                    children: [
                      Center(
                        child: Text(practice[wordIdx % practice.length], style: const TextStyle(fontSize: 44, fontWeight: FontWeight.w800)),
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        alignment: WrapAlignment.center,
                        children: [
                          KidButton(label: '🔈 ${tr(app.profile.uiLang, 'listen')}', ghost: true, onTap: () => _say(practice[wordIdx % practice.length])),
                          KidButton(
                            label: '🐢 Slowly',
                            ghost: true,
                            onTap: () => SpeechService.instance.speak(practice[wordIdx % practice.length], lang: lang, pitch: persona.pitch, rate: 0.55),
                          ),
                          KidButton(label: '➡️ Next word', onTap: () => setState(() => wordIdx++)),
                        ],
                      ),
                      const SizedBox(height: 12),
                      SayItCard(
                        key: ValueKey('$wordIdx$lang'),
                        word: practice[wordIdx % practice.length],
                        lang: lang,
                        onScore: (s) =>
                            s >= 2 ? finishActivity(context, 'buddy', id: 'say:$lang', name: practice[wordIdx % practice.length], stars: s, lang: lang) : null,
                      ),
                    ],
                  )
                : ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.all(12),
                    itemCount: msgs.length,
                    itemBuilder: (_, i) => _bubble(msgs[i], kb, t),
                  ),
          ),
          if (mode == 'chat') ...[
            SizedBox(
              height: 46,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                children: [
                  for (final s in samples)
                    Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: ActionChip(label: Text(s), onPressed: () => _send(s)),
                    ),
                ],
              ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 4, 12, 10),
                child: Row(
                  children: [
                    Bouncy(
                      onTap: _mic,
                      child: Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: RadialGradient(colors: [t.accent, t.primary]),
                          boxShadow: [
                            BoxShadow(
                              color: t.primary.withValues(alpha: listening ? 0.6 : 0.2),
                              blurRadius: listening ? 26 : 6,
                              spreadRadius: listening ? 6 : 0,
                            ),
                          ],
                        ),
                        alignment: Alignment.center,
                        child: Text(listening ? '⏹️' : '🎤', style: const TextStyle(fontSize: 30)),
                      ),
                    ),
                    if (!toddler) ...[
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: _input,
                          maxLength: 200,
                          textInputAction: TextInputAction.send,
                          onSubmitted: _send,
                          decoration: InputDecoration(
                            counterText: '',
                            hintText: 'Type or say something…',
                            filled: true,
                            fillColor: t.surface,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(22)),
                          ),
                        ),
                      ),
                      IconButton.filled(onPressed: () => _send(_input.text), icon: const Icon(Icons.send)),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _bubble(_Msg m, Map kb, KidTheme t) {
    final mine = !m.bot;
    final r = m.r;
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 520),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          gradient: mine ? LinearGradient(colors: [t.primary, t.secondary]) : null,
          color: mine ? null : t.surface,
          borderRadius: BorderRadius.circular(22),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), offset: const Offset(0, 4))],
        ),
        child: DefaultTextStyle.merge(
          style: TextStyle(color: mine ? Colors.white : t.text, fontSize: 17, fontWeight: FontWeight.w600),
          child: r == null
              ? Text(m.text)
              : !r.safe
              ? Text('🛡️ ${r.answer}')
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${r.praise} ${r.changed ? '' : (kb['perfect'] ?? '')}'),
                    if (r.changed)
                      Container(
                        margin: const EdgeInsets.only(top: 8),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.green.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Colors.green.withValues(alpha: 0.5), width: 2),
                        ),
                        child: Text('✅ ${kb['correctIntro'] ?? ''} ${r.corrected}', style: const TextStyle(fontWeight: FontWeight.w800)),
                      ),
                    for (final w in r.words)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text('📘 ${w.from} → ${w.to}: ${w.meaning}', style: const TextStyle(fontSize: 15)),
                      ),
                    for (final tip in r.tips)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text('💡 $tip', style: const TextStyle(fontSize: 15)),
                      ),
                    if (r.answer.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 8), child: Text('🤖 ${r.answer}')),
                    TextButton(onPressed: () => _say(r.speech), child: const Text('🔊 Hear it')),
                  ],
                ),
        ),
      ),
    );
  }
}

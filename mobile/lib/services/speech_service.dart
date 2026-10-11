// Kid-friendly, free, on-device speech in every language (Bangla included).
//  - Mixed text is split by script so "Car. গাড়ি" uses an English and a Bangla voice.
//  - Prefers the Google TTS engine (best Bangla support) and checks the voice is installed.
//  - If the phone has no voice for a language, uses the optional cloud voice
//    (Admin → App Settings → Voices) or tells grown-ups how to install one.
//  - Plays admin-recorded audio (letters, story pages) with estimated word timing.
import 'dart:async';
import 'dart:convert';

import 'package:android_intent_plus/android_intent.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:http/http.dart' as http;
import 'package:speech_to_text/speech_to_text.dart';

import 'logic.dart';

const locales = {'en': 'en-US', 'bn': 'bn-BD', 'es': 'es-ES', 'fr': 'fr-FR', 'hi': 'hi-IN'};
const _candidates = {
  'bn': ['bn-BD', 'bn-IN', 'bn'],
  'hi': ['hi-IN', 'hi'],
  'en': ['en-US', 'en-GB', 'en-IN'],
};

class Heard {
  Heard(this.text, this.alternatives);
  final String text;
  final List<String> alternatives;
}

class SpeechService {
  SpeechService._();
  static final SpeechService instance = SpeechService._();

  final FlutterTts _tts = FlutterTts();
  final SpeechToText _stt = SpeechToText();
  AudioPlayer? _audio; // created on first use (keeps tests and silent screens light)
  AudioPlayer get _player => _audio ??= AudioPlayer();
  bool _sttReady = false;
  Future<void>? _init;
  final Map<String, String?> _resolved = {}; // lang -> usable locale (null = none on this phone)
  final Map<String, String> _cloudCache = {};
  int _token = 0;

  double kidRate = 0.85;
  String cloudTtsUrl = '';
  bool cloudFallback = true;

  /// Languages this phone could not speak; screens listen to show the install hint.
  final ValueNotifier<Set<String>> missing = ValueNotifier({});

  void configure(Map<String, dynamic> voice) {
    kidRate = (voice['kidRate'] as num?)?.toDouble() ?? kidRate;
    cloudTtsUrl = '${voice['cloudTtsUrl'] ?? ''}';
    cloudFallback = voice['cloudFallback'] != false;
  }

  Future<void> _initTts() => _init ??= () async {
        try {
          await _tts.awaitSpeakCompletion(true);
          if (defaultTargetPlatform == TargetPlatform.android) {
            // Google's engine has Bangla/Hindi voices; some phones default to a vendor engine without them.
            final engines = (await _tts.getEngines as List?)?.map((e) => '$e').toList() ?? [];
            if (engines.contains('com.google.android.tts')) await _tts.setEngine('com.google.android.tts');
          }
        } catch (_) {/* no TTS engine: speak() stays silent */}
      }();

  /// Best installed locale for [lang], or null when the phone has no such voice.
  Future<String?> resolve(String lang) async {
    if (_resolved.containsKey(lang)) return _resolved[lang];
    await _initTts();
    String? found;
    try {
      final android = defaultTargetPlatform == TargetPlatform.android;
      for (final loc in _candidates[lang] ?? [locales[lang] ?? lang]) {
        if (await _tts.isLanguageAvailable(loc) != true) continue;
        // On Android a language can be "available" but its voice data not downloaded yet.
        if (android && await _tts.isLanguageInstalled(loc) == false) continue;
        found = loc;
        break;
      }
    } catch (_) {}
    _resolved[lang] = found;
    if (found == null && !(cloudFallback && cloudTtsUrl.isNotEmpty)) {
      missing.value = {...missing.value, lang};
    }
    return found;
  }

  /// True if the phone (or the cloud voice) can speak [lang].
  Future<bool> canSpeak(String lang) async => await resolve(lang) != null || (cloudFallback && cloudTtsUrl.isNotEmpty);

  /// Re-check voices (e.g. after the parent installed Bangla voice data).
  void recheckVoices() {
    _resolved.clear();
    missing.value = {};
  }

  /// Opens Android's text-to-speech settings so a grown-up can install a voice.
  Future<void> openVoiceSettings() async {
    if (defaultTargetPlatform != TargetPlatform.android) return;
    try {
      await const AndroidIntent(action: 'com.android.settings.TTS_SETTINGS').launch();
    } catch (_) {
      await const AndroidIntent(action: 'android.settings.SETTINGS').launch();
    }
  }

  /// Speak [text]; completes when done. [onWord] receives the spoken word's offsets in [text].
  Future<void> speak(String text, {String lang = 'en', double pitch = 1.1, double? rate, void Function(int start, int end)? onWord}) async {
    if (text.trim().isEmpty) return;
    await stop();
    final my = _token;
    for (final seg in speechSegments(text, lang)) {
      if (my != _token) return;
      await _speakSegment(seg, pitch, rate ?? kidRate, onWord, my);
    }
  }

  Future<void> _speakSegment(SpeechSegment seg, double pitch, double rate, void Function(int, int)? onWord, int my) async {
    final locale = await resolve(seg.lang);
    if (locale == null) {
      if (cloudFallback && cloudTtsUrl.isNotEmpty) await _cloudSpeak(seg, onWord, my);
      return; // never read Bangla with an English voice — it is silent or gibberish
    }
    try {
      await _tts.setLanguage(locale);
      await _tts.setPitch(pitch.clamp(0.5, 2.0));
      // flutter_tts on Android: 0.5 is normal speed
      await _tts.setSpeechRate((rate * 0.5).clamp(0.1, 1.0));
      _tts.setProgressHandler((String t, int start, int end, String word) => onWord?.call(seg.start + start, seg.start + end));
      if (my != _token) return;
      await _tts.speak(seg.text);
    } catch (_) {}
  }

  Future<void> _cloudSpeak(SpeechSegment seg, void Function(int, int)? onWord, int my) async {
    final key = '${seg.lang}|${seg.text}';
    try {
      var url = _cloudCache[key];
      if (url == null) {
        final res = await http
            .post(Uri.parse(cloudTtsUrl), headers: {'Content-Type': 'application/json'}, body: jsonEncode({'text': seg.text.trim(), 'lang': seg.lang}))
            .timeout(const Duration(seconds: 10));
        if (res.statusCode != 200) return;
        url = '${(jsonDecode(res.body) as Map)['url'] ?? ''}';
        if (url.isEmpty) return;
        _cloudCache[key] = url;
      }
      if (my != _token) return;
      await _play(UrlSource(url), seg.text, seg.start, onWord, my);
    } catch (_) {/* offline */}
  }

  /// Play a recording (admin-uploaded URL); estimates word highlights from duration.
  Future<void> playUrl(String url, {String text = '', void Function(int, int)? onWord}) async {
    await stop();
    await _play(UrlSource(url), text, 0, onWord, _token);
  }

  Future<void> _play(Source src, String text, int offset, void Function(int, int)? onWord, int my) async {
    final done = Completer<void>();
    final words = RegExp(r'\S+').allMatches(text).toList();
    final total = words.fold<int>(0, (n, m) => n + m.end - m.start + 1);
    Duration? dur;
    final subs = <StreamSubscription>[
      _player.onPlayerComplete.listen((_) => done.isCompleted ? null : done.complete()),
      _player.onDurationChanged.listen((d) => dur = d),
      _player.onPositionChanged.listen((p) {
        if (onWord == null || words.isEmpty || dur == null || dur!.inMilliseconds == 0 || my != _token) return;
        final pos = p.inMilliseconds / dur!.inMilliseconds * total;
        var acc = 0;
        for (final m in words) {
          acc += m.end - m.start + 1;
          if (acc >= pos) {
            onWord(offset + m.start, offset + m.end);
            break;
          }
        }
      }),
    ];
    try {
      await _player.play(src);
      await done.future.timeout(const Duration(minutes: 3));
    } catch (_) {
    } finally {
      for (final s in subs) {
        s.cancel();
      }
    }
  }

  Future<void> stop() async {
    _token++;
    try {
      await _tts.stop();
      await _audio?.stop();
    } catch (_) {}
  }

  Future<bool> get canListen async {
    if (_sttReady) return true;
    try {
      _sttReady = await _stt.initialize(onError: (_) {}, onStatus: (_) {});
    } catch (_) {
      _sttReady = false;
    }
    return _sttReady;
  }

  bool get isListening => _stt.isListening;

  /// Listen once; resolves with the final transcript (+ alternatives).
  Future<Heard> listen({String lang = 'en'}) async {
    if (!await canListen) throw Exception('unsupported');
    await stop();
    final done = Completer<Heard>();
    await _stt.listen(
      onResult: (r) {
        if (r.finalResult && !done.isCompleted) {
          done.complete(Heard(r.recognizedWords, r.alternates.map((a) => a.recognizedWords).toList()));
        }
      },
      listenOptions: SpeechListenOptions(
        localeId: (locales[lang] ?? lang).replaceAll('-', '_'),
        partialResults: false,
        cancelOnError: true,
        listenFor: const Duration(seconds: 12),
        pauseFor: const Duration(seconds: 3),
      ),
    );
    return done.future.timeout(
      const Duration(seconds: 16),
      onTimeout: () {
        _stt.stop();
        throw Exception('no-speech');
      },
    );
  }

  Future<void> stopListening() => _stt.stop();
}

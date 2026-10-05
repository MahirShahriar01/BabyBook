// Free, on-device speech: flutter_tts (Android TTS engine) + speech_to_text
// (Android SpeechRecognizer). No paid API involved.
import 'dart:async';

import 'package:flutter_tts/flutter_tts.dart';
import 'package:speech_to_text/speech_to_text.dart';

const locales = {'en': 'en-US', 'bn': 'bn-BD', 'es': 'es-ES', 'fr': 'fr-FR', 'hi': 'hi-IN'};

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
  bool _sttReady = false;
  bool _ttsReady = false;

  Future<void> _initTts() async {
    if (_ttsReady) return;
    _ttsReady = true;
    await _tts.awaitSpeakCompletion(true);
  }

  /// Speak [text]; completes when speech ends. [onWord] gets the character offset
  /// of each spoken word (used for story highlighting).
  Future<void> speak(String text, {String lang = 'en', double pitch = 1.1, double rate = 0.95, void Function(int start, int end)? onWord}) async {
    if (text.trim().isEmpty) return;
    try {
      await _initTts();
      await _tts.stop();
      final locale = locales[lang] ?? lang;
      final ok = await _tts.isLanguageAvailable(locale);
      await _tts.setLanguage(ok == true ? locale : (lang == 'bn' ? 'bn-IN' : 'en-US'));
      await _tts.setPitch(pitch.clamp(0.5, 2.0));
      // flutter_tts: 0.5 is "normal" on Android
      await _tts.setSpeechRate((rate * 0.5).clamp(0.1, 1.0));
      _tts.setProgressHandler((String t, int start, int end, String word) => onWord?.call(start, end));
      await _tts.speak(text);
    } catch (_) {
      // No TTS engine installed (rare) — the app keeps working silently.
    }
  }

  Future<void> stop() async {
    try {
      await _tts.stop();
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
    await _tts.stop();
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

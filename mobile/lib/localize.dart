// Picks the Bangla version of content when the kid uses the Bangla interface.
import 'models/content.dart';

String topicTitle(Topic t, String lang) => lang == 'bn' && t.titleBn.isNotEmpty ? t.titleBn : t.title;
String itemName(TopicItem it, String lang) => lang == 'bn' && it.bn.isNotEmpty ? it.bn : it.name;
String itemFact(TopicItem it, String lang) => lang == 'bn' && it.bnFact.isNotEmpty ? it.bnFact : it.fact;

(String, List<String>) quizText(QuizQ q, String lang) =>
    lang == 'bn' && q.questionBn.isNotEmpty && q.optionsBn.length == q.options.length ? (q.questionBn, q.optionsBn) : (q.question, q.options);

/// "অ-তে অজগর", "A for Apple", "अ से अनार" from the language's template.
String letterPhrase(Language l, String char, Word w) => l.letterPhrase.replaceAll('{char}', char).replaceAll('{word}', w.word);

/// Spoken intro for a letter: name, phrase, short sentence.
String letterSpeech(Language l, Letter letter) {
  final stop = l.code == 'bn' || l.code == 'hi' ? '।' : '.';
  final w = letter.words.isEmpty ? null : letter.words.first;
  return [
    '${letter.name}$stop',
    if (w != null) '${letterPhrase(l, letter.name, w)}$stop',
    if (w != null && w.sentence.isNotEmpty) w.sentence,
  ].join(' ');
}

const _bnDigits = '০১২৩৪৫৬৭৮৯';

/// 12 -> ১২ in the Bangla interface.
String digits(Object n, String lang) => lang == 'bn' ? '$n'.replaceAllMapped(RegExp(r'\d'), (m) => _bnDigits[int.parse(m[0]!)]) : '$n';

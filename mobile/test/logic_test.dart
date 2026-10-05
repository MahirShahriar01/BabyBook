import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:flutter_test/flutter_test.dart';
import 'package:kids_explorer/services/buddy_engine.dart';
import 'package:kids_explorer/services/logic.dart';

void main() {
  final seed = jsonDecode(File('assets/content/seed.json').readAsStringSync()) as Map<String, dynamic>;
  final kb = Map<String, dynamic>.from(seed['buddy'] as Map);

  group('Talking Buddy engine (parity with web)', () {
    test('grammar + capitals + full stop', () {
      expect(analyze('i is happy', kb, seed: 0).corrected, 'I am happy.');
    });
    test('polite phrasing', () {
      final r = analyze('gimme water', kb, seed: 0);
      expect(r.corrected, 'May I please have water?');
      expect(r.answer, isEmpty, reason: 'a polite request should not get the question fallback');
    });
    test('baby words -> formal words', () {
      final r = analyze('my tummy hurts', kb, seed: 0);
      expect(r.corrected, 'My stomach hurts.');
      expect(r.words.first.to, 'stomach');
    });
    test('questions get answers', () {
      final r = analyze('why is the sky blue', kb, seed: 0);
      expect(r.isQuestion, true);
      expect(r.corrected.endsWith('?'), true);
      expect(r.answer.length, greaterThan(10));
    });
    test('safety filter', () {
      expect(analyze('what is your address', kb, seed: 0).safe, false);
    });
    test('Bangla dialect + দাঁড়ি', () {
      expect(analyze('আমি পানি খামু', kb, lang: 'bn', seed: 0).corrected, 'আমি পানি খাব।');
    });
    test('Spanish ¿ ?', () {
      expect(punctuate('como estas', 'es', true, false), '¿Como estas?');
    });
    test('pronunciation', () {
      expect(pronunciationScore('elephant', ['elephant']).stars, 3);
      expect(pronunciationScore('elephant', ['banana']).stars, 0);
      expect(syllables('butterfly').join(), 'butterfly');
    });
  });

  group('games', () {
    test('sudoku solutions valid', () {
      for (final n in [3, 4, 6]) {
        for (var i = 0; i < 30; i++) {
          expect(sudokuSolved(sudokuSolution(n)), true, reason: 'size $n');
        }
      }
    });
    test('sudoku holes & conflicts', () {
      final p = sudokuPuzzle(4, 7);
      expect(p.grid.expand((r) => r).where((v) => v == 0).length, 7);
      expect(
        sudokuConflicts([
          [1, 1, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ]).length,
        2,
      );
    });
  });

  group('AI lab', () {
    test('shape recogniser', () {
      final circle = [for (var i = 0; i <= 60; i++) Point(200 + 100 * cos(i / 60 * 2 * pi), 200 + 100 * sin(i / 60 * 2 * pi))];
      expect(recognizeShape(circle).first.key, 'circle');
      final corners = [const Point(200.0, 50.0), const Point(350.0, 300.0), const Point(50.0, 300.0), const Point(200.0, 50.0)];
      final tri = <Point<double>>[];
      for (var i = 0; i < 3; i++) {
        for (var k = 0; k < 20; k++) {
          tri.add(Point(corners[i].x + (corners[i + 1].x - corners[i].x) * k / 20, corners[i].y + (corners[i + 1].y - corners[i].y) * k / 20));
        }
      }
      tri.add(corners.last);
      expect(recognizeShape(tri).first.key, 'triangle');
    });
    test('knn + predictor', () {
      final ex = [
        {
          'label': 'fly',
          'features': [1.0, 0.0],
        },
        {
          'label': 'swim',
          'features': [0.0, 1.0],
        },
      ];
      expect(knn(ex, [0.9, 0.1], k: 1).label, 'fly');
      expect(predictNext(['a', 'b', 'a', 'b', 'a'], ['a', 'b']).first.key, 'b');
    });
  });
}

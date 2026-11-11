import 'package:flutter_test/flutter_test.dart';
import 'package:funny_game/features/game/domain/time_duel_logic.dart';

void main() {
  group('TimeDuelLogic Domain Tests', () {
    test('generateNewTarget produces valid targets from targetPool', () {
      final logic = TimeDuelLogic(mode: DuelMode.pvp);
      final target = logic.generateNewTarget();

      expect(TimeDuelLogic.targetPool.contains(target), isTrue);
      expect(logic.p1StopTime, isNull);
      expect(logic.p2StopTime, isNull);
    });

    test('evaluateRound accurately selects the player with smaller difference', () {
      final logic = TimeDuelLogic(mode: DuelMode.pvp);
      logic.currentTarget = 5.00;
      logic.p1StopTime = 5.05; // diff: 0.05
      logic.p2StopTime = 5.15; // diff: 0.15

      final result = logic.evaluateRound();
      expect(result.winner, equals('p1'));
      expect(logic.p1Score, equals(1));
      expect(logic.p2Score, equals(0));
    });

    test('isMatchOver correctly reports victory at 3 points', () {
      final logic = TimeDuelLogic(mode: DuelMode.pvp);
      logic.p1Score = 3;
      expect(logic.isMatchOver(), isTrue);
      expect(logic.getMatchWinner(), equals('p1'));
    });
  });
}

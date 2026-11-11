import 'dart:math';

enum GamePhase {
  idle,
  countdown,
  running,
  roundEnded,
  matchEnded,
}

enum DuelMode {
  pvp,
  bot,
}

enum BotDifficulty {
  easy,
  medium,
  hard,
}

/// نموذج نتائج الجولة المكتملة
class RoundResult {
  final double targetTime;
  final double p1Time;
  final double p2Time;
  final double p1Diff;
  final double p2Diff;
  final String winner; // 'p1', 'p2', 'tie'

  const RoundResult({
    required this.targetTime,
    required this.p1Time,
    required this.p2Time,
    required this.p1Diff,
    required this.p2Diff,
    required this.winner,
  });
}

/// وحدة منطق لعبة "الفارق الزمني" المنفصلة تماماً عن واجهات العرض (Domain Layer)
class TimeDuelLogic {
  static const List<double> targetPool = [3.00, 4.00, 5.00, 5.50, 6.00, 7.00];
  static const int winningScore = 3;

  final DuelMode mode;
  final BotDifficulty botDifficulty;

  double currentTarget = 5.00;
  int roundNumber = 1;
  int p1Score = 0;
  int p2Score = 0;

  double? p1StopTime;
  double? p2StopTime;

  final Random _random = Random();

  TimeDuelLogic({
    this.mode = DuelMode.pvp,
    this.botDifficulty = BotDifficulty.medium,
  });

  /// توليد هدف زمني عشوائي جديد للجولة
  double generateNewTarget() {
    currentTarget = targetPool[_random.nextInt(targetPool.length)];
    p1StopTime = null;
    p2StopTime = null;
    return currentTarget;
  }

  /// حساب وقت إيقاف الروبوت الذكي وفق مستوى الصعوبة
  double calculateBotStopTime(double target) {
    double errorRange = 0.35; // easy: +/- 0.35s
    if (botDifficulty == BotDifficulty.medium) errorRange = 0.16;
    if (botDifficulty == BotDifficulty.hard) errorRange = 0.05;

    final offset = (_random.nextDouble() * 2 - 1) * errorRange;
    return max(0.6, target + offset);
  }

  /// تقييم الجولة وحساب الفائز بالمللي ثانية
  RoundResult evaluateRound() {
    final t1 = p1StopTime ?? (currentTarget + 3.0);
    final t2 = p2StopTime ?? (currentTarget + 3.0);

    final diff1 = (t1 - currentTarget).abs();
    final diff2 = (t2 - currentTarget).abs();

    String winner = 'tie';
    if ((diff1 - diff2).abs() < 0.005) {
      winner = 'tie';
    } else if (diff1 < diff2) {
      winner = 'p1';
      p1Score++;
    } else {
      winner = 'p2';
      p2Score++;
    }

    return RoundResult(
      targetTime: currentTarget,
      p1Time: t1,
      p2Time: t2,
      p1Diff: diff1,
      p2Diff: diff2,
      winner: winner,
    );
  }

  bool isMatchOver() => p1Score >= winningScore || p2Score >= winningScore;

  String getMatchWinner() {
    if (p1Score >= winningScore) return 'p1';
    if (p2Score >= winningScore) return 'p2';
    return '';
  }

  void resetMatch() {
    roundNumber = 1;
    p1Score = 0;
    p2Score = 0;
    p1StopTime = null;
    p2StopTime = null;
  }
}

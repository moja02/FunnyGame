import 'dart:async';
import 'package:flutter/material.dart';
import '../../domain/time_duel_logic.dart';

class TimeDuelScreen extends StatefulWidget {
  final DuelMode mode;
  final BotDifficulty botDifficulty;
  final VoidCallback onBackToMenu;

  const TimeDuelScreen({
    super.key,
    required this.mode,
    this.botDifficulty = BotDifficulty.medium,
    required this.onBackToMenu,
  });

  @override
  State<TimeDuelScreen> createState() => _TimeDuelScreenState();
}

class _TimeDuelScreenState extends State<TimeDuelScreen> {
  late TimeDuelLogic _logic;
  GamePhase _phase = GamePhase.idle;

  final Stopwatch _stopwatch = Stopwatch();
  Timer? _tickerTimer;
  Timer? _countdownTimer;
  Timer? _botTimer;

  String _countdownText = '3';
  double _elapsedSeconds = 0.0;
  bool _isTimerHidden = false;

  RoundResult? _lastRoundResult;

  @override
  void initState() {
    super.initState();
    _logic = TimeDuelLogic(
      mode: widget.mode,
      botDifficulty: widget.botDifficulty,
    );
    _startCountdown();
  }

  @override
  void dispose() {
    _tickerTimer?.cancel();
    _countdownTimer?.cancel();
    _botTimer?.cancel();
    super.dispose();
  }

  void _startCountdown() {
    _tickerTimer?.cancel();
    _countdownTimer?.cancel();
    _botTimer?.cancel();

    _logic.generateNewTarget();
    _stopwatch.reset();
    _elapsedSeconds = 0.0;
    _isTimerHidden = false;
    _lastRoundResult = null;

    setState(() {
      _phase = GamePhase.countdown;
      _countdownText = '3';
    });

    int step = 3;
    _countdownTimer = Timer.periodic(const Duration(milliseconds: 850), (timer) {
      step--;
      if (step > 0) {
        setState(() {
          _countdownText = '$step';
        });
      } else if (step == 0) {
        setState(() {
          _countdownText = 'انطلق! 🚀';
        });
      } else {
        timer.cancel();
        _beginRunningGame();
      }
    });
  }

  void _beginRunningGame() {
    setState(() {
      _phase = GamePhase.running;
    });

    _stopwatch.start();

    _tickerTimer = Timer.periodic(const Duration(milliseconds: 30), (timer) {
      final elapsed = _stopwatch.elapsedMilliseconds / 1000.0;
      setState(() {
        _elapsedSeconds = elapsed;
        if (elapsed >= 1.5 && !_isTimerHidden) {
          _isTimerHidden = true;
        }
      });

      // Timeout failsafe
      if (elapsed > _logic.currentTarget + 3.0) {
        _handleRoundTimeout();
      }
    });

    if (widget.mode == DuelMode.bot) {
      final botTime = _logic.calculateBotStopTime(_logic.currentTarget);
      _botTimer = Timer(Duration(milliseconds: (botTime * 1000).toInt()), () {
        _stopPlayer2(forcedTime: botTime);
      });
    }
  }

  void _stopPlayer1() {
    if (_phase != GamePhase.running || _logic.p1StopTime != null) return;
    final time = _stopwatch.elapsedMilliseconds / 1000.0;
    setState(() {
      _logic.p1StopTime = time;
    });

    if (_logic.p2StopTime != null) {
      _endRound();
    }
  }

  void _stopPlayer2({double? forcedTime}) {
    if (_phase != GamePhase.running || _logic.p2StopTime != null) return;
    final time = forcedTime ?? (_stopwatch.elapsedMilliseconds / 1000.0);
    setState(() {
      _logic.p2StopTime = time;
    });

    if (_logic.p1StopTime != null) {
      _endRound();
    }
  }

  void _handleRoundTimeout() {
    final maxTime = _logic.currentTarget + 3.0;
    _logic.p1StopTime ??= maxTime;
    _logic.p2StopTime ??= maxTime;
    _endRound();
  }

  void _endRound() {
    _stopwatch.stop();
    _tickerTimer?.cancel();
    _botTimer?.cancel();

    final result = _logic.evaluateRound();
    setState(() {
      _lastRoundResult = result;
      _phase = _logic.isMatchOver() ? GamePhase.matchEnded : GamePhase.roundEnded;
    });
  }

  void _nextRound() {
    _logic.roundNumber++;
    _startCountdown();
  }

  void _resetMatch() {
    _logic.resetMatch();
    _startCountdown();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0E081C),
      body: SafeArea(
        child: Stack(
          children: [
            Column(
              children: [
                // Player 2 Zone (Top)
                Expanded(
                  child: RotatedBox(
                    quarterTurns: widget.mode == DuelMode.pvp ? 2 : 0,
                    child: _buildPlayerZone(
                      isPlayer1: false,
                      name: widget.mode == DuelMode.bot
                          ? 'الروبوت (${widget.botDifficulty.name})'
                          : 'اللاعب 2 (الأزرق)',
                      score: _logic.p2Score,
                      hasStopped: _logic.p2StopTime != null,
                      onStop: () => _stopPlayer2(),
                      primaryColor: const Color(0xFF00D2D3),
                      shadowColor: const Color(0xFF008F90),
                      bgGradient: const [Color(0xFF0E2936), Color(0xFF0A1721)],
                    ),
                  ),
                ),

                // Center Status & Target Divider
                _buildCenterDivider(),

                // Player 1 Zone (Bottom)
                Expanded(
                  child: _buildPlayerZone(
                    isPlayer1: true,
                    name: 'اللاعب 1 (الأحمر)',
                    score: _logic.p1Score,
                    hasStopped: _logic.p1StopTime != null,
                    onStop: _stopPlayer1,
                    primaryColor: const Color(0xFFFF4757),
                    shadowColor: const Color(0xFFB32E3B),
                    bgGradient: const [Color(0xFF2B1129), Color(0xFF150B1D)],
                  ),
                ),
              ],
            ),

            // Top Bar Overlay (Back to Menu & Title)
            Positioned(
              top: 8,
              left: 12,
              right: 12,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  ElevatedButton.icon(
                    onPressed: widget.onBackToMenu,
                    icon: const Icon(Icons.arrow_back_ios_new, size: 14),
                    label: const Text('القائمة'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.black.withValues(alpha:0.5),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha:0.5),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text(
                      'لعبة الفارق الزمني ⏱️',
                      style: TextStyle(
                        color: Color(0xFFFECA57),
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Round End Overlay
            if (_phase == GamePhase.roundEnded && _lastRoundResult != null)
              _buildRoundResultModal(),

            // Match Victory Overlay
            if (_phase == GamePhase.matchEnded && _lastRoundResult != null)
              _buildMatchVictoryModal(),
          ],
        ),
      ),
    );
  }

  Widget _buildPlayerZone({
    required bool isPlayer1,
    required String name,
    required int score,
    required bool hasStopped,
    required VoidCallback onStop,
    required Color primaryColor,
    required Color shadowColor,
    required List<Color> bgGradient,
  }) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: RadialGradient(
          center: Alignment.center,
          colors: bgGradient,
          radius: 0.9,
        ),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Header of Player Zone
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 16,
                    backgroundColor: primaryColor,
                    child: Icon(
                      isPlayer1 || widget.mode == DuelMode.pvp ? Icons.person : Icons.smart_toy,
                      color: Colors.black,
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: TextStyle(
                          color: primaryColor,
                          fontWeight: FontWeight.w900,
                          fontSize: 14,
                        ),
                      ),
                      Text(
                        'النقاط: $score / ${TimeDuelLogic.winningScore}',
                        style: const TextStyle(color: Colors.white70, fontSize: 11),
                      ),
                    ],
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: primaryColor.withValues(alpha:0.2),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: primaryColor.withValues(alpha:0.4)),
                ),
                child: Text(
                  'الهدف: ${_logic.currentTarget.toStringAsFixed(2)} ث',
                  style: TextStyle(
                    color: primaryColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),

          // Slam Button or Status
          Center(
            child: _phase == GamePhase.running
                ? SizedBox(
                    width: 270,
                    height: 100,
                    child: ElevatedButton(
                      onPressed: hasStopped || (!isPlayer1 && widget.mode == DuelMode.bot)
                          ? null
                          : onStop,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryColor,
                        disabledBackgroundColor: Colors.grey.shade800,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(26),
                        ),
                        elevation: 10,
                        shadowColor: shadowColor,
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            hasStopped ? '✔ تم الإيقاف' : 'أوقف! 🛑',
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                          Text(
                            hasStopped ? 'بانتظار المنافس...' : 'عند ${_logic.currentTarget.toStringAsFixed(2)} ث',
                            style: const TextStyle(fontSize: 12, color: Colors.white70),
                          ),
                        ],
                      ),
                    ),
                  )
                : Text(
                    _phase == GamePhase.countdown
                        ? 'استعد للتحدي... 🎯'
                        : 'جاهز للانطلاق...',
                    style: const TextStyle(
                      color: Colors.white60,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
          ),

          const SizedBox(height: 10),
        ],
      ),
    );
  }

  Widget _buildCenterDivider() {
    return Container(
      height: 52,
      color: const Color(0xFF080410),
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFFF4757),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text('🔴 ${_logic.p1Score}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
              ),
              const SizedBox(width: 8),
              Text(
                'الجولة ${_logic.roundNumber}',
                style: const TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, fontSize: 12),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFF00D2D3),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text('🔵 ${_logic.p2Score}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.black)),
              ),
            ],
          ),

          // Timer Center
          if (_phase == GamePhase.countdown)
            Text(
              _countdownText,
              style: const TextStyle(
                color: Color(0xFFFECA57),
                fontSize: 20,
                fontWeight: FontWeight.w900,
              ),
            )
          else if (_phase == GamePhase.running)
            Text(
              _isTimerHidden ? '⏱️ ?.??' : '${_elapsedSeconds.toStringAsFixed(2)} ث',
              style: TextStyle(
                color: _isTimerHidden ? const Color(0xFFFF9FF3) : const Color(0xFFFECA57),
                fontSize: 18,
                fontWeight: FontWeight.w900,
              ),
            )
          else
            Text(
              'الهدف: ${_logic.currentTarget.toStringAsFixed(2)} ث',
              style: const TextStyle(color: Color(0xFFFECA57), fontWeight: FontWeight.bold, fontSize: 13),
            ),
        ],
      ),
    );
  }

  Widget _buildRoundResultModal() {
    final r = _lastRoundResult!;
    String title = 'اللاعب 1 الأقرب للهدف! 🎯';
    if (r.winner == 'p2') {
      title = widget.mode == DuelMode.bot ? 'الروبوت كان الأقرب! 🤖' : 'اللاعب 2 الأقرب للهدف! 🎯';
    } else if (r.winner == 'tie') {
      title = 'تعادل مذهل في التوقيت! 🤝';
    }

    return Container(
      color: Colors.black.withValues(alpha:0.75),
      alignment: Alignment.center,
      padding: const EdgeInsets.all(24),
      child: Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          color: const Color(0xFF180F2E),
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: const Color(0xFFFECA57), width: 2),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('👑', style: TextStyle(fontSize: 42)),
            const SizedBox(height: 8),
            Text(
              title,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha:0.4),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('فارق اللاعب 1:', style: TextStyle(color: Colors.white70)),
                      Text('${r.p1Diff.toStringAsFixed(3)} ث', style: const TextStyle(color: Color(0xFFFF6B81), fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(widget.mode == DuelMode.bot ? 'فارق الروبوت:' : 'فارق اللاعب 2:', style: const TextStyle(color: Colors.white70)),
                      Text('${r.p2Diff.toStringAsFixed(3)} ث', style: const TextStyle(color: Color(0xFF48DBFB), fontWeight: FontWeight.bold)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _nextRound,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFECA57),
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: const Text('الجولة التالية ⚡', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMatchVictoryModal() {
    final winner = _logic.getMatchWinner();
    return Container(
      color: Colors.black.withValues(alpha:0.85),
      alignment: Alignment.center,
      padding: const EdgeInsets.all(24),
      child: Container(
        padding: const EdgeInsets.all(26),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF2B114D), Color(0xFF120925)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
          borderRadius: BorderRadius.circular(32),
          border: Border.all(color: const Color(0xFFFECA57), width: 3),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('🏆', style: TextStyle(fontSize: 54)),
            const SizedBox(height: 6),
            const Text(
              'مبروك الفوز بالمباراة!',
              style: TextStyle(color: Color(0xFFFECA57), fontWeight: FontWeight.w900, fontSize: 22),
            ),
            const SizedBox(height: 6),
            Text(
              winner == 'p1' ? 'فاز باللقب: اللاعب 1 (الأحمر) بطل الدقة! 🔥' : 'فاز باللقب: اللاعب 2 (الأزرق) بطل الدقة! ❄️',
              style: const TextStyle(color: Colors.white70, fontSize: 13),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Text(
              '${_logic.p1Score} - ${_logic.p2Score}',
              style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _resetMatch,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2ECC71),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: const Text('مباراة جديدة 🔁', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              height: 44,
              child: OutlinedButton(
                onPressed: widget.onBackToMenu,
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Colors.white24),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: const Text('العودة للقائمة 🏠'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

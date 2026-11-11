import 'package:flutter/material.dart';
import 'package:funny_game/features/game/domain/time_duel_logic.dart';

class MainMenuScreen extends StatefulWidget {
  final Function(DuelMode mode, BotDifficulty diff) onLaunchTimeDuel;

  const MainMenuScreen({
    super.key,
    required this.onLaunchTimeDuel,
  });

  @override
  State<MainMenuScreen> createState() => _MainMenuScreenState();
}

class _MainMenuScreenState extends State<MainMenuScreen> {
  // Current Navigation sub-view inside the hub: 'home', 'catalog', 'settings', 'instructions'
  String _activeTab = 'home';
  double _sfxVolume = 80;
  double _musicVolume = 60;
  bool _vibrationEnabled = true;
  final BotDifficulty _selectedBotDiff = BotDifficulty.medium;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D071A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0D071A),
        elevation: 0,
        title: Text(
          _activeTab == 'home'
              ? 'FunnyGame ⚡'
              : _activeTab == 'catalog'
                  ? 'الألعاب المتوفرة 🎮'
                  : _activeTab == 'settings'
                      ? 'الإعدادات ⚙️'
                      : 'تعليمات وقواعد الألعاب 📖',
          style: const TextStyle(
            color: Color(0xFFFECA57),
            fontWeight: FontWeight.w900,
            fontSize: 18,
          ),
        ),
        centerTitle: true,
        leading: _activeTab != 'home'
            ? IconButton(
                icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 18),
                onPressed: () => setState(() => _activeTab = 'home'),
              )
            : null,
      ),
      body: SafeArea(
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 250),
          child: _buildCurrentView(),
        ),
      ),
    );
  }

  Widget _buildCurrentView() {
    switch (_activeTab) {
      case 'catalog':
        return _buildCatalogView();
      case 'settings':
        return _buildSettingsView();
      case 'instructions':
        return _buildInstructionsView();
      case 'home':
      default:
        return _buildHomeView();
    }
  }

  // =========================================================================
  // VIEW 1: HOME VIEW (LOGO & 3 HERO BUTTONS)
  // =========================================================================
  Widget _buildHomeView() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Header & Logo
          Column(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFFECA57).withValues(alpha:0.15),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFFECA57).withValues(alpha:0.4)),
                ),
                child: const Text(
                  '🎮 البوابة الرسمية لألعاب التحدي',
                  style: TextStyle(
                    color: Color(0xFFFECA57),
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text('⚡', style: TextStyle(fontSize: 64)),
              ShaderMask(
                shaderCallback: (bounds) => const LinearGradient(
                  colors: [Color(0xFFFF9FF3), Color(0xFFFECA57), Color(0xFF48DBFB)],
                ).createShader(bounds),
                child: const Text(
                  'FunnyGame',
                  style: TextStyle(
                    fontSize: 48,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                    letterSpacing: -1.5,
                  ),
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'سرعة بديهة • ذكاء • تركيز خارق 🔥',
                style: TextStyle(
                  color: Color(0xFFC8D6E5),
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),

          // 3 Main Buttons
          Column(
            children: [
              // Button 1: الدخول
              _buildHeroButton(
                title: 'الدخول للألعاب',
                icon: '🎮',
                gradient: const [Color(0xFFFECA57), Color(0xFFFF9F43)],
                textColor: Colors.black,
                shadowColor: const Color(0xFFEE5253),
                onTap: () => setState(() => _activeTab = 'catalog'),
              ),
              const SizedBox(height: 14),

              // Button 2: الإعدادات
              _buildHeroButton(
                title: 'الإعدادات',
                icon: '⚙️',
                gradient: const [Color(0xFF5F27CD), Color(0xFF341F97)],
                textColor: Colors.white,
                shadowColor: const Color(0xFF221464),
                onTap: () => setState(() => _activeTab = 'settings'),
              ),
              const SizedBox(height: 14),

              // Button 3: التعليمات
              _buildHeroButton(
                title: 'تعليمات وقواعد الألعاب',
                icon: '📖',
                gradient: const [Color(0xFF0ABDE3), Color(0xFF10AC84)],
                textColor: Colors.white,
                shadowColor: const Color(0xFF008F90),
                onTap: () => setState(() => _activeTab = 'instructions'),
              ),
            ],
          ),

          const Text(
            'FunnyGame 2D Engine • Clean Architecture',
            style: TextStyle(color: Colors.white30, fontSize: 11),
          ),
        ],
      ),
    );
  }

  Widget _buildHeroButton({
    required String title,
    required String icon,
    required List<Color> gradient,
    required Color textColor,
    required Color shadowColor,
    required VoidCallback onTap,
  }) {
    return Container(
      width: double.infinity,
      height: 62,
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: gradient),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: shadowColor.withValues(alpha:0.4),
            blurRadius: 16,
            offset: const Offset(0, 6),
          )
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: onTap,
          child: Center(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(icon, style: const TextStyle(fontSize: 24)),
                const SizedBox(width: 10),
                Text(
                  title,
                  style: TextStyle(
                    color: textColor,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // =========================================================================
  // VIEW 2: SQUARE CARDS GAMES CATALOG
  // =========================================================================
  Widget _buildCatalogView() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'اختر اللعبة المتوفرة 🎯',
            style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          Expanded(
            child: GridView.count(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              children: [
                // Game 1: الفارق الزمني (ACTIVE)
                _buildSquareGameCard(
                  title: 'الفارق الزمني',
                  subtitle: 'دقة الـ 0.00 ثانية',
                  icon: '⏱️',
                  status: '● متاح للعب',
                  statusColor: const Color(0xFF2ECC71),
                  isActive: true,
                  onTap: _showDuelOptionsDialog,
                ),

                // Game 2: فخ الألوان
                _buildSquareGameCard(
                  title: 'فخ الألوان',
                  subtitle: 'سرعة بديهة بصرية',
                  icon: '🎨',
                  status: '🔒 قريباً',
                  statusColor: Colors.white38,
                  isActive: false,
                  onTap: () => setState(() => _activeTab = 'instructions'),
                ),

                // Game 3: تتبع الكؤوس
                _buildSquareGameCard(
                  title: 'تتبع الكؤوس',
                  subtitle: 'قوة التركيز الخارق',
                  icon: '🥤',
                  status: '🔒 قريباً',
                  statusColor: Colors.white38,
                  isActive: false,
                  onTap: () => setState(() => _activeTab = 'instructions'),
                ),

                // Game 4: حساب البرق
                _buildSquareGameCard(
                  title: 'حساب البرق',
                  subtitle: 'ذكاء ورياضيات',
                  icon: '⚡',
                  status: '🔒 قريباً',
                  statusColor: Colors.white38,
                  isActive: false,
                  onTap: () => setState(() => _activeTab = 'instructions'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSquareGameCard({
    required String title,
    required String subtitle,
    required String icon,
    required String status,
    required Color statusColor,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1C1136),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: isActive ? const Color(0xFFFECA57) : Colors.white10,
          width: isActive ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha:0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(22),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(12.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Align(
                  alignment: Alignment.topRight,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha:0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      status,
                      style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
                Text(icon, style: const TextStyle(fontSize: 42)),
                Column(
                  children: [
                    Text(
                      title,
                      style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w900),
                    ),
                    Text(
                      subtitle,
                      style: const TextStyle(color: Colors.white60, fontSize: 10),
                    ),
                  ],
                ),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  decoration: BoxDecoration(
                    color: isActive ? const Color(0xFFFF4757) : Colors.white10,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    isActive ? 'العب الآن ⚔️' : 'عرض الشرح 📖',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: isActive ? Colors.white : Colors.white54,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showDuelOptionsDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1C1136),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
        title: const Column(
          children: [
            Text('⏱️', style: TextStyle(fontSize: 40)),
            SizedBox(height: 6),
            Text(
              'لعبة الفارق الزمني',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 18),
            ),
            Text(
              'اختر نمط اللعب:',
              style: TextStyle(color: Colors.white60, fontSize: 12),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx);
                widget.onLaunchTimeDuel(DuelMode.pvp, _selectedBotDiff);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFF4757),
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: const Text('👥 تحدي شخصين (نفس الجوال)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx);
                widget.onLaunchTimeDuel(DuelMode.bot, _selectedBotDiff);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF00D2D3),
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: const Text('🤖 لاعب واحد (ضد الروبوت)', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  // =========================================================================
  // VIEW 3: SETTINGS VIEW (AUDIO & HAPTICS)
  // =========================================================================
  Widget _buildSettingsView() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: const Color(0xFF190F33),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('🔊 مستويات الصوت', style: TextStyle(color: Color(0xFF48DBFB), fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('المؤثرات الصوتية (SFX):', style: TextStyle(color: Colors.white)),
                    Text('${_sfxVolume.toInt()}%', style: const TextStyle(color: Color(0xFFFECA57), fontWeight: FontWeight.bold)),
                  ],
                ),
                Slider(
                  value: _sfxVolume,
                  min: 0,
                  max: 100,
                  activeColor: const Color(0xFFFECA57),
                  onChanged: (v) => setState(() => _sfxVolume = v),
                ),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('الموسيقى الخلفية:', style: TextStyle(color: Colors.white)),
                    Text('${_musicVolume.toInt()}%', style: const TextStyle(color: Color(0xFFFECA57), fontWeight: FontWeight.bold)),
                  ],
                ),
                Slider(
                  value: _musicVolume,
                  min: 0,
                  max: 100,
                  activeColor: const Color(0xFFFECA57),
                  onChanged: (v) => setState(() => _musicVolume = v),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: const Color(0xFF190F33),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white12),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('📳 الاهتزاز والتفاعل اللمسي', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    Text('استجابة حركية عند الضغط والفوز', style: TextStyle(color: Colors.white54, fontSize: 11)),
                  ],
                ),
                Switch(
                  value: _vibrationEnabled,
                  activeThumbColor: const Color(0xFF2ECC71),
                  onChanged: (v) => setState(() => _vibrationEnabled = v),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // =========================================================================
  // VIEW 4: INSTRUCTIONS VIEW
  // =========================================================================
  Widget _buildInstructionsView() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: const Color(0xFF2B1854),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: const Color(0xFFFECA57)),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text('⏱️', style: TextStyle(fontSize: 28)),
                  SizedBox(width: 8),
                  Text(
                    '1. لعبة الفارق الزمني (Time Difference)',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 15),
                  ),
                ],
              ),
              SizedBox(height: 10),
              Text(
                '🎯 فكرة اللعبة:\nتحدي دقة وإحساس بالوقت بين شخصين على نفس الشاشة.\n\n'
                '🕹️ طريقة اللعب:\n'
                '1. تحديد الهدف: يعرض النظام وقتاً عشوائياً (مثلاً 5.00 ثوانٍ).\n'
                '2. انطلاق العد التنازلي: (3.. 2.. 1.. انطلق!).\n'
                '3. العداد المخفي: يختفي العداد بعد 1.5 ثانية وتبدأ بحساب الوقت ذهنياً!\n'
                '4. إيقاف العداد: يضغط كل لاعب على زره عند اللحظة الدقيقة.\n\n'
                '🏆 الفائز:\nصاحب أقل فارق زمني بالمللي ثانية، وأول من يحرز 3 نقاط يفوز بالمباراة!',
                style: TextStyle(color: Color(0xFFDCDDE1), fontSize: 13, height: 1.5),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: const Color(0xFF180F2E),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Colors.white10),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('🎨 2. فخ الألوان (قريباً)', style: TextStyle(color: Color(0xFFFF9FF3), fontWeight: FontWeight.bold)),
              SizedBox(height: 6),
              Text(
                'اختر لون الخط الحقيقي متجاهلاً الكلمة المكتوبة لاختبار سرعة معالجة الدماغ للمعلومات المتناقضة في ثانيتين فقط.',
                style: TextStyle(color: Colors.white60, fontSize: 12),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'core/network/network_client.dart';
import 'core/storage/storage_service.dart';
import 'features/game/domain/time_duel_logic.dart';
import 'features/game/presentation/screens/time_duel_screen.dart';
import 'features/menu/presentation/screens/main_menu_screen.dart';
import 'features/patch_manager/data/repositories/patch_repository_impl.dart';
import 'features/patch_manager/domain/repositories/patch_repository.dart';
import 'features/patch_manager/presentation/screens/splash_patch_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Force portrait mode for mobile phone immersion
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Initialize Core Services
  await StorageService.instance.init();
  final prefs = await SharedPreferences.getInstance();
  final networkClient = NetworkClient();

  final patchRepository = PatchRepositoryImpl(
    networkClient: networkClient,
    storageService: StorageService.instance,
    prefs: prefs,
  );

  runApp(FunnyGameApp(patchRepository: patchRepository));
}

class FunnyGameApp extends StatefulWidget {
  final PatchRepository patchRepository;

  const FunnyGameApp({super.key, required this.patchRepository});

  @override
  State<FunnyGameApp> createState() => _FunnyGameAppState();
}

class _FunnyGameAppState extends State<FunnyGameApp> {
  // Navigation states: 'splash', 'menu', 'duel'
  String _currentScreen = 'splash';
  DuelMode _duelMode = DuelMode.pvp;
  BotDifficulty _botDifficulty = BotDifficulty.medium;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FunnyGame',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0D071A),
        fontFamily: 'Tajawal',
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFFECA57),
          secondary: Color(0xFF00D2D3),
          surface: Color(0xFF1C1136),
        ),
      ),
      builder: (context, child) {
        // Enforce Arabic RTL directionality across the app
        return Directionality(
          textDirection: TextDirection.rtl,
          child: child ?? const SizedBox(),
        );
      },
      home: _buildScreen(),
    );
  }

  Widget _buildScreen() {
    switch (_currentScreen) {
      case 'splash':
        return SplashPatchScreen(
          patchRepository: widget.patchRepository,
          onReady: () {
            setState(() {
              _currentScreen = 'menu';
            });
          },
        );
      case 'duel':
        return TimeDuelScreen(
          mode: _duelMode,
          botDifficulty: _botDifficulty,
          onBackToMenu: () {
            setState(() {
              _currentScreen = 'menu';
            });
          },
        );
      case 'menu':
      default:
        return MainMenuScreen(
          onLaunchTimeDuel: (DuelMode mode, BotDifficulty diff) {
            setState(() {
              _duelMode = mode;
              _botDifficulty = diff;
              _currentScreen = 'duel';
            });
          },
        );
    }
  }
}

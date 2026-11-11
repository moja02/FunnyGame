import 'package:flutter/material.dart';
import '../../domain/repositories/patch_repository.dart';

class SplashPatchScreen extends StatefulWidget {
  final PatchRepository patchRepository;
  final VoidCallback onReady;

  const SplashPatchScreen({
    super.key,
    required this.patchRepository,
    required this.onReady,
  });

  @override
  State<SplashPatchScreen> createState() => _SplashPatchScreenState();
}

class _SplashPatchScreenState extends State<SplashPatchScreen>
    with SingleTickerProviderStateMixin {
  String _statusText = 'جاري تهيئة منصة FunnyGame...';
  double _progressValue = 0.1;
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);

    _initAndCheckPatches();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _initAndCheckPatches() async {
    await Future.delayed(const Duration(milliseconds: 600));

    setState(() {
      _statusText = 'فحص التحديثات السحابية (OTA)...';
      _progressValue = 0.35;
    });

    try {
      // In production, this points to your remote server manifest.json
      // Here we check and fallback gracefully if offline
      const mockManifestUrl = 'https://api.funnygame.example.com/manifest.json';
      final status = await widget.patchRepository.checkRemoteUpdate(
        remoteManifestUrl: mockManifestUrl,
      );

      if (status.hasUpdate && status.manifest != null) {
        setState(() {
          _statusText = 'تنزيل تحديث الإصدار ${status.availableVersion}...';
          _progressValue = 0.5;
        });

        final totalAssets = status.manifest!.assets.length;
        for (int i = 0; i < totalAssets; i++) {
          final asset = status.manifest!.assets[i];
          setState(() {
            _statusText = 'تحميل أصل: ${asset.fileName}...';
          });

          await widget.patchRepository.downloadAndApplyAsset(
            asset: asset,
            onProgress: (received, total) {
              if (total > 0) {
                final currentAssetProgress = received / total;
                setState(() {
                  _progressValue = 0.5 + (0.4 * ((i + currentAssetProgress) / totalAssets));
                });
              }
            },
          );
        }

        await widget.patchRepository.saveInstalledPatchVersion(status.availableVersion!);
      }
    } catch (_) {
      // Offline-first: Continue to game smoothly if offline
    }

    setState(() {
      _statusText = 'اكتمل الفحص! مرحباً بك في FunnyGame ⚡';
      _progressValue = 1.0;
    });

    await Future.delayed(const Duration(milliseconds: 500));
    if (mounted) {
      widget.onReady();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D071A),
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ScaleTransition(
                  scale: Tween<double>(begin: 0.95, end: 1.05).animate(
                    CurvedAnimation(
                      parent: _pulseController,
                      curve: Curves.easeInOut,
                    ),
                  ),
                  child: Container(
                    width: 90,
                    height: 90,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: const LinearGradient(
                        colors: [Color(0xFFFECA57), Color(0xFFFF9FF3), Color(0xFF48DBFB)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFFFECA57).withValues(alpha: 0.4),
                          blurRadius: 30,
                          spreadRadius: 4,
                        )
                      ],
                    ),
                    child: const Center(
                      child: Text(
                        '⚡',
                        style: TextStyle(fontSize: 46),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                ShaderMask(
                  shaderCallback: (bounds) => const LinearGradient(
                    colors: [Color(0xFFFF9FF3), Color(0xFFFECA57), Color(0xFF48DBFB)],
                  ).createShader(bounds),
                  child: const Text(
                    'FunnyGame',
                    style: TextStyle(
                      fontSize: 42,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                      letterSpacing: -1,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'سرعة بديهة • ذكاء • تركيز خارق 🔥',
                  style: TextStyle(
                    color: Color(0xFFC8D6E5),
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 48),

                // Linear Progress Bar
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: SizedBox(
                    height: 10,
                    child: LinearProgressIndicator(
                      value: _progressValue,
                      backgroundColor: const Color(0xFF231642),
                      valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFFFECA57)),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  _statusText,
                  style: const TextStyle(
                    color: Color(0xFFA4B0BE),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

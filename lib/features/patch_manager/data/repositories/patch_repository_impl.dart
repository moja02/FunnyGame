import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/network/network_client.dart';
import '../../../../core/security/checksum_verifier.dart';
import '../../../../core/storage/storage_service.dart';
import '../../domain/entities/patch_manifest.dart';
import '../../domain/entities/update_status.dart';
import '../../domain/repositories/patch_repository.dart';
import '../models/patch_manifest_model.dart';

class PatchRepositoryImpl implements PatchRepository {
  final NetworkClient networkClient;
  final StorageService storageService;
  final SharedPreferences prefs;

  static const String _kInstalledPatchKey = 'funny_game_installed_patch_version';
  static const String _defaultVersion = '1.0.0';

  PatchRepositoryImpl({
    required this.networkClient,
    required this.storageService,
    required this.prefs,
  });

  @override
  Future<String> getInstalledPatchVersion() async {
    return prefs.getString(_kInstalledPatchKey) ?? _defaultVersion;
  }

  @override
  Future<void> saveInstalledPatchVersion(String version) async {
    await prefs.setString(_kInstalledPatchKey, version);
  }

  @override
  Future<UpdateStatus> checkRemoteUpdate({required String remoteManifestUrl}) async {
    final currentVersion = await getInstalledPatchVersion();

    try {
      final jsonResponse = await networkClient.getJson(remoteManifestUrl);
      if (jsonResponse is! Map<String, dynamic>) {
        return UpdateStatus.noUpdate(currentVersion);
      }

      final manifest = PatchManifestModel.fromJson(jsonResponse);
      final hasUpdate = _isVersionHigher(manifest.patchVersion, currentVersion);

      return UpdateStatus(
        hasUpdate: hasUpdate,
        isMandatory: manifest.isMandatory,
        currentVersion: currentVersion,
        availableVersion: manifest.patchVersion,
        manifest: manifest,
      );
    } catch (e) {
      // Offline fallback: if network is down, continue with current local bundle
      return UpdateStatus.noUpdate(currentVersion);
    }
  }

  @override
  Future<void> downloadAndApplyAsset({
    required PatchAsset asset,
    void Function(int received, int total)? onProgress,
  }) async {
    // 1. Download to temporary staging file
    final tempFilePath = 'temp_patches/${asset.fileName}';
    final tempFile = storageService.getPatchFile(tempFilePath);
    await storageService.ensureParentDirectory(tempFile);

    await networkClient.downloadResumableFile(
      downloadUrl: asset.downloadUrl,
      destinationFile: tempFile,
      onProgress: onProgress,
    );

    // 2. Strict SHA-256 Checksum Verification
    await ChecksumVerifier.verifyFileIntegrity(
      file: tempFile,
      expectedHash: asset.checksumSha256,
    );

    // 3. Atomically move/replace target file after verification passed
    final destinationFile = storageService.getPatchFile(asset.targetPath);
    await storageService.ensureParentDirectory(destinationFile);

    if (await destinationFile.exists()) {
      await destinationFile.delete();
    }
    await tempFile.rename(destinationFile.path);
  }

  bool _isVersionHigher(String remote, String local) {
    final rParts = remote.split('.').map((e) => int.tryParse(e) ?? 0).toList();
    final lParts = local.split('.').map((e) => int.tryParse(e) ?? 0).toList();

    for (int i = 0; i < 3; i++) {
      final r = i < rParts.length ? rParts[i] : 0;
      final l = i < lParts.length ? lParts[i] : 0;
      if (r > l) return true;
      if (r < l) return false;
    }
    return false;
  }
}

import 'patch_manifest.dart';

/// حالة فحص التحديثات توضح وجود حزم جديدة، نوعها ودرجة إجباريتها
class UpdateStatus {
  final bool hasUpdate;
  final bool isMandatory;
  final PatchManifest? manifest;
  final String currentVersion;
  final String? availableVersion;

  const UpdateStatus({
    required this.hasUpdate,
    required this.isMandatory,
    required this.currentVersion,
    this.manifest,
    this.availableVersion,
  });

  factory UpdateStatus.noUpdate(String currentVersion) => UpdateStatus(
        hasUpdate: false,
        isMandatory: false,
        currentVersion: currentVersion,
      );
}

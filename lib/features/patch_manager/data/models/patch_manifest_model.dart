import '../../domain/entities/patch_manifest.dart';

class PatchAssetModel extends PatchAsset {
  const PatchAssetModel({
    required super.fileName,
    required super.targetPath,
    required super.downloadUrl,
    required super.checksumSha256,
  });

  factory PatchAssetModel.fromJson(Map<String, dynamic> json) {
    return PatchAssetModel(
      fileName: json['file_name'] as String? ?? '',
      targetPath: json['target_path'] as String? ?? '',
      downloadUrl: json['download_url'] as String? ?? '',
      checksumSha256: json['checksum_sha256'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'file_name': fileName,
        'target_path': targetPath,
        'download_url': downloadUrl,
        'checksum_sha256': checksumSha256,
      };
}

class PatchManifestModel extends PatchManifest {
  const PatchManifestModel({
    required super.patchVersion,
    required super.minAppVersion,
    required super.isMandatory,
    required super.releaseNotes,
    required super.assets,
  });

  factory PatchManifestModel.fromJson(Map<String, dynamic> json) {
    final rawAssets = json['assets'] as List<dynamic>? ?? [];
    final parsedAssets = rawAssets
        .map((item) => PatchAssetModel.fromJson(item as Map<String, dynamic>))
        .toList();

    return PatchManifestModel(
      patchVersion: json['patch_version'] as String? ?? '1.0.0',
      minAppVersion: json['min_app_version'] as String? ?? '1.0.0',
      isMandatory: json['is_mandatory'] as bool? ?? false,
      releaseNotes: json['release_notes'] as String? ?? '',
      assets: parsedAssets,
    );
  }

  Map<String, dynamic> toJson() => {
        'patch_version': patchVersion,
        'min_app_version': minAppVersion,
        'is_mandatory': isMandatory,
        'release_notes': releaseNotes,
        'assets': assets
            .map((a) => (a as PatchAssetModel).toJson())
            .toList(),
      };
}

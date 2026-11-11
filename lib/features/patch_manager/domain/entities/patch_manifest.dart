/// كائن يمثل ملف أصل فردي مطلوب تنزيله وتحديثه ضمن حزمة التحديث
class PatchAsset {
  final String fileName;
  final String targetPath;
  final String downloadUrl;
  final String checksumSha256;

  const PatchAsset({
    required this.fileName,
    required this.targetPath,
    required this.downloadUrl,
    required this.checksumSha256,
  });
}

/// كائن يمثل عقد بيان التحديثات السحابية (manifest.json)
class PatchManifest {
  final String patchVersion;
  final String minAppVersion;
  final bool isMandatory;
  final String releaseNotes;
  final List<PatchAsset> assets;

  const PatchManifest({
    required this.patchVersion,
    required this.minAppVersion,
    required this.isMandatory,
    required this.releaseNotes,
    required this.assets,
  });
}

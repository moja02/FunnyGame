import '../entities/patch_manifest.dart';
import '../entities/update_status.dart';

/// العقد المعماري لنظام فحص وتنزيل التحديثات السحابية (OTA Patch Manager)
abstract class PatchRepository {
  /// يتحقق من وجود تحديثات للأصول أو قواعد البيانات على السيرفر ويقارن التجزئة.
  ///
  /// [remoteManifestUrl]: رابط استرجاع ملف بيان التحديثات بصيغة JSON.
  ///
  /// يُرجع كائن [UpdateStatus] يوضح وجود حزم جديدة، حجمها، ودرجة إجباريتها.
  ///
  /// قد يطلق استثناء [NetworkException] في حال تعذر الوصول للخادم،
  /// أو [IntegrityCheckException] في حال عدم تطابق الـ Hash.
  Future<UpdateStatus> checkRemoteUpdate({required String remoteManifestUrl});

  /// يقوم بتنزيل أصل سحابي محدد، والتحقق من بصمته الرقمية SHA-256 قبل اعتماده محلياً.
  Future<void> downloadAndApplyAsset({
    required PatchAsset asset,
    void Function(int received, int total)? onProgress,
  });

  /// يسترجع رقم الإصدار التكويني المثبت حالياً على جهاز اللاعب
  Future<String> getInstalledPatchVersion();

  /// يحفظ رقم الإصدار التكويني الجديد بعد اكتمال الترقيع
  Future<void> saveInstalledPatchVersion(String version);
}

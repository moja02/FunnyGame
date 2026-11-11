/// فئات الاستثناءات المعيارية للنظام وفق مبادئ هندسة البرمجيات
abstract class AppException implements Exception {
  final String message;
  final int? code;

  const AppException(this.message, [this.code]);

  @override
  String toString() => '$runtimeType: $message (Code: $code)';
}

/// استثناء فشل الاتصال بالشبكة أو تعذر الوصول للخادم السحابي
class NetworkException extends AppException {
  const NetworkException(super.message, [super.code]);
}

/// استثناء عدم تطابق البصمة الرقمية (Checksum) وتلف الملف المحمّل
class IntegrityCheckException extends AppException {
  final String expectedHash;
  final String actualHash;

  const IntegrityCheckException({
    required String message,
    required this.expectedHash,
    required this.actualHash,
  }) : super(message);

  @override
  String toString() =>
      'IntegrityCheckException: $message\nالمتوقع: $expectedHash\nالموجود: $actualHash';
}

/// استثناء فشل الوصول للقرص أو مساحات التخزين المحلية
class StorageException extends AppException {
  const StorageException(super.message, [super.code]);
}

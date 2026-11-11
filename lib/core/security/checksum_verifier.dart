import 'dart:io';
import 'package:crypto/crypto.dart';
import '../errors/exceptions.dart';

/// وحدة التحقق الأمني من سلامة الحزم والأصول الرقمية باستخدام خوارزمية SHA-256.
class ChecksumVerifier {
  /// يحسب بصمة التجزئة SHA-256 لملف موجود على القرص
  ///
  /// [file]: الملف المراد فحصه
  /// يُرجع نصاً بالنظام السداسي عشري (Hexadecimal) للبصمة المحسوبة
  static Future<String> computeFileHash(File file) async {
    if (!await file.exists()) {
      throw const StorageException('الملف المراد فحص تجزئته غير موجود على القرص.');
    }
    final bytes = await file.readAsBytes();
    final digest = sha256.convert(bytes);
    return digest.toString();
  }

  /// يتحقق من تطابق بصمة الملف مع البصمة المتوقعة من الخادم
  ///
  /// يطلق [IntegrityCheckException] في حالة عدم التطابق لمنع تثبيت ملفات فاسدة
  static Future<bool> verifyFileIntegrity({
    required File file,
    required String expectedHash,
  }) async {
    final actualHash = await computeFileHash(file);
    if (actualHash.toLowerCase() != expectedHash.toLowerCase()) {
      throw IntegrityCheckException(
        message: 'عدم تطابق البصمة الرقمية للملف المحمل.',
        expectedHash: expectedHash,
        actualHash: actualHash,
      );
    }
    return true;
  }
}

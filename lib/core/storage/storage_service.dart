import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import '../errors/exceptions.dart';

/// خدمة إدارة المسارات والمجلدات الداخلية للتطبيق لتحميل وتخزين التحديثات السحابية.
class StorageService {
  static StorageService? _instance;
  StorageService._();

  static StorageService get instance => _instance ??= StorageService._();

  Directory? _baseDir;

  /// تهيئة المسار الأساسي لحفظ الملفات داخل مجلد المستندات الخاص بالتطبيق
  Future<void> init() async {
    try {
      if (!kIsWeb) {
        _baseDir = await getApplicationDocumentsDirectory();
      }
    } catch (e) {
      throw StorageException('فشل في الوصول لمسار المستندات المحلي: $e');
    }
  }

  /// مسار مجلد المستندات المحلي
  String get basePath {
    if (kIsWeb) return '';
    if (_baseDir == null) {
      throw const StorageException('لم يتم تهيئة StorageService قبل الاستخدام.');
    }
    return _baseDir!.path;
  }

  /// الحصول على مسار ملف محلي ضمن مجلد التحديثات
  File getPatchFile(String relativePath) {
    if (kIsWeb) {
      throw const StorageException('نظام الملفات المحلي غير مدعوم على الويب مباشرة.');
    }
    final fullPath = '$basePath/$relativePath';
    return File(fullPath);
  }

  /// التأكد من وجود المجلدات الأبوية قبل كتابة الملف
  Future<void> ensureParentDirectory(File file) async {
    final parent = file.parent;
    if (!await parent.exists()) {
      await parent.create(recursive: true);
    }
  }

  /// حفظ البيانات النصية (مثل ملفات التكوين JSON) محلياً
  Future<File> writeString(String relativePath, String content) async {
    final file = getPatchFile(relativePath);
    await ensureParentDirectory(file);
    return file.writeAsString(content);
  }

  /// قراءة ملف نصي محلي إن وجد
  Future<String?> readString(String relativePath) async {
    try {
      final file = getPatchFile(relativePath);
      if (await file.exists()) {
        return await file.readAsString();
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}

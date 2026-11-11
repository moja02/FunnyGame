import 'dart:io';
import 'package:dio/dio.dart';
import '../errors/exceptions.dart';

/// عميل الاتصال الشبكي المتقدم المبني على Dio لإدارة طلبات الـ API والتنزيل مع دعم الاستئناف.
class NetworkClient {
  final Dio dio;

  NetworkClient({Dio? customDio})
      : dio = customDio ??
            Dio(
              BaseOptions(
                connectTimeout: const Duration(seconds: 15),
                receiveTimeout: const Duration(seconds: 25),
                sendTimeout: const Duration(seconds: 15),
                headers: {
                  'Accept': 'application/json',
                  'User-Agent': 'FunnyGame-OTA-Client/1.0',
                },
              ),
            );

  /// جلب بيانات JSON من رابط الخادم
  Future<dynamic> getJson(String url) async {
    try {
      final response = await dio.get(url);
      return response.data;
    } on DioException catch (e) {
      throw NetworkException(
        'فشل جلب البيانات من الخادم: ${e.message}',
        e.response?.statusCode,
      );
    } catch (e) {
      throw NetworkException('خطأ غير متوقع أثناء الاتصال بالشبكة: $e');
    }
  }

  /// تنزيل ملف مع دعم استئناف التنزيل (HTTP Range Headers) ومراقبة نسبة التقدم.
  ///
  /// [downloadUrl]: رابط تحميل الملف السحابي.
  /// [destinationFile]: الملف المحلي المستهدف لكتابة البيانات.
  /// [onProgress]: دالة رد نداء تُمرر (البايتات المحملة، إجمالي الحجم).
  Future<void> downloadResumableFile({
    required String downloadUrl,
    required File destinationFile,
    void Function(int received, int total)? onProgress,
  }) async {
    int downloadedBytes = 0;
    final parentDir = destinationFile.parent;
    if (!await parentDir.exists()) {
      await parentDir.create(recursive: true);
    }

    if (await destinationFile.exists()) {
      downloadedBytes = await destinationFile.length();
    }

    try {
      final options = Options(
        responseType: ResponseType.stream,
        headers: downloadedBytes > 0
            ? {'Range': 'bytes=$downloadedBytes-'}
            : null,
      );

      final response = await dio.get<ResponseBody>(
        downloadUrl,
        options: options,
      );

      final statusCode = response.statusCode ?? 200;
      final isPartial = statusCode == 206; // HTTP Partial Content
      final isFull = statusCode == 200;

      if (!isPartial && !isFull) {
        throw NetworkException('استجابة خادم غير صالحة أثناء التنزيل: $statusCode');
      }

      final fileMode = isPartial ? FileMode.append : FileMode.write;
      final fileSink = destinationFile.openWrite(mode: fileMode);

      final totalBytes = isPartial
          ? (int.tryParse(response.headers.value(HttpHeaders.contentLengthHeader) ?? '0') ?? 0) + downloadedBytes
          : (int.tryParse(response.headers.value(HttpHeaders.contentLengthHeader) ?? '0') ?? 0);

      int currentReceived = downloadedBytes;

      await for (final chunk in response.data!.stream) {
        fileSink.add(chunk);
        currentReceived += chunk.length;
        if (onProgress != null && totalBytes > 0) {
          onProgress(currentReceived, totalBytes);
        }
      }

      await fileSink.flush();
      await fileSink.close();
    } on DioException catch (e) {
      throw NetworkException('فشل في تنزيل الحزمة من الخادم: ${e.message}', e.response?.statusCode);
    } catch (e) {
      throw NetworkException('خطأ غير متوقع أثناء تنزيل الملف: $e');
    }
  }
}

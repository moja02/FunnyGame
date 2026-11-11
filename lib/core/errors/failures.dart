/// تمثيل الفشل البرمجي على مستوى طبقة النطاق (Domain Layer)
abstract class Failure {
  final String message;
  const Failure(this.message);

  @override
  String toString() => message;
}

class NetworkFailure extends Failure {
  const NetworkFailure([super.message = 'تعذر الاتصال بالخادم، تحقق من اتصال الإنترنت.']);
}

class IntegrityFailure extends Failure {
  const IntegrityFailure([super.message = 'فشل التحقق من أمان وسلامة الحزمة المحملة.']);
}

class StorageFailure extends Failure {
  const StorageFailure([super.message = 'خطأ في حفظ أو استرجاع البيانات محلياً.']);
}

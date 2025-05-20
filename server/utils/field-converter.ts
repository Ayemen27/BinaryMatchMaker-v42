/**
 * وظائف مساعدة لتحويل أسماء الحقول بين snake_case و camelCase
 * هذا الملف يوفر الوظائف اللازمة لضمان توافق البيانات بين واجهة المستخدم وقاعدة البيانات
 */

/**
 * تحويل أسماء الحقول من snake_case إلى camelCase
 * @param obj الكائن الذي سيتم تحويل أسماء حقوله
 * @returns كائن جديد مع أسماء الحقول بصيغة camelCase
 */
export function snakeToCamel(obj: any): any {
  // الخروج المبكر للقيم البدائية أو غير المعرفة
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  
  // التعامل مع المصفوفات
  if (Array.isArray(obj)) {
    return obj.map(item => snakeToCamel(item));
  }
  
  // تحويل أسماء الحقول في الكائن
  const transformed: Record<string, any> = {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // تحويل اسم الحقل من snake_case إلى camelCase
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      
      // تطبيق التحويل بشكل متكرر على القيم الفرعية
      transformed[camelKey] = snakeToCamel(obj[key]);
    }
  }
  
  return transformed;
}

/**
 * تحويل أسماء الحقول من camelCase إلى snake_case
 * @param obj الكائن الذي سيتم تحويل أسماء حقوله
 * @returns كائن جديد مع أسماء الحقول بصيغة snake_case
 */
export function camelToSnake(obj: any): any {
  // الخروج المبكر للقيم البدائية أو غير المعرفة
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  
  // التعامل مع المصفوفات
  if (Array.isArray(obj)) {
    return obj.map(item => camelToSnake(item));
  }
  
  // تحويل أسماء الحقول في الكائن
  const transformed: Record<string, any> = {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // تحويل اسم الحقل من camelCase إلى snake_case
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      
      // تطبيق التحويل بشكل متكرر على القيم الفرعية
      transformed[snakeKey] = camelToSnake(obj[key]);
    }
  }
  
  return transformed;
}

/**
 * تحويل استجابة قاعدة البيانات إلى الشكل المناسب للواجهة
 * مع إخفاء أي بيانات حساسة
 * @param dbData البيانات القادمة من قاعدة البيانات
 * @param sensitiveFields مصفوفة بأسماء الحقول الحساسة التي يجب إخفاؤها
 * @returns كائن جديد مناسب للإرسال إلى الواجهة
 */
export function prepareResponseData(dbData: any, sensitiveFields: string[] = []): any {
  if (!dbData) return null;
  
  // إنشاء نسخة من البيانات
  const dataCopy = { ...dbData };
  
  // إزالة الحقول الحساسة
  for (const field of sensitiveFields) {
    if (field in dataCopy) {
      delete dataCopy[field];
    }
  }
  
  // تحويل أسماء الحقول
  return snakeToCamel(dataCopy);
}

/**
 * تحويل بيانات الطلب من الواجهة إلى الشكل المناسب لقاعدة البيانات
 * @param requestData البيانات القادمة من الواجهة
 * @returns كائن جديد مناسب للإرسال إلى قاعدة البيانات
 */
export function prepareRequestData(requestData: any): any {
  if (!requestData) return null;
  
  // تحويل أسماء الحقول
  return camelToSnake(requestData);
}
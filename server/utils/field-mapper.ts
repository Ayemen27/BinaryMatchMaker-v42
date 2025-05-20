/**
 * أداة تحويل حقول قاعدة البيانات إلى تنسيق camelCase المستخدم في التطبيق
 * يضمن هذا الملف توافق أسماء الحقول بين قاعدة البيانات والتطبيق
 */

/**
 * تحويل أسماء الحقول من تنسيق snake_case (قاعدة البيانات) إلى camelCase (التطبيق)
 */
export function mapDatabaseToApp<T>(data: any): T {
  if (!data) return null as any;
  
  // إذا كان مصفوفة، نقوم بتطبيق التحويل على كل عنصر
  if (Array.isArray(data)) {
    return data.map(item => mapDatabaseToApp<any>(item)) as any;
  }
  
  // إذا لم يكن كائن، نعيده كما هو
  if (typeof data !== 'object' || data === null) {
    return data as any;
  }
  
  const mappedData: Record<string, any> = {};
  
  // تحويل كل الحقول في الكائن
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      // كشف أنماط snake_case وتحويلها إلى camelCase
      if (key.includes('_')) {
        const camelCaseKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        mappedData[camelCaseKey] = data[key];
      } else {
        mappedData[key] = data[key];
      }
    }
  }
  
  return mappedData as T;
}

/**
 * تحويل أسماء الحقول من تنسيق camelCase (التطبيق) إلى snake_case (قاعدة البيانات)
 */
export function mapAppToDatabase<T>(data: any): T {
  if (!data) return null as any;
  
  // إذا كان مصفوفة، نقوم بتطبيق التحويل على كل عنصر
  if (Array.isArray(data)) {
    return data.map(item => mapAppToDatabase<any>(item)) as any;
  }
  
  // إذا لم يكن كائن، نعيده كما هو
  if (typeof data !== 'object' || data === null) {
    return data as any;
  }
  
  const mappedData: Record<string, any> = {};
  
  // تحويل كل الحقول في الكائن
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      // كشف أنماط camelCase وتحويلها إلى snake_case
      // مثال: fullName إلى full_name
      const snakeCaseKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      
      // ضبط للتأكد من عدم وجود underscore في البداية (مثل _full_name)
      const finalKey = snakeCaseKey.startsWith('_') ? snakeCaseKey.substring(1) : snakeCaseKey;
      
      mappedData[finalKey] = data[key];
    }
  }
  
  return mappedData as T;
}

/**
 * تحويل كائن معين من قاعدة البيانات إلى تنسيق التطبيق مع الاحتفاظ بالحقول الأصلية أيضًا
 * هذا مفيد عندما نحتاج إلى دعم كلا النمطين خلال فترة الانتقال
 */
export function mapDatabaseToAppWithOriginal<T>(data: any): T {
  if (!data) return null as any;
  
  const mapped = mapDatabaseToApp<T>(data);
  
  // إذا كان الكائن الأصلي كائنًا
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    // دمج الكائن الناتج مع الكائن الأصلي للحفاظ على كلا الإصدارين من الحقول
    return { ...data, ...mapped } as T;
  }
  
  return mapped;
}
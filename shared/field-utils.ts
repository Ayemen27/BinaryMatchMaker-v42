/**
 * مكتبة مشتركة لتحويل أسماء الحقول بين الواجهة وقاعدة البيانات
 */

/**
 * تحويل اسم حقل من snake_case إلى camelCase
 * مثال: convert_field_name -> convertFieldName
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * تحويل اسم حقل من camelCase إلى snake_case
 * مثال: convertFieldName -> convert_field_name
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * تحويل كائن بالكامل من snake_case إلى camelCase
 */
export function convertObjectToCamelCase(obj: Record<string, any>): Record<string, any> {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }

  const result: Record<string, any> = {};
  
  Object.keys(obj).forEach(key => {
    // تحويل اسم المفتاح
    const camelKey = snakeToCamel(key);
    
    // تحويل القيمة إذا كانت كائنًا
    const value = obj[key];
    result[camelKey] = typeof value === 'object' && value !== null
      ? convertObjectToCamelCase(value)
      : value;
  });
  
  return result;
}

/**
 * تحويل كائن بالكامل من camelCase إلى snake_case
 */
export function convertObjectToSnakeCase(obj: Record<string, any>): Record<string, any> {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }

  const result: Record<string, any> = {};
  
  Object.keys(obj).forEach(key => {
    // تحويل اسم المفتاح
    const snakeKey = camelToSnake(key);
    
    // تحويل القيمة إذا كانت كائنًا
    const value = obj[key];
    result[snakeKey] = typeof value === 'object' && value !== null
      ? convertObjectToSnakeCase(value)
      : value;
  });
  
  return result;
}
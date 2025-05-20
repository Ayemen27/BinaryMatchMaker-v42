/**
 * وظائف معالجة إعدادات المستخدم
 * هذا الملف يحتوي على وظائف لضمان تنسيق وحفظ إعدادات المستخدم بشكل صحيح
 */

import { snakeToCamel, camelToSnake } from './field-converter';

/**
 * تحويل إعدادات المستخدم قبل الحفظ في قاعدة البيانات
 * @param settings الإعدادات بصيغة camelCase
 * @returns الإعدادات بصيغة snake_case مناسبة لقاعدة البيانات
 */
export function prepareSettingsForStorage(settings: Record<string, any>): Record<string, any> {
  // 1. تحويل أسماء الحقول من camelCase إلى snake_case
  const processed = camelToSnake(settings);
  
  // 2. تسجيل لأغراض التصحيح
  console.log('[تصحيح] تحويل الإعدادات للتخزين:', {
    قبل: settings,
    بعد: processed
  });
  
  return processed;
}

/**
 * تحويل إعدادات المستخدم بعد الاسترجاع من قاعدة البيانات
 * @param settings الإعدادات بصيغة snake_case من قاعدة البيانات
 * @returns الإعدادات بصيغة camelCase مناسبة للواجهة
 */
export function prepareSettingsForClient(settings: Record<string, any> | null): Record<string, any> | null {
  if (!settings) return null;
  
  // 1. تحويل أسماء الحقول من snake_case إلى camelCase
  const processed = snakeToCamel(settings);
  
  // 2. معالجة خاصة للواجهة (مثل إضافة حقول اشتقاقية)
  if (processed.openaiApiKey && processed.openaiApiKey.length > 0) {
    processed.hasCustomApiKey = true;
  }
  
  // 3. تسجيل لأغراض التصحيح
  console.log('[تصحيح] تحويل الإعدادات للعرض:', {
    قبل: settings,
    بعد: processed
  });
  
  return processed;
}
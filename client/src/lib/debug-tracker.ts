/**
 * نظام تتبع ذكي لمراقبة تدفق البيانات وتحديد مصادر المشاكل
 */

// تفعيل أو تعطيل التتبع العميق
export const ENABLE_DEEP_TRACKING = true;

// أنواع الأحداث المتتبعة
export enum TrackEventType {
  SETTINGS_CHANGE = 'settings_change',
  SETTINGS_LOAD = 'settings_load',
  SETTINGS_SAVE = 'settings_save',
  STORAGE_READ = 'storage_read',
  STORAGE_WRITE = 'storage_write',
  SERVER_REQUEST = 'server_request',
  SERVER_RESPONSE = 'server_response',
  STATE_UPDATE = 'state_update',
  FORM_UPDATE = 'form_update',
  COMPONENT_RENDER = 'component_render',
  ERROR = 'error'
}

// سجل الأحداث
interface TrackEvent {
  id: string;
  type: TrackEventType;
  timestamp: number;
  component?: string;
  action?: string;
  data?: any;
  previousValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
}

// مخزن الأحداث
let eventLog: TrackEvent[] = [];
let sessionStorage: Map<string, any> = new Map();

// إنشاء معرف فريد
function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
}

// حفظ حدث جديد
export function trackEvent(
  type: TrackEventType,
  params: {
    component?: string;
    action?: string;
    data?: any;
    previousValue?: any;
    newValue?: any;
    metadata?: Record<string, any>;
  }
): string {
  if (!ENABLE_DEEP_TRACKING) return "";
  
  const eventId = generateId();
  const event: TrackEvent = {
    id: eventId,
    type,
    timestamp: Date.now(),
    ...params
  };
  
  eventLog.push(event);
  
  // تسجيل في وحدة التحكم مع تنسيق ملون للمطورين
  const colorMap = {
    [TrackEventType.SETTINGS_CHANGE]: 'background: #3498db; color: white;',
    [TrackEventType.SETTINGS_LOAD]: 'background: #2ecc71; color: white;',
    [TrackEventType.SETTINGS_SAVE]: 'background: #1abc9c; color: white;',
    [TrackEventType.STORAGE_READ]: 'background: #f1c40f; color: black;',
    [TrackEventType.STORAGE_WRITE]: 'background: #e67e22; color: white;',
    [TrackEventType.SERVER_REQUEST]: 'background: #9b59b6; color: white;',
    [TrackEventType.SERVER_RESPONSE]: 'background: #8e44ad; color: white;',
    [TrackEventType.STATE_UPDATE]: 'background: #27ae60; color: white;',
    [TrackEventType.FORM_UPDATE]: 'background: #16a085; color: white;',
    [TrackEventType.COMPONENT_RENDER]: 'background: #95a5a6; color: white;',
    [TrackEventType.ERROR]: 'background: #e74c3c; color: white;'
  };
  
  console.log(
    `%c[تتبع] ${type} ${params.component ? `| ${params.component}` : ''} ${params.action ? `| ${params.action}` : ''}`,
    colorMap[type] || 'background: #34495e; color: white;',
    {
      id: eventId,
      timestamp: new Date(event.timestamp).toISOString(),
      ...params
    }
  );
  
  // حفظ الإعدادات في المخزن المؤقت إذا كانت ذات صلة
  if (
    type === TrackEventType.SETTINGS_CHANGE || 
    type === TrackEventType.SETTINGS_SAVE ||
    type === TrackEventType.STATE_UPDATE
  ) {
    if (params.newValue) {
      sessionStorage.set('latestSettings', params.newValue);
    }
  }
  
  return eventId;
}

// الحصول على سجل الأحداث كاملاً
export function getEventLog(): TrackEvent[] {
  return [...eventLog];
}

// تصفية سجل الأحداث حسب النوع
export function filterEvents(type: TrackEventType): TrackEvent[] {
  return eventLog.filter(event => event.type === type);
}

// تحليل سلسلة الأحداث المرتبطة بعملية معينة
export function analyzeSettingsJourney(settingName?: string): TrackEvent[] {
  // ترتيب الأحداث حسب الوقت
  const events = [...eventLog].sort((a, b) => a.timestamp - b.timestamp);
  
  if (settingName) {
    // تصفية الأحداث حسب اسم الإعداد
    return events.filter(event => 
      (event.data && event.data[settingName] !== undefined) ||
      (event.newValue && typeof event.newValue === 'object' && event.newValue[settingName] !== undefined) ||
      (event.previousValue && typeof event.previousValue === 'object' && event.previousValue[settingName] !== undefined) ||
      (event.metadata && event.metadata.settingName === settingName)
    );
  }
  
  // تصفية الأحداث المتعلقة بالإعدادات فقط
  return events.filter(event => 
    event.type === TrackEventType.SETTINGS_CHANGE ||
    event.type === TrackEventType.SETTINGS_LOAD ||
    event.type === TrackEventType.SETTINGS_SAVE ||
    event.type === TrackEventType.STORAGE_READ ||
    event.type === TrackEventType.STORAGE_WRITE ||
    (event.type === TrackEventType.SERVER_REQUEST && event.action?.includes('settings')) ||
    (event.type === TrackEventType.SERVER_RESPONSE && event.action?.includes('settings'))
  );
}

// كشف الاختلافات بين قيمتين
export function detectChanges(prevValue: any, newValue: any): Record<string, {old: any, new: any}> {
  const changes: Record<string, {old: any, new: any}> = {};
  
  if (typeof prevValue !== 'object' || typeof newValue !== 'object') {
    return { value: { old: prevValue, new: newValue } };
  }
  
  // مقارنة الحقول
  const allKeys = new Set([...Object.keys(prevValue || {}), ...Object.keys(newValue || {})]);
  
  allKeys.forEach(key => {
    if (JSON.stringify(prevValue?.[key]) !== JSON.stringify(newValue?.[key])) {
      changes[key] = {
        old: prevValue?.[key],
        new: newValue?.[key]
      };
    }
  });
  
  return changes;
}

// إعادة تعيين سجل الأحداث
export function resetEventLog(): void {
  eventLog = [];
  sessionStorage.clear();
}

// حفظ قيمة في المخزن المؤقت
export function storeValue(key: string, value: any): void {
  sessionStorage.set(key, value);
}

// استرجاع قيمة من المخزن المؤقت
export function retrieveValue(key: string): any {
  return sessionStorage.get(key);
}

// تصدير النظام بالكامل
export default {
  trackEvent,
  getEventLog,
  filterEvents,
  analyzeSettingsJourney,
  detectChanges,
  resetEventLog,
  storeValue,
  retrieveValue,
  TrackEventType
};
import express from 'express';
import { UnifiedTelegramBot } from './unified-telegram-bot';

/**
 * وظيفة لإضافة خدمة البوت الموحد إلى التطبيق
 */
export function setupTelegramBot(app: express.Application, baseUrl: string): void {
  try {
    console.log('[نظام تلجرام] بدء تهيئة بوت تلجرام الموحد...');
    
    // إنشاء نسخة من البوت الموحد
    const unifiedBot = new UnifiedTelegramBot();
    
    // تسجيل مسارات البوت (webhook) في تطبيق الإكسبرس
    unifiedBot.registerWebhook(app, baseUrl);
    
    console.log('[نظام تلجرام] تم إعداد بوت تلجرام الموحد بنجاح');
    
    // تصدير حالة البوت للاستخدام في أجزاء أخرى من التطبيق (اختياري)
    (app as any).telegramBot = unifiedBot;
    
  } catch (error) {
    console.error('[نظام تلجرام] فشل في إعداد بوت تلجرام الموحد:', error);
  }
}
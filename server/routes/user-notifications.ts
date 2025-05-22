import express, { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { logger } from "../services/logger";
import { prepareResponseData, prepareRequestData } from "../utils/field-converter";

// إنشاء موجه الطرق
const router = express.Router();

// مخطط التحقق من صحة إعدادات الإشعارات
const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  signalAlerts: z.boolean().optional(),
  marketUpdates: z.boolean().optional(),
  accountAlerts: z.boolean().optional(),
  promotionalEmails: z.boolean().optional(),
});

// الحصول على إعدادات الإشعارات للمستخدم
router.get("/", async (req: Request, res: Response) => {
  try {
    // التحقق من أن المستخدم مسجل دخوله
    if (!req.isAuthenticated()) {
      logger.warn("UserNotifications", "محاولة وصول غير مصرح بها", { ip: req.ip });
      return res.status(401).json({ error: "غير مصرح. يرجى تسجيل الدخول." });
    }

    // الحصول على معرف المستخدم من الجلسة
    const userId = req.user!.id;

    // البحث عن إعدادات الإشعارات في قاعدة البيانات
    let settings = await storage.getUserNotificationSettings(userId);
    
    // إذا لم تكن الإعدادات موجودة، قم بإنشاء إعدادات افتراضية
    if (!settings) {
      logger.info("UserNotifications", "إنشاء إعدادات إشعارات افتراضية", { userId });
      
      const defaultSettings = {
        userId,
        emailNotifications: true,
        pushNotifications: true,
        signalAlerts: true,
        marketUpdates: false,
        accountAlerts: true,
        promotionalEmails: false
      };
      
      settings = await storage.createUserNotificationSettings(defaultSettings);
    }
    
    logger.info("UserNotifications", "تم استرجاع إعدادات الإشعارات", { userId });
    
    // تحويل أسماء الحقول من snake_case إلى camelCase قبل إرسالها للواجهة
    const transformedSettings = prepareResponseData(settings);
    console.log('[تصحيح] إعدادات الإشعارات المرسلة للواجهة:', JSON.stringify(transformedSettings, null, 2));
    
    return res.status(200).json(transformedSettings);
  } catch (error) {
    logger.error("UserNotifications", error instanceof Error ? error : new Error(String(error)), { userId: req.user?.id });
    return res.status(500).json({ 
      error: "حدث خطأ أثناء جلب إعدادات الإشعارات", 
      message: error instanceof Error ? error.message : "خطأ غير معروف" 
    });
  }
});

// تحديث إعدادات الإشعارات للمستخدم
router.put("/", async (req: Request, res: Response) => {
  try {
    // التحقق من أن المستخدم مسجل دخوله
    if (!req.isAuthenticated()) {
      logger.warn("UserNotifications", "محاولة تحديث إشعارات غير مصرح بها", { ip: req.ip });
      return res.status(401).json({ error: "غير مصرح. يرجى تسجيل الدخول." });
    }

    // التحقق من صحة البيانات المرسلة
    const result = notificationSettingsSchema.safeParse(req.body);
    if (!result.success) {
      logger.warn("UserNotifications", "بيانات إشعارات غير صالحة", { 
        errors: result.error.errors,
        userId: req.user!.id 
      });
      return res.status(400).json({ 
        error: "بيانات غير صالحة", 
        details: result.error.errors 
      });
    }

    const userId = req.user!.id;
    const settingsData = result.data;
    
    // تحويل أسماء الحقول من camelCase إلى snake_case قبل التحديث في قاعدة البيانات
    const transformedData = prepareRequestData(settingsData);
    
    // سجل عملية تحديث الإعدادات
    logger.info("UserNotifications", "بدء عملية تحديث إعدادات الإشعارات", { 
      userId, 
      fieldsToUpdate: Object.keys(settingsData),
      transformedData: transformedData
    });

    // التحقق من وجود إعدادات للمستخدم
    let userSettings = await storage.getUserNotificationSettings(userId);
    
    if (!userSettings) {
      // إنشاء إعدادات جديدة مع القيم الافتراضية للحقول الغير موجودة
      const defaultSettings = {
        emailNotifications: true,
        pushNotifications: true,
        signalAlerts: true,
        marketUpdates: false,
        accountAlerts: true,
        promotionalEmails: false,
        ...settingsData
      };
      
      userSettings = await storage.createUserNotificationSettings({
        userId,
        ...defaultSettings
      });
      
      logger.info("UserNotifications", "تم إنشاء إعدادات إشعارات جديدة للمستخدم", { userId });
    } else {
      // تحديث الإعدادات الموجودة
      // يتم استخدام البيانات المحولة (transformedData) لضمان توافق أسماء الحقول مع قاعدة البيانات
      // ولكن سنستخدم الحقول الأصلية هنا (settingsData) لأننا سنعتمد على storage مع تحويل خاص بها
      const updatedSettings = {
        userId,
        emailNotifications: settingsData.emailNotifications !== undefined 
          ? settingsData.emailNotifications 
          : userSettings.emailNotifications,
        pushNotifications: settingsData.pushNotifications !== undefined 
          ? settingsData.pushNotifications 
          : userSettings.pushNotifications,
        signalAlerts: settingsData.signalAlerts !== undefined 
          ? settingsData.signalAlerts 
          : userSettings.signalAlerts,
        marketUpdates: settingsData.marketUpdates !== undefined 
          ? settingsData.marketUpdates 
          : userSettings.marketUpdates,
        accountAlerts: settingsData.accountAlerts !== undefined 
          ? settingsData.accountAlerts 
          : userSettings.accountAlerts,
        promotionalEmails: settingsData.promotionalEmails !== undefined 
          ? settingsData.promotionalEmails 
          : userSettings.promotionalEmails,
      };
      
      console.log('تحديث إعدادات الإشعارات للمستخدم:', { userId, updatedSettings });
      
      userSettings = await storage.updateUserNotificationSettings(userId, updatedSettings);
      
      logger.info("UserNotifications", "تم تحديث إعدادات الإشعارات للمستخدم", { 
        userId,
        fieldsUpdated: Object.keys(settingsData)
      });
    }
    
    // تحويل أسماء الحقول من snake_case إلى camelCase قبل إرسالها للواجهة
    const transformedSettings = prepareResponseData(userSettings);
    console.log('[تصحيح] تم تحديث إعدادات الإشعارات للمستخدم وإرسالها للواجهة:', JSON.stringify(transformedSettings, null, 2));
    
    return res.status(200).json({
      ...transformedSettings,
      _serverTime: new Date().toISOString()
    });
  } catch (error) {
    logger.error("UserNotifications", error instanceof Error ? error : new Error(String(error)), { userId: req.user?.id });
    return res.status(500).json({ 
      error: "حدث خطأ أثناء تحديث إعدادات الإشعارات", 
      message: error instanceof Error ? error.message : "خطأ غير معروف" 
    });
  }
});

export default router;
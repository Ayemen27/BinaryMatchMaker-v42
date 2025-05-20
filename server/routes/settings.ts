/**
 * مسارات إعدادات المستخدم (موحدة)
 * تقوم بمعالجة جميع أنواع إعدادات المستخدم من خلال واجهة API موحدة
 */

import express, { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { logger } from "../services/logger";
import { convertObjectToCamelCase, convertObjectToSnakeCase } from "../../shared/field-utils";

// إنشاء موجه الطرق
const router = express.Router();

// مخطط التحقق من الإعدادات العامة
const generalSettingsSchema = z.object({
  theme: z.string().optional(),
  defaultAsset: z.string().optional(),
  defaultTimeframe: z.string().optional(),
  defaultPlatform: z.string().optional(),
  chartType: z.string().optional(),
  showTradingTips: z.boolean().optional(),
  autoRefreshData: z.boolean().optional(),
  refreshInterval: z.number().optional(),
});

// مخطط التحقق من إعدادات الإشعارات
const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  signalAlerts: z.boolean().optional(),
  marketUpdates: z.boolean().optional(),
  accountAlerts: z.boolean().optional(),
  promotionalEmails: z.boolean().optional(),
});

// مخطط التحقق من إعدادات API
const apiSettingsSchema = z.object({
  useAiForSignals: z.boolean().optional(),
  useCustomAiKey: z.boolean().optional(),
  openaiApiKey: z.string().optional(),
});

// الحصول على جميع إعدادات المستخدم (موحدة)
router.get("/", async (req: Request, res: Response) => {
  try {
    // التحقق من أن المستخدم مسجل دخوله
    if (!req.isAuthenticated()) {
      logger.warn("Settings", "محاولة وصول غير مصرح بها", { ip: req.ip });
      return res.status(401).json({ error: "غير مصرح. يرجى تسجيل الدخول." });
    }

    // الحصول على معرف المستخدم من الجلسة
    const userId = req.user!.id;

    // الحصول على جميع أنواع الإعدادات
    const userGeneral = await storage.getUserSettings(userId);
    const userNotifications = await storage.getUserNotificationSettings(userId);
    const user = await storage.getUser(userId);

    // تحويل البيانات من snake_case إلى camelCase
    const transformedGeneral = userGeneral ? convertObjectToCamelCase(userGeneral) : null;
    const transformedNotifications = userNotifications ? convertObjectToCamelCase(userNotifications) : null;
    const transformedUser = user ? convertObjectToCamelCase(user) : null;

    // دمج الإعدادات في كائن واحد
    const allSettings = {
      general: transformedGeneral,
      notifications: transformedNotifications,
      user: transformedUser ? {
        id: transformedUser.id,
        username: transformedUser.username,
        email: transformedUser.email,
        fullName: transformedUser.fullName,
        language: transformedUser.language,
        subscriptionLevel: transformedUser.subscriptionLevel,
      } : null,
    };

    logger.info("Settings", "تم استرجاع إعدادات المستخدم", { userId });
    console.log('إعدادات المستخدم المرسلة للواجهة:', JSON.stringify(allSettings, null, 2));
    
    return res.status(200).json(allSettings);
  } catch (error) {
    logger.error("Settings", error instanceof Error ? error : new Error(String(error)), { userId: req.user?.id });
    return res.status(500).json({ 
      error: "حدث خطأ أثناء جلب إعدادات المستخدم", 
      message: error instanceof Error ? error.message : "خطأ غير معروف" 
    });
  }
});

// تحديث الإعدادات العامة
router.put("/general", async (req: Request, res: Response) => {
  try {
    // التحقق من أن المستخدم مسجل دخوله
    if (!req.isAuthenticated()) {
      logger.warn("Settings", "محاولة تحديث إعدادات غير مصرح بها", { ip: req.ip });
      return res.status(401).json({ error: "غير مصرح. يرجى تسجيل الدخول." });
    }

    // التحقق من صحة البيانات المرسلة
    const result = generalSettingsSchema.safeParse(req.body);
    if (!result.success) {
      logger.warn("Settings", "بيانات إعدادات غير صالحة", { 
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
    
    // تحويل البيانات من camelCase إلى snake_case
    const transformedData = convertObjectToSnakeCase(settingsData);
    
    logger.info("Settings", "بدء عملية تحديث الإعدادات العامة", { 
      userId, 
      fieldsToUpdate: Object.keys(settingsData) 
    });

    // تحديث الإعدادات
    const updatedSettings = await storage.updateUserSettings(userId, transformedData);
    
    // تحويل البيانات المحدثة من snake_case إلى camelCase
    const transformedSettings = convertObjectToCamelCase(updatedSettings);

    logger.info("Settings", "تم تحديث الإعدادات العامة", { 
      userId,
      updatedFields: Object.keys(settingsData)
    });
    
    return res.status(200).json(transformedSettings);
  } catch (error) {
    logger.error("Settings", error instanceof Error ? error : new Error(String(error)), { userId: req.user?.id });
    return res.status(500).json({ 
      error: "حدث خطأ أثناء تحديث الإعدادات العامة", 
      message: error instanceof Error ? error.message : "خطأ غير معروف" 
    });
  }
});

// تحديث إعدادات الإشعارات
router.put("/notifications", async (req: Request, res: Response) => {
  try {
    // التحقق من أن المستخدم مسجل دخوله
    if (!req.isAuthenticated()) {
      logger.warn("Settings", "محاولة تحديث إشعارات غير مصرح بها", { ip: req.ip });
      return res.status(401).json({ error: "غير مصرح. يرجى تسجيل الدخول." });
    }

    // التحقق من صحة البيانات المرسلة
    const result = notificationSettingsSchema.safeParse(req.body);
    if (!result.success) {
      logger.warn("Settings", "بيانات إشعارات غير صالحة", { 
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
    
    // تحويل البيانات من camelCase إلى snake_case
    const transformedData = convertObjectToSnakeCase(settingsData);
    
    logger.info("Settings", "بدء عملية تحديث إعدادات الإشعارات", { 
      userId, 
      fieldsToUpdate: Object.keys(settingsData),
      transformedData 
    });

    // تحديث الإعدادات
    const updatedSettings = await storage.updateUserNotificationSettings(userId, {
      userId,
      ...transformedData
    });
    
    // تحويل البيانات المحدثة من snake_case إلى camelCase
    const transformedSettings = convertObjectToCamelCase(updatedSettings);

    logger.info("Settings", "تم تحديث إعدادات الإشعارات", { 
      userId,
      updatedFields: Object.keys(settingsData)
    });
    
    return res.status(200).json(transformedSettings);
  } catch (error) {
    logger.error("Settings", error instanceof Error ? error : new Error(String(error)), { userId: req.user?.id });
    return res.status(500).json({ 
      error: "حدث خطأ أثناء تحديث إعدادات الإشعارات", 
      message: error instanceof Error ? error.message : "خطأ غير معروف" 
    });
  }
});

// تحديث الملف الشخصي
router.put("/profile", async (req: Request, res: Response) => {
  try {
    // التحقق من أن المستخدم مسجل دخوله
    if (!req.isAuthenticated()) {
      logger.warn("Settings", "محاولة تحديث معلومات شخصية غير مصرح بها", { ip: req.ip });
      return res.status(401).json({ error: "غير مصرح. يرجى تسجيل الدخول." });
    }

    const userId = req.user!.id;
    const { username, email, fullName, language } = req.body;
    
    // تحويل البيانات من camelCase إلى snake_case
    const profileData = {
      username,
      email,
      full_name: fullName,
      language
    };
    
    // تحديث بيانات المستخدم
    const updatedUser = await storage.updateUserProfile(userId, profileData);
    
    // تحويل البيانات المحدثة من snake_case إلى camelCase
    const transformedUser = convertObjectToCamelCase(updatedUser);

    logger.info("Settings", "تم تحديث الملف الشخصي", { userId });
    
    return res.status(200).json(transformedUser);
  } catch (error) {
    logger.error("Settings", error instanceof Error ? error : new Error(String(error)), { userId: req.user?.id });
    return res.status(500).json({ 
      error: "حدث خطأ أثناء تحديث الملف الشخصي", 
      message: error instanceof Error ? error.message : "خطأ غير معروف" 
    });
  }
});

// تحديث إعدادات API
router.put("/api", async (req: Request, res: Response) => {
  try {
    // التحقق من أن المستخدم مسجل دخوله
    if (!req.isAuthenticated()) {
      logger.warn("Settings", "محاولة تحديث إعدادات API غير مصرح بها", { ip: req.ip });
      return res.status(401).json({ error: "غير مصرح. يرجى تسجيل الدخول." });
    }

    // التحقق من صحة البيانات المرسلة
    const result = apiSettingsSchema.safeParse(req.body);
    if (!result.success) {
      logger.warn("Settings", "بيانات API غير صالحة", { 
        errors: result.error.errors,
        userId: req.user!.id 
      });
      return res.status(400).json({ 
        error: "بيانات غير صالحة", 
        details: result.error.errors 
      });
    }

    const userId = req.user!.id;
    const apiData = result.data;
    
    // تحويل البيانات من camelCase إلى snake_case
    const transformedData = convertObjectToSnakeCase(apiData);
    
    // تحديث الإعدادات ضمن إعدادات المستخدم العامة
    const updatedSettings = await storage.updateUserSettings(userId, transformedData);
    
    // تحويل البيانات المحدثة من snake_case إلى camelCase
    const transformedSettings = convertObjectToCamelCase(updatedSettings);

    logger.info("Settings", "تم تحديث إعدادات API", { 
      userId,
      updatedFields: Object.keys(apiData)
    });
    
    return res.status(200).json(transformedSettings);
  } catch (error) {
    logger.error("Settings", error instanceof Error ? error : new Error(String(error)), { userId: req.user?.id });
    return res.status(500).json({ 
      error: "حدث خطأ أثناء تحديث إعدادات API", 
      message: error instanceof Error ? error.message : "خطأ غير معروف" 
    });
  }
});

export default router;
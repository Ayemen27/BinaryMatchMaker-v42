import express, { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { logger } from "../services/logger";

// إنشاء موجه الطرق
const router = express.Router();

// مخطط التحقق من صحة بيانات API
const apiSettingsSchema = z.object({
  openaiApiKey: z.string().optional(),
  useCustomAiKey: z.boolean().default(false),
  useAiForSignals: z.boolean().default(true),
});

// مخطط التحقق من صحة بيانات المستخدم
const userSettingsSchema = z.object({
  theme: z.string().optional(),
  defaultAsset: z.string().optional(),
  defaultTimeframe: z.string().optional(),
  defaultPlatform: z.string().optional(),
  chartType: z.string().optional(),
  showTradingTips: z.boolean().optional(),
  autoRefreshData: z.boolean().optional(),
  refreshInterval: z.number().optional(),
});

// الحصول على إعدادات المستخدم
router.get("/", async (req: Request, res: Response) => {
  try {
    // التحقق من أن المستخدم مسجل دخوله
    if (!req.isAuthenticated()) {
      logger.warn("UserSettings", "محاولة وصول غير مصرح بها", { ip: req.ip });
      return res.status(401).json({ error: "غير مصرح. يرجى تسجيل الدخول." });
    }

    // الحصول على معرف المستخدم من الجلسة
    const userId = req.user!.id;

    // البحث عن إعدادات المستخدم في قاعدة البيانات
    const settings = await storage.getUserSettings(userId);
    
    if (!settings) {
      return res.status(404).json({ error: "لم يتم العثور على إعدادات للمستخدم" });
    }

    // لا نقوم بإرجاع مفتاح API في الاستجابة لأسباب أمنية
    const { openaiApiKey, ...safeSettings } = settings;
    
    return res.status(200).json({
      ...safeSettings,
      hasCustomApiKey: !!openaiApiKey // إرسال معلومة فقط إذا كان المستخدم لديه مفتاح مخزن
    });
  } catch (error) {
    logger.error("UserSettings", error instanceof Error ? error : new Error(String(error)), { userId: req.user?.id });
    return res.status(500).json({ 
      error: "حدث خطأ أثناء جلب إعدادات المستخدم", 
      message: error instanceof Error ? error.message : "خطأ غير معروف" 
    });
  }
});

// تحديث إعدادات API
router.patch("/api", async (req: Request, res: Response) => {
  try {
    // التحقق من أن المستخدم مسجل دخوله
    if (!req.isAuthenticated()) {
      logger.warn("UserSettings", "محاولة تحديث إعدادات API غير مصرح بها", { ip: req.ip });
      return res.status(401).json({ error: "غير مصرح. يرجى تسجيل الدخول." });
    }

    // التحقق من صحة البيانات المرسلة
    const result = apiSettingsSchema.safeParse(req.body);
    if (!result.success) {
      logger.warn("UserSettings", "بيانات API غير صالحة", { 
        errors: result.error.errors,
        userId: req.user!.id 
      });
      return res.status(400).json({ 
        error: "بيانات غير صالحة", 
        details: result.error.errors 
      });
    }

    const { useCustomAiKey, useAiForSignals, openaiApiKey } = result.data;
    const userId = req.user!.id;

    // التحقق من وجود إعدادات للمستخدم، وإنشاؤها إذا لم تكن موجودة
    let userSettings = await storage.getUserSettings(userId);
    
    if (!userSettings) {
      // إنشاء إعدادات جديدة للمستخدم
      userSettings = await storage.createUserSettings({
        userId,
        useCustomAiKey,
        useAiForSignals,
        openaiApiKey: useCustomAiKey ? openaiApiKey : null
      });
    } else {
      // تحديث الإعدادات الحالية
      const updatedSettings = {
        useCustomAiKey,
        useAiForSignals,
        openaiApiKey: useCustomAiKey ? openaiApiKey : null // حذف المفتاح إذا تم إيقاف استخدام المفتاح المخصص
      };
      
      userSettings = await storage.updateUserSettings(userId, updatedSettings);
    }

    logger.info("UserSettings", "تم تحديث إعدادات API", { 
      userId,
      useCustomApiKey: useCustomAiKey,
      useAiForSignals
    });

    // لا نقوم بإرجاع مفتاح API في الاستجابة لأسباب أمنية
    const { openaiApiKey: _, ...safeSettings } = userSettings;
    
    return res.status(200).json({
      ...safeSettings,
      hasCustomApiKey: !!openaiApiKey && useCustomAiKey
    });
  } catch (error) {
    logger.error("UserSettings", error instanceof Error ? error : new Error(String(error)), { userId: req.user?.id });
    return res.status(500).json({ 
      error: "حدث خطأ أثناء تحديث إعدادات API", 
      message: error instanceof Error ? error.message : "خطأ غير معروف" 
    });
  }
});

// تحديث إعدادات المستخدم العامة
router.patch("/", async (req: Request, res: Response) => {
  try {
    // التحقق من أن المستخدم مسجل دخوله
    if (!req.isAuthenticated()) {
      logger.warn("UserSettings", "محاولة تحديث إعدادات المستخدم غير مصرح بها", { ip: req.ip });
      return res.status(401).json({ error: "غير مصرح. يرجى تسجيل الدخول." });
    }

    // التحقق من صحة البيانات المرسلة
    const result = userSettingsSchema.safeParse(req.body);
    if (!result.success) {
      logger.warn("UserSettings", "بيانات إعدادات المستخدم غير صالحة", { 
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

    // التحقق من وجود إعدادات للمستخدم، وإنشاؤها إذا لم تكن موجودة
    let userSettings = await storage.getUserSettings(userId);
    
    if (!userSettings) {
      // إنشاء إعدادات جديدة للمستخدم مع تعيين قيم افتراضية للحقول غير المرسلة
      const defaultSettings = {
        theme: 'dark',
        defaultAsset: 'BTC/USDT',
        defaultTimeframe: '1h',
        defaultPlatform: '',
        chartType: 'candlestick',
        showTradingTips: true,
        autoRefreshData: true,
        refreshInterval: 60,
        // نضع الإعدادات المرسلة بعد القيم الافتراضية لإعطاء الأولوية للقيم المرسلة
        ...settingsData
      };
      
      userSettings = await storage.createUserSettings({
        userId,
        ...defaultSettings
      });
    } else {
      // الحفاظ على القيم الحالية وتحديث فقط القيم المرسلة
      // هذا يضمن عدم فقدان أي إعدادات محفوظة سابقًا
      const updatedSettings = {
        // لا نستخدم spread operator فقط للقيم المرسلة
        // بدلاً من ذلك، نحدد كل حقل بشكل صريح ونتحقق مما إذا كان موجودًا في البيانات المرسلة
        theme: settingsData.theme !== undefined ? settingsData.theme : userSettings.theme,
        defaultAsset: settingsData.defaultAsset !== undefined ? settingsData.defaultAsset : userSettings.defaultAsset,
        defaultTimeframe: settingsData.defaultTimeframe !== undefined ? settingsData.defaultTimeframe : userSettings.defaultTimeframe,
        defaultPlatform: settingsData.defaultPlatform !== undefined ? settingsData.defaultPlatform : userSettings.defaultPlatform,
        chartType: settingsData.chartType !== undefined ? settingsData.chartType : userSettings.chartType,
        showTradingTips: settingsData.showTradingTips !== undefined ? settingsData.showTradingTips : userSettings.showTradingTips,
        autoRefreshData: settingsData.autoRefreshData !== undefined ? settingsData.autoRefreshData : userSettings.autoRefreshData,
        refreshInterval: settingsData.refreshInterval !== undefined ? settingsData.refreshInterval : userSettings.refreshInterval,
      };
      
      userSettings = await storage.updateUserSettings(userId, updatedSettings);
    }

    logger.info("UserSettings", "تم تحديث إعدادات المستخدم العامة", { userId });

    // لا نقوم بإرجاع مفتاح API في الاستجابة لأسباب أمنية
    const { openaiApiKey, ...safeSettings } = userSettings;
    
    return res.status(200).json({
      ...safeSettings,
      hasCustomApiKey: !!openaiApiKey
    });
  } catch (error) {
    logger.error("UserSettings", error instanceof Error ? error : new Error(String(error)), { userId: req.user?.id });
    return res.status(500).json({ 
      error: "حدث خطأ أثناء تحديث إعدادات المستخدم", 
      message: error instanceof Error ? error.message : "خطأ غير معروف" 
    });
  }
});

export default router;
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
  _updated: z.string().optional(), // حقل للتتبع فقط، غير مخزن في قاعدة البيانات
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
    
    // طباعة البيانات الأصلية من قاعدة البيانات للتصحيح
    console.log('[تصحيح] البيانات المستلمة من قاعدة البيانات:', JSON.stringify(settings, null, 2));
    
    // البيانات التي سيتم إرسالها إلى العميل
    const responseData = {
      ...safeSettings,
      hasCustomApiKey: !!openaiApiKey // إرسال معلومة فقط إذا كان المستخدم لديه مفتاح مخزن
    };
    
    console.log('[تصحيح] البيانات المرسلة إلى العميل:', JSON.stringify(responseData, null, 2));
    
    return res.status(200).json(responseData);
  } catch (error) {
    logger.error("UserSettings", error instanceof Error ? error : new Error(String(error)), { userId: req.user?.id });
    return res.status(500).json({ 
      error: "حدث خطأ أثناء جلب إعدادات المستخدم", 
      message: error instanceof Error ? error.message : "خطأ غير معروف" 
    });
  }
});

// تحديث إعدادات API (دعم PUT و PATCH للتوافق الخلفي)
router.put("/api", async (req: Request, res: Response) => {
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

    // سجل طلب تحديث إعدادات API
    logger.info("UserSettings", "طلب تحديث إعدادات API", {
      userId,
      useCustomAiKey,
      useAiForSignals,
      hasKey: !!openaiApiKey
    });

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
      
      logger.info("UserSettings", "تم إنشاء إعدادات API جديدة", { userId });
    } else {
      // تحديث الإعدادات الحالية
      const updatedSettings = {
        useCustomAiKey,
        useAiForSignals,
        openaiApiKey: useCustomAiKey ? openaiApiKey : null // حذف المفتاح إذا تم إيقاف استخدام المفتاح المخصص
      };
      
      userSettings = await storage.updateUserSettings(userId, updatedSettings);
      
      logger.info("UserSettings", "تم تحديث إعدادات API", { 
        userId,
        useCustomApiKey: useCustomAiKey,
        useAiForSignals
      });
    }

    // لا نقوم بإرجاع مفتاح API في الاستجابة لأسباب أمنية
    const { openaiApiKey: _, ...safeSettings } = userSettings;
    
    return res.status(200).json({
      ...safeSettings,
      hasCustomApiKey: !!openaiApiKey && useCustomAiKey,
      _serverTime: new Date().toISOString()
    });
  } catch (error) {
    logger.error("UserSettings", error instanceof Error ? error : new Error(String(error)), { userId: req.user?.id });
    return res.status(500).json({ 
      error: "حدث خطأ أثناء تحديث إعدادات API", 
      message: error instanceof Error ? error.message : "خطأ غير معروف" 
    });
  }
});

// دعم PATCH للتوافق الخلفي
router.patch("/api", async (req: Request, res: Response) => {
  // استخدام نفس الوظيفة كما في PUT ولكن مع طريقة PATCH
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

// تمت إزالة المعالج المكرر الأول هنا - وتركنا فقط المعالج الثاني الأكثر تفصيلاً أدناه

// تحديث كامل إعدادات المستخدم (استبدال كامل)
router.put("/", async (req: Request, res: Response) => {
  try {
    // التحقق من أن المستخدم مسجل دخوله
    if (!req.isAuthenticated()) {
      logger.warn("UserSettings", "محاولة تحديث كامل لإعدادات المستخدم غير مصرح بها", { ip: req.ip });
      return res.status(401).json({ error: "غير مصرح. يرجى تسجيل الدخول." });
    }

    // التحقق من صحة البيانات المرسلة
    const result = userSettingsSchema.safeParse(req.body);
    if (!result.success) {
      logger.warn("UserSettings", "بيانات إعدادات المستخدم الكاملة غير صالحة", { 
        errors: result.error.errors,
        userId: req.user!.id 
      });
      return res.status(400).json({ 
        error: "بيانات غير صالحة", 
        details: result.error.errors 
      });
    }

    const userId = req.user!.id;
    
    // استخراج البيانات للتحديث (حذف حقل _updated إذا كان موجوداً)
    const { _updated, ...settingsData } = result.data;
    
    // سجل عملية تحديث الإعدادات
    logger.info("UserSettings", "بدء عملية تحديث كامل للإعدادات", { 
      userId, 
      updateTime: _updated,
      fieldsToUpdate: Object.keys(settingsData)
    });

    // التحقق من وجود إعدادات للمستخدم
    let userSettings = await storage.getUserSettings(userId);
    
    if (!userSettings) {
      // إنشاء إعدادات جديدة مع الحفاظ على القيم الافتراضية للحقول الغير موجودة
      const defaultSettings = {
        theme: 'dark',
        defaultAsset: 'BTC/USDT',
        defaultTimeframe: '1h',
        defaultPlatform: '',
        chartType: 'candlestick',
        showTradingTips: true,
        autoRefreshData: true,
        refreshInterval: 60,
        ...settingsData
      };
      
      userSettings = await storage.createUserSettings({
        userId,
        ...defaultSettings
      });
      
      logger.info("UserSettings", "تم إنشاء إعدادات جديدة للمستخدم", { userId });
    } else {
      // تجميع الإعدادات الحالية والجديدة للتأكد من تحديث جميع الحقول المطلوبة
      // استخدام معالجة أكثر دقة للقيم البولينية والعددية تجنبًا لمشكلات التحويل
      
      // 1. الإعدادات الافتراضية كحماية
      const defaultValues = {
        theme: 'dark',
        defaultAsset: 'BTC/USDT',
        defaultTimeframe: '1h',
        defaultPlatform: '',
        chartType: 'candlestick',
        showTradingTips: true,
        autoRefreshData: true,
        refreshInterval: 60,
      };
      
      // 2. البيانات القادمة من العميل (بعد التحقق منها)
      const clientData = {
        theme: settingsData.theme,
        defaultAsset: settingsData.defaultAsset,
        defaultTimeframe: settingsData.defaultTimeframe,
        defaultPlatform: settingsData.defaultPlatform,
        chartType: settingsData.chartType,
        showTradingTips: settingsData.showTradingTips,
        autoRefreshData: settingsData.autoRefreshData,
        refreshInterval: settingsData.refreshInterval,
      };
      
      // 3. سجل البيانات الواردة للتشخيص
      logger.info("UserSettings", "البيانات الواردة من العميل", {
        userId,
        clientData: JSON.stringify(clientData)
      });
      
      // 4. البيانات الحالية من قاعدة البيانات
      const currentData = {
        theme: userSettings.theme,
        defaultAsset: userSettings.defaultAsset,
        defaultTimeframe: userSettings.defaultTimeframe,
        defaultPlatform: userSettings.defaultPlatform,
        chartType: userSettings.chartType,
        showTradingTips: userSettings.showTradingTips,
        autoRefreshData: userSettings.autoRefreshData,
        refreshInterval: userSettings.refreshInterval,
        openaiApiKey: userSettings.openaiApiKey,
        useCustomAiKey: userSettings.useCustomAiKey,
        useAiForSignals: userSettings.useAiForSignals,
      };
      
      // 5. سجل البيانات الحالية للتشخيص
      logger.info("UserSettings", "البيانات الحالية في قاعدة البيانات", {
        userId,
        currentData: JSON.stringify(currentData)
      });
      
      // 6. الدمج في إعدادات محدثة مع معالجة دقيقة لكل نوع بيانات
      const updatedSettings = {
        // نصوص - استخدام أولاً قيمة العميل إذا كانت موجودة ثم الحالية ثم الافتراضية
        theme: (typeof clientData.theme === 'string' && clientData.theme)
          ? clientData.theme 
          : (currentData.theme || defaultValues.theme),
          
        defaultAsset: (typeof clientData.defaultAsset === 'string' && clientData.defaultAsset)
          ? clientData.defaultAsset 
          : (currentData.defaultAsset || defaultValues.defaultAsset),
          
        defaultTimeframe: (typeof clientData.defaultTimeframe === 'string' && clientData.defaultTimeframe)
          ? clientData.defaultTimeframe 
          : (currentData.defaultTimeframe || defaultValues.defaultTimeframe),
          
        defaultPlatform: (typeof clientData.defaultPlatform === 'string')
          ? clientData.defaultPlatform 
          : (currentData.defaultPlatform || defaultValues.defaultPlatform),
          
        chartType: (typeof clientData.chartType === 'string' && clientData.chartType)
          ? clientData.chartType 
          : (currentData.chartType || defaultValues.chartType),
        
        // بولينية - التعامل مع قيم undefined و null بحذر
        showTradingTips: (typeof clientData.showTradingTips === 'boolean')
          ? clientData.showTradingTips 
          : (typeof currentData.showTradingTips === 'boolean' ? currentData.showTradingTips : defaultValues.showTradingTips),
          
        autoRefreshData: (typeof clientData.autoRefreshData === 'boolean')
          ? clientData.autoRefreshData 
          : (typeof currentData.autoRefreshData === 'boolean' ? currentData.autoRefreshData : defaultValues.autoRefreshData),
        
        // أرقام - التحقق من القيم الرقمية بشكل صحيح
        refreshInterval: (typeof clientData.refreshInterval === 'number' && !isNaN(clientData.refreshInterval))
          ? clientData.refreshInterval 
          : (typeof currentData.refreshInterval === 'number' && !isNaN(currentData.refreshInterval) 
              ? currentData.refreshInterval 
              : defaultValues.refreshInterval),
        
        // الحفاظ على إعدادات API المخزنة سابقًا
        openaiApiKey: currentData.openaiApiKey,
        useCustomAiKey: currentData.useCustomAiKey,
        useAiForSignals: currentData.useAiForSignals
      };
      
      // 7. سجل البيانات النهائية التي سيتم تحديثها
      logger.info("UserSettings", "البيانات النهائية للتحديث", {
        userId,
        updatedValues: JSON.stringify(updatedSettings)
      });
      
      logger.info("UserSettings", "تحديث كامل لإعدادات المستخدم", {
        userId,
        fieldsUpdated: Object.keys(settingsData)
      });
      
      userSettings = await storage.updateUserSettings(userId, updatedSettings);
    }

    // لا نقوم بإرجاع مفتاح API في الاستجابة لأسباب أمنية
    const { openaiApiKey, ...safeSettings } = userSettings;
    
    return res.status(200).json({
      ...safeSettings,
      hasCustomApiKey: !!openaiApiKey,
      _serverTime: new Date().toISOString()
    });
  } catch (error) {
    logger.error("UserSettings", error instanceof Error ? error : new Error(String(error)), { userId: req.user?.id });
    return res.status(500).json({ 
      error: "حدث خطأ أثناء التحديث الكامل لإعدادات المستخدم", 
      message: error instanceof Error ? error.message : "خطأ غير معروف" 
    });
  }
});

export default router;
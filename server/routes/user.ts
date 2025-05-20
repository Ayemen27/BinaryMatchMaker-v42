import express, { Request, Response } from "express";
import { storage } from "../storage";
import { logger } from "../services/logger";
import { prepareResponseData } from "../utils/field-converter";

// إنشاء موجه الطرق
const router = express.Router();

// الحصول على معلومات المستخدم الحالي
router.get("/", async (req: Request, res: Response) => {
  try {
    // التحقق من أن المستخدم مسجل دخوله
    if (!req.isAuthenticated()) {
      logger.warn("User", "محاولة وصول غير مصرح بها", { ip: req.ip });
      return res.status(401).json({ error: "غير مصرح. يرجى تسجيل الدخول." });
    }

    // الحصول على معرف المستخدم من الجلسة
    const userId = req.user!.id;

    // البحث عن بيانات المستخدم في قاعدة البيانات
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: "لم يتم العثور على بيانات المستخدم" });
    }

    // طباعة البيانات الأصلية للتشخيص
    console.log('[تصحيح] بيانات المستخدم الأصلية من قاعدة البيانات:', JSON.stringify(user, null, 2));
    
    // نحتاج للتعامل مع كائن user كملف عادي (أي كائن) وليس كنوع TypeScript
    // لأن الاستعلام المباشر من قاعدة البيانات سيعيد الأسماء بصيغة snake_case
    const rawUser = user as Record<string, any>;
    
    // تحويل أسماء الحقول من snake_case إلى camelCase
    const transformedUser = {} as Record<string, any>;
    for (const key in rawUser) {
      if (Object.prototype.hasOwnProperty.call(rawUser, key)) {
        // تحويل اسم الحقل من snake_case إلى camelCase
        // مثال: full_name -> fullName
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        transformedUser[camelKey] = rawUser[key];
        
        // سجل تحويل اسم الحقل للتصحيح
        if (key !== camelKey) {
          console.log(`تحويل حقل: ${key} -> ${camelKey}`);
        }
      }
    }
    
    // حماية كلمة المرور
    if ('password' in transformedUser) {
      delete transformedUser.password;
    }
    
    console.log('[تصحيح] بيانات المستخدم المرسلة إلى العميل:', JSON.stringify(transformedUser, null, 2));
    
    return res.status(200).json(transformedUser);
  } catch (error) {
    logger.error("User", error instanceof Error ? error : new Error(String(error)), { userId: req.user?.id });
    return res.status(500).json({ 
      error: "حدث خطأ أثناء جلب بيانات المستخدم", 
      message: error instanceof Error ? error.message : "خطأ غير معروف" 
    });
  }
});

// تحديث الملف الشخصي للمستخدم
router.put("/profile", async (req: Request, res: Response) => {
  try {
    // التحقق من أن المستخدم مسجل دخوله
    if (!req.isAuthenticated()) {
      logger.warn("User", "محاولة تحديث غير مصرح بها", { ip: req.ip });
      return res.status(401).json({ error: "غير مصرح. يرجى تسجيل الدخول." });
    }

    // الحصول على معرف المستخدم من الجلسة
    const userId = req.user!.id;
    
    console.log('طلب تحديث معلومات المستخدم - PUT:', {
      userId,
      body: req.body
    });

    const { username, email, fullName } = req.body;
    
    // طباعة البيانات قبل التحديث للتشخيص
    console.log('[تصحيح] بيانات الملف الشخصي للتحديث:', { username, email, fullName });
    
    // تحديث بيانات المستخدم
    const updatedUser = await storage.updateUserProfile(userId, {
      username,
      email,
      fullName
    });
    
    // تحويل أسماء الحقول من snake_case إلى camelCase
    const rawUser = updatedUser as Record<string, any>;
    const transformedUser = {} as Record<string, any>;
    
    for (const key in rawUser) {
      if (Object.prototype.hasOwnProperty.call(rawUser, key) && key !== 'password') {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        transformedUser[camelKey] = rawUser[key];
      }
    }
    
    console.log('[تصحيح] بيانات المستخدم المحدثة المرسلة إلى العميل:', JSON.stringify(transformedUser, null, 2));
    
    return res.status(200).json(transformedUser);
  } catch (error) {
    logger.error("User", error instanceof Error ? error : new Error(String(error)), { userId: req.user?.id });
    return res.status(500).json({ 
      error: "حدث خطأ أثناء تحديث بيانات المستخدم", 
      message: error instanceof Error ? error.message : "خطأ غير معروف" 
    });
  }
});

// دعم PATCH للتوافق الخلفي
router.patch("/profile", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "غير مصرح. يرجى تسجيل الدخول." });
    }
    
    const userId = req.user!.id;
    
    console.log('طلب تحديث معلومات المستخدم - PATCH:', {
      userId,
      body: req.body
    });

    const { username, email, fullName } = req.body;
    
    // تحديث بيانات المستخدم
    const updatedUser = await storage.updateUserProfile(userId, {
      username,
      email,
      fullName
    });
    
    // تحويل أسماء الحقول من snake_case إلى camelCase
    const rawUser = updatedUser as Record<string, any>;
    const transformedUser = {} as Record<string, any>;
    
    for (const key in rawUser) {
      if (Object.prototype.hasOwnProperty.call(rawUser, key) && key !== 'password') {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        transformedUser[camelKey] = rawUser[key];
      }
    }
    
    return res.status(200).json(transformedUser);
  } catch (error) {
    logger.error("User", error instanceof Error ? error : new Error(String(error)), { userId: req.user?.id });
    return res.status(500).json({ 
      error: "حدث خطأ أثناء تحديث بيانات المستخدم", 
      message: error instanceof Error ? error.message : "خطأ غير معروف" 
    });
  }
});

export default router;
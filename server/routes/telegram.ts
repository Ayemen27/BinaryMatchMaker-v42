import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { config } from 'dotenv';

// تحميل متغيرات البيئة
config();

const router = Router();

// إرسال أمر إلى البوت
router.post('/send-command', async (req, res) => {
  try {
    const { command, chatId } = req.body;
    
    if (!command || !chatId) {
      return res.status(400).json({ success: false, message: 'يجب إرسال الأمر ومعرف المحادثة' });
    }
    
    // هنا يمكنك إضافة كود لإرسال الأمر إلى البوت
    
    return res.json({ success: true, message: 'تم إرسال الأمر بنجاح' });
  } catch (error) {
    console.error('خطأ في إرسال الأمر:', error);
    return res.status(500).json({ success: false, message: 'حدث خطأ في إرسال الأمر' });
  }
});

// معالجة طلبات الدفع بنجوم تلجرام
router.post('/payment-webhook', async (req, res) => {
  try {
    const paymentData = req.body;
    
    console.log('[نظام دفع تلجرام] استلام طلب:', JSON.stringify(paymentData));
    
    // التحقق من نوع التحديث
    if (paymentData.message) {
      console.log('[نظام دفع تلجرام] تم التعرف على تحديث بوت تلجرام');
      
      // استخراج معلومات الرسالة
      const { message } = paymentData;
      const chatId = message.chat.id;
      const userId = message.from.id;
      const messageText = message.text || 'بدون نص';
      
      // تسجيل الرسالة
      console.log(`[نظام دفع تلجرام] رسالة من المستخدم ${userId}: ${messageText}`);
      
      // إرسال رد على الرسالة
      let response = `تم استلام رسالتك: "${messageText}"\nشكرًا لتواصلك مع BinarJoin Analytics.`;
      
      if (messageText.startsWith('/start')) {
        response = `أهلاً بك في بوت BinarJoin Analytics! 👋\n\n`
          + `للاشتراك في خدماتنا المتميزة، يمكنك استخدام الأوامر التالية:\n`
          + `/plans - عرض خطط الاشتراك\n`
          + `/weekly - شراء الخطة الأسبوعية\n`
          + `/monthly - شراء الخطة الشهرية\n`
          + `/annual - شراء الخطة السنوية\n`
          + `/premium - شراء خطة BinarJoin V.4.1`;
      } else if (messageText.startsWith('/plans')) {
        response = `📋 خطط الاشتراك المتاحة:\n\n`
          + `🔸 الخطة الأسبوعية - 750 نجمة\n`
          + `🔸 الخطة الشهرية - 2300 نجمة\n`
          + `🔸 الخطة السنوية - 10000 نجمة\n`
          + `🔸 خطة BinarJoin V.4.1 - 18500 نجمة\n\n`
          + `للاشتراك في أي خطة، استخدم الأمر المناسب:\n`
          + `/weekly, /monthly, /annual, /premium`;
      } else if (messageText.startsWith('/weekly')) {
        response = `⭐ الخطة الأسبوعية - 750 نجمة\n\n`
          + `تتضمن هذه الخطة:\n`
          + `✅ تحليل أساسي للسوق\n`
          + `✅ إشارات التداول الأساسية\n`
          + `✅ تنبيهات السعر\n`
          + `✅ التحديثات اليومية\n\n`
          + `للاشتراك، سيتم قريباً إرسال فاتورة دفع بالنجوم.`;
      } else if (messageText.startsWith('/monthly')) {
        response = `⭐ الخطة الشهرية - 2300 نجمة\n\n`
          + `تتضمن هذه الخطة:\n`
          + `✅ كل مميزات الخطة الأسبوعية\n`
          + `✅ تحليل فني متقدم\n`
          + `✅ مؤشرات فنية خاصة\n`
          + `✅ تنبيهات متقدمة\n`
          + `✅ دعم فني متميز\n\n`
          + `للاشتراك، سيتم قريباً إرسال فاتورة دفع بالنجوم.`;
      } else if (messageText.startsWith('/annual')) {
        response = `⭐ الخطة السنوية - 10000 نجمة\n\n`
          + `تتضمن هذه الخطة:\n`
          + `✅ كل مميزات الخطة الشهرية\n`
          + `✅ تحليل بالذكاء الاصطناعي\n`
          + `✅ استراتيجيات مخصصة\n`
          + `✅ إشارات حصرية\n`
          + `✅ دعم على مدار الساعة\n`
          + `✅ جلسات استشارية شهرية\n\n`
          + `للاشتراك، سيتم قريباً إرسال فاتورة دفع بالنجوم.`;
      } else if (messageText.startsWith('/premium')) {
        response = `⭐ خطة BinarJoin V.4.1 - 18500 نجمة\n\n`
          + `تتضمن هذه الخطة:\n`
          + `✅ إصدار الذكاء الاصطناعي المتطور\n`
          + `✅ دقة عالية في الإشارات (95%+)\n`
          + `✅ تحليل فوري للتغيرات السوقية\n`
          + `✅ إشارات حصرية غير متاحة في باقي الخطط\n`
          + `✅ دعم VIP على مدار الساعة\n`
          + `✅ استشارات خاصة أسبوعية\n`
          + `✅ وصول حصري لاستراتيجيات متقدمة\n\n`
          + `للاشتراك، سيتم قريباً إرسال فاتورة دفع بالنجوم.`;
      }
      
      // محاكاة إرسال رد للمستخدم
      // في التطبيق الفعلي، هنا سنستخدم API تلجرام لإرسال الرد
      const sendResult = true;
      console.log(`[نظام دفع تلجرام] تم إرسال الرد بنجاح: ${sendResult}`);
      
      return res.json({ success: true, response });
    }
    
    else if (paymentData.payment) {
      // معالجة معلومات الدفع
      const { payment } = paymentData;
      console.log(`[نظام دفع تلجرام] تلقي دفع: ${JSON.stringify(payment)}`);
      
      // تحديث حالة الاشتراك
      // هنا يمكنك إضافة منطق تحديث حالة المستخدم في قاعدة البيانات
      
      return res.json({ success: true, message: 'تم معالجة معلومات الدفع بنجاح' });
    }
    
    return res.json({ success: true, message: 'تم استلام التحديث' });
  } catch (error) {
    console.error('خطأ في معالجة webhook:', error);
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء معالجة التحديث' });
  }
});

// تشغيل بوت تلجرام للدفع بالنجوم
router.post('/start-bot', async (req, res) => {
  try {
    const botPath = path.join(__dirname, '../telegram_stars_bot.py');
    
    // التحقق من وجود الملف
    if (!fs.existsSync(botPath)) {
      return res.status(404).json({ success: false, message: 'ملف بوت تلجرام غير موجود' });
    }
    
    // تشغيل البوت
    const process = exec(`python ${botPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`خطأ في تشغيل البوت: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`مخرجات خطأ البوت: ${stderr}`);
        return;
      }
      console.log(`مخرجات البوت: ${stdout}`);
    });
    
    return res.json({ success: true, message: 'تم بدء تشغيل بوت تلجرام بنجاح' });
  } catch (error) {
    console.error('خطأ في تشغيل بوت تلجرام:', error);
    return res.status(500).json({ success: false, message: 'حدث خطأ في تشغيل بوت تلجرام' });
  }
});

// الحصول على حالة البوت
router.get('/bot-status', (req, res) => {
  // هنا يمكنك إضافة منطق للتحقق من حالة البوت
  return res.json({ success: true, status: 'running', message: 'بوت تلجرام يعمل بنجاح' });
});

export default router;
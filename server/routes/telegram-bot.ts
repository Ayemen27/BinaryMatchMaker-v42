import { Router } from 'express';

// إنشاء موجه للتعامل مع مسارات بوت تلجرام
const router = Router();

/**
 * نقطة نهاية لاستقبال تحديثات بوت تلجرام
 */
router.post('/webhook', async (req, res) => {
  try {
    // استجابة سريعة لتلجرام بأن الطلب تم استلامه
    res.status(200).send("OK");
    
    console.log('[بوت تلجرام] استلام تحديث جديد');
    
    // طباعة البيانات المستلمة للتشخيص
    if (req.body) {
      console.log('[بوت تلجرام] محتوى الطلب:');
      console.log(JSON.stringify(req.body, null, 2).substring(0, 500));
    }
    
    // إذا كانت هناك رسالة في التحديث
    if (req.body && req.body.message) {
      const message = req.body.message;
      const chatId = message.chat?.id;
      const text = message.text || '';
      
      console.log(`[بوت تلجرام] رسالة من ${chatId}: ${text}`);
      
      // إرسال رد بسيط إلى المستخدم
      if (chatId) {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        
        if (botToken) {
          setTimeout(() => {
            fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `تم استلام رسالتك: "${text}"\nشكرًا لتواصلك معنا.`
              })
            })
            .then(response => response.json())
            .then(data => {
              console.log('[بوت تلجرام] تم إرسال الرد بنجاح:', data.ok);
            })
            .catch(error => {
              console.error('[بوت تلجرام] فشل في إرسال الرد:', error);
            });
          }, 500); // تأخير بسيط لضمان استجابة سريعة للويب هوك أولاً
        }
      }
    }
  } catch (error) {
    console.error('[بوت تلجرام] خطأ في معالجة تحديث البوت:', error);
    // لا نرسل استجابة خطأ هنا لأننا سبق وأرسلنا استجابة 200 OK
  }
});

/**
 * نقطة نهاية للتحقق من حالة البوت
 */
router.get('/status', async (req, res) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      return res.status(500).json({
        success: false,
        message: 'لم يتم تكوين توكن البوت'
      });
    }
    
    // جلب معلومات البوت من تلجرام
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await response.json();
    
    if (data.ok) {
      // جلب معلومات الويب هوك
      const webhookResponse = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
      const webhookData = await webhookResponse.json();
      
      return res.json({
        success: true,
        bot: {
          id: data.result.id,
          username: data.result.username,
          first_name: data.result.first_name
        },
        webhook: webhookData.ok ? webhookData.result : null
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'فشل في الاتصال ببوت تلجرام',
      error: data.description
    });
  } catch (error) {
    console.error('[بوت تلجرام] خطأ في التحقق من حالة البوت:', error);
    
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء التحقق من حالة البوت'
    });
  }
});

/**
 * نقطة نهاية لإعادة تعيين الويب هوك
 */
router.post('/reset-webhook', async (req, res) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    // استخدام المتغير البيئي الجديد أو القيمة المقدمة في الطلب أو القيمة الافتراضية
    const baseUrl = req.body.baseUrl || process.env.TELEGRAM_WEBHOOK_URL || 'https://d3069587-0c8f-49bd-9cc4-74d6904d29a8-00-3k7bgesw6ce81.sisko.replit.dev';
    
    if (!botToken) {
      return res.status(500).json({
        success: false,
        message: 'لم يتم تكوين توكن البوت'
      });
    }
    
    // حذف الويب هوك الحالي
    const deleteResponse = await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
    const deleteData = await deleteResponse.json();
    
    if (!deleteData.ok) {
      return res.status(500).json({
        success: false,
        message: 'فشل في حذف الويب هوك الحالي',
        error: deleteData.description
      });
    }
    
    // إعادة تعيين الويب هوك
    const webhookUrl = `${baseUrl}/api/telegram-bot/webhook`;
    console.log(`[بوت تلجرام] تعيين الويب هوك على الرابط: ${webhookUrl}`);
    const setResponse = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
    const setData = await setResponse.json();
    
    if (setData.ok) {
      return res.json({
        success: true,
        message: 'تم إعادة تعيين الويب هوك بنجاح',
        webhook: {
          url: webhookUrl,
          result: setData.result
        }
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'فشل في تعيين الويب هوك',
      error: setData.description
    });
  } catch (error) {
    console.error('[بوت تلجرام] خطأ في إعادة تعيين الويب هوك:', error);
    
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إعادة تعيين الويب هوك'
    });
  }
});

export default router;
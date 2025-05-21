import express from 'express';
import { TelegramPaymentService } from './telegram-payment';

// التحقق من بيئة التشغيل
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * خدمة بوت تلجرام للتعامل مع مدفوعات النجوم
 * تستخدم webhook للتواصل مع API تلجرام
 */
export class TelegramBotService {
  private botToken: string;
  private botUsername: string = 'Payment_gateway_Binar_bot'; // اسم بوت الدفع الصحيح
  private webhookPath: string = '/api/telegram-payments/webhook';
  
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    if (!this.botToken) {
      console.error('[خدمة البوت] خطأ: مفتاح بوت تلجرام غير متوفر في المتغيرات البيئية');
    }
  }
  
  /**
   * إضافة مسارات webhook للبوت إلى التطبيق
   * تستخدم webhook فقط (بدون polling) للعمل على منفذ واحد مع التطبيق
   */
  public registerWebhook(app: express.Application, baseUrl: string): void {
    // التأكد من وجود مفتاح البوت
    if (!this.botToken) {
      console.error('[خدمة البوت] لم يتم تسجيل webhook بسبب عدم توفر مفتاح البوت');
      return;
    }
    
    console.log(`[خدمة البوت] تسجيل webhook في المسار: ${this.webhookPath}`);
    console.log(`[خدمة البوت] استخدام URL الأساسي: ${baseUrl}`);
    
    // محاولة تسجيل webhook مع تلجرام (هذا هو الحل 1 - استخدام webhook بدلاً من polling)
    this.setWebhook(`${baseUrl}${this.webhookPath}`).then(success => {
      if (success) {
        console.log('[خدمة البوت] تم تسجيل webhook بنجاح مع API تلجرام');
      } else {
        console.error('[خدمة البوت] فشل في تسجيل webhook مع API تلجرام - يرجى التحقق من توكن البوت والإنترنت');
      }
    });
    
    // إضافة مسار webhook للتعامل مع التحديثات القادمة من تلجرام
    app.post(this.webhookPath, express.json(), async (req, res) => {
      try {
        // التحقق من مصدر الطلب (يمكن إضافة طبقة أمان إضافية هنا)
        const update = req.body;
        
        console.log('[خدمة البوت] تم استلام تحديث من تلجرام:', 
          JSON.stringify(update, null, 2).substring(0, 200) + '...');
        
        // معالجة التحديث
        await this.handleUpdate(update);
        
        // إرجاع استجابة فورية إلى تلجرام
        res.sendStatus(200);
      } catch (error) {
        console.error('[خدمة البوت] خطأ في معالجة تحديث تلجرام:', error);
        res.sendStatus(500);
      }
    });
    
    // إضافة مسار للاختبار في بيئة التطوير
    if (isDevelopment) {
      app.get('/api/telegram/test', (req, res) => {
        res.json({
          status: 'success',
          message: 'خدمة بوت تلجرام تعمل بشكل صحيح في وضع التطوير',
          botUsername: this.botUsername,
          webhookPath: this.webhookPath
        });
      });
      
      // إضافة مسار لمحاكاة تحديثات تلجرام (للاختبار في بيئة التطوير)
      app.post('/api/telegram/simulate', express.json(), async (req, res) => {
        try {
          const simulatedUpdate = req.body;
          console.log('[خدمة البوت] محاكاة تحديث تلجرام:', JSON.stringify(simulatedUpdate, null, 2));
          
          // معالجة التحديث المحاكي
          await this.handleUpdate(simulatedUpdate);
          
          res.json({
            status: 'success',
            message: 'تمت معالجة التحديث المحاكي بنجاح'
          });
        } catch (error) {
          console.error('[خدمة البوت] خطأ في معالجة التحديث المحاكي:', error);
          res.status(500).json({
            status: 'error',
            message: 'فشل في معالجة التحديث المحاكي'
          });
        }
      });
    }
  }
  
  /**
   * تسجيل webhook مع تلجرام API
   */
  private async setWebhook(url: string): Promise<boolean> {
    try {
      const apiUrl = `https://api.telegram.org/bot${this.botToken}/setWebhook?url=${encodeURIComponent(url)}`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data.ok) {
        console.log('[خدمة البوت] تم تسجيل webhook بنجاح:', data.result);
        return true;
      } else {
        console.error('[خدمة البوت] فشل في تسجيل webhook:', data.description);
        return false;
      }
    } catch (error) {
      console.error('[خدمة البوت] خطأ أثناء تسجيل webhook:', error);
      return false;
    }
  }
  
  /**
   * معالجة تحديثات تلجرام الواردة
   */
  private async handleUpdate(update: any): Promise<void> {
    // التحقق من وجود رسالة
    if (!update.message) {
      console.log('[خدمة البوت] تحديث بدون رسالة، تجاهل');
      return;
    }
    
    const message = update.message;
    const chatId = message.chat.id;
    const text = message.text || '';
    
    // معالجة أوامر البوت
    if (text.startsWith('/')) {
      await this.handleCommand(chatId, text, message.from);
    } else {
      // للرسائل العادية، نرسل رسالة مساعدة
      await this.sendHelpMessage(chatId);
    }
  }
  
  /**
   * معالجة أوامر البوت
   */
  private async handleCommand(chatId: number, command: string, user?: any): Promise<void> {
    console.log(`[خدمة البوت] معالجة الأمر: ${command} من المستخدم:`, user?.id);
    
    // تقسيم الأمر والمعلمات
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    
    switch (cmd) {
      case '/start':
        // التحقق مما إذا كان هناك معلمات إضافية في أمر البدء (مثلاً: /start pay_weekly_750)
        if (parts.length > 1 && parts[1].startsWith('pay_')) {
          // استخراج معلومات الدفع من المعلمة
          const paymentInfo = parts[1].substring(4); // إزالة 'pay_' من البداية
          const paymentParts = paymentInfo.split('_');
          
          if (paymentParts.length >= 2) {
            const planType = paymentParts[0];
            const starsAmount = parseInt(paymentParts[1], 10);
            
            // التحقق من صحة المعلمات
            if (this.isValidPlan(planType) && !isNaN(starsAmount) && starsAmount > 0) {
              // إظهار معلومات الدفع مباشرة
              await this.sendMessage(chatId, 
                `🌟 طلب الدفع بنجوم تلجرام 🌟\n\n` +
                `📦 الخطة: ${this.getPlanDisplayName(planType)}\n` +
                `⭐ عدد النجوم المطلوبة: ${starsAmount}\n\n` +
                `للمتابعة، يرجى استخدام الأمر التالي للدفع:\n` +
                `/pay ${planType} ${starsAmount}`
              );
              return;
            }
          }
        }
        
        // الرسالة الافتراضية إذا لم تكن هناك معلمات أو كانت غير صالحة
        await this.sendMessage(chatId, 
          'مرحبًا بك في بوت الدفع الخاص بمنصة BinarJoinAnalytic! 👋\n\n' +
          'استخدم الأمر /pay لإتمام عملية الدفع بنجوم تلجرام.\n' +
          'مثال: /pay weekly 750'
        );
        break;
        
      case '/help':
        await this.sendHelpMessage(chatId);
        break;
        
      case '/pay':
        // معالجة أمر الدفع
        if (parts.length < 3) {
          await this.sendMessage(chatId, 
            '⚠️ يرجى استخدام الصيغة الصحيحة للأمر:\n' +
            '/pay <plan_type> <stars_amount>\n\n' +
            'مثال: /pay weekly 750'
          );
          return;
        }
        
        const planType = parts[1];
        const starsAmount = parseInt(parts[2], 10);
        
        // التحقق من صحة المعلمات
        if (!this.isValidPlan(planType) || isNaN(starsAmount) || starsAmount <= 0) {
          await this.sendMessage(chatId, 
            '⚠️ خطة غير صالحة أو قيمة نجوم غير صحيحة.\n' +
            'الخطط المتاحة: weekly, monthly, annual, premium\n' +
            'يجب أن تكون قيمة النجوم رقمًا موجبًا.'
          );
          return;
        }
        
        // معالجة الدفع
        await this.processPayment(chatId, planType, starsAmount, user);
        break;
        
      case '/status':
        // التحقق من حالة الاشتراك (إذا كان المستخدم مسجلاً)
        if (user && user.id) {
          await this.checkSubscriptionStatus(chatId, user.id);
        } else {
          await this.sendMessage(chatId, '⚠️ يجب أن تكون مسجلاً للتحقق من حالة الاشتراك.');
        }
        break;
        
      default:
        await this.sendMessage(chatId, '❓ أمر غير معروف. استخدم /help لعرض الأوامر المتاحة.');
    }
  }
  
  /**
   * إرسال رسالة مساعدة
   */
  private async sendHelpMessage(chatId: number): Promise<void> {
    await this.sendMessage(chatId, 
      '🌟 بوت الدفع الخاص بمنصة BinarJoinAnalytic 🌟\n\n' +
      'الأوامر المتاحة:\n' +
      '/start - بدء استخدام البوت\n' +
      '/help - عرض هذه الرسالة\n' +
      '/pay <plan_type> <stars_amount> - إتمام عملية الدفع\n' +
      '/status - التحقق من حالة الاشتراك\n\n' +
      'للدفع، استخدم الأمر التالي:\n' +
      '/pay weekly 750\n' +
      '/pay monthly 2300\n' +
      '/pay annual 10000\n' +
      '/pay premium 18500'
    );
  }
  
  /**
   * معالجة الدفع بالنجوم (باستخدام واجهة فواتير تليجرام)
   */
  private async processPayment(
    chatId: number, 
    planType: string, 
    starsAmount: number, 
    user?: any
  ): Promise<void> {
    if (!user || !user.id) {
      await this.sendMessage(chatId, '⚠️ لم يتم العثور على معلومات المستخدم.');
      return;
    }
    
    // إنشاء معرف فريد للمعاملة
    const paymentId = `tg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const telegramUserId = user.id.toString();
    
    try {
      // إعداد عناوين الخطط
      const planTitles: {[key: string]: string} = {
        'weekly': 'اشتراك أسبوعي',
        'monthly': 'اشتراك شهري',
        'annual': 'اشتراك سنوي',
        'premium': 'اشتراك بريميوم'
      };

      // إعداد وصف الخطط
      const planDescriptions: {[key: string]: string} = {
        'weekly': 'اشتراك أسبوعي في BinarJoin Analytics - تحليلات متقدمة وإشارات تداول لمدة أسبوع',
        'monthly': 'اشتراك شهري في BinarJoin Analytics - تحليلات متقدمة وإشارات تداول لمدة شهر',
        'annual': 'اشتراك سنوي في BinarJoin Analytics - تحليلات متقدمة وإشارات تداول لمدة سنة',
        'premium': 'اشتراك بريميوم في BinarJoin Analytics - جميع الميزات المتقدمة لمدة سنة'
      };
      
      // إنشاء فاتورة دفع بنجوم تليجرام
      const invoiceUrl = `https://api.telegram.org/bot${this.botToken}/sendInvoice`;
      
      // بيانات الفاتورة
      const invoiceData = {
        chat_id: chatId,
        title: planTitles[planType] || `اشتراك ${planType}`,
        description: planDescriptions[planType] || 'اشتراك في منصة BinarJoin Analytics للتحليلات المتقدمة',
        payload: `${paymentId}_${planType}_${telegramUserId}`,
        provider_token: this.botToken, // يمكن أن تحتاج إلى توكن مخصص للمدفوعات في الإنتاج
        currency: 'XTR', // عملة نجوم تليجرام
        prices: [
          {
            label: `اشتراك ${planType}`,
            amount: starsAmount
          }
        ],
        start_parameter: `payment_${planType}_${starsAmount}`
      };
      
      console.log('[خدمة البوت] محاولة إرسال فاتورة دفع:', JSON.stringify(invoiceData, null, 2).substring(0, 200));
      
      // إرسال فاتورة الدفع
      const response = await fetch(invoiceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData)
      });
      
      const result = await response.json();
      
      if (result.ok) {
        console.log('[خدمة البوت] تم إرسال فاتورة الدفع بنجاح:', result.result.message_id);
        
        // إرسال تعليمات إضافية
        await this.sendMessage(chatId, 
          '📋 تم إنشاء فاتورة الدفع أعلاه. يرجى إكمال عملية الدفع خلال الفاتورة.\n\n' +
          '✅ بعد إتمام الدفع، سيتم تفعيل اشتراكك تلقائيًا.'
        );
      } else {
        console.error('[خدمة البوت] فشل في إرسال فاتورة الدفع:', result);
        
        // استخدام طريقة الدفع التقليدية في حال فشل إرسال الفاتورة
        await this.legacyPaymentProcess(chatId, planType, starsAmount, user, paymentId);
      }
    } catch (error) {
      console.error('[خدمة البوت] خطأ في معالجة الدفع:', error);
      
      // استخدام طريقة الدفع التقليدية في حال حدوث خطأ
      await this.legacyPaymentProcess(chatId, planType, starsAmount, user, paymentId);
    }
  }
  
  /**
   * عملية الدفع التقليدية (احتياطية)
   */
  private async legacyPaymentProcess(
    chatId: number, 
    planType: string, 
    starsAmount: number, 
    user: any,
    paymentId: string
  ): Promise<void> {
    try {
      // إرسال رسالة قيد المعالجة
      await this.sendMessage(chatId, '⏳ جاري معالجة الدفع بالطريقة التقليدية...');
      
      const telegramUserId = user.id.toString();
      
      // محاولة العثور على المستخدم أو إنشاء حساب مؤقت له
      // هذا مجرد مثال، سيحتاج إلى تعديل وفقًا لمنطق التطبيق
      const userId = 1; // يفترض أن هناك حساب افتراضي للتجربة
      
      // الاتصال بخدمة الدفع
      const result = await TelegramPaymentService.processPayment({
        userId,
        plan: `${planType}_plan`, // تحويل النوع إلى الصيغة المتوافقة
        starsAmount,
        paymentId,
        telegramUserId
      });
      
      if (result && result.success) {
        // إرسال رسالة نجاح
        await this.sendMessage(chatId, 
          '✅ تم معالجة الدفع بنجاح!\n\n' +
          `🌟 خطة: ${this.getPlanDisplayName(planType)}\n` +
          `⭐ عدد النجوم: ${starsAmount}\n` +
          `📆 تاريخ الانتهاء: ${result.endDate.toLocaleDateString('ar-SA')}\n` +
          `🆔 معرف المعاملة: ${paymentId}\n\n` +
          '🚀 يمكنك الآن استخدام جميع ميزات الخطة التي اشتركت بها!'
        );
      } else {
        throw new Error('فشل في معالجة الدفع');
      }
    } catch (error) {
      console.error('[خدمة البوت] خطأ في معالجة الدفع التقليدي:', error);
      
      await this.sendMessage(chatId, 
        '❌ حدث خطأ أثناء معالجة الدفع. يرجى المحاولة مرة أخرى لاحقًا أو التواصل مع الدعم الفني.'
      );
    }
  }
  
  /**
   * التحقق من حالة الاشتراك
   */
  private async checkSubscriptionStatus(chatId: number, telegramUserId: number): Promise<void> {
    try {
      // هذا مجرد مثال، يجب تعديله وفقًا لمنطق التطبيق
      await this.sendMessage(chatId, 
        '🔍 للتحقق من حالة اشتراكك، يرجى زيارة الموقع على:\n\n' +
        'https://binarjoinanalytic.repl.co/dashboard'
      );
    } catch (error) {
      console.error('[خدمة البوت] خطأ في التحقق من حالة الاشتراك:', error);
      await this.sendMessage(chatId, '❌ حدث خطأ أثناء التحقق من حالة الاشتراك.');
    }
  }
  
  /**
   * إرسال رسالة إلى المستخدم
   */
  private async sendMessage(chatId: number, text: string): Promise<void> {
    try {
      console.log(`[خدمة البوت] محاولة إرسال رسالة إلى المستخدم ${chatId}: ${text.substring(0, 50)}...`);
      
      const apiUrl = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      console.log(`[خدمة البوت] استخدام API URL: ${apiUrl.split('/bot')[0]}/bot***`);
      
      const payload = {
        chat_id: chatId,
        text,
        parse_mode: 'HTML'
      };
      
      console.log(`[خدمة البوت] بيانات الرسالة:`, JSON.stringify(payload).substring(0, 100) + '...');
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.ok) {
        console.log(`[خدمة البوت] تم إرسال الرسالة بنجاح إلى المستخدم ${chatId}`);
      } else {
        console.error('[خدمة البوت] فشل في إرسال الرسالة:', data.description, data);
      }
    } catch (error) {
      console.error('[خدمة البوت] خطأ أثناء إرسال الرسالة:', error);
    }
  }
  
  /**
   * التحقق من صحة نوع الخطة
   */
  private isValidPlan(planType: string): boolean {
    const validPlans = ['weekly', 'monthly', 'annual', 'premium'];
    return validPlans.includes(planType.toLowerCase());
  }
  
  /**
   * الحصول على اسم العرض للخطة
   */
  private getPlanDisplayName(planType: string): string {
    switch (planType.toLowerCase()) {
      case 'weekly':
        return 'الخطة الأسبوعية';
      case 'monthly':
        return 'الخطة الشهرية';
      case 'annual':
        return 'الخطة السنوية';
      case 'premium':
        return 'الخطة المتميزة';
      default:
        return planType;
    }
  }
}
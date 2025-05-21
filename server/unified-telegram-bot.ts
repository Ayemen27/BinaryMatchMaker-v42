import express from 'express';
import { TelegramPaymentService } from './services/telegram-payment';

/**
 * نظام موحد لبوت التلجرام
 * يتضمن كل وظائف البوت في ملف واحد لسهولة الإدارة
 */
export class UnifiedTelegramBot {
  private botToken: string;
  private botUsername: string = 'Payment_gateway_Binar_bot';
  private webhookPath: string = '/api/telegram/webhook';
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  // الخطط المتاحة وأسعارها بالنجوم
  private plans = {
    weekly: { price: 750, title: 'الخطة الأسبوعية', description: 'تحليل أساسي للسوق في الوقت الحقيقي - صالح لمدة أسبوع واحد' },
    monthly: { price: 2300, title: 'الخطة الشهرية', description: 'تحليلات متقدمة وإشارات تداول - صالح لمدة شهر كامل' },
    annual: { price: 10000, title: 'الخطة السنوية', description: 'كل التحليلات المتقدمة والإشارات وأدوات التداول - صالح لمدة سنة كاملة' },
    premium: { price: 18500, title: 'الخطة المتميزة', description: 'أعلى مستوى من التحليلات والإشارات مع دعم VIP - صالح لمدة سنة كاملة' }
  };
  
  // قائمة المعاملات قيد المعالجة للتتبع
  private pendingPayments: Map<string, {
    userId: number;
    telegramId: number;
    plan: string;
    amount: number;
    timestamp: number;
    processed: boolean;
  }> = new Map();
  
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    if (!this.botToken) {
      console.error('[بوت تلجرام] خطأ: لم يتم تعيين توكن البوت في المتغيرات البيئية');
    }
    
    // إعداد تنظيف دوري للدفعات المعلقة
    setInterval(() => this.cleanupPendingPayments(), 3600000); // كل ساعة
  }
  
  /**
   * تسجيل مسارات البوت في تطبيق الإكسبرس
   */
  public registerWebhook(app: express.Application, baseUrl: string): void {
    if (!this.botToken) {
      console.error('[بوت تلجرام] فشل تسجيل webhook: توكن البوت غير متاح');
      return;
    }
    
    console.log(`[بوت تلجرام] تسجيل webhook على المسار: ${this.webhookPath}`);
    
    // تسجيل webhook مع واجهة برمجة تلجرام
    this.setWebhook(`${baseUrl}${this.webhookPath}`);
    
    // مسار استقبال التحديثات من تلجرام
    app.post(this.webhookPath, express.json(), async (req, res) => {
      try {
        console.log('[بوت تلجرام] استلام تحديث جديد:', JSON.stringify(req.body).substring(0, 200));
        
        // إرسال استجابة فورية (200 OK) لمنع إعادة المحاولة من تلجرام
        res.sendStatus(200);
        
        // معالجة التحديث
        await this.handleUpdate(req.body);
      } catch (error) {
        console.error('[بوت تلجرام] خطأ في معالجة التحديث:', error);
      }
    });
    
    // مسار للتحقق من حالة البوت
    app.get('/api/telegram/status', async (req, res) => {
      try {
        const response = await fetch(`https://api.telegram.org/bot${this.botToken}/getMe`);
        const data = await response.json();
        
        if (data.ok) {
          res.json({
            status: 'online',
            username: data.result.username,
            pendingPayments: this.pendingPayments.size
          });
        } else {
          res.status(500).json({ status: 'error', message: data.description });
        }
      } catch (error) {
        res.status(500).json({ status: 'error', message: 'فشل الاتصال بـ API تلجرام' });
      }
    });
    
    // مسار لتسجيل الدفعات المكتملة
    app.post('/api/telegram/payment/complete', express.json(), async (req, res) => {
      try {
        const { paymentId, telegramUserId, success } = req.body;
        
        if (!paymentId || !telegramUserId) {
          return res.status(400).json({ success: false, message: 'معلومات غير كاملة' });
        }
        
        // البحث عن الدفعة في القائمة
        const payment = this.pendingPayments.get(paymentId);
        
        if (!payment) {
          return res.status(404).json({ success: false, message: 'لم يتم العثور على الدفعة' });
        }
        
        if (success) {
          // تحديث حالة الدفعة
          payment.processed = true;
          this.pendingPayments.set(paymentId, payment);
          
          // إرسال رسالة تأكيد للمستخدم
          this.sendMessage(payment.telegramId, 
            `✅ تم تأكيد الدفع بنجاح!\n\n` +
            `🌟 الخطة: ${this.getPlanDisplayName(payment.plan)}\n` +
            `⭐ عدد النجوم: ${payment.amount}\n` +
            `📆 تاريخ التفعيل: ${new Date().toLocaleDateString('ar-SA')}\n\n` +
            `🚀 تم تفعيل اشتراكك بنجاح! استمتع بجميع ميزات المنصة.`
          );
          
          res.json({ success: true, message: 'تم تأكيد الدفع بنجاح' });
        } else {
          // إرسال رسالة فشل للمستخدم
          this.sendMessage(payment.telegramId, 
            `❌ لم يتم العثور على دفعة مكتملة.\n\n` +
            `يرجى التأكد من إرسال ${payment.amount} نجمة إلى البوت واتباع التعليمات المذكورة سابقاً.\n\n` +
            `للمساعدة، استخدم الأمر /help أو تواصل مع فريق الدعم.`
          );
          
          res.json({ success: false, message: 'لم يتم العثور على دفعة مكتملة' });
        }
      } catch (error) {
        console.error('[بوت تلجرام] خطأ في تأكيد الدفع:', error);
        res.status(500).json({ success: false, message: 'خطأ داخلي في الخادم' });
      }
    });
  }
  
  /**
   * تسجيل webhook مع API تلجرام
   */
  private async setWebhook(url: string): Promise<boolean> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/setWebhook?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      
      if (data.ok) {
        console.log('[بوت تلجرام] تم تسجيل webhook بنجاح');
        return true;
      } else {
        console.error('[بوت تلجرام] فشل في تسجيل webhook:', data.description);
        return false;
      }
    } catch (error) {
      console.error('[بوت تلجرام] خطأ في تسجيل webhook:', error);
      return false;
    }
  }
  
  /**
   * معالجة التحديثات الواردة من تلجرام
   */
  private async handleUpdate(update: any): Promise<void> {
    // التعامل مع الرسائل
    if (update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const userId = message.from.id;
      const text = message.text || '';
      
      console.log(`[بوت تلجرام] رسالة من المستخدم ${userId}: ${text}`);
      
      // التعامل مع الأوامر
      if (text.startsWith('/')) {
        await this.handleCommand(chatId, userId, text);
      } else {
        // الرسائل العادية
        await this.sendHelpMessage(chatId);
      }
    }
    
    // التعامل مع تحديثات الدفع
    if (update.pre_checkout_query) {
      await this.handlePreCheckout(update.pre_checkout_query);
    }
    
    // التعامل مع تأكيدات الدفع الناجحة
    if (update.message && update.message.successful_payment) {
      await this.handleSuccessfulPayment(update.message);
    }
  }
  
  /**
   * معالجة أوامر البوت
   */
  private async handleCommand(chatId: number, userId: number, command: string): Promise<void> {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    
    switch (cmd) {
      case '/start':
        // التعامل مع معلمات في أمر البدء
        if (parts.length > 1) {
          if (parts[1].startsWith('pay_')) {
            // أمر البدء مع معلومات الدفع
            const payInfo = parts[1].substring(4).split('_');
            if (payInfo.length >= 2) {
              const planType = payInfo[0];
              const amount = parseInt(payInfo[1], 10);
              await this.showPaymentInstructions(chatId, userId, planType, amount);
              return;
            }
          } else if (parts[1].startsWith('donate_')) {
            // أمر البدء مع طلب تبرع/دفع
            const donateInfo = parts[1].substring(7).split('_');
            if (donateInfo.length >= 2) {
              const amount = parseInt(donateInfo[0], 10);
              const planType = donateInfo[1];
              await this.showDonationInstructions(chatId, userId, planType, amount);
              return;
            }
          }
        }
        
        // رسالة الترحيب الافتراضية
        await this.sendMessage(chatId, 
          '👋 مرحباً بك في بوت الدفع الخاص بمنصة BinarJoin Analytics!\n\n' +
          '🌟 يمكنك استخدام هذا البوت لشراء اشتراك في المنصة باستخدام نجوم تلجرام.\n\n' +
          '📋 الأوامر المتاحة:\n' +
          '/weekly - شراء الخطة الأسبوعية (750 نجمة)\n' +
          '/monthly - شراء الخطة الشهرية (2300 نجمة)\n' +
          '/annual - شراء الخطة السنوية (10000 نجمة)\n' +
          '/premium - شراء الخطة المتميزة (18500 نجمة)\n' +
          '/help - عرض المساعدة والتعليمات\n' +
          '/status - التحقق من حالة اشتراكك الحالي'
        );
        break;
      
      case '/help':
        await this.sendHelpMessage(chatId);
        break;
      
      case '/status':
        await this.checkSubscriptionStatus(chatId, userId);
        break;
      
      case '/pay':
        // معالجة أمر الدفع المخصص
        if (parts.length < 3) {
          await this.sendMessage(chatId, 
            '⚠️ صيغة الأمر غير صحيحة.\n' +
            'الصيغة الصحيحة: /pay <نوع_الخطة> <عدد_النجوم>\n\n' +
            'مثال: /pay weekly 750'
          );
          return;
        }
        
        const planType = parts[1];
        const amount = parseInt(parts[2], 10);
        
        if (!this.isValidPlan(planType) || isNaN(amount) || amount <= 0) {
          await this.sendMessage(chatId, 
            '⚠️ الخطة أو قيمة النجوم غير صالحة.\n\n' +
            'الخطط المتاحة: weekly, monthly, annual, premium\n' +
            'يجب أن تكون قيمة النجوم رقماً موجباً.'
          );
          return;
        }
        
        await this.processDirectPayment(chatId, userId, planType, amount);
        break;
      
      case '/weekly':
        // شراء الخطة الأسبوعية
        await this.processStandardPlan(chatId, userId, 'weekly');
        break;
      
      case '/monthly':
        // شراء الخطة الشهرية
        await this.processStandardPlan(chatId, userId, 'monthly');
        break;
      
      case '/annual':
        // شراء الخطة السنوية
        await this.processStandardPlan(chatId, userId, 'annual');
        break;
      
      case '/premium':
        // شراء الخطة المتميزة
        await this.processStandardPlan(chatId, userId, 'premium');
        break;
      
      default:
        await this.sendMessage(chatId, 
          '⚠️ أمر غير معروف.\n' +
          'استخدم /help لعرض قائمة الأوامر المتاحة.'
        );
    }
  }
  
  /**
   * معالجة طلب شراء خطة قياسية
   */
  private async processStandardPlan(chatId: number, userId: number, planType: string): Promise<void> {
    if (!this.isValidPlan(planType)) {
      await this.sendMessage(chatId, '⚠️ نوع الخطة غير صالح.');
      return;
    }
    
    const plan = this.plans[planType as keyof typeof this.plans];
    if (!plan) {
      await this.sendMessage(chatId, '⚠️ الخطة غير متوفرة حالياً.');
      return;
    }
    
    // إصدار فاتورة دفع
    await this.createPaymentInvoice(chatId, userId, planType, plan.price);
  }
  
  /**
   * إنشاء فاتورة دفع
   */
  private async createPaymentInvoice(
    chatId: number, 
    userId: number, 
    planType: string, 
    amount: number
  ): Promise<void> {
    try {
      const plan = this.plans[planType as keyof typeof this.plans];
      if (!plan) {
        throw new Error('خطة غير متوفرة');
      }
      
      // إنشاء معرف فريد للدفعة
      const paymentId = `pay_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      
      // تخزين معلومات الدفعة للتتبع
      this.pendingPayments.set(paymentId, {
        userId: userId,
        telegramId: chatId,
        plan: planType,
        amount: amount,
        timestamp: Date.now(),
        processed: false
      });
      
      // إعداد بيانات الفاتورة
      const invoiceData = {
        chat_id: chatId,
        title: plan.title,
        description: plan.description,
        payload: paymentId,
        currency: 'XTR',
        prices: [{ label: plan.title, amount: amount }]
      };
      
      // إرسال الفاتورة إلى تلجرام
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendInvoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      });
      
      const result = await response.json();
      console.log('[نظام دفع تلجرام] تم إرسال فاتورة الدفع بنجاح:', JSON.stringify(result));
      
      // إرسال تعليمات إضافية
      if (result.ok) {
        setTimeout(() => {
          this.sendMessage(chatId, 
            '📝 تعليمات الدفع:\n\n' +
            '1. انقر على زر "دفع" في الفاتورة أعلاه\n' +
            '2. اتبع الخطوات لإكمال عملية الدفع\n' +
            '3. سيتم تفعيل اشتراكك تلقائياً بعد اكتمال الدفع\n\n' +
            '🤔 تحتاج مساعدة؟ استخدم الأمر /help للحصول على مزيد من المعلومات.'
          );
        }, 1000);
      } else {
        // في حالة فشل إرسال الفاتورة، استخدام طريقة الدفع المباشر
        console.error('[نظام دفع تلجرام] فشل في إرسال الفاتورة:', result.description);
        await this.processDirectPayment(chatId, userId, planType, amount);
      }
    } catch (error) {
      console.error('[نظام دفع تلجرام] خطأ في إنشاء فاتورة الدفع:', error);
      await this.processDirectPayment(chatId, userId, planType, amount);
    }
  }
  
  /**
   * معالجة الدفع المباشر (بديل للفواتير)
   */
  private async processDirectPayment(
    chatId: number, 
    userId: number, 
    planType: string, 
    amount: number
  ): Promise<void> {
    try {
      // إنشاء معرف فريد للدفعة
      const paymentId = `direct_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      
      // تخزين معلومات الدفعة للتتبع
      this.pendingPayments.set(paymentId, {
        userId: userId,
        telegramId: chatId,
        plan: planType,
        amount: amount,
        timestamp: Date.now(),
        processed: false
      });
      
      // إرسال تعليمات الدفع المباشر
      await this.sendMessage(chatId, 
        `🌟 *طلب الدفع بنجوم تلجرام* 🌟\n\n` +
        `📦 الخطة: *${this.getPlanDisplayName(planType)}*\n` +
        `⭐ عدد النجوم المطلوبة: *${amount}*\n\n` +
        `للدفع بالنجوم، يرجى اتباع الخطوات التالية:\n\n` +
        `1. انقر على أيقونة النقاط الثلاث ⋮ في الزاوية العليا اليمنى\n` +
        `2. اختر "إرسال هدية"\n` +
        `3. حدد ${amount} نجمة\n` +
        `4. اضغط على "إرسال"\n\n` +
        `معرف العملية: ${paymentId}\n` +
        `(احتفظ بهذا المعرف للرجوع إليه لاحقاً)`
      );
      
      // إرسال رسالة متابعة
      setTimeout(() => {
        this.sendMessage(chatId, 
          `👉 بعد إرسال النجوم، يرجى إرسال صورة للشاشة تظهر اكتمال عملية الدفع.\n\n` +
          `⏱️ سيتم تفعيل اشتراكك خلال 24 ساعة بعد التحقق من الدفع.\n\n` +
          `🤔 تحتاج مساعدة؟ استخدم الأمر /help للحصول على دعم.`
        );
      }, 1500);
      
    } catch (error) {
      console.error('[نظام دفع تلجرام] خطأ في معالجة الدفع المباشر:', error);
      await this.sendMessage(chatId, 
        '❌ حدث خطأ أثناء معالجة طلب الدفع. يرجى المحاولة مرة أخرى لاحقاً أو التواصل مع الدعم الفني.'
      );
    }
  }
  
  /**
   * عرض تعليمات الدفع
   */
  private async showPaymentInstructions(
    chatId: number, 
    userId: number, 
    planType: string, 
    amount: number
  ): Promise<void> {
    if (!this.isValidPlan(planType) || isNaN(amount) || amount <= 0) {
      await this.sendMessage(chatId, '⚠️ معلومات غير صالحة. استخدم /help للحصول على المساعدة.');
      return;
    }
    
    await this.processDirectPayment(chatId, userId, planType, amount);
  }
  
  /**
   * عرض تعليمات التبرع
   */
  private async showDonationInstructions(
    chatId: number, 
    userId: number, 
    planType: string, 
    amount: number
  ): Promise<void> {
    if (!this.isValidPlan(planType) || isNaN(amount) || amount <= 0) {
      await this.sendMessage(chatId, '⚠️ معلومات غير صالحة. استخدم /help للحصول على المساعدة.');
      return;
    }
    
    await this.processDirectPayment(chatId, userId, planType, amount);
  }
  
  /**
   * معالجة طلب تحقق الدفع
   */
  private async handlePreCheckout(preCheckout: any): Promise<void> {
    try {
      const preCheckoutId = preCheckout.id;
      const userId = preCheckout.from.id;
      const payload = preCheckout.invoice_payload;
      
      console.log(`[نظام دفع تلجرام] طلب تحقق الدفع: ${preCheckoutId}, المستخدم: ${userId}, الحمولة: ${payload}`);
      
      // دائماً نوافق على طلبات التحقق
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/answerPreCheckoutQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pre_checkout_query_id: preCheckoutId,
          ok: true
        })
      });
      
      const result = await response.json();
      console.log('[نظام دفع تلجرام] نتيجة التحقق من الدفع:', result);
    } catch (error) {
      console.error('[نظام دفع تلجرام] خطأ في معالجة تحقق الدفع:', error);
    }
  }
  
  /**
   * معالجة الدفع الناجح
   */
  private async handleSuccessfulPayment(message: any): Promise<void> {
    try {
      const chatId = message.chat.id;
      const userId = message.from.id;
      const payment = message.successful_payment;
      const paymentId = payment.invoice_payload;
      
      console.log(`[نظام دفع تلجرام] دفع ناجح! المستخدم: ${userId}, الدفع: ${JSON.stringify(payment)}`);
      
      // البحث عن معلومات الدفعة
      const pendingPayment = this.pendingPayments.get(paymentId);
      
      if (pendingPayment) {
        // تحديث حالة الدفعة
        pendingPayment.processed = true;
        this.pendingPayments.set(paymentId, pendingPayment);
        
        // تحديث اشتراك المستخدم في قاعدة البيانات
        await this.processPaymentInDatabase(userId, pendingPayment.plan, pendingPayment.amount, paymentId);
        
        // إرسال رسالة تأكيد
        await this.sendMessage(chatId, 
          `✅ تم استلام الدفع بنجاح!\n\n` +
          `📦 الخطة: ${this.getPlanDisplayName(pendingPayment.plan)}\n` +
          `⭐ النجوم: ${pendingPayment.amount}\n` +
          `📅 تاريخ التفعيل: ${new Date().toLocaleDateString('ar-SA')}\n\n` +
          `🎉 تم تفعيل اشتراكك بنجاح. استمتع بجميع مميزات منصة BinarJoin Analytics!`
        );
      } else {
        // لم يتم العثور على معلومات الدفعة في السجلات
        console.warn(`[نظام دفع تلجرام] معرف دفعة غير معروف: ${paymentId}`);
        
        // إرسال رسالة غير مؤكدة
        await this.sendMessage(chatId, 
          `✅ تم استلام الدفع، وسيتم التحقق من المعلومات قريباً.\n\n` +
          `📝 معرف الدفعة: ${paymentId}\n` +
          `💰 القيمة: ${payment.total_amount} ${payment.currency}\n\n` +
          `⏱️ سيتم تفعيل اشتراكك خلال 24 ساعة بعد التحقق من المعلومات.`
        );
      }
    } catch (error) {
      console.error('[نظام دفع تلجرام] خطأ في معالجة الدفع الناجح:', error);
    }
  }
  
  /**
   * معالجة الدفع في قاعدة البيانات
   */
  private async processPaymentInDatabase(
    userId: number, 
    planType: string, 
    amount: number, 
    paymentId: string
  ): Promise<boolean> {
    try {
      // تحويل نوع الخطة إلى تنسيق قاعدة البيانات
      let plan = 'weekly_plan';
      if (planType === 'monthly') plan = 'monthly_plan';
      if (planType === 'annual') plan = 'annual_plan';
      if (planType === 'premium') plan = 'premium_plan';
      
      // استدعاء خدمة معالجة الدفع
      const result = await TelegramPaymentService.processPayment({
        userId: Number(userId),
        plan: plan as any,
        starsAmount: amount,
        paymentId,
        telegramUserId: userId.toString()
      });
      
      console.log('[نظام دفع تلجرام] نتيجة معالجة الدفع في قاعدة البيانات:', result);
      
      return result && result.success;
    } catch (error) {
      console.error('[نظام دفع تلجرام] خطأ في معالجة الدفع في قاعدة البيانات:', error);
      return false;
    }
  }
  
  /**
   * التحقق من حالة الاشتراك
   */
  private async checkSubscriptionStatus(chatId: number, userId: number): Promise<void> {
    try {
      // هنا يمكن إضافة استعلام لقاعدة البيانات للتحقق من حالة اشتراك المستخدم
      // ولكن للتبسيط، سنرسل رسالة عامة
      
      await this.sendMessage(chatId, 
        `📊 للتحقق من حالة اشتراكك الحالي، يرجى زيارة:\n\n` +
        `🔗 https://binarjoinanalytic.repl.co/dashboard\n\n` +
        `وتسجيل الدخول باستخدام حسابك.`
      );
    } catch (error) {
      console.error('[بوت تلجرام] خطأ في التحقق من حالة الاشتراك:', error);
      
      await this.sendMessage(chatId, 
        '❌ حدث خطأ أثناء التحقق من حالة اشتراكك. يرجى المحاولة مرة أخرى لاحقاً.'
      );
    }
  }
  
  /**
   * إرسال رسالة المساعدة
   */
  private async sendHelpMessage(chatId: number): Promise<void> {
    await this.sendMessage(chatId, 
      '🌟 مرحباً بك في بوت الدفع الخاص بمنصة BinarJoin Analytics! 🌟\n\n' +
      '📋 الأوامر المتاحة:\n' +
      '/start - بدء استخدام البوت\n' +
      '/weekly - شراء الخطة الأسبوعية (750 نجمة)\n' +
      '/monthly - شراء الخطة الشهرية (2300 نجمة)\n' +
      '/annual - شراء الخطة السنوية (10000 نجمة)\n' +
      '/premium - شراء الخطة المتميزة (18500 نجمة)\n' +
      '/pay <نوع_الخطة> <عدد_النجوم> - دفع مخصص\n' +
      '/status - التحقق من حالة اشتراكك\n' +
      '/help - عرض هذه الرسالة\n\n' +
      '💡 كيفية الدفع بالنجوم:\n' +
      '1. اختر إحدى الخطط باستخدام الأوامر أعلاه\n' +
      '2. اتبع التعليمات لإرسال النجوم المطلوبة\n' +
      '3. سيتم تفعيل اشتراكك تلقائياً بعد التحقق من الدفع\n\n' +
      '🤔 تحتاج مساعدة إضافية؟\n' +
      'يمكنك زيارة موقعنا: https://binarjoinanalytic.repl.co/support'
    );
  }
  
  /**
   * إرسال رسالة إلى المستخدم
   */
  private async sendMessage(chatId: number, text: string): Promise<boolean> {
    try {
      // تحقق إذا كان النص يحتوي على تنسيق ماركداون
      const containsMarkdown = text.includes('*') || text.includes('_') || text.includes('`') || text.includes('[');
      
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: containsMarkdown ? 'MarkdownV2' : 'HTML',
          disable_web_page_preview: false
        })
      });
      
      const data = await response.json();
      
      if (data.ok) {
        return true;
      } else {
        console.error('[بوت تلجرام] فشل في إرسال الرسالة:', data.description);
        
        // محاولة إرسال بدون تنسيق في حالة الفشل
        if (containsMarkdown) {
          const plainResponse = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text,
              parse_mode: ''
            })
          });
          
          const plainData = await plainResponse.json();
          return plainData.ok;
        }
        
        return false;
      }
    } catch (error) {
      console.error('[بوت تلجرام] خطأ في إرسال الرسالة:', error);
      return false;
    }
  }
  
  /**
   * التحقق من صحة نوع الخطة
   */
  private isValidPlan(planType: string): boolean {
    return ['weekly', 'monthly', 'annual', 'premium'].includes(planType.toLowerCase());
  }
  
  /**
   * الحصول على الاسم المعروض للخطة
   */
  private getPlanDisplayName(planType: string): string {
    switch (planType.toLowerCase()) {
      case 'weekly': return 'الخطة الأسبوعية';
      case 'monthly': return 'الخطة الشهرية';
      case 'annual': return 'الخطة السنوية';
      case 'premium': return 'الخطة المتميزة';
      default: return planType;
    }
  }
  
  /**
   * تنظيف الدفعات المعلقة القديمة (أكثر من 24 ساعة)
   */
  private cleanupPendingPayments(): void {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    let cleaned = 0;
    
    this.pendingPayments.forEach((payment, paymentId) => {
      // إزالة الدفعات القديمة المعالجة
      if (payment.processed && now - payment.timestamp > oneDayMs) {
        this.pendingPayments.delete(paymentId);
        cleaned++;
      }
      
      // إزالة الدفعات القديمة غير المعالجة (بعد 3 أيام)
      if (!payment.processed && now - payment.timestamp > 3 * oneDayMs) {
        this.pendingPayments.delete(paymentId);
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      console.log(`[نظام دفع تلجرام] تم تنظيف ${cleaned} دفعة معلقة قديمة`);
    }
  }
}
// تهيئة تطبيق تلجرام المصغر
document.addEventListener('DOMContentLoaded', function() {
  const tg = window.Telegram?.WebApp;
  
  // إعداد نظام التسجيل للأحداث
  function logEvent(category, action, data = {}) {
    console.log(`[${category}] ${action}`, data);
    
    // إرسال بيانات التتبع إلى التطبيق الرئيسي
    try {
      const eventElement = document.createElement('div');
      eventElement.className = 'telegram-event-log';
      eventElement.dataset.category = category;
      eventElement.dataset.action = action;
      eventElement.dataset.timestamp = Date.now();
      eventElement.dataset.data = JSON.stringify(data);
      eventElement.style.display = 'none';
      document.body.appendChild(eventElement);
    } catch (e) {
      console.error('فشل في تسجيل الحدث:', e);
    }
  }
  
  // تهيئة واجهة التطبيق المصغر
  function initTelegramMiniApp() {
    if (!tg) {
      // نحن لسنا في بيئة تطبيق تلجرام المصغر
      console.warn('تطبيق تلجرام المصغر غير متاح. قد تكون تتصفح الصفحة خارج تطبيق تلجرام.');
      document.body.classList.add('not-telegram-app');
      
      // إظهار رسالة للمستخدم
      const infoElement = document.getElementById('non-telegram-info');
      if (infoElement) {
        infoElement.style.display = 'block';
      }
      
      // تطبيق المظهر الافتراضي
      document.body.classList.add('light-theme');
      return false;
    }
    
    // إعلام تلجرام أن التطبيق جاهز
    tg.ready();
    
    // توسيع شاشة العرض
    tg.expand();
    
    // تطبيق المظهر المناسب
    if (tg.colorScheme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.add('light-theme');
    }
    
    // تحديث معلومات المستخدم في الواجهة
    updateUserInfo();
    
    // تسجيل الحدث
    logEvent('app', 'initialized', { 
      platform: tg.platform,
      version: tg.version,
      colorScheme: tg.colorScheme
    });
    
    return true;
  }
  
  // تحديث معلومات المستخدم
  function updateUserInfo() {
    if (!tg || !tg.initDataUnsafe || !tg.initDataUnsafe.user) {
      return;
    }
    
    const user = tg.initDataUnsafe.user;
    const userInfoElement = document.getElementById('user-info');
    
    if (userInfoElement) {
      userInfoElement.innerHTML = `
        <div class="user-avatar">
          <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.first_name)}&background=random" alt="${user.first_name}">
        </div>
        <div class="user-details">
          <div class="user-name">${user.first_name} ${user.last_name || ''}</div>
          ${user.username ? `<div class="user-username">@${user.username}</div>` : ''}
        </div>
      `;
    }
    
    logEvent('user', 'info_updated', { 
      user_id: user.id,
      username: user.username
    });
  }
  
  // إظهار النافذة المنبثقة مع تعبئة البيانات
  function showPaymentPopup(planType, starsAmount, planName, duration) {
    logEvent('popup', 'showing', { planType, starsAmount });
    
    // الحصول على معرف المستخدم إذا كان متاحًا
    let userId = 'غير مسجل';
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
      userId = tg.initDataUnsafe.user.id;
    }
    
    // تعبئة بيانات النافذة المنبثقة
    document.getElementById('popup-plan-name').textContent = planName || 'خطة الاشتراك';
    document.getElementById('popup-user-id').textContent = userId;
    document.getElementById('popup-plan-type').textContent = planType;
    document.getElementById('popup-duration').textContent = duration || 'شهر واحد';
    document.getElementById('stars-price').textContent = `${starsAmount} ★`;
    document.getElementById('usd-price').textContent = `$${Math.round(starsAmount * 0.05)}`;
    
    // إظهار النافذة المنبثقة
    const popup = document.getElementById('payment-popup');
    popup.classList.add('active');
    
    // تسجيل الحدث
    logEvent('popup', 'shown', { planType, starsAmount, userId });
  }
  
  // إخفاء النافذة المنبثقة
  function hidePaymentPopup() {
    const popup = document.getElementById('payment-popup');
    popup.classList.remove('active');
    logEvent('popup', 'hidden');
  }
  
  // معالجة النقر على زر الاشتراك لبدء عملية الدفع
  function handleSubscriptionClick(planType, starsAmount) {
    logEvent('subscription', 'button_clicked', { planType, starsAmount });
    
    // الحصول على معرف المستخدم إذا كان متاحًا
    let userId = 'guest';
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
      userId = tg.initDataUnsafe.user.id;
    }
    
    // إيجاد اسم الخطة
    const planCard = document.querySelector(`.plan-card[data-plan="${planType}"]`);
    let planName = 'خطة الاشتراك';
    let duration = 'شهر واحد';
    
    if (planCard) {
      const planTitleEl = planCard.querySelector('.plan-title');
      if (planTitleEl) {
        planName = planTitleEl.textContent;
      }
      
      // محاولة الحصول على مدة الاشتراك من وصف الخطة
      const planDescEl = planCard.querySelector('.plan-description');
      if (planDescEl) {
        const descText = planDescEl.textContent;
        if (descText.includes('شهر')) {
          duration = descText;
        }
      }
    }
    
    // إظهار النافذة المنبثقة مع بيانات الخطة
    showPaymentPopup(planType, starsAmount, planName, duration);
  }
  
  // معالجة تأكيد الدفع من النافذة المنبثقة
  function handlePaymentConfirmation() {
    // الحصول على المعلومات الضرورية
    const planType = document.getElementById('popup-plan-type').textContent;
    const starsAmount = parseInt(document.getElementById('stars-price').textContent);
    
    // الحصول على معرف المستخدم إذا كان متاحًا
    let userId = 'guest';
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
      userId = tg.initDataUnsafe.user.id;
    }
    
    // إنشاء معرف فريد للدفع
    const paymentId = `pay_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    
    // تخزين تفاصيل الطلب في التخزين المحلي للاستخدام اللاحق
    try {
      localStorage.setItem('pendingPayment', JSON.stringify({
        paymentId,
        planType,
        starsAmount,
        userId,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error('فشل في تخزين تفاصيل الدفع:', e);
    }
    
    // إنشاء معلمة البدء للبوت
    const startParam = `pay_${planType}_${starsAmount}_${userId}`;
    
    // فتح بوت الدفع
    const botUsername = 'Payment_gateway_Binar_bot';
    
    logEvent('payment', 'opening_bot', { 
      botUsername, 
      startParam,
      paymentId
    });
    
    // إخفاء النافذة المنبثقة
    hidePaymentPopup();
    
    // إظهار مؤشر التحميل
    document.getElementById('loading').classList.remove('hidden');
    
    // استخدام تلجرام لفتح رابط البوت إذا كان متاحًا
    if (tg && tg.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/${botUsername}?start=${startParam}`);
    } else {
      // احتياطيًا، فتح الرابط في نافذة جديدة
      window.open(`https://t.me/${botUsername}?start=${startParam}`, '_blank');
    }
    
    // إخفاء مؤشر التحميل بعد فترة قصيرة
    setTimeout(() => {
      document.getElementById('loading').classList.add('hidden');
    }, 3000);
  }
  
  // تسجيل مستمعات الأحداث لأزرار الاشتراك
  function setupSubscriptionButtons() {
    // إيجاد جميع أزرار الاشتراك
    const subscriptionButtons = document.querySelectorAll('.subscription-button');
    
    subscriptionButtons.forEach(button => {
      button.addEventListener('click', () => {
        const planType = button.dataset.plan;
        const starsAmount = parseInt(button.dataset.stars, 10);
        
        if (planType && starsAmount) {
          handleSubscriptionClick(planType, starsAmount);
        } else {
          console.error('بيانات الخطة أو النجوم مفقودة:', button.dataset);
        }
      });
    });
    
    logEvent('app', 'subscription_buttons_setup', { 
      buttonCount: subscriptionButtons.length 
    });
  }
  
  // تغيير العملة بين USD و STARS
  function setupCurrencyToggle() {
    const currencyToggle = document.getElementById('currency-toggle');
    
    if (currencyToggle) {
      currencyToggle.addEventListener('click', () => {
        document.body.classList.toggle('show-stars');
        document.body.classList.toggle('show-usd');
        
        const isShowingStars = document.body.classList.contains('show-stars');
        logEvent('ui', 'currency_toggled', { 
          currency: isShowingStars ? 'STARS' : 'USD' 
        });
        
        // تحديث نص الزر
        currencyToggle.textContent = isShowingStars 
          ? 'عرض الأسعار بالدولار'
          : 'عرض الأسعار بنجوم تلجرام';
      });
      
      // تعيين العملة الافتراضية (نجوم تلجرام)
      document.body.classList.add('show-stars');
      document.body.classList.remove('show-usd');
    }
  }
  
  // تبديل المظهر (فاتح / داكن)
  function setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        document.body.classList.toggle('light-theme');
        
        const isDarkTheme = document.body.classList.contains('dark-theme');
        logEvent('ui', 'theme_toggled', { 
          theme: isDarkTheme ? 'dark' : 'light' 
        });
        
        // تحديث نص الزر
        themeToggle.textContent = isDarkTheme 
          ? 'المظهر الفاتح'
          : 'المظهر الداكن';
      });
    }
  }
  
  // إعداد مستمعات الأحداث للنافذة المنبثقة
  function setupPopupEventListeners() {
    // زر إغلاق النافذة المنبثقة
    const closeBtn = document.getElementById('popup-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', hidePaymentPopup);
    }
    
    // زر تأكيد الدفع
    const confirmBtn = document.getElementById('confirm-payment-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', handlePaymentConfirmation);
    }
    
    // النقر على طرق الدفع للتبديل بينها
    const starsMethod = document.getElementById('stars-payment-method');
    const usdMethod = document.getElementById('usd-payment-method');
    
    if (starsMethod && usdMethod) {
      starsMethod.addEventListener('click', () => {
        starsMethod.classList.add('selected');
        usdMethod.classList.remove('selected');
        document.getElementById('confirm-payment-btn').textContent = 'تأكيد الدفع بالنجوم';
        logEvent('payment', 'method_selected', { method: 'stars' });
      });
      
      usdMethod.addEventListener('click', () => {
        usdMethod.classList.add('selected');
        starsMethod.classList.remove('selected');
        document.getElementById('confirm-payment-btn').textContent = 'تأكيد الدفع ببطاقة الائتمان';
        logEvent('payment', 'method_selected', { method: 'usd' });
      });
    }
    
    // إغلاق النافذة عند النقر خارجها
    const popup = document.getElementById('payment-popup');
    if (popup) {
      popup.addEventListener('click', (e) => {
        if (e.target === popup) {
          hidePaymentPopup();
        }
      });
    }
    
    logEvent('app', 'popup_listeners_setup');
  }
  
  // تحديث وظيفة إنشاء بطاقات الخطط لإضافة سمات البيانات
  function createPlanCards() {
    const plansContainer = document.getElementById('plans-container');
    if (!plansContainer) return;
    
    // تحديد الخطط المتاحة
    const plans = [
      {
        id: 'basic',
        title: 'الخطة الأساسية',
        description: 'اشتراك لمدة شهر واحد',
        stars: 250,
        features: [
          'الوصول إلى 5 إشارات يوميًا',
          'دقة تحليل 85%',
          'دعم أساسي عبر البوت'
        ],
        badge: null
      },
      {
        id: 'premium',
        title: 'الخطة المميزة',
        description: 'اشتراك لمدة 3 أشهر',
        stars: 650,
        features: [
          'الوصول إلى 20 إشارة يوميًا',
          'دقة تحليل 92%',
          'دعم متقدم على مدار الساعة',
          'تحليلات متقدمة للسوق'
        ],
        badge: 'popular-badge',
        badgeText: 'الأكثر طلبًا'
      },
      {
        id: 'vip',
        title: 'خطة VIP',
        description: 'اشتراك لمدة 6 أشهر',
        stars: 1200,
        features: [
          'إشارات غير محدودة',
          'دقة تحليل 95%+',
          'دعم شخصي مباشر',
          'تنبيهات فورية',
          'استراتيجيات تداول حصرية'
        ],
        badge: 'best-value-badge',
        badgeText: 'القيمة الأفضل'
      }
    ];
    
    // إنشاء بطاقات الخطط
    plans.forEach(plan => {
      const planCard = document.createElement('div');
      planCard.className = 'plan-card';
      planCard.setAttribute('data-plan', plan.id);
      
      // إضافة شارة إذا كانت موجودة
      if (plan.badge) {
        planCard.innerHTML += `
          <div class="badge ${plan.badge}">${plan.badgeText}</div>
        `;
      }
      
      // إضافة معلومات الخطة
      planCard.innerHTML += `
        <div class="plan-header">
          <h2 class="plan-title">${plan.title}</h2>
          <p class="plan-description">${plan.description}</p>
        </div>
        <div class="plan-price">
          <i class="fas fa-star"></i> ${plan.stars}
        </div>
        <div class="plan-features">
          <h3 class="features-title">المميزات</h3>
          <ul class="features-list">
            ${plan.features.map(feature => `<li>${feature}</li>`).join('')}
          </ul>
        </div>
        <div class="plan-footer">
          <button class="btn subscription-button" data-plan="${plan.id}" data-stars="${plan.stars}">
            اشترك الآن
          </button>
        </div>
      `;
      
      plansContainer.appendChild(planCard);
    });
    
    // إعداد مستمعات الأحداث لأزرار الاشتراك
    setupSubscriptionButtons();
    
    logEvent('app', 'plan_cards_created', { plansCount: plans.length });
  }
  
  // بدء التطبيق
  const isInTelegramApp = initTelegramMiniApp();
  
  // إنشاء بطاقات الخطط
  createPlanCards();
  
  // إعداد الوظائف الإضافية
  setupPopupEventListeners();
  setupCurrencyToggle();
  setupThemeToggle();
  
  // تصدير الدوال العامة للاستخدام العالمي
  window.telegramMiniApp = {
    logEvent,
    handleSubscriptionClick,
    showPaymentPopup,
    hidePaymentPopup
  };
  
  // تسجيل جاهزية التطبيق
  logEvent('app', 'ready', { 
    isInTelegramApp,
    timestamp: Date.now()
  });
});
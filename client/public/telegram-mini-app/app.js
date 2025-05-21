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
  
  // معالجة النقر على زر الاشتراك لبدء عملية الدفع
  function handleSubscriptionClick(planType, starsAmount) {
    logEvent('subscription', 'button_clicked', { planType, starsAmount });
    
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
    
    // استخدام تلجرام لفتح رابط البوت إذا كان متاحًا
    if (tg && tg.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/${botUsername}?start=${startParam}`);
    } else {
      // احتياطيًا، فتح الرابط في نافذة جديدة
      window.open(`https://t.me/${botUsername}?start=${startParam}`, '_blank');
    }
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
  
  // بدء التطبيق
  const isInTelegramApp = initTelegramMiniApp();
  setupSubscriptionButtons();
  setupCurrencyToggle();
  setupThemeToggle();
  
  // تصدير الدوال العامة للاستخدام العالمي
  window.telegramMiniApp = {
    logEvent,
    handleSubscriptionClick
  };
  
  // تسجيل جاهزية التطبيق
  logEvent('app', 'ready', { 
    isInTelegramApp,
    timestamp: Date.now()
  });
});
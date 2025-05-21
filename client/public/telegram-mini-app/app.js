// بيانات الخطط
const PLANS = {
  weekly_plan: {
    id: 'weekly_plan',
    title: 'الخطة الأسبوعية',
    description: 'تحليلات متقدمة وإشارات تداول لمدة أسبوع',
    price: 750,
    badge: null,
    features: [
      '10 إشارات يوميًا',
      'تحليل سوق الفوركس',
      'دعم الخيارات الثنائية',
      'تنبيهات أساسية'
    ]
  },
  monthly_plan: {
    id: 'monthly_plan',
    title: 'الخطة الشهرية',
    description: 'تحليلات متقدمة وإشارات تداول لمدة شهر',
    price: 2300,
    badge: { text: 'الأكثر شعبية', class: 'popular-badge' },
    features: [
      '25 إشارة يوميًا',
      'تحليل سوق الفوركس والعملات الرقمية',
      'دعم الخيارات الثنائية',
      'تنبيهات فورية',
      'تحليلات السوق الأسبوعية'
    ]
  },
  annual_plan: {
    id: 'annual_plan',
    title: 'الخطة السنوية',
    description: 'تحليلات متقدمة وإشارات تداول لمدة سنة',
    price: 10000,
    badge: { text: 'أفضل قيمة', class: 'best-value-badge' },
    features: [
      '50 إشارة يوميًا',
      'تحليل جميع الأسواق',
      'دعم الخيارات الثنائية والعقود',
      'تنبيهات فورية',
      'دعم فني على مدار الساعة',
      'تقارير تحليلية شهرية',
      'استراتيجيات متقدمة'
    ]
  },
  premium_plan: {
    id: 'premium_plan',
    title: 'الخطة المتميزة',
    description: 'جميع الميزات المتقدمة لمدة سنة',
    price: 18500,
    badge: null,
    features: [
      'إشارات غير محدودة',
      'تحليل متقدم لجميع الأسواق',
      'روبوت تداول آلي',
      'دعم فني مخصص',
      'تدريب شخصي',
      'استراتيجيات خاصة',
      'تقارير مخصصة',
      'مجتمع المتداولين المميزين'
    ]
  }
};

// المتغيرات العامة
let selectedPlan = null;
let telegramUser = null;
let telegramWebApp = null;
let isDarkMode = false;

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', () => {
  // محاولة الحصول على كائن Telegram.WebApp
  telegramWebApp = window.Telegram?.WebApp;
  
  // التحقق مما إذا كان التطبيق يعمل داخل تطبيق تلجرام
  if (telegramWebApp) {
    console.log('تم اكتشاف Telegram WebApp SDK');
    
    // إخبار تطبيق تلجرام أن التطبيق جاهز
    telegramWebApp.ready();
    
    // التحقق من وضع السمة (داكن أو فاتح)
    isDarkMode = telegramWebApp.colorScheme === 'dark';
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    }
    
    // استخراج معلومات المستخدم من كائن initDataUnsafe
    if (telegramWebApp.initDataUnsafe?.user) {
      telegramUser = telegramWebApp.initDataUnsafe.user;
      
      // عرض معلومات المستخدم
      displayUserInfo(telegramUser);
      console.log('تم استخراج معلومات المستخدم:', telegramUser);
    } else {
      console.warn('لم يتم العثور على معلومات المستخدم في WebApp');
    }
    
    // تكوين زر الرجوع لإخفائه
    telegramWebApp.BackButton.hide();
    
    // تكوين سلوك الزر الرئيسي
    telegramWebApp.MainButton.setParams({
      text: 'اختر خطة للاشتراك',
      color: telegramWebApp.themeParams.button_color || '#50a8eb',
      text_color: telegramWebApp.themeParams.button_text_color || '#ffffff',
      is_visible: false
    });
  } else {
    console.warn('Telegram WebApp SDK غير متاح. ربما التطبيق لا يعمل داخل تطبيق تلجرام.');
    
    // عرض تنبيه للمستخدم
    const container = document.querySelector('.container');
    const alert = document.createElement('div');
    alert.style.backgroundColor = '#fff3cd';
    alert.style.color = '#856404';
    alert.style.padding = '12px';
    alert.style.borderRadius = '8px';
    alert.style.marginBottom = '16px';
    alert.style.textAlign = 'center';
    alert.innerHTML = 'يرجى فتح هذه الصفحة من خلال تطبيق تلجرام للحصول على أفضل تجربة.';
    container.insertBefore(alert, container.firstChild);
  }
  
  // عرض بطاقات الخطط
  displayPlans();
});

// عرض معلومات المستخدم
function displayUserInfo(user) {
  const userInfoElement = document.getElementById('user-info');
  
  if (!user) {
    userInfoElement.style.display = 'none';
    return;
  }
  
  // إنشاء صورة المستخدم أو الحرف الأول من اسمه
  const firstLetter = user.first_name ? user.first_name.charAt(0).toUpperCase() : '?';
  
  // إعداد HTML لعرض معلومات المستخدم
  userInfoElement.innerHTML = `
    <div class="user-avatar">${firstLetter}</div>
    <div class="user-details">
      <p class="user-name">${user.first_name || ''} ${user.last_name || ''}</p>
      ${user.username ? `<p class="user-username">@${user.username}</p>` : ''}
    </div>
  `;
}

// عرض بطاقات الخطط
function displayPlans() {
  const plansContainer = document.getElementById('plans-container');
  
  // إنشاء HTML لكل خطة
  Object.values(PLANS).forEach(plan => {
    const planCard = document.createElement('div');
    planCard.className = 'plan-card';
    planCard.dataset.planId = plan.id;
    
    // إضافة شارة إذا كانت موجودة
    if (plan.badge) {
      planCard.innerHTML += `<div class="badge ${plan.badge.class}">${plan.badge.text}</div>`;
    }
    
    // إضافة معلومات الخطة
    planCard.innerHTML += `
      <div class="plan-header">
        <h3 class="plan-title">${plan.title}</h3>
        <p class="plan-description">${plan.description}</p>
      </div>
      <div class="plan-price">
        <i class="fas fa-star"></i> ${plan.price} نجمة
      </div>
      <div class="plan-features">
        <h4 class="features-title">المميزات:</h4>
        <ul class="features-list">
          ${plan.features.map(feature => `<li>${feature}</li>`).join('')}
        </ul>
      </div>
      <div class="plan-footer">
        <button class="btn" onclick="selectPlan('${plan.id}')">اختر هذه الخطة</button>
      </div>
    `;
    
    plansContainer.appendChild(planCard);
  });
}

// اختيار خطة
function selectPlan(planId) {
  const plan = PLANS[planId];
  if (!plan) return;
  
  // تحديث المتغير العام
  selectedPlan = planId;
  
  // إزالة التحديد من جميع البطاقات
  document.querySelectorAll('.plan-card').forEach(card => {
    card.classList.remove('selected');
    
    // تحديث نص الزر
    const button = card.querySelector('.btn');
    if (button) {
      button.textContent = 'اختر هذه الخطة';
      button.className = 'btn btn-outline';
    }
  });
  
  // تحديد البطاقة المختارة
  const selectedCard = document.querySelector(`.plan-card[data-plan-id="${planId}"]`);
  if (selectedCard) {
    selectedCard.classList.add('selected');
    
    // تحديث نص الزر
    const button = selectedCard.querySelector('.btn');
    if (button) {
      button.textContent = '✓ الخطة المختارة';
      button.className = 'btn';
    }
  }
  
  // تحديث الزر الرئيسي في تطبيق تلجرام
  if (telegramWebApp?.MainButton) {
    telegramWebApp.MainButton.setText(`الدفع (${plan.price} نجمة)`);
    telegramWebApp.MainButton.show();
    
    // تعيين السلوك عند النقر على الزر
    telegramWebApp.MainButton.onClick(handlePayment);
  } else {
    // في حالة عدم وجود SDK تلجرام، نعرض زر الدفع أسفل الصفحة
    let paymentButton = document.getElementById('payment-button');
    
    if (!paymentButton) {
      paymentButton = document.createElement('button');
      paymentButton.id = 'payment-button';
      paymentButton.className = 'btn';
      paymentButton.style.marginTop = '20px';
      paymentButton.style.display = 'block';
      paymentButton.style.width = '100%';
      document.querySelector('.container').appendChild(paymentButton);
    }
    
    paymentButton.textContent = `الدفع (${plan.price} نجمة)`;
    paymentButton.onclick = handlePayment;
  }
}

// معالجة عملية الدفع
function handlePayment() {
  if (!selectedPlan) {
    alert('الرجاء اختيار خطة أولاً');
    return;
  }
  
  const plan = PLANS[selectedPlan];
  
  // إظهار شاشة التحميل
  document.getElementById('loading').classList.remove('hidden');
  
  console.log('بدء معالجة الدفع للخطة:', selectedPlan);
  
  // إنشاء معرف فريد للدفع
  const paymentId = `tgmini_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  
  // تجهيز بيانات الدفع
  const paymentData = {
    action: 'process_stars_payment',
    paymentId,
    planId: selectedPlan,
    starsAmount: plan.price,
    timestamp: Date.now()
  };
  
  // إضافة معلومات المستخدم إذا كانت متاحة
  if (telegramUser) {
    paymentData.userId = telegramUser.id;
    paymentData.username = telegramUser.username;
    paymentData.firstName = telegramUser.first_name;
    paymentData.lastName = telegramUser.last_name;
  }
  
  console.log('بيانات الدفع:', paymentData);
  
  // إرسال البيانات إلى التطبيق الأم
  if (telegramWebApp) {
    try {
      // إرسال البيانات مباشرة إلى تطبيق تلجرام
      telegramWebApp.sendData(JSON.stringify(paymentData));
      console.log('تم إرسال بيانات الدفع بنجاح إلى تلجرام');
      
      // إخفاء شاشة التحميل بعد إرسال البيانات بنجاح
      setTimeout(() => {
        document.getElementById('loading').classList.add('hidden');
      }, 800);
    } catch (error) {
      console.error('خطأ في إرسال بيانات الدفع:', error);
      document.getElementById('loading').classList.add('hidden');
      
      if (telegramWebApp?.showAlert) {
        telegramWebApp.showAlert('حدث خطأ أثناء معالجة الدفع. يرجى المحاولة مرة أخرى.');
      } else {
        alert('حدث خطأ أثناء معالجة الدفع. يرجى المحاولة مرة أخرى.');
      }
    }
  } else {
    // محاكاة الدفع عندما نكون خارج تطبيق تلجرام
    console.log('محاكاة الدفع في وضع التجربة');
    
    setTimeout(() => {
      document.getElementById('loading').classList.add('hidden');
      alert(`تمت محاكاة الدفع بنجاح للخطة: ${plan.title}\nالمبلغ: ${plan.price} نجمة`);
    }, 1500);
  }
}
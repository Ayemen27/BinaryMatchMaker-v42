/**
 * نظام تتبع وتسجيل الأحداث المتعلقة بنظام الدفع
 * هذا النظام يقوم بتسجيل جميع الخطوات التي يقوم بها المستخدم
 * ويحفظها في وحدة التحكم وفي متصفح المستخدم 
 */

// إنشاء عنصر للسجلات في الصفحة
function createLogElement() {
    const logContainer = document.createElement('div');
    logContainer.id = 'debug-log-container';
    logContainer.style.position = 'fixed';
    logContainer.style.bottom = '0';
    logContainer.style.right = '0';
    logContainer.style.width = '300px';
    logContainer.style.height = '200px';
    logContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    logContainer.style.color = '#fff';
    logContainer.style.padding = '10px';
    logContainer.style.fontFamily = 'monospace';
    logContainer.style.fontSize = '12px';
    logContainer.style.overflowY = 'scroll';
    logContainer.style.zIndex = '9999';
    logContainer.style.display = 'none'; // مخفي افتراضيًا
    
    const logHeader = document.createElement('div');
    logHeader.style.display = 'flex';
    logHeader.style.justifyContent = 'space-between';
    logHeader.style.marginBottom = '5px';
    
    const logTitle = document.createElement('span');
    logTitle.textContent = 'سجل التشخيص';
    logTitle.style.fontWeight = 'bold';
    
    const logToggle = document.createElement('button');
    logToggle.textContent = 'إخفاء';
    logToggle.style.backgroundColor = '#555';
    logToggle.style.color = '#fff';
    logToggle.style.border = 'none';
    logToggle.style.padding = '2px 5px';
    logToggle.style.cursor = 'pointer';
    
    const logContent = document.createElement('div');
    logContent.id = 'debug-log-content';
    
    logHeader.appendChild(logTitle);
    logHeader.appendChild(logToggle);
    logContainer.appendChild(logHeader);
    logContainer.appendChild(logContent);
    
    document.body.appendChild(logContainer);
    
    logToggle.addEventListener('click', function() {
        const content = document.getElementById('debug-log-content');
        if (content.style.display === 'none') {
            content.style.display = 'block';
            logToggle.textContent = 'إخفاء';
        } else {
            content.style.display = 'none';
            logToggle.textContent = 'إظهار';
        }
    });
    
    // إضافة زر لإظهار/إخفاء سجل التشخيص بالكامل
    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'سجل التشخيص';
    toggleButton.style.position = 'fixed';
    toggleButton.style.bottom = '10px';
    toggleButton.style.right = '10px';
    toggleButton.style.backgroundColor = '#007bff';
    toggleButton.style.color = '#fff';
    toggleButton.style.border = 'none';
    toggleButton.style.borderRadius = '5px';
    toggleButton.style.padding = '5px 10px';
    toggleButton.style.cursor = 'pointer';
    toggleButton.style.zIndex = '10000';
    
    toggleButton.addEventListener('click', function() {
        const container = document.getElementById('debug-log-container');
        if (container.style.display === 'none') {
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    });
    
    document.body.appendChild(toggleButton);
}

// تسجيل الأحداث وإظهارها في النافذة
function logEvent(category, message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `${timestamp} [${category}] ${message}`;
    
    // تسجيل في وحدة تحكم المتصفح
    console.log(logMessage);
    if (data) {
        console.log(data);
    }
    
    // إضافة إلى عنصر السجل في الصفحة
    const logContent = document.getElementById('debug-log-content');
    if (logContent) {
        const logEntry = document.createElement('div');
        logEntry.innerHTML = `<span style="color: #aaa;">${timestamp}</span> <span style="color: #77f;">[${category}]</span> ${message}`;
        if (data) {
            logEntry.innerHTML += `<pre style="color: #bbb; font-size: 10px; margin: 2px 0 5px 10px;">${JSON.stringify(data, null, 2)}</pre>`;
        }
        logContent.appendChild(logEntry);
        logContent.scrollTop = logContent.scrollHeight;
    }
}

// تسجيل معلومات النظام
function logSystemInfo() {
    const browserInfo = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        cookiesEnabled: navigator.cookieEnabled,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        windowSize: `${window.innerWidth}x${window.innerHeight}`,
        localStorage: typeof localStorage !== 'undefined',
        currentUrl: window.location.href
    };
    
    logEvent('SYSTEM', 'معلومات النظام', browserInfo);
    
    // التحقق من localStorage
    try {
        const storedCurrency = localStorage.getItem('currency') || 'USD';
        logEvent('STORAGE', `العملة المخزنة: ${storedCurrency}`);
    } catch (error) {
        logEvent('ERROR', 'خطأ في الوصول إلى localStorage', error.toString());
    }
}

// تتبع الخاص بأحداث الدفع
function setupPaymentTracking() {
    // تتبع تغييرات العملة
    window.originalToggleCurrency = window.toggleCurrency;
    window.toggleCurrency = function(planName) {
        const currentCurrency = localStorage.getItem('currency') || 'USD';
        const newCurrency = currentCurrency === 'USD' ? 'STARS' : 'USD';
        
        logEvent('CURRENCY', `تغيير العملة من ${currentCurrency} إلى ${newCurrency} للخطة: ${planName}`);
        
        // استدعاء الوظيفة الأصلية
        const result = window.originalToggleCurrency(planName);
        
        // تسجيل العملة بعد التغيير للتأكد
        setTimeout(() => {
            const updatedCurrency = localStorage.getItem('currency') || 'USD';
            logEvent('CURRENCY', `تم تغيير العملة إلى: ${updatedCurrency}`);
        }, 100);
        
        return result;
    };
    
    // تتبع عمليات الدفع بالنجوم
    const originalProcessTelegramPayment = window.starPaymentSystem.processTelegramPayment;
    window.starPaymentSystem.processTelegramPayment = function(event) {
        logEvent('PAYMENT', 'محاولة الدفع عبر نجوم التلجرام', {
            eventType: event.type,
            target: event.target ? (event.target.className || event.target.tagName) : 'unknown',
            currency: localStorage.getItem('currency') || 'USD'
        });
        
        // تتبع عمليات منع الحدث الافتراضي
        event.originalPreventDefault = event.preventDefault;
        event.preventDefault = function() {
            logEvent('EVENT', 'تم منع السلوك الافتراضي للحدث');
            event.originalPreventDefault.call(this);
        };
        
        // استدعاء الوظيفة الأصلية
        try {
            const result = originalProcessTelegramPayment.call(this, event);
            logEvent('PAYMENT', 'تم إكمال وظيفة معالجة الدفع بنجاح');
            return result;
        } catch (error) {
            logEvent('ERROR', 'خطأ في معالجة الدفع بنجوم التلجرام', error.toString());
            throw error;
        }
    };
    
    // تتبع النوافذ المنبثقة
    window.originalShowPaymentModal = window.showPaymentModal;
    window.showPaymentModal = function(event) {
        const currentCurrency = localStorage.getItem('currency') || 'USD';
        
        logEvent('MODAL', `محاولة فتح النافذة المنبثقة للدفع. العملة الحالية: ${currentCurrency}`, {
            eventType: event.type,
            target: event.target ? (event.target.className || event.target.tagName) : 'unknown'
        });
        
        // تسجيل تحذير إذا كانت العملة هي النجوم
        if (currentCurrency === 'STARS') {
            logEvent('WARNING', '⚠️ تم محاولة فتح النافذة المنبثقة في وضع الدفع بالنجوم!');
        }
        
        // استدعاء الوظيفة الأصلية
        try {
            const result = window.originalShowPaymentModal(event);
            logEvent('MODAL', 'تم إكمال وظيفة عرض النافذة المنبثقة');
            return result;
        } catch (error) {
            logEvent('ERROR', 'خطأ في عرض النافذة المنبثقة', error.toString());
            throw error;
        }
    };
}

// تغيير سلوك أزرار الاشتراك للتتبع الدقيق
function trackSubscriptionButtons() {
    document.querySelectorAll('.subscribe-btn').forEach(button => {
        const planCard = button.closest('.plan-card');
        const planName = planCard ? planCard.querySelector('h2')?.textContent?.trim() || 'Unknown Plan' : 'Unknown Plan';
        
        button.addEventListener('click', function(event) {
            const currentCurrency = localStorage.getItem('currency') || 'USD';
            
            logEvent('CLICK', `تم النقر على زر الاشتراك للخطة: ${planName}`, {
                currency: currentCurrency,
                planCardCurrency: planCard ? planCard.getAttribute('data-currency') : 'unknown',
                buttonId: this.id || 'unknown',
                buttonText: this.textContent.trim()
            });
        });
    });
}

// تسجيل تتبع لعناصر HTML الرئيسية
function watchDOMChanges() {
    // مراقبة التغييرات على عناصر DOM
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            // مراقبة إضافة/إزالة النافذة المنبثقة
            if (mutation.type === 'childList' && mutation.addedNodes.length) {
                mutation.addedNodes.forEach(node => {
                    if (node.id === 'paymentModal' || (node.classList && node.classList.contains('modal'))) {
                        logEvent('DOM', 'تم إضافة النافذة المنبثقة للدفع إلى DOM');
                    }
                });
            }
            
            // مراقبة تغييرات الخصائص (مثل style.display)
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const modal = document.getElementById('paymentModal');
                if (mutation.target === modal) {
                    const isVisible = window.getComputedStyle(modal).display !== 'none';
                    logEvent('DOM', `تم ${isVisible ? 'إظهار' : 'إخفاء'} النافذة المنبثقة للدفع`);
                }
            }
        });
    });
    
    // بدء المراقبة على كامل الصفحة
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
    });
    
    logEvent('SYSTEM', 'تم تفعيل مراقبة تغييرات DOM');
}

// بدء التسجيل عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    createLogElement();
    logEvent('INIT', 'بدء تشغيل نظام التتبع والتسجيل');
    logSystemInfo();
    
    // تفعيل التتبع بعد تحميل جميع المكونات
    setTimeout(() => {
        setupPaymentTracking();
        trackSubscriptionButtons();
        watchDOMChanges();
        logEvent('INIT', 'تم تفعيل جميع وظائف التتبع بنجاح');
    }, 1000);
});
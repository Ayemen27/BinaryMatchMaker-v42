// Modified prices object with more robust handling
const prices = {
    "Weekly Plan": { 
        USD: 9.99, 
        STARS: 750,
        botVersions: ['BinarJoinAnalytic v1.0', 'BinarJoinAnalytic Main v2.0']
    },
    "Monthly Plan": { 
        USD: 29.99, 
        STARS: 2300,
        botVersions: ['BinarJoinAnalytic v1.0', 'BinarJoinAnalytic Main v2.0', 'BinarJoinAnalytic AI v3.0']
    },
    "Annual Plan": { 
        USD: 149.99, 
        STARS: 10000,
        botVersions: ['BinarJoinAnalytic v1.0', 'BinarJoinAnalytic Main v2.0', 'BinarJoinAnalytic AI v3.0']
    }
};

// Safe function to retrieve prices with fallback
function getDisplayPrice(planName, currency = 'USD') {
    try {
        // Validate inputs
        if (!planName || typeof planName !== 'string') {
            console.warn('Invalid plan name');
            return currency === 'USD' ? '$0.00' : '0 Stars';
        }

        // Normalize plan name
        const normalizedPlanName = planName.trim();
        
        // Check if plan exists
        if (!prices[normalizedPlanName]) {
            console.warn(`Plan "${normalizedPlanName}" not found`);
            return currency === 'USD' ? '$0.00' : '0 Stars';
        }

        // Safely retrieve price with fallback
        const price = prices[normalizedPlanName][currency] || 0;

        // Format price
        return currency === 'USD' 
            ? `$${price.toFixed(2)}` 
            : `${price} Stars`;
    } catch (error) {
        console.error('Price retrieval error:', error);
        return currency === 'USD' ? '$0.00' : '0 Stars';
    }
}

// Enhanced function to get bot versions for a plan
function getBotVersions(planName) {
    try {
        const normalizedPlanName = planName.trim();
        
        if (!prices[normalizedPlanName]) {
            console.warn(`Plan "${normalizedPlanName}" not found`);
            return ['Select Bot Version'];
        }

        return prices[normalizedPlanName].botVersions || ['Select Bot Version'];
    } catch (error) {
        console.error('Bot versions retrieval error:', error);
        return ['Select Bot Version'];
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Dynamically populate bot version dropdowns
    const botVersionSelects = document.querySelectorAll('.bot-version');
    botVersionSelects.forEach(select => {
        const planCard = select.closest('.plan-card');
        const planName = planCard?.querySelector('h2')?.textContent?.trim();
        
        if (planName) {
            const versions = getBotVersions(planName);
            
            // Clear existing options
            select.innerHTML = '<option value="">Select Bot Version</option>';
            
            // Add new options
            versions.forEach(version => {
                const option = document.createElement('option');
                option.value = version.toLowerCase().replace(/\s+/g, '_');
                option.textContent = version;
                select.appendChild(option);
            });
        }
    });

    // Null checks and safe access functions
    function safeGetLocalStorage(key, defaultValue = '') {
        try {
            return localStorage.getItem(key) || defaultValue;
        } catch (error) {
            console.error('Error accessing localStorage:', error);
            return defaultValue;
        }
    }

    /**
     * نظام تبديل العملة المُحسّن
     * يتناسق مع نظام الدفع بنجوم تلجرام لضمان تجربة مستخدم سلسة
     */
    window.currencySystem = {
        // تقوم بتبديل العملة وتحديث المعلومات ذات الصلة
        switchCurrency: function(planName) {
            // تبديل العملة
            const currentCurrency = localStorage.getItem('currency') || 'USD';
            const newCurrency = currentCurrency === 'USD' ? 'STARS' : 'USD';
            localStorage.setItem('currency', newCurrency);
            
            // تحديث واجهة المستخدم
            return this.updatePlanInterface(planName, newCurrency);
        },
        
        // تحديث واجهة خطة الاشتراك بناءً على العملة المختارة
        updatePlanInterface: function(planName, currency) {
            // البحث عن زر التبديل
            const toggleButton = document.querySelector(`.plan-currency-toggle[onclick="toggleCurrency('${planName}')"]`);
            if (!toggleButton) return false;
            
            // إضافة تأثير النقر
            toggleButton.classList.add('clicked');
            setTimeout(() => {
                toggleButton.classList.remove('clicked');
            }, 800);
            
            // تحديث العناصر المرئية
            const planCard = toggleButton.closest('.plan-card');
            if (!planCard) return false;
            
            const priceElement = planCard.querySelector('.price');
            if (!priceElement) return false;
            
            // استخراج معلومات حول سعر النجوم
            const starsAmount = window.starPaymentSystem.getStarsAmount(planName);
            
            // تحديث الواجهة حسب العملة
            if (currency === 'USD') {
                return this.switchToUSD(toggleButton, planCard, priceElement, planName, starsAmount);
            } else {
                return this.switchToStars(toggleButton, planCard, priceElement, planName, starsAmount);
            }
        },
        
        // تحويل الواجهة إلى وضع الدولار
        switchToUSD: function(toggleButton, planCard, priceElement, planName, starsAmount) {
            // تحديث تصنيفات CSS
            toggleButton.classList.remove('stars-active');
            planCard.setAttribute('data-currency', 'USD');
            
            // ضبط الأسعار
            if (planName === 'Weekly Plan') priceElement.textContent = '9.99';
            else if (planName === 'Monthly Plan') priceElement.textContent = '29.99';
            else if (planName === 'Annual Plan') priceElement.textContent = '149.99';
            
            // تحديث نص زر التبديل
            toggleButton.innerHTML = `
                <i class="fas fa-exchange-alt"></i>
                <span>Switch to Stars (${starsAmount})</span>
            `;
            
            // تغيير سلوك زر الاشتراك لاستخدام النافذة المنبثقة
            const subscribeButton = planCard.querySelector('.subscribe-btn');
            if (subscribeButton) {
                // إزالة أي مستمعات أحداث سابقة
                subscribeButton.onclick = null;
                // تعيين حدث جديد
                subscribeButton.setAttribute('onclick', 'handleSubscription(event)');
            }
            
            return true;
        },
        
        // تحويل الواجهة إلى وضع النجوم
        switchToStars: function(toggleButton, planCard, priceElement, planName, starsAmount) {
            // تحديث تصنيفات CSS
            toggleButton.classList.add('stars-active');
            planCard.setAttribute('data-currency', 'STARS');
            
            // ضبط أسعار النجوم مع رمز مرئي
            priceElement.innerHTML = `<i class="fas fa-star text-warning"></i> ${starsAmount} Stars`;
            
            // تحديث نص زر التبديل
            toggleButton.innerHTML = `
                <i class="fas fa-dollar-sign"></i>
                <span>Switch to USD</span>
            `;
            
            // تغيير سلوك زر الاشتراك للتوجيه المباشر إلى تلجرام
            const subscribeButton = planCard.querySelector('.subscribe-btn');
            if (subscribeButton) {
                // تعيين وظيفة معالجة مباشرة
                subscribeButton.onclick = function(event) {
                    event.preventDefault();
                    window.starPaymentSystem.processTelegramPayment(event);
                    return false;
                };
            }
            
            // إغلاق أي نافذة منبثقة مفتوحة
            const modal = document.getElementById('paymentModal');
            if (modal && modal.style.display === 'block') {
                modal.style.display = 'none';
            }
            
            return true;
        }
    };
    
    // واجهة تبديل العملة للاستخدام في onclick
    window.toggleCurrency = function(planName) {
        window.currencySystem.switchCurrency(planName);
        return false; // منع الإجراء الافتراضي
    };

    /**
     * تهيئة حالة الأزرار بناءً على خيار العملة المخزنة
     * هذا الكود يتم تنفيذه عند تحميل الصفحة للتأكد من أن واجهة المستخدم تعكس خيار العملة بشكل صحيح
     */
    // استخدام نظام العملة المُحسن
    document.addEventListener('DOMContentLoaded', function() {
        try {
            const initialCurrency = localStorage.getItem('currency') || 'USD';
            
            // الكشف عن بطاقات الخطط الموجودة في الصفحة
            const planCards = document.querySelectorAll('.plan-card');
            
            // لكل بطاقة خطة، قم بتحديث واجهتها بناءً على العملة المخزنة
            planCards.forEach(planCard => {
                // استخراج اسم الخطة
                const planName = planCard.querySelector('h2')?.textContent?.trim();
                if (!planName) return;
                
                // تهيئة حالة الخطة بناءً على العملة المخزنة
                const toggleButton = planCard.querySelector('.plan-currency-toggle');
                const priceElement = planCard.querySelector('.price');
                
                // الحصول على عدد النجوم لهذه الخطة
                const starsAmount = window.starPaymentSystem.getStarsAmount(planName);
                
                if (initialCurrency === 'STARS') {
                    // تحديث الواجهة لعرض حالة النجوم
                    if (toggleButton) {
                        toggleButton.classList.add('stars-active');
                        toggleButton.innerHTML = `
                            <i class="fas fa-dollar-sign"></i>
                            <span>Switch to USD</span>
                        `;
                    }
                    
                    planCard.setAttribute('data-currency', 'STARS');
                    
                    // تحديث سعر النجوم مع رمز النجمة
                    if (priceElement) {
                        priceElement.innerHTML = `<i class="fas fa-star text-warning"></i> ${starsAmount} Stars`;
                    }
                    
                    // تعديل سلوك زر الاشتراك للتوجيه المباشر إلى تلجرام
                    const subscribeButton = planCard.querySelector('.subscribe-btn');
                    if (subscribeButton) {
                        // استخدام وظائف النظام لتعيين الحدث لتجنب ظهور النافذة المنبثقة
                        subscribeButton.onclick = function(event) {
                            event.preventDefault();
                            event.stopPropagation();
                            window.starPaymentSystem.processTelegramPayment(event);
                            return false;
                        };
                    }
                } else {
                    // إعداد الواجهة لعرض حالة الدولار الأمريكي
                    if (toggleButton) {
                        toggleButton.classList.remove('stars-active');
                        toggleButton.innerHTML = `
                            <i class="fas fa-exchange-alt"></i>
                            <span>Switch to Stars (${starsAmount})</span>
                        `;
                    }
                    
                    planCard.setAttribute('data-currency', 'USD');
                    
                    // ضبط الأسعار بالدولار
                    if (priceElement) {
                        if (planName === 'Weekly Plan') priceElement.textContent = '9.99';
                        else if (planName === 'Monthly Plan') priceElement.textContent = '29.99';
                        else if (planName === 'Annual Plan') priceElement.textContent = '149.99';
                    }
                    
                    // تعديل سلوك زر الاشتراك لاستخدام النافذة المنبثقة
                    const subscribeButton = planCard.querySelector('.subscribe-btn');
                    if (subscribeButton) {
                        subscribeButton.onclick = null; // إزالة أي أحداث قديمة
                        subscribeButton.setAttribute('onclick', 'handleSubscription(event)');
                    }
                }
            });
            
            console.log('[CurrencySystem] Interface initialized with currency:', initialCurrency);
        } catch (error) {
            console.error('[CurrencySystem] Error during initialization:', error);
        }
    });
    
    // Enhanced error handling for form submission
    function submitUserInfo(event, method, plan, price) {
        event.preventDefault();

        const fullName = document.getElementById('fullName')?.value || '';
        const email = document.getElementById('email')?.value || '';
        const country = $('#country').select2('data')[0]?.text || '';
        const phoneInput = document.getElementById('phone');
        const phone = phoneInput && window.intlTelInput(phoneInput).getNumber() || '';

        if (!fullName || !email || !country || !phone) {
            alert('Please fill in all required fields');
            return;
        }

        const currentCurrency = localStorage.getItem('currency') || 'USD';
        const modalContent = document.querySelector('.modal-content');

        if (currentCurrency === 'STARS') {
            modalContent.innerHTML = `
                <span class="close-modal" onclick="closeModal()">&times;</span>
                <div class="payment-processing">
                    <div class="loading-spinner"></div>
                    <h3>Processing Stars Payment...</h3>
                    <p>You will be redirected to Telegram to complete the payment with stars.</p>
                </div>
            `;

            let starsAmount = 750; // Default for Weekly Plan
            if (plan === 'Monthly Plan') starsAmount = 2300;
            if (plan === 'Annual Plan') starsAmount = 10000;
            
            const message = encodeURIComponent(
                `Stars Subscription Request\n\n` +
                `Customer Details:\n` +
                `👤 Full Name: ${fullName}\n` +
                `📧 Email: ${email}\n` +
                `🌍 Country: ${country}\n` +
                `📱 Phone: ${phone}\n\n` +
                `Subscription Info:\n` +
                `📦 Plan: ${plan}\n` +
                `🤖 Bot Version: ${localStorage.getItem('selectedBotVersion')}\n` +
                `⭐ Stars Required: ${starsAmount} Stars`
            );

            setTimeout(() => {
                window.open(`https://t.me/binarjoinanelytic_bot?text=${message}`, '_blank');
                closeModal();
            }, 1500);
        }
    }

    // Attach submitUserInfo to window to make it globally accessible
    window.submitUserInfo = submitUserInfo;

    // Check if element exists before adding event listener
    const interactBtn = document.querySelector('.interact-btn');
    if (interactBtn) {
        interactBtn.addEventListener('click', function() {
            const robot = document.querySelector('.robot');
            const leftEye = document.querySelector('.left-eye');
            const rightEye = document.querySelector('.right-eye');
            const mouth = document.querySelector('.mouth');

            // Animation sequence
            robot.style.transition = 'transform 0.3s ease';
            robot.style.transform = 'scale(1.1)';

            leftEye.style.backgroundColor = 'yellow';
            rightEye.style.backgroundColor = 'yellow';
            mouth.style.backgroundColor = 'red';

            setTimeout(() => {
                robot.style.transform = 'scale(1)';
                leftEye.style.backgroundColor = 'white';
                rightEye.style.backgroundColor = 'white';
                mouth.style.backgroundColor = 'white';
            }, 500);
        });
    }
    
    const floatingButtons = document.querySelectorAll('.floating-btn');
    
    // Handle each button click for expand/collapse and function activation
    floatingButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            const isActive = this.classList.contains('active');
            
            // Close all other buttons first
            floatingButtons.forEach(btn => {
                if (btn !== this) {
                    btn.classList.remove('active');
                }
            });
            
            // If this button was not active, just expand it
            if (!isActive) {
                this.classList.add('active');
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            
            // If already expanded and has href or onclick, activate the function
            if (this.getAttribute('href')) {
                // For links, let the default behavior happen
                // The button will hide after navigation
                this.classList.remove('active');
            } else if (this.classList.contains('dark-mode-toggle')) {
                toggleDarkMode();
                this.classList.remove('active');
            } else {
                // If no action, just collapse the button
                this.classList.remove('active');
            }
        });
    });
    
    // Hide buttons when clicking outside
    document.addEventListener('click', function(e) {
        const isButtonClick = e.target.closest('.floating-btn');
        if (!isButtonClick) {
            floatingButtons.forEach(button => {
                button.classList.remove('active');
            });
        }
    });

    const darkModeEnabled = localStorage.getItem('darkMode') === 'enabled';
    if (darkModeEnabled) {
        document.body.classList.add('dark-mode');
        const darkModeIcon = document.getElementById('darkModeIcon');
        const chatIcon = document.getElementById('chatIcon');
        const chatIconVisible = document.getElementById('chatIconVisible');
        
        if (darkModeIcon) {
            darkModeIcon.innerHTML = `<path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446A9 9 0 1 1 12 2.992z"/>`;
        }
        if (chatIcon && chatIconVisible) {
            chatIcon.src = "/chatDarkMode .png";
            chatIconVisible.src = "/chatDarkMode .png";
        }
    }

    // Function to toggle chat visibility
    window.toggleChat = function() {
        if (window.botpressWebChat) {
            if (window.botpressWebChat.isVisible) {
                window.botpressWebChat.hideChat();
            } else {
                window.botpressWebChat.showChat();
            }
        }
    };
    
    // Initialize currency toggle state
    const currentCurrency = localStorage.getItem('currency') || 'USD';
    if (currentCurrency === 'STARS') {
        toggleCurrency('Weekly Plan');
    }

    // Add fallback for undefined variables
    function safeGetLocalStorage(key, defaultValue = '') {
        return localStorage.getItem(key) || defaultValue;
    }

    // Modify functions to handle potential undefined scenarios
    // دالة جديدة للتوجيه المباشر إلى تلجرام عند اختيار الدفع بالنجوم
    /**
     * نظام التوجيه المباشر إلى نجوم تلجرام
     * وظيفة مُحسنة ومُعاد هيكلتها للتوجيه المباشر إلى بوت تلجرام بدون أي نوافذ منبثقة
     */
    window.starPaymentSystem = {
        // التحقق من صحة اختيار نسخة البوت
        validateBotSelection: function(planCard) {
            const botVersionSelect = planCard.querySelector('.bot-version');
            const errorMessage = planCard.querySelector('.error-message');
            
            if (!botVersionSelect) return false;
            
            const selectedVersion = botVersionSelect.value;
            if (!selectedVersion) {
                // إظهار تأثير الخطأ مع التنبيه
                botVersionSelect.classList.add('highlight-select', 'shake');
                if (errorMessage) errorMessage.classList.add('visible');
                
                // إزالة التأثيرات بعد اكتمالها
                setTimeout(() => {
                    botVersionSelect.classList.remove('shake');
                }, 500);
                
                setTimeout(() => {
                    botVersionSelect.classList.remove('highlight-select');
                    if (errorMessage) errorMessage.classList.remove('visible');
                }, 3000);
                
                return false;
            }
            
            return {
                botVersion: botVersionSelect.options[botVersionSelect.selectedIndex]?.text || 'Unknown Version',
                versionValue: selectedVersion
            };
        },
        
        // حساب عدد النجوم المطلوبة بناءً على نوع الخطة
        getStarsAmount: function(planName) {
            switch(planName) {
                case 'Weekly Plan': return 750;
                case 'Monthly Plan': return 2300;
                case 'Annual Plan': return 10000;
                default: return 750; // قيمة افتراضية
            }
        },
        
        // إعداد رسالة للإرسال إلى بوت تلجرام
        prepareMessage: function(planName, botVersion, starsAmount) {
            return encodeURIComponent(
                `Stars Subscription Request\n\n` +
                `Subscription Info:\n` +
                `📦 Plan: ${planName}\n` +
                `🤖 Bot Version: ${botVersion}\n` +
                `⭐ Stars Required: ${starsAmount} Stars`
            );
        },
        
        // التنفيذ الرئيسي - معالجة الدفع
        processTelegramPayment: function(event) {
            try {
                // إلغاء الحدث الافتراضي لمنع سلوك النافذة المنبثقة
                if (event) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                
                // العثور على بطاقة الخطة
                const planCard = event.target ? event.target.closest('.plan-card') : null;
                if (!planCard) return false;
                
                // التحقق من اختيار نسخة البوت
                const botInfo = this.validateBotSelection(planCard);
                if (!botInfo) return false;
                
                // استخراج معلومات الخطة
                const planName = planCard.querySelector('h2')?.textContent?.trim() || 'Unknown Plan';
                
                // حساب عدد النجوم وتخزين التفاصيل
                const starsAmount = this.getStarsAmount(planName);
                
                // تخزين البيانات للرجوع إليها لاحقاً
                localStorage.setItem('selectedPlan', planName);
                localStorage.setItem('selectedPrice', `${starsAmount} Stars`);
                localStorage.setItem('selectedBotVersion', botInfo.botVersion);
                localStorage.setItem('paymentMethod', 'telegram_stars');
                
                // إعداد الرسالة وفتح رابط تلجرام
                const message = this.prepareMessage(planName, botInfo.botVersion, starsAmount);
                window.open(`https://t.me/binarjoinanelytic_bot?text=${message}`, '_blank');
                
                // إغلاق أي نافذة منبثقة قد تكون مفتوحة
                const modal = document.getElementById('paymentModal');
                if (modal) {
                    modal.style.display = 'none';
                }
                
                return true;
            } catch (error) {
                console.error('[StarPaymentSystem] Error during payment process:', error);
                return false;
            }
        }
    };
    
    // تعريف وظيفة مختصرة للاستخدام في onclick
    window.redirectToTelegramStars = function(event) {
        return window.starPaymentSystem.processTelegramPayment(event);
    };

    /**
     * نظام ذكي للتعامل مع طرق الدفع المختلفة
     * هذه الوظيفة تقوم بفحص نوع العملة المختارة وتوجيه المستخدم للطريقة المناسبة
     * USD: تظهر النافذة المنبثقة مع خيارات الدفع التقليدية
     * STARS: توجّه المستخدم مباشرة لبوت تلجرام دون ظهور النافذة المنبثقة
     */
    window.handleSubscription = function(event) {
        // الحصول على العملة الحالية
        const currentCurrency = localStorage.getItem('currency') || 'USD';
        
        // التحقق من نوع العملة
        if (currentCurrency === 'STARS') {
            // استخدام نظام دفع نجوم تلجرام مباشرة بدون نوافذ منبثقة
            window.starPaymentSystem.processTelegramPayment(event);
        } else {
            // استخدام النافذة المنبثقة للدفع التقليدي
            showPaymentModal(event);
        }
    };

    /**
     * النافذة المنبثقة للدفع التقليدي (USD)
     * تستخدم فقط في حالة الدفع بغير النجوم
     */
    window.showPaymentModal = function(event) {
        try {
            if (!event || !event.target) return;
            
            const planCard = event.target.closest('.plan-card');
            if (!planCard) return;

            const botVersionSelect = planCard.querySelector('.bot-version');
            const errorMessage = planCard.querySelector('.error-message');
            
            if (!botVersionSelect) return;

            const selectedVersion = botVersionSelect.value;
            if (!selectedVersion) {
                // Show error notification with animation
                botVersionSelect.classList.add('highlight-select', 'shake');
                if (errorMessage) errorMessage.classList.add('visible');
                
                // Remove animations after they complete
                setTimeout(() => {
                    botVersionSelect.classList.remove('shake');
                }, 500);
                
                setTimeout(() => {
                    botVersionSelect.classList.remove('highlight-select');
                    if (errorMessage) errorMessage.classList.remove('visible');
                }, 3000);
                return;
            }

            // Safely retrieve plan details with fallbacks
            const planName = planCard.querySelector('h2')?.textContent?.trim() || 'Unknown Plan';
            const planPrice = planCard.querySelector('.price')?.textContent?.trim() || '$0.00';

            localStorage.setItem('selectedPlan', planName);
            localStorage.setItem('selectedPrice', planPrice);
            localStorage.setItem('selectedBotVersion', 
                botVersionSelect.options[botVersionSelect.selectedIndex]?.text || 'Unknown Version'
            );
        
            
            // للدفع بالطرق التقليدية، استمر بإظهار النافذة المنبثقة
            const modal = document.getElementById('paymentModal');
            if (!modal) return;
            
            modal.style.display = 'block';

            const modalContent = modal.querySelector('.modal-content');
            if (!modalContent) return;

            // عرض خيارات الدفع التقليدية
            modalContent.innerHTML = `
                <span class="close-modal" onclick="closeModal()">&#xd7;</span>
                <h2>Choose Payment Method</h2>
                
                <div class="tabs-container">
                    <div class="payment-tab active" onclick="showTab('platforms')">Platforms</div>
                    <div class="payment-tab" onclick="showTab('wallets')">Wallets</div>
                    <div class="payment-tab" onclick="showTab('traditional')">Traditional</div>
                </div>

                ${getPaymentSectionsHTML()}
            `;
            showTab('platforms');
        } catch (error) {
            console.error('Payment modal error:', error);
        }
    }

    function getPaymentSectionsHTML() {
        return `
            <div id="platforms" class="payment-section active">
                <div class="payment-options">
                    <div class="payment-option" onclick="selectPayment('binance')">
                        <img src="images/binance.png" alt="Binance">
                        <div>Binance</div>
                    </div>
                    <div class="payment-option" onclick="selectPayment('okx')">
                        <img src="images/okx.png" alt="OKX">
                        <div>OKX</div>
                    </div>
                    <div class="payment-option" onclick="selectPayment('bybit')">
                        <img src="images/bybit.png" alt="BYBIT">
                        <div>BYBIT</div>
                    </div>
                </div>
            </div>

            <div id="wallets" class="payment-section">
                <div class="payment-options">
                    <div class="payment-option" onclick="selectPayment('trustwallet')">
                        <img src="images/trustwallet.png" alt="Trust Wallet">
                        <div>Trust Wallet</div>
                    </div>
                    <div class="payment-option" onclick="selectPayment('metamask')">
                        <img src="images/metamask.png" alt="MetaMask">
                        <div>MetaMask</div>
                    </div>
                    <div class="payment-option" onclick="selectPayment('okx-wallet')">
                        <img src="images/okx-wallet.png" alt="OKX Wallet">
                        <div>OKX Wallet</div>
                    </div>
                    <div class="payment-option" onclick="selectPayment('binance-wallet')">
                        <img src="images/binance-wallet.png" alt="Binance Wallet">
                        <div>Binance Wallet</div>
                    </div>
                    <div class="payment-option" onclick="selectPayment('bybit-wallet')">
                        <img src="images/bybit-wallet.png" alt="BYBIT Wallet">
                        <div>BYBIT Wallet</div>
                    </div>
                </div>
            </div>

            <div id="traditional" class="payment-section">
                <div class="payment-options">
                    <div class="payment-option disabled" onclick="showDisabledMessage('mastercard')">
                        <img src="images/mastercard.png" alt="Mastercard">
                        <div>Mastercard</div>
                    </div>
                    <div class="payment-option disabled" onclick="showDisabledMessage('googleplay')">
                        <img src="images/googleplay.png" alt="Google Play">
                        <div>Google Play</div>
                    </div>
                    <div class="payment-option disabled" onclick="showDisabledMessage('paypal')">
                        <img src="images/paypal.png" alt="PayPal">
                        <div>PayPal</div>
                    </div>
                    <div class="payment-option" onclick="selectPayment('westernunion')">
                        <img src="images/westernunion.png" alt="Western Union">
                        <div>Western Union</div>
                    </div>
                    <div class="payment-option" onclick="selectPayment('moneygram')">
                        <img src="images/moneygram.png" alt="MoneyGram">
                        <div>MoneyGram</div>
                    </div>
                </div>
            </div>
        `;
    }

    function closeModal() {
        const modal = document.getElementById('paymentModal');
        if (!modal) return;
        
        const modalContent = modal.querySelector('.modal-content');
        if (!modalContent) return;
        
        modalContent.classList.add('closing');
        
        setTimeout(() => {
            modal.style.display = 'none';
            modalContent.classList.remove('closing');
        }, 500);
    }

    function initializeFormComponents() {
        const countrySelect = document.getElementById('country');
        const countries = [
            { id: 'AF', text: 'Afghanistan' },
            { id: 'AL', text: 'Albania' },
            { id: 'DZ', text: 'Algeria' },
            { id: 'AD', text: 'Andorra' },
            { id: 'AO', text: 'Angola' },
            { id: 'AG', text: 'Antigua and Barbuda' },
            { id: 'AR', text: 'Argentina' },
            { id: 'AM', text: 'Armenia' },
            { id: 'AU', text: 'Australia' },
            { id: 'AT', text: 'Austria' },
            { id: 'AZ', text: 'Azerbaijan' },
            { id: 'BS', text: 'Bahamas' },
            { id: 'BH', text: 'Bahrain' },
            { id: 'BD', text: 'Bangladesh' },
            { id: 'BB', text: 'Barbados' },
            { id: 'BY', text: 'Belarus' },
            { id: 'BE', text: 'Belgium' },
            { id: 'BZ', text: 'Belize' },
            { id: 'BJ', text: 'Benin' },
            { id: 'BT', text: 'Bhutan' },
            { id: 'BO', text: 'Bolivia' },
            { id: 'BA', text: 'Bosnia and Herzegovina' },
            { id: 'BW', text: 'Botswana' },
            { id: 'BR', text: 'Brazil' },
            { id: 'BN', text: 'Brunei' },
            { id: 'BG', text: 'Bulgaria' },
            { id: 'BF', text: 'Burkina Faso' },
            { id: 'BI', text: 'Burundi' },
            { id: 'CV', text: 'Cabo Verde' },
            { id: 'KH', text: 'Cambodia' },
            { id: 'CM', text: 'Cameroon' },
            { id: 'CA', text: 'Canada' },
            { id: 'CF', text: 'Central African Republic' },
            { id: 'TD', text: 'Chad' },
            { id: 'CL', text: 'Chile' },
            { id: 'CN', text: 'China' },
            { id: 'CO', text: 'Colombia' },
            { id: 'KM', text: 'Comoros' },
            { id: 'CG', text: 'Congo' },
            { id: 'CR', text: 'Costa Rica' },
            { id: 'HR', text: 'Croatia' },
            { id: 'CU', text: 'Cuba' },
            { id: 'CY', text: 'Cyprus' },
            { id: 'CZ', text: 'Czech Republic' },
            { id: 'DK', text: 'Denmark' },
            { id: 'DJ', text: 'Djibouti' },
            { id: 'DM', text: 'Dominica' },
            { id: 'DO', text: 'Dominican Republic' },
            { id: 'EC', text: 'Ecuador' },
            { id: 'EG', text: 'Egypt' },
            { id: 'SV', text: 'El Salvador' },
            { id: 'GQ', text: 'Equatorial Guinea' },
            { id: 'ER', text: 'Eritrea' },
            { id: 'EE', text: 'Estonia' },
            { id: 'ET', text: 'Ethiopia' },
            { id: 'FJ', text: 'Fiji' },
            { id: 'FI', text: 'Finland' },
            { id: 'FR', text: 'France' },
            { id: 'GA', text: 'Gabon' },
            { id: 'GM', text: 'Gambia' },
            { id: 'GE', text: 'Georgia' },
            { id: 'DE', text: 'Germany' },
            { id: 'GH', text: 'Ghana' },
            { id: 'GR', text: 'Greece' },
            { id: 'GD', text: 'Grenada' },
            { id: 'GT', text: 'Guatemala' },
            { id: 'GN', text: 'Guinea' },
            { id: 'GW', text: 'Guinea-Bissau' },
            { id: 'GY', text: 'Guyana' },
            { id: 'HT', text: 'Haiti' },
            { id: 'HN', text: 'Honduras' },
            { id: 'HU', text: 'Hungary' },
            { id: 'IS', text: 'Iceland' },
            { id: 'IN', text: 'India' },
            { id: 'ID', text: 'Indonesia' },
            { id: 'IR', text: 'Iran' },
            { id: 'IQ', text: 'Iraq' },
            { id: 'IE', text: 'Ireland' },
            { id: 'IL', text: 'Israel' },
            { id: 'IT', text: 'Italy' },
            { id: 'JM', text: 'Jamaica' },
            { id: 'JP', text: 'Japan' },
            { id: 'JO', text: 'Jordan' },
            { id: 'KZ', text: 'Kazakhstan' },
            { id: 'KE', text: 'Kenya' },
            { id: 'KI', text: 'Kiribati' },
            { id: 'KP', text: 'North Korea' },
            { id: 'KR', text: 'South Korea' },
            { id: 'KW', text: 'Kuwait' },
            { id: 'KG', text: 'Kyrgyzstan' },
            { id: 'LA', text: 'Laos' },
            { id: 'LV', text: 'Latvia' },
            { id: 'LB', text: 'Lebanon' },
            { id: 'LS', text: 'Lesotho' },
            { id: 'LR', text: 'Liberia' },
            { id: 'LY', text: 'Libya' },
            { id: 'LI', text: 'Liechtenstein' },
            { id: 'LT', text: 'Lithuania' },
            { id: 'LU', text: 'Luxembourg' },
            { id: 'MG', text: 'Madagascar' },
            { id: 'MW', text: 'Malawi' },
            { id: 'MY', text: 'Malaysia' },
            { id: 'MV', text: 'Maldives' },
            { id: 'ML', text: 'Mali' },
            { id: 'MT', text: 'Malta' },
            { id: 'MH', text: 'Marshall Islands' },
            { id: 'MR', text: 'Mauritania' },
            { id: 'MU', text: 'Mauritius' },
            { id: 'MX', text: 'Mexico' },
            { id: 'FM', text: 'Micronesia' },
            { id: 'MD', text: 'Moldova' },
            { id: 'MC', text: 'Monaco' },
            { id: 'MN', text: 'Mongolia' },
            { id: 'ME', text: 'Montenegro' },
            { id: 'MA', text: 'Morocco' },
            { id: 'MZ', text: 'Mozambique' },
            { id: 'MM', text: 'Myanmar' },
            { id: 'NA', text: 'Namibia' },
            { id: 'NR', text: 'Nauru' },
            { id: 'NP', text: 'Nepal' },
            { id: 'NL', text: 'Netherlands' },
            { id: 'NZ', text: 'New Zealand' },
            { id: 'NI', text: 'Nicaragua' },
            { id: 'NE', text: 'Niger' },
            { id: 'NG', text: 'Nigeria' },
            { id: 'NO', text: 'Norway' },
            { id: 'OM', text: 'Oman' },
            { id: 'PK', text: 'Pakistan' },
            { id: 'PW', text: 'Palau' },
            { id: 'PA', text: 'Panama' },
            { id: 'PG', text: 'Papua New Guinea' },
            { id: 'PY', text: 'Paraguay' },
            { id: 'PE', text: 'Peru' },
            { id: 'PH', text: 'Philippines' },
            { id: 'PL', text: 'Poland' },
            { id: 'PT', text: 'Portugal' },
            { id: 'QA', text: 'Qatar' },
            { id: 'RO', text: 'Romania' },
            { id: 'RU', text: 'Russia' },
            { id: 'RW', text: 'Rwanda' },
            { id: 'KN', text: 'Saint Kitts and Nevis' },
            { id: 'LC', text: 'Saint Lucia' },
            { id: 'VC', text: 'Saint Vincent and the Grenadines' },
            { id: 'WS', text: 'Samoa' },
            { id: 'SM', text: 'San Marino' },
            { id: 'ST', text: 'Sao Tome and Principe' },
            { id: 'SA', text: 'Saudi Arabia' },
            { id: 'SN', text: 'Senegal' },
            { id: 'RS', text: 'Serbia' },
            { id: 'SC', text: 'Seychelles' },
            { id: 'SL', text: 'Sierra Leone' },
            { id: 'SG', text: 'Singapore' },
            { id: 'SK', text: 'Slovakia' },
            { id: 'SI', text: 'Slovenia' },
            { id: 'SB', text: 'Solomon Islands' },
            { id: 'SO', text: 'Somalia' },
            { id: 'ZA', text: 'South Africa' },
            { id: 'SS', text: 'South Sudan' },
            { id: 'ES', text: 'Spain' },
            { id: 'LK', text: 'Sri Lanka' },
            { id: 'SD', text: 'Sudan' },
            { id: 'SR', text: 'Suriname' },
            { id: 'SE', text: 'Sweden' },
            { id: 'CH', text: 'Switzerland' },
            { id: 'SY', text: 'Syria' },
            { id: 'TW', text: 'Taiwan' },
            { id: 'TJ', text: 'Tajikistan' },
            { id: 'TZ', text: 'Tanzania' },
            { id: 'TH', text: 'Thailand' },
            { id: 'TL', text: 'Timor-Leste' },
            { id: 'TG', text: 'Togo' },
            { id: 'TO', text: 'Tonga' },
            { id: 'TT', text: 'Trinidad and Tobago' },
            { id: 'TN', text: 'Tunisia' },
            { id: 'TR', text: 'Turkey' },
            { id: 'TM', text: 'Turkmenistan' },
            { id: 'TV', text: 'Tuvalu' },
            { id: 'UG', text: 'Uganda' },
            { id: 'UA', text: 'Ukraine' },
            { id: 'AE', text: 'United Arab Emirates' },
            { id: 'GB', text: 'United Kingdom' },
            { id: 'US', text: 'United States' },
            { id: 'UY', text: 'Uruguay' },
            { id: 'UZ', text: 'Uzbekistan' },
            { id: 'VU', text: 'Vanuatu' },
            { id: 'VA', text: 'Vatican City' },
            { id: 'VE', text: 'Venezuela' },
            { id: 'VN', text: 'Vietnam' },
            { id: 'YE', text: 'Yemen' },
            { id: 'ZM', text: 'Zambia' },
            { id: 'ZW', text: 'Zimbabwe' }
        ];

        // Initialize Select2 with countries
        $(countrySelect).select2({
            data: countries,
            templateResult: formatCountry,
            templateSelection: formatCountry,
            placeholder: 'Select your country',
            allowClear: true
        });

        // Get user's country using IP geolocation
        fetch('https://ipapi.co/json/')
            .then(response => response.json())
            .then(data => {
                const userCountry = data.country;
                if (userCountry) {
                    $(countrySelect).val(userCountry).trigger('change');
                }
            })
            .catch(error => console.log('Error detecting country:', error));

        // Initialize phone input
        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            window.intlTelInput(phoneInput, {
                initialCountry: 'auto',
                geoIpLookup: function(callback) {
                    fetch('https://ipapi.co/json/')
                        .then(response => response.json())
                        .then(data => callback(data.country_code))
                        .catch(() => callback(''));
                },
                separateDialCode: true,
                preferredCountries: ['US', 'GB', 'SA', 'AE'],
                utilsScript: 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.13/js/utils.min.js'
            });
        }
    }

    function formatCountry(country) {
        if (!country.id) return country.text;
        return $(`
            <span>
                <img src="https://flagcdn.com/16x12/${country.id.toLowerCase()}.png" class="country-flag" />
                ${country.text}
            </span>
        `);
    }

    window.selectPayment = function(method) {
        try {
            const currentCurrency = localStorage.getItem('currency') || 'USD';
            const selectedPlan = localStorage.getItem('selectedPlan') || 'Weekly Plan';
            const selectedPrice = localStorage.getItem('selectedPrice') || '$9.99';

            const modalContent = document.querySelector('.modal-content');
            if (!modalContent) return;

            modalContent.innerHTML = `
                <span class="close-modal" onclick="closeModal()">&times;</span>
                <button class="back-btn" onclick="handleBackButton()">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <h2>Enter Your Information</h2>
                <div class="user-info-form">
                    <div class="form-group">
                        <label for="fullName">Full Name</label>
                        <input type="text" id="fullName" placeholder="Enter your full name">
                        <div class="form-error" id="fullNameError">Please enter your full name</div>
                    </div>
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" placeholder="Enter your email">
                        <div class="form-error" id="emailError">Please enter a valid email</div>
                    </div>
                    <div class="form-group">
                        <label for="country">Country</label>
                        <select id="country" style="width: 100%"></select>
                        <div class="form-error" id="countryError">Please select your country</div>
                    </div>
                    <div class="form-group">
                        <label for="phone">Phone Number</label>
                        <input type="tel" id="phone">
                        <div class="form-error" id="phoneError">Please enter a valid phone number</div>
                    </div>
                    <button class="proceed-btn" onclick="proceedToPayment('${method}', '${selectedPlan}', '${selectedPrice}')">
                        <i class="fas fa-check"></i> Continue
                    </button>
                </div>
            `;
            
            initializeFormComponents();
        } catch (error) {
            console.error('Payment selection error:', error);
        }
    };

    function handleBackButton() {
        const currentCurrency = safeGetLocalStorage('currency', 'USD');
        
        if (currentCurrency === 'STARS') {
            // If in Stars payment mode, just close the modal
            closeModal();
        } else {
            // If in regular payment mode, return to payment options
            handleSubscription(new Event('click'));
        }
    }

    function proceedToPayment(method, plan, price) {
        const fullName = document.getElementById('fullName')?.value || '';
        const email = document.getElementById('email')?.value || '';
        const country = $('#country').select2('data')[0]?.text || '';
        const phoneInput = document.getElementById('phone');
        const phone = phoneInput && window.intlTelInput(phoneInput).getNumber() || '';

        if (!fullName || !email || !country || !phone) {
            alert('Please fill in all required fields');
            return;
        }

        const currentCurrency = safeGetLocalStorage('currency', 'USD');
        const modalContent = document.querySelector('.modal-content');
        if (!modalContent) return;

        if (currentCurrency === 'STARS') {
            modalContent.innerHTML = `
                <span class="close-modal" onclick="closeModal()">&times;</span>
                <div class="payment-processing">
                    <div class="loading-spinner"></div>
                    <h3>Processing Stars Payment...</h3>
                    <p>You will be redirected to Telegram to complete the payment with stars.</p>
                </div>
            `;

            const starsAmount = prices[plan].STARS;
            const message = encodeURIComponent(
                `New Stars Subscription Request\n\n` +
                `Customer Information:\n` +
                `- Full Name: ${fullName}\n` +
                `- Email: ${email}\n` +
                `- Country: ${country}\n` +
                `- Phone: ${phone}\n\n` +
                `Subscription Details:\n` +
                `- Plan: ${plan}\n` +
                `- Bot Version: ${localStorage.getItem('selectedBotVersion')}\n` +
                `- Price: ${starsAmount} Stars\n`
            );

            setTimeout(() => {
                window.open(`https://t.me/Binarjoinanelytic_bot?start=stars_${starsAmount}_${plan.toLowerCase().replace(' ', '_')}_${fullName}_${email}_${country}_${phone}`, '_blank');
                closeModal();
            }, 1500);
        } else {
            const message = encodeURIComponent(
                `New Subscription Request\n\n` +
                `Customer Information:\n` +
                `- Full Name: ${fullName}\n` +
                `- Email: ${email}\n` +
                `- Country: ${country}\n` +
                `- Phone: ${phone}\n\n` +
                `Subscription Details:\n` +
                `- Plan: ${plan}\n` +
                `- Bot Version: ${localStorage.getItem('selectedBotVersion')}\n` +
                `- Price: ${price}\n` +
                `- Payment Method: ${method}`
            );

            modalContent.innerHTML = `
                <span class="close-modal" onclick="closeModal()">&times;</span>
                <div class="payment-processing">
                    <div class="loading-spinner"></div>
                    <h3>Processing Your Request...</h3>
                </div>
            `;

            setTimeout(() => {
                window.open(`https://t.me/binarjoinanelytic_bot?text=${message}`, '_blank');
                closeModal();
            }, 1500);
        }
    }

    function toggleDarkMode() {
        const body = document.body;
        const darkModeIcon = document.getElementById('darkModeIcon');
        const chatIcon = document.getElementById('chatIcon');
        const chatIconVisible = document.getElementById('chatIconVisible');
        
        body.classList.toggle('dark-mode');
        if (body.classList.contains('dark-mode')) {
            darkModeIcon.innerHTML = `
                <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446A9 9 0 1 1 12 2.992z"/>
            `;
            if (chatIcon && chatIconVisible) {
                chatIcon.src = "/chatDarkMode .png";
                chatIconVisible.src = "/chatDarkMode .png";
            }
            localStorage.setItem('darkMode', 'enabled');
        } else {
            darkModeIcon.innerHTML = `
                <path d="M12 11.807A9.002 9.002 0 0 1 10.049 2a9.942 9.942 0 0 0-5.12 2.735c-3.905 3.905-3.905 10.237 0 14.142 3.906 3.906 10.237 3.905 14.143 0a9.946 9.946 0 0 0 2.735-5.119A9.003 9.003 0 0 1 12 11.807z"/>
            `;
            if (chatIcon && chatIconVisible) {
                chatIcon.src = "/chatLightmode .png";
                chatIconVisible.src = "/chatLightmode .png";
            }
            localStorage.setItem('darkMode', 'disabled');
        }
    }

    function showDisabledMessage(method) {
        const modalContent = document.querySelector('.modal-content');
        modalContent.innerHTML = `
            <span class="close-modal" onclick="closeModal()">&times;</span>
            <div class="payment-confirmation">
                <i class="fas fa-exclamation-circle" style="font-size: 4rem; color: #f59e0b; margin-bottom: 1rem;"></i>
                <h2>Payment Method Not Available</h2>
                <p>${method.charAt(0).toUpperCase() + method.slice(1)} payments are currently disabled.</p>
                <p>Please choose another payment method.</p>
                <button class="proceed-btn" onclick="returnToPaymentOptions()">Go Back</button>
            </div>
        `;
    }

    function returnToPaymentOptions() {
        const modalContent = document.querySelector('.modal-content');
        modalContent.innerHTML = `
            <span class="close-modal" onclick="closeModal()">&times;</span>
            <h2>Choose Payment Method</h2>
            
            <div class="tabs-container">
                <div class="payment-tab active" onclick="showTab('platforms')">Platforms</div>
                <div class="payment-tab" onclick="showTab('wallets')">Wallets</div>
                <div class="payment-tab" onclick="showTab('traditional')">Traditional</div>
            </div>

            <div id="platforms" class="payment-section active">
                <div class="payment-options">
                    <div class="payment-option" onclick="selectPayment('binance')">
                        <img src="images/binance.png" alt="Binance">
                        <div>Binance</div>
                    </div>
                    <div class="payment-option" onclick="selectPayment('okx')">
                        <img src="images/okx.png" alt="OKX">
                        <div>OKX</div>
                    </div>
                    <div class="payment-option" onclick="selectPayment('bybit')">
                        <img src="images/bybit.png" alt="BYBIT">
                        <div>BYBIT</div>
                    </div>
                </div>
            </div>

            <div id="wallets" class="payment-section">
                <div class="payment-options">
                    <div class="payment-option" onclick="selectPayment('trustwallet')">
                        <img src="images/trustwallet.png" alt="Trust Wallet">
                        <div>Trust Wallet</div>
                    </div>
                    <div class="payment-option" onclick="selectPayment('metamask')">
                        <img src="images/metamask.png" alt="MetaMask">
                        <div>MetaMask</div>
                    </div>
                    <div class="payment-option" onclick="selectPayment('okx-wallet')">
                        <img src="images/okx-wallet.png" alt="OKX Wallet">
                        <div>OKX Wallet</div>
                    </div>
                    <div class="payment-option" onclick="selectPayment('binance-wallet')">
                        <img src="images/binance-wallet.png" alt="Binance Wallet">
                        <div>Binance Wallet</div>
                    </div>
                    <div class="payment-option" onclick="selectPayment('bybit-wallet')">
                        <img src="images/bybit-wallet.png" alt="BYBIT Wallet">
                        <div>BYBIT Wallet</div>
                    </div>
                </div>
            </div>

            <div id="traditional" class="payment-section">
                <div class="payment-options">
                    <div class="payment-option disabled" onclick="showDisabledMessage('mastercard')">
                        <img src="images/mastercard.png" alt="Mastercard">
                        <div>Mastercard</div>
                    </div>
                    <div class="payment-option disabled" onclick="showDisabledMessage('googleplay')">
                        <img src="images/googleplay.png" alt="Google Play">
                        <div>Google Play</div>
                    </div>
                    <div class="payment-option disabled" onclick="showDisabledMessage('paypal')">
                        <img src="images/paypal.png" alt="PayPal">
                        <div>PayPal</div>
                    </div>
                    <div class="payment-option" onclick="selectPayment('westernunion')">
                        <img src="images/westernunion.png" alt="Western Union">
                        <div>Western Union</div>
                    </div>
                    <div class="payment-option" onclick="selectPayment('moneygram')">
                        <img src="images/moneygram.png" alt="MoneyGram">
                        <div>MoneyGram</div>
                    </div>
                </div>
            </div>
        `;
        showTab('platforms');
    }

    function showTab(tabName) {
        // Hide all payment sections
        const sections = document.querySelectorAll('.payment-section');
        sections.forEach(section => {
            section.classList.remove('active');
        });

        // Remove active class from all tabs
        const tabs = document.querySelectorAll('.payment-tab');
        tabs.forEach(tab => {
            tab.classList.remove('active');
        });

        // Show selected section and activate tab
        document.getElementById(tabName).classList.add('active');
        document.querySelector(`.payment-tab[onclick="showTab('${tabName}')"]`).classList.add('active');
    }

    function toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.toggle('active');

        // Optional: Close sidebar when clicking outside
        if (sidebar.classList.contains('active')) {
            document.addEventListener('click', closeSidebarOnClickOutside);
        } else {
            document.removeEventListener('click', closeSidebarOnClickOutside);
        }
    }

    function closeSidebarOnClickOutside(event) {
        const sidebar = document.querySelector('.sidebar');
        const menuToggle = document.querySelector('.menu-toggle');
        
        if (!sidebar.contains(event.target) && event.target !== menuToggle) {
            sidebar.classList.remove('active');
            document.removeEventListener('click', closeSidebarOnClickOutside);
        }
    }

    window.toggleChat = function() {
        if (window.botpressWebChat) {
            if (window.botpressWebChat.isVisible) {
                window.botpressWebChat.hideChat();
            } else {
                window.botpressWebChat.showChat();
            }
        }
    }

    function sendMessage() {
        const messageInput = document.getElementById('messageInput');
        if (!messageInput) return;

        const message = messageInput.value.trim();
        if (!message) return;

        const chatMessages = document.querySelector('.chat-messages');
        if (!chatMessages) return;

        // Create and append sent message
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'sent');
        messageElement.innerHTML = `
            <div class="message-content">${message}</div>
            <div class="message-time">${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
        `;
        chatMessages.appendChild(messageElement);

        // Clear input
        messageInput.value = '';

        // Optionally, scroll to bottom of messages
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Redirect to Telegram
        setTimeout(() => {
            window.open('https://t.me/Binarjoinanelytic_bot', '_blank');
        }, 500);
    }
});
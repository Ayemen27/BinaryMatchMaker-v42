from aiogram import Router, F, Bot, Dispatcher
import logging
import asyncio
import sys
from aiogram.filters import Command
from aiogram.types import (
    Message, 
    LabeledPrice, 
    PreCheckoutQuery,
    ContentType,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo
)
import os
from dotenv import load_dotenv
import json

# تحميل متغيرات البيئة
load_dotenv()
TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")  # استخدام التوكن الموجود في ملف .env

# التأكد من وجود التوكن
if not TELEGRAM_TOKEN:
    print("خطأ: لم يتم العثور على توكن بوت تلجرام في ملف .env")
    sys.exit(1)

# إنشاء البوت والموجه
bot = Bot(token=TELEGRAM_TOKEN)
dp = Dispatcher()
router = Router()

# خطط الاشتراك وأسعارها
subscription_plans = {
    "weekly": {
        "name": "الخطة الأسبوعية",
        "description": "تحليل أساسي للسوق في الوقت الحقيقي",
        "price": 750,  # عدد النجوم
        "period": "أسبوع واحد"
    },
    "monthly": {
        "name": "الخطة الشهرية",
        "description": "تحليل فني متقدم للسوق + إشارات تداول",
        "price": 2300,  # عدد النجوم
        "period": "شهر كامل"
    },
    "annual": {
        "name": "الخطة السنوية",
        "description": "تحليل مدعوم بالذكاء الاصطناعي + استراتيجيات مخصصة",
        "price": 10000,  # عدد النجوم
        "period": "سنة كاملة"
    },
    "premium": {
        "name": "خطة BinarJoin V.4.1",
        "description": "أحدث إصدار مع تحليل متطور وإشارات دقيقة",
        "price": 18500,  # عدد النجوم
        "period": "سنة كاملة"
    }
}

# رابط التطبيق المصغر (يمكن تغييره للرابط الصحيح)
WEBAPP_URL = os.getenv("TELEGRAM_WEBHOOK_URL", "https://46afa584-d357-4ea0-aff1-36e9a50df1fd-00-2b7eh3kmfrdmi.pike.replit.dev")

# استقبال رسائل بداية المحادثة
@router.message(Command('start'))
async def cmd_start(message: Message):
    """معالجة أمر /start وعرض زر التطبيق المصغر"""
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="🔥 الاشتراك في خدمات BinarJoin 🔥", 
            web_app=WebAppInfo(url=WEBAPP_URL)
        )]
    ])
    
    await message.answer(
        "👋 مرحباً بك في بوت BinarJoin Analytics!\n\n"
        "💰 اختر خطة الاشتراك المناسبة واستمتع بتحليلات السوق المتقدمة\n"
        "🌟 الدفع متاح عبر نجوم تلجرام بشكل سهل وسريع\n\n"
        "اضغط على الزر أدناه للاطلاع على الخطط والاشتراك:",
        reply_markup=keyboard
    )

# إظهار الخطط عبر الأوامر المباشرة
@router.message(Command('plans'))
async def cmd_plans(message: Message):
    """عرض قائمة الخطط المتاحة مع أزرار للاشتراك"""
    # إنشاء أزرار للخطط
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=f"{plan['name']} - {plan['price']} ⭐️", callback_data=f"plan_{plan_id}")]
        for plan_id, plan in subscription_plans.items()
    ])
    
    await message.answer(
        "📋 خطط الاشتراك المتاحة في BinarJoin Analytics:\n\n"
        "اختر الخطة المناسبة لك من القائمة أدناه:",
        reply_markup=keyboard
    )

# معالجة اختيار الخطة من الأزرار
@router.callback_query(lambda c: c.data.startswith('plan_'))
async def process_plan_selection(callback_query):
    """معالجة اختيار خطة عبر زر الرد"""
    plan_id = callback_query.data.split('_')[1]
    
    if plan_id in subscription_plans:
        plan = subscription_plans[plan_id]
        await bot.answer_callback_query(callback_query.id)
        
        # إرسال فاتورة الدفع
        await send_payment_invoice(
            callback_query.from_user.id, 
            plan, 
            f"BinarJoin Analytics - {plan['name']}", 
            f"direct_{plan_id}_{callback_query.from_user.id}"
        )
    else:
        await bot.answer_callback_query(
            callback_query.id,
            "عذراً، الخطة غير متوفرة حالياً. يرجى اختيار خطة أخرى.",
            show_alert=True
        )

# معالجة البيانات من التطبيق المصغر
@router.message(F.web_app_data)
async def process_webapp_data(message: Message):
    """معالجة البيانات المرسلة من التطبيق المصغر"""
    try:
        # استخراج البيانات
        data = json.loads(message.web_app_data.data)
        
        # طباعة البيانات للتصحيح
        logging.info(f"بيانات التطبيق المصغر المستلمة: {data}")
        
        # التحقق من طلب الدفع
        if data.get('action') == 'process_stars_payment':
            plan_id = data.get('planId')
            bot_version = data.get('botVersion', "الإصدار الافتراضي")
            
            # التحقق من وجود الخطة
            if plan_id in subscription_plans:
                plan = subscription_plans[plan_id]
                
                # إرسال فاتورة الدفع
                await send_payment_invoice(
                    message.chat.id, 
                    plan, 
                    bot_version, 
                    f"webapp_{plan_id}_{message.from_user.id}"
                )
            else:
                await message.answer("⚠️ عذراً، الخطة غير متوفرة. يرجى اختيار خطة صالحة.")
        else:
            await message.answer(
                "✅ تم استلام بياناتك بنجاح!\n"
                "سيتم معالجتها والرد عليك قريباً."
            )
    except Exception as e:
        logging.error(f"خطأ في معالجة بيانات التطبيق المصغر: {e}")
        await message.answer("❌ حدث خطأ في معالجة طلبك. يرجى المحاولة مرة أخرى.")

# أوامر اختصارات لإرسال فواتير الدفع مباشرة
@router.message(Command('weekly'))
async def cmd_weekly(message: Message):
    """إرسال فاتورة للخطة الأسبوعية"""
    await send_payment_invoice(
        message.chat.id,
        subscription_plans["weekly"],
        "BinarJoin Analytics - Weekly Plan",
        f"cmd_weekly_{message.from_user.id}"
    )

@router.message(Command('monthly'))
async def cmd_monthly(message: Message):
    """إرسال فاتورة للخطة الشهرية"""
    await send_payment_invoice(
        message.chat.id,
        subscription_plans["monthly"],
        "BinarJoin Analytics - Monthly Plan",
        f"cmd_monthly_{message.from_user.id}"
    )

@router.message(Command('annual'))
async def cmd_annual(message: Message):
    """إرسال فاتورة للخطة السنوية"""
    await send_payment_invoice(
        message.chat.id,
        subscription_plans["annual"],
        "BinarJoin Analytics - Annual Plan",
        f"cmd_annual_{message.from_user.id}"
    )

@router.message(Command('premium'))
async def cmd_premium(message: Message):
    """إرسال فاتورة للخطة المتميزة"""
    await send_payment_invoice(
        message.chat.id,
        subscription_plans["premium"],
        "BinarJoin Analytics - Premium Plan",
        f"cmd_premium_{message.from_user.id}"
    )

# إرسال فاتورة الدفع بالنجوم
async def send_payment_invoice(chat_id, plan, bot_version, payment_id):
    """إرسال فاتورة دفع بنجوم تلجرام"""
    try:
        await bot.send_invoice(
            chat_id=chat_id,
            title=f"{plan['name']}",
            description=f"{plan['description']}\nالإصدار: {bot_version}\nالمدة: {plan['period']}",
            payload=f"payment_{payment_id}",
            currency="XTR",  # XTR رمز نجوم تلجرام
            prices=[
                LabeledPrice(label=f"{plan['name']}", amount=plan['price']),
            ],
        )
        logging.info(f"تم إرسال فاتورة الدفع بنجاح: {plan['name']} إلى المستخدم {chat_id}")
    except Exception as e:
        logging.error(f"خطأ في إرسال فاتورة الدفع: {e}")
        await bot.send_message(
            chat_id=chat_id,
            text="❌ حدث خطأ أثناء إنشاء فاتورة الدفع. يرجى المحاولة مرة أخرى لاحقاً."
        )

# التحقق من الدفع
@router.pre_checkout_query()
async def process_pre_checkout_query(pre_checkout_query: PreCheckoutQuery):
    """معالجة استعلام ما قبل إتمام الدفع"""
    # يمكن هنا إضافة منطق للتحقق من صحة الطلب قبل الموافقة
    try:
        await bot.answer_pre_checkout_query(pre_checkout_query.id, ok=True)
        logging.info(f"تمت الموافقة على استعلام ما قبل الدفع: {pre_checkout_query.id}")
    except Exception as e:
        logging.error(f"خطأ في معالجة استعلام ما قبل الدفع: {e}")
        await bot.answer_pre_checkout_query(
            pre_checkout_query.id,
            ok=False,
            error_message="حدث خطأ أثناء معالجة طلب الدفع. يرجى المحاولة مرة أخرى."
        )

# معالجة الدفع الناجح
@router.message(F.successful_payment)
async def process_successful_payment(message: Message):
    """معالجة الدفع الناجح بنجوم تلجرام"""
    payment_info = message.successful_payment
    
    # استخراج معلومات الدفع
    try:
        payload_parts = payment_info.invoice_payload.split('_')
        payment_type = payload_parts[1] if len(payload_parts) > 1 else "غير معروف"
        
        # إرسال تأكيد الدفع
        await message.answer(
            f"✅ تم الدفع بنجاح!\n\n"
            f"💰 المبلغ: {payment_info.total_amount} نجمة\n"
            f"📋 معرف المعاملة: {payment_info.telegram_payment_charge_id}\n\n"
            f"🎉 سيتم تفعيل اشتراكك فوراً. شكراً لثقتك! 🌟"
        )
        
        # تسجيل نجاح المعاملة
        logging.info(
            f"دفع ناجح - المستخدم: {message.from_user.id} - "
            f"المبلغ: {payment_info.total_amount} - "
            f"نوع الاشتراك: {payment_type} - "
            f"معرف المعاملة: {payment_info.telegram_payment_charge_id}"
        )
        
        # هنا يمكن إضافة منطق تحديث حالة المستخدم في قاعدة البيانات
        # await update_user_subscription(...)
        
    except Exception as e:
        logging.error(f"خطأ في معالجة الدفع الناجح: {e}")
        await message.answer("✅ تم استلام الدفع، لكن حدث خطأ في معالجة تفاصيل الاشتراك. سيتم التواصل معك قريباً.")

# معالجة أي رسائل أخرى
@router.message()
async def process_other_messages(message: Message):
    """معالجة الرسائل العادية"""
    # تجاهل رسائل معينة مثل الرسائل الداخلية
    if message.is_automatic_forward or message.forward_date:
        return
    
    # إنشاء لوحة مفاتيح مع زر التطبيق
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="🔍 عرض الخطط المتاحة", 
            web_app=WebAppInfo(url=WEBAPP_URL)
        )],
        [InlineKeyboardButton(
            text="📋 قائمة الأوامر", 
            callback_data="show_commands"
        )]
    ])
    
    await message.answer(
        f"مرحباً {message.from_user.first_name}،\n\n"
        "يمكنك استخدام الأوامر التالية:\n"
        "/start - بدء التفاعل مع البوت\n"
        "/plans - عرض خطط الاشتراك\n"
        "/weekly - شراء الخطة الأسبوعية\n"
        "/monthly - شراء الخطة الشهرية\n"
        "/annual - شراء الخطة السنوية\n"
        "/premium - شراء الخطة المتميزة\n\n"
        "أو يمكنك استخدام زر 'عرض الخطط المتاحة' أدناه:",
        reply_markup=keyboard
    )

# معالجة ضغط زر عرض الأوامر
@router.callback_query(lambda c: c.data == "show_commands")
async def show_commands(callback_query):
    """عرض قائمة الأوامر المتاحة"""
    await bot.answer_callback_query(callback_query.id)
    
    await bot.send_message(
        callback_query.from_user.id,
        "📝 قائمة الأوامر المتاحة:\n\n"
        "/start - بدء التفاعل مع البوت\n"
        "/plans - عرض خطط الاشتراك\n"
        "/weekly - شراء الخطة الأسبوعية (750 ⭐️)\n"
        "/monthly - شراء الخطة الشهرية (2300 ⭐️)\n"
        "/annual - شراء الخطة السنوية (10000 ⭐️)\n"
        "/premium - شراء الخطة المتميزة (18500 ⭐️)"
    )

# وظيفة تحديث اشتراك المستخدم في قاعدة البيانات (مثال)
async def update_user_subscription(user_id, plan_id, transaction_id, amount):
    """تحديث حالة اشتراك المستخدم في قاعدة البيانات"""
    # هنا يمكنك إضافة منطق التحديث في قاعدة البيانات
    logging.info(f"تم تحديث اشتراك المستخدم {user_id} للخطة {plan_id} بقيمة {amount} نجمة")
    # مثال: await db.update_subscription(user_id, plan_id, transaction_id, amount)

# الدالة الرئيسية لتشغيل البوت
async def main():
    """تشغيل البوت"""
    # إعداد التوجيه
    dp.include_router(router)
    
    # تشغيل البوت
    try:
        print("🤖 جاري تشغيل بوت BinarJoin للدفع بنجوم تلجرام...")
        await dp.start_polling(bot)
    except Exception as e:
        logging.error(f"خطأ في تشغيل البوت: {e}")
        print(f"❌ حدث خطأ أثناء تشغيل البوت: {e}")

# تنفيذ البرنامج
if __name__ == "__main__":
    # إعداد التسجيل
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    
    # تشغيل البوت
    try:
        print("🚀 بدء تشغيل بوت BinarJoin للدفع بنجوم تلجرام")
        asyncio.run(main())
    except KeyboardInterrupt:
        print("⛔ تم إيقاف البوت بواسطة المستخدم")
    except Exception as e:
        print(f"❌ حدث خطأ غير متوقع: {e}")
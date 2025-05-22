from aiogram import Bot, Dispatcher, Router, F
import logging
import asyncio
from aiogram.filters import Command
from aiogram.types import (
    Message, 
    LabeledPrice, 
    PreCheckoutQuery,
    SuccessfulPayment
)
from dotenv import load_dotenv
import os
import json
import re

# تحميل متغيرات البيئة
load_dotenv()

# الحصول على توكن البوت من متغيرات البيئة
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
if not BOT_TOKEN:
    raise ValueError("لم يتم العثور على TELEGRAM_BOT_TOKEN في ملف .env")

# أسعار الخطط بالنجوم
PLAN_PRICES = {
    "weekly": 750,
    "monthly": 2300,
    "annual": 10000,
    "premium": 18500
}

# معالج الخطأ للسجلات
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("نظام دفع نجوم تلجرام")

# إنشاء البوت والمرسل
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()
router = Router()

# معالجة أمر البدء
@router.message(Command('start'))
async def handle_start(message: Message):
    try:
        # التحقق إذا كان أمر البدء يحتوي على معلومات الدفع
        command_text = message.text
        pay_match = re.search(r'/start pay_(\w+)_(\d+)_(\d+)_(\w+)', command_text)
        
        if pay_match:
            # استخراج معلومات الدفع من الأمر
            plan_type = pay_match.group(1)
            stars_amount = int(pay_match.group(2))
            user_id = pay_match.group(3)
            username = pay_match.group(4)
            
            logger.info(f"معالجة طلب دفع: الخطة={plan_type}, النجوم={stars_amount}, المستخدم={username}")
            
            # التأكد من وجود الخطة والسعر
            if plan_type in PLAN_PRICES:
                # تأكد من أن المبلغ صحيح
                plan_price = PLAN_PRICES[plan_type]
                if stars_amount == plan_price:
                    # إنشاء فاتورة الدفع
                    await create_payment_invoice(message, plan_type, stars_amount, user_id, username)
                    return
                else:
                    logger.warning(f"سعر الخطة غير متطابق: متوقع={plan_price}, مستلم={stars_amount}")
            else:
                logger.warning(f"نوع الخطة غير معروف: {plan_type}")
        
        # رسالة ترحيب عادية إذا لم يكن هناك طلب دفع
        await message.answer(
            "👋 مرحبًا بك في بوت BinarJoin Analytics للدفع!\n\n"
            "هذا البوت مخصص لإدارة اشتراكات منصة BinarJoin Analytics.\n"
            "للاشتراك، يرجى زيارة صفحة الاشتراكات في المنصة واختيار الخطة المناسبة لك."
        )
    except Exception as e:
        logger.error(f"خطأ في معالجة أمر البدء: {e}")
        await message.answer("حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى لاحقًا.")

# إنشاء فاتورة دفع النجوم
async def create_payment_invoice(message, plan_type, stars_amount, user_id, username):
    try:
        plan_descriptions = {
            "weekly": "خطة اشتراك أسبوعية في منصة BinarJoin Analytics",
            "monthly": "خطة اشتراك شهرية في منصة BinarJoin Analytics",
            "annual": "خطة اشتراك سنوية في منصة BinarJoin Analytics",
            "premium": "خطة اشتراك مميزة في منصة BinarJoin Analytics"
        }
        
        plan_titles = {
            "weekly": "الاشتراك الأسبوعي",
            "monthly": "الاشتراك الشهري",
            "annual": "الاشتراك السنوي",
            "premium": "الاشتراك المميز"
        }
        
        # إنشاء وصف للفاتورة
        title = plan_titles.get(plan_type, "اشتراك BinarJoin Analytics")
        description = plan_descriptions.get(plan_type, "اشتراك في منصة BinarJoin Analytics للتحليل الفني")
        
        # إنشاء البيانات التي سيتم إرسالها مع الفاتورة
        payload = json.dumps({
            "planType": plan_type,
            "userId": user_id,
            "username": username,
            "paymentMethod": "telegram_stars"
        })
        
        logger.info(f"إنشاء فاتورة دفع: {title}, {stars_amount} نجمة")
        
        # إرسال الفاتورة للمستخدم
        await message.answer_invoice(
            title=title,
            description=description,
            payload=payload,
            provider_token="",  # لا حاجة لتوكن المزود عند استخدام نجوم تلجرام
            currency="XTR",  # رمز العملة لنجوم تلجرام
            prices=[
                LabeledPrice(label=title, amount=stars_amount)
            ],
            start_parameter=f"pay_{plan_type}_{stars_amount}"
        )
    except Exception as e:
        logger.error(f"خطأ في إنشاء فاتورة الدفع: {e}")
        await message.answer("حدث خطأ أثناء إنشاء فاتورة الدفع. يرجى المحاولة مرة أخرى لاحقًا.")

# معالجة طلبات التحقق من الدفع
@router.pre_checkout_query()
async def process_pre_checkout(pre_checkout_query: PreCheckoutQuery):
    try:
        logger.info(f"التحقق من الدفع قبل الإتمام: {pre_checkout_query.id}")
        
        # هنا يمكنك إضافة منطق إضافي للتحقق إذا لزم الأمر
        # مثل التأكد من توفر المنتج أو التحقق من البيانات
        
        # الموافقة على طلب الدفع
        await bot.answer_pre_checkout_query(pre_checkout_query.id, ok=True)
    except Exception as e:
        logger.error(f"خطأ في معالجة طلب التحقق من الدفع: {e}")
        await bot.answer_pre_checkout_query(
            pre_checkout_query.id,
            ok=False,
            error_message="حدث خطأ أثناء معالجة الدفع. يرجى المحاولة مرة أخرى لاحقًا."
        )

# معالجة عمليات الدفع الناجحة
@router.message(F.successful_payment)
async def process_successful_payment(message: Message):
    try:
        payment = message.successful_payment
        logger.info(f"تم استلام دفع ناجح: {payment.telegram_payment_charge_id}")
        
        # استخراج بيانات الدفع
        payment_data = json.loads(payment.invoice_payload)
        plan_type = payment_data.get("planType")
        user_id = payment_data.get("userId")
        username = payment_data.get("username")
        
        # إرسال تأكيد للمستخدم
        await message.answer(
            f"✅ تم الدفع بنجاح!\n\n"
            f"• الخطة: {plan_type}\n"
            f"• المبلغ: {payment.total_amount} نجمة\n"
            f"• معرف المعاملة: {payment.telegram_payment_charge_id}\n\n"
            f"تم تفعيل اشتراكك بنجاح في منصة BinarJoin Analytics."
        )
        
        # هنا يمكنك إضافة منطق لتحديث الاشتراك في قاعدة البيانات
        # مثل تحديث حالة الاشتراك وتاريخ انتهائه
        logger.info(f"تم تفعيل اشتراك المستخدم: {username}, الخطة: {plan_type}")
        
        # TODO: أضف هنا استدعاء API لتحديث حالة الاشتراك
        
    except Exception as e:
        logger.error(f"خطأ في معالجة الدفع الناجح: {e}")
        await message.answer("تم استلام الدفع بنجاح، ولكن حدث خطأ أثناء تحديث اشتراكك. سيتم التواصل معك قريبًا.")

# تشغيل البوت
async def main():
    logger.info("بدء تشغيل بوت دفع نجوم تلجرام")
    dp.include_router(router)
    await dp.start_polling(bot)
    
if __name__ == "__main__":
    try:
        logger.info("بوت دفع نجوم تلجرام قيد التشغيل")
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("تم إيقاف البوت")
    except Exception as e:
        logger.error(f"حدث خطأ غير متوقع: {e}")
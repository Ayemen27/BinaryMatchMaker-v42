from aiogram import Router, F, Bot, Dispatcher
import logging
import asyncio
import sys
import os
from aiogram.filters import Command, CommandStart
from aiogram.types import (
    Message, 
    LabeledPrice, 
    PreCheckoutQuery,
)
from dotenv import load_dotenv

# تحميل متغيرات البيئة
load_dotenv()

# الحصول على توكن البوت من متغيرات البيئة
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
if not TOKEN:
    print("خطأ: لم يتم العثور على توكن البوت في ملف .env")
    sys.exit(1)

bot = Bot(token=TOKEN)
dp = Dispatcher()

router = Router()

# قاموس لتخزين أسعار الخطط
PLAN_PRICES = {
    "weekly": 750,
    "monthly": 2300,
    "annual": 10000,
    "premium": 18500
}

@router.message(CommandStart())
async def handle_start(msg: Message):
    # التحقق من وجود معلمات في أمر البدء
    start_param = msg.text.split()
    
    if len(start_param) > 1 and start_param[1].startswith("pay_"):
        # استخراج معلومات الدفع من معلمة البدء
        try:
            _, plan_type, stars_amount = start_param[1].split("_")
            stars_amount = int(stars_amount)
            await process_payment(msg, plan_type, stars_amount)
        except (ValueError, IndexError):
            await msg.answer("حدث خطأ في معالجة معلمات الدفع. الرجاء المحاولة مرة أخرى.")
    else:
        # رسالة ترحيب افتراضية
        await msg.answer(
            "مرحبًا بك في بوت دفع النجوم لـ BinarJoin Analytics! 🌟\n\n"
            "استخدم الأمر /pay <نوع_الخطة> <عدد_النجوم> للبدء في عملية الدفع.\n"
            "مثال: /pay weekly 750\n\n"
            "الخطط المتاحة:\n"
            "- weekly: 750 نجمة\n"
            "- monthly: 2300 نجمة\n"
            "- annual: 10000 نجمة\n"
            "- premium: 18500 نجمة"
        )

@router.message(Command('pay'))
async def pay_command(msg: Message):
    # استخراج معلومات الخطة وعدد النجوم من الأمر
    command_parts = msg.text.split()
    
    if len(command_parts) < 3:
        await msg.answer(
            "الرجاء تحديد نوع الخطة وعدد النجوم.\n"
            "مثال: /pay weekly 750"
        )
        return
    
    plan_type = command_parts[1].lower()
    
    try:
        stars_amount = int(command_parts[2])
    except ValueError:
        await msg.answer("عدد النجوم يجب أن يكون رقمًا صحيحًا.")
        return
    
    await process_payment(msg, plan_type, stars_amount)

async def process_payment(msg: Message, plan_type: str, stars_amount: int):
    """معالجة عملية الدفع وإرسال فاتورة للمستخدم"""
    
    # التحقق من صحة نوع الخطة
    if plan_type not in PLAN_PRICES:
        await msg.answer(
            "نوع الخطة غير صالح. الخطط المتاحة هي:\n"
            "- weekly\n"
            "- monthly\n"
            "- annual\n"
            "- premium"
        )
        return
    
    # عناوين الخطط بالعربية
    plan_titles = {
        "weekly": "اشتراك أسبوعي",
        "monthly": "اشتراك شهري",
        "annual": "اشتراك سنوي",
        "premium": "اشتراك بريميوم"
    }
    
    # التحقق من صحة عدد النجوم
    expected_stars = PLAN_PRICES[plan_type]
    if stars_amount != expected_stars:
        await msg.answer(
            f"عدد النجوم غير صحيح للخطة {plan_type}.\n"
            f"العدد المطلوب هو {expected_stars} نجمة."
        )
        return
    
    # إنشاء وصف الفاتورة
    plan_description = {
        "weekly": "اشتراك أسبوعي في BinarJoin Analytics - تحليلات متقدمة وإشارات تداول لمدة أسبوع",
        "monthly": "اشتراك شهري في BinarJoin Analytics - تحليلات متقدمة وإشارات تداول لمدة شهر",
        "annual": "اشتراك سنوي في BinarJoin Analytics - تحليلات متقدمة وإشارات تداول لمدة سنة",
        "premium": "اشتراك بريميوم في BinarJoin Analytics - جميع الميزات المتقدمة لمدة سنة"
    }
    
    # إنشاء معرف فريد للدفع
    payment_id = f"bj_{plan_type}_{msg.from_user.id}_{int(asyncio.get_event_loop().time())}"
    
    # إرسال فاتورة الدفع
    try:
        await msg.answer_invoice(
            title=plan_titles.get(plan_type, f"اشتراك {plan_type}"),
            description=plan_description.get(plan_type, "اشتراك في خدمة BinarJoin Analytics"),
            payload=payment_id,
            provider_token=TOKEN,
            currency="XTR",  # رمز عملة نجوم تليجرام
            prices=[
                LabeledPrice(label=f"اشتراك {plan_type}", amount=stars_amount),
            ],
            start_parameter=f"payment_{plan_type}_{stars_amount}"
        )
        
        # إرسال تعليمات إضافية للمستخدم
        await msg.answer(
            "تم إنشاء فاتورة الدفع. يرجى إكمال عملية الدفع خلال الفاتورة أعلاه.\n"
            "بعد إتمام الدفع، سيتم تفعيل اشتراكك تلقائيًا."
        )
    except Exception as e:
        logging.error(f"خطأ في إنشاء فاتورة الدفع: {e}")
        await msg.answer("حدث خطأ أثناء إنشاء فاتورة الدفع. الرجاء المحاولة مرة أخرى لاحقًا.")


@router.pre_checkout_query()
async def checkout_handler(checkout_query: PreCheckoutQuery):
    """التحقق من صحة عملية الدفع قبل إتمامها"""
    try:
        # يمكن إضافة تحققات إضافية هنا قبل قبول الدفع
        
        # قبول عملية الدفع
        await checkout_query.answer(ok=True)
        
        logging.info(f"تم قبول عملية الدفع: {checkout_query.id}")
    except Exception as e:
        logging.error(f"خطأ في معالجة التحقق من الدفع: {e}")
        await checkout_query.answer(ok=False, error_message="حدث خطأ أثناء معالجة الدفع. الرجاء المحاولة مرة أخرى.")


@router.message(F.successful_payment)
async def handle_successful_payment(msg: Message):
    """معالجة الدفع الناجح"""
    try:
        payment_info = msg.successful_payment
        payload = payment_info.invoice_payload
        
        # استخراج معلومات الخطة من معرف الدفع
        _, plan_type, user_id, _ = payload.split("_")
        
        # إرسال تأكيد نجاح الدفع للمستخدم
        await msg.answer(
            f"🎉 تم استلام دفعة {payment_info.total_amount} نجمة بنجاح!\n\n"
            f"معرف المعاملة: {payment_info.telegram_payment_charge_id}\n"
            f"نوع الخطة: {plan_type}\n\n"
            "سيتم تفعيل اشتراكك خلال دقائق. شكرًا لاختيارك BinarJoin Analytics!"
        )
        
        # هنا يمكن إضافة منطق لتحديث اشتراك المستخدم في قاعدة البيانات
        # مثل إرسال طلب إلى واجهة برمجة التطبيق الخاصة بالخادم
        
        logging.info(f"دفع ناجح: {payload} - المستخدم: {msg.from_user.id} - المبلغ: {payment_info.total_amount}")
        
    except Exception as e:
        logging.error(f"خطأ في معالجة الدفع الناجح: {e}")
        await msg.answer("تم استلام الدفع، ولكن حدث خطأ في معالجة تفعيل الاشتراك. سيتواصل فريق الدعم معك قريبًا.")


@router.message(Command('help'))
async def help_command(msg: Message):
    """إرسال رسالة مساعدة"""
    await msg.answer(
        "📝 كيفية استخدام بوت دفع النجوم:\n\n"
        "1. استخدم الأمر /pay <نوع_الخطة> <عدد_النجوم> للبدء في عملية الدفع.\n"
        "   مثال: /pay weekly 750\n\n"
        "2. اضغط على زر الدفع في الفاتورة التي سيتم إرسالها.\n\n"
        "3. أكمل عملية الدفع باستخدام نجوم تليجرام.\n\n"
        "4. بعد نجاح الدفع، سيتم تفعيل اشتراكك تلقائيًا.\n\n"
        "الخطط المتاحة:\n"
        "- weekly: 750 نجمة (أسبوعي)\n"
        "- monthly: 2300 نجمة (شهري)\n"
        "- annual: 10000 نجمة (سنوي)\n"
        "- premium: 18500 نجمة (بريميوم)\n\n"
        "إذا واجهت أي مشكلة، يرجى التواصل مع فريق الدعم."
    )


async def main():
    """تشغيل البوت"""
    dp.include_router(router)
    await dp.start_polling(bot)


if __name__ == '__main__':
    print('تم بدء تشغيل بوت دفع النجوم')
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('تم إيقاف البوت')
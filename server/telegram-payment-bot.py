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
    ParseMode,
    InlineKeyboardMarkup,
    InlineKeyboardButton
)
import os
from dotenv import load_dotenv
import json

# تحميل متغيرات البيئة
load_dotenv()
TOKEN = os.getenv("TELEGRAM_TOKEN")

bot = Bot(token=TOKEN)
dp = Dispatcher()

router = Router()
provider_token = os.getenv("STRIPE_TOKEN") # لا يلزم لدفعات النجوم

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

# استقبال رسائل من التطبيق المصغر
@router.message(F.web_app_data)
async def process_webapp_data(message: Message):
    try:
        # استخراج البيانات من التطبيق المصغر
        data = json.loads(message.web_app_data.data)
        
        # التحقق من طلب الدفع
        if data.get('action') == 'process_stars_payment':
            plan_id = data.get('planId')
            bot_version = data.get('botVersion')
            
            # التحقق من وجود الخطة
            if plan_id in subscription_plans:
                plan = subscription_plans[plan_id]
                await send_payment_invoice(message.chat.id, plan, bot_version, data.get('paymentId'))
            else:
                await message.answer("عذراً، الخطة غير متوفرة.")
        else:
            await message.answer("عملية غير معروفة. الرجاء المحاولة مرة أخرى.")
            
    except Exception as e:
        logging.error(f"خطأ في معالجة بيانات التطبيق المصغر: {e}")
        await message.answer("حدث خطأ في معالجة طلبك. الرجاء المحاولة مرة أخرى.")


# إرسال فاتورة الدفع بالنجوم
async def send_payment_invoice(chat_id, plan, bot_version, payment_id):
    await bot.send_invoice(
        chat_id=chat_id,
        title=f"{plan['name']}",
        description=f"{plan['description']}\nالإصدار: {bot_version}\nالمدة: {plan['period']}",
        payload=f"payment_{payment_id}_{plan['name']}",
        currency="XTR",  # XTR رمز نجوم تلجرام
        prices=[
            LabeledPrice(label=f"{plan['name']}", amount=plan['price']),
        ],
    )


@router.message(Command('start'))
async def start_command(message: Message):
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="فتح التطبيق", web_app={"url": "https://YOUR_WEB_APP_URL"})]
    ])
    
    await message.answer(
        "أهلاً بك في BinarJoin Analytics Bot! 👋\n\n"
        "الرجاء استخدام التطبيق أدناه لاختيار خطة الاشتراك المناسبة لك.",
        reply_markup=keyboard
    )


@router.message(Command('weekly'))
async def weekly_invoice(message: Message):
    plan = subscription_plans["weekly"]
    await send_payment_invoice(message.chat.id, plan, "BinarJoinAnalytic Main v2.0", f"test_{message.from_user.id}")


@router.message(Command('monthly'))
async def monthly_invoice(message: Message):
    plan = subscription_plans["monthly"]
    await send_payment_invoice(message.chat.id, plan, "BinarJoinAnalytic AI v3.0", f"test_{message.from_user.id}")


@router.message(Command('annual'))
async def annual_invoice(message: Message):
    plan = subscription_plans["annual"]
    await send_payment_invoice(message.chat.id, plan, "BinarJoinAnalytic AI v3.0", f"test_{message.from_user.id}")


@router.message(Command('premium'))
async def premium_invoice(message: Message):
    plan = subscription_plans["premium"]
    await send_payment_invoice(message.chat.id, plan, "BinarJoinAnalytic V.4.1", f"test_{message.from_user.id}")


# التحقق من الدفع
@router.pre_checkout_query()
async def checkout_handler(checkout_query: PreCheckoutQuery):
    await checkout_query.answer(ok=True)


# معالجة الدفع الناجح
@router.message(F.successful_payment)
async def successful_payment(message: Message):
    payment_info = message.successful_payment
    
    # استخراج معلومات الدفع من الـ payload
    payload_parts = payment_info.invoice_payload.split('_')
    
    await message.answer(
        f"✅ تم الدفع بنجاح!\n\n"
        f"💰 المبلغ: {payment_info.total_amount} نجمة\n"
        f"📋 معرف المعاملة: {payment_info.telegram_payment_charge_id}\n\n"
        f"سيتم تفعيل اشتراكك خلال دقائق. شكراً لك! 🌟"
    )
    
    # هنا يمكنك إضافة كود لتحديث حالة المستخدم في قاعدة البيانات
    # وتفعيل الميزات المدفوعة
    
    # مثال:
    # await update_user_subscription(message.from_user.id, plan_type, payment_info.telegram_payment_charge_id)


# وظيفة تحديث اشتراك المستخدم (مثال)
async def update_user_subscription(user_id, plan_type, transaction_id):
    # هنا يمكنك إضافة كود للتواصل مع قاعدة البيانات
    # وتحديث حالة اشتراك المستخدم
    pass


async def main():
    dp.include_router(router)
    await dp.start_polling(bot)


if __name__ == '__main__':
    print('bot online - نظام دفع نجوم تلجرام جاهز للعمل')
    logging.basicConfig(level=logging.INFO)
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('disconnected - تم إيقاف البوت')
import logging
import os
from dotenv import load_dotenv
from telegram import Update, LabeledPrice
from telegram.ext import Application, CommandHandler, MessageHandler, filters, PreCheckoutQueryHandler, CallbackContext

# تحميل المتغيرات البيئية
load_dotenv()

# استخدام التوكن من ملف .env
TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')

# إعداد التسجيل
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

# معلومات الخطط
PLANS = {
    'weekly': {
        'name': 'الخطة الأسبوعية',
        'description': 'اشتراك أسبوعي في BinarJoin Analytics - تحليلات متقدمة وإشارات تداول لمدة أسبوع',
        'price': 750
    },
    'monthly': {
        'name': 'الخطة الشهرية',
        'description': 'اشتراك شهري في BinarJoin Analytics - تحليلات متقدمة وإشارات تداول لمدة شهر',
        'price': 2300
    },
    'annual': {
        'name': 'الخطة السنوية',
        'description': 'اشتراك سنوي في BinarJoin Analytics - تحليلات متقدمة وإشارات تداول لمدة سنة',
        'price': 10000
    },
    'premium': {
        'name': 'الخطة المتميزة',
        'description': 'اشتراك بريميوم في BinarJoin Analytics - جميع الميزات المتقدمة لمدة سنة',
        'price': 18500
    }
}

async def start(update: Update, context: CallbackContext):
    """رسالة بداية للمستخدمين"""
    await update.message.reply_text(
        "مرحبًا بك في بوت الدفع لمنصة BinarJoin Analytics! 👋\n\n"
        "استخدم الأمر /pay لإتمام عملية الدفع بنجوم تلجرام.\n"
        "مثال: /pay weekly 750\n\n"
        "الخطط المتاحة:\n"
        "- weekly: 750 نجمة\n"
        "- monthly: 2300 نجمة\n"
        "- annual: 10000 نجمة\n"
        "- premium: 18500 نجمة"
    )

async def pay_command(update: Update, context: CallbackContext):
    """معالجة أمر الدفع"""
    # استخراج معلومات الخطة وعدد النجوم من الأمر
    command_parts = update.message.text.split()
    
    if len(command_parts) < 3:
        await update.message.reply_text(
            "❌ صيغة غير صحيحة. يرجى استخدام:\n/pay <plan_type> <stars_amount>\nمثال: /pay weekly 750"
        )
        return
    
    plan_type = command_parts[1]
    stars_amount = int(command_parts[2])
    
    # التحقق من صحة الخطة
    if plan_type not in PLANS:
        await update.message.reply_text(
            "❌ خطة غير صالحة. الخطط المتاحة: weekly, monthly, annual, premium"
        )
        return
    
    # التحقق من صحة المبلغ
    plan_price = PLANS[plan_type]['price']
    if stars_amount != plan_price:
        await update.message.reply_text(
            f"⚠️ قيمة النجوم غير متطابقة مع سعر الخطة.\n"
            f"السعر الصحيح للخطة {plan_type} هو {plan_price} نجمة."
        )
        return
    
    # إرسال فاتورة دفع بنجوم تلجرام
    chat_id = update.message.chat_id
    
    # إنشاء معرف فريد للمعاملة
    payment_id = f"tg_{update.message.chat_id}_{int(update.message.date.timestamp())}"
    
    try:
        await context.bot.send_invoice(
            chat_id=chat_id,
            title=PLANS[plan_type]['name'],
            description=PLANS[plan_type]['description'],
            payload=f"{payment_id}_{plan_type}_{update.message.from_user.id}",
            provider_token="",  # فارغ للمنتجات الرقمية
            currency="XTR",  # عملة نجوم تلجرام
            prices=[LabeledPrice(PLANS[plan_type]['name'], stars_amount * 100)],  # السعر بالكوبيكات (100 كوبيك = 1 نجمة)
            start_parameter=f"pay_{plan_type}_{stars_amount}"
        )
        
        logger.info(f"تم إرسال فاتورة دفع للمستخدم {chat_id} - الخطة: {plan_type}, المبلغ: {stars_amount}")
    except Exception as e:
        logger.error(f"خطأ في إرسال الفاتورة: {e}")
        await update.message.reply_text(
            "❌ حدث خطأ أثناء إنشاء الفاتورة. يرجى المحاولة مرة أخرى لاحقًا."
        )

async def precheckout_callback(update: Update, context: CallbackContext):
    """التحقق من صحة طلب الدفع قبل الإتمام"""
    query = update.pre_checkout_query
    
    # استخراج معلومات من payload
    try:
        payload_parts = query.invoice_payload.split('_')
        payment_id = payload_parts[0]
        plan_type = payload_parts[1]
        user_id = payload_parts[2]
        
        logger.info(f"تحقق ما قبل الدفع - معرف الدفع: {payment_id}, الخطة: {plan_type}, المستخدم: {user_id}")
        
        # هنا يمكن إضافة المزيد من عمليات التحقق
        # مثل التحقق من أن المستخدم لديه حساب في النظام، أو أن الخطة متاحة، إلخ
        
        # الموافقة على طلب الدفع
        await query.answer(ok=True)
    except Exception as e:
        logger.error(f"خطأ في تحقق ما قبل الدفع: {e}")
        await query.answer(
            ok=False,
            error_message="حدث خطأ أثناء معالجة طلب الدفع. يرجى المحاولة مرة أخرى."
        )

async def successful_payment_callback(update: Update, context: CallbackContext):
    """معالجة الدفع الناجح"""
    payment_info = update.message.successful_payment
    
    # استخراج معلومات من payload
    payload_parts = payment_info.invoice_payload.split('_')
    payment_id = payload_parts[0]
    plan_type = payload_parts[1]
    user_id = payload_parts[2]
    
    # معرف الدفع من تلجرام
    telegram_payment_charge_id = payment_info.telegram_payment_charge_id
    
    logger.info(
        f"دفع ناجح - معرف الدفع: {payment_id}, الخطة: {plan_type}, "
        f"المستخدم: {user_id}, معرف دفع تلجرام: {telegram_payment_charge_id}"
    )
    
    # هنا يمكن تحديث قاعدة البيانات وتنشيط الاشتراك للمستخدم
    # في بيئة الإنتاج، يمكن استدعاء API الخاص بك أو تحديث قاعدة البيانات مباشرة
    
    # إرسال تأكيد إلى المستخدم
    await update.message.reply_text(
        f"✅ تم الدفع بنجاح!\n\n"
        f"🌟 الخطة: {PLANS[plan_type]['name']}\n"
        f"💰 المبلغ: {payment_info.total_amount / 100} نجمة\n"
        f"🆔 معرف المعاملة: {telegram_payment_charge_id}\n\n"
        f"🚀 تم تفعيل اشتراكك بنجاح. يمكنك الآن استخدام جميع ميزات الخطة!"
    )

def main():
    """تشغيل البوت"""
    if not TOKEN:
        logger.error("لم يتم العثور على توكن البوت. يرجى التحقق من ملف .env")
        return
    
    application = Application.builder().token(TOKEN).build()
    
    # إضافة معالجات الأوامر
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("pay", pay_command))
    
    # إضافة معالجات الدفع
    application.add_handler(PreCheckoutQueryHandler(precheckout_callback))
    application.add_handler(MessageHandler(filters.SUCCESSFUL_PAYMENT, successful_payment_callback))
    
    # بدء البوت
    logger.info("بدء تشغيل بوت الدفع بنجوم تلجرام")
    application.run_polling()

if __name__ == '__main__':
    main()
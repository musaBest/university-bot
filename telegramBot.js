const TelegramBot = require('node-telegram-bot-api');
const { courses } = require('./courses'); // ربط ملف المواد

const token = '8515128167:AAGRskapdCNiU-wVosktdc-hFLrvBuBUc8o';
const bot = new TelegramBot(token, { polling: true });

// تنظيف النص للبحث (غير حساس لحالة الأحرف)
function cleanText(text) {
    return text.replace(/[^a-zA-Z0-9 ]/g, "").toLowerCase();
}

// البحث عن المواد
function searchCourse(query) {
    const q = cleanText(query);
    return Object.keys(courses).filter(name => cleanText(name).includes(q));
}

// عرض روابط المادة بشكل مرتب
function formatCourse(course) {
    let text = "إليك روابط المادة:\n\n";
    for (const [key, value] of Object.entries(course)) {
        if (typeof value === 'object') {
            text += key + ":\n";
            for (const [subKey, subValue] of Object.entries(value)) {
                text += "   - " + subKey + ": " + subValue + "\n";
            }
        } else {
            text += key + ": " + value + "\n";
        }
    }
    return text;
}

// استقبال الرسائل
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const studentName = msg.from.first_name || "طالب";

    if (!text) return;

    // /start
    if (text === "/start") {
        bot.sendMessage(chatId, "مرحباً " + studentName + "! أتمنى يومك يكون رائع! يمكنك طلب روابط أي مادة وسأعرضها لك بشكل مرتب.\n\nاختر ما تريد:", {
            reply_markup: {
                keyboard: [
                    ["عرض كل المواد"],
                    ["بحث عن مادة معينة"]
                ],
                resize_keyboard: true,
                one_time_keyboard: false
            }
        });
        return;
    }

    // عرض كل المواد
    if (text === "عرض كل المواد") {
        const buttons = Object.keys(courses).map(name => [{ text: name }]);
        bot.sendMessage(chatId, "اختر المادة من القائمة:", {
            reply_markup: {
                keyboard: buttons,
                resize_keyboard: true,
                one_time_keyboard: true
            }
        });
        return;
    }

    // البحث عن مادة معينة
    if (text === "بحث عن مادة معينة") {
        bot.sendMessage(chatId, "اكتب اسم المادة التي تريد البحث عنها:");
        return;
    }

    // التفاعل مع اختيار مادة
    const matched = searchCourse(text);
    if (matched.length === 0) {
        bot.sendMessage(chatId, "لا توجد مادة مطابقة، حاول كتابة الاسم بشكل أوضح.");
    } else if (matched.length === 1) {
        const course = courses[matched[0]];
        bot.sendMessage(chatId, "روابط مادة " + matched[0] + ":\n\n" + formatCourse(course));
    } else {
        // أكثر من نتيجة
        const buttons = matched.map(name => [{ text: name }]);
        bot.sendMessage(chatId, "وجدت أكثر من مادة مطابقة، اختر من القائمة:", {
            reply_markup: {
                keyboard: buttons,
                resize_keyboard: true,
                one_time_keyboard: true
            }
        });
    }
});

// معالجة أي أخطاء polling
bot.on('polling_error', (err) => {
    console.error("Polling error:", err.code, err.message);
});
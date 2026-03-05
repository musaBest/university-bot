const TelegramBot = require('node-telegram-bot-api');
const { courses } = require('./courses'); // ربط ملف المواد

const token = '8515128167:AAGRskapdCNiU-wVosktdc-hFLrvBuBUc8o';
const bot = new TelegramBot(token, { polling: true });

// دالة البحث عن المواد (غير حساس لحالة الأحرف)
function searchCourse(query) {
    const lowerQuery = query.toLowerCase();
    return Object.keys(courses).filter(name => name.toLowerCase().includes(lowerQuery));
}

// دالة الحصول على روابط المادة
function getCourseLinks(courseName) {
    return courses[courseName] || null;
}

// استقبال الرسائل
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text) return;

    if (text === '/start') {
        bot.sendMessage(chatId, 'مرحبا! انا بوت الجامعة.\nاكتب اسم المادة لأعرض روابطها.');
        return;
    }

    const results = searchCourse(text);

    if (results.length === 0) {
        bot.sendMessage(chatId, 'لا توجد مادة مطابقة. حاول كتابة جزء من الاسم.');
    } else if (results.length === 1) {
        const course = getCourseLinks(results[0]);
        let reply = 'روابط مادة ' + results[0] + ':\n';
        for (const key in course) {
            reply += key + ': ' + course[key] + '\n';
        }
        bot.sendMessage(chatId, reply);
    } else {
        let reply = 'وجدت أكثر من مادة مطابقة:\n';
        results.forEach(name => {
            reply += '- ' + name + '\n';
        });
        reply += '\nاكتب الاسم الكامل للمادة لاختيارها.';
        bot.sendMessage(chatId, reply);
    }
});

// معالجة أي أخطاء polling
bot.on('polling_error', (err) => {
    console.error('Polling error:', err.code, err.message);
});
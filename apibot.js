const TelegramBot = require("node-telegram-bot-api");
const { courses } = require("../courses");

// التوكن من متغير البيئة
const token = process.env.BOT_TOKEN;

// رابط موقعك على Vercel
const url = process.env.URL;

// إنشاء البوت
const bot = new TelegramBot(token);

// تعيين webhook
bot.setWebHook(url + "/api/bot");

// البحث عن المادة بدون حساسية لحالة الأحرف
function searchCourse(query) {
    const lower = query.toLowerCase();
    return Object.keys(courses).filter(name =>
        name.toLowerCase().includes(lower)
    );
}

// استقبال الرسائل
bot.on("message", (msg) => {

    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    if (text === "/start") {
        bot.sendMessage(
            chatId,
            "مرحبا! انا بوت الجامعة.\nاكتب اسم المادة لأعرض روابطها."
        );
        return;
    }

    const results = searchCourse(text);

    if (results.length === 0) {

        bot.sendMessage(
            chatId,
            "لا توجد مادة مطابقة. حاول كتابة جزء من الاسم."
        );

    } else if (results.length === 1) {

        const courseName = results[0];
        const course = courses[courseName];

        let reply = "روابط مادة " + courseName + ":\n";

        for (const key in course) {
            reply += "- " + key + ": " + course[key] + "\n";
        }

        reply += "\nنصيحة: ابدأ بالمحاضرات ثم السلايدات وبعدها حل الأسئلة.";

        bot.sendMessage(chatId, reply);

    } else {

        let reply = "وجدت أكثر من مادة مشابهة:\n";

        results.forEach(function(name) {
            reply += "- " + name + "\n";
        });

        bot.sendMessage(chatId, reply);
    }

});

// استقبال طلبات Vercel
module.exports = (req, res) => {

    if (req.method === "POST") {
        bot.processUpdate(req.body);
        res.status(200).send("ok");
    } else {
        res.status(200).send("bot is running");
    }

};
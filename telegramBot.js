const TelegramBot = require("node-telegram-bot-api");
const { courses } = require("./courses"); // ملف المواد

const token = "8515128167:AAGRskapdCNiU-wVosktdc-hFLrvBuBUc8o";
const bot = new TelegramBot(token, { polling: true });

// ---- استقبال /start ----
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const studentName = msg.from.first_name || "طالب";

    bot.sendMessage(chatId, 
        "مرحباً " + studentName + "!\nيمكنك اختيار سنة، فصل، ومادة للحصول على روابطها.", 
        {
            reply_markup: {
                keyboard: [["عرض كل السنوات"]],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        }
    );
});

// ---- توليد أزرار السنة ----
function generateYearButtons() {
    return Object.keys(courses).map(year => [{ text: year }]);
}

// ---- توليد أزرار الفصول ----
function generateSemesterButtons(year) {
    const semesters = Object.keys(courses[year]);
    return semesters.map(s => [{ text: s }]);
}

// ---- توليد أزرار المواد ----
function generateCourseButtons(year, semester) {
    const materials = Object.keys(courses[year][semester]);
    return materials.map(m => [{ text: m }]);
}

// ---- عرض روابط المادة ----
function displayCourseLinks(courseObj) {
    let output = "روابط المادة:\n\n";
    for (const key in courseObj) {
        output += key + ": " + courseObj[key] + "\n";
    }
    return output;
}

// ---- حفظ الحالة لكل مستخدم ----
const userState = {}; // chatId -> { year, semester }

// ---- استقبال الرسائل ----
bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    // بداية: عرض كل السنوات
    if (text === "عرض كل السنوات") {
        bot.sendMessage(chatId, "اختر السنة:", {
            reply_markup: { inline_keyboard: generateYearButtons() }
        });
        return;
    }

    // إذا المستخدم مختار سنة مسبقاً
    if (userState[chatId] && !userState[chatId].semester) {
        if (courses[text]) {
            userState[chatId].year = text;
            bot.sendMessage(chatId, "اختر الفصل:", {
                reply_markup: { inline_keyboard: generateSemesterButtons(text) }
            });
            return;
        }
    }

    // إذا المستخدم مختار سنة وفصل
    if (userState[chatId] && userState[chatId].year && !userState[chatId].course) {
        const year = userState[chatId].year;
        if (courses[year][text]) {
            userState[chatId].semester = text;
            bot.sendMessage(chatId, "اختر المادة:", {
                reply_markup: { inline_keyboard: generateCourseButtons(year, text) }
            });
            return;
        }
    }

    // إذا المستخدم يكتب اسم المادة مباشرة
    if (userState[chatId] && userState[chatId].year && userState[chatId].semester) {
        const year = userState[chatId].year;
        const semester = userState[chatId].semester;
        if (courses[year][semester][text]) {
            const course = courses[year][semester][text];
            bot.sendMessage(chatId, displayCourseLinks(course));
            userState[chatId] = {}; // إعادة الحالة بعد عرض المادة
            return;
        }
    }
});

// ---- التعامل مع الضغط على الأزرار ----
bot.on("callback_query", (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    // إذا المستخدم لم يختار سنة بعد
    if (!userState[chatId]) userState[chatId] = {};

    // اختيار السنة
    if (courses[data]) {
        userState[chatId].year = data;
        bot.sendMessage(chatId, "اختر الفصل:", {
            reply_markup: { inline_keyboard: generateSemesterButtons(data) }
        });
        return;
    }

    // اختيار الفصل
    const year = userState[chatId].year;
    if (year && courses[year][data]) {
        userState[chatId].semester = data;
        bot.sendMessage(chatId, "اختر المادة:", {
            reply_markup: { inline_keyboard: generateCourseButtons(year, data) }
        });
        return;
    }
    // اختيار المادة
    const semester = userState[chatId].semester;
    if (year && semester && courses[year][semester][data]) {
        const course = courses[year][semester][data];
        bot.sendMessage(chatId, displayCourseLinks(course));
        userState[chatId] = {}; // إعادة الحالة
        return;
    }

    bot.sendMessage(chatId, "اختيار غير صالح، حاول مرة أخرى.");
});

// ---- معالجة أي أخطاء ----
bot.on("polling_error", (err) => {
    console.error("Polling error:", err.code, err.message);
});
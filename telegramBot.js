const TelegramBot = require("node-telegram-bot-api");
const { courses } = require("./courses"); // ربط ملف المواد

const token = "8515128167:AAGRskapdCNiU-wVosktdc-hFLrvBuBUc8o";
const bot = new TelegramBot(token, { polling: true });

// تخزين حالة المستخدم
const userState = {}; // chatId: {year, semester}

// /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const studentName = msg.from.first_name || "طالب";
  userState[chatId] = {}; // تنظيف الحالة

  bot.sendMessage(
    chatId,
    "مرحباً " + studentName + "!\nيمكنك اختيار سنة، فصل، ومادة للحصول على روابطها.",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "عرض كل السنوات", callback_data: "show_years" }]
        ]
      }
    }
  );
});

// التعامل مع الأزرار
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  // عرض السنوات
  if (data === "show_years") {
    const yearsButtons = Object.keys(courses).map((y) => [{ text: y, callback_data: "year_" + y }]);
    bot.sendMessage(chatId, "اختر السنة:", { reply_markup: { inline_keyboard: yearsButtons } });
    return;
  }

  // اختيار سنة
  if (data.startsWith("year_")) {
    const year = data.replace("year_", "");
    userState[chatId] = { year };
    const semesters = Object.keys(courses[year]).map((s) => [{ text: s, callback_data: "semester_" + s }]);
    bot.sendMessage(chatId, "اختر الفصل:", { reply_markup: { inline_keyboard: semesters } });
    return;
  }

  // اختيار فصل
  if (data.startsWith("semester_")) {
    const semester = data.replace("semester_", "");
    const year = userState[chatId]?.year;
    if (!year) {
      bot.sendMessage(chatId, "حدث خطأ. الرجاء اختيار السنة أولاً.");
      return;
    }
    userState[chatId].semester = semester;
    const subjects = Object.keys(courses[year][semester]).map((sub) => [{ text: sub, callback_data: "subject_" + sub }]);
    bot.sendMessage(chatId, "اختر المادة:", { reply_markup: { inline_keyboard: subjects } });
    return;
  }

  // اختيار مادة
  if (data.startsWith("subject_")) {
    const subject = data.replace("subject_", "");
    const state = userState[chatId];
    if (!state?.year || !state?.semester) {
      bot.sendMessage(chatId, "حدث خطأ. الرجاء اختيار السنة والفصل أولاً.");
      return;
    }
    const links = courses[state.year][state.semester][subject];
    let reply = "روابط مادة \"" + subject + "\":\n\n";
    for (const key in links) {
      reply += key + ": " + (links[key] || "لا توجد روابط") + "\n";
    }
    bot.sendMessage(chatId, reply);
    return;
  }
});

// معالجة أي أخطاء polling
bot.on("polling_error", (err) => {
  console.error("Polling error:", err.code, err.message);
});
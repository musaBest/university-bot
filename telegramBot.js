const TelegramBot = require("node-telegram-bot-api");
const { courses } = require("./courses"); // ربط ملف المواد

const token = "8515128167:AAGRskapdCNiU-wVosktdc-hFLrvBuBUc8o";
const bot = new TelegramBot(token, { polling: true });

// تخزين حالة المستخدم
const userState = {}; // chatId: {year, semester}

// بيانات التواصل مع أزرار واتساب
const contacts = {
  "شؤون الطلبة": [
    { name: "رقم 1", phone: "+972595630401" },
    { name: "رقم 2", phone: "+972598923793" },
    { name: "رقم 3", phone: "+972599332109" }
  ],
  "الدائرة المالية": [
    { name: "أ. إبراهيم فرحات", phone: "+970594702230" },
    { name: "أ. خالد طبش", phone: "+972599834582" },
    { name: "أ. هاني مطر", phone: "+972599261992" }
  ],
  "القبول والتسجيل": [
    { name: "د. زهير الكردي", phone: "+970599332109" },
    { name: "أ. توفيق حرز الله", phone: "+972599167405" },
    { name: "أ. ألفت أبو صفية", phone: "+970599942975" },
    { name: "أ. إيمان علي", phone: "+972599623259" }
  ],
  "التعليم الإلكتروني": [
    { name: "أ. محمد حرز الله", phone: "+970599051274" },
    { name: "م. محمد الحلو", phone: "+97059806664" }
  ]
};

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
          [{ text: "عرض كل السنوات", callback_data: "show_years" }],
          [{ text: "جهات التواصل المهمة", callback_data: "show_contacts" }]
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

  // عرض الجهات
  if (data === "show_contacts") {
    const contactButtons = Object.keys(contacts).map((c) => [{ text: c, callback_data: "contact_" + c }]);
    bot.sendMessage(chatId, "اختر الجهة التي تريد التواصل معها:", { reply_markup: { inline_keyboard: contactButtons } });
    return;
  }

  // اختيار جهة
  if (data.startsWith("contact_")) {
    const contactName = data.replace("contact_", "");
    const buttons = contacts[contactName].map((c) => [{ text: c.name, url: "https://wa.me/" + c.phone.replace(/\D/g, "") }]);
    bot.sendMessage(chatId, "📌 " + contactName + ":\nاضغط على الاسم للتواصل عبر واتساب:", { reply_markup: { inline_keyboard: buttons } });
    return;
  }

  // اختيار سنة
  if (data.startsWith("year_")) {
    const year = data.replace("year_", "");
    userState[chatId] = { year: year };
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
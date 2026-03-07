const TelegramBot = require("node-telegram-bot-api");
const { courses } = require("./courses");

const token = "8515128167:AAGRskapdCNiU-wVosktdc-hFLrvBuBUc8o";
const bot = new TelegramBot(token, { polling: true });

const userState = {};
const processedCallbacks = new Set();

// جهات التواصل
const contacts = {
  "القبول والتسجيل": [
    { name: "د. زهير الكردي", phone: "+970599332109" },
    { name: "أ. توفيق حرز الله", phone: "+972599167405" },
    { name: "أ. ألفت أبو صفية", phone: "+970599946275" },
    { name: "أ. إيمان علي", phone: "+972599623259" }
  ],
  "شؤون الطلبة": [
    { name: "رقم 1", phone: "+972595630401" },
    { name: "رقم 2", phone: "+972598923793" },
    { name: "رقم 3", phone: "+972599332109" }
  ],
  "الشؤون الأكاديمية": [
    { name: "أ. مصطفى بروخ", phone: "+972597246896" }
  ],
  "الشؤون المالية": [
    { name: "أ. إبراهيم فرحات", phone: "+970594702230" },
    { name: "أ. خالد طبش", phone: "+972599834582" },
    { name: "أ. هاني مطر", phone: "+972599261992" }
  ],
  "المنح": [
    { name: "أ. محمد أبو قضامة", phone: "+972592628297" },
    { name: "م. علاء الهاشيم", phone: "+970599403090" },
    { name: "رقم إضافي", phone: "+972599489703" }
  ],
  "الدعم الفني": [
    { name: "أ. محمد حرز الله", phone: "+970599051274" },
    { name: "م. محمد الحلو", phone: "+970598066646" }
  ],
  "سكرتير كلية الهندسة": [
    { name: "أ. بسام نصار", phone: "+972599465605" }
  ],
  "رقم الجامعة تركيا": [
    { name: "الجامعة", phone: "+905014613767" }
  ],
  "التدريب الميداني": [
    { name: "م. رنا عبده", phone: "+972599630429" }
  ]
};

// start
bot.onText(/\/start/, (msg) => {

  const chatId = msg.chat.id;
  const name = msg.from.first_name || "طالب";

  userState[chatId] = {};

  bot.sendMessage(
    chatId,
    "مرحباً " + name + "!\nيمكنك اختيار سنة وفصل ومادة للحصول على روابطها وكل ملفاتها.",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📚 عرض كل السنوات", callback_data: "show_years" }],
          [{ text: "📞 جهات التواصل المهمة", callback_data: "show_contacts" }]
        ]
      }
    }
  );

});

// التعامل مع الأزرار
bot.on("callback_query", (query) => {

  const chatId = query.message.chat.id;
  const data = query.data;

  // منع التكرار
  if (processedCallbacks.has(query.id)) return;
  processedCallbacks.add(query.id);

  bot.answerCallbackQuery(query.id);

  setTimeout(() => {
    processedCallbacks.delete(query.id);
  }, 5000);

  // الرجوع للسنوات
  if (data === "back_years") {

    const yearsButtons = Object.keys(courses).map((y) => {
      return [{ text: y, callback_data: "year_" + y }];
    });

    bot.sendMessage(chatId, "اختر السنة:", {
      reply_markup: { inline_keyboard: yearsButtons }
    });

    return;
  }

  // الرجوع للفصول
  if (data === "back_semesters") {

    const year = userState[chatId]?.year;
    if (!year) return;

    const semesters = Object.keys(courses[year]).map((s) => {
      return [{ text: s, callback_data: "semester_" + s }];
    });

    bot.sendMessage(chatId, "اختر الفصل:", {
      reply_markup: { inline_keyboard: semesters }
    });

    return;
  }

  // عرض السنوات
  if (data === "show_years") {

    const buttons = Object.keys(courses).map((year) => {
      return [{ text: year, callback_data: "year_" + year }];
    });

    bot.sendMessage(chatId, "اختر السنة:", {
      reply_markup: { inline_keyboard: buttons }
    });

    return;
  }

  // عرض جهات التواصل
  if (data === "show_contacts") {

    const buttons = Object.keys(contacts).map((c) => {
      return [{ text: c, callback_data: "contact_" + c }];
    });

    bot.sendMessage(chatId, "اختر الجهة:", {
      reply_markup: { inline_keyboard: buttons }
    });

    return;
  }

  // اختيار جهة
  if (data.startsWith("contact_")) {

    const name = data.replace("contact_", "");

    const buttons = contacts[name].map((c) => {
      return [{
        text: c.name,
        url: "https://wa.me/" + c.phone.replace(/\D/g, "")
      }];
    });

    bot.sendMessage(chatId, "📞 " + name + "\nاضغط على الاسم للتواصل:", {
      reply_markup: { inline_keyboard: buttons }
    });

    return;
  }
  // اختيار سنة
  if (data.startsWith("year_")) {

    const year = data.replace("year_", "");
    userState[chatId] = { year: year };

    const semesters = Object.keys(courses[year]).map((s) => {
      return [{ text: s, callback_data: "semester_" + s }];
    });

    bot.sendMessage(chatId, "اختر الفصل:", {
      reply_markup: {
        inline_keyboard: [
          ...semesters,
          [{ text: "🔙 رجوع للسنوات", callback_data: "back_years" }]
        ]
      }
    });

    return;
  }

  // اختيار فصل
  if (data.startsWith("semester_")) {

    const semester = data.replace("semester_", "");
    const year = userState[chatId]?.year;

    if (!year) {
      bot.sendMessage(chatId, "حدث خطأ، اختر السنة أولاً.");
      return;
    }

    userState[chatId].semester = semester;

    const subjects = Object.keys(courses[year][semester]).map((sub) => {
      return [{ text: sub, callback_data: "subject_" + sub }];
    });

    bot.sendMessage(chatId, "اختر المادة:", {
      reply_markup: {
        inline_keyboard: [
          ...subjects,
          [{ text: "🔙 رجوع للفصول", callback_data: "back_semesters" }]
        ]
      }
    });

    return;
  }

  // اختيار مادة
  if (data.startsWith("subject_")) {

    const subject = data.replace("subject_", "");
    const state = userState[chatId];

    if (!state?.year || !state?.semester) {
      bot.sendMessage(chatId, "حدث خطأ. اختر السنة والفصل أولاً.");
      return;
    }

    const links = courses[state.year][state.semester][subject];

    let reply = "📚 " + subject + "\n";
    reply += "━━━━━━━━━━━━━━\n\n";

    for (const key in links) {

      const value = links[key];

      if (!value || value === "لا توجد روابط") {
        reply += "⚠️ " + key + "\n";
        reply += "لا توجد روابط\n\n";
        continue;
      }

      reply += "🔗 " + key + "\n";

      if (typeof value === "string") {
        reply += value + "\n\n";
      }

      else if (typeof value === "object") {

        for (const sub in value) {
          reply += "• " + sub + "\n";
          reply += value[sub] + "\n";
        }

        reply += "\n";
      }
    }

    bot.sendMessage(chatId, reply);

    return;
  }

});

// أخطاء
bot.on("polling_error", (err) => {
  console.log(err.message);
});

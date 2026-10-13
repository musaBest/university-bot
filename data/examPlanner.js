/**
 * Exam Countdown & Smart Study Planner Module for Computer Engineering Bot
 */

const fs = require("fs");
const path = require("path");
const { generateAIResponse } = require("./aiService");

const EXAM_DATES_FILE = path.join(__dirname, "examDates.json");

// المواعيد الافتراضية للفصل الدراسي الأول 2026/2027
const DEFAULT_EXAM_DATES = {
  semesterName: "الفصل الدراسي الأول للعام الجامعي 2026/2027",
  registrationStart: "2026-08-22T00:00:00",
  registrationEnd: "2026-09-25T23:59:59",
  studyStart: "2026-09-26T08:00:00",
  addStart: "2026-09-26T08:00:00",
  addEnd: "2026-10-07T23:59:59",
  dropEnd: "2026-10-14T23:59:59",
  midtermStart: "2026-11-14T09:00:00",
  midtermEnd: "2026-11-19T14:00:00",
  withdrawEnd: "2026-12-30T23:59:59",
  studyEnd: "2027-01-07T14:00:00",
  finalStart: "2027-01-09T09:00:00",
  finalEnd: "2027-01-21T14:00:00",
  customEvents: [
    { title: "🟢 بداية الفصل والدراسة", date: "2026-09-26T08:00:00" },
    { title: "⏳ نهاية فترة الإضافة", date: "2026-10-07T23:59:59" },
    { title: "⏳ نهاية فترة السحب", date: "2026-10-14T23:59:59" },
    { title: "📌 بداية الامتحانات النصفية", date: "2026-11-14T09:00:00" },
    { title: "🏁 نهاية الامتحانات النصفية", date: "2026-11-19T14:00:00" },
    { title: "🚫 نهاية فترة الانسحاب من المساقات", date: "2026-12-30T23:59:59" },
    { title: "📚 نهاية الدراسة والمحاضرات", date: "2027-01-07T14:00:00" },
    { title: "🏁 بداية الامتحانات النهائية", date: "2027-01-09T09:00:00" },
    { title: "🎉 نهاية الامتحانات النهائية وختام الفصل", date: "2027-01-21T14:00:00" }
  ]
};

function loadExamDates() {
  try {
    if (fs.existsSync(EXAM_DATES_FILE)) {
      const data = JSON.parse(fs.readFileSync(EXAM_DATES_FILE, "utf8"));
      return { ...DEFAULT_EXAM_DATES, ...data };
    }
  } catch (e) {
    console.error("Error loading exam dates:", e);
  }
  return DEFAULT_EXAM_DATES;
}

function saveExamDates(data) {
  try {
    fs.writeFileSync(EXAM_DATES_FILE, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (e) {
    console.error("Error saving exam dates:", e);
    return false;
  }
}

/**
 * حساب الوقت المتبقي بصيغة نصية عربية واضحة
 */
function calculateCountdown(targetDateStr) {
  const target = new Date(targetDateStr);
  const now = new Date();
  const diff = target - now;

  if (diff <= 0) {
    return "انتهى الموعد أو جاري الآن! 🎯";
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  let result = "";
  if (days > 0) result += `*${days}* يوم `;
  if (hours > 0) result += `و *${hours}* ساعة `;
  result += `و *${minutes}* دقيقة`;
  return result;
}

/**
 * عرض شاشة الأجندة الفصلية والعداد التنازلي للامتحانات
 */
function renderExamCountdown(chatId, bot) {
  const dates = loadExamDates();
  const now = new Date();
  const semesterEndDate = new Date(dates.finalEnd || "2027-01-21T23:59:59");

  // إذا انتهى الفصل بالكامل
  if (now > semesterEndDate) {
    const closedText = `🎓 *الأجندة الأكاديمية ومواعيد الامتحانات*
━━━━━━━━━━━━━━━━━━━━
🎉 *انتهى الفصل الدراسي الحالي بالكامل!*
نتمنى لجميع طلبتنا الأعزاء دوام التوفيق والنجاح بأعلى الدرجات والتقديرات 🌟

_سيتم تحديث الأجندة تلقائياً مع بداية الفصل الدراسي القادم إن شاء الله._`;

    const keyboard = [
      [
        { text: "🔙 رجوع لبنك الامتحانات والمختبرات", callback_data: "menu_exams_labs" },
        { text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }
      ]
    ];

    bot.sendMessage(chatId, closedText, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard }
    });
    return;
  }

  const midtermCount = calculateCountdown(dates.midtermStart);
  const finalCount = calculateCountdown(dates.finalStart);

  let text = `📅 *الأجندة الفصلية والعداد التنازلي*
━━━━━━━━━━━━━━━━━━━━
🎓 *${dates.semesterName}*

⏱️ *العداد التنازلي للامتحانات:*
📝 *الامتحانات النصفية (Midterm):*
• الموعد: \`${dates.midtermStart.split("T")[0]}\` إلى \`${dates.midtermEnd.split("T")[0]}\`
• المتبقي: ⏳ ${midtermCount}

🏁 *الامتحانات النهائية (Final):*
• الموعد: \`${dates.finalStart.split("T")[0]}\` إلى \`${dates.finalEnd.split("T")[0]}\`
• المتبقي: ⏳ ${finalCount}

━━━━━━━━━━━━━━━━━━━━
📋 *جدول المواعيد الهامة للفصل:*
• 🟢 بداية الدراسة: \`26/09/2026\`
• ⏳ نهاية فترة الإضافة: \`07/10/2026\`
• ⏳ نهاية فترة السحب: \`14/10/2026\`
• 📝 بدء الامتحانات النصفية: \`14/11/2026\`
• 📝 نهاية الامتحانات النصفية: \`19/11/2026\`
• 🚫 نهاية فترة الانسحاب: \`30/12/2026\`
• 📚 نهاية الدراسة: \`07/01/2027\`
• 🏁 بدء الامتحانات النهائية: \`09/01/2027\`
• 🎉 نهاية الامتحانات والختام: \`21/01/2027\`

━━━━━━━━━━━━━━━━━━━━
💡 *أدوات مساعدة إضافية:*
• 📅 *إنشاء خطة دراسية ذكية:* يساعدك في تقسيم المنهج والسلايدات على الأيام المتبقية.
• 🎯 *حاسبة الدرجة المطلوبة:* لحساب العلامة التي تحتاجها في النهائي لتحقيق تقدير معين.`;

  const keyboard = [
    [{ text: "📅 إنشاء جدول وخطة مراجعة ذكية (AI Planner)", callback_data: "exam_create_plan_prompt" }],
    [{ text: "🎯 حاسبة الدرجة المطلوبة في النهائي", callback_data: "exam_calc_grade_prompt" }],
    [
      { text: "🔙 رجوع لبنك الامتحانات والمختبرات", callback_data: "menu_exams_labs" },
      { text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }
    ]
  ];

  bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard }
  });
}

/**
 * معالجة طلب إنشاء خطة دراسية ذكية
 */
async function generateSmartStudyPlan(chatId, bot, studentInput) {
  const dates = loadExamDates();
  const typingTimer = setInterval(() => {
    bot.sendChatAction(chatId, "typing").catch(() => {});
  }, 3000);
  bot.sendChatAction(chatId, "typing").catch(() => {});

  try {
    const prompt = `أنت مهندس ومستشار أكاديمي خبير في قسم هندسة الحاسوب بالجامعة الإسلامية بغزة.
طالب هندسة حاسوب يريد خطة وجدول دراسة ومراجعة مخصص وذكي بناءً على البيانات التالية:
"${studentInput}"

المطلوب:
1. صمم جدولاً دراسياً زمنياً مفصلاً ومنظماً يوماً بيوم وساعة بساعة (Daily & Hourly Schedule).
2. قسّم المواضيع (نظري + عملي + مسائل + أكواد برمجية) بطريقة تضمن إنهاء المنهج ومراجعته وحل امتحانات سابقة.
3. اعتمد استراتيجيات فعالة (مثل Pomodoro Technique، Active Recall، وحل أسئلة السنوات).
4. اكتب نصائح عملية خاصة بطبيعة مواد هندسة الحاسوب (دوائر، برمجة، خوارزميات، حفظ، وفهم).
5. نسق الخطة بأيقونات وجداول Markdown واضحة ومحفزة جداً.`;

    const plan = await generateAIResponse(prompt);
    clearInterval(typingTimer);

    const keyboard = [
      [{ text: "⏳ عداد ومخطط الامتحانات", callback_data: "exam_countdown" }],
      [{ text: "🔙 رجوع لبنك الامتحانات والمختبرات", callback_data: "menu_exams_labs" }],
      [{ text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }]
    ];

    if (plan.length > 4000) {
      const chunks = plan.match(/[\s\S]{1,3800}/g) || [plan];
      for (let i = 0; i < chunks.length; i++) {
        const isLast = i === chunks.length - 1;
        await bot.sendMessage(chatId, chunks[i], {
          parse_mode: "Markdown",
          reply_markup: isLast ? { inline_keyboard: keyboard } : undefined
        }).catch(async () => {
          await bot.sendMessage(chatId, chunks[i], {
            reply_markup: isLast ? { inline_keyboard: keyboard } : undefined
          }).catch(() => {});
        });
      }
    } else {
      await bot.sendMessage(chatId, plan, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: keyboard }
      }).catch(async () => {
        await bot.sendMessage(chatId, plan, {
          reply_markup: { inline_keyboard: keyboard }
        }).catch(() => {});
      });
    }
  } catch (e) {
    clearInterval(typingTimer);
    bot.sendMessage(chatId, "⚠️ حدث خطأ بسيط أثناء إنشاء الخطة، أعد المحاولة وسأجهزها لك فوراً!");
  }
}

/**
 * حساب الدرجة المطلوبة في الامتحان النهائي
 */
function calculateRequiredGrade(currentScoreOutOf50, targetLetter) {
  // الدرجات الكلية من 100: النهائي عادة 50%
  const targets = {
    "A+": 95,
    "A": 90,
    "B+": 85,
    "B": 80,
    "C+": 75,
    "C": 70,
    "D+": 65,
    "D": 60,
    "PASS": 60
  };

  const requiredTotal = targets[targetLetter] || 60;
  const neededInFinal = requiredTotal - currentScoreOutOf50;

  return {
    targetLetter,
    requiredTotal,
    currentScore: currentScoreOutOf50,
    neededInFinal: Math.max(0, neededInFinal),
    possible: neededInFinal <= 50
  };
}

module.exports = {
  renderExamCountdown,
  loadExamDates,
  saveExamDates,
  calculateCountdown,
  generateSmartStudyPlan,
  calculateRequiredGrade
};

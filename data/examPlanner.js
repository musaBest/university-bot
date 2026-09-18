/**
 * Exam Countdown & Smart Study Planner Module for Computer Engineering Bot
 */

const fs = require("fs");
const path = require("path");
const { generateAIResponse } = require("./aiService");

const EXAM_DATES_FILE = path.join(__dirname, "examDates.json");

// المواعيد الافتراضية للفصل الدراسي
const DEFAULT_EXAM_DATES = {
  semesterName: "الفصل الدراسي الحالي 2026",
  midtermStart: "2026-10-25T09:00:00",
  midtermEnd: "2026-11-05T14:00:00",
  finalStart: "2026-12-20T09:00:00",
  finalEnd: "2027-01-05T14:00:00",
  customEvents: [
    { title: "📌 بداية الامتحانات النصفية", date: "2026-10-25T09:00:00" },
    { title: "🏁 بداية الامتحانات النهائية", date: "2026-12-20T09:00:00" }
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
 * عرض شاشة العداد التنازلي للامتحانات
 */
function renderExamCountdown(chatId, bot) {
  const dates = loadExamDates();
  const midtermCount = calculateCountdown(dates.midtermStart);
  const finalCount = calculateCountdown(dates.finalStart);

  const text = `⏳ *عداد ومخطط الامتحانات (Exam Countdown & Planner)*
━━━━━━━━━━━━━━━━━━━━
🎓 *${dates.semesterName}*

📊 *العداد التنازلي للمواعيد الرسمية:*

📝 *الامتحانات النصفية (Midterm):*
• الموعد: \`${dates.midtermStart.split("T")[0]}\`
• المتبقي: ⏱️ ${midtermCount}

🏁 *الامتحانات النهائية (Final):*
• الموعد: \`${dates.finalStart.split("T")[0]}\`
• المتبقي: ⏱️ ${finalCount}

━━━━━━━━━━━━━━━━━━━━
💡 *أدوات مساعدة إضافية:*
• 📅 *إنشاء خطة دراسية ذكية:* يساعدك في تقسيم المنهج والسلايدات على الأيام المتبقية.
• 🎯 *حاسبة الدرجة المطلوبة:* لحساب العلامة التي تحتاجها في النهائي لتحقيق تقدير معين.`;

  const keyboard = [
    [{ text: "📅 إنشاء جدول وخطة مراجعة ذكية (AI Planner)", callback_data: "exam_create_plan_prompt" }],
    [{ text: "🎯 حاسبة الدرجة المطلوبة في النهائي", callback_data: "exam_calc_grade_prompt" }],
    [{ text: "🔙 العودة للقائمة الرئيسية", callback_data: "main_menu" }]
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
      [{ text: "⏳ عداد الامتحانات", callback_data: "exam_countdown" }],
      [{ text: "🔙 القائمة الرئيسية", callback_data: "main_menu" }]
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

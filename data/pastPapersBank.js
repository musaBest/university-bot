/**
 * Past Papers & Exams Bank Module for Computer Engineering Bot
 */

const { courses } = require("../courses");

/**
 * استخراج كافة روابط الامتحانات والنماذج السابقة من قاعدة بيانات المواد
 */
function getAllExamLinks() {
  const bank = [];

  for (const yearKey in courses) {
    const yearObj = courses[yearKey];
    for (const semKey in yearObj) {
      const semObj = yearObj[semKey];
      for (const courseName in semObj) {
        const courseData = semObj[courseName];
        let examLink = null;
        let labExamLink = null;

        // فحص المفاتيح المختلفة للامتحانات
        if (courseData["Quiz & Exams & Homework"]) {
          examLink = courseData["Quiz & Exams & Homework"];
        } else if (courseData["Exams & Homework"]) {
          examLink = courseData["Exams & Homework"];
        } else if (courseData["Exams"]) {
          examLink = courseData["Exams"];
        } else if (courseData["Quiz & Exams"]) {
          examLink = courseData["Quiz & Exams"];
        } else if (courseData["Midterm & Final"]) {
          examLink = courseData["Midterm & Final"];
        }

        // فحص امتحانات المعمل إن وجدت
        if (courseData.Lab && typeof courseData.Lab === "object" && courseData.Lab.Exam) {
          labExamLink = courseData.Lab.Exam;
        }

        if (examLink || labExamLink) {
          bank.push({
            courseName,
            yearKey,
            semKey,
            yearName: formatYearName(yearKey),
            semName: formatSemName(semKey),
            examLink,
            labExamLink
          });
        }
      }
    }
  }

  return bank;
}

function formatYearName(key) {
  const map = {
    year1: "السنة الأولى",
    year2: "السنة الثانية",
    year3: "السنة الثالثة",
    year4: "السنة الرابعة",
    year5: "السنة الخامسة"
  };
  return map[key] || key;
}

function formatSemName(key) {
  const map = {
    semester1: "الفصل الأول",
    semester2: "الفصل الثاني"
  };
  return map[key] || key;
}

/**
 * عرض قائمة السنوات لاختيار بنك الامتحانات
 */
function renderPastPapersMenu(chatId, bot) {
  const text = `📂 *بنك الامتحانات والأسئلة السابقة المباشر (Past Papers Bank)*
━━━━━━━━━━━━━━━━━━━━

أهلاً بك! يحتوي بنك الامتحانات على مئات النماذج والامتحانات النصفية والنهائية والكويزات السابقة المحلولة وغير المحلولة لقسم هندسة الحاسوب 🎓

اختر السنة الدراسية لتصفح امتحانات مساقاتها، أو ابحث باسم المادة:`;

  const keyboard = [
    [
      { text: "1️⃣ امتحانات السنة الأولى", callback_data: "pp_year_year1" },
      { text: "2️⃣ امتحانات السنة الثانية", callback_data: "pp_year_year2" }
    ],
    [
      { text: "3️⃣ امتحانات السنة الثالثة", callback_data: "pp_year_year3" },
      { text: "4️⃣ امتحانات السنة الرابعة", callback_data: "pp_year_year4" }
    ],
    [
      { text: "5️⃣ امتحانات السنة الخامسة", callback_data: "pp_year_year5" }
    ],
    [
      { text: "🔍 بحث سريع عن امتحانات مادة معينة", callback_data: "pp_search_prompt" }
    ],
    [
      { text: "🔙 العودة للقائمة الرئيسية", callback_data: "main_menu" }
    ]
  ];

  bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard }
  });
}

/**
 * عرض امتحانات سنة معينة
 */
function renderYearExams(chatId, bot, yearKey) {
  const all = getAllExamLinks().filter(e => e.yearKey === yearKey);
  const yearName = formatYearName(yearKey);

  if (all.length === 0) {
    bot.sendMessage(chatId, `لا توجد ملفات امتحانات مضافة حالياً لـ ${yearName}.`);
    return;
  }

  let text = `📂 *بنك امتحانات ${yearName}*
━━━━━━━━━━━━━━━━━━━━
اختر المادة لفتح مجلد الامتحانات والنماذج السابقة مباشرة عبر Google Drive:`;

  const keyboard = [];
  for (const item of all) {
    const row = [];
    if (item.examLink && typeof item.examLink === "string") {
      row.push({ text: `📝 ${item.courseName}`, url: item.examLink });
    }
    if (item.labExamLink && typeof item.labExamLink === "string") {
      row.push({ text: `🧪 معمل ${item.courseName}`, url: item.labExamLink });
    }
    if (row.length > 0) {
      keyboard.push(row);
    }
  }

  keyboard.push([
    { text: "🔙 العودة لقائمة بنك الامتحانات", callback_data: "open_past_papers" }
  ]);

  bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard }
  });
}

/**
 * البحث عن امتحانات مادة معينة
 */
function searchPastPapers(chatId, bot, query) {
  const q = query.trim().toLowerCase();
  const all = getAllExamLinks().filter(e => e.courseName.toLowerCase().includes(q));

  if (all.length === 0) {
    bot.sendMessage(chatId, `❌ لم أجد امتحانات لمادة مطابقة لـ "${query}". تأكد من كتابة اسم المادة بالإنجليزية أو اختر من قائمة السنوات.`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📂 تصفح بنك الامتحانات بالسنوات", callback_data: "open_past_papers" }],
          [{ text: "🔙 القائمة الرئيسية", callback_data: "main_menu" }]
        ]
      }
    });
    return;
  }

  let text = `🔍 *نتائج البحث في بنك الامتحانات لـ "${query}":*
━━━━━━━━━━━━━━━━━━━━`;

  const keyboard = [];
  for (const item of all) {
    const row = [];
    if (item.examLink && typeof item.examLink === "string") {
      row.push({ text: `📝 ${item.courseName} (${item.yearName})`, url: item.examLink });
    }
    if (item.labExamLink && typeof item.labExamLink === "string") {
      row.push({ text: `🧪 معمل ${item.courseName}`, url: item.labExamLink });
    }
    if (row.length > 0) keyboard.push(row);
  }

  keyboard.push([
    { text: "🔙 العودة لبنك الامتحانات", callback_data: "open_past_papers" }
  ]);

  bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard }
  });
}

module.exports = {
  renderPastPapersMenu,
  renderYearExams,
  searchPastPapers,
  getAllExamLinks
};

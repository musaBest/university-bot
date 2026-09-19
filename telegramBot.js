const TelegramBot = require("node-telegram-bot-api");
const { courses } = require("./courses");
const { labPrograms } = require("./labPrograms");
const { uniRequirements } = require("./uniRequirements");
const courseCodes = require("./courseCodes");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { generateAIResponse, getApiKey, setApiKey, testApiKey } = require("./data/aiService");
const { renderCodeDebuggerMenu, handleCodeDebuggerInput } = require("./data/codeDebugger");
const { renderExamCountdown, generateSmartStudyPlan, calculateRequiredGrade } = require("./data/examPlanner");
const { renderQuizSubjectMenu, fetchQuizBatch, sendCurrentQuestion, handleQuizAnswer, finishQuiz, POPULAR_QUIZ_COURSES } = require("./data/quizGenerator");
const { renderPastPapersMenu, renderYearExams, searchPastPapers } = require("./data/pastPapersBank");
const { renderMarketplaceMenu, renderCategoryListings, renderMyListings, addListing, deleteListing } = require("./data/marketplace");
const { saveBroadcastRecord, getLastBroadcast, getBroadcastById, unsendBroadcast } = require("./data/broadcastManager");
const { createPoll, getPoll, loadPolls, savePolls, recordVote, togglePollStatus, unsendPollFromStudents, renderAdminPollDetails, renderAdminPollsList } = require("./data/pollsManager");
const {
  initCloudSyncOnBoot,
  sendMasterBackupToAdmin,
  restoreDatabaseBundle,
  scheduleAutoCloudSync,
  saveMasterSnapshot
} = require("./data/cloudSync");

// خادم صحة بسيط (Health Check & Keep-Alive) لربط البوت بالاستضافات السحابية وضمان عمله 24/7
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end("🤖 بوت هندسة الحاسوب يعمل بنجاح وبأعلى سرعة 24/7!");
});
server.listen(PORT, () => {
  console.log(`Keep-alive server is listening on port ${PORT}`);
});

const token = "8515128167:AAGRskapdCNiU-wVosktdc-hFLrvBuBUc8o";
const bot = new TelegramBot(token, { polling: true });

// تشغيل محرك المزامنة والاستعادة الفورية لقاعدة البيانات عند الإقلاع
initCloudSyncOnBoot(bot);

const userState = {};
const processedCallbacks = new Set();
const adminMessageMap = new Map();

const ADMIN_ID = 5687891184;

function resetAdminState(chatId = ADMIN_ID) {
  if (chatId !== ADMIN_ID) return;
  if (!userState[ADMIN_ID]) userState[ADMIN_ID] = {};
  userState[ADMIN_ID].replyingToStudent = null;
  userState[ADMIN_ID].waitingBroadcastMessage = false;
  userState[ADMIN_ID].waitingBanInput = false;
  userState[ADMIN_ID].waitingUnbanInput = false;
  userState[ADMIN_ID].waitingSearchUserInput = false;
  userState[ADMIN_ID].waitingAddUserInput = false;
  userState[ADMIN_ID].waitingAdminMessage = false;
  userState[ADMIN_ID].waitingRestoreBackup = false;
  userState[ADMIN_ID].waitingGeminiKeyInput = false;
  userState[ADMIN_ID].inAiChat = false;
  userState[ADMIN_ID].inCodeDebugger = false;
  userState[ADMIN_ID].waitingExamPlanInput = false;
  userState[ADMIN_ID].waitingCalcGradeInput = false;
  userState[ADMIN_ID].waitingCustomQuizInput = false;
  userState[ADMIN_ID].waitingPastPaperSearch = false;
  userState[ADMIN_ID].waitingMarketAdd = false;
  userState[ADMIN_ID].waitingPollInput = false;
}

const {
  loadUsers,
  saveUsersList,
  mergeUsersData,
  isUserBanned,
  trackFeatureUse,
  trackCourseSearch,
  getCourseSearchStats,
  renderCourseSearchStats,
  banUser,
  unbanUser,
  addUserManually,
  getUserProfile,
  getFeatureStats,
  FEATURE_LABELS,
  safeEscape,
  safeSend,
  safeSendDocument,
  renderMainDashboard,
  renderFeatureStats,
  renderFeatureUsers,
  renderBannedList,
  renderUserProfile
} = require("./data/adminDashboard");

function saveUser(msgUser, chatId) {
  trackFeatureUse(chatId, "active", msgUser);
}

function markUserInactive(chatId) {
  try {
    const users = loadUsers();
    const user = users.find((u) => Number(u.id) === Number(chatId));
    if (user) {
      user.active = false;
      saveUsersList(users);
    }
  } catch (err) {
    console.error("Error updating user status:", err);
  }
}

function sendStatsReport(botInstance, adminChatId) {
  renderMainDashboard(adminChatId, botInstance);
}

async function broadcastMessage(botInstance, adminChatId, contentMsg, isPreset = false) {
  const users = loadUsers().filter((u) => u.active !== false);
  const totalUsers = users.length;

  if (totalUsers === 0) {
    safeSend(botInstance, adminChatId, "⚠️ لا يوجد طلاب مسجلين في قاعدة البيانات حالياً.");
    return;
  }

  await safeSend(botInstance, adminChatId, `⏳ *جاري بدء الإذاعة وإرسال الإشعار إلى ${totalUsers} طالب...*`);

  const deliveredUsers = [];
  const failedUsers = [];
  const startTime = Date.now();

  const presetText = `🔔 *تحديثات جديدة وإضافات مهمة في البوت!*
━━━━━━━━━━━━━━━━━━━━

مرحباً بكم زملائنا الطلبة! تم تحديث البوت لتسهيل وصولكم للمصادر ومتابعة دراستكم بكل سهولة:

1️⃣ 🔍 *محرك بحث ذكي وسريع:*
أرسل كود المساق مباشرة (مثل \`ECOM 2401\` أو \`MATHB1301\`) أو اسم المادة بالعربي أو الإنجليزي لتصلك كل الروابط، الكتب، السلايدات، والشروحات فوراً.

2️⃣ 💬 *تواصل مباشر مع الأدمن:*
يمكنك الآن إرسال أي استفسار أو ملف/صورة داخل البوت من زر (تواصل مع الأدمن) وسيتم الرد عليك مباشرة هنا.

3️⃣ 🌐 *الموقع الإلكتروني الرسمي:*
تم ربط البوت بالموقع الجديد لقسم هندسة الحاسوب لتصفح أكثر سلاسة.

💡 *نتمنى لكم فصلاً دراسياً موفقاً وناجحاً!*`;

  const keyboard = {
    inline_keyboard: [
      [{ text: "🔍 ابدأ البحث عن مادة", callback_data: "start_search" }],
      [{ text: "🌐 زيارة الموقع الإلكتروني", url: "https://computer-engineering-iug.vercel.app" }],
      [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
    ]
  };

  const sentMessagesList = [];

  for (const user of users) {
    if (Number(user.id) === Number(adminChatId)) {
      deliveredUsers.push({
        id: user.id,
        name: user.name || "الأدمن (أنت)",
        username: user.username || ""
      });
      continue;
    }

    try {
      let sentMsg = null;
      if (isPreset) {
        sentMsg = await botInstance.sendMessage(user.id, presetText, {
          parse_mode: "Markdown",
          reply_markup: keyboard
        });
      } else if (contentMsg.text) {
        sentMsg = await botInstance.sendMessage(user.id, contentMsg.text, {
          reply_markup: keyboard
        });
      } else if (contentMsg.photo) {
        const fileId = contentMsg.photo[contentMsg.photo.length - 1].file_id;
        sentMsg = await botInstance.sendPhoto(user.id, fileId, {
          caption: contentMsg.caption || "",
          reply_markup: keyboard
        });
      } else if (contentMsg.document) {
        sentMsg = await botInstance.sendDocument(user.id, contentMsg.document.file_id, {
          caption: contentMsg.caption || "",
          reply_markup: keyboard
        });
      } else if (contentMsg.voice) {
        sentMsg = await botInstance.sendVoice(user.id, contentMsg.voice.file_id, {
          reply_markup: keyboard
        });
      } else if (contentMsg.video) {
        sentMsg = await botInstance.sendVideo(user.id, contentMsg.video.file_id, {
          caption: contentMsg.caption || "",
          reply_markup: keyboard
        });
      } else if (contentMsg.audio) {
        sentMsg = await botInstance.sendAudio(user.id, contentMsg.audio.file_id, {
          caption: contentMsg.caption || "",
          reply_markup: keyboard
        });
      }

      if (sentMsg && sentMsg.message_id) {
        sentMessagesList.push({ chatId: user.id, messageId: sentMsg.message_id });
      }

      deliveredUsers.push({
        id: user.id,
        name: user.name || "طالب",
        username: user.username || ""
      });
    } catch (err) {
      let failureReason = "خطأ غير معروف في الإرسال";
      if (err.response && err.response.statusCode === 403) {
        failureReason = "قام بحظر البوت أو حذف الحساب (403 Forbidden)";
        markUserInactive(user.id);
      } else if (err.response && err.response.statusCode === 400) {
        failureReason = "المحادثة غير موجودة أو معطوبة (400 Bad Request)";
      } else if (err.response && err.response.statusCode === 429) {
        failureReason = "تجاوز حد الإرسال المؤقت للتليجرام (429 Flood Wait)";
      } else if (err.message) {
        failureReason = err.message;
      }

      failedUsers.push({
        id: user.id,
        name: user.name || "طالب",
        username: user.username || "",
        reason: failureReason
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 35));
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  // حفظ سجل الإعلان لإمكانية التراجع والحذف من جميع الطلاب
  const broadcastRecord = saveBroadcastRecord({
    description: isPreset ? "إشعار التحديثات الجديدة" : (contentMsg.text ? contentMsg.text.slice(0, 60) : "إعلان وسائط"),
    totalSent: deliveredUsers.length,
    sentMessages: sentMessagesList
  });

  // إعداد نص تقرير الإذاعة
  let summaryText = `✅ *اكتملت عملية الإذاعة والإشعار الجماعي!*\n`;
  summaryText += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  summaryText += `📊 *إحصائيات الإرسال:*\n`;
  summaryText += `👥 *إجمالي المستهدفين:* ${totalUsers} طالب\n`;
  summaryText += `📥 *تم الاستلام بنجاح:* ${deliveredUsers.length} طالب\n`;
  summaryText += `❌ *تعذر الإرسال:* ${failedUsers.length} طالب\n`;
  summaryText += `⏱️ *المدة الزمنية:* ${duration} ثانية\n\n`;

  // 1. تفاصيل المتعذرين وأسباب التعذر
  if (failedUsers.length > 0) {
    summaryText += `❌ *الطلاب الذين تعذر الإرسال إليهم (${failedUsers.length}):*\n`;
    failedUsers.forEach((u, i) => {
      const uName = safeEscape(u.name || "طالب");
      const uTag = u.username ? ` (${safeEscape(u.username)})` : "";
      summaryText += `${i + 1}. *${uName}*${uTag} - \`ID: ${u.id}\`\n   ⚠️ *السبب:* ${safeEscape(u.reason)}\n`;
    });
    summaryText += `\n`;
  }

  // 2. تفاصيل المستلمين
  summaryText += `✅ *الطلاب الذين استلموا الإشعار بنجاح (${deliveredUsers.length}):*\n`;
  if (deliveredUsers.length <= 35) {
    deliveredUsers.forEach((u, i) => {
      const uName = safeEscape(u.name || "طالب");
      const uTag = u.username ? ` (${safeEscape(u.username)})` : " (بدون يوزر)";
      summaryText += `${i + 1}. *${uName}*${uTag}\n`;
    });
  } else {
    deliveredUsers.slice(0, 25).forEach((u, i) => {
      const uName = safeEscape(u.name || "طالب");
      const uTag = u.username ? ` (${safeEscape(u.username)})` : " (بدون يوزر)";
      summaryText += `${i + 1}. *${uName}*${uTag}\n`;
    });
    summaryText += `... وغيرهم (+${deliveredUsers.length - 25} طالب آخرين بالتفصيل في الملف المرفق)\n`;
  }

  // حفظ التقرير في ملف TXT للأرشفة والتنزيل
  const reportPath = path.join(__dirname, "data", "last_broadcast_report.txt");
  let fileData = `تقرير الإذاعة والإشعارات الجماعية - بوت هندسة الحاسوب\n`;
  fileData += `التاريخ والوقت: ${new Date().toLocaleString("ar-EG")}\n`;
  fileData += `المدة المستغرقة: ${duration} ثانية\n`;
  fileData += `إجمالي المستهدفين: ${totalUsers} طالب\n`;
  fileData += `تم الاستلام بنجاح: ${deliveredUsers.length} طالب\n`;
  fileData += `تعذر الإرسال: ${failedUsers.length} طالب\n`;
  fileData += `========================================================\n\n`;

  if (failedUsers.length > 0) {
    fileData += `[1] قائمة الطلاب الذين تعذر الإرسال إليهم والسبب:\n`;
    fileData += `--------------------------------------------------------\n`;
    failedUsers.forEach((u, i) => {
      fileData += `${i + 1}. Name: ${u.name} | Username: ${u.username || "None"} | ID: ${u.id}\n   -> السبب: ${u.reason}\n`;
    });
    fileData += `\n========================================================\n\n`;
  }

  fileData += `[2] قائمة الطلاب الذين استلموا الإشعار بنجاح:\n`;
  fileData += `--------------------------------------------------------\n`;
  deliveredUsers.forEach((u, i) => {
    fileData += `${i + 1}. Name: ${u.name} | Username: ${u.username || "None"} | ID: ${u.id}\n`;
  });

  try {
    fs.writeFileSync(reportPath, fileData, "utf8");
  } catch (e) {
    console.error("Error writing broadcast report file:", e);
  }

  const adminButtons = [
    [{ text: "🗑️ تراجع وحذف هذا الإعلان من جميع الطلاب فوراً", callback_data: `admin_unsend_broadcast_${broadcastRecord.id}` }],
    [{ text: "📄 تنزيل تقرير الإذاعة الكامل كملف", callback_data: "admin_download_broadcast_report" }],
    [{ text: "🎛️ لوحة التحكم", callback_data: "admin_dashboard" }],
    [{ text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }]
  ];

  if (summaryText.length < 3900) {
    await safeSend(botInstance, adminChatId, summaryText, {
      reply_markup: { inline_keyboard: adminButtons }
    });
  } else {
    let shortSummary = `✅ *اكتملت عملية الإذاعة بنجاح!*\n━━━━━━━━━━━━━━━━━━━━\n\n👥 *إجمالي المستهدفين:* ${totalUsers}\n📥 *تم الاستلام بنجاح:* ${deliveredUsers.length}\n❌ *تعذر الإرسال:* ${failedUsers.length}\n⏱️ *المدة الزمنية:* ${duration} ثانية.\n\n📄 تجد في الملف المرفق أدناه تفاصيل وأسماء جميع المستلمين والمتعذرين وأسباب التعذر بالتفصيل.`;
    await safeSend(botInstance, adminChatId, shortSummary);
    await safeSendDocument(botInstance, adminChatId, reportPath, {
      caption: `📄 تقرير الإذاعة الكامل (${deliveredUsers.length} مستلم | ${failedUsers.length} متعذر)`,
      reply_markup: { inline_keyboard: adminButtons }
    });
  }
}

/**
 * إرسال استطلاع رأي خاص وتفاعلي لجميع الطلاب (نتائجه وهوية المصوتين حصرية للأدمن فقط)
 */
async function broadcastPollToStudents(botInstance, question, options, adminChatId = ADMIN_ID) {
  const users = loadUsers();
  const targetUsers = users.filter((u) => u.active !== false && !u.banned);
  const totalUsers = targetUsers.length;

  if (totalUsers === 0) {
    safeSend(botInstance, adminChatId, "⚠️ لا يوجد طلاب نشطين حالياً لإرسال الاستطلاع.");
    return;
  }

  const cleanQuestion = (question || "استطلاع رأي لطلبة قسم هندسة الحاسوب").trim().slice(0, 290);
  const cleanOptions = (options || ["نعم", "لا"]).map(o => o.trim().slice(0, 95)).filter(Boolean).slice(0, 10);

  if (cleanOptions.length < 2) {
    safeSend(botInstance, adminChatId, "❌ يجب توفير خيارين على الأقل لإنشاء الاستطلاع.");
    return;
  }

  const poll = createPoll(cleanQuestion, cleanOptions);

  await safeSend(
    botInstance,
    adminChatId,
    `⏳ *جاري إرسال استطلاع الرأي لجميع الطلاب (${totalUsers} طالب)...*\n\n📊 *السؤال:* ${cleanQuestion}`
  );

  let successCount = 0;
  let failCount = 0;
  const pollKeyboard = cleanOptions.map((opt, idx) => [
    { text: `▫️ ${opt}`, callback_data: `poll_vote_${poll.id}_${idx}` }
  ]);

  for (const user of targetUsers) {
    try {
      const text = `🗳️ *استطلاع رأي لطلبة قسم هندسة الحاسوب*\n━━━━━━━━━━━━━━━━━━━━\n\n📌 *السؤال:* ${cleanQuestion}\n\n👇 *اختر إجابتك من الأزرار أدناه (التصويت سري ومحفوظ للإدارة):*`;
      const sent = await botInstance.sendMessage(user.id, text, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: pollKeyboard }
      });
      if (sent && sent.message_id) {
        poll.sentMessages.push({ chatId: user.id, messageId: sent.message_id });
      }
      successCount++;
    } catch (err) {
      failCount++;
      if (err.response && (err.response.statusCode === 403 || err.response.statusCode === 400)) {
        markUserInactive(user.id);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 35));
  }

  // تحديث حفظ رسائل الاستطلاع في قاعدة البيانات
  const allPolls = loadPolls();
  const pollIndex = allPolls.findIndex(p => p.id === poll.id);
  if (pollIndex !== -1) {
    allPolls[pollIndex].sentMessages = poll.sentMessages;
    savePolls(allPolls);
  }

  const resultMsg = `🗳️ *اكتمل إرسال استطلاع الرأي للطلاب بنجاح!*\n━━━━━━━━━━━━━━━━━━━━\n\n📌 *السؤال:* ${cleanQuestion}\n👥 *إجمالي المستهدفين:* ${totalUsers}\n✅ *تم الإرسال بنجاح إلى:* ${successCount} طالب\n❌ *تعذر الإرسال إلى:* ${failCount} طالب\n\n🔒 *ميزة الخصوصية التامة:* الطلاب يصوتون بسرية تامة دون رؤية نسب أو أصوات غيرهم. أنت فقط من يرى النتائج الحية وهوية وتفاصيل من صوّت لكل خيار!`;

  await safeSend(botInstance, adminChatId, resultMsg, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📊 متابعة نتائج وتفاصيل التصويت الحية", callback_data: `admin_poll_view_${poll.id}` }],
        [{ text: "🗑️ تراجع وحذف الاستطلاع من الطلاب", callback_data: `admin_poll_unsend_${poll.id}` }],
        [{ text: "🎛️ لوحة التحكم", callback_data: "admin_dashboard" }]
      ]
    }
  });
}

require("./data/rating")(bot, userState);
const utils = require("./data/utils");

// ==========================================
// 1. خريطة البيانات والفهارس والبحث المتقدم
// ==========================================

// بيانات ومطابقات مواد السنوات (courses.js) مع الأكواد (خطة 4 سنوات وخطة 5 سنوات) والأسماء العربية والمرادفات
const metaMap = {
  year1: {
    semester1: {
      "Scientific Research Methodology": {
        code5: "ENGG 1104",
        code4: "ENGG 1206",
        code: "ENGG 1104 (خطة 5 سنوات) | ENGG 1206 (خطة 4 سنوات)",
        codes: ["ENGG 1104", "ENGG 1206"],
        ar: "منهجية بحث علمي",
        aliases: ["ENGG 1104", "ENGG 1206", "ENGG1104", "ENGG1206", "أساسيات الهندسة والبحث العلمي", "اساسيات الهندسة والبحث العلمي", "منهجية بحث", "منهجيه بحث علمي", "بحث علمي", "research methodology"]
      },
      "Introduction to Engineering": {
        code5: "ENGG 1101",
        code4: "ENGG 1206",
        code: "ENGG 1101 (خطة 5 سنوات) | ENGG 1206 (خطة 4 سنوات)",
        codes: ["ENGG 1101", "ENGG 1206"],
        ar: "مقدمة في الهندسة",
        aliases: ["ENGG 1101", "ENGG 1206", "ENGG1101", "ENGG1206", "أساسيات الهندسة والبحث العلمي", "اساسيات الهندسة والبحث العلمي", "مقدمة هندسة", "مقدمه هندسه", "مقدمه في الهندسه", "intro to engineering"]
      },
      "Engineering Drawing": {
        code5: "ENGG 1204",
        code4: "ENGG 1209",
        code: "ENGG 1204 (خطة 5 سنوات) | ENGG 1209 (خطة 4 سنوات)",
        codes: ["ENGG 1204", "ENGG 1209"],
        ar: "رسم هندسي",
        aliases: ["ENGG 1204", "ENGG 1209", "ENGG1204", "ENGG1209", "رسم هندسي بالحاسوب", "رسم", "اوكاد", "اوتوكاد", "autocad", "drawing", "engineering drawing"]
      },
      "Calculus A": {
        code5: "MATHB1301",
        code4: "MATHA1301",
        code: "MATHB1301 (خطة 5 سنوات) | MATHA1301 (خطة 4 سنوات)",
        codes: ["MATHB1301", "MATHA1301", "MATH 1301"],
        ar: "تفاضل وتكامل (أ)",
        aliases: ["MATHB1301", "MATHA1301", "MATH 1301", "MATHA 1301", "MATHB 1301", "تفاضل وتكامل أ", "تفاضل وتكامل 1", "تفاضل أ", "تفاضل 1", "كالكولاس أ", "كالكولاس 1", "calculus 1", "calculus a", "math 1"]
      },
      "General Physics Lab A": {
        code5: "PHYSA1102",
        code4: "PHYSA1102",
        code: "PHYSA1102",
        codes: ["PHYSA1102", "PHYS 1102", "PHYSA 1102"],
        ar: "فيزياء عامة عملية (أ)",
        aliases: ["PHYSA1102", "PHYS 1102", "PHYSA 1102", "فيزياء عامة عملي أ", "فيزياء عامه عمليه أ", "معمل فيزياء أ", "مختبر فيزياء أ", "فيزياء عملي 1", "معمل فيزياء 1", "physics lab a", "physics lab 1"]
      },
      "General Physics A": {
        code5: "PHYSA1301",
        code4: "PHYSA1301",
        code: "PHYSA1301",
        codes: ["PHYSA1301", "PHYS 1301", "PHYSA 1301"],
        ar: "فيزياء عامة (أ)",
        aliases: ["PHYSA1301", "PHYS 1301", "PHYSA 1301", "فيزياء عامة أ", "فيزياء عامه أ", "فيزياء أ", "فيزياء 1", "physics a", "physics 1"]
      }
    },
    semester2: {
      "General Chemistry": {
        code5: "CHEM 1302",
        code: "CHEM 1302",
        codes: ["CHEM 1302"],
        ar: "كيمياء عامة",
        aliases: ["CHEM 1302", "CHEM1302", "كيمياء عامه", "كيمياء", "chemistry", "general chemistry"]
      },
      "Workshop Technology": {
        code5: "ENGG 1103",
        code: "ENGG 1103",
        codes: ["ENGG 1103"],
        ar: "تقنية الورش",
        aliases: ["ENGG 1103", "ENGG1103", "تقنيه الورش", "ورش", "workshop"]
      },
      "Introduction to Computers": {
        code5: "ENGG 1203",
        code4: "ENGG 1301",
        code: "ENGG 1203 (خطة 5 سنوات) | ENGG 1301 (خطة 4 سنوات)",
        codes: ["ENGG 1203", "ENGG 1301"],
        ar: "مقدمة في الحاسوب",
        aliases: ["ENGG 1203", "ENGG 1301", "ENGG1203", "ENGG1301", "أساسيات البرمجة", "اساسيات البرمجة", "مقدمة حاسوب", "مقدمه في الحاسوب", "اساسيات حاسوب", "بايثون", "python", "intro to computers"]
      },
      "Introduction to Computers Lab": {
        code: "",
        ar: "مقدمة في الحاسوب (عملي)",
        aliases: ["مقدمة حاسوب عملي", "معمل مقدمة حاسوب", "معمل بايثون", "intro to computers lab", "python lab"]
      },
      "Technical English": {
        code5: "ENGG 1305",
        code4: "ENGG 1305",
        code: "ENGG 1305",
        codes: ["ENGG 1305"],
        ar: "لغة إنجليزية تقنية",
        aliases: ["ENGG 1305", "ENGG1305", "لغة انجليزية تقنية", "انجليزي تقني", "لغة انجليزية", "technical english", "english"]
      },
      "Calculus B": {
        code5: "MATHB1401",
        code4: "MATHB1302",
        code: "MATHB1401 (خطة 5 سنوات) | MATHB1302 (خطة 4 سنوات)",
        codes: ["MATHB1401", "MATHB1302", "MATH 1401", "MATH 1302"],
        ar: "تفاضل وتكامل (ب)",
        aliases: ["MATHB1401", "MATHB1302", "MATH 1401", "MATH 1302", "MATHB 1401", "MATHB 1302", "تفاضل وتكامل ب", "تفاضل وتكامل 2", "تفاضل ب", "تفاضل 2", "كالكولاس ب", "كالكولاس 2", "calculus 2", "calculus b", "math 2"]
      },
      "General Physics B": {
        code5: "PHYSB1301",
        code: "PHYSB1301",
        codes: ["PHYSB1301", "PHYS 1302", "PHYSB 1301"],
        ar: "فيزياء عامة (ب)",
        aliases: ["PHYSB1301", "PHYS 1302", "PHYSB 1301", "فيزياء عامة ب", "فيزياء عامه ب", "فيزياء ب", "فيزياء 2", "physics b", "physics 2"]
      }
    }
  },
  year2: {
    semester1: {
      "Computer Programming 1": {
        code5: "ECOM 2401",
        code4: "ECOM 1401",
        code: "ECOM 2401 (خطة 5 سنوات) | ECOM 1401 (خطة 4 سنوات)",
        codes: ["ECOM 2401", "ECOM 1401"],
        ar: "برمجة حاسوب (1)",
        aliases: ["ECOM 2401", "ECOM 1401", "ECOM2401", "ECOM1401", "برمجة حاسوب 1", "برمجة 1", "برمجه 1", "برمجة", "جافا 1", "جافا", "java 1", "java", "programming 1", "computer programming 1"]
      },
      "Digital Design 1": {
        code5: "ECOM 2411",
        code4: "ECOM 1301",
        code: "ECOM 2411 (خطة 5 سنوات) | ECOM 1301 (خطة 4 سنوات)",
        codes: ["ECOM 2411", "ECOM 1301"],
        ar: "تصميم رقمي تجميعي",
        aliases: ["ECOM 2411", "ECOM 1301", "ECOM2411", "ECOM1301", "تصميم رقمي", "تصميم رقمي 1", "ديجيتال 1", "ديجيتال", "digital design 1", "digital 1"]
      },
      "Digital Design Lab 1": {
        code4: "ECOM 1101",
        code: "ECOM 1101 (خطة 4 سنوات)",
        codes: ["ECOM 1101"],
        ar: "تصميم رقمي تجميعي (عملي)",
        aliases: ["ECOM 1101", "ECOM1101", "مختبر تصميم رقمي", "معمل تصميم رقمي 1", "معمل ديجيتال 1", "تصميم رقمي عملي 1", "digital design lab 1", "logisim"]
      },
      "Computer Programming Lab 1": {
        code: "",
        ar: "برمجة حاسوب (1) عملي",
        aliases: ["معمل برمجة حاسوب 1", "معمل برمجة 1", "معمل جافا 1", "برمجة عملي 1", "programming lab 1", "java lab 1"]
      },
      "Electric Circuits 1": {
        code5: "EELE 2310",
        code4: "EELE 1301",
        code: "EELE 2310 (خطة 5 سنوات) | EELE 1301 (خطة 4 سنوات)",
        codes: ["EELE 2310", "EELE 1301"],
        ar: "دوائر كهربائية (1) (اتصالات وتحكم)",
        aliases: ["EELE 2310", "EELE 1301", "EELE2310", "EELE1301", "دوائر كهربائية 1", "دوائر كهربائيه 1", "دوائر 1", "سيركت 1", "سيركتس 1", "electric circuits 1", "circuits 1"]
      },
      "Electric Circuits Lab 1": {
        code5: "EELE 2110",
        code4: "EELE 1101",
        code: "EELE 2110 (خطة 5 سنوات) | EELE 1101 (خطة 4 سنوات)",
        codes: ["EELE 2110", "EELE 1101"],
        ar: "دوائر كهربائية (1) (عملي)",
        aliases: ["EELE 2110", "EELE 1101", "EELE2110", "EELE1101", "مختبر دوائر كهربائية 1", "معمل دوائر كهربائية 1", "معمل دوائر 1", "معمل سيركت 1", "دوائر عملي 1", "circuits lab 1", "ltspice"]
      }
    },
    semester2: {
      "Linear Algebra": {
        code5: "MATH 2341",
        code4: "MATH 2341",
        code: "MATH 2341",
        codes: ["MATH 2341"],
        ar: "جبر خطي",
        aliases: ["MATH 2341", "MATH2341", "جبر خطي", "جبر", "لينيار", "لينيار الجبرا", "linear algebra"]
      },
      "Computer Programming 2": {
        code5: "ECOM 2402",
        code4: "ECOM 2402",
        code: "ECOM 2402",
        codes: ["ECOM 2402"],
        ar: "برمجة حاسوب (2)",
        aliases: ["ECOM 2402", "ECOM2402", "برمجة حاسوب 2", "برمجة 2", "برمجه 2", "جافا 2", "oop", "java 2", "programming 2", "computer programming 2"]
      },
      "Digital Design 2": {
        code5: "ECOM 2421",
        code: "ECOM 2421",
        codes: ["ECOM 2421"],
        ar: "تصميم رقمي تتابعي",
        aliases: ["ECOM 2421", "ECOM2421", "تصميم رقمي 2", "ديجيتال 2", "digital design 2", "digital 2"]
      },
      "Electronics 1": {
        code5: "EELE 2320",
        code4: "EELE 1303",
        code: "EELE 2320 (خطة 5 سنوات) | EELE 1303 (خطة 4 سنوات)",
        codes: ["EELE 2320", "EELE 1303"],
        ar: "إلكترونيات (1)",
        aliases: ["EELE 2320", "EELE 1303", "EELE2320", "EELE1303", "الكترونيات 1", "الكترونيات", "إلكترونيات", "الكترونكس 1", "electronics 1"]
      },
      "Electronics Lab 1": {
        code5: "EELE 2120",
        code4: "EELE 1103",
        code: "EELE 2120 (خطة 5 سنوات) | EELE 1103 (خطة 4 سنوات)",
        codes: ["EELE 2120", "EELE 1103"],
        ar: "إلكترونيات (1) عملي",
        aliases: ["EELE 2120", "EELE 1103", "EELE2120", "EELE1103", "مختبر إلكترونيات 1", "مختبر الكترونيات 1", "معمل إلكترونيات 1", "معمل الكترونيات 1", "الكترونيات عملي 1", "electronics lab 1"]
      },
      "Ordinary Differential Equations": {
        code5: "MATH 2302",
        code4: "MATH 2302",
        code: "MATH 2302",
        codes: ["MATH 2302"],
        ar: "معادلات تفاضلية عادية",
        aliases: ["MATH 2302", "MATH2302", "معادلات تفاضلية", "معادلات تفاضليه", "دفرنشل", "ode", "differential equations"]
      },
      "Computer Programming Lab 2": {
        code: "",
        ar: "برمجة حاسوب (2) عملي",
        aliases: ["معمل برمجة حاسوب 2", "معمل برمجة 2", "معمل جافا 2", "برمجة عملي 2", "programming lab 2", "java lab 2"]
      },
      "Digital Design Lab 2": {
        code: "",
        ar: "تصميم رقمي تتابعي (عملي)",
        aliases: ["معمل تصميم رقمي 2", "معمل ديجيتال 2", "تصميم رقمي عملي 2", "digital design lab 2"]
      }
    }
  },
  year3: {
    semester1: {
      "Discrete mathematics": {
        code5: "ECOM 3411",
        code4: "ECOM 2311",
        code: "ECOM 3411 (خطة 5 سنوات) | ECOM 2311 (خطة 4 سنوات)",
        codes: ["ECOM 3411", "ECOM 2311"],
        ar: "رياضيات متقطعة",
        aliases: ["ECOM 3411", "ECOM 2311", "ECOM3411", "ECOM2311", "رياضيات متقطعه", "دسكريت", "دسجريت", "ديسكربت", "discrete math", "discrete mathematics"]
      },
      "Discrete mathematics Lab": {
        code: "",
        ar: "رياضيات متقطعة (عملي)",
        aliases: ["معمل رياضيات متقطعة", "رياضيات متقطعة عملي", "discrete math lab"]
      },
      "Data structures and algorithms": {
        code5: "ECOM 3412",
        code4: "ECOM 2407",
        code: "ECOM 3412 (خطة 5 سنوات) | ECOM 2407 (خطة 4 سنوات)",
        codes: ["ECOM 3412", "ECOM 2407"],
        ar: "تراكيب بيانات وخوارزميات",
        aliases: ["ECOM 3412", "ECOM 2407", "ECOM3412", "ECOM2407", "تراكيب بيانات", "خوارزميات", "هياكل بيانات", "داتا ستراكشر", "data structures", "algorithms", "data structures and algorithms"]
      },
      "Data structures and algorithms Lab": {
        code: "",
        ar: "تراكيب بيانات وخوارزميات (عملي)",
        aliases: ["معمل تراكيب بيانات وخوارزميات", "معمل خوارزميات", "معمل تراكيب بيانات", "data structures lab"]
      },
      "Linear signals and systems": {
        code5: "EELE 3310",
        code4: "EELE 2307",
        code: "EELE 3310 (خطة 5 سنوات) | EELE 2307 (خطة 4 سنوات)",
        codes: ["EELE 3310", "EELE 2307"],
        ar: "إشارات وأنظمة خطية",
        aliases: ["EELE 3310", "EELE 2307", "EELE3310", "EELE2307", "اشارات وانظمة خطية", "اشارات وانظمه خطيه", "اشارات ونظم", "إشارات ونظم", "سيجنال", "signals and systems", "linear signals", "signals"]
      },
      "Practical linear signals and systems": {
        code5: "EELE 3110",
        code4: "EELE 2107",
        code: "EELE 3110 (خطة 5 سنوات) | EELE 2107 (خطة 4 سنوات)",
        codes: ["EELE 3110", "EELE 2107"],
        ar: "إشارات وأنظمة خطية (عملي)",
        aliases: ["EELE 3110", "EELE 2107", "EELE3110", "EELE2107", "معمل إشارات وأنظمة خطية", "معمل اشارات", "اشارات عملي", "signals lab"]
      },
      "Probability and Statistics Theory": {
        code5: "EELE 3340",
        code4: "MATH 2300",
        code: "EELE 3340 (خطة 5 سنوات) | MATH 2300 (خطة 4 سنوات)",
        codes: ["EELE 3340", "MATH 2300"],
        ar: "نظرية احتمالات وإحصاء",
        aliases: ["EELE 3340", "MATH 2300", "EELE3340", "MATH2300", "الإحصاء والاحتمالات", "احتمالات وإحصاء", "احتمالات واحصاء", "احتمالات", "إحصاء", "احصاء", "بروبابيليتي", "probability and statistics", "probability"]
      }
    },
    semester2: {
      "Computer architecture": {
        code5: "ECOM 3421",
        code4: "ECOM 3421",
        code: "ECOM 3421",
        codes: ["ECOM 3421"],
        ar: "عمارة حاسوب",
        aliases: ["ECOM 3421", "ECOM3421", "عمارة حاسبات", "معمارية حاسوب", "عمارة الحاسوب", "اركيتكتشر", "computer architecture", "architecture"]
      },
      "Computer architecture Lab": {
        code: "",
        ar: "عمارة حاسوب (عملي)",
        aliases: ["معمل عمارة حاسوب", "عمارة حاسوب عملي", "computer architecture lab"]
      },
      "database systems": {
        code5: "ECOM 3422",
        code4: "ECOM 3409",
        code: "ECOM 3422 (خطة 5 سنوات) | ECOM 3409 (خطة 4 سنوات)",
        codes: ["ECOM 3422", "ECOM 3409"],
        ar: "نظم قواعد بيانات",
        aliases: ["ECOM 3422", "ECOM 3409", "ECOM3422", "ECOM3409", "نظم قواعد البيانات", "قواعد بيانات", "داتا بيز", "داتابيز", "database", "database systems", "db"]
      },
      "database systems Lab": {
        code: "",
        ar: "نظم قواعد بيانات (عملي)",
        aliases: ["معمل قواعد بيانات", "معمل داتابيز", "قواعد بيانات عملي", "database lab", "sql"]
      },
      "digital electronics": {
        code5: "EELE 3321",
        code4: "EELE 2303",
        code: "EELE 3321 (خطة 5 سنوات) | EELE 2303 (خطة 4 سنوات)",
        codes: ["EELE 3321", "EELE 2303"],
        ar: "إلكترونيات رقمية",
        aliases: ["EELE 3321", "EELE 2303", "EELE3321", "EELE2303", "الكترونيات رقمية", "الكترونيات رقميه", "ديجيتال الكترونكس", "digital electronics"]
      },
      "Practical digital electronics": {
        code5: "EELE 3121",
        code4: "EELE 2103",
        code: "EELE 3121 (خطة 5 سنوات) | EELE 2103 (خطة 4 سنوات)",
        codes: ["EELE 3121", "EELE 2103"],
        ar: "إلكترونيات رقمية (عملي)",
        aliases: ["EELE 3121", "EELE 2103", "EELE3121", "EELE2103", "معمل إلكترونيات رقمية", "معمل الكترونيات رقمية", "الكترونيات رقمية عملي", "digital electronics lab"]
      },
      "Linear control systems": {
        code5: "EELE 3360",
        code4: "EELE 3360",
        code: "EELE 3360",
        codes: ["EELE 3360"],
        ar: "أنظمة التحكم الخطية",
        aliases: ["EELE 3360", "EELE3360", "انظمة التحكم الخطية", "انظمة تحكم خطية", "انظمة تحكم", "كنترول", "control systems", "control"]
      },
      "Linear control systems practical": {
        code5: "EELE 3160",
        code4: "EELE 3160",
        code: "EELE 3160",
        codes: ["EELE 3160"],
        ar: "أنظمة التحكم الخطية (عملي)",
        aliases: ["EELE 3160", "EELE3160", "معمل أنظمة التحكم الخطية", "معمل تحكم", "انظمة تحكم عملي", "control lab", "labview"]
      }
    }
  },
  year4: {
    semester1: {
      "Operating Systems": {
        code5: "ECOM 4401",
        code4: "ECOM 3401",
        code: "ECOM 4401 (خطة 5 سنوات) | ECOM 3401 (خطة 4 سنوات)",
        codes: ["ECOM 4401", "ECOM 3401"],
        ar: "نظم تشغيل",
        aliases: ["ECOM 4401", "ECOM 3401", "ECOM4401", "ECOM3401", "انظمة تشغيل", "انظمة التشغيل", "نظم التشغيل", "او اس", "operating systems", "os"]
      },
      "Operating Systems Lab": {
        code: "",
        ar: "نظم تشغيل (عملي)",
        aliases: ["معمل نظم تشغيل", "معمل لينكس", "نظم تشغيل عملي", "operating systems lab", "linux", "ubuntu"]
      },
      "Data Communication": {
        code5: "ECOM 4411",
        code4: "ECOM 3403",
        code: "ECOM 4411 (خطة 5 سنوات) | ECOM 3403 (خطة 4 سنوات)",
        codes: ["ECOM 4411", "ECOM 3403"],
        ar: "اتصالات بيانات",
        aliases: ["ECOM 4411", "ECOM 3403", "ECOM4411", "ECOM3403", "اتصالات البيانات", "داتا كوم", "data communication", "data communications", "data comm"]
      },
      "Data Communication Lab": {
        code: "",
        ar: "اتصالات بيانات (عملي)",
        aliases: ["معمل اتصالات بيانات", "اتصالات بيانات عملي", "data communication lab", "wireshark"]
      },
      "Assembly Language": {
        code5: "ECOM 4412",
        code4: "ECOM 3306",
        code: "ECOM 4412 (خطة 5 سنوات) | ECOM 3306 (خطة 4 سنوات)",
        codes: ["ECOM 4412", "ECOM 3306"],
        ar: "لغة تجميع",
        aliases: ["ECOM 4412", "ECOM 3306", "ECOM4412", "ECOM3306", "لغة التجميع", "اسمبلي", "اسمبلي لانجوج", "assembly language", "assembly"]
      },
      "Assembly Language Lab": {
        code: "",
        ar: "لغة تجميع (عملي)",
        aliases: ["معمل لغة تجميع", "معمل اسمبلي", "لغة تجميع عملي", "assembly lab"]
      },
      "تدريب عملي(250)ساعة": {
        code5: "ECOM 5000",
        code4: "ECOM 3002",
        code: "ECOM 5000 (خطة 5 سنوات) | ECOM 3002 (خطة 4 سنوات)",
        codes: ["ECOM 5000", "ECOM 3002"],
        ar: "تدريب عملي (250 ساعة)",
        aliases: ["ECOM 5000", "ECOM 3002", "ECOM5000", "ECOM3002", "تدريب عملي", "تدريب ميداني", "تدريب", "تدريب 250 ساعة", "practical training", "internship"]
      }
    },
    semester2: {
      "Computer Networks": {
        code5: "ECOM 4421",
        code4: "ECOM 3402",
        code: "ECOM 4421 (خطة 5 سنوات) | ECOM 3402 (خطة 4 سنوات)",
        codes: ["ECOM 4421", "ECOM 3402"],
        ar: "شبكات حاسوب",
        aliases: ["ECOM 4421", "ECOM 3402", "ECOM4421", "ECOM3402", "شبكات الحاسوب", "شبكات", "نتورك", "computer networks", "networks"]
      },
      "Computer Networks Lab": {
        code: "",
        ar: "شبكات حاسوب (عملي)",
        aliases: ["معمل شبكات حاسوب", "معمل شبكات", "شبكات عملي", "computer networks lab", "packet tracer"]
      },
      "Embedded Systems": {
        code5: "ECOM 4422",
        code4: "ECOM 4301",
        code: "ECOM 4422 (خطة 5 سنوات) | ECOM 4301 (خطة 4 سنوات)",
        codes: ["ECOM 4422", "ECOM 4301"],
        ar: "نظم مدموجة",
        aliases: ["ECOM 4422", "ECOM 4301", "ECOM4422", "ECOM4301", "نظم مغموسة", "انظمة مدمجة", "انظمة مدموجة", "نظم مدمجة", "امبيدد", "امبيدد سيستمز", "embedded systems", "embedded"]
      },
      "Embedded Systems Lab": {
        code: "",
        ar: "نظم مدموجة (عملي)",
        aliases: ["معمل نظم مدموجة", "معمل امبيدد", "نظم مدمجة عملي", "embedded systems lab", "proteus"]
      },
      "VHDL": {
        code5: "ECOM 4423",
        code: "ECOM 4423",
        codes: ["ECOM 4423"],
        ar: "لغات وصف معدات حاسوب",
        aliases: ["ECOM 4423", "ECOM4423", "في اتش دي ال", "vhdl", "hardware description language"]
      },
      "VHDL Lab": {
        code: "",
        ar: "لغات وصف معدات حاسوب (عملي)",
        aliases: ["معمل vhdl", "معمل لغات وصف معدات حاسوب", "vhdl lab", "quartus"]
      },
      "Software Engineering": {
        code5: "ECOM 4424",
        code: "ECOM 4424",
        codes: ["ECOM 4424"],
        ar: "هندسة برمجيات",
        aliases: ["ECOM 4424", "ECOM4424", "هندسة البرمجيات", "سوفتوير", "software engineering", "software"]
      }
    }
  },
  year5: {
    semester1: {
      "AI": {
        code5: "OPTI 5401",
        code: "OPTI 5401",
        codes: ["OPTI 5401"],
        ar: "ذكاء اصطناعي",
        aliases: ["OPTI 5401", "OPTI5401", "الذكاء الاصطناعي", "ai", "artificial intelligence"]
      },
      "AI Lab": {
        code: "",
        ar: "ذكاء اصطناعي (عملي)",
        aliases: ["معمل ذكاء اصطناعي", "ذكاء اصطناعي عملي", "ai lab"]
      },
      "Digital & SystemVerilog": {
        code: "",
        ar: "ديجيتال اند سيستم فيريلوج",
        aliases: ["سستم فيريلوج", "سيستم فيريلوج", "systemverilog", "system verilog", "digital & systemverilog"]
      },
      "Network Security": {
        code5: "ECOM 5401",
        code: "ECOM 5401",
        codes: ["ECOM 5401"],
        ar: "أمن حاسوب وشبكات",
        aliases: ["ECOM 5401", "ECOM5401", "امن حاسوب وشبكات", "أمن شبكات", "امن شبكات", "سكيورتي", "network security", "cyber security"]
      },
      "Deep learning": {
        code5: "ECOM 5448",
        code: "ECOM 5448",
        codes: ["ECOM 5448"],
        ar: "تعلم عميق",
        aliases: ["ECOM 5448", "ECOM5448", "التعلم العميق", "ديب ليرنينج", "ديب ليرننج", "deep learning"]
      },
      "Network Security Lab": {
        code: "",
        ar: "أمن حاسوب وشبكات (عملي)",
        aliases: ["معمل أمن شبكات", "معمل امن شبكات", "امن شبكات عملي", "network security lab"]
      },
      "Digital Image Processing": {
        code5: "EELE 5426",
        code: "EELE 5426",
        codes: ["EELE 5426"],
        ar: "معالجة صور رقمية",
        aliases: ["EELE 5426", "EELE5426", "معالجة الصور الرقمية", "معالجة صور", "ايمج بروسيسنج", "image processing", "digital image processing"]
      }
    },
    semester2: {
      "Security In Computer Systems": {
        code: "",
        ar: "أمن في أنظمة الحاسوب",
        aliases: ["امن في انظمة الحاسوب", "امن انظمة", "security in computer systems"]
      },
      "Selected Topics Material": {
        code5: "ECOM 5400",
        code: "ECOM 5400",
        codes: ["ECOM 5400"],
        ar: "مواضيع مختارة",
        aliases: ["ECOM 5400", "ECOM5400", "مواضيع مختارة في هندسة الحاسوب", "مواضيع مختاره", "selected topics"]
      },
      "Distributed and parallel computerization": {
        code5: "ECOM 5416",
        code: "ECOM 5416",
        codes: ["ECOM 5416"],
        ar: "حوسبة متوزعة ومتوازية",
        aliases: ["ECOM 5416", "ECOM5416", "حوسبة موزعة ومتوازية", "حوسبة متوازية وموزعة", "حوسبة متوازية", "distributed and parallel", "parallel computing"]
      },
      "Renewable energy systems Lab": {
        code5: "ESMA 4106",
        code: "ESMA 4106",
        codes: ["ESMA 4106"],
        ar: "أنظمة الطاقة المتجددة (عملي)",
        aliases: ["ESMA 4106", "ESMA4106", "أنظمة الطاقة المتجددة", "انظمة الطاقة المتجددة", "معمل طاقة متجددة", "طاقة متجددة", "renewable energy"]
      }
    }
  }
};

// فهرس متطلبات الجامعة (uniRequirements.js)
const uniReqMeta = {
  "قرآن كريم 1": { code: "QURN 1101", codes: ["QURN 1101"], aliases: ["QURN 1101", "QURN1101", "قران كريم 1", "قران 1", "قرآن 1", "قران كريم (1)", "قرآن كريم (1)"] },
  "قرآن كريم 2": { code: "QURN 2101", codes: ["QURN 2101"], aliases: ["QURN 2101", "QURN2101", "قران كريم 2", "قران 2", "قرآن 2", "قران كريم (2)", "قرآن كريم (2)"] },
  "قرآن كريم 3": { code: "QURN 3101", codes: ["QURN 3101"], aliases: ["QURN 3101", "QURN3101", "قران كريم 3", "قران 3", "قرآن 3", "قران كريم (3)", "قرآن كريم (3)"] },
  "قرآن كريم 4": { code: "QURN 4102", codes: ["QURN 4102"], aliases: ["QURN 4102", "QURN4102", "قران كريم 4", "قران 4", "قرآن 4", "قران كريم (4)", "قرآن كريم (4)"] },
  "دراسات في العقيدة": { code: "AQID 3306", codes: ["AQID 3306"], aliases: ["AQID 3306", "AQID3306", "عقيدة", "العقيدة", "دراسات في العقيده", "عقيده"] },
  "دراسات في الفقه": { code: "SHAR 1202", codes: ["SHAR 1202"], aliases: ["SHAR 1202", "SHAR1202", "فقه", "الفقه", "دراسات فقه", "دراسات في الفقه"] },
  "دراسات في الحديث": { code: "HADT 4204", codes: ["HADT 4204"], aliases: ["HADT 4204", "HADT4204", "حديث", "الحديث", "دراسات في الحديث الشريف", "حديث شريف"] },
  "دراسات في السيرة النبوية": { code: "HADT 1202", codes: ["HADT 1202"], aliases: ["HADT 1202", "HADT1202", "سيرة", "السيرة", "دراسات في السيرة", "سيره نبوية", "سيرة نبوية"] },
  "دراسات في القرآن وعلومه": { code: "QURN 2201", codes: ["QURN 2201"], aliases: ["QURN 2201", "QURN2201", "علوم القران", "دراسات في القرآن وعلمه", "دراسات في القران وعلومه", "قران وعلومه"] },
  "دراسات فلسطينية": { code: "POLS 3220", codes: ["POLS 3220"], aliases: ["POLS 3220", "POLS3220", "دراسات فلسطينيه", "فلسطينية", "فلسطينيه", "قضية فلسطينية", "تاريخ فلسطين"] },
  "النظم الإسلامية": { code: "SHAR 2207", codes: ["SHAR 2207"], aliases: ["SHAR 2207", "SHAR2207", "النظم الاسلامية", "نظم اسلامية", "النظم الاسلاميه", "نظم اسلاميه"] },
  "حاضر العالم الإسلامي": { code: "AQID 3201", codes: ["AQID 3201"], aliases: ["AQID 3201", "AQID3201", "حاضر العالم الاسلامي", "حاضر", "حاضر العالم"] },
  "نحو وصرف": { code: "ARAB 1202", codes: ["ARAB 1202"], aliases: ["ARAB 1202", "ARAB1202", "اللغة العربية (نحو وصرف)", "عربي", "لغة عربية", "لغه عربيه", "اللغة العربية", "نحو"] },
  "إسعافات أولية": { code: "", aliases: ["اسعافات اولية", "اسعافات اوليه", "اسعافات", "إسعافات"] }
};

// إنشاء فهرس سريع للبحث في جميع المواد
const courseCatalog = [];
for (const year in courses) {
  for (const semester in courses[year]) {
    for (const subject in courses[year][semester]) {
      const meta = metaMap[year]?.[semester]?.[subject] || {};
      courseCatalog.push({
        id: courseCatalog.length,
        type: "course",
        name: subject,
        arName: meta.ar || "",
        code: meta.code || "",
        codes: meta.codes || (meta.code ? [meta.code] : []),
        code5: meta.code5 || "",
        code4: meta.code4 || "",
        year: year,
        semester: semester,
        aliases: meta.aliases || [],
        data: courses[year][semester][subject]
      });
    }
  }
}

// دوال تنظيف وتطبيع النصوص للبحث الذكي
function normalizeText(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\(\)\-\_\,\.\:\;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCode(text) {
  if (!text) return "";
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// دالة محرك البحث الشامل
function searchAll(query) {
  const qNorm = normalizeText(query);
  const qCode = normalizeCode(query);
  const isLikelyCode = /^[a-z]{2,5}\d{3,4}[a-z]?$/i.test(qCode) || /^\d{3,4}$/.test(qCode);
  const results = [];

  // 1. البحث في مواد التخصص (courses.js)
  for (const item of courseCatalog) {
    let score = 0;
    const subNorm = normalizeText(item.name);
    const arNorm = normalizeText(item.arName);

    // فحص جميع الأكواد الخاصة بالمادة (سواء خطة 4 سنوات أو 5 سنوات)
    const codesList = Array.isArray(item.codes) && item.codes.length > 0
      ? item.codes
      : (item.code ? [item.code] : []);

    if (isLikelyCode && codesList.length > 0) {
      for (const code of codesList) {
        const codeNorm = normalizeCode(code);
        if (!codeNorm) continue;
        if (qCode === codeNorm) {
          score += 200;
          break;
        } else if (codeNorm.includes(qCode) || qCode.includes(codeNorm)) {
          score += 150;
          break;
        }
      }
    }

    if (qNorm === subNorm || qNorm === arNorm) {
      score += 120;
    } else if (subNorm.startsWith(qNorm) || arNorm.startsWith(qNorm)) {
      score += 80;
    } else if (subNorm.includes(qNorm) || arNorm.includes(qNorm)) {
      score += 60;
    } else if (qNorm.length >= 2) {
      for (const alias of item.aliases) {
        const aNorm = normalizeText(alias);
        if (aNorm === qNorm) {
          score += 100;
          break;
        }
        if (aNorm.startsWith(qNorm)) {
          score += 70;
          break;
        }
        if (aNorm.includes(qNorm)) {
          score += 50;
          break;
        }
      }
    }

    if (score > 0) {
      results.push({ ...item, score });
    }
  }

  // 2. البحث في متطلبات الجامعة (uniRequirements.js)
  for (const [reqName, reqData] of Object.entries(uniRequirements)) {
    const meta = uniReqMeta[reqName] || {};
    const code = meta.code || "";
    const aliases = meta.aliases || [];
    const codesList = Array.isArray(meta.codes) && meta.codes.length > 0
      ? meta.codes
      : (code ? [code] : []);

    let score = 0;
    const nameNorm = normalizeText(reqName);

    if (isLikelyCode && codesList.length > 0) {
      for (const c of codesList) {
        const codeNorm = normalizeCode(c);
        if (!codeNorm) continue;
        if (qCode === codeNorm) {
          score += 200;
          break;
        } else if (codeNorm.includes(qCode) || qCode.includes(codeNorm)) {
          score += 150;
          break;
        }
      }
    }

    if (nameNorm === qNorm) {
      score += 120;
    } else if (nameNorm.startsWith(qNorm)) {
      score += 80;
    } else if (nameNorm.includes(qNorm)) {
      score += 60;
    } else if (qNorm.length >= 2) {
      for (const alias of aliases) {
        const aNorm = normalizeText(alias);
        if (aNorm === qNorm) {
          score += 100;
          break;
        }
        if (aNorm.startsWith(qNorm)) {
          score += 70;
          break;
        }
        if (aNorm.includes(qNorm)) {
          score += 50;
          break;
        }
      }
    }

    if (score > 0) {
      results.push({
        type: "uni_req",
        name: reqName,
        code: code,
        data: reqData,
        score: score
      });
    }
  }

  // 3. البحث في برامج المختبرات (labPrograms.js)
  for (const [labName, labData] of Object.entries(labPrograms)) {
    let score = 0;
    const nameNorm = normalizeText(labName);
    const descNorm = normalizeText(labData.text || "");

    if (nameNorm === qNorm) {
      score += 100;
    } else if (nameNorm.includes(qNorm) || descNorm.includes(qNorm)) {
      score += 50;
    }

    if (score > 0) {
      results.push({
        type: "lab",
        name: labName.trim(),
        data: labData,
        score: score
      });
    }
  }

  // فرز النتائج تنازلياً حسب درجة المطابقة
  results.sort((a, b) => b.score - a.score);
  return results;
}

// دالة لتوليد عناوين الأقسام بأيقونات واضحة
function getSectionTitle(key) {
  const k = key.trim();
  if (/tips/i.test(k)) return "💡 نصائح وتوجيهات للدراسة (Tips)";
  if (/book/i.test(k)) return "📖 الكتاب والحلول (Book & Solutions)";
  if (/lecture/i.test(k)) return "🎬 المحاضرات والشروحات (Lectures)";
  if (/slide.*chapter|chapter.*slide/i.test(k)) return "📑 السلايدات والشباتر (Slides & Chapters)";
  if (/slide/i.test(k)) return "📑 السلايدات (Slides)";
  if (/chapter/i.test(k)) return "📑 الشباتر (Chapters)";
  if (/lab/i.test(k)) return "🧪 المعمل / المختبر (Lab)";
  if (/recorded video/i.test(k)) return "🎥 فيديوهات مسجلة (Recorded Videos)";
  if (/discussion|problem/i.test(k)) return "📝 المناقشات والمسائل والحلول (Discussion & Problems)";
  if (/quiz|exam|homework/i.test(k)) return "📋 كويزات وامتحانات وواجبات (Quizzes & Exams)";
  return `🔗 ${k}`;
}

// تنسيق وعرض تفاصيل المادة بالكامل
function formatCourseDetails(courseItem) {
  const title = courseItem.arName
    ? `📚 ${courseItem.name} | ${courseItem.arName}`
    : `📚 ${courseItem.name}`;
  const codeText = courseItem.code ? `\n🏷️ كود المساق: ${courseItem.code}` : "";

  let reply = `${title}${codeText}\n━━━━━━━━━━━━━━━━━━━━\n\n`;

  for (const [key, value] of Object.entries(courseItem.data)) {
    const sectionTitle = getSectionTitle(key);

    if (!value || value === "لا توجد روابط") {
      reply += `${sectionTitle}:\n⚠️ لا توجد روابط حالياً\n\n`;
      continue;
    }

    if (typeof value === "string") {
      reply += `${sectionTitle}:\n${value}\n\n`;
    } else if (typeof value === "object" && value !== null) {
      reply += `${sectionTitle}:\n`;
      for (const [subKey, subVal] of Object.entries(value)) {
        reply += `  • ${subKey}:\n    ${subVal}\n`;
      }
      reply += "\n";
    }
  }

  return reply;
}

// دالة إرسال تفاصيل المادة مع الأزرار
function sendCourseDetails(chatId, courseItem, isTreeNav = false) {
  const message = formatCourseDetails(courseItem);

  const keyboard = [
    [{ text: "📤 ارفع ملفاتك المهمة للمادة لكي يستفيد غيرنا", url: "https://t.me/+lUyeZmUh7KpjM2Fi" }]
  ];

  if (isTreeNav) {
    keyboard.push([{ text: "🔙 رجوع للفصول", callback_data: "back_semesters" }]);
  }
  keyboard.push([{ text: "🏠 العودة للقائمة الرئيسية", callback_data: "main_menu" }]);

  bot.sendMessage(chatId, message, {
    reply_markup: { inline_keyboard: keyboard }
  });
}

// دالة إرسال تفاصيل متطلب الجامعة
function sendUniReqDetails(chatId, reqName, reqItem) {
  const buttons = [
    [
      { text: "📁 ملفات المادة (Drive)", url: reqItem.drive },
      { text: "🎬 المحاضرات (YouTube)", url: reqItem.youtube }
    ],
    [{ text: "🔙 رجوع لمتطلبات الجامعة", callback_data: "show_uni_reqs" }],
    [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
  ];

  bot.sendMessage(chatId, `📖 *${reqName}*\n\nاختر نوع المصدر المطلوب من الأزرار أدناه:`, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: buttons }
  });
}

// دالة إرسال تفاصيل مادة المختبر
function sendLabDetails(chatId, labName, item) {
  const message = "📚 " + labName + "\n\n" + (item.text || "");

  if (item.link) {
    const buttons = [
      [{ text: "🔗 رابط التنزيل / الشرح", url: item.link }],
      [{ text: "🔙 رجوع لبرامج المختبرات", callback_data: "open_lab_programs" }],
      [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
    ];
    bot.sendMessage(chatId, message, {
      reply_markup: { inline_keyboard: buttons }
    });
  } else if (item.links) {
    const buttons = item.links.map((l) => [{ text: l.name, url: l.url }]);
    buttons.push([{ text: "🔙 رجوع لبرامج المختبرات", callback_data: "open_lab_programs" }]);
    buttons.push([{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]);

    bot.sendMessage(chatId, message, {
      reply_markup: { inline_keyboard: buttons }
    });
  } else if (item.file) {
    const filePath = path.join(__dirname, item.file);
    bot.sendDocument(chatId, filePath, { caption: message });
  }
}

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
    { name: "م. محمد الحلو", phone: "+90598066646" }
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

// ==========================================
// القوائم والبوابات الأكاديمية الرئيسية (4 أبواب ذكية ومنظمة)
// ==========================================

// 1. القائمة الرئيسية (4 أبواب كبرى + بحث سريع)
function showMainMenu(chatId, name = "طالب") {
  const keyboard = [
    [{ text: "🤖 أدوات الذكاء الاصطناعي (شات ذكي • مصحح أكواد • مولد كويزات)", callback_data: "menu_ai_tools" }],
    [{ text: "📚 المقررات والخطط الدراسية (كل السنوات • متطلبات • خطة 4 و 5)", callback_data: "menu_academic" }],
    [{ text: "📂 بنك الامتحانات والمختبرات (امتحانات سابقة • عداد • برامج • GPA)", callback_data: "menu_exams_labs" }],
    [{ text: "🔄 الخدمات الطلابية والتواصل (سوق التبادل • تواصل مع الأدمن • الأرقام)", callback_data: "menu_services" }],
    [{ text: "🔍 البحث السريع عن مادة أو كود مساق", callback_data: "start_search" }]
  ];

  if (chatId === ADMIN_ID) {
    keyboard.push(
      [{ text: "🎛️ لوحة تحكم الإدارة (Admin Dashboard)", callback_data: "admin_dashboard" }],
      [{ text: "📊 إحصائيات الأيقونات والميزات", callback_data: "admin_feature_stats" }],
      [{ text: "📢 إرسال إشعار جماعي للطلاب", callback_data: "start_broadcast" }]
    );
  }

  const welcomeText = `👋 مرحباً بك يا *${safeEscape(name)}* في بوت قسم هندسة الحاسوب! 🎓
━━━━━━━━━━━━━━━━━━━━

📌 *اختر البوابة أو القسم المطلوب للوصول المباشر لمصادرك:*`;

  bot.sendMessage(chatId, welcomeText, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard }
  });
}

// الباب الأول: أدوات الذكاء الاصطناعي والبرمجة
function showAiToolsMenu(chatId) {
  const hasHistory = (userState[chatId]?.aiHistory?.length || 0) > 0;
  const keyboard = [
    [{ text: "💬 المساعد الأكاديمي الذكي (AI Chatbot)" + (hasHistory ? " (جلسة نشطة 🟢)" : ""), callback_data: "start_ai_chat" }],
    [{ text: "🐞 مصحح ومفسر الأكواد الذكي (Code Debugger)", callback_data: "start_code_debugger" }],
    [{ text: "📝 مولّد الكويزات الذكي (AI Quiz Generator)", callback_data: "start_ai_quiz" }],
    [{ text: "🔙 رجوع للقائمة الرئيسية", callback_data: "main_menu" }]
  ];

  const text = `🤖 *بوابة أدوات الذكاء الاصطناعي والبرمجة*
━━━━━━━━━━━━━━━━━━━━
اختر الأداة الهندسية والبرمجية الذكية التي تود استخدامها:

• 💬 *المساعد الأكاديمي الذكي:* حل وشرح المسائل، تلخيص السلايدات والملفات، الإجابة على استفسارات المواد وتزويدك بالروابط.
• 🐞 *مصحح ومفسر الأكواد:* فحص الأكواد وتصحيح الأخطاء، شرح الدوال والخوارزميات، وتوليد حالات اختبار.
• 📝 *مولد الكويزات الذكي:* تدرب واختبر مستواك بأسئلة تفاعلية غير محدودة في أي مساق تخصصي.`;

  bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard }
  });
}

// الباب الثاني: المقررات والخطط الدراسية
function showAcademicMenu(chatId) {
  const keyboard = [
    [{ text: "📚 عرض مقررات جميع السنوات (1 - 5)", callback_data: "show_years" }],
    [{ text: "🏛️ متطلبات الجامعة الإسلامية", callback_data: "show_uni_reqs" }],
    [{ text: "🔍 البحث عن مادة / كود مساق (خطة 4 و 5)", callback_data: "start_search" }],
    [{ text: "🖼️ خطة هندسة الحاسوب 4 سنوات (الجديدة)", callback_data: "plan4" }],
    [{ text: "📄 خطة هندسة الحاسوب 5 سنوات (السابقة)", callback_data: "plan5" }],
    [{ text: "📷 شجرة المواد المعتمدة على بعض (Prerequisites)", callback_data: "show_prerequisites" }],
    [{ text: "🔙 رجوع للقائمة الرئيسية", callback_data: "main_menu" }]
  ];

  const text = `📚 *بوابة المقررات والخطط الدراسية*
━━━━━━━━━━━━━━━━━━━━
تصفح شجرة المواد والمصادر والخطط الأكاديمية:

• 📚 *عرض السنوات:* تصفح مساقات كل سنة وفصل مع روابط الدرايف والشروحات والسلايدات والنصائح.
• 🏛️ *متطلبات الجامعة:* مقررات القرآن الكريم، العقيدة، الفقه، السيرة، نحو وصرف، وغيرها.
• 🔍 *البحث بالكود والاسم:* البحث الفوري بأكواد خطة 4 أو 5 سنوات أو اسم المادة.
• 📄 *الخطط والشجرة:* صور ومستندات الخطط الدراسية وشجرة اعتماد المواد.`;

  bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard }
  });
}

// الباب الثالث: بنك الامتحانات والمختبرات والمعدل
function showExamsAndLabsMenu(chatId) {
  const keyboard = [
    [{ text: "📂 بنك الامتحانات السابقة (نصفي ونهائي)", callback_data: "open_past_papers" }],
    [{ text: "⏳ عداد ومخطط الامتحانات وحاسبة الدرجة", callback_data: "exam_countdown" }],
    [{ text: "🧪 روابط تنزيل برامج المختبرات للمواد", callback_data: "open_lab_programs" }],
    [{ text: "📊 ملف إكسل حساب المعدل الفصلي والتراكمي", callback_data: "gpa_file" }],
    [{ text: "🔙 رجوع للقائمة الرئيسية", callback_data: "main_menu" }]
  ];

  const text = `📂 *بوابة الامتحانات والمختبرات وحساب المعدل*
━━━━━━━━━━━━━━━━━━━━
جميع أدوات المراجعة والتحضير العملي والأكاديمي:

• 📂 *بنك الامتحانات السابقة:* نماذج امتحانات نصفية ونهائية مع الحلول للتدريب عليها.
• ⏳ *مخطط الامتحانات:* عداد تنازلي لمواعيد الاختبارات، إنشاء خطة مراجعة ذكية، وحاسبة الدرجة المطلوبة في النهائي.
• 🧪 *برامج المختبرات:* شروحات وروابط تنزيل البرامج الهندسية (Logisim, MATLAB, Proteus, Quartus, LTSpice, NetBeans...).
• 📊 *حاسبة المعدل:* ملف إكسل منظم لحساب وتوقع معدلك الفصلي والتراكمي.`;

  bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard }
  });
}

// الباب الرابع: الخدمات الطلابية والتواصل
function showStudentServicesMenu(chatId) {
  const keyboard = [
    [{ text: "🔄 سوق تبادل الأدوات والكتب الهندسية", callback_data: "open_marketplace" }],
    [{ text: "💬 تواصل مع الأدمن / إرسال استفسار أو ملف", callback_data: "contact_admin" }],
    [{ text: "📞 جهات التواصل المهمة وأرقام الجامعة", callback_data: "show_contacts" }],
    [{ text: "🌐 الموقع الإلكتروني الرسمي لقسم الحاسوب", url: "https://computer-engineering-iug.vercel.app" }],
    [{ text: "🔙 رجوع للقائمة الرئيسية", callback_data: "main_menu" }]
  ];

  const text = `🔄 *بوابة الخدمات الطلابية والتواصل*
━━━━━━━━━━━━━━━━━━━━
الخدمات المشتركة وقنوات التواصل والمساعدة:

• 🔄 *سوق التبادل الطلابي:* منصة لعرض وطلب الأدوات الهندسية (Arduino, Raspberry Pi, قطع إلكترونية) والكتب والملازم للبيع أو البدل أو الإهداء.
• 💬 *تواصل مع الإدارة:* إرسال استفسارات، ملفات (Word, PDF, Excel, ZIP)، واقتراحات لإدارة البوت مع رد مباشر.
• 📞 *أرقام الجامعة:* جهات التواصل مع القبول والتسجيل، شؤون الطلبة، الشؤون المالية، المنح، والدعم الفني.
• 🌐 *الموقع الإلكتروني:* تصفح منصة الويب التفاعلية للقسم.`;

  bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard }
  });
}

// أمر البدء /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  if (chatId === ADMIN_ID) {
    resetAdminState(ADMIN_ID);
  } else if (isUserBanned(chatId)) {
    bot.sendMessage(chatId, "⛔ *عذراً، تم تقييد وصولك للبوت!*\nتم حظر حسابك من قبل إدارة القسم.", { parse_mode: "Markdown" });
    return;
  }
  const name = msg.from.first_name || "طالب";
  saveUser(msg.from, chatId);
  userState[chatId] = { ...userState[chatId], name: name, inAiChat: false };
  showMainMenu(chatId, name);
});

// أمر لوحة تحكم الأدمن
bot.onText(/\/(?:admin|dashboard)/, (msg) => {
  const chatId = msg.chat.id;
  if (chatId !== ADMIN_ID) return;
  resetAdminState(ADMIN_ID);
  saveUser(msg.from, chatId);
  renderMainDashboard(chatId, bot);
});

// أمر حظر طالب /ban
bot.onText(/\/ban(?:\s+(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  if (chatId !== ADMIN_ID) return;
  resetAdminState(ADMIN_ID);
  const target = match[1]?.trim();
  if (!target) {
    userState[ADMIN_ID].waitingBanInput = true;
    bot.sendMessage(chatId, "🚫 *حظر طالب:*\nأرسل معرّف التليجرام (ID) أو اليوزر (@username) لحظر الطالب من استخدام البوت:", {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "❌ إلغاء والعودة للوحة التحكم", callback_data: "admin_dashboard" }]]
      }
    });
    return;
  }
  const res = banUser(target, "حظر مباشر من الأدمن");
  if (res.success) {
    bot.sendMessage(chatId, `✅ *تم حظر الطالب بنجاح!*\n• الاسم: ${res.user.name}\n• الـ ID: \`${res.user.id}\`\n• المعرف: ${res.user.username || "بدون يوزر"}`, { parse_mode: "Markdown" });
  } else {
    bot.sendMessage(chatId, `❌ ${res.error}`);
  }
});

// أمر إلغاء حظر طالب /unban
bot.onText(/\/unban(?:\s+(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  if (chatId !== ADMIN_ID) return;
  resetAdminState(ADMIN_ID);
  const target = match[1]?.trim();
  if (!target) {
    userState[ADMIN_ID].waitingUnbanInput = true;
    bot.sendMessage(chatId, "🔓 *إلغاء حظر طالب:*\nأرسل معرّف التليجرام (ID) أو اليوزر (@username) لإلغاء الحظر:", {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "❌ إلغاء والعودة للوحة التحكم", callback_data: "admin_dashboard" }]]
      }
    });
    return;
  }
  const res = unbanUser(target);
  if (res.success) {
    bot.sendMessage(chatId, `✅ *تم إلغاء حظر الطالب بنجاح!*\n• الاسم: ${res.user.name}\n• الـ ID: \`${res.user.id}\``, { parse_mode: "Markdown" });
  } else {
    bot.sendMessage(chatId, `❌ ${res.error}`);
  }
});

// أمر استعلام عن ملف طالب /user
bot.onText(/\/user(?:\s+(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  if (chatId !== ADMIN_ID) return;
  resetAdminState(ADMIN_ID);
  const target = match[1]?.trim();
  if (!target) {
    userState[ADMIN_ID].waitingSearchUserInput = true;
    bot.sendMessage(chatId, "🔍 *استعلام عن طالب:*\nأرسل معرّف التليجرام (ID) أو اليوزر (@username) لعرض سجله ونشاطه:", {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "❌ إلغاء والعودة للوحة التحكم", callback_data: "admin_dashboard" }]]
      }
    });
    return;
  }
  renderUserProfile(chatId, bot, target);
});

// أمر المساعد الذكي /ai
bot.onText(/\/ai(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (chatId !== ADMIN_ID && isUserBanned(chatId)) {
    bot.sendMessage(chatId, "⛔ *عذراً، تم تقييد وصولك للبوت!*\nتم حظر حسابك من قبل إدارة القسم.", { parse_mode: "Markdown" });
    return;
  }
  if (chatId === ADMIN_ID) resetAdminState(ADMIN_ID);
  trackFeatureUse(chatId, "ai_chat", msg.from);
  const query = match[1]?.trim();

  if (!query) {
    userState[chatId] = {
      ...userState[chatId],
      inAiChat: true,
      waitingAdminMessage: false,
      aiHistory: []
    };
    bot.sendMessage(
      chatId,
      "🤖 *المساعد الأكاديمي الذكي جاهز!*\n━━━━━━━━━━━━━━━━━━━━\n\nتفضل بطرح أي سؤال أو استفسار برمجي أو هندسي وسأقوم بمساعدتك فوراً 👇",
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ إنهاء المحادثة والعودة للقائمة", callback_data: "exit_ai_chat" }]
          ]
        }
      }
    );
    return;
  }

  const typingTimer = setInterval(() => {
    bot.sendChatAction(chatId, "typing").catch(() => {});
  }, 3000);
  bot.sendChatAction(chatId, "typing").catch(() => {});

  try {
    const history = userState[chatId]?.aiHistory || [];
    const answer = await generateAIResponse(query, history);

    if (!answer.startsWith("⚠️")) {
      if (!userState[chatId]) userState[chatId] = {};
      if (!userState[chatId].aiHistory) userState[chatId].aiHistory = [];
      userState[chatId].aiHistory.push({ role: "user", text: query });
      userState[chatId].aiHistory.push({ role: "model", text: answer });
      if (userState[chatId].aiHistory.length > 8) {
        userState[chatId].aiHistory = userState[chatId].aiHistory.slice(-8);
      }
    }

    const aiButtons = {
      inline_keyboard: [
        [{ text: "🤖 مواصلة المحادثة الذكية", callback_data: "start_ai_chat" }],
        [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
      ]
    };

    await bot.sendMessage(chatId, answer, {
      parse_mode: "Markdown",
      reply_markup: aiButtons
    }).catch(async () => {
      await bot.sendMessage(chatId, answer, {
        reply_markup: aiButtons
      });
    });
  } catch (err) {
    console.error("AI command error:", err);
    bot.sendMessage(chatId, "أهلاً بك! تفضل بطرح سؤالك وسأجيبك فوراً.");
  } finally {
    clearInterval(typingTimer);
  }
});

// أوامر الإذاعة والإحصائيات للأدمن
bot.onText(/\/broadcast/, (msg) => {
  const chatId = msg.chat.id;
  if (chatId !== ADMIN_ID) return;
  resetAdminState(ADMIN_ID);
  const users = loadUsers();
  const activeCount = users.filter((u) => u.active !== false).length;

  userState[ADMIN_ID].waitingBroadcastMessage = true;
  const lastBc = getLastBroadcast();
  const broadcastKeyboard = [
    [{ text: "🚀 إرسال إشعار التحديثات الجديدة تلقائياً", callback_data: "send_preset_broadcast" }]
  ];
  if (lastBc) {
    broadcastKeyboard.push([{ text: "🗑️ تراجع وحذف آخر إعلان تم نشره للطلاب", callback_data: "admin_unsend_last_broadcast" }]);
  }
  broadcastKeyboard.push([{ text: "❌ إلغاء الإذاعة", callback_data: "cancel_broadcast" }]);

  bot.sendMessage(
    chatId,
    `📢 *لوحة الإذاعة والإشعارات الجماعية*\n━━━━━━━━━━━━━━━━━━━━\n\n👥 *عدد المشتركين النشطين:* ${activeCount} طالب\n\nاختر من الأزرار أدناه أو أرسل رسالتك/صورتك/ملفك فوراً في المحادثة ليتم بثها للجميع:`,
    {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: broadcastKeyboard }
    }
  );
});

bot.onText(/\/stats/, (msg) => {
  const chatId = msg.chat.id;
  if (chatId !== ADMIN_ID) return;
  resetAdminState(ADMIN_ID);
  saveUser(msg.from, chatId);
  renderFeatureStats(chatId, bot);
});

// التعامل مع جميع أزرار Callback Queries
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  // التحقق من حالة حظر المستخدم
  if (chatId !== ADMIN_ID && isUserBanned(chatId)) {
    bot.answerCallbackQuery(query.id, {
      text: "⛔ عذراً، تم تقييد وصولك للبوت وحظر حسابك من قبل الإدارة.",
      show_alert: true
    });
    return;
  }

  saveUser(query.from, chatId);

  if (processedCallbacks.has(query.id)) return;
  processedCallbacks.add(query.id);

  bot.answerCallbackQuery(query.id);
  setTimeout(() => processedCallbacks.delete(query.id), 5000);

  // القائمة الرئيسية
  if (data === "main_menu") {
    if (chatId === ADMIN_ID) {
      resetAdminState(ADMIN_ID);
    } else if (userState[chatId]) {
      userState[chatId].waitingAdminMessage = false;
      userState[chatId].inAiChat = false;
      userState[chatId].inCodeDebugger = false;
    }
    const name = userState[chatId]?.name || "طالب";
    showMainMenu(chatId, name);
    return;
  }

  // الباب الأول: أدوات الذكاء الاصطناعي
  if (data === "menu_ai_tools") {
    if (chatId === ADMIN_ID) resetAdminState(ADMIN_ID);
    showAiToolsMenu(chatId);
    return;
  }

  // الباب الثاني: المقررات والخطط الدراسية
  if (data === "menu_academic") {
    if (chatId === ADMIN_ID) resetAdminState(ADMIN_ID);
    showAcademicMenu(chatId);
    return;
  }

  // الباب الثالث: بنك الامتحانات والمختبرات والمعدل
  if (data === "menu_exams_labs") {
    if (chatId === ADMIN_ID) resetAdminState(ADMIN_ID);
    showExamsAndLabsMenu(chatId);
    return;
  }

  // الباب الرابع: الخدمات الطلابية والتواصل
  if (data === "menu_services") {
    if (chatId === ADMIN_ID) resetAdminState(ADMIN_ID);
    showStudentServicesMenu(chatId);
    return;
  }

  // ==========================================
  // أزرار لوحة تحكم الأدمن (Admin Dashboard)
  // ==========================================
  
  // عرض لوحة التحكم الرئيسية
  if (data === "admin_dashboard") {
    if (chatId !== ADMIN_ID) return;
    resetAdminState(ADMIN_ID);
    renderMainDashboard(chatId, bot);
    return;
  }

  // عرض إحصائيات الميزات والأيقونات
  if (data === "admin_feature_stats") {
    if (chatId !== ADMIN_ID) return;
    resetAdminState(ADMIN_ID);
    renderFeatureStats(chatId, bot);
    return;
  }

  // عرض تقرير المواد الأكثر بحثاً
  if (data === "admin_course_search_stats") {
    if (chatId !== ADMIN_ID) return;
    resetAdminState(ADMIN_ID);
    renderCourseSearchStats(chatId, bot);
    return;
  }

  // لوحة استطلاعات الرأي وإدارتها للأدمن
  if (data === "admin_polls_menu") {
    if (chatId !== ADMIN_ID) return;
    resetAdminState(ADMIN_ID);
    renderAdminPollsList(chatId, bot);
    return;
  }

  // عرض تفاصيل ونتائج استطلاع محدد للأدمن
  if (data.startsWith("admin_poll_view_")) {
    if (chatId !== ADMIN_ID) return;
    resetAdminState(ADMIN_ID);
    const pollId = data.replace("admin_poll_view_", "");
    renderAdminPollDetails(chatId, bot, pollId);
    return;
  }

  // تبديل حالة الاستطلاع (مفتوح / مغلق)
  if (data.startsWith("admin_poll_toggle_")) {
    if (chatId !== ADMIN_ID) return;
    const pollId = data.replace("admin_poll_toggle_", "");
    togglePollStatus(pollId);
    renderAdminPollDetails(chatId, bot, pollId);
    return;
  }

  // حذف الاستطلاع والتراجع عنه من جميع محادثات الطلاب
  if (data.startsWith("admin_poll_unsend_")) {
    if (chatId !== ADMIN_ID) return;
    const pollId = data.replace("admin_poll_unsend_", "");
    bot.sendMessage(chatId, "⏳ *جاري حذف الاستطلاع من شات جميع الطلاب...*", { parse_mode: "Markdown" }).then(async (waitMsg) => {
      const res = await unsendPollFromStudents(bot, pollId);
      try { await bot.deleteMessage(chatId, waitMsg.message_id); } catch (e) {}
      bot.sendMessage(chatId, `✅ *تم بنجاح حذف الاستطلاع وإزالته من محادثات الطلاب (${res.deletedCount} محادثة)!*`, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: [[{ text: "📋 قائمة الاستطلاعات", callback_data: "admin_polls_menu" }]] }
      });
    });
    return;
  }

  // تراجع وحذف إعلان منشور محدد
  if (data.startsWith("admin_unsend_broadcast_")) {
    if (chatId !== ADMIN_ID) return;
    const bcId = data.replace("admin_unsend_broadcast_", "");
    bot.sendMessage(chatId, "⏳ *جاري حذف الإعلان والتراجع عنه من جميع محادثات الطلاب...*", { parse_mode: "Markdown" }).then(async (waitMsg) => {
      const res = await unsendBroadcast(bot, bcId);
      try { await bot.deleteMessage(chatId, waitMsg.message_id); } catch (e) {}
      if (res.success) {
        bot.sendMessage(chatId, `✅ *تم بنجاح حذف الإعلان والتراجع عنه!*\n━━━━━━━━━━━━━━━━━━━━\n\n🗑️ تم مسح الرسالة من محادثات *${res.deletedCount}* طالب (من أصل ${res.totalCount}).`, {
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: [[{ text: "🎛️ لوحة التحكم", callback_data: "admin_dashboard" }]] }
        });
      } else {
        bot.sendMessage(chatId, `⚠️ ${res.error || "تعذر حذف الإعلان."}`, {
          reply_markup: { inline_keyboard: [[{ text: "🎛️ لوحة التحكم", callback_data: "admin_dashboard" }]] }
        });
      }
    });
    return;
  }

  // تراجع وحذف آخر إعلان منشور
  if (data === "admin_unsend_last_broadcast") {
    if (chatId !== ADMIN_ID) return;
    const lastBc = getLastBroadcast();
    if (!lastBc) {
      bot.sendMessage(chatId, "⚠️ لا يوجد إعلانات منشورة حديثاً لحذفها.", {
        reply_markup: { inline_keyboard: [[{ text: "🎛️ لوحة التحكم", callback_data: "admin_dashboard" }]] }
      });
      return;
    }
    bot.sendMessage(chatId, "⏳ *جاري حذف آخر إعلان تم نشره من جميع محادثات الطلاب...*", { parse_mode: "Markdown" }).then(async (waitMsg) => {
      const res = await unsendBroadcast(bot, lastBc.id);
      try { await bot.deleteMessage(chatId, waitMsg.message_id); } catch (e) {}
      if (res.success) {
        bot.sendMessage(chatId, `✅ *تم بنجاح حذف وتراجع عن آخر إعلان منشور!*\n━━━━━━━━━━━━━━━━━━━━\n\n🗑️ تم مسح الرسالة من محادثات *${res.deletedCount}* طالب (من أصل ${res.totalCount}).`, {
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: [[{ text: "🎛️ لوحة التحكم", callback_data: "admin_dashboard" }]] }
        });
      } else {
        bot.sendMessage(chatId, `⚠️ ${res.error || "تعذر حذف الإعلان."}`, {
          reply_markup: { inline_keyboard: [[{ text: "🎛️ لوحة التحكم", callback_data: "admin_dashboard" }]] }
        });
      }
    });
    return;
  }

  // طلب إنشاء وإرسال استطلاع رأي (Poll)
  if (data === "admin_poll_prompt") {
    if (chatId !== ADMIN_ID) return;
    resetAdminState(ADMIN_ID);
    userState[ADMIN_ID].waitingPollInput = true;

    bot.sendMessage(chatId, `🗳️ *إرسال استطلاع رأي خاص لجميع الطلاب:*
━━━━━━━━━━━━━━━━━━━━

أرسل السؤال والخيارات مفصولة بشرطة مائلة \`/\` كالتالي:
\`ما رأيكم بصعوبة الامتحان؟ / سهل ومباشر / متوسط / صعب / غير واضح\`

🔒 *ملاحظة:* النتائج والتصويت ستكون سرية وخاصة بك كأدمن فقط.

📌 *أو أرسل استطلاعاً سريعاً جاهزاً بنقرة واحدة:*`, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📊 استطلاع: تقييم الامتحانات النصفية", callback_data: "admin_preset_poll_1" }],
          [{ text: "📚 استطلاع: المواد التي تحتاج دعماً وشرحاً", callback_data: "admin_preset_poll_2" }],
          [{ text: "📋 قائمة الاستطلاعات السابقة", callback_data: "admin_polls_menu" }],
          [{ text: "❌ إلغاء والعودة للوحة التحكم", callback_data: "admin_dashboard" }]
        ]
      }
    });
    return;
  }

  // إرسال استطلاع جاهز 1
  if (data === "admin_preset_poll_1") {
    if (chatId !== ADMIN_ID) return;
    resetAdminState(ADMIN_ID);
    broadcastPollToStudents(
      bot,
      "📊 كيف تقيم مستوى وصعوبة الامتحانات النصفية حتى الآن؟",
      ["سهلة ومباشرة جداً", "متوسطة ومناسبة للوقت", "صعبة وتتطلب وقتاً أطول", "صعبة ومعقدة جداً"]
    );
    return;
  }

  // إرسال استطلاع جاهز 2
  if (data === "admin_preset_poll_2") {
    if (chatId !== ADMIN_ID) return;
    resetAdminState(ADMIN_ID);
    broadcastPollToStudents(
      bot,
      "📚 ما هي المادة التي تحتاجون فيها مراجعات وسلايدات إضافية أكثر؟",
      ["هياكل بيانات وخوارزميات (C++)", "دوائر منطقية وتصميم رقمي", "معمارية حاسوب وأسمبلي", "كالكولس وفيزياء هندسية"]
    );
    return;
  }

  // معرفة الطلاب الذين استخدموا ميزة محددة
  if (data.startsWith("admin_who_")) {
    if (chatId !== ADMIN_ID) return;
    resetAdminState(ADMIN_ID);
    const featureKey = data.replace("admin_who_", "");
    renderFeatureUsers(chatId, bot, featureKey);
    return;
  }

  // قائمة الطلاب المحظورين
  if (data === "admin_banned_list") {
    if (chatId !== ADMIN_ID) return;
    resetAdminState(ADMIN_ID);
    renderBannedList(chatId, bot);
    return;
  }

  // طلب إدخال ID/يوزر للحظر
  if (data === "admin_ban_prompt") {
    if (chatId !== ADMIN_ID) return;
    resetAdminState(ADMIN_ID);
    userState[ADMIN_ID].waitingBanInput = true;
    bot.sendMessage(chatId, "🚫 *حظر طالب:*\nأرسل معرّف التليجرام (ID) أو اليوزر (@username) لحظر الطالب من استخدام البوت:", {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "❌ إلغاء والعودة للوحة التحكم", callback_data: "admin_dashboard" }]]
      }
    });
    return;
  }

  // طلب إضافة طالب يدوياً
  if (data === "admin_add_user_prompt") {
    if (chatId !== ADMIN_ID) return;
    resetAdminState(ADMIN_ID);
    userState[ADMIN_ID].waitingAddUserInput = true;
    bot.sendMessage(chatId, "➕ *إضافة طالب يدوياً:*\nأرسل معرّف الطالب (ID) مع اسمه ومعرفه كالتالي:\n`123456789 محمد @username`\n\nأو أرسل الآيدي فقط:\n`123456789`", {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "❌ إلغاء والعودة للوحة التحكم", callback_data: "admin_dashboard" }]]
      }
    });
    return;
  }

  // طلب فحص واستعلام عن طالب
  if (data === "admin_search_user_prompt") {
    if (chatId !== ADMIN_ID) return;
    resetAdminState(ADMIN_ID);
    userState[ADMIN_ID].waitingSearchUserInput = true;
    bot.sendMessage(chatId, "🔍 *فحص واستعلام عن طالب:*\nأرسل معرّف التليجرام (ID) أو اليوزر (@username) لعرض سجله ونشاطه:", {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "❌ إلغاء والعودة للوحة التحكم", callback_data: "admin_dashboard" }]]
      }
    });
    return;
  }

  // طلب فحص وإدارة مفتاح Gemini API
  if (data === "admin_gemini_key_prompt") {
    if (chatId !== ADMIN_ID) return;
    resetAdminState(ADMIN_ID);
    userState[ADMIN_ID].waitingGeminiKeyInput = true;

    bot.sendMessage(chatId, "⏳ *جاري فحص حالة مفتاح الذكاء الاصطناعي الحالي...*", { parse_mode: "Markdown" }).then(async (waitMsg) => {
      const testRes = await testApiKey();
      let statusMsg = "";
      if (testRes.success) {
        statusMsg = "✅ *حالة المفتاح الحالي:* شغال ويعمل بنجاح ومستقر! 🚀\n\nإذا أردت استبداله بمفتاح آخر، أرسل المفتاح الجديد الآن في المحادثة مباشرة:";
      } else {
        statusMsg = `⚠️ *حالة المفتاح الحالي:* غير شغال أو معطل!\n*سبب الخطأ:* ${safeEscape(testRes.error)}\n\n📌 *خطوات الحصول على مفتاح مجاني جديد وسريع (خلال 30 ثانية):*\n1️⃣ ادخل للرابط: https://aistudio.google.com/app/apikey\n2️⃣ سجّل بحساب Google واضغط **Create API key**.\n3️⃣ انسخ المفتاح وأرسله هنا في المحادثة مباشرة وسيتم تفعيله واختباره فوراً!`;
      }

      bot.editMessageText(`🔑 *إدارة واختبار مفتاح الذكاء الاصطناعي (Gemini Key)*\n━━━━━━━━━━━━━━━━━━━━\n\n${statusMsg}`, {
        chat_id: chatId,
        message_id: waitMsg.message_id,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔄 إعادة فحص المفتاح الحالي", callback_data: "admin_gemini_key_prompt" }],
            [{ text: "❌ إلغاء والعودة للوحة التحكم", callback_data: "admin_dashboard" }]
          ]
        }
      }).catch(() => {
        bot.sendMessage(chatId, `🔑 *إدارة واختبار مفتاح الذكاء الاصطناعي (Gemini Key)*\n━━━━━━━━━━━━━━━━━━━━\n\n${statusMsg}`, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔄 إعادة فحص المفتاح الحالي", callback_data: "admin_gemini_key_prompt" }],
              [{ text: "❌ إلغاء والعودة للوحة التحكم", callback_data: "admin_dashboard" }]
            ]
          }
        });
      });
    });
    return;
  }

  // حظر طالب محدد من زر في ملفه
  if (data.startsWith("admin_ban_user_")) {
    if (chatId !== ADMIN_ID) return;
    resetAdminState(ADMIN_ID);
    const targetId = data.replace("admin_ban_user_", "");
    const res = banUser(targetId);
    if (res.success) {
      bot.sendMessage(chatId, `✅ *تم حظر الطالب بنجاح!*\n• الاسم: ${res.user.name}\n• الـ ID: \`${res.user.id}\``, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🎛️ لوحة التحكم", callback_data: "admin_dashboard" }],
            [{ text: "🚫 قائمة المحظورين", callback_data: "admin_banned_list" }]
          ]
        }
      });
    } else {
      bot.sendMessage(chatId, `❌ ${res.error}`);
    }
    return;
  }

  // إلغاء حظر طالب محدد من زر
  if (data.startsWith("admin_unban_")) {
    if (chatId !== ADMIN_ID) return;
    resetAdminState(ADMIN_ID);
    const targetId = data.replace("admin_unban_", "");
    const res = unbanUser(targetId);
    if (res.success) {
      bot.sendMessage(chatId, `✅ *تم إلغاء حظر الطالب بنجاح!*\n• الاسم: ${res.user.name}\n• الـ ID: \`${res.user.id}\``, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🎛️ لوحة التحكم", callback_data: "admin_dashboard" }],
            [{ text: "🚫 قائمة المحظورين", callback_data: "admin_banned_list" }]
          ]
        }
      });
    } else {
      bot.sendMessage(chatId, `❌ ${res.error}`);
    }
    return;
  }

  // ==========================================
  // ميزات الطلاب والأكاديمية
  // ==========================================

  // بدء محادثة مع الذكاء الاصطناعي (مع دعم حفظ واستئناف الجلسات الذكية)
  if (data === "start_ai_chat") {
    if (chatId === ADMIN_ID) resetAdminState(ADMIN_ID);
    trackFeatureUse(chatId, "ai_chat", query.from);

    const hasHistory = (userState[chatId]?.aiHistory?.length || 0) > 0;
    if (hasHistory) {
      const historyCount = Math.floor(userState[chatId].aiHistory.length / 2);
      const resumeText = `🤖 *المساعد الأكاديمي الذكي لقسم هندسة الحاسوب*
━━━━━━━━━━━━━━━━━━━━

📌 *لديك جلسة محادثة سابقة محفوظة (${historyCount} أسئلة ومناقشات).*

كيف تود المتابعة؟`;

      bot.sendMessage(chatId, resumeText, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "▶️ متابعة الجلسة السابقة ومواصلة الحديث", callback_data: "resume_ai_chat" }],
            [{ text: "🆕 بدء محادثة جديدة وتصفير السجل", callback_data: "new_ai_chat" }],
            [{ text: "🔙 رجوع لبوابة الذكاء الاصطناعي", callback_data: "menu_ai_tools" }],
            [{ text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }]
          ]
        }
      });
      return;
    }

    if (!userState[chatId]) userState[chatId] = {};
    userState[chatId].inAiChat = true;
    userState[chatId].waitingAdminMessage = false;
    userState[chatId].inCodeDebugger = false;
    userState[chatId].aiHistory = [];

    const aiWelcome = `🤖 *المساعد الأكاديمي الذكي لقسم هندسة الحاسوب*
━━━━━━━━━━━━━━━━━━━━

أهلاً بك! أنا مساعدك الأكاديمي والمهندس الذكي المعتمد 🎓
أنا هنا لمساعدتك في فهم موادك وحل المسائل وتجاوز صعوبات البرمجة والدراسة:

💡 *ما يمكنك سؤاله وإرساله:*
• 📸 *حل وشرح الصور والواجبات:* صوّر وأرسل أي مسألة، دائرة منطقية (Logic Gates)، مخطط توقيت (Timing Diagram)، جدول كارنوف (K-Map)، دائرة كهربائية، أو سكرين شوت خطأ برمجي وسأشرحه وأحله لك فوراً خطوة بخطوة!
• 💻 *البرمجة والأكواد:* "اكتب لي كود Binary Search Tree بلغة C++" أو أرسل ملفات برمجية لفحصها وتصحيحها.
• 📑 *شرح المفاهيم والملفات:* "اشرح لي خوارزمية Dijkstra بالتفصيل" أو أرسل ملف PDF لتلخيصه وشرحه.
• 📊 *نصائح للمواد والروابط:* اطلب روابط أي مادة، سلايدات، امتحانات، أو برامج معملية وسأزودك بها فوراً.

👇 *أرسل سؤالك، صورتك، أو ملفك الآن في المحادثة مباشرة:*`;

    bot.sendMessage(chatId, aiWelcome, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🧹 مسح الذاكرة وبدء محادثة جديدة", callback_data: "clear_ai_chat" }],
          [{ text: "🔙 رجوع لبوابة الذكاء الاصطناعي", callback_data: "menu_ai_tools" }],
          [{ text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }]
        ]
      }
    });
    return;
  }

  // استئناف محادثة سابقة
  if (data === "resume_ai_chat") {
    if (!userState[chatId]) userState[chatId] = {};
    userState[chatId].inAiChat = true;
    userState[chatId].waitingAdminMessage = false;
    userState[chatId].inCodeDebugger = false;

    bot.sendMessage(
      chatId,
      "▶️ *تم استئناف محادثتك السابقة بنجاح!* (السياق والذاكرة محفوظان 🟢)\n\nتفضل بطرح سؤالك أو إرسال صورتك/كودك التالي وسأكمل معك فوراً 👇",
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🧹 مسح الذاكرة وبدء جلسة جديدة", callback_data: "clear_ai_chat" }],
            [{ text: "🔙 رجوع لبوابة الذكاء الاصطناعي", callback_data: "menu_ai_tools" }],
            [{ text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }]
          ]
        }
      }
    );
    return;
  }

  // بدء محادثة جديدة وتصفير الذاكرة
  if (data === "new_ai_chat") {
    if (!userState[chatId]) userState[chatId] = {};
    userState[chatId].inAiChat = true;
    userState[chatId].waitingAdminMessage = false;
    userState[chatId].inCodeDebugger = false;
    userState[chatId].aiHistory = [];

    const aiWelcome = `🤖 *المساعد الأكاديمي الذكي (جلسة جديدة)*
━━━━━━━━━━━━━━━━━━━━

أهلاً بك! تم بدء جلسة جديدة ونظيفة 🎓
تفضل بطرح أي سؤال برمجي أو هندسي أو إرسال صور المسائل والملفات وسأشرحها لك فوراً 👇`;

    bot.sendMessage(chatId, aiWelcome, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🧹 مسح الذاكرة وبدء محادثة جديدة", callback_data: "clear_ai_chat" }],
          [{ text: "🔙 رجوع لبوابة الذكاء الاصطناعي", callback_data: "menu_ai_tools" }],
          [{ text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }]
        ]
      }
    });
    return;
  }

  // مسح ذاكرة محادثة الذكاء الاصطناعي
  if (data === "clear_ai_chat") {
    if (userState[chatId]) {
      userState[chatId].aiHistory = [];
      userState[chatId].inAiChat = true;
    }
    bot.sendMessage(chatId, "🧹 تم مسح سجل المحادثة بنجاح وبدء جلسة جديدة. تفضل بطرح سؤالك الجديد:");
    return;
  }

  // إنهاء محادثة الذكاء الاصطناعي
  if (data === "exit_ai_chat") {
    if (userState[chatId]) {
      userState[chatId].inAiChat = false;
    }
    bot.sendMessage(chatId, "✅ تم إنهاء جلسة المحادثة مؤقتاً وحفظ سجلها. يمكنك استئنافها في أي وقت!");
    showAiToolsMenu(chatId);
    return;
  }

  // ==========================================
  // مصحح ومفسر الأكواد الذكي (Code Debugger)
  // ==========================================

  // فتح واجهة مصحح ومفسر الأكواد
  if (data === "start_code_debugger") {
    if (chatId === ADMIN_ID) resetAdminState(ADMIN_ID);
    trackFeatureUse(chatId, "code_debugger", query.from);
    if (!userState[chatId]) userState[chatId] = {};
    userState[chatId].inAiChat = false;
    userState[chatId].inCodeDebugger = true;
    userState[chatId].waitingAdminMessage = false;
    userState[chatId].codeDebugger = { mode: "debug", history: [] };
    renderCodeDebuggerMenu(chatId, bot, "debug");
    return;
  }

  // تغيير وضع مصحح الأكواد (فحص / شرح / تحسين / حالات اختبار)
  if (data.startsWith("cd_mode_")) {
    const newMode = data.replace("cd_mode_", "");
    if (!userState[chatId]) userState[chatId] = {};
    if (!userState[chatId].codeDebugger) userState[chatId].codeDebugger = { mode: newMode, history: [] };
    userState[chatId].codeDebugger.mode = newMode;
    userState[chatId].inCodeDebugger = true;
    userState[chatId].inAiChat = false;
    renderCodeDebuggerMenu(chatId, bot, newMode);
    return;
  }

  // مسح ذاكرة مصحح الأكواد
  if (data === "cd_clear") {
    if (userState[chatId]?.codeDebugger) {
      userState[chatId].codeDebugger.history = [];
    }
    bot.sendMessage(chatId, "🧹 تم تنظيف جلسة الأكواد بنجاح. أرسل كودك أو ملفك الآن وسأبدأ تحليله فوراً:");
    return;
  }

  // الخروج من مصحح الأكواد
  if (data === "cd_exit") {
    if (userState[chatId]) {
      userState[chatId].inCodeDebugger = false;
      userState[chatId].codeDebugger = { mode: "debug", history: [] };
    }
    const studentName = query.from?.first_name || "طالب";
    bot.sendMessage(chatId, "✅ تم إنهاء جلسة تصحيح الأكواد. مرحباً بك دائماً!");
    showMainMenu(chatId, studentName);
    return;
  }

  // ==========================================
  // عداد ومخطط الامتحانات (Exam Countdown & Planner)
  // ==========================================

  // عرض عداد ومخطط الامتحانات
  if (data === "exam_countdown") {
    if (chatId === ADMIN_ID) resetAdminState(ADMIN_ID);
    trackFeatureUse(chatId, "exam_planner", query.from);
    renderExamCountdown(chatId, bot);
    return;
  }

  // طلب إدخال بيانات لإنشاء خطة دراسية ذكية
  if (data === "exam_create_plan_prompt") {
    if (!userState[chatId]) userState[chatId] = {};
    userState[chatId].waitingExamPlanInput = true;
    userState[chatId].waitingCalcGradeInput = false;
    userState[chatId].inAiChat = false;
    userState[chatId].inCodeDebugger = false;

    bot.sendMessage(chatId, `📅 *إنشاء خطة وجدول دراسة ومراجعة ذكي (AI Study Plan)*
━━━━━━━━━━━━━━━━━━━━

أرسل تفاصيل موادك والوقت المتبقي وسأصمم لك جدولاً مفصلاً يوماً بيوم:

📌 *مثال يمكنك نسخه والتعديل عليه:*
\`عندي 3 مواد: هياكل بيانات، دوائر رقمية، وفيزياء 2. الامتحان بعد أسبوعين وعندي 5 ساعات يومياً للمذاكرة، وبدي أركز عالهياكل لأنها صعبة.\``, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "❌ إلغاء والعودة لعداد الامتحانات", callback_data: "exam_countdown" }]]
      }
    });
    return;
  }

  // طلب إدخال لحساب الدرجة المطلوبة في النهائي
  if (data === "exam_calc_grade_prompt") {
    if (!userState[chatId]) userState[chatId] = {};
    userState[chatId].waitingCalcGradeInput = true;
    userState[chatId].waitingExamPlanInput = false;
    userState[chatId].inAiChat = false;
    userState[chatId].inCodeDebugger = false;

    bot.sendMessage(chatId, `🎯 *حاسبة الدرجة المطلوبة في الامتحان النهائي*
━━━━━━━━━━━━━━━━━━━━

أرسل علامتك المجمعة في أعمال الفصل (نصفي + كويزات + نشاط) من **50**، والتقدير الذي تطمح إليه:

📌 *أمثلة للإرسال:*
• \`38 A\` (إذا مجمع 38 وبدك امتياز 90+)
• \`30 B+\` (إذا مجمع 30 وبدك جيد جداً مرتفع 85+)
• \`25 B\` (إذا مجمع 25 وبدك جيد جداً 80+)
• \`15 PASS\` (إذا بدك بس تضمن النجاح 60+)

👇 *اكتب درجتك والتقدير الآن في المحادثة:*`, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "❌ إلغاء والعودة لعداد الامتحانات", callback_data: "exam_countdown" }]]
      }
    });
    return;
  }

  // ==========================================
  // مولّد الكويزات التفاعلي الذكي (AI Quiz)
  // ==========================================

  // عرض قائمة الكويزات والمواد
  if (data === "start_ai_quiz") {
    if (chatId === ADMIN_ID) resetAdminState(ADMIN_ID);
    trackFeatureUse(chatId, "ai_quiz", query.from);
    renderQuizSubjectMenu(chatId, bot);
    return;
  }

  // بدء كويز لمادة محددة من القائمة
  if (data.startsWith("quiz_subject_")) {
    const idx = parseInt(data.replace("quiz_subject_", ""));
    const courseObj = POPULAR_QUIZ_COURSES[idx] || { name: "هندسة الحاسوب", key: "Computer Engineering" };
    trackFeatureUse(chatId, "ai_quiz", query.from);

    bot.sendMessage(chatId, `⏳ *جاري إعداد وتوليد أسئلة الكويز الذكي لمادة (${courseObj.name})...*\nانتظر لحظات 🚀`, { parse_mode: "Markdown" }).then(async (waitMsg) => {
      const questions = await fetchQuizBatch(courseObj.name, 4, []);
      if (!userState[chatId]) userState[chatId] = {};
      userState[chatId].activeQuiz = {
        subject: courseObj.name,
        questions: questions,
        currentIndex: 0,
        score: 0
      };

      try { await bot.deleteMessage(chatId, waitMsg.message_id); } catch (e) {}
      sendCurrentQuestion(chatId, bot, userState);
    });
    return;
  }

  // إعادة كويز لمادة مخصصة أو محددة
  if (data.startsWith("quiz_subject_custom_retry_")) {
    const rawSubject = data.replace("quiz_subject_custom_retry_", "");
    const subject = decodeURIComponent(rawSubject) || "هندسة الحاسوب";
    trackFeatureUse(chatId, "ai_quiz", query.from);

    bot.sendMessage(chatId, `⏳ *جاري إعداد وتوليد كويز جديد في (${subject})...*\nانتظر لحظات 🚀`, { parse_mode: "Markdown" }).then(async (waitMsg) => {
      const questions = await fetchQuizBatch(subject, 4, []);
      if (!userState[chatId]) userState[chatId] = {};
      userState[chatId].activeQuiz = {
        subject: subject,
        questions: questions,
        currentIndex: 0,
        score: 0
      };

      try { await bot.deleteMessage(chatId, waitMsg.message_id); } catch (e) {}
      sendCurrentQuestion(chatId, bot, userState);
    });
    return;
  }

  // طلب إدخال اسم مادة أو موضوع مخصص للكويز
  if (data === "quiz_custom_subject_prompt") {
    if (!userState[chatId]) userState[chatId] = {};
    userState[chatId].waitingCustomQuizInput = true;
    userState[chatId].waitingExamPlanInput = false;
    userState[chatId].waitingCalcGradeInput = false;
    userState[chatId].inAiChat = false;
    userState[chatId].inCodeDebugger = false;

    bot.sendMessage(chatId, `✍️ *كتابة موضوع مخصص للكويز:*
━━━━━━━━━━━━━━━━━━━━

أرسل اسم أي مادة، موضوع، أو خوارزمية تريد اختبار نفسك فيها:
*(مثال: "معمارية معالج 8086" أو "أشجار البحث الثنائي BST" أو "خوارزمية Bellman-Ford")*`, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "❌ إلغاء والعودة", callback_data: "start_ai_quiz" }]]
      }
    });
    return;
  }

  // الإجابة على سؤال في الكويز
  if (data.startsWith("quiz_ans_")) {
    const selectedIdx = parseInt(data.replace("quiz_ans_", ""));
    handleQuizAnswer(chatId, bot, selectedIdx, userState);
    return;
  }

  // الانتقال للسؤال التالي
  if (data === "quiz_next_question") {
    sendCurrentQuestion(chatId, bot, userState);
    return;
  }

  // إنهاء الكويز وعرض التقرير والنتيجة
  if (data === "quiz_finish_now") {
    finishQuiz(chatId, bot, userState);
    return;
  }

  // إلغاء الكويز
  if (data === "quiz_cancel") {
    if (userState[chatId]) delete userState[chatId].activeQuiz;
    const sName = query.from?.first_name || "طالب";
    bot.sendMessage(chatId, "❌ تم إلغاء الكويز. يمكنك المحاولة في أي وقت آخر!");
    showMainMenu(chatId, sName);
    return;
  }

  // ==========================================
  // بنك الامتحانات والأسئلة السابقة (Past Papers)
  // ==========================================

  // فتح القائمة الرئيسية لبنك الامتحانات
  if (data === "open_past_papers") {
    if (chatId === ADMIN_ID) resetAdminState(ADMIN_ID);
    trackFeatureUse(chatId, "past_papers", query.from);
    renderPastPapersMenu(chatId, bot);
    return;
  }

  // عرض امتحانات سنة معينة
  if (data.startsWith("pp_year_")) {
    const yKey = data.replace("pp_year_", "");
    trackFeatureUse(chatId, "past_papers", query.from);
    renderYearExams(chatId, bot, yKey);
    return;
  }

  // طلب البحث في بنك الامتحانات
  if (data === "pp_search_prompt") {
    if (!userState[chatId]) userState[chatId] = {};
    userState[chatId].waitingPastPaperSearch = true;
    userState[chatId].waitingCustomQuizInput = false;
    userState[chatId].waitingExamPlanInput = false;
    userState[chatId].waitingCalcGradeInput = false;
    userState[chatId].inAiChat = false;
    userState[chatId].inCodeDebugger = false;

    bot.sendMessage(chatId, `🔍 *البحث في بنك الامتحانات والنماذج السابقة:*
━━━━━━━━━━━━━━━━━━━━

أرسل اسم المادة بالإنجليزية أو العربية (مثل: Calculus A أو Digital Logic أو Algorithms):`, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "❌ إلغاء والعودة", callback_data: "open_past_papers" }]]
      }
    });
    return;
  }

  // ==========================================
  // سوق تبادل الأدوات والكتب (Marketplace)
  // ==========================================

  // القائمة الرئيسية لسوق التبادل
  if (data === "open_marketplace") {
    if (chatId === ADMIN_ID) resetAdminState(ADMIN_ID);
    trackFeatureUse(chatId, "marketplace", query.from);
    renderMarketplaceMenu(chatId, bot);
    return;
  }

  // عرض إعلانات قسم معين
  if (data === "market_cat_hardware") {
    trackFeatureUse(chatId, "marketplace", query.from);
    renderCategoryListings(chatId, bot, "hardware", ADMIN_ID);
    return;
  }
  if (data === "market_cat_books") {
    trackFeatureUse(chatId, "marketplace", query.from);
    renderCategoryListings(chatId, bot, "books", ADMIN_ID);
    return;
  }
  if (data === "market_cat_other") {
    trackFeatureUse(chatId, "marketplace", query.from);
    renderCategoryListings(chatId, bot, "other", ADMIN_ID);
    return;
  }

  // عرض إعلاناتي
  if (data === "market_my_listings") {
    trackFeatureUse(chatId, "marketplace", query.from);
    renderMyListings(chatId, bot);
    return;
  }

  // حذف إعلان
  if (data.startsWith("market_del_")) {
    const listId = data.replace("market_del_", "");
    const res = deleteListing(listId, chatId, ADMIN_ID);
    if (res.success) {
      bot.sendMessage(chatId, "✅ تم حذف الإعلان بنجاح.");
      renderMyListings(chatId, bot);
    } else {
      bot.sendMessage(chatId, `❌ ${res.error}`);
    }
    return;
  }

  // طلب إضافة إعلان
  if (data.startsWith("market_add_prompt")) {
    let cat = "hardware";
    if (data.includes("_books")) cat = "books";
    else if (data.includes("_other")) cat = "other";

    if (!userState[chatId]) userState[chatId] = {};
    userState[chatId].waitingMarketAdd = cat;
    userState[chatId].waitingPastPaperSearch = false;
    userState[chatId].waitingCustomQuizInput = false;
    userState[chatId].waitingExamPlanInput = false;
    userState[chatId].waitingCalcGradeInput = false;
    userState[chatId].inAiChat = false;
    userState[chatId].inCodeDebugger = false;

    bot.sendMessage(chatId, `➕ *إضافة إعلان جديد في سوق التبادل:*
━━━━━━━━━━━━━━━━━━━━

أرسل تفاصيل إعلانك بالصيغة التالية في رسالة واحدة:
\`اسم القطعة أو الكتاب - الوصف والتفاصيل - السعر أو (مجاناً/للبدل) - رقم أو يوزر التواصل\`

📌 *مثال يمكنك نسخه:*
\`كيت أردوينو كامل مع حساسات - مستعمل بحالة ممتازة لفصل واحد - 30 شيكل - @my_username\``, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "❌ إلغاء والعودة للسوق", callback_data: "open_marketplace" }]]
      }
    });
    return;
  }

  // تصويت الطالب في استطلاع رأي خاص (سري للأدمن فقط)
  if (data.startsWith("poll_vote_")) {
    const parts = data.split("_");
    const optionIdx = parseInt(parts[parts.length - 1]);
    const pollId = parts.slice(2, parts.length - 1).join("_");
    const studentName = ((query.from?.first_name || "") + " " + (query.from?.last_name || "")).trim() || "طالب";
    const username = query.from?.username || "";

    const voteRes = recordVote(pollId, chatId, studentName, username, optionIdx);
    if (!voteRes.success) {
      bot.answerCallbackQuery(query.id, {
        text: voteRes.error || "عذراً، لا يمكن التصويت حالياً.",
        show_alert: true
      });
      return;
    }

    scheduleAutoCloudSync(bot);

    bot.answerCallbackQuery(query.id, {
      text: "✅ تم تسجيل تصويتك بنجاح، شكراً لمشاركتك!",
      show_alert: false
    });

    const safeQ = safeEscape(voteRes.poll.question);
    const safeChoice = safeEscape(voteRes.chosenOption);
    const updatedText = `🗳️ *استطلاع رأي لطلبة قسم هندسة الحاسوب*\n━━━━━━━━━━━━━━━━━━━━\n\n📌 *السؤال:* ${safeQ}\n\n✅ *تم تسجيل اختيارك بنجاح:* \`${safeChoice}\`\n\n🔒 *ملاحظة:* التصويت سري ومحفوظ للإدارة فقط، شكراً لمشاركتك الفعالة! ❤️`;

    bot.editMessageText(updatedText, {
      chat_id: chatId,
      message_id: query.message.message_id,
      parse_mode: "Markdown"
    }).catch(() => {
      bot.editMessageText(`🗳️ استطلاع رأي لطلبة قسم هندسة الحاسوب\n\nالسؤال: ${voteRes.poll.question}\n\n✅ تم تسجيل اختيارك: ${voteRes.chosenOption}\n\nالتصويت سري ومحفوظ للإدارة فقط.`, {
        chat_id: chatId,
        message_id: query.message.message_id
      }).catch(() => {});
    });
    return;
  }

  // لوحة الإذاعة
  if (data === "start_broadcast") {
    if (chatId !== ADMIN_ID) return;
    resetAdminState(ADMIN_ID);
    const users = loadUsers();
    const activeCount = users.filter((u) => u.active !== false).length;

    userState[ADMIN_ID].waitingBroadcastMessage = true;
    const lastBc = getLastBroadcast();
    const broadcastKeyboard = [
      [{ text: "🚀 إرسال إشعار التحديثات الجديدة تلقائياً", callback_data: "send_preset_broadcast" }]
    ];
    if (lastBc) {
      broadcastKeyboard.push([{ text: "🗑️ تراجع وحذف آخر إعلان تم نشره للطلاب", callback_data: "admin_unsend_last_broadcast" }]);
    }
    broadcastKeyboard.push([{ text: "❌ إلغاء الإذاعة", callback_data: "cancel_broadcast" }]);

    bot.sendMessage(
      chatId,
      `📢 *لوحة الإذاعة والإشعارات الجماعية*\n━━━━━━━━━━━━━━━━━━━━\n\n👥 *عدد المشتركين النشطين:* ${activeCount} طالب\n\nاختر من الأزرار أدناه أو أرسل رسالتك/صورتك/ملفك فوراً في المحادثة ليتم بثها للجميع:`,
      {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: broadcastKeyboard }
      }
    );
    return;
  }

  // إرسال الإشعار الجاهز للتحديثات
  if (data === "send_preset_broadcast") {
    if (chatId !== ADMIN_ID) return;
    resetAdminState(ADMIN_ID);
    broadcastMessage(bot, ADMIN_ID, null, true);
    return;
  }

  // إلغاء الإذاعة
  if (data === "cancel_broadcast") {
    if (chatId !== ADMIN_ID) return;
    resetAdminState(ADMIN_ID);
    bot.sendMessage(chatId, "تم إلغاء عملية الإذاعة.");
    return;
  }

  // تنزيل تقرير الإذاعة الأخير كملف
  if (data === "admin_download_broadcast_report") {
    if (chatId !== ADMIN_ID) return;
    resetAdminState(ADMIN_ID);
    const reportPath = path.join(__dirname, "data", "last_broadcast_report.txt");
    if (fs.existsSync(reportPath)) {
      safeSendDocument(bot, chatId, reportPath, {
        caption: "📄 تقرير الإذاعة والإشعار الأخير بالتفصيل (المستلمين والمتعذرين)",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🎛️ لوحة التحكم", callback_data: "admin_dashboard" }],
            [{ text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }]
          ]
        }
      });
    } else {
      safeSend(bot, chatId, "⚠️ لم يتم العثور على تقرير إذاعة سابق.");
    }
    return;
  }

  // إحصائيات البوت
  if (data === "bot_stats") {
    if (chatId !== ADMIN_ID) return;
    resetAdminState(ADMIN_ID);
    sendStatsReport(bot, chatId);
    return;
  }

  // تصدير وعرض قائمة المشتركين بالكامل
  if (data === "export_users_list") {
    if (chatId !== ADMIN_ID) return;
    resetAdminState(ADMIN_ID);
    const users = loadUsers();
    if (users.length === 0) {
      safeSend(bot, chatId, "⚠️ لا يوجد طلاب مسجلين حتى الآن.", {
        reply_markup: {
          inline_keyboard: [[{ text: "🎛️ لوحة التحكم", callback_data: "admin_dashboard" }]]
        }
      });
      return;
    }

    let listText = `📋 *قائمة جميع المشتركين المسجلين (${users.length} طالب)*:\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    users.forEach((u, index) => {
      const uName = safeEscape(u.name || "طالب");
      const uTag = u.username ? ` (${safeEscape(u.username)})` : " (بدون يوزر)";
      const status = u.banned ? "🚫" : u.active !== false ? "✅" : "❌";
      listText += `${index + 1}. ${status} *${uName}*${uTag}\n   🆔 \`${u.id}\`\n`;
    });

    const exportButtons = [
      [{ text: "💾 تنزيل كملف JSON كامل", callback_data: "admin_download_backup" }],
      [{ text: "🎛️ لوحة التحكم", callback_data: "admin_dashboard" }],
      [{ text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }]
    ];

    if (listText.length < 3900) {
      safeSend(bot, chatId, listText, {
        reply_markup: { inline_keyboard: exportButtons }
      });
    } else {
      const tempPath = path.join(__dirname, "data", "subscribers_list.txt");
      let fileContent = `قائمة مشتركي بوت هندسة الحاسوب - الجامعة الإسلامية بغزة\n`;
      fileContent += `إجمالي المشتركين: ${users.length}\n`;
      fileContent += `التاريخ: ${new Date().toLocaleString()}\n`;
      fileContent += `====================================================\n\n`;
      users.forEach((u, i) => {
        fileContent += `${i + 1}. Name: ${u.name} | Username: ${u.username || "None"} | ID: ${u.id} | Joined: ${u.joinedAt || "N/A"} | Active: ${u.active !== false} | Banned: ${u.banned || false}\n`;
      });
      fs.writeFileSync(tempPath, fileContent, "utf8");
      safeSendDocument(bot, chatId, tempPath, {
        caption: `📄 قائمة المشتركين بالكامل (${users.length} طالب)`,
        reply_markup: { inline_keyboard: exportButtons }
      });
    }
    return;
  }

  // تنزيل نسخة احتياطية شاملة لكامل البوت JSON (طلاب + استطلاعات + سوق + إعلانات)
  if (data === "admin_download_backup") {
    if (chatId !== ADMIN_ID) return;
    resetAdminState(ADMIN_ID);
    sendMasterBackupToAdmin(chatId, bot);
    return;
  }

  // طلب استعادة أو دمج بيانات شاملة
  if (data === "admin_restore_prompt") {
    if (chatId !== ADMIN_ID) return;
    resetAdminState(ADMIN_ID);
    userState[ADMIN_ID].waitingRestoreBackup = true;
    safeSend(
      bot,
      chatId,
      `📥 *استعادة أو دمج البيانات الشاملة (Restore / Merge)*\n━━━━━━━━━━━━━━━━━━━━\n\nأرسل الآن ملف النسخة الاحتياطية (\`ce_bot_full_backup.json\` أو \`users.json\`) مباشرة هنا في المحادثة.\n\n⚡ *ملاحظة:* سيقوم البوت تلقائياً بدمج واسترجاع كافة استطلاعات الرأي والأصوات، إعلانات سوق التبادل، وبيانات الطلاب المشتركين بدقة ودون فقدان أي معلومة! 🚀`,
      {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ إلغاء والعودة للوحة التحكم", callback_data: "admin_dashboard" }]]
        }
      }
    );
    return;
  }

  // تواصل مع الأدمن
  if (data === "contact_admin") {
    trackFeatureUse(chatId, "contact_admin", query.from);
    userState[chatId] = { ...userState[chatId], waitingAdminMessage: true };
    bot.sendMessage(
      chatId,
      "💬 *تواصل مع الأدمن / إرسال استفسار أو ملف*\n━━━━━━━━━━━━━━━━━━━━\n\nأهلاً بك! يمكنك الآن كتابة استفسارك أو إرسال **أي نوع من الملفات بجميع الصيغ**:\n📊 جداول إكسل: Excel (`.xlsx`, `.xls`, `.csv`)\n📽️ عروض تقديمية: PowerPoint (`.pptx`, `.ppt`)\n📄 مستندات: Word (`.docx`, `.doc`), PDF (`.pdf`)\n📦 ملفات مضغوطة: `ZIP`, `RAR`, `7Z`\n💻 ملفات برمجية ونصوص: أكواد وملاحظات\n📷 وسائط: صور، فيديوهات، تسجيلات صوتية\n\n👇 *أرسل رسالتك أو ملفك الآن في المحادثة:*",
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ إلغاء والعودة للقائمة الرئيسية", callback_data: "cancel_contact_admin" }]
          ]
        }
      }
    );
    return;
  }

  // إلغاء التواصل مع الأدمن
  if (data === "cancel_contact_admin") {
    if (userState[chatId]) userState[chatId].waitingAdminMessage = false;
    const name = userState[chatId]?.name || "طالب";
    showMainMenu(chatId, name);
    return;
  }

  // ضغط الأدمن على زر الرد على الطالب
  if (data.startsWith("admin_reply_")) {
    const studentChatId = data.replace("admin_reply_", "");
    resetAdminState(ADMIN_ID);
    userState[ADMIN_ID].replyingToStudent = studentChatId;
    bot.sendMessage(
      chatId,
      `✍️ *الرد على الطالب:*\n🆔 الآيدي: \`${studentChatId}\`\n\nأرسل الآن ردك (رسالة نصية، صورة، ملف، تسجيل صوتي) وسيتم تسليمها للطالب مباشرة:`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ إلغاء الرد", callback_data: "cancel_admin_reply" }]
          ]
        }
      }
    );
    return;
  }

  // إلغاء رد الأدمن
  if (data === "cancel_admin_reply") {
    resetAdminState(ADMIN_ID);
    bot.sendMessage(chatId, "تم إلغاء عملية الرد.");
    return;
  }

  // زر البدء بالبحث
  if (data === "start_search") {
    trackFeatureUse(chatId, "search", query.from);
    bot.sendMessage(
      chatId,
      "🔍 أرسل اسم المادة أو كود المساق مباشرة في المحادثة:\n(مثال: `ECOM 2401` أو `برمجة` أو `Calculus` أو `شبكات`)",
      { parse_mode: "Markdown" }
    );
    return;
  }

  // عرض قائمة متطلبات الجامعة
  if (data === "show_uni_reqs") {
    trackFeatureUse(chatId, "uni_reqs", query.from);
    const buttons = Object.keys(uniRequirements).map((sub) => [
      { text: "📖 " + sub, callback_data: "req_" + sub }
    ]);
    buttons.push(
      [{ text: "🔙 رجوع لبوابة المقررات", callback_data: "menu_academic" }],
      [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
    );

    bot.sendMessage(chatId, "🏛️ اختر مساق متطلبات الجامعة المطلوب:", {
      reply_markup: { inline_keyboard: buttons }
    });
    return;
  }

  // اختيار مادة من متطلبات الجامعة
  if (data.startsWith("req_")) {
    trackFeatureUse(chatId, "uni_reqs", query.from);
    const subjectName = data.replace("req_", "");
    const item = uniRequirements[subjectName];

    if (!item) {
      bot.sendMessage(chatId, "❌ حدث خطأ، المادة غير موجودة");
      return;
    }
    sendUniReqDetails(chatId, subjectName, item);
    return;
  }

  // متطلب جامعة من نتائج البحث
  if (data.startsWith("find_req_")) {
    trackFeatureUse(chatId, "uni_reqs", query.from);
    const reqName = data.replace("find_req_", "");
    const item = uniRequirements[reqName];
    if (item) {
      sendUniReqDetails(chatId, reqName, item);
    }
    return;
  }

  // برنامج مختبر من نتائج البحث
  if (data.startsWith("find_lab_")) {
    trackFeatureUse(chatId, "lab_programs", query.from);
    const labName = data.replace("find_lab_", "");
    const item = labPrograms[labName];
    if (item) {
      sendLabDetails(chatId, labName, item);
    }
    return;
  }

  // ملف المعدل
  if (data === "gpa_file") {
    trackFeatureUse(chatId, "gpa_file", query.from);
    const filePath = path.join(__dirname, "gpa_calculator.xlsx");
    bot.sendDocument(chatId, filePath, {
      caption: "📊 ملف حساب وتوقع المعدل الفصلي والتراكمي",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 رجوع لبوابة الامتحانات والمختبرات", callback_data: "menu_exams_labs" }],
          [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
        ]
      }
    });
    return;
  }

  // خطة 5 سنوات
  if (data === "plan5") {
    trackFeatureUse(chatId, "plan5", query.from);
    const filePath = path.join(__dirname, "plan_5years.pdf");
    bot.sendDocument(chatId, filePath, {
      caption: "📄 خطة هندسة الحاسوب - نظام 5 سنوات",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 رجوع لبوابة المقررات والخطط", callback_data: "menu_academic" }],
          [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
        ]
      }
    });
    return;
  }

  // خطة 4 سنوات
  if (data === "plan4") {
    trackFeatureUse(chatId, "plan4", query.from);
    const img1 = path.join(__dirname, "plan4_1.png");
    const img2 = path.join(__dirname, "plan4_2.png");
    bot.sendPhoto(chatId, img1).then(() => {
      bot.sendPhoto(chatId, img2, {
        caption: "🖼️ خطة هندسة الحاسوب (4 سنوات - 136 ساعة)",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔙 رجوع لبوابة المقررات والخطط", callback_data: "menu_academic" }],
            [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
          ]
        }
      });
    });
    return;
  }

  // المتطلبات المعتمدة
  if (data === "show_prerequisites") {
    trackFeatureUse(chatId, "prerequisites", query.from);
    const imagePath = path.join(__dirname, "prerequisites.png");
    bot.sendPhoto(chatId, imagePath, {
      caption: "📷 شجرة المواد المعتمدة على بعضها (Prerequisites)",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 رجوع لبوابة المقررات والخطط", callback_data: "menu_academic" }],
          [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
        ]
      }
    });
    return;
  }

  // عرض السنوات
  if (data === "show_years" || data === "back_years") {
    trackFeatureUse(chatId, "show_years", query.from);
    const buttons = Object.keys(courses).map((year) => [
      { text: year, callback_data: "year_" + year }
    ]);
    buttons.push(
      [{ text: "🔙 رجوع لبوابة المقررات", callback_data: "menu_academic" }],
      [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
    );

    bot.sendMessage(chatId, "اختر السنة:", {
      reply_markup: { inline_keyboard: buttons }
    });
    return;
  }

  // جهات الاتصال
  if (data === "show_contacts") {
    trackFeatureUse(chatId, "contacts", query.from);
    const buttons = Object.keys(contacts).map((c) => [
      { text: c, callback_data: "contact_" + c }
    ]);
    buttons.push(
      [{ text: "🔙 رجوع لبوابة الخدمات", callback_data: "menu_services" }],
      [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
    );

    bot.sendMessage(chatId, "اختر الجهة:", {
      reply_markup: { inline_keyboard: buttons }
    });
    return;
  }

  // تفاصيل جهة الاتصال
  if (data.startsWith("contact_")) {
    trackFeatureUse(chatId, "contacts", query.from);
    const name = data.replace("contact_", "");
    const buttons = contacts[name].map((c) => [
      { text: c.name, url: "https://wa.me/" + c.phone.replace(/\D/g, "") }
    ]);
    buttons.push(
      [{ text: "🔙 رجوع لجهات الاتصال", callback_data: "show_contacts" }],
      [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
    );

    bot.sendMessage(chatId, "📞 " + name + "\nاضغط على الاسم للتواصل:", {
      reply_markup: { inline_keyboard: buttons }
    });
    return;
  }

  // عرض مواد المختبرات
  if (data === "open_lab_programs") {
    trackFeatureUse(chatId, "lab_programs", query.from);
    const buttons = Object.keys(labPrograms).map((name) => [
      { text: name, callback_data: "labItem_" + name }
    ]);
    buttons.push(
      [{ text: "🔙 رجوع لبوابة الامتحانات والمختبرات", callback_data: "menu_exams_labs" }],
      [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
    );

    bot.sendMessage(chatId, "🧪 اختر المادة:", {
      reply_markup: { inline_keyboard: buttons }
    });
    return;
  }

  // اختيار مادة من المختبر
  if (data.startsWith("labItem_")) {
    trackFeatureUse(chatId, "lab_programs", query.from);
    const name = data.replace("labItem_", "");
    const item = labPrograms[name];

    if (!item) {
      bot.sendMessage(chatId, "❌ حدث خطأ، المادة غير موجودة");
      return;
    }
    sendLabDetails(chatId, name, item);
    return;
  }

  // اختيار السنة
  if (data.startsWith("year_")) {
    trackFeatureUse(chatId, "show_years", query.from);
    const year = data.replace("year_", "");
    userState[chatId] = { year: year };

    const semesters = Object.keys(courses[year]).map((s) => [
      { text: s, callback_data: "semester_" + s }
    ]);
    semesters.push(
      [{ text: "🔙 رجوع للسنوات", callback_data: "back_years" }],
      [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
    );

    bot.sendMessage(chatId, "اختر الفصل:", {
      reply_markup: { inline_keyboard: semesters }
    });
    return;
  }

  // الرجوع للفصول
  if (data === "back_semesters") {
    const year = userState[chatId]?.year;
    if (!year) return;

    const semesters = Object.keys(courses[year]).map((s) => [
      { text: s, callback_data: "semester_" + s }
    ]);
    semesters.push(
      [{ text: "🔙 رجوع للسنوات", callback_data: "back_years" }],
      [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
    );

    bot.sendMessage(chatId, "اختر الفصل:", {
      reply_markup: { inline_keyboard: semesters }
    });
    return;
  }

  // اختيار فصل
  if (data.startsWith("semester_")) {
    trackFeatureUse(chatId, "show_years", query.from);
    const semester = data.replace("semester_", "");
    const year = userState[chatId]?.year;

    if (!year) {
      bot.sendMessage(chatId, "حدث خطأ، اختر السنة أولاً.");
      return;
    }

    userState[chatId].semester = semester;

    const subjects = Object.keys(courses[year][semester]).map((sub) => [
      { text: sub, callback_data: "subject_" + sub }
    ]);
    subjects.push(
      [{ text: "🔙 رجوع للفصول", callback_data: "back_semesters" }],
      [{ text: "🏠 العودة للقائمة الرئيسية", callback_data: "main_menu" }]
    );

    bot.sendMessage(chatId, "اختر المادة:", {
      reply_markup: { inline_keyboard: subjects }
    });
    return;
  }

  // اختيار مادة من شجرة السنوات
  if (data.startsWith("subject_")) {
    trackFeatureUse(chatId, "show_years", query.from);
    const subject = data.replace("subject_", "");
    const state = userState[chatId];

    if (!state?.year || !state?.semester) {
      bot.sendMessage(chatId, "حدث خطأ. اختر السنة والفصل أولاً.");
      return;
    }
    state.currentSubject = subject;

    const courseData = courses[state.year]?.[state.semester]?.[subject];
    if (!courseData) {
      bot.sendMessage(chatId, "❌ حدث خطأ، لم يتم العثور على المادة.");
      return;
    }

    const meta = metaMap[state.year]?.[state.semester]?.[subject] || {};
    const courseItem = {
      name: subject,
      arName: meta.ar || "",
      code: meta.code || "",
      year: state.year,
      semester: state.semester,
      data: courseData
    };

    sendCourseDetails(chatId, courseItem, true);
    return;
  }

  // اختيار مادة من فهرس نتائج البحث عبر المعرّف
  if (data.startsWith("find_c_")) {
    trackFeatureUse(chatId, "show_years", query.from);
    const courseId = parseInt(data.replace("find_c_", ""), 10);
    const courseItem = courseCatalog[courseId];

    if (courseItem) {
      userState[chatId] = {
        year: courseItem.year,
        semester: courseItem.semester,
        currentSubject: courseItem.name
      };
      sendCourseDetails(chatId, courseItem, false);
      return;
    }
  }

  // للتوافق مع أزرار البحث القديمة
  if (data.startsWith("find_subject_")) {
    trackFeatureUse(chatId, "show_years", query.from);
    const subjectName = data.replace("find_subject_", "");
    const match = courseCatalog.find(
      (c) => c.name.toLowerCase() === subjectName.toLowerCase() || c.arName === subjectName
    );

    if (match) {
      userState[chatId] = {
        year: match.year,
        semester: match.semester,
        currentSubject: match.name
      };
      sendCourseDetails(chatId, match, false);
      return;
    }
  }
});

// ==========================================
// 2. معالج الرسائل المباشرة والتواصل مع الأدمن
// ==========================================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  // التحقق من حالة حظر المستخدم
  if (chatId !== ADMIN_ID && isUserBanned(chatId)) {
    bot.sendMessage(chatId, "⛔ *عذراً، تم تقييد وصولك للبوت!*\nتم حظر حسابك من قبل إدارة القسم.", { parse_mode: "Markdown" });
    return;
  }

  // حفظ بيانات المستخدم فور تفاعله
  saveUser(msg.from, chatId);

  // تجاهل الأوامر الرسمية مثل /start
  if (msg.text && msg.text.startsWith("/")) return;

  // =========================================================================
  // 1. الأولوية المطلقة للأدمن: الرد المباشر على طالب (زر الرد أو ميزة Reply التليجرام)
  // =========================================================================
  let targetStudentId = null;
  if (chatId === ADMIN_ID) {
    if (userState[ADMIN_ID]?.replyingToStudent) {
      targetStudentId = userState[ADMIN_ID].replyingToStudent;
    } else if (msg.reply_to_message && adminMessageMap.has(msg.reply_to_message.message_id)) {
      targetStudentId = adminMessageMap.get(msg.reply_to_message.message_id);
    }
  }

  if (targetStudentId) {
    // تصفير جميع حالات الأدمن فوراً لضمان عدم حدوث أي تداخل
    resetAdminState(ADMIN_ID);

    try {
      const studentKeyboard = {
        inline_keyboard: [
          [{ text: "💬 إرسال رد أو استفسار آخر", callback_data: "contact_admin" }],
          [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
        ]
      };

      if (msg.text) {
        await bot.sendMessage(
          targetStudentId,
          `📩 *رد من إدارة البوت / الأدمن:*\n━━━━━━━━━━━━━━━━━━━━\n\n${msg.text}`,
          { parse_mode: "Markdown", reply_markup: studentKeyboard }
        );
      } else if (msg.document) {
        const fileName = msg.document.file_name || "ملف مرفق";
        const caption = `📩 رد ومرفق من إدارة البوت / الأدمن:\n━━━━━━━━━━━━━━━━━━━━\n📁 الملف: ${fileName}` + (msg.caption ? `\n📝 الوصف: ${msg.caption}` : "");
        await bot.sendDocument(targetStudentId, msg.document.file_id, {
          caption: caption,
          reply_markup: studentKeyboard
        });
      } else if (msg.photo) {
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        const caption = `📩 صورة من إدارة البوت / الأدمن:\n━━━━━━━━━━━━━━━━━━━━\n` + (msg.caption ? `📝 الوصف: ${msg.caption}` : "");
        await bot.sendPhoto(targetStudentId, fileId, {
          caption: caption,
          reply_markup: studentKeyboard
        });
      } else if (msg.voice) {
        await bot.sendVoice(targetStudentId, msg.voice.file_id, {
          caption: `📩 تسجيل صوتي من إدارة البوت / الأدمن`,
          reply_markup: studentKeyboard
        });
      } else if (msg.video) {
        const caption = `📩 فيديو من إدارة البوت / الأدمن:\n━━━━━━━━━━━━━━━━━━━━\n` + (msg.caption ? `📝 الوصف: ${msg.caption}` : "");
        await bot.sendVideo(targetStudentId, msg.video.file_id, {
          caption: caption,
          reply_markup: studentKeyboard
        });
      } else if (msg.video_note) {
        await bot.sendVideoNote(targetStudentId, msg.video_note.file_id, {
          reply_markup: studentKeyboard
        });
      } else if (msg.animation) {
        await bot.sendAnimation(targetStudentId, msg.animation.file_id, {
          caption: `📩 صورة متحركة من إدارة البوت / الأدمن`,
          reply_markup: studentKeyboard
        });
      } else if (msg.audio) {
        const audioName = msg.audio.title || msg.audio.file_name || "ملف صوتي";
        const captionText = `📩 ملف صوتي من إدارة البوت / الأدمن:\n━━━━━━━━━━━━━━━━━━━━\n` + (msg.caption ? `📝 الوصف: ${msg.caption}` : "");
        await bot.sendAudio(targetStudentId, msg.audio.file_id, {
          caption: captionText,
          reply_markup: studentKeyboard
        });
      }

      bot.sendMessage(ADMIN_ID, "✅ تم إرسال الرد إلى الطالب بنجاح!");
    } catch (err) {
      console.error("Error sending reply to student:", err.message);
      bot.sendMessage(ADMIN_ID, "❌ تعذر إرسال الرد إلى الطالب (قد يكون قام بحظر البوت أو حذف المحادثة).");
    }
    return;
  }

  // =========================================================================
  // 2. عمليات الإدارة الأخرى (الإذاعة الجماعية، الحظر، الفحص، الإضافة)
  // =========================================================================
  if (chatId === ADMIN_ID) {
    // حالة: الأدمن في وضع إرسال إشعار إذاعي جماعي للطلاب
    if (userState[ADMIN_ID]?.waitingBroadcastMessage) {
      userState[ADMIN_ID].waitingBroadcastMessage = false;
      broadcastMessage(bot, ADMIN_ID, msg, false);
      return;
    }

    // حالة: الأدمن يرسل ملف JSON لاستعادة أو دمج قاعدة بيانات المشتركين أو النسخة الشاملة
    if (msg.document && (userState[ADMIN_ID]?.waitingRestoreBackup || (msg.document.file_name && msg.document.file_name.toLowerCase().endsWith(".json")))) {
      userState[ADMIN_ID].waitingRestoreBackup = false;
      try {
        const downloadDir = path.join(__dirname, "data");
        const downloadedPath = await bot.downloadFile(msg.document.file_id, downloadDir);
        const jsonText = fs.readFileSync(downloadedPath, "utf8");
        try { fs.unlinkSync(downloadedPath); } catch (e) {}

        const parsed = JSON.parse(jsonText);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && (parsed.users || parsed.polls || parsed.marketplace || parsed.version)) {
          const res = restoreDatabaseBundle(parsed);
          safeSend(
            bot,
            chatId,
            `✅ *تم استعادة ودمج النسخة الشاملة بنجاح!* 🚀\n━━━━━━━━━━━━━━━━━━━━\n👥 *المشتركين:* تمت استعادة وتحديث سجلاتهم.\n🗳️ *الاستطلاعات:* تمت استعادة الاستطلاعات وتصويت الطلاب.\n🔄 *سوق التبادل:* تمت استعادة كافة الإعلانات.\n\nجميع البيانات تعمل الآن بنجاح وبأعلى دقة!`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "🎛️ لوحة التحكم", callback_data: "admin_dashboard" }],
                  [{ text: "🗳️ استطلاعات الرأي", callback_data: "admin_polls_menu" }]
                ]
              }
            }
          );
          return;
        } else if (Array.isArray(parsed)) {
          const mergeResult = mergeUsersData(parsed);
          safeSend(
            bot,
            chatId,
            `✅ *تم استعادة ودمج بيانات المشتركين بنجاح!*\n━━━━━━━━━━━━━━━━━━━━\n➕ *طلاب جدد تمت إضافتهم:* ${mergeResult.addedCount}\n🔄 *طلاب تم تحديث بياناتهم:* ${mergeResult.updatedCount}\n👥 *إجمالي المشتركين الحالي:* ${mergeResult.total} طالب`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "🎛️ لوحة التحكم", callback_data: "admin_dashboard" }],
                  [{ text: "📄 تصدير القائمة", callback_data: "export_users_list" }]
                ]
              }
            }
          );
          return;
        } else {
          safeSend(bot, chatId, "❌ الملف المرسل لا يحتوي على بنية بيانات JSON صحيحة.");
          return;
        }
      } catch (err) {
        console.error("Error restoring backup:", err);
        safeSend(bot, chatId, `❌ حدث خطأ أثناء قراءة ملف النسخة الاحتياطية: ${safeEscape(err.message)}`);
        return;
      }
    }

    // حالة: الأدمن في وضع إدخال معرّف لحظر طالب
    if (userState[ADMIN_ID]?.waitingBanInput && msg.text) {
      userState[ADMIN_ID].waitingBanInput = false;
      const target = msg.text.trim();
      const res = banUser(target, "حظر بواسطة الأدمن");
      if (res.success) {
        safeSend(bot, chatId, `✅ *تم حظر الطالب بنجاح!*\n• الاسم: ${safeEscape(res.user.name)}\n• الـ ID: \`${res.user.id}\`\n• المعرف: ${safeEscape(res.user.username || "بدون يوزر")}`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🎛️ لوحة التحكم", callback_data: "admin_dashboard" }],
              [{ text: "🚫 قائمة المحظورين", callback_data: "admin_banned_list" }]
            ]
          }
        });
      } else {
        safeSend(bot, chatId, `❌ ${res.error}`, {
          reply_markup: {
            inline_keyboard: [[{ text: "🎛️ لوحة التحكم", callback_data: "admin_dashboard" }]]
          }
        });
      }
      return;
    }

    // حالة: الأدمن في وضع إدخال معرّف لإلغاء حظر طالب
    if (userState[ADMIN_ID]?.waitingUnbanInput && msg.text) {
      userState[ADMIN_ID].waitingUnbanInput = false;
      const target = msg.text.trim();
      const res = unbanUser(target);
      if (res.success) {
        safeSend(bot, chatId, `✅ *تم إلغاء حظر الطالب بنجاح!*\n• الاسم: ${safeEscape(res.user.name)}\n• الـ ID: \`${res.user.id}\``, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🎛️ لوحة التحكم", callback_data: "admin_dashboard" }],
              [{ text: "🚫 قائمة المحظورين", callback_data: "admin_banned_list" }]
            ]
          }
        });
      } else {
        safeSend(bot, chatId, `❌ ${res.error}`, {
          reply_markup: {
            inline_keyboard: [[{ text: "🎛️ لوحة التحكم", callback_data: "admin_dashboard" }]]
          }
        });
      }
      return;
    }

    // حالة: الأدمن في وضع فحص واستعلام عن طالب
    if (userState[ADMIN_ID]?.waitingSearchUserInput && msg.text) {
      userState[ADMIN_ID].waitingSearchUserInput = false;
      const target = msg.text.trim();
      renderUserProfile(chatId, bot, target);
      return;
    }

    // حالة: الأدمن في وضع إضافة طالب يدوياً
    if (userState[ADMIN_ID]?.waitingAddUserInput && msg.text) {
      userState[ADMIN_ID].waitingAddUserInput = false;
      const parts = msg.text.trim().split(/\s+/);
      const targetId = parts[0];
      let name = "طالب";
      let username = "";

      if (parts.length > 1) {
        const rest = parts.slice(1);
        const userIdx = rest.findIndex(p => p.startsWith("@"));
        if (userIdx !== -1) {
          username = rest[userIdx];
          rest.splice(userIdx, 1);
        }
        if (rest.length > 0) name = rest.join(" ");
      }

      const res = addUserManually(targetId, name, username);
      if (res.success) {
        safeSend(bot, chatId, `✅ *تمت إضافة/تحديث الطالب بنجاح!*\n• الاسم: ${safeEscape(res.user.name)}\n• الـ ID: \`${res.user.id}\`\n• المعرف: ${safeEscape(res.user.username || "بدون يوزر")}`, {
          reply_markup: {
            inline_keyboard: [[{ text: "🎛️ لوحة التحكم", callback_data: "admin_dashboard" }]]
          }
        });
      } else {
        safeSend(bot, chatId, `❌ ${res.error}`, {
          reply_markup: {
            inline_keyboard: [[{ text: "🎛️ لوحة التحكم", callback_data: "admin_dashboard" }]]
          }
        });
      }
      return;
    }

    // حالة: الأدمن في وضع إدخال مفتاح Gemini API جديد
    if (userState[ADMIN_ID]?.waitingGeminiKeyInput && msg.text) {
      userState[ADMIN_ID].waitingGeminiKeyInput = false;
      const newKey = msg.text.trim();
      safeSend(bot, chatId, "⏳ *جاري اختبار وتفعيل مفتاح الذكاء الاصطناعي الجديد...*", { parse_mode: "Markdown" });

      testApiKey(newKey).then((testRes) => {
        if (testRes.success) {
          setApiKey(newKey);
          safeSend(bot, chatId, "✅ *تم تفعيل واختبار مفتاح الذكاء الاصطناعي بنجاح!*\nالمساعد الذكي يعمل الآن بأعلى كفاءة وسرعة فائقة 🚀", {
            reply_markup: {
              inline_keyboard: [[{ text: "🎛️ لوحة التحكم", callback_data: "admin_dashboard" }]]
            }
          });
        } else {
          safeSend(bot, chatId, `❌ *فشل تفعيل المفتاح الجديد:*\n${safeEscape(testRes.error)}\n\nيرجى التأكد من نسخ مفتاح صحيح من:\nhttps://aistudio.google.com/app/apikey`, {
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔄 إعادة المحاولة", callback_data: "admin_gemini_key_prompt" }],
                [{ text: "🎛️ لوحة التحكم", callback_data: "admin_dashboard" }]
              ]
            }
          });
        }
      }).catch((err) => {
        safeSend(bot, chatId, `❌ حدث خطأ أثناء الاختبار: ${safeEscape(err.message)}`, {
          reply_markup: {
            inline_keyboard: [[{ text: "🎛️ لوحة التحكم", callback_data: "admin_dashboard" }]]
          }
        });
      });
      return;
    }

    // حالة: الأدمن في وضع إدخال وتخصيص استطلاع رأي (Poll)
    if (userState[ADMIN_ID]?.waitingPollInput && msg.text) {
      userState[ADMIN_ID].waitingPollInput = false;
      const text = msg.text.trim();
      const parts = text.split(/[/|]/).map(p => p.trim()).filter(Boolean);

      if (parts.length < 3) {
        safeSend(bot, chatId, "❌ صيغة الاستطلاع غير صحيحة. يجب كتابة السؤال متبوعاً بخيارين على الأقل مفصولة بشرطة مائلة `/`.\n\n*مثال:* `هل المحتوى واضح؟ / نعم ممتاز / يحتاج تفصيل أكثر / لا`", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔄 إعادة المحاولة", callback_data: "admin_poll_prompt" }],
              [{ text: "🎛️ لوحة التحكم", callback_data: "admin_dashboard" }]
            ]
          }
        });
        return;
      }

      const question = parts[0];
      const options = parts.slice(1, 11); // أقصى حد 10 خيارات في التليجرام
      broadcastPollToStudents(bot, question, options);
      return;
    }
  }

  // =========================================================================
  // 3. حالة: المستخدم في وضع المحادثة التفاعلية مع المساعد الذكي (AI Chatbot)
  // يدعم: النصوص، الصور، المستندات، ملفات الأكواد، ملفات PDF، والتسجيلات الصوتية
  // =========================================================================
  if (userState[chatId]?.inAiChat && (!msg.text || !msg.text.startsWith("/"))) {
    trackFeatureUse(chatId, "ai_chat", msg.from);
    const typingTimer = setInterval(() => {
      bot.sendChatAction(chatId, "typing").catch(() => {});
    }, 3000);
    bot.sendChatAction(chatId, "typing").catch(() => {});

    try {
      let promptText = (msg.text || msg.caption || "").trim();
      const attachments = [];

      // 1. معالجة الصور المرسلة للمساعد الذكي
      if (msg.photo && msg.photo.length > 0) {
        const photo = msg.photo[msg.photo.length - 1];
        try {
          const downloadDir = path.join(__dirname, "data");
          const downloadedPath = await bot.downloadFile(photo.file_id, downloadDir);
          const buffer = fs.readFileSync(downloadedPath);
          try { fs.unlinkSync(downloadedPath); } catch (e) {}
          const base64 = buffer.toString("base64");
          attachments.push({ mimeType: "image/jpeg", data: base64 });
          if (!promptText) promptText = "اشرح هذا السؤال أو المسألة من الصورة بالتفصيل، وساعدني في حلها خطوة بخطوة.";
        } catch (imgErr) {
          console.error("Error downloading photo for AI:", imgErr.message);
        }
      }
      // 2. معالجة المستندات والملفات (PDF، أكواد، صور، نصوص)
      else if (msg.document) {
        try {
          const fileName = msg.document.file_name || "file";
          const ext = path.extname(fileName).toLowerCase();
          const mime = msg.document.mime_type || "";
          const downloadDir = path.join(__dirname, "data");
          const downloadedPath = await bot.downloadFile(msg.document.file_id, downloadDir);
          const buffer = fs.readFileSync(downloadedPath);
          try { fs.unlinkSync(downloadedPath); } catch (e) {}

          const codeExts = [".txt", ".cpp", ".c", ".h", ".hpp", ".java", ".py", ".js", ".ts", ".html", ".css", ".sql", ".v", ".vhd", ".vhdl", ".asm", ".s", ".json", ".csv", ".md"];
          const isImage = mime.startsWith("image/") || [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"].includes(ext);

          if (isImage) {
            attachments.push({ mimeType: mime || "image/jpeg", data: buffer.toString("base64") });
            if (!promptText) promptText = "اشرح محتوى هذه الصورة وحل المسألة أو السؤال الموجود فيها بالتفصيل.";
          } else if (ext === ".pdf" || mime === "application/pdf") {
            attachments.push({ mimeType: "application/pdf", data: buffer.toString("base64") });
            if (!promptText) promptText = `اشرح ولخص محتوى هذا الملف (${fileName}) وساعدني في حل أي أسئلة فيه.`;
          } else if (codeExts.includes(ext) || mime.startsWith("text/")) {
            const fileCode = buffer.toString("utf8");
            attachments.push({ text: `محتوى الملف (${fileName}):\n\`\`\`\n${fileCode.slice(0, 40000)}\n\`\`\`` });
            if (!promptText) promptText = `افحص واشرح كود هذا الملف (${fileName}) ووضح كيفية عمله أو أصلح أي أخطاء فيه.`;
          } else {
            attachments.push({ mimeType: mime || "application/octet-stream", data: buffer.toString("base64") });
            if (!promptText) promptText = `اشرح هذا الملف (${fileName}) وساعدني فيه.`;
          }
        } catch (docErr) {
          console.error("Error downloading document for AI:", docErr.message);
        }
      }
      // 3. معالجة التسجيلات الصوتية والملفات الصوتية
      else if (msg.voice || msg.audio) {
        try {
          const fileId = msg.voice ? msg.voice.file_id : msg.audio.file_id;
          const mime = msg.voice ? "audio/ogg" : (msg.audio?.mime_type || "audio/mp3");
          const downloadDir = path.join(__dirname, "data");
          const downloadedPath = await bot.downloadFile(fileId, downloadDir);
          const buffer = fs.readFileSync(downloadedPath);
          try { fs.unlinkSync(downloadedPath); } catch (e) {}
          attachments.push({ mimeType: mime, data: buffer.toString("base64") });
          if (!promptText) promptText = "استمع إلى هذا التسجيل الصوتي وأجب على سؤالي وساعدني فيه.";
        } catch (audErr) {
          console.error("Error downloading audio for AI:", audErr.message);
        }
      }

      // طلب الإجابة من الذكاء الاصطناعي مع المرفقات وسجل المحادثة
      const history = userState[chatId].aiHistory || [];
      const answer = await generateAIResponse(promptText, history, attachments);

      if (!answer.startsWith("⚠️")) {
        if (!userState[chatId]) userState[chatId] = {};
        if (!userState[chatId].aiHistory) userState[chatId].aiHistory = [];
        const userTurnText = (attachments.length > 0 ? "📷 [مرفق/صورة] " : "") + promptText;
        userState[chatId].aiHistory.push({ role: "user", text: userTurnText });
        userState[chatId].aiHistory.push({ role: "model", text: answer });
        if (userState[chatId].aiHistory.length > 8) {
          userState[chatId].aiHistory = userState[chatId].aiHistory.slice(-8);
        }
      }

      const aiKeyboard = {
        inline_keyboard: [
          [{ text: "🧹 مسح الذاكرة وبدء محادثة جديدة", callback_data: "clear_ai_chat" }],
          [{ text: "🔙 رجوع لبوابة الذكاء الاصطناعي", callback_data: "menu_ai_tools" }],
          [{ text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }]
        ]
      };

      await bot.sendMessage(chatId, answer, {
        parse_mode: "Markdown",
        reply_markup: aiKeyboard
      }).catch(async () => {
        await bot.sendMessage(chatId, answer, {
          reply_markup: aiKeyboard
        });
      });
    } catch (err) {
      console.error("AI Error:", err);
      bot.sendMessage(chatId, "أهلاً بك! أنا هنا ومعك دائماً، تفضل بطرح سؤالك أو إرسال صورتك وسأجيبك فوراً! 🚀");
    } finally {
      clearInterval(typingTimer);
    }
    return;
  }

  // =========================================================================
  // 4. حالة: المستخدم في وضع مصحح ومفسر الأكواد الذكي (Code Debugger & Explainer)
  // =========================================================================
  if (userState[chatId]?.inCodeDebugger && (!msg.text || !msg.text.startsWith("/"))) {
    trackFeatureUse(chatId, "code_debugger", msg.from);
    handleCodeDebuggerInput(chatId, bot, msg, userState);
    return;
  }

  // =========================================================================
  // 5. حالة: إنشاء جدول وخطة دراسة ومراجعة ذكية للامتحانات
  // =========================================================================
  if (userState[chatId]?.waitingExamPlanInput && msg.text) {
    userState[chatId].waitingExamPlanInput = false;
    trackFeatureUse(chatId, "exam_planner", msg.from);
    generateSmartStudyPlan(chatId, bot, msg.text.trim());
    return;
  }

  // =========================================================================
  // 6. حالة: حاسبة الدرجة المطلوبة في الامتحان النهائي
  // =========================================================================
  if (userState[chatId]?.waitingCalcGradeInput && msg.text) {
    userState[chatId].waitingCalcGradeInput = false;
    trackFeatureUse(chatId, "exam_planner", msg.from);

    const input = msg.text.trim();
    const parts = input.split(/\s+/);
    const score = parseFloat(parts[0]);
    let targetLetter = (parts[1] || "A").toUpperCase();

    if (isNaN(score) || score < 0 || score > 50) {
      bot.sendMessage(chatId, "⚠️ يرجى إدخال درجة أعمال فصل صحيحة بين 0 و 50 مع التقدير المطلوب.\n\n*مثال:* `35 A` أو `20 B` أو `15 PASS`", {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔄 إعادة المحاولة", callback_data: "exam_calc_grade_prompt" }],
            [{ text: "⏳ عداد الامتحانات", callback_data: "exam_countdown" }]
          ]
        }
      });
      return;
    }

    const calc = calculateRequiredGrade(score, targetLetter);
    let resultMsg = "";

    if (calc.neededInFinal > 50) {
      resultMsg = `❌ *للأسف، لا يمكنك الوصول لتقدير (${calc.targetLetter}) حسابياً.*\n• أعلى علامة نهائي ممكنة هي: 50\n• أقصى مجموع يمكنك الوصول إليه: *${score + 50}/100*`;
    } else if (calc.neededInFinal === 0) {
      resultMsg = `🎉 *مبروك! لقد حققت مجموع ${calc.requiredTotal} بالفعل قبل الامتحان النهائي!*`;
    } else {
      resultMsg = `🎯 *أنت تحتاج للحصول على:* \`${calc.neededInFinal.toFixed(1)} / 50\` في الامتحان النهائي لتحقيق تقدير *(${calc.targetLetter})* بمجموع *${calc.requiredTotal}%* فما فوق! 🚀`;
    }

    const response = `📊 *نتيجة حاسبة الدرجة المطلوبة في النهائي:*
━━━━━━━━━━━━━━━━━━━━
• علامتك المجمعة من 50: *${score}*
• التقدير المستهدف: *${calc.targetLetter}* (مجموع ${calc.requiredTotal}%)

${resultMsg}

💪 شد حيلك وربنا يوفقك ويسدد خطاك!`;

    bot.sendMessage(chatId, response, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🎯 حساب تقدير آخر", callback_data: "exam_calc_grade_prompt" }],
          [{ text: "📅 إنشاء خطة دراسية ذكية", callback_data: "exam_create_plan_prompt" }],
          [{ text: "⏳ عداد الامتحانات", callback_data: "exam_countdown" }]
        ]
      }
    });
    return;
  }

  // =========================================================================
  // 7. حالة: توليد كويز ذكي لموضوع أو مادة مخصصة
  // =========================================================================
  if (userState[chatId]?.waitingCustomQuizInput && msg.text) {
    userState[chatId].waitingCustomQuizInput = false;
    trackFeatureUse(chatId, "ai_quiz", msg.from);
    const customSubject = msg.text.trim();

    bot.sendMessage(chatId, `⏳ *جاري إعداد وتوليد أسئلة الكويز الذكي في (${customSubject})...*\nانتظر لحظات 🚀`, { parse_mode: "Markdown" }).then(async (waitMsg) => {
      const questions = await fetchQuizBatch(customSubject, 4, []);
      if (!userState[chatId]) userState[chatId] = {};
      userState[chatId].activeQuiz = {
        subject: customSubject,
        questions: questions,
        currentIndex: 0,
        score: 0
      };

      try { await bot.deleteMessage(chatId, waitMsg.message_id); } catch (e) {}
      sendCurrentQuestion(chatId, bot, userState);
    });
    return;
  }

  // =========================================================================
  // 8. حالة: البحث في بنك الامتحانات السابقة
  // =========================================================================
  if (userState[chatId]?.waitingPastPaperSearch && msg.text) {
    userState[chatId].waitingPastPaperSearch = false;
    trackFeatureUse(chatId, "past_papers", msg.from);
    searchPastPapers(chatId, bot, msg.text.trim());
    return;
  }

  // =========================================================================
  // 9. حالة: نشر إعلان جديد في سوق التبادل
  // =========================================================================
  if (userState[chatId]?.waitingMarketAdd && msg.text) {
    const category = userState[chatId].waitingMarketAdd;
    userState[chatId].waitingMarketAdd = false;
    trackFeatureUse(chatId, "marketplace", msg.from);

    const input = msg.text.trim();
    const parts = input.split(/[-–—|،,]/).map(p => p.trim()).filter(Boolean);

    const title = parts[0] || "إعلان طالب";
    const details = parts[1] || "تفاصيل الإعلان";
    const priceOrType = parts[2] || "مجاناً / للبدل";
    const contact = parts[3] || (msg.from?.username ? `@${msg.from.username}` : "عبر التليجرام");
    const studentName = ((msg.from?.first_name || "") + " " + (msg.from?.last_name || "")).trim() || "طالب";
    const userHandle = msg.from?.username ? `@${msg.from.username}` : "";

    const added = addListing(chatId, studentName, userHandle, category, title, details, priceOrType, contact);

    bot.sendMessage(chatId, `✅ *تم نشر إعلانك بنجاح في سوق التبادل!*
━━━━━━━━━━━━━━━━━━━━
📌 *العنوان:* ${added.title}
📝 *التفاصيل:* ${added.details}
💰 *السعر/النوع:* ${added.priceOrType}
📞 *للتواصل:* \`${added.contact}\``, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📦 تصفح الإعلانات", callback_data: `market_cat_${category}` }],
          [{ text: "📋 إعلاناتي", callback_data: "market_my_listings" }],
          [{ text: "🔄 سوق التبادل", callback_data: "open_marketplace" }]
        ]
      }
    });
    return;
  }

  // =========================================================================
  // 10. حالة: إرسال الطالب لملفات بجميع أنواعها أو رسائل للأدمن
  // =========================================================================
  const isMediaOrDoc = Boolean(
    msg.document ||
    msg.photo ||
    msg.voice ||
    msg.video ||
    msg.video_note ||
    msg.animation ||
    msg.audio
  );

  if (chatId !== ADMIN_ID && (userState[chatId]?.waitingAdminMessage || isMediaOrDoc)) {
    try {
      trackFeatureUse(chatId, isMediaOrDoc ? "upload" : "contact_admin", msg.from);
      const studentName = ((msg.from?.first_name || "") + " " + (msg.from?.last_name || "")).trim() || "طالب";
      const username = msg.from?.username ? `@${msg.from.username}` : "لا يوجد معرف";
      const header = `📨 رسالة/ملف جديد من طالب:
━━━━━━━━━━━━━━━━━━━━
👤 الاسم: ${studentName}
🔗 المعرف: ${username}
🆔 الآيدي: ${chatId}`;

      const adminKeyboard = {
        inline_keyboard: [
          [{ text: "✍️ الرد على الطالب", callback_data: `admin_reply_${chatId}` }]
        ]
      };

      let sentMsg = null;
      let fileDesc = "الرسالة";

      if (msg.text && !isMediaOrDoc) {
        sentMsg = await bot.sendMessage(
          ADMIN_ID,
          `${header}\n\n💬 نص الرسالة:\n${msg.text}`,
          { reply_markup: adminKeyboard }
        );
        fileDesc = "استفسارك";
      } else if (msg.document) {
        // يدعم جميع أنواع الملفات: Excel (.xlsx, .xls, .csv), PowerPoint (.pptx, .ppt), Word (.docx, .doc), PDF, ZIP, RAR, Code, etc.
        const fileName = msg.document.file_name || "ملف مرفق";
        const captionText = `${header}\n\n📁 ملف مرفق: ${fileName}` + (msg.caption ? `\n📝 الوصف: ${msg.caption}` : "");
        sentMsg = await bot.sendDocument(ADMIN_ID, msg.document.file_id, {
          caption: captionText,
          reply_markup: adminKeyboard
        });
        fileDesc = `الملف (${fileName})`;
      } else if (msg.photo) {
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        const captionText = `${header}\n\n📷 صورة مرفقة` + (msg.caption ? `\n📝 الوصف: ${msg.caption}` : "");
        sentMsg = await bot.sendPhoto(ADMIN_ID, fileId, {
          caption: captionText,
          reply_markup: adminKeyboard
        });
        fileDesc = "الصورة";
      } else if (msg.voice) {
        sentMsg = await bot.sendVoice(ADMIN_ID, msg.voice.file_id, {
          caption: `${header}\n\n🎙️ تسجيل صوتي`,
          reply_markup: adminKeyboard
        });
        fileDesc = "التسجيل الصوتي";
      } else if (msg.video) {
        const captionText = `${header}\n\n🎥 فيديو مرفق` + (msg.caption ? `\n📝 الوصف: ${msg.caption}` : "");
        sentMsg = await bot.sendVideo(ADMIN_ID, msg.video.file_id, {
          caption: captionText,
          reply_markup: adminKeyboard
        });
        fileDesc = "الفيديو";
      } else if (msg.video_note) {
        sentMsg = await bot.sendVideoNote(ADMIN_ID, msg.video_note.file_id, {
          reply_markup: adminKeyboard
        });
        fileDesc = "الرسالة المرئية";
      } else if (msg.animation) {
        sentMsg = await bot.sendAnimation(ADMIN_ID, msg.animation.file_id, {
          caption: `${header}\n\n🎞️ صورة متحركة GIF`,
          reply_markup: adminKeyboard
        });
        fileDesc = "الصورة المتحركة";
      } else if (msg.audio) {
        const audioName = msg.audio.title || msg.audio.file_name || "ملف صوتي";
        const captionText = `${header}\n\n🎵 ملف صوتي مرفق: ${audioName}` + (msg.caption ? `\n📝 الوصف: ${msg.caption}` : "");
        sentMsg = await bot.sendAudio(ADMIN_ID, msg.audio.file_id, {
          caption: captionText,
          reply_markup: adminKeyboard
        });
        fileDesc = `الملف الصوتي (${audioName})`;
      }

      if (sentMsg) {
        adminMessageMap.set(sentMsg.message_id, chatId);
      }

      if (userState[chatId]) {
        userState[chatId].waitingAdminMessage = false;
      }

      bot.sendMessage(
        chatId,
        `✅ تم استلام ${fileDesc} وإرساله إلى إدارة البوت بنجاح!\nسيتم مراجعته والرد عليك هنا في البوت قريباً 👍`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
            ]
          }
        }
      );
    } catch (err) {
      console.error("Error forwarding to admin:", err.message);
      bot.sendMessage(chatId, "❌ حدث خطأ أثناء إرسال الملف، يرجى المحاولة لاحقاً.");
    }
    return;
  }

  // 3. حالة: رسالة نصية عادية للبحث عن المواد
  if (msg.text) {
    trackFeatureUse(chatId, "search", msg.from);
    const text = msg.text.trim();
    trackCourseSearch(text);
    const results = searchAll(text);

    // في حال عدم وجود نتائج
    if (results.length === 0) {
      const keyboard = [[{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]];
      bot.sendMessage(
        chatId,
        `❌ لم يتم العثور على أي نتائج لـ "${text}".\n\n💡 جرب البحث بكود المساق (مثل: \`ECOM 2401\` أو \`MATHB1301\`) أو اسم المادة بالعربي أو الإنجليزي (مثل: \`برمجة\`، \`تفاضل\`، \`شبكات\`).`,
        {
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: keyboard }
        }
      );
      return;
    }

    // في حال وجود نتيجة واحدة مؤكدة ومباشرة، يتم عرض تفاصيل المادة فوراً
    if (results.length === 1 || results[0].score >= 150) {
      const top = results[0];
      if (top.type === "course") {
        userState[chatId] = {
          year: top.year,
          semester: top.semester,
          currentSubject: top.name
        };
        sendCourseDetails(chatId, top, false);
        return;
      } else if (top.type === "uni_req") {
        sendUniReqDetails(chatId, top.name, top.data);
        return;
      } else if (top.type === "lab") {
        sendLabDetails(chatId, top.name, top.data);
        return;
      }
    }

    // في حال وجود أكثر من نتيجة مطابقة، يتم تقديم قائمة أزرار لاختيار المادة المطلوبة
    const buttons = results.slice(0, 8).map((res) => {
      if (res.type === "course") {
        const label = res.arName
          ? `📚 ${res.arName} (${res.name})` + (res.code ? ` - ${res.code}` : "")
          : `📚 ${res.name}` + (res.code ? ` - ${res.code}` : "");
        return [{ text: label, callback_data: "find_c_" + res.id }];
      } else if (res.type === "uni_req") {
        return [{ text: "🏛️ " + res.name + (res.code ? ` (${res.code})` : ""), callback_data: "find_req_" + res.name }];
      } else {
        return [{ text: "🧪 " + res.name, callback_data: "find_lab_" + res.name }];
      }
    });

    buttons.push([{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]);

    bot.sendMessage(chatId, `🔍 تم العثور على ${results.length} نتيجة لـ "${text}".\nاختر المادة المطلوبة لعرض روابطها وملفاتها:`, {
      reply_markup: { inline_keyboard: buttons }
    });
  }
});

// التعامل مع الأخطاء
bot.on("polling_error", (err) => {
  console.log("Polling error:", err.message);
});
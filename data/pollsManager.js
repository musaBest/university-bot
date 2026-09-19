/**
 * Private Admin Polls & Surveys Manager
 * Interactive student polls where results & voters are exclusively visible to the Admin.
 */

const fs = require("fs");
const path = require("path");
const { safeEscape, safeSend, safeSendDocument } = require("./safeMessenger");

const pollsFilePath = path.join(__dirname, "polls.json");

let cachedPolls = null;

function loadPolls() {
  if (cachedPolls !== null) return cachedPolls;
  try {
    if (fs.existsSync(pollsFilePath)) {
      const data = fs.readFileSync(pollsFilePath, "utf8");
      const list = JSON.parse(data);
      if (Array.isArray(list)) {
        cachedPolls = list;
        return cachedPolls;
      }
    }
  } catch (e) {
    console.error("Error loading polls:", e);
  }
  cachedPolls = [];
  return cachedPolls;
}

function savePolls(polls) {
  try {
    const list = Array.isArray(polls) ? polls.slice(-50) : loadPolls().slice(-50);
    cachedPolls = list;
    fs.writeFileSync(pollsFilePath, JSON.stringify(list, null, 2), "utf8");
  } catch (e) {
    console.error("Error saving polls:", e);
  }
}

function createPoll(question, options) {
  const polls = loadPolls();
  const newPoll = {
    id: `poll_${Date.now()}`,
    question: (question || "استطلاع رأي لطلبة هندسة الحاسوب").trim(),
    options: options.map(o => o.trim()).filter(Boolean),
    createdAt: new Date().toISOString(),
    active: true,
    votes: {}, // { [chatId]: { name, username, optionIndex, timestamp } }
    sentMessages: [] // [{ chatId, messageId }]
  };
  polls.unshift(newPoll);
  savePolls(polls);
  return newPoll;
}

function getPoll(pollId) {
  const polls = loadPolls();
  return polls.find(p => p.id === pollId) || null;
}

function recordVote(pollId, userId, studentName, username, optionIndex) {
  const polls = loadPolls();
  const poll = polls.find(p => p.id === pollId);
  if (!poll) return { success: false, error: "الاستطلاع غير موجود أو تم حذفه." };
  if (!poll.active) return { success: false, error: "تم إغلاق هذا الاستطلاع من قبل الإدارة." };
  
  const optIdx = parseInt(optionIndex, 10);
  if (isNaN(optIdx) || optIdx < 0 || optIdx >= poll.options.length) {
    return { success: false, error: "خيار التصويت غير صالح." };
  }

  if (!poll.votes) poll.votes = {};

  poll.votes[String(userId)] = {
    name: studentName || "طالب",
    username: username || "",
    optionIndex: optIdx,
    timestamp: new Date().toISOString()
  };

  savePolls(polls);
  return { success: true, poll, chosenOption: poll.options[optIdx] };
}

function togglePollStatus(pollId) {
  const polls = loadPolls();
  const poll = polls.find(p => p.id === pollId);
  if (!poll) return null;
  poll.active = !poll.active;
  savePolls(polls);
  return poll;
}

async function unsendPollFromStudents(bot, pollId) {
  const polls = loadPolls();
  const poll = polls.find(p => p.id === pollId);
  if (!poll) return { success: false, error: "الاستطلاع غير موجود." };

  let deletedCount = 0;
  const messages = poll.sentMessages || [];

  for (const item of messages) {
    if (item && item.chatId && item.messageId) {
      try {
        await bot.deleteMessage(item.chatId, item.messageId);
        deletedCount++;
      } catch (err) {}
      await new Promise(r => setTimeout(r, 25));
    }
  }

  poll.sentMessages = [];
  poll.active = false;
  savePolls(polls);

  return { success: true, deletedCount, totalCount: messages.length };
}

/**
 * بناء لوحة تفاصيل الاستطلاع الحية للأدمن
 */
function renderAdminPollDetails(chatId, bot, pollId) {
  const poll = getPoll(pollId);
  if (!poll) {
    safeSend(bot, chatId, "❌ لم يتم العثور على هذا الاستطلاع أو تم حذفه.", {
      reply_markup: {
        inline_keyboard: [[{ text: "🔙 قائمة الاستطلاعات", callback_data: "admin_polls_menu" }]]
      }
    });
    return;
  }

  const votesArr = Object.entries(poll.votes || {}).map(([uid, v]) => ({ uid, ...v }));
  const totalVotes = votesArr.length;
  const statusEmoji = poll.active ? "🟢 جاري ومتاح للطلاب" : "🔴 مغلق";

  const safeQuestion = safeEscape(poll.question);
  let text = `🗳️ *تفاصيل ونتائج استطلاع الرأي (خاص بالأدمن فقط)*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📌 *السؤال:* ${safeQuestion}\n`;
  text += `📅 *تاريخ الإنشاء:* ${new Date(poll.createdAt).toLocaleString("ar-EG")}\n`;
  text += `📊 *الحالة:* ${statusEmoji}\n`;
  text += `👥 *إجمالي المصوتين:* *${totalVotes}* طالب\n\n`;

  text += `📈 *توزيع الأصوات والنسب:*\n`;
  poll.options.forEach((opt, idx) => {
    const optionVoters = votesArr.filter(v => v.optionIndex === idx);
    const count = optionVoters.length;
    const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    const barBlocks = Math.round(pct / 10);
    const bar = "🟩".repeat(barBlocks) + "⬜".repeat(10 - barBlocks);
    const safeOpt = safeEscape(opt);
    text += `*${idx + 1}. ${safeOpt}*\n`;
    text += `   ${bar} *${count}* صوت (${pct}%)\n\n`;
  });

  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `👤 *تفاصيل الطلاب المصوتين لكل خيار:*\n\n`;

  poll.options.forEach((opt, idx) => {
    const optionVoters = votesArr.filter(v => v.optionIndex === idx);
    const safeOpt = safeEscape(opt);
    text += `🔹 *${safeOpt}* (${optionVoters.length} طالب):\n`;
    if (optionVoters.length === 0) {
      text += `   _لا يوجد أصوات لهذا الخيار بعد_\n`;
    } else {
      // إظهار حتى 10 طلاب لكل خيار لتجنب تجاوز حد الرسالة
      const displayVoters = optionVoters.slice(0, 10);
      displayVoters.forEach((v, vIdx) => {
        const uName = safeEscape(v.name || "طالب");
        const uHandle = v.username ? ` (@${safeEscape(v.username.replace(/^@/, ""))})` : "";
        text += `   ${vIdx + 1}. *${uName}*${uHandle} - \`ID: ${v.uid}\`\n`;
      });
      if (optionVoters.length > 10) {
        text += `   _...و ${optionVoters.length - 10} طلاب آخرين_\n`;
      }
    }
    text += `\n`;
  });

  const keyboard = [
    [
      { text: "🔄 تحديث النتائج فورياً", callback_data: `admin_poll_view_${poll.id}` }
    ],
    [
      { text: poll.active ? "🔒 إغلاق الاستطلاع" : "🔓 إعادة فتح الاستطلاع", callback_data: `admin_poll_toggle_${poll.id}` },
      { text: "🗑️ حذف الاستطلاع من شات الطلاب", callback_data: `admin_poll_unsend_${poll.id}` }
    ],
    [
      { text: "📋 قائمة كافة الاستطلاعات", callback_data: "admin_polls_menu" },
      { text: "🎛️ لوحة التحكم الرئيسية", callback_data: "admin_dashboard" }
    ]
  ];

  safeSend(bot, chatId, text, {
    reply_markup: { inline_keyboard: keyboard }
  });
}

/**
 * عرض قائمة الاستطلاعات في لوحة الأدمن
 */
function renderAdminPollsList(chatId, bot) {
  const polls = loadPolls();

  let text = `🗳️ *لوحة إدارة استطلاعات الرأي والتقييمات*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `💡 *ميزة الخصوصية التامة:* النتائج وهوية المصوتين تظهر **لك كأدمن فقط**، بينما يرى الطالب رسالة تأكيد تصويته دون رؤية تصويت الآخرين أو النسب!\n\n`;

  if (polls.length === 0) {
    text += `_لا توجد استطلاعات رأي سابقة حتى الآن._\n\nاضغط أدناه لإنشاء وإرسال استطلاع جديد لجميع الطلاب:`;
  } else {
    text += `📋 *الاستطلاعات السابقة والحالية (${polls.length}):*\n`;
  }

  const keyboard = [
    [{ text: "➕ إنشاء استطلاع رأي جديد وإرساله للطلاب", callback_data: "admin_poll_prompt" }]
  ];

  polls.slice(0, 10).forEach((p) => {
    const votesCount = Object.keys(p.votes || {}).length;
    const statusIcon = p.active ? "🟢" : "🔴";
    const title = p.question.length > 28 ? p.question.slice(0, 28) + "..." : p.question;
    keyboard.push([
      { text: `${statusIcon} ${title} (${votesCount} صوت)`, callback_data: `admin_poll_view_${p.id}` }
    ]);
  });

  keyboard.push([
    { text: "🎛️ العودة للوحة التحكم", callback_data: "admin_dashboard" },
    { text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }
  ]);

  safeSend(bot, chatId, text, {
    reply_markup: { inline_keyboard: keyboard }
  });
}

module.exports = {
  createPoll,
  getPoll,
  loadPolls,
  savePolls,
  recordVote,
  togglePollStatus,
  unsendPollFromStudents,
  renderAdminPollDetails,
  renderAdminPollsList
};

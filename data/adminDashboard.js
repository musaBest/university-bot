/**
 * Admin Dashboard & User Access Control Module
 * For IUG Computer Engineering Telegram Bot
 */

const fs = require("fs");
const path = require("path");

const usersFilePath = path.join(__dirname, "users.json");
const backupFilePath = path.join(__dirname, "users_backup.json");
const archiveFilePath = path.join(__dirname, "users_archive.json");

// أسماء الميزات والأيقونات بالعربية
const FEATURE_LABELS = {
  ai_chat: { title: "🤖 الشات بوت الذكي (AI)", icon: "🤖" },
  show_years: { title: "📚 عرض كل السنوات والخطة", icon: "📚" },
  uni_reqs: { title: "🏛️ متطلبات الجامعة", icon: "🏛️" },
  lab_programs: { title: "🧪 برامج وتطبيقات المختبرات", icon: "🧪" },
  search: { title: "🔍 محرك البحث عن المواد", icon: "🔍" },
  contact_admin: { title: "💬 تواصل مع الأدمن", icon: "💬" },
  gpa_file: { title: "📊 حساب المعدل التراكمي", icon: "📊" },
  contacts: { title: "📞 جهات التواصل المهمة", icon: "📞" },
  prerequisites: { title: "📷 المواد المعتمدة على بعض", icon: "📷" },
  plan5: { title: "📄 خطة هندسة الحاسوب 5 سنوات", icon: "📄" },
  plan4: { title: "🖼 خطة هندسة الحاسوب 4 سنوات", icon: "🖼" },
  upload: { title: "📤 رفع ومشاركة الملفات", icon: "📤" }
};

/**
 * دالة لتأمين النصوص لمنع انهيار Markdown في التليجرام بسبب الرموز الخاصة
 */
function safeEscape(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/_/g, "\\_")
    .replace(/\*/g, "\\*")
    .replace(/`/g, "\\`")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

/**
 * دالة إرسال آمنة تحاول الإرسال بـ Markdown أولاً، وفي حال حدوث خطأ ترسل النص العادي تلقائياً
 */
async function safeSend(botInstance, chatId, text, options = {}) {
  try {
    return await botInstance.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      ...options
    });
  } catch (err) {
    console.warn("Markdown send failed, falling back to plain text:", err.message);
    const plainText = text.replace(/[*_`\[\]\\]/g, "");
    const { parse_mode, ...fallbackOptions } = options;
    try {
      return await botInstance.sendMessage(chatId, plainText, fallbackOptions);
    } catch (innerErr) {
      console.error("Plain text fallback failed too:", innerErr.message);
    }
  }
}

/**
 * دالة إرسال مستند آمنة مع نص توضيحي آمن
 */
async function safeSendDocument(botInstance, chatId, docPath, options = {}) {
  try {
    return await botInstance.sendDocument(chatId, docPath, {
      parse_mode: "Markdown",
      ...options
    });
  } catch (err) {
    console.warn("Document send with markdown caption failed, falling back to plain caption:", err.message);
    const plainCaption = options.caption ? options.caption.replace(/[*_`\[\]\\]/g, "") : "";
    const { parse_mode, ...fallbackOptions } = options;
    fallbackOptions.caption = plainCaption;
    try {
      return await botInstance.sendDocument(chatId, docPath, fallbackOptions);
    } catch (innerErr) {
      console.error("Document fallback failed:", innerErr.message);
    }
  }
}

/**
 * دمج بيانات المشتركين بذكاء دون فقدان أي بيانات سابقة
 */
function mergeUsersData(importedUsers) {
  if (!Array.isArray(importedUsers)) return { success: false, error: "الملف المرسل لا يحتوي قائمة بيانات صحيحة." };
  const currentUsers = loadUsers();
  const userMap = new Map();

  currentUsers.forEach((u) => {
    if (u && u.id) userMap.set(Number(u.id), { ...u });
  });

  let addedCount = 0;
  let updatedCount = 0;

  importedUsers.forEach((imp) => {
    if (!imp || !imp.id) return;
    const id = Number(imp.id);
    if (!userMap.has(id)) {
      userMap.set(id, { ...imp, id: id });
      addedCount++;
    } else {
      const existing = userMap.get(id);
      if (!existing.username && imp.username) existing.username = imp.username;
      if ((!existing.name || existing.name === "طالب") && imp.name && imp.name !== "طالب") existing.name = imp.name;
      if (imp.banned) existing.banned = true;
      if (imp.banReason) existing.banReason = imp.banReason;
      if (imp.joinedAt && (!existing.joinedAt || new Date(imp.joinedAt) < new Date(existing.joinedAt))) {
        existing.joinedAt = imp.joinedAt;
      }
      if (imp.lastActive && (!existing.lastActive || new Date(imp.lastActive) > new Date(existing.lastActive))) {
        existing.lastActive = imp.lastActive;
      }
      if (imp.featuresUsed) {
        if (!existing.featuresUsed) existing.featuresUsed = {};
        for (const feat in imp.featuresUsed) {
          existing.featuresUsed[feat] = Math.max(existing.featuresUsed[feat] || 0, imp.featuresUsed[feat] || 0);
        }
      }
      updatedCount++;
    }
  });

  const mergedList = Array.from(userMap.values());
  saveUsersList(mergedList);
  return { success: true, addedCount, updatedCount, total: mergedList.length };
}

/**
 * قراءة ودمج بيانات المشتركين من ملفات التخزين والنسخ الاحتياطية المتعددة
 */
function loadUsers() {
  const userMap = new Map();

  function tryReadFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf8");
        const list = JSON.parse(raw || "[]");
        if (Array.isArray(list)) {
          list.forEach((u) => {
            if (!u || !u.id) return;
            const id = Number(u.id);
            if (!userMap.has(id)) {
              userMap.set(id, { ...u, id: id });
            } else {
              const curr = userMap.get(id);
              if (!curr.username && u.username) curr.username = u.username;
              if ((!curr.name || curr.name === "طالب") && u.name && u.name !== "طالب") curr.name = u.name;
              if (u.banned) curr.banned = true;
              if (u.banReason) curr.banReason = u.banReason;
              if (u.joinedAt && (!curr.joinedAt || new Date(u.joinedAt) < new Date(curr.joinedAt))) {
                curr.joinedAt = u.joinedAt;
              }
              if (u.lastActive && (!curr.lastActive || new Date(u.lastActive) > new Date(curr.lastActive))) {
                curr.lastActive = u.lastActive;
              }
              if (u.featuresUsed) {
                if (!curr.featuresUsed) curr.featuresUsed = {};
                for (const f in u.featuresUsed) {
                  curr.featuresUsed[f] = Math.max(curr.featuresUsed[f] || 0, u.featuresUsed[f] || 0);
                }
              }
            }
          });
        }
      }
    } catch (e) {
      console.error(`Error reading ${filePath}:`, e.message);
    }
  }

  tryReadFile(usersFilePath);
  tryReadFile(backupFilePath);
  tryReadFile(archiveFilePath);

  const merged = Array.from(userMap.values());
  return merged;
}

/**
 * حفظ قائمة المشتركين في ملفات متعددة لضمان عدم ضياع أي بيانات نهائياً
 */
function saveUsersList(users) {
  try {
    const dataDir = path.dirname(usersFilePath);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const serialized = JSON.stringify(users, null, 2);
    fs.writeFileSync(usersFilePath, serialized, "utf8");
    fs.writeFileSync(backupFilePath, serialized, "utf8");
    fs.writeFileSync(archiveFilePath, serialized, "utf8");
  } catch (err) {
    console.error("Error saving users file:", err);
  }
}

function isUserBanned(chatId) {
  if (!chatId) return false;
  const users = loadUsers();
  const u = users.find(x => Number(x.id) === Number(chatId));
  return u && u.banned === true;
}

function trackFeatureUse(chatId, featureKey, msgUser = null) {
  try {
    if (!chatId) return;
    const id = Number(chatId);
    const users = loadUsers();
    let userIndex = users.findIndex(u => Number(u.id) === id);
    const now = new Date().toISOString();

    if (userIndex === -1) {
      const firstName = msgUser?.first_name || "";
      const lastName = msgUser?.last_name || "";
      const fullName = (firstName + " " + lastName).trim() || "طالب";
      const username = msgUser?.username ? `@${msgUser.username}` : "";
      
      const newUser = {
        id: id,
        name: fullName,
        username: username,
        joinedAt: now,
        lastActive: now,
        active: true,
        banned: false,
        featuresUsed: { [featureKey]: 1 }
      };
      users.push(newUser);
    } else {
      const u = users[userIndex];
      u.lastActive = now;
      u.active = true;
      if (!u.featuresUsed) u.featuresUsed = {};
      u.featuresUsed[featureKey] = (u.featuresUsed[featureKey] || 0) + 1;
      
      if (msgUser) {
        const firstName = msgUser.first_name || "";
        const lastName = msgUser.last_name || "";
        const fullName = (firstName + " " + lastName).trim();
        if (fullName) u.name = fullName;
        if (msgUser.username) u.username = `@${msgUser.username}`;
      }
    }

    saveUsersList(users);
  } catch (err) {
    console.error("Error tracking feature use:", err);
  }
}

function banUser(targetIdOrUsername, reason = "مخالفة تعليمات البوت") {
  const users = loadUsers();
  const query = targetIdOrUsername.toString().trim().replace(/^@/, "").toLowerCase();
  
  let target = users.find(u => Number(u.id) === Number(query) || (u.username && u.username.replace(/^@/, "").toLowerCase() === query));

  if (!target && !isNaN(Number(query))) {
    // إنشاء سجل للمستخدم المحظور حتى لو لم يكن مسجلاً مسبقاً
    target = {
      id: Number(query),
      name: "مستخدم محظور",
      username: "",
      joinedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      active: false,
      banned: true,
      banReason: reason,
      bannedAt: new Date().toISOString()
    };
    users.push(target);
    saveUsersList(users);
    return { success: true, user: target, created: true };
  }

  if (target) {
    target.banned = true;
    target.active = false;
    target.banReason = reason;
    target.bannedAt = new Date().toISOString();
    saveUsersList(users);
    return { success: true, user: target };
  }

  return { success: false, error: "المستخدم غير موجود." };
}

function unbanUser(targetIdOrUsername) {
  const users = loadUsers();
  const query = targetIdOrUsername.toString().trim().replace(/^@/, "").toLowerCase();
  
  const target = users.find(u => Number(u.id) === Number(query) || (u.username && u.username.replace(/^@/, "").toLowerCase() === query));

  if (target) {
    target.banned = false;
    target.active = true;
    delete target.banReason;
    delete target.bannedAt;
    saveUsersList(users);
    return { success: true, user: target };
  }

  return { success: false, error: "المستخدم غير موجود." };
}

function addUserManually(rawId, name = "طالب", username = "") {
  const id = Number(rawId);
  if (!id || isNaN(id)) return { success: false, error: "المعرف غير صحيح." };

  const users = loadUsers();
  const existing = users.find(u => Number(u.id) === id);

  if (existing) {
    existing.active = true;
    existing.banned = false;
    if (name && name !== "طالب") existing.name = name;
    if (username) existing.username = username.startsWith("@") ? username : `@${username}`;
    saveUsersList(users);
    return { success: true, user: existing, updated: true };
  }

  const now = new Date().toISOString();
  const newUser = {
    id: id,
    name: name,
    username: username ? (username.startsWith("@") ? username : `@${username}`) : "",
    joinedAt: now,
    lastActive: now,
    active: true,
    banned: false,
    featuresUsed: {}
  };

  users.push(newUser);
  saveUsersList(users);
  return { success: true, user: newUser, created: true };
}

function getUserProfile(query) {
  const users = loadUsers();
  const q = query.toString().trim().replace(/^@/, "").toLowerCase();
  return users.find(u => Number(u.id) === Number(q) || (u.username && u.username.replace(/^@/, "").toLowerCase() === q));
}

function getFeatureStats() {
  const users = loadUsers();
  const stats = {};

  for (const key in FEATURE_LABELS) {
    stats[key] = {
      title: FEATURE_LABELS[key].title,
      icon: FEATURE_LABELS[key].icon,
      uniqueUsersCount: 0,
      totalUsageCount: 0,
      users: []
    };
  }

  users.forEach(u => {
    if (u.featuresUsed) {
      for (const feat in u.featuresUsed) {
        if (!stats[feat]) {
          stats[feat] = {
            title: feat,
            icon: "📌",
            uniqueUsersCount: 0,
            totalUsageCount: 0,
            users: []
          };
        }
        const count = u.featuresUsed[feat] || 0;
        if (count > 0) {
          stats[feat].uniqueUsersCount++;
          stats[feat].totalUsageCount += count;
          stats[feat].users.push({
            id: u.id,
            name: u.name,
            username: u.username,
            count: count,
            lastActive: u.lastActive
          });
        }
      }
    }
  });

  return stats;
}

function renderMainDashboard(chatId, botInstance) {
  const users = loadUsers();
  const activeUsers = users.filter((u) => u.active !== false && !u.banned);
  const bannedUsers = users.filter((u) => u.banned === true);
  const inactiveUsers = users.filter((u) => u.active === false && !u.banned);

  let text = `🎛️ *لوحة تحكم إدارة البوت (Admin Dashboard)*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `📊 *نظرة عامة على المشتركين:*\n`;
  text += `👥 إجمالي الطلاب: *${users.length}*\n`;
  text += `✅ الطلاب النشطين: *${activeUsers.length}*\n`;
  text += `🚫 الطلاب المحظورين: *${bannedUsers.length}*\n`;
  text += `❌ غير النشطين (حظر البوت): *${inactiveUsers.length}*\n\n`;
  text += `💡 *اختر من القائمة للتحكم الكامل بالإحصائيات والمشتركين والنسخ الاحتياطي:*`;

  const keyboard = [
    [
      { text: "📊 إحصائيات الأيقونات والميزات", callback_data: "admin_feature_stats" }
    ],
    [
      { text: "🔍 فحص واستعلام عن طالب", callback_data: "admin_search_user_prompt" },
      { text: "➕ إضافة طالب يدوياً", callback_data: "admin_add_user_prompt" }
    ],
    [
      { text: "🚫 حظر طالب / إقصاء", callback_data: "admin_ban_prompt" },
      { text: `🔓 قائمة المحظورين (${bannedUsers.length})`, callback_data: "admin_banned_list" }
    ],
    [
      { text: "📄 تصدير قائمة المشتركين كاملة", callback_data: "export_users_list" },
      { text: "📢 إرسال إشعار جماعي", callback_data: "start_broadcast" }
    ],
    [
      { text: "💾 تنزيل نسخة احتياطية (JSON)", callback_data: "admin_download_backup" },
      { text: "📥 استعادة / دمج بيانات", callback_data: "admin_restore_prompt" }
    ],
    [
      { text: "🔄 تحديث اللوحة", callback_data: "admin_dashboard" },
      { text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }
    ]
  ];

  safeSend(botInstance, chatId, text, {
    reply_markup: { inline_keyboard: keyboard }
  });
}

function renderFeatureStats(chatId, botInstance) {
  const stats = getFeatureStats();
  const users = loadUsers();

  let text = `📊 *إحصائيات استخدام الأيقونات والميزات*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `👥 إجمالي الطلاب المسجلين بالبوت: *${users.length}*\n\n`;

  const buttons = [];

  for (const key in FEATURE_LABELS) {
    const s = stats[key] || { uniqueUsersCount: 0, totalUsageCount: 0 };
    const label = FEATURE_LABELS[key];
    const safeTitle = safeEscape(label.title);
    text += `${label.icon} *${safeTitle}:*\n`;
    text += `   • عدد الطلاب المستخدمين: *${s.uniqueUsersCount} طالب*\n`;
    text += `   • إجمالي عدد النقرات/الاستخدام: *${s.totalUsageCount} مرة*\n\n`;

    buttons.push([
      {
        text: `${label.icon} من استخدم ${label.title.split("(")[0].trim()}؟ (${s.uniqueUsersCount})`,
        callback_data: `admin_who_${key}`
      }
    ]);
  }

  buttons.push([
    { text: "⬅️ العودة للوحة التحكم", callback_data: "admin_dashboard" },
    { text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }
  ]);

  safeSend(botInstance, chatId, text, {
    reply_markup: { inline_keyboard: buttons }
  });
}

function renderFeatureUsers(chatId, botInstance, featureKey) {
  const stats = getFeatureStats();
  const feat = stats[featureKey];
  const label = FEATURE_LABELS[featureKey] || { title: featureKey, icon: "📌" };

  const buttons = [
    [{ text: "🔍 فحص طالب من القائمة", callback_data: "admin_search_user_prompt" }],
    [{ text: "⬅️ رجوع لإحصائيات الميزات", callback_data: "admin_feature_stats" }],
    [{ text: "🎛️ لوحة التحكم", callback_data: "admin_dashboard" }]
  ];

  if (!feat || feat.users.length === 0) {
    safeSend(
      botInstance,
      chatId,
      `ℹ️ لم يقم أي طالب باستخدام ميزة *${safeEscape(label.title)}* حتى الآن.`,
      { reply_markup: { inline_keyboard: buttons } }
    );
    return;
  }

  let text = `${label.icon} *قائمة الطلاب الذين استخدموا (${safeEscape(label.title)})*:\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `👥 عدد الطلاب: *${feat.uniqueUsersCount}* | إجمالي الاستخدام: *${feat.totalUsageCount} مرة*\n\n`;

  // Sort by highest usage
  const sortedUsers = [...feat.users].sort((a, b) => b.count - a.count);

  sortedUsers.forEach((u, i) => {
    const uName = safeEscape(u.name || "طالب");
    const uTag = u.username ? ` (${safeEscape(u.username)})` : " (بدون معرف)";
    text += `${i + 1}. *${uName}*${uTag}\n   🆔 \`${u.id}\` | عدد المرات: *${u.count}*\n`;
  });

  if (text.length < 3900) {
    safeSend(botInstance, chatId, text, {
      reply_markup: { inline_keyboard: buttons }
    });
  } else {
    // إرسال كملف لو كانت القائمة طويلة جداً
    const tempPath = path.join(__dirname, `feature_${featureKey}_users.txt`);
    let fileContent = `مستخدمي ميزة: ${label.title}\nإجمالي الطلاب: ${feat.uniqueUsersCount} | إجمالي الاستخدام: ${feat.totalUsageCount}\n====================================\n\n`;
    sortedUsers.forEach((u, i) => {
      fileContent += `${i + 1}. Name: ${u.name} | Username: ${u.username || "N/A"} | ID: ${u.id} | Usage: ${u.count}\n`;
    });
    fs.writeFileSync(tempPath, fileContent, "utf8");
    safeSendDocument(botInstance, chatId, tempPath, {
      caption: `📄 قائمة الطلاب الذين استخدموا ${label.title}`,
      reply_markup: { inline_keyboard: buttons }
    });
  }
}

function renderBannedList(chatId, botInstance) {
  const users = loadUsers();
  const banned = users.filter((u) => u.banned === true);

  if (banned.length === 0) {
    safeSend(botInstance, chatId, "✅ لا يوجد أي طالب محظور حالياً. جميع الطلاب مصرح لهم بالاستخدام.", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🚫 حظر طالب جديد", callback_data: "admin_ban_prompt" }],
          [{ text: "⬅️ العودة للوحة التحكم", callback_data: "admin_dashboard" }]
        ]
      }
    });
    return;
  }

  let text = `🚫 *قائمة الطلاب المحظورين (${banned.length} طالب)*:\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  const buttons = [];

  banned.forEach((u, i) => {
    const uName = safeEscape(u.name || "طالب");
    const uTag = u.username ? ` (${safeEscape(u.username)})` : "";
    text += `${i + 1}. *${uName}*${uTag} - \`ID: ${u.id}\`\n`;
    if (u.banReason) text += `   ⚠️ السبب: ${safeEscape(u.banReason)}\n`;

    buttons.push([
      {
        text: `🔓 إلغاء حظر: ${u.name || "طالب"} (${u.id})`,
        callback_data: `admin_unban_${u.id}`
      }
    ]);
  });

  buttons.push([
    { text: "🚫 حظر طالب جديد", callback_data: "admin_ban_prompt" },
    { text: "⬅️ العودة للوحة التحكم", callback_data: "admin_dashboard" }
  ]);

  safeSend(botInstance, chatId, text, {
    reply_markup: { inline_keyboard: buttons }
  });
}

function renderUserProfile(chatId, botInstance, query) {
  const user = getUserProfile(query);

  if (!user) {
    safeSend(botInstance, chatId, `❌ لم يتم العثور على طالب بالمعرف أو الـ ID: \`${safeEscape(query)}\``, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔍 بحث مجدداً", callback_data: "admin_search_user_prompt" }],
          [{ text: "⬅️ لوحة التحكم", callback_data: "admin_dashboard" }]
        ]
      }
    });
    return;
  }

  const status = user.banned ? "🚫 محظور من البوت" : user.active !== false ? "✅ نشط ومصرح له" : "❌ غير نشط (حظر البوت)";
  let text = `👤 *الملف التفصيلي للطالب:*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `• *الاسم:* ${safeEscape(user.name || "طالب")}\n`;
  text += `• *المعرف:* ${safeEscape(user.username || "بدون يوزر")}\n`;
  text += `• *الـ ID:* \`${user.id}\`\n`;
  text += `• *الحالة:* ${status}\n`;
  if (user.banReason) text += `• *سبب الحظر:* ${safeEscape(user.banReason)}\n`;
  text += `• *تاريخ الانضمام:* ${user.joinedAt ? new Date(user.joinedAt).toLocaleString("ar-EG") : "غير مسجل"}\n`;
  text += `• *آخر نشاط:* ${user.lastActive ? new Date(user.lastActive).toLocaleString("ar-EG") : "غير مسجل"}\n\n`;

  text += `📊 *سجل استخدام الأيقونات والميزات:*\n`;
  if (user.featuresUsed && Object.keys(user.featuresUsed).length > 0) {
    for (const feat in user.featuresUsed) {
      const label = FEATURE_LABELS[feat]?.title || feat;
      text += `   • ${safeEscape(label)}: *${user.featuresUsed[feat]} مرة*\n`;
    }
  } else {
    text += `   • لم يقم بالنقر على أي ميزة بعد.\n`;
  }

  const buttons = [];
  if (user.banned) {
    buttons.push([{ text: "🔓 إلغاء حظر هذا الطالب", callback_data: `admin_unban_${user.id}` }]);
  } else {
    buttons.push([{ text: "🚫 حظر وإقصاء هذا الطالب", callback_data: `admin_ban_user_${user.id}` }]);
  }

  buttons.push([
    { text: "🔍 فحص طالب آخر", callback_data: "admin_search_user_prompt" },
    { text: "⬅️ لوحة التحكم", callback_data: "admin_dashboard" }
  ]);

  safeSend(botInstance, chatId, text, {
    reply_markup: { inline_keyboard: buttons }
  });
}

module.exports = {
  loadUsers,
  saveUsersList,
  mergeUsersData,
  isUserBanned,
  trackFeatureUse,
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
};


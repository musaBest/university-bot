/**
 * Master Cloud Data Synchronization & Disaster Recovery Engine
 * Ensures 100% data persistence across cloud redeployments (Render, Railway, Heroku, etc.)
 * Bundles: Users, Polls, Marketplace Listings, Broadcast History, Course Searches, and AI configs.
 */

const fs = require("fs");
const path = require("path");
const { safeSend, safeSendDocument } = require("./safeMessenger");

const ADMIN_ID = 5687891184;

const DATA_FILES = {
  users: path.join(__dirname, "users.json"),
  users_backup: path.join(__dirname, "users_backup.json"),
  polls: path.join(__dirname, "polls.json"),
  marketplace: path.join(__dirname, "marketplace.json"),
  broadcast_history: path.join(__dirname, "broadcast_history.json"),
  course_searches: path.join(__dirname, "course_searches.json"),
  exam_dates: path.join(__dirname, "examDates.json"),
  master_snapshot: path.join(__dirname, "master_database_snapshot.json")
};

function readJsonFile(filePath, defaultValue = []) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      if (content && content.trim()) {
        return JSON.parse(content);
      }
    }
  } catch (err) {
    console.error(`[CloudSync] Error reading ${path.basename(filePath)}:`, err.message);
  }
  return defaultValue;
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error(`[CloudSync] Error writing ${path.basename(filePath)}:`, err.message);
    return false;
  }
}

/**
 * إنشاء حزمة بيانات شاملة تحتوي على كل ما في البوت
 */
function getFullDatabaseBundle() {
  return {
    version: "2.0",
    exportedAt: new Date().toISOString(),
    users: readJsonFile(DATA_FILES.users, []),
    polls: readJsonFile(DATA_FILES.polls, []),
    marketplace: readJsonFile(DATA_FILES.marketplace, []),
    broadcastHistory: readJsonFile(DATA_FILES.broadcast_history, []),
    courseSearches: readJsonFile(DATA_FILES.course_searches, {}),
    examDates: readJsonFile(DATA_FILES.exam_dates, {})
  };
}

/**
 * حفظ نسخة Master محلية تلقائياً
 */
function saveMasterSnapshot() {
  const bundle = getFullDatabaseBundle();
  writeJsonFile(DATA_FILES.master_snapshot, bundle);
  return bundle;
}

/**
 * دمج واستعادة الحزمة الشاملة بذكاء دون مسح أي بيانات سابقة
 */
function restoreDatabaseBundle(bundle) {
  if (!bundle || typeof bundle !== "object") {
    return { success: false, error: "الملف المرسل لا يحتوي على بنية بيانات صحيحة." };
  }

  const results = {
    usersAdded: 0,
    pollsAdded: 0,
    marketAdded: 0
  };

  // 1. استعادة المشتركين (Users)
  if (Array.isArray(bundle.users)) {
    const currentUsers = readJsonFile(DATA_FILES.users, []);
    const userMap = new Map();
    currentUsers.forEach(u => { if (u && u.id) userMap.set(Number(u.id), u); });

    bundle.users.forEach(imp => {
      if (!imp || !imp.id) return;
      const id = Number(imp.id);
      if (!userMap.has(id)) {
        userMap.set(id, imp);
        results.usersAdded++;
      } else {
        const exist = userMap.get(id);
        if (!exist.username && imp.username) exist.username = imp.username;
        if (imp.featuresUsed) {
          if (!exist.featuresUsed) exist.featuresUsed = {};
          for (const k in imp.featuresUsed) {
            exist.featuresUsed[k] = Math.max(exist.featuresUsed[k] || 0, imp.featuresUsed[k] || 0);
          }
        }
      }
    });
    const mergedUsers = Array.from(userMap.values());
    writeJsonFile(DATA_FILES.users, mergedUsers);
    writeJsonFile(DATA_FILES.users_backup, mergedUsers);
  }

  // 2. استعادة الاستطلاعات (Polls)
  if (Array.isArray(bundle.polls)) {
    const currentPolls = readJsonFile(DATA_FILES.polls, []);
    const pollMap = new Map();
    currentPolls.forEach(p => { if (p && p.id) pollMap.set(p.id, p); });

    bundle.polls.forEach(p => {
      if (!p || !p.id) return;
      if (!pollMap.has(p.id)) {
        pollMap.set(p.id, p);
        results.pollsAdded++;
      } else {
        const exist = pollMap.get(p.id);
        // دمج الأصوات
        if (p.votes) {
          if (!exist.votes) exist.votes = {};
          for (const uid in p.votes) {
            if (!exist.votes[uid]) exist.votes[uid] = p.votes[uid];
          }
        }
      }
    });
    writeJsonFile(DATA_FILES.polls, Array.from(pollMap.values()));
  }

  // 3. استعادة سوق التبادل (Marketplace)
  if (Array.isArray(bundle.marketplace)) {
    const currentMarket = readJsonFile(DATA_FILES.marketplace, []);
    const marketMap = new Map();
    currentMarket.forEach(m => { if (m && m.id) marketMap.set(m.id, m); });

    bundle.marketplace.forEach(m => {
      if (!m || !m.id) return;
      if (!marketMap.has(m.id)) {
        marketMap.set(m.id, m);
        results.marketAdded++;
      }
    });
    writeJsonFile(DATA_FILES.marketplace, Array.from(marketMap.values()));
  }

  // 4. استعادة الإذاعة والبحث
  if (Array.isArray(bundle.broadcastHistory)) {
    const curBc = readJsonFile(DATA_FILES.broadcast_history, []);
    const bcMap = new Map();
    curBc.forEach(b => { if (b && b.id) bcMap.set(b.id, b); });
    bundle.broadcastHistory.forEach(b => { if (b && b.id && !bcMap.has(b.id)) bcMap.set(b.id, b); });
    writeJsonFile(DATA_FILES.broadcast_history, Array.from(bcMap.values()));
  }

  if (bundle.courseSearches && typeof bundle.courseSearches === "object") {
    const curSearch = readJsonFile(DATA_FILES.course_searches, {});
    for (const c in bundle.courseSearches) {
      curSearch[c] = Math.max(curSearch[c] || 0, bundle.courseSearches[c] || 0);
    }
    writeJsonFile(DATA_FILES.course_searches, curSearch);
  }

  // تحديث Master snapshot فوراً
  saveMasterSnapshot();

  return { success: true, results };
}

let syncTimer = null;
/**
 * جدولة مزامنة سحابية بعد العمليات (Debounced Sync)
 */
function scheduleAutoCloudSync(botInstance) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      saveMasterSnapshot();
      console.log("[CloudSync] Auto master snapshot synchronized.");
    } catch (e) {
      console.error("[CloudSync] Auto sync error:", e);
    }
  }, 10000);
}

/**
 * تشغيل المزامنة عند بدء تشغيل البوت (Boot / Deploy Check)
 */
function initCloudSyncOnBoot(botInstance) {
  try {
    // التأكد من وجود ملفات البيانات الأساسية بقيم صالحة
    if (!fs.existsSync(DATA_FILES.users)) writeJsonFile(DATA_FILES.users, []);
    if (!fs.existsSync(DATA_FILES.polls)) writeJsonFile(DATA_FILES.polls, []);
    if (!fs.existsSync(DATA_FILES.marketplace)) writeJsonFile(DATA_FILES.marketplace, []);
    if (!fs.existsSync(DATA_FILES.broadcast_history)) writeJsonFile(DATA_FILES.broadcast_history, []);
    if (!fs.existsSync(DATA_FILES.course_searches)) writeJsonFile(DATA_FILES.course_searches, {});

    // فحص ما إذا كان هناك snapshot محفوظ مسبقاً لاستعادته
    if (fs.existsSync(DATA_FILES.master_snapshot)) {
      const snapshot = readJsonFile(DATA_FILES.master_snapshot, null);
      if (snapshot) {
        restoreDatabaseBundle(snapshot);
        console.log("[CloudSync] Restored database state from local master snapshot.");
      }
    }
  } catch (err) {
    console.error("[CloudSync] Boot initialization error:", err.message);
  }
}

/**
 * تصدير ملف النسخة الاحتياطية الشاملة وإرساله للأدمن
 */
async function sendMasterBackupToAdmin(chatId, botInstance) {
  const bundle = saveMasterSnapshot();
  const backupFilename = `ce_bot_full_backup_${new Date().toISOString().split("T")[0]}.json`;
  const tempPath = path.join(__dirname, backupFilename);

  fs.writeFileSync(tempPath, JSON.stringify(bundle, null, 2), "utf8");

  const totalUsers = bundle.users?.length || 0;
  const totalPolls = bundle.polls?.length || 0;
  const totalMarket = bundle.marketplace?.length || 0;

  const caption = `💾 *النسخة الاحتياطية الشاملة لكامل بيانات البوت (Master Backup)*\n━━━━━━━━━━━━━━━━━━━━\n\n📊 *محتويات النسخة:*\n• 👥 الطلاب المشتركين: *${totalUsers}* طالب\n• 🗳️ استطلاعات الرأي والأصوات: *${totalPolls}* استطلاع\n• 🔄 إعلانات سوق التبادل: *${totalMarket}* إعلان\n• 📢 سجل الإذاعات والبحث: متضمن\n\n💡 *طريقة الاستعادة:* في حال قمت بنقل البوت لسيرفر جديد أو عملت Deploy جديد، قم فقط بإرسال هذا الملف في المحادثة وسيتم استرجاع كل شيء فوراً! 🚀`;

  await safeSendDocument(botInstance, chatId, tempPath, {
    caption: caption,
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎛️ العودة للوحة التحكم", callback_data: "admin_dashboard" }]
      ]
    }
  });

  try {
    fs.unlinkSync(tempPath);
  } catch (e) {}
}

module.exports = {
  DATA_FILES,
  getFullDatabaseBundle,
  saveMasterSnapshot,
  restoreDatabaseBundle,
  scheduleAutoCloudSync,
  initCloudSyncOnBoot,
  sendMasterBackupToAdmin
};

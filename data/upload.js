// data/upload.js
const fs = require("fs");
const path = require("path");

module.exports = (bot, userState, ADMIN_ID) => {

  // استقبال الملفات من الطلاب
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const state = userState[chatId];

    if (!state?.waitingUpload) return;

    let fileInfo = null;
    let fileType = "";

    if (msg.document) {
      fileInfo = msg.document;
      fileType = "document";
    } else if (msg.photo) {
      // نأخذ آخر صورة (أفضل جودة)
      fileInfo = msg.photo[msg.photo.length - 1];
      fileType = "photo";
    } else if (msg.text) {
      // رابط أو نص
      fileInfo = { file_name: msg.text };
      fileType = "text";
    } else {
      bot.sendMessage(chatId, "⚠️ لم يتم التعرف على الملف. حاول مرة أخرى.");
      return;
    }

    try {
      const subject = state.currentSubject;
      if (!subject) {
        bot.sendMessage(chatId, "اختر المادة أولاً قبل إرسال الملخص.");
        return;
      }

      // إنشاء مجلد pending لو غير موجود
      const pendingDir = path.join(__dirname, "..", "data", "pending");
      if (!fs.existsSync(pendingDir)) fs.mkdirSync(pendingDir, { recursive: true });

      const uniqueName = Date.now() + "_" + (fileInfo.file_name || "file");
      const filePath = path.join(pendingDir, uniqueName);

      let fileLink = "";

      if (fileType === "document" || fileType === "photo") {
        fileLink = await bot.getFileLink(fileInfo.file_id);
        fs.writeFileSync(filePath + ".txt", fileLink);
      } else if (fileType === "text") {
        fs.writeFileSync(filePath + ".txt", fileInfo.file_name);
        fileLink = fileInfo.file_name;
      }

      const studentName = (msg.from.first_name || "") + " " + (msg.from.last_name || "");

      // رسالة للطالب
      bot.sendMessage(chatId, "📤 تم استلام الملف بنجاح! سيتم مراجعته قبل نشره.");

      // رسالة للأدمين
      bot.sendMessage(ADMIN_ID, `📚 ملخص جديد
👤 الطالب: ${studentName}
📖 المادة: ${subject}
📄 اسم الملف: ${fileInfo.file_name || "ملف بدون اسم"}`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "✅ موافقة", callback_data: "approve_" + uniqueName + "_" + subject }],
              [{ text: "❌ رفض", callback_data: "reject_" + uniqueName }]
            ]
          }
        });

      state.waitingUpload = false;

    } catch (error) {
      console.log(error);
      bot.sendMessage(chatId, "❌ حدث خطأ أثناء رفع الملف. حاول مرة أخرى.");
      state.waitingUpload = false;
    }
  });

  // التعامل مع الموافقة والرفض
  bot.on("callback_query", (query) => {
    const data = query.data;
    const chatId = query.message.chat.id;

    // موافقة
    if (data.startsWith("approve_")) {
      const parts = data.replace("approve_", "").split("_");
      const uniqueName = parts[0];
      const subject = parts.slice(1).join("_");

      const pendingPath = path.join(__dirname, "..", "data", "pending", uniqueName + ".txt");
      const approvedDir = path.join(__dirname, "..", "data", "approved");
      if (!fs.existsSync(approvedDir)) fs.mkdirSync(approvedDir, { recursive: true });

      if (!fs.existsSync(pendingPath)) {
        bot.sendMessage(chatId, "❌ الملف غير موجود.");
        return;
      }

      const fileLink = fs.readFileSync(pendingPath, "utf-8");
      const approvedPath = path.join(approvedDir, uniqueName + ".txt");
      fs.writeFileSync(approvedPath, fileLink);
      fs.unlinkSync(pendingPath);

      // تحديث JSON لملخصات الطلاب
      const linksPath = path.join(__dirname, "..", "data", "approved_links.json");
      let approvedLinks = {};
      if (fs.existsSync(linksPath)) {
        approvedLinks = JSON.parse(fs.readFileSync(linksPath, "utf-8"));
      }
      if (!approvedLinks[subject]) approvedLinks[subject] = [];
      approvedLinks[subject].push({
        file_name: uniqueName,
        url: fileLink,
        student: "طالب"
      });
      fs.writeFileSync(linksPath, JSON.stringify(approvedLinks, null, 2));

      bot.sendMessage(chatId, "✅ تم الموافقة على الملف ونشره للطلاب.");

      return;
    }

    // رفض
    if (data.startsWith("reject_")) {
      const uniqueName = data.replace("reject_", "");
      const pendingPath = path.join(__dirname, "..", "data", "pending", uniqueName + ".txt");
      if (fs.existsSync(pendingPath)) fs.unlinkSync(pendingPath);
      bot.sendMessage(chatId, "❌ تم رفض الملف.");
      return;
    }
  });

};
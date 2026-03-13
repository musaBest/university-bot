const fs = require("fs");
const path = require("path");

module.exports = (bot, userState, ADMIN_ID) => {

  // استقبال الملفات من الطلاب
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const state = userState[chatId];

    if (!state?.waitingUpload) return;

    let fileInfo = null;
    if (msg.document) fileInfo = msg.document;
    else if (msg.photo) fileInfo = msg.photo[msg.photo.length - 1];
    else if (msg.text) fileInfo = { file_name: msg.text, file_id: null };

    if (!state.currentSubject) {
      bot.sendMessage(chatId, "اختر المادة أولاً قبل إرسال الملخص.");
      return;
    }

    const pendingDir = path.join(__dirname, "..", "data", "pending");
    if (!fs.existsSync(pendingDir)) fs.mkdirSync(pendingDir, { recursive: true });

    const uniqueName = Date.now() + "_" + (fileInfo.file_name || "file");
    const filePath = path.join(pendingDir, uniqueName);

    try {
      let url = "";

      if (fileInfo.file_id) {
        url = await bot.getFileLink(fileInfo.file_id);
      } else if (fileInfo.file_name) {
        url = fileInfo.file_name; // لو رابط أو نص
      }

      fs.writeFileSync(filePath + ".txt", url);

      bot.sendMessage(chatId, "📤 تم استلام الملف بنجاح! سيتم مراجعته قبل نشره.");

      // رسالة للأدمن
      const studentName = ((msg.from && msg.from.first_name) ? msg.from.first_name : "") + " " +
                          ((msg.from && msg.from.last_name) ? msg.from.last_name : "");

      bot.sendMessage(ADMIN_ID,
        "📚 ملخص جديد\n\n" +
        "👤 الطالب: " + studentName + "\n" +
        "📖 المادة: " + state.currentSubject + "\n" +
        "📄 اسم الملف: " + (fileInfo.file_name || "ملف بدون اسم"),
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ موافقة", callback_data: "approve_" + uniqueName + "_" + state.currentSubject }
              ],
              [
                { text: "❌ رفض", callback_data: "reject_" + uniqueName }
              ]
            ]
          }
        }
      );

      state.waitingUpload = false;

    } catch (error) {
      console.log(error);
      bot.sendMessage(chatId, "❌ حدث خطأ أثناء رفع الملف، حاول لاحقًا.");
    }
  });

  // التعامل مع الموافقة أو الرفض
  bot.on("callback_query", (query) => {
    const data = query.data;
    const chatId = query.message.chat.id;

    // الموافقة
    if (data.startsWith("approve_")) {
      const [prefix, uniqueName, subject] = data.split("_");

      const pendingDir = path.join(__dirname, "..", "data", "pending");
      const approvedDir = path.join(__dirname, "..", "data", "approved", subject);
      if (!fs.existsSync(approvedDir)) fs.mkdirSync(approvedDir, { recursive: true });

      const pendingFile = path.join(pendingDir, uniqueName + ".txt");
      if (!fs.existsSync(pendingFile)) {
        bot.sendMessage(chatId, "❌ الملف غير موجود.");
        return;
      }

      const url = fs.readFileSync(pendingFile, "utf-8");
      fs.writeFileSync(path.join(approvedDir, uniqueName + ".txt"), url);
      fs.unlinkSync(pendingFile);

      bot.sendMessage(chatId, "✅ تم الموافقة على الملف ونشره للطلاب.");

      // تحديث قائمة ملفات الطلاب تحت المادة
      const studentFiles = fs.readdirSync(approvedDir)
        .filter(f => f.endsWith(".txt"))
        .map(f => {
          const name = f.replace(".txt", "");
          const link = fs.readFileSync(path.join(approvedDir, f), "utf-8");
          return [{ text: name, url: link }];
        });

      bot.sendMessage(chatId, "📚 ملخصات الطلاب للمادة \"" + subject + "\"", {
        reply_markup: {
          inline_keyboard: [
            ...studentFiles,
            [{ text: "❌ حذف كل ملفات المادة", callback_data: "delete_subject_" + subject }]
          ]
        }
      });

      return;
    }
    // رفض الملف
    if (data.startsWith("reject_")) {
      const uniqueName = data.replace("reject_", "");
      const pendingDir = path.join(__dirname, "..", "data", "pending");
      const pendingFile = path.join(pendingDir, uniqueName + ".txt");
      if (fs.existsSync(pendingFile)) fs.unlinkSync(pendingFile);
      bot.sendMessage(chatId, "❌ تم رفض الملف.");
      return;
    }

    // حذف كل الملفات لمادة معينة
    if (data.startsWith("delete_subject_")) {
      const subject = data.replace("delete_subject_", "");
      const approvedDir = path.join(__dirname, "..", "data", "approved", subject);
      if (!fs.existsSync(approvedDir)) return;

      fs.readdirSync(approvedDir).forEach(f => fs.unlinkSync(path.join(approvedDir, f)));
      bot.sendMessage(chatId, "🗑️ تم حذف كل الملفات للمادة \"" + subject + "\".");
    }
  });
};
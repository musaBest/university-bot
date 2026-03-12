const fs = require("fs");
const path = require("path");

module.exports = (bot, userState, ADMIN_ID) => {

  bot.on("document", (msg) => {
    const chatId = msg.chat.id;
    const fileId = msg.document.file_id;
    const fileName = msg.document.file_name;

    if (!userState[chatId]?.currentSubject) {
      bot.sendMessage(chatId, "اختر المادة أولاً قبل إرسال الملخص.");
      return;
    }

    const pendingDir = path.join(__dirname, "..", "data", "pending");
    if (!fs.existsSync(pendingDir)) fs.mkdirSync(pendingDir, { recursive: true });

    const filePath = path.join(pendingDir, `${Date.now()}_${fileName}`);

    bot.getFileLink(fileId).then(url => {
      fs.writeFileSync(filePath + ".txt", url);

      bot.sendMessage(chatId, "تم استلام الملف بنجاح! سيتم مراجعته قبل نشره.");

      bot.sendMessage(ADMIN_ID, `ملخص جديد من ${msg.from.first_name} للمادة ${userState[chatId].currentSubject}\nاسم الملف: ${fileName}`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ موافقة", callback_data: "approve_" + filePath }],
            [{ text: "❌ رفض", callback_data: "reject_" + filePath }]
          ]
        }
      });
    });
  });

  bot.on("callback_query", (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data.startsWith("approve_")) {
      const filePath = data.replace("approve_", "");
      const approvedDir = path.join(__dirname, "..", "data", "approved");
      if (!fs.existsSync(approvedDir)) fs.mkdirSync(approvedDir, { recursive: true });

      const fileName = path.basename(filePath).replace(".txt", "");
      const url = fs.readFileSync(filePath + ".txt", "utf-8");

      fs.writeFileSync(path.join(approvedDir, fileName + ".txt"), url);
      fs.unlinkSync(filePath + ".txt");

      bot.sendMessage(chatId, "تم الموافقة على الملف ونشره للطلاب ✅");
      return;
    }

    if (data.startsWith("reject_")) {
      const filePath = data.replace("reject_", "");
      fs.unlinkSync(filePath + ".txt");
      bot.sendMessage(chatId, "تم رفض الملف ❌");
      return;
    }
  });

};
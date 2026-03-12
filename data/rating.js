const fs = require("fs");
const path = require("path");

module.exports = (bot, userState) => {

  const ratingsFile = path.join(__dirname, "..", "data", "ratings.json");

  if (!fs.existsSync(ratingsFile)) fs.writeFileSync(ratingsFile, JSON.stringify({}));

  bot.on("callback_query", (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data.startsWith("rate_")) {
      const [_, subject, score] = data.split("_");
      const ratings = JSON.parse(fs.readFileSync(ratingsFile));

      if (!ratings[subject]) ratings[subject] = { total: 0, count: 0 };

      ratings[subject].total += parseInt(score);
      ratings[subject].count += 1;

      fs.writeFileSync(ratingsFile, JSON.stringify(ratings));

      bot.sendMessage(chatId, `تم تسجيل تقييمك للمادة ${subject} بنجاح 👍`);
    }
  });

};
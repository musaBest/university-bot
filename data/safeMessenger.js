/**
 * Safe Messenger & Markdown Sanitizer Module
 * Prevents any Telegram API 400 Bad Request entity parsing errors
 * Ensures the bot never freezes or crashes when student names, usernames, or inputs contain special characters.
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

function truncateForTelegram(str, maxLen = 3900) {
  if (!str) return "";
  const s = String(str);
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 15) + "\n\n...(تم الاختصار لكبر حجم الرسالة)...";
}

async function safeSend(bot, chatId, text, options = {}) {
  if (!bot || !chatId) return null;
  const safeText = truncateForTelegram(text);
  try {
    return await bot.sendMessage(chatId, safeText, {
      parse_mode: "Markdown",
      ...options
    });
  } catch (err) {
    console.warn(`[SafeSend] Markdown send to ${chatId} failed (${err.message}). Retrying with plain text...`);
    const plainText = String(safeText || "").replace(/[*_`\[\]\\]/g, "");
    const { parse_mode, ...fallbackOptions } = options;
    try {
      return await bot.sendMessage(chatId, plainText, fallbackOptions);
    } catch (innerErr) {
      console.error(`[SafeSend Fatal] Failed to send message to ${chatId}:`, innerErr.message);
      return null;
    }
  }
}

async function safeSendDocument(bot, chatId, docPath, options = {}) {
  if (!bot || !chatId) return null;
  const rawCaption = options.caption ? truncateForTelegram(options.caption, 1000) : "";
  try {
    const opts = { ...options };
    if (rawCaption) opts.caption = rawCaption;
    return await bot.sendDocument(chatId, docPath, {
      parse_mode: "Markdown",
      ...opts
    });
  } catch (err) {
    console.warn(`[SafeSendDoc] Markdown caption failed (${err.message}). Retrying plain caption...`);
    const plainCaption = rawCaption ? rawCaption.replace(/[*_`\[\]\\]/g, "") : "";
    const { parse_mode, ...fallbackOptions } = options;
    fallbackOptions.caption = plainCaption;
    try {
      return await bot.sendDocument(chatId, docPath, fallbackOptions);
    } catch (innerErr) {
      console.error(`[SafeSendDoc Fatal] Failed to send document to ${chatId}:`, innerErr.message);
      return null;
    }
  }
}

async function safeEditMessageText(bot, text, options = {}) {
  if (!bot) return null;
  const safeText = truncateForTelegram(text);
  try {
    return await bot.editMessageText(safeText, {
      parse_mode: "Markdown",
      ...options
    });
  } catch (err) {
    const plainText = String(safeText || "").replace(/[*_`\[\]\\]/g, "");
    const { parse_mode, ...fallbackOptions } = options;
    try {
      return await bot.editMessageText(plainText, fallbackOptions);
    } catch (innerErr) {
      return null;
    }
  }
}

module.exports = {
  safeEscape,
  safeSend,
  safeSendDocument,
  safeEditMessageText
};

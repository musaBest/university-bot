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

async function safeSend(bot, chatId, text, options = {}) {
  try {
    return await bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      ...options
    });
  } catch (err) {
    console.warn(`[SafeSend] Markdown send to ${chatId} failed (${err.message}). Retrying with plain text...`);
    const plainText = String(text || "").replace(/[*_`\[\]\\]/g, "");
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
  try {
    return await bot.sendDocument(chatId, docPath, {
      parse_mode: "Markdown",
      ...options
    });
  } catch (err) {
    console.warn(`[SafeSendDoc] Markdown caption failed (${err.message}). Retrying plain caption...`);
    const plainCaption = options.caption ? String(options.caption).replace(/[*_`\[\]\\]/g, "") : "";
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

module.exports = {
  safeEscape,
  safeSend,
  safeSendDocument
};

/**
 * Broadcast Manager Module
 * Manages broadcast history and allows admins to unsend/delete announcements from students' chats.
 */

const fs = require("fs");
const path = require("path");

const historyFilePath = path.join(__dirname, "broadcast_history.json");

function loadBroadcastHistory() {
  try {
    if (fs.existsSync(historyFilePath)) {
      const data = fs.readFileSync(historyFilePath, "utf8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error loading broadcast history:", e);
  }
  return [];
}

function saveBroadcastHistory(history) {
  try {
    fs.writeFileSync(historyFilePath, JSON.stringify(history.slice(-10), null, 2), "utf8");
  } catch (e) {
    console.error("Error saving broadcast history:", e);
  }
}

function saveBroadcastRecord(record) {
  const history = loadBroadcastHistory();
  const entry = {
    id: record.id || `bc_${Date.now()}`,
    timestamp: new Date().toISOString(),
    description: record.description || "إعلان / إشعار جماعي",
    totalSent: record.totalSent || (record.sentMessages ? record.sentMessages.length : 0),
    sentMessages: record.sentMessages || [], // [{ chatId, messageId }]
    isDeleted: false
  };
  history.push(entry);
  saveBroadcastHistory(history);
  return entry;
}

function getLastBroadcast() {
  const history = loadBroadcastHistory();
  for (let i = history.length - 1; i >= 0; i--) {
    if (!history[i].isDeleted && history[i].sentMessages?.length > 0) {
      return history[i];
    }
  }
  return null;
}

function getBroadcastById(id) {
  const history = loadBroadcastHistory();
  return history.find(b => b.id === id) || null;
}

async function unsendBroadcast(bot, broadcastId) {
  const history = loadBroadcastHistory();
  const index = history.findIndex(b => b.id === broadcastId);
  if (index === -1) {
    return { success: false, error: "لم يتم العثور على سجل هذا الإعلان." };
  }

  const broadcast = history[index];
  if (broadcast.isDeleted) {
    return { success: false, error: "تم حذف هذا الإعلان مسبقاً." };
  }

  let deletedCount = 0;
  const messages = broadcast.sentMessages || [];

  for (const item of messages) {
    if (item && item.chatId && item.messageId) {
      try {
        await bot.deleteMessage(item.chatId, item.messageId);
        deletedCount++;
      } catch (err) {
        // Message may have already been deleted or chat unavailable
      }
      // Small delay to prevent rate limit
      await new Promise(r => setTimeout(r, 25));
    }
  }

  history[index].isDeleted = true;
  history[index].deletedAt = new Date().toISOString();
  history[index].deletedCount = deletedCount;
  saveBroadcastHistory(history);

  return {
    success: true,
    deletedCount,
    totalCount: messages.length
  };
}

module.exports = {
  saveBroadcastRecord,
  getLastBroadcast,
  getBroadcastById,
  unsendBroadcast,
  loadBroadcastHistory
};

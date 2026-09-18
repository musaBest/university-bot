/**
 * Student Hardware, Books & Tools Exchange Market Module
 * For Computer Engineering Students
 */

const fs = require("fs");
const path = require("path");

const MARKETPLACE_FILE = path.join(__dirname, "marketplace.json");

function loadListings() {
  try {
    if (fs.existsSync(MARKETPLACE_FILE)) {
      const data = JSON.parse(fs.readFileSync(MARKETPLACE_FILE, "utf8"));
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
    console.error("Error loading marketplace listings:", e);
  }
  return [];
}

function saveListings(listings) {
  try {
    fs.writeFileSync(MARKETPLACE_FILE, JSON.stringify(listings, null, 2), "utf8");
    return true;
  } catch (e) {
    console.error("Error saving marketplace listings:", e);
    return false;
  }
}

/**
 * إضافة إعلان جديد
 */
function addListing(userId, userName, userHandle, category, title, details, priceOrType, contact) {
  const listings = loadListings();
  const newListing = {
    id: "item_" + Date.now(),
    userId,
    userName: userName || "طالب",
    userHandle: userHandle ? (userHandle.startsWith("@") ? userHandle : `@${userHandle}`) : "",
    category, // 'hardware' | 'books' | 'other'
    title,
    details,
    priceOrType: priceOrType || "مجاناً / للبدل",
    contact: contact || userHandle || "عبر البوت",
    createdAt: new Date().toISOString()
  };

  listings.unshift(newListing);
  saveListings(listings);
  return newListing;
}

/**
 * حذف إعلان بواسطة المعرّف (أو بواسطة الأدمن)
 */
function deleteListing(listingId, requesterId, adminId) {
  let listings = loadListings();
  const index = listings.findIndex(l => l.id === listingId);
  if (index === -1) return { success: false, error: "الإعلان غير موجود." };

  if (String(listings[index].userId) !== String(requesterId) && String(requesterId) !== String(adminId)) {
    return { success: false, error: "لا تملك صلاحية حذف هذا الإعلان." };
  }

  const deleted = listings.splice(index, 1)[0];
  saveListings(listings);
  return { success: true, deleted };
}

/**
 * عرض الواجهة الرئيسية لسوق التبادل
 */
function renderMarketplaceMenu(chatId, bot) {
  const listings = loadListings();
  const hardwareCount = listings.filter(l => l.category === "hardware").length;
  const booksCount = listings.filter(l => l.category === "books").length;
  const otherCount = listings.filter(l => l.category === "other").length;

  const text = `🔄 *سوق تبادل القطع المعملية والكتب (Hardware & Books Exchange)*
━━━━━━━━━━━━━━━━━━━━

منصة طلابية مخصصة لطلبة هندسة الحاسوب لتبادل وإعارة وشراء الأدوات المعملية والكتب الهندسية المستعملة 🛠️📚

📦 *الإعلانات المتاحة حالياً:*
• 🔌 *قطع ومجموعات معملية (Arduino, Sensors):* ${hardwareCount} إعلان
• 📚 *كتب ومذكرات مطبوعة:* ${booksCount} إعلان
• 💡 *أدوات ومشاريع أخرى:* ${otherCount} إعلان

👇 اختر قسماً للتصفح أو أضف إعلانك الخاص:`;

  const keyboard = [
    [
      { text: "🔌 قطع ومجموعات معملية", callback_data: "market_cat_hardware" },
      { text: "📚 كتب ومذكرات وملازم", callback_data: "market_cat_books" }
    ],
    [
      { text: "💡 أدوات ومشاريع أخرى", callback_data: "market_cat_other" },
      { text: "➕ إضافة إعلان جديد (عرض / طلب)", callback_data: "market_add_prompt" }
    ],
    [
      { text: "📋 إعلاناتي الخاصة", callback_data: "market_my_listings" },
      { text: "🔙 العودة للقائمة الرئيسية", callback_data: "main_menu" }
    ]
  ];

  bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard }
  });
}

/**
 * عرض قائمة الإعلانات لقسم معين
 */
function renderCategoryListings(chatId, bot, category, adminId = 5687891184) {
  const all = loadListings();
  const filtered = all.filter(l => l.category === category);

  const catNames = {
    hardware: "🔌 القطع والمجموعات المعملية",
    books: "📚 الكتب والمذكرات والملازم",
    other: "💡 الأدوات والمشاريع الأخرى"
  };
  const catTitle = catNames[category] || "الإعلانات";

  if (filtered.length === 0) {
    bot.sendMessage(chatId, `لا توجد إعلانات حالياً في قسم *${catTitle}*.\n\nكن أول من يضيف إعلاناً! 🚀`, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "➕ إضافة إعلان الآن", callback_data: `market_add_prompt_${category}` }],
          [{ text: "🔙 العودة لسوق التبادل", callback_data: "open_marketplace" }]
        ]
      }
    });
    return;
  }

  let text = `📦 *${catTitle} (${filtered.length} إعلان)*\n━━━━━━━━━━━━━━━━━━━━\n\n`;

  for (let i = 0; i < Math.min(filtered.length, 10); i++) {
    const item = filtered[i];
    const dateStr = item.createdAt.split("T")[0];
    text += `🔹 *${i + 1}. ${item.title}*\n`;
    text += `• 📝 *الوصف:* ${item.details}\n`;
    text += `• 💰 *الحالة/السعر:* ${item.priceOrType}\n`;
    text += `• 👤 *الناشر:* ${item.userName} (${item.userHandle || "بدون يوزر"})\n`;
    text += `• 📞 *للتواصل:* \`${item.contact}\`\n`;
    text += `• 📅 *التاريخ:* ${dateStr}\n\n`;
  }

  const keyboard = [];
  keyboard.push([{ text: "➕ أضف إعلانك في هذا القسم", callback_data: `market_add_prompt_${category}` }]);
  keyboard.push([{ text: "🔙 العودة لسوق التبادل", callback_data: "open_marketplace" }]);

  bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard }
  });
}

/**
 * عرض إعلانات المستخدم الخاصة
 */
function renderMyListings(chatId, bot) {
  const all = loadListings();
  const mine = all.filter(l => String(l.userId) === String(chatId));

  if (mine.length === 0) {
    bot.sendMessage(chatId, "ليس لديك أي إعلانات منشورة حالياً في سوق التبادل.", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "➕ نشر إعلان جديد", callback_data: "market_add_prompt" }],
          [{ text: "🔙 العودة لسوق التبادل", callback_data: "open_marketplace" }]
        ]
      }
    });
    return;
  }

  let text = `📋 *إعلاناتك المنشورة (${mine.length} إعلان):*\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  const keyboard = [];

  for (let i = 0; i < mine.length; i++) {
    const item = mine[i];
    text += `🔹 *${i + 1}. ${item.title}*\n`;
    text += `• 📝 *الوصف:* ${item.details}\n`;
    text += `• 💰 *السعر/النوع:* ${item.priceOrType}\n\n`;

    keyboard.push([
      { text: `🗑️ حذف: ${item.title.slice(0, 20)}`, callback_data: `market_del_${item.id}` }
    ]);
  }

  keyboard.push([{ text: "🔙 العودة لسوق التبادل", callback_data: "open_marketplace" }]);

  bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard }
  });
}

module.exports = {
  loadListings,
  saveListings,
  addListing,
  deleteListing,
  renderMarketplaceMenu,
  renderCategoryListings,
  renderMyListings
};

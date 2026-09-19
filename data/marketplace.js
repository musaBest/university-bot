/**
 * Student Hardware, Books & Tools Exchange Market Module
 * For Computer Engineering Students
 */

const fs = require("fs");
const path = require("path");
const { safeEscape, safeSend, safeSendDocument } = require("./safeMessenger");

const MARKETPLACE_FILE = path.join(__dirname, "marketplace.json");

let cachedListings = null;

function loadListings() {
  if (cachedListings !== null) return cachedListings;
  try {
    if (fs.existsSync(MARKETPLACE_FILE)) {
      const data = JSON.parse(fs.readFileSync(MARKETPLACE_FILE, "utf8"));
      if (Array.isArray(data)) {
        cachedListings = data;
        return cachedListings;
      }
    }
  } catch (e) {
    console.error("Error loading marketplace listings:", e);
  }
  cachedListings = [];
  return cachedListings;
}

function saveListings(listings) {
  try {
    const list = Array.isArray(listings) ? listings : loadListings();
    cachedListings = list;
    fs.writeFileSync(MARKETPLACE_FILE, JSON.stringify(list, null, 2), "utf8");
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
    userId: String(userId),
    userName: userName || "طالب",
    userHandle: userHandle ? (userHandle.startsWith("@") ? userHandle : `@${userHandle}`) : "",
    category: category || "hardware", // 'hardware' | 'books' | 'other'
    title: (title || "إعلان طالب").trim(),
    details: (details || "تفاصيل الإعلان").trim(),
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
  if (index === -1) return { success: false, error: "الإعلان غير موجود أو تم حذفه مسبقاً." };

  if (String(listings[index].userId) !== String(requesterId) && Number(requesterId) !== Number(adminId)) {
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
      { text: "📋 إعلاناتي الخاصة", callback_data: "market_my_listings" }
    ],
    [
      { text: "🔙 رجوع لقسم الخدمات الطلابية", callback_data: "menu_services" },
      { text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }
    ]
  ];

  safeSend(bot, chatId, text, {
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
    safeSend(bot, chatId, `لا توجد إعلانات حالياً في قسم *${catTitle}*.\n\nكن أول من يضيف إعلاناً! 🚀`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "➕ إضافة إعلان الآن", callback_data: `market_add_prompt_${category}` }],
          [{ text: "🔙 رجوع لسوق التبادل", callback_data: "open_marketplace" }],
          [{ text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }]
        ]
      }
    });
    return;
  }

  let text = `📦 *${catTitle} (${filtered.length} إعلان)*\n━━━━━━━━━━━━━━━━━━━━\n\n`;

  for (let i = 0; i < Math.min(filtered.length, 10); i++) {
    const item = filtered[i];
    const dateStr = item.createdAt ? item.createdAt.split("T")[0] : "";
    const safeTitle = safeEscape(item.title);
    const safeDetails = safeEscape(item.details);
    const safePrice = safeEscape(item.priceOrType);
    const safeName = safeEscape(item.userName);
    const safeHandle = item.userHandle ? ` (@${safeEscape(item.userHandle.replace(/^@/, ""))})` : "";
    const safeContact = safeEscape(item.contact);

    text += `🔹 *${i + 1}. ${safeTitle}*\n`;
    text += `• 📝 *الوصف:* ${safeDetails}\n`;
    text += `• 💰 *الحالة/السعر:* ${safePrice}\n`;
    text += `• 👤 *الناشر:* ${safeName}${safeHandle}\n`;
    text += `• 📞 *للتواصل:* \`${safeContact}\`\n`;
    text += `• 📅 *التاريخ:* ${dateStr}\n\n`;
  }

  const keyboard = [];
  keyboard.push([{ text: "➕ أضف إعلانك في هذا القسم", callback_data: `market_add_prompt_${category}` }]);
  keyboard.push([
    { text: "🔙 رجوع لسوق التبادل", callback_data: "open_marketplace" },
    { text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }
  ]);

  safeSend(bot, chatId, text, {
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
    safeSend(bot, chatId, "ليس لديك أي إعلانات منشورة حالياً في سوق التبادل.", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "➕ نشر إعلان جديد", callback_data: "market_add_prompt" }],
          [{ text: "🔙 رجوع لسوق التبادل", callback_data: "open_marketplace" }],
          [{ text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }]
        ]
      }
    });
    return;
  }

  let text = `📋 *إعلاناتك المنشورة (${mine.length} إعلان):*\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  const keyboard = [];

  for (let i = 0; i < mine.length; i++) {
    const item = mine[i];
    const safeTitle = safeEscape(item.title);
    const safeDetails = safeEscape(item.details);
    const safePrice = safeEscape(item.priceOrType);

    text += `🔹 *${i + 1}. ${safeTitle}*\n`;
    text += `• 📝 *الوصف:* ${safeDetails}\n`;
    text += `• 💰 *السعر/النوع:* ${safePrice}\n\n`;

    keyboard.push([
      { text: `🗑️ حذف: ${item.title.slice(0, 20)}`, callback_data: `market_del_${item.id}` }
    ]);
  }

  keyboard.push([
    { text: "🔙 رجوع لسوق التبادل", callback_data: "open_marketplace" },
    { text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }
  ]);

  safeSend(bot, chatId, text, {
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

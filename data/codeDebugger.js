/**
 * Code Debugger & Explainer Module for Computer Engineering Bot
 * Specialized in C++, Java, Python, Verilog/VHDL, Assembly, C, SQL, and Web.
 */

const fs = require("fs");
const path = require("path");
const { generateAIResponse } = require("./aiService");

const DEBUGGER_MODES = {
  DEBUG: "debug",
  EXPLAIN: "explain",
  OPTIMIZE: "optimize",
  TESTCASES: "testcases"
};

const MODE_LABELS = {
  debug: "🐞 فحص وتصحيح الأخطاء (Debug & Fix)",
  explain: "📖 شرح وتفسير الكود خطوة بخطوة (Explain)",
  optimize: "⚡ تحسين الكفاءة والتعقيد (Optimize & Clean)",
  testcases: "🧪 توليد حالات اختبار شاملة (Test Cases)"
};

/**
 * بناء برومبت هندسي متخصص حسب الوضع المختار
 */
function buildDebuggerPrompt(codeOrQuery, mode = "debug", language = "") {
  let instruction = "";

  switch (mode) {
    case "explain":
      instruction = `أنت مهندس ومدرس برمجة خبير في قسم هندسة الحاسوب.
المطلوب:
1. اشرح هذا الكود بالتفصيل المبسط خطوة بخطوة.
2. وضح وظيفة كل دالة ومتغير وخوارزمية مستخدمة.
3. تتبع تنفيذ الكود (Dry Run / Tracing) بمثال عملي وتوضيح المخرجات المتوقعة (Output).
4. اذكر أي مفاهيم برمجية هامة مستخدمة (مثل Recursion, OOP, Pointers, Memory Management...).`;
      break;

    case "optimize":
      instruction = `أنت مهندس برمجيات ونظم مدمجة خبير.
المطلوب:
1. حلل كفاءة هذا الكود وحدد التعقيد الزمني (Time Complexity) والتعقيد المكاني (Space Complexity) باستخدام Big-O Notation.
2. أعد كتابة الكود بأفضل وأسرع طريقة ممكنة لتقليل استهلاك الذاكرة والوقت.
3. نظّم الكود ونسّقه مع كتابة تعليقات احترافية توضح التحسينات.
4. وضح الفرق بين الكود القديم والجديد بالتفصيل.`;
      break;

    case "testcases":
      instruction = `أنت مهندس جودة واختبار برمجيات (Software QA & Testing Engineer).
المطلوب:
1. حلل هذا الكود وحدد جميع الحالات الممكنة والحدية (Corner / Edge Cases, Normal Cases, Invalid Inputs).
2. قم بتوليد جدول منظم من حالات الاختبار يحتوي على:
   • رقم الحالة (Test Case #)
   • نوع الحالة (عادية / حدية / خاطئة)
   • المدخلات (Inputs)
   • المخرجات المتوقعة (Expected Outputs)
   • سبب اختيار هذه الحالة.
3. إذا كان هناك كود فحص (Unit Test)، قدم كود اختبار بسيط ومناسب للغة الكود.`;
      break;

    case "debug":
    default:
      instruction = `أنت مهندس خبير ومصحح أخطاء برمجية (Senior Code Debugger) لطلبة هندسة الحاسوب.
المطلوب بدقة متناهية:
1. 🔍 **تحديد الأخطاء:** افحص الكود وحدد كل خطأ (Syntax Errors, Runtime Errors, Logic Bugs, Memory Leaks, Infinite Loops, Boundary Issues).
2. 💡 **شرح سبب الخطأ:** اشرح بلغة عربية مبسطة وهندسية واضحة لماذا حدث كل خطأ وكيف يؤثر على البرنامج.
3. ✅ **الكود المصحح والنهائي:** اكتب الكود المصحح كاملاً داخل كتل كود منسقة جاهزة للنسخ والتشغيل مباشرة مع تعليقات توضيحية.
4. 🚀 **نصائح هندسية:** قدم نصائح لتجنب مثل هذه الأخطاء مستقبلاً، مع ذكر التعقيد الزمني (Time Complexity).`;
      break;
  }

  const langContext = language ? `\nلغة البرمجة المحددة: ${language}` : "";
  return `${instruction}${langContext}\n\n--- الكود أو المشكلة المدخلة ---\n${codeOrQuery}`;
}

/**
 * عرض الواجهة الرئيسية لمصحح ومفسر الأكواد
 */
function renderCodeDebuggerMenu(chatId, bot, currentMode = "debug") {
  const activeLabel = MODE_LABELS[currentMode] || MODE_LABELS.debug;

  const text = `🐞 *مصحح ومفسر الأكواد الذكي (Code Debugger & Explainer)*
━━━━━━━━━━━━━━━━━━━━

أهلاً بك في بيئة التحليل والتصحيح البرمجي الذكية لطلبة هندسة الحاسوب! 💻✨

🎯 *الوضع الحالي المختار:*
👉 *${activeLabel}*

💡 *يدعم جميع لغات ومساقات القسم:*
• C++ / C / OOP / Data Structures
• Java / Python / Algorithms
• Verilog / VHDL / Digital Logic
• Assembly (8086 / MIPS / ARM)
• Web & Database (SQL, HTML, JS)

🛠️ *طريقة الاستخدام:*
أرسل كودك الآن في المحادثة مباشرة أو أرسل ملف الكود أو سكرين شوت للخطأ وسأقوم بالتحليل الفوري! 👇`;

  const keyboard = [
    [
      { text: currentMode === "debug" ? "🔘 🐞 فحص وتصحيح الأخطاء" : "🐞 فحص وتصحيح الأخطاء", callback_data: "cd_mode_debug" },
      { text: currentMode === "explain" ? "🔘 📖 شرح وتفسير الكود" : "📖 شرح وتفسير الكود", callback_data: "cd_mode_explain" }
    ],
    [
      { text: currentMode === "optimize" ? "🔘 ⚡ تحسين الكفاءة والسرعة" : "⚡ تحسين الكفاءة والسرعة", callback_data: "cd_mode_optimize" },
      { text: currentMode === "testcases" ? "🔘 🧪 توليد حالات اختبار" : "🧪 توليد حالات اختبار", callback_data: "cd_mode_testcases" }
    ],
    [
      { text: "🧹 تنظيف وبدء جلسة جديدة", callback_data: "cd_clear" },
      { text: "🔙 رجوع لبوابة الذكاء الاصطناعي", callback_data: "cd_exit" }
    ]
  ];

  bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard }
  });
}

/**
 * معالجة رسائل الأكواد والملفات والصور داخل مصحح الأكواد
 */
async function handleCodeDebuggerInput(chatId, bot, msg, userState) {
  const state = userState[chatId]?.codeDebugger || { mode: "debug", history: [] };
  const currentMode = state.mode || "debug";

  const typingTimer = setInterval(() => {
    bot.sendChatAction(chatId, "typing").catch(() => {});
  }, 3000);
  bot.sendChatAction(chatId, "typing").catch(() => {});

  try {
    let inputContent = (msg.text || msg.caption || "").trim();
    const attachments = [];

    // 1. معالجة الصور وسكرين شوت الأخطاء
    if (msg.photo && msg.photo.length > 0) {
      const photo = msg.photo[msg.photo.length - 1];
      try {
        const downloadDir = path.join(__dirname, "..");
        const downloadedPath = await bot.downloadFile(photo.file_id, downloadDir);
        const buffer = fs.readFileSync(downloadedPath);
        try { fs.unlinkSync(downloadedPath); } catch (e) {}
        const base64 = buffer.toString("base64");
        attachments.push({ mimeType: "image/jpeg", data: base64 });
        if (!inputContent) {
          inputContent = "حلل وافحص الكود والخطأ الوارد في هذه الصورة وصححه بالتفصيل.";
        }
      } catch (e) {
        console.error("Code debugger image download error:", e);
      }
    }
    // 2. معالجة ملفات الأكواد والمستندات
    else if (msg.document) {
      try {
        const fileName = msg.document.file_name || "code.txt";
        const downloadDir = path.join(__dirname, "..");
        const downloadedPath = await bot.downloadFile(msg.document.file_id, downloadDir);
        const buffer = fs.readFileSync(downloadedPath);
        try { fs.unlinkSync(downloadedPath); } catch (e) {}

        const textContent = buffer.toString("utf8");
        // إذا كان ملف نصي/كود، نأخذ نصه مباشرة
        if (textContent && !textContent.includes("\0")) {
          const formattedCode = `// اسم الملف: ${fileName}\n${textContent.slice(0, 15000)}`;
          inputContent = inputContent ? `${inputContent}\n\n${formattedCode}` : formattedCode;
        } else {
          const base64 = buffer.toString("base64");
          attachments.push({ mimeType: msg.document.mime_type || "application/octet-stream", data: base64 });
        }
      } catch (e) {
        console.error("Code debugger document download error:", e);
      }
    }

    if (!inputContent && attachments.length === 0) {
      clearInterval(typingTimer);
      bot.sendMessage(chatId, "⚠️ يرجى إرسال كود برمجي، أو صورة لكود/خطأ، أو ملف كود للبدء.");
      return;
    }

    const fullPrompt = buildDebuggerPrompt(inputContent, currentMode);
    const history = state.history || [];

    const response = await generateAIResponse(fullPrompt, history, attachments);
    clearInterval(typingTimer);

    // تحديث سجل المحادثة للكود
    if (!state.history) state.history = [];
    state.history.push({ role: "user", text: inputContent.slice(0, 500) });
    state.history.push({ role: "model", text: response.slice(0, 1000) });
    if (state.history.length > 8) state.history = state.history.slice(-8);
    userState[chatId].codeDebugger = state;

    const actionKeyboard = [
      [
        { text: "🐞 فحص وتصحيح", callback_data: "cd_mode_debug" },
        { text: "📖 شرح وتفسير", callback_data: "cd_mode_explain" }
      ],
      [
        { text: "⚡ تحسين الكفاءة", callback_data: "cd_mode_optimize" },
        { text: "🧪 حالات اختبار", callback_data: "cd_mode_testcases" }
      ],
      [
        { text: "🧹 مسح وبدء من جديد", callback_data: "cd_clear" },
        { text: "🔙 رجوع لبوابة الذكاء الاصطناعي", callback_data: "cd_exit" }
      ]
    ];

    // إرسال الرد
    if (response.length > 4000) {
      const parts = response.match(/[\s\S]{1,3800}/g) || [response];
      for (let i = 0; i < parts.length; i++) {
        const isLast = i === parts.length - 1;
        await bot.sendMessage(chatId, parts[i], {
          parse_mode: "Markdown",
          reply_markup: isLast ? { inline_keyboard: actionKeyboard } : undefined
        }).catch(async () => {
          await bot.sendMessage(chatId, parts[i], {
            reply_markup: isLast ? { inline_keyboard: actionKeyboard } : undefined
          }).catch(() => {});
        });
      }
    } else {
      await bot.sendMessage(chatId, response, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: actionKeyboard }
      }).catch(async () => {
        await bot.sendMessage(chatId, response, {
          reply_markup: { inline_keyboard: actionKeyboard }
        }).catch(() => {});
      });
    }

  } catch (err) {
    clearInterval(typingTimer);
    console.error("Code debugger processing error:", err);
    bot.sendMessage(chatId, "⚠️ واجهت مشكلة بسيطة أثناء تحليل الكود. تفضل بإعادة إرساله وسأقوم بفهصه فوراً!");
  }
}

module.exports = {
  renderCodeDebuggerMenu,
  handleCodeDebuggerInput,
  MODE_LABELS,
  DEBUGGER_MODES
};

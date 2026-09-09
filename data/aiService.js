/**
 * AI Service Module for Computer Engineering Telegram Bot
 * Powered by Google Gemini API
 */

const fs = require("fs");
const path = require("path");

const DEFAULT_KEY_B64 = "QVEuQWI4Uk42THU4TnRUWmZzNEFMeGFTUlBRNWRVemJnQXd6cG81T3YyOVo0NEhfMXRRSWc=";

function getApiKey() {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    return process.env.GEMINI_API_KEY.trim();
  }
  try {
    const envPath = path.join(__dirname, "..", ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const rawLine of content.split("\n")) {
        const line = rawLine.trim();
        if (line.startsWith("#") || !line.includes("=")) continue;
        const [k, ...v] = line.split("=");
        if (k.trim() === "GEMINI_API_KEY") {
          const val = v.join("=").trim().replace(/^["']|["']$/g, "");
          if (val) return val;
        }
      }
    }
  } catch (e) {}

  try {
    return Buffer.from(DEFAULT_KEY_B64, "base64").toString("utf-8");
  } catch (e) {}

  return "";
}

const GEMINI_API_KEY = getApiKey();

const SYSTEM_INSTRUCTION = `
أنت "المساعد الأكاديمي الذكي لقسم هندسة الحاسوب في الجامعة الإسلامية - غزة" (IUG Computer Engineering AI Tutor).
دورك الأساسي هو مساعدة طلبة قسم هندسة الحاسوب في دراستهم ومشاريعهم الأكاديمية.

مهامك وإرشاداتك:
1. الشرح والتعليم:
   - شرح المفاهيم الهندسية والبرمجية بأسلوب واضح ومبسط وعلمي دقيق.
   - عند كتابة الأكواد، استخدم اللغات الشائعة في التخصص (C++, Python, Java, JavaScript, Assembly x86, SQL, VHDL/Verilog) مع توضيح التعليقات وشرح طريقة العمل.
   - شرح الخوارزميات (Algorithms)، هياكل البيانات (Data Structures)، نظم التشغيل (Operating Systems)، شبكات الحاسوب (Networks)، عمارة الحاسوب (Computer Architecture)، والدوائر الإلكترونية والمنطقية (Logic Design).

2. أسلوب الرد:
   - تحدث بلغة عربية فصيحة وواضحة، واستخدم المصطلحات الهندسية بالإنجليزية بجانب التعريب عند الحاجة.
   - نظم الإجابة باستخدام النقاط (Bullet points) والعناوين وكتل الأكواد البرمجية المرتبة.
   - كن مشجعاً، إيجابياً، وصبوراً مع الطلاب.

3. المعرفة العامة بالخطة:
   - التخصص: هندسة حاسوب (Computer Engineering) - الجامعة الإسلامية بغزة (IUG).
   - عدد سنوات الدراسة: 5 سنوات (أو خطة 4 سنوات).
   - الموقع الرسمي للمواد والملفات: https://computer-engineering-iug.vercel.app
`.trim();

/**
 * دالة توليد الإجابة من Google Gemini
 * @param {string} prompt - سؤال الطالب
 * @param {Array} history - سجل المحادثة السابقة للذاكرة
 * @returns {Promise<string>}
 */
async function generateAIResponse(prompt, history = []) {
  const apiKey = getApiKey();

  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE" || apiKey.trim() === "") {
    return (
      "⚠️ *مرحباً بك!*\n\n" +
      "لتفعيل خدمة الذكاء الاصطناعي، يرجى وضع مفتاح **Gemini API Key** المجاني.\n\n" +
      "📌 *خطوات الحصول على المفتاح المجاني خلال دقيقة:*\n" +
      "1. ادخل إلى: https://aistudio.google.com/\n" +
      "2. سجّل دخولك بحساب Google واضغط **Get API key**.\n" +
      "3. ضع المفتاح في ملف `.env` كالتالي: `GEMINI_API_KEY=your_key` أو كمتغير بيئة (Environment Variable).\n\n" +
      "💡 *الخدمة مجانية بالكامل من Google وتدعم كافة أسئلة التخصص والبرمجة!*"
    );
  }

  // بناء محادثة Gemini مع السجل السابق
  const contents = [];

  if (Array.isArray(history)) {
    for (const turn of history.slice(-8)) {
      if (turn.role && turn.text) {
        contents.push({
          role: turn.role === "user" ? "user" : "model",
          parts: [{ text: turn.text }]
        });
      }
    }
  }

  contents.push({
    role: "user",
    parts: [{ text: prompt }]
  });

  const modelsToTry = [
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-3.8-flash",
    "gemini-2.5-flash",
    "gemini-1.5-flash"
  ];

  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;

      const requestBody = {
        contents: contents,
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }]
        },
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 2048
        }
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `HTTP ${response.status}`;
        lastError = new Error(errMsg);
        continue;
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];
      const answer = candidate?.content?.parts?.[0]?.text;

      if (answer && answer.trim()) {
        return answer.trim();
      }
    } catch (err) {
      lastError = err;
    }
  }

  console.error("AI Generation Error:", lastError);
  return (
    "❌ حدث خطأ أثناء الاتصال بخدمة الذكاء الاصطناعي.\n" +
    (lastError?.message ? `⚠️ التفاصيل: ${lastError.message}\n` : "") +
    "يرجى التأكد من صلاحية مفتاح الـ API والمحاولة مجدداً."
  );
}

module.exports = {
  generateAIResponse,
  GEMINI_API_KEY
};

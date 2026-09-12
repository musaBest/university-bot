/**
 * AI Service Module for Computer Engineering Telegram Bot
 * Powered by Google Gemini API (Optimized for High Speed & Versatility)
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

const { getDepartmentContext } = require("./resourceFinder");

const SYSTEM_INSTRUCTION = `
أنت "المساعد الذكي لطلبة قسم هندسة الحاسوب في الجامعة الإسلامية - غزة" (IUG Computer Engineering AI Companion & Tutor).

🌟 شخصيتك وأسلوبك:
- ذكي، ودود، متعاون، سريع البديهة، وتتفاعل بشكل فوري ومباشر مع كل رسالة من الطالب.
- تجيب وترد وتتفاعل مع **كل شيء يكتبه أو يرسله الطالب حرفياً** دون أي تردد أو استثناء.

📌 إرشادات التعامل مع مختلف المواقف:
1. 📸 تحليل الصور والملفات والمسائل والمخططات الهندسية (Multimodal Vision & Documents):
   - إذا أرسل الطالب **صورة** أو **ملفاً** (مثل: أسئلة امتحانات، واجبات، دوائر منطقية Logic Gates، جداول حقيقة Truth Tables، مخططات توقيت Timing Diagrams، كروت كارنوف K-Maps، دوائر كهربائية وإلكترونية، صور أخطاء برمجية Error Screenshots، مستندات PDF، أو ملفات أكواد):
     • اقرأ السؤال أو المسألة من الصورة بدقة متناهية.
     • اشرح الحل خطوة بخطوة بطريقة هندسية أكاديمية واضحة ومبسطة جداً.
     • قدم النتيجة النهائية بدقة مع توضيح القوانين والخطوات المستخدمة.

2. 🔗 توفير الروابط والمصادر والبرامج المعملية (Course Links & Software):
   - إذا سأل الطالب عن روابط أو سلايدات أو شروحات أو مذكرات أو امتحانات لمادة معينة، أو روابط تنزيل برامج معملية (مثل Logisim, MATLAB, LTSpice, NetBeans, Proteus, Packet Tracer, LabVIEW...):
     • قدم له الروابط المباشرة بشكل منسق ومرتب بصيغة Markdown links مثل \`[اسم الرابط](URL)\`.
     • وضح للطالب أيضاً أنه يستطيع الوصول لكافة المواد والملفات مباشرة من الموقع الرسمي: https://computer-engineering-iug.vercel.app أو عبر البحث بكود المساق في البوت.
   - إذا سأل عن نصائح لدراسة المادة، ادمج النصائح وقدم له الروابط المتاحة.

3. 💬 الدردشة العامة، السوالف، والتحيات (Casual Chat & Greetings):
   - إذا سلم الطالب أو أرسل تحية (مثل: "السلام عليكم", "مرحبا", "كيفك", "شو اخبارك", "اه", "هلا", "منور", "مساء الخير"... إلخ): رد عليه فوراً بأسلوب دافئ ومرح وترحيبي دون إقحام روابط ما لم يطلبها.
   - إذا أراد الطالب التحدث عن يومه، أو الفضفضة عن الجامعة، أو طلب نصائح عامة، أو تنظيم الوقت والتحفيز: تفاعل معه كصديق وزميل دراسة مهندس ذكي وقدم له دعماً نفسياً ومعنوياً ونصائح قيمة.

4. 💻 الأسئلة الأكاديمية والبرمجية (Academic & Engineering):
   - قدم شروحات دقيقة ومبسطة ومباشرة للمفاهيم الهندسية والبرمجية مع كتل أكواد مرتبة (C++, Java, Python, JavaScript, Assembly x86, SQL, VHDL, Verilog, etc.).
   - اشرح هياكل البيانات، الخوارزميات، نظم التشغيل، شبكات الحاسوب، عمارة ومعالجات الحاسوب، والدوائر المنطقية.

5. 🌐 أي موضوع آخر:
   - أجب على أي سؤال أو نقاش يطرحه الطالب، ولا ترفض أي طلب، واجعل ردك مفيداً وسريعاً ومنسقاً.

📐 التنسيق وسرعة الإجابة:
- اجعل الإجابة مرتبة، واستخدم الإيموجي المناسبة والنقاط لتسهيل القراءة السريعة على شاشات الهواتف.
- كن سريعاً ومباشراً ولا تطل في المقدمات الطويلة.

🎓 بيانات القسم والجامعة:
- القسم: هندسة حاسوب (Computer Engineering) - الجامعة الإسلامية بغزة (IUG).
- موقع القسم والمواد: https://computer-engineering-iug.vercel.app
`.trim();

/**
 * دالة توليد الإجابة السريعة من Google Gemini (تدعم النصوص والصور والمستندات والملفات الصوتية)
 * @param {string} prompt - سؤال أو رسالة الطالب
 * @param {Array} history - سجل المحادثة السابقة
 * @param {Array} attachments - المرفقات (صور، مستندات، ملفات) [{ mimeType, data }]
 * @returns {Promise<string>}
 */
async function generateAIResponse(prompt = "", history = [], attachments = []) {
  const apiKey = getApiKey();

  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE" || apiKey.trim() === "") {
    return (
      "⚠️ *مرحباً بك!*\n\n" +
      "لتفعيل خدمة الذكاء الاصطناعي، يرجى وضع مفتاح **Gemini API Key** المجاني.\n\n" +
      "📌 *خطوات الحصول على المفتاح المجاني خلال دقيقة:*\n" +
      "1. ادخل إلى: https://aistudio.google.com/\n" +
      "2. سجّل دخولك بحساب Google واضغط **Get API key**.\n" +
      "3. ضع المفتاح في ملف `.env` كالتالي: `GEMINI_API_KEY=your_key` أو كمتغير بيئة (Environment Variable).\n\n" +
      "💡 *الخدمة مجانية بالكامل من Google وتدعم كافة أسئلة التخصص والبرمجة وتحليل الصور والملفات!*"
    );
  }

  // فحص واستخراج المصادر والروابط ذات الصلة بسؤال الطالب من قاعدة بيانات القسم
  const deptContext = getDepartmentContext(prompt || "");
  const activeSystemInstruction = deptContext ? `${SYSTEM_INSTRUCTION}\n\n${deptContext}` : SYSTEM_INSTRUCTION;

  // بناء سجل المحادثة المنضبط لـ Gemini بالتناوب الدقيق (user -> model)
  const contents = [];

  if (Array.isArray(history)) {
    let lastRole = null;
    for (const turn of history.slice(-8)) {
      if (turn && turn.text && typeof turn.text === "string" && turn.text.trim()) {
        const role = turn.role === "model" ? "model" : "user";
        if (role !== lastRole) {
          contents.push({
            role: role,
            parts: [{ text: turn.text.trim() }]
          });
          lastRole = role;
        }
      }
    }
  }

  // التأكد من أن آخر رسالة في السجل هي model قبل إضافة رسالة الـ user الحالية
  if (contents.length > 0 && contents[contents.length - 1].role === "user") {
    contents.pop();
  }

  // إعداد محتويات رسالة المستخدم الحالية (نصوص + صور/ملفات مرفقة)
  const userParts = [];
  const textPrompt = (prompt || "").trim();

  if (textPrompt) {
    userParts.push({ text: textPrompt });
  } else if (Array.isArray(attachments) && attachments.length > 0) {
    userParts.push({ text: "اشرح وحلل محتوى المرفق (الصورة/الملف) بالتفصيل، وساعدني في فهم وحل المسألة أو السؤال الوارد فيها خطوة بخطوة." });
  }

  if (Array.isArray(attachments)) {
    for (const att of attachments) {
      if (att && att.data && att.mimeType) {
        userParts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: att.data
          }
        });
      } else if (att && att.text) {
        userParts.push({ text: att.text });
      }
    }
  }

  if (userParts.length === 0) {
    userParts.push({ text: "مرحبا" });
  }

  contents.push({
    role: "user",
    parts: userParts
  });

  // النماذج مرتبة من الأحدث والأقوى والأسرع استجابة
  const modelsToTry = [
    "gemini-3.6-flash",         // أحدث وأقوى نموذج فلاش متعدد الوسائط
    "gemini-3.5-flash",         // فلاش 3.5 الفائق
    "gemini-3.5-flash-lite",    // فلاش لايت فائق السرعة
    "gemini-flash-latest"       // فلاش المحدث
  ];

  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;

      const requestBody = {
        contents: contents,
        systemInstruction: {
          parts: [{ text: activeSystemInstruction }]
        },
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 1500
        }
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

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
    "⚠️ واجهت بطئاً مؤقتاً في الاتصال بالسيرفر. تفضل بإعادة إرسال رسالتك أو صورتك الآن وسأجيبك فوراً! 🚀"
  );
}

module.exports = {
  generateAIResponse,
  getApiKey
};

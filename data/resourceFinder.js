/**
 * Resource Finder & Knowledge Base Retriever for IUG Computer Engineering AI
 * Searches courses, university requirements, and lab software programs
 */

const { courses } = require("../courses");
const { labPrograms } = require("../labPrograms");
const { uniRequirements } = require("../uniRequirements");

function cleanText(t) {
  return (t || "")
    .toString()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\-_]/g, " ")
    .replace(/(?:^|\s)ال/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const softwareKeywords = {
  "logisim": ["logisim", "لوجسم", "لوجيزم", "لوجسيم", "لوجيسيم", "لوجزم"],
  "matlab": ["matlab", "ماتلاب", "مات لاب"],
  "ltspice": ["ltspice", "سبايس", "سبايز", "التسبايس", "سبايس1", "lt spice"],
  "netbeans": ["netbeans", "نت بينز", "نتبينز", "جافا", "java ide"],
  "labview": ["labview", "لاب فيو", "لابفيو"],
  "pydroid": ["pydroid", "بايثون", "python"],
  "packet tracer": ["packet tracer", "باكيت تريسر", "باكت تريسر", "باكيت"],
  "proteus": ["proteus", "بروتيوس", "بروتس"],
  "quartus": ["quartus", "كورتس", "كوارتس", "كوارترز"]
};

// Course Metadata Map covering all department courses
const courseMeta = [
  { en: "Introduction to Computers", ar: "مقدمة في الحاسوب", code: "ECOM 1300", aliases: ["مقدمة حاسوب", "مقدمه حاسوب", "بايثون", "python", "intro to computers"] },
  { en: "Introduction to Computers Lab", ar: "مقدمة في الحاسوب عملي", code: "", aliases: ["معمل مقدمة حاسوب", "مقدمة حاسوب عملي", "معمل بايثون"] },
  { en: "Computer programming 1", ar: "برمجة حاسوب (1)", code: "ECOM 1301", aliases: ["برمجة 1", "برمجه 1", "جافا 1", "programming 1", "java 1"] },
  { en: "Computer Programming Lab 1", ar: "برمجة حاسوب (1) عملي", code: "", aliases: ["معمل برمجة 1", "معمل جافا 1", "programming lab 1", "java lab 1"] },
  { en: "Electric Circuits 1", ar: "دوائر كهربائية (1)", code: "EELE 2310", aliases: ["دوائر 1", "سيركت 1", "circuits 1", "electric circuits"] },
  { en: "Electric Circuits Lab 1", ar: "دوائر كهربائية (1) عملي", code: "EELE 2110", aliases: ["معمل دوائر 1", "دوائر عملي 1", "circuits lab 1"] },
  { en: "Digital Design 1", ar: "تصميم رقمي توافقي", code: "ECOM 2411", aliases: ["تصميم رقمي 1", "ديجيتال 1", "digital design 1", "digital 1", "logic design"] },
  { en: "Digital Design Lab 1", ar: "تصميم رقمي توافقي (عملي)", code: "", aliases: ["معمل تصميم رقمي 1", "معمل ديجيتال 1", "digital design lab 1"] },
  { en: "Computer programming 2", ar: "برمجة حاسوب (2)", code: "ECOM 2311", aliases: ["برمجة 2", "برمجه 2", "جافا 2", "programming 2", "java 2"] },
  { en: "Computer Programming Lab 2", ar: "برمجة حاسوب (2) عملي", code: "", aliases: ["معمل برمجة 2", "معمل جافا 2", "programming lab 2", "java lab 2"] },
  { en: "Digital Design 2", ar: "تصميم رقمي تتابعي", code: "ECOM 2421", aliases: ["تصميم رقمي 2", "ديجيتال 2", "digital design 2", "digital 2"] },
  { en: "Digital Design Lab 2", ar: "تصميم رقمي تتابعي (عملي)", code: "", aliases: ["معمل تصميم رقمي 2", "معمل ديجيتال 2", "digital design lab 2"] },
  { en: "Electronics 1", ar: "إلكترونيات (1)", code: "EELE 2320", aliases: ["الكترونيات 1", "الكترونيات", "إلكترونيات", "electronics 1"] },
  { en: "Electronics Lab 1", ar: "إلكترونيات (1) عملي", code: "EELE 2120", aliases: ["معمل إلكترونيات 1", "معمل الكترونيات 1", "electronics lab 1"] },
  { en: "Ordinary Differential Equations", ar: "معادلات تفاضلية عادية", code: "MATH 2302", aliases: ["معادلات تفاضلية", "دفرنشل", "ode", "differential equations"] },
  { en: "Discrete mathematics", ar: "رياضيات متقطعة", code: "ECOM 3411", aliases: ["رياضيات متقطعه", "دسكريت", "discrete math", "discrete mathematics"] },
  { en: "Discrete mathematics Lab", ar: "رياضيات متقطعة (عملي)", code: "", aliases: ["معمل رياضيات متقطعة", "discrete math lab"] },
  { en: "Data structures and algorithms", ar: "تراكيب بيانات وخوارزميات", code: "ECOM 3412", aliases: ["تراكيب بيانات", "هياكل بيانات", "خوارزميات", "داتا ستراكشر", "data structures", "algorithms"] },
  { en: "Data structures and algorithms Lab", ar: "تراكيب بيانات وخوارزميات (عملي)", code: "", aliases: ["معمل تراكيب بيانات", "معمل خوارزميات", "data structures lab"] },
  { en: "Linear signals and systems", ar: "إشارات وأنظمة خطية", code: "EELE 3310", aliases: ["اشارات وانظمة", "اشارات ونظم", "سيجنال", "signals and systems", "signals"] },
  { en: "Practical linear signals and systems", ar: "إشارات وأنظمة خطية (عملي)", code: "EELE 3110", aliases: ["معمل إشارات", "معمل اشارات", "signals lab"] },
  { en: "Probability and Statistics Theory", ar: "نظرية احتمالات وإحصاء", code: "EELE 3340", aliases: ["احتمالات وإحصاء", "احتمالات", "إحصاء", "probability"] },
  { en: "Computer architecture", ar: "عمارة حاسوب", code: "ECOM 3421", aliases: ["معمارية حاسوب", "عمارة الحاسوب", "اركيتكتشر", "computer architecture"] },
  { en: "Computer architecture Lab", ar: "عمارة حاسوب (عملي)", code: "", aliases: ["معمل عمارة حاسوب", "computer architecture lab"] },
  { en: "database systems", ar: "نظم قواعد بيانات", code: "ECOM 3422", aliases: ["قواعد بيانات", "داتا بيز", "داتابيز", "database", "sql"] },
  { en: "database systems Lab", ar: "نظم قواعد بيانات (عملي)", code: "", aliases: ["معمل قواعد بيانات", "database lab"] },
  { en: "digital electronics", ar: "إلكترونيات رقمية", code: "EELE 3321", aliases: ["الكترونيات رقمية", "ديجيتال الكترونكس", "digital electronics"] },
  { en: "Practical digital electronics", ar: "إلكترونيات رقمية (عملي)", code: "EELE 3121", aliases: ["معمل إلكترونيات رقمية", "digital electronics lab"] },
  { en: "Control Systems", ar: "أنظمة تحكم", code: "EELE 4310", aliases: ["انظمة تحكم", "تحكم", "كنترول", "control systems", "control"] },
  { en: "Practical Control Systems", ar: "أنظمة تحكم (عملي)", code: "EELE 4110", aliases: ["معمل تحكم", "كنترول عملي", "control lab"] },
  { en: "Operating Systems", ar: "نظم تشغيل", code: "ECOM 4313", aliases: ["نظم التشغيل", "او اس", "operating systems", "os", "linux"] },
  { en: "Microprocessor and Microcontrollers", ar: "معالجات ومتحكمات دقيقة", code: "ECOM 4312", aliases: ["معالجات دقيقة", "متحكمات دقيقة", "اسمبلي", "assembly", "microprocessor", "microcontrollers"] },
  { en: "Microprocessor and Microcontrollers Lab", ar: "معالجات ومتحكمات دقيقة (عملي)", code: "ECOM 4112", aliases: ["معمل معالجات دقيقة", "microprocessor lab"] },
  { en: "Computer Networks", ar: "شبكات حاسوب", code: "ECOM 4421", aliases: ["شبكات الحاسوب", "شبكات", "نتورك", "computer networks", "networks"] },
  { en: "Computer Networks Lab", ar: "شبكات حاسوب (عملي)", code: "", aliases: ["معمل شبكات", "شبكات عملي", "computer networks lab", "packet tracer"] },
  { en: "Embedded Systems", ar: "نظم مدموجة", code: "ECOM 4422", aliases: ["انظمة مدمجة", "نظم مدمجة", "امبيدد", "embedded systems", "embedded"] },
  { en: "Embedded Systems Lab", ar: "نظم مدموجة (عملي)", code: "", aliases: ["معمل نظم مدموجة", "معمل امبيدد", "embedded systems lab", "proteus"] },
  { en: "VHDL", ar: "لغات وصف معدات حاسوب", code: "ECOM 4423", aliases: ["في اتش دي ال", "vhdl"] },
  { en: "VHDL Lab", ar: "لغات وصف معدات حاسوب (عملي)", code: "", aliases: ["معمل vhdl", "vhdl lab", "quartus"] },
  { en: "Software Engineering", ar: "هندسة برمجيات", code: "ECOM 4424", aliases: ["هندسة البرمجيات", "سوفتوير", "software engineering"] },
  { en: "AI", ar: "ذكاء اصطناعي", code: "OPTI 5401", aliases: ["الذكاء الاصطناعي", "ai", "artificial intelligence"] },
  { en: "AI Lab", ar: "ذكاء اصطناعي (عملي)", code: "", aliases: ["معمل ذكاء اصطناعي", "ai lab"] },
  { en: "Digital & SystemVerilog", ar: "ديجيتال اند سيستم فيريلوج", code: "", aliases: ["سستم فيريلوج", "systemverilog"] },
  { en: "Network Security", ar: "أمن حاسوب وشبكات", code: "ECOM 5401", aliases: ["امن حاسوب وشبكات", "أمن شبكات", "سكيورتي", "network security"] },
  { en: "Deep learning", ar: "تعلم عميق", code: "ECOM 5448", aliases: ["التعلم العميق", "ديب ليرنينج", "deep learning"] },
  { en: "Network Security Lab", ar: "أمن حاسوب وشبكات (عملي)", code: "", aliases: ["معمل أمن شبكات", "network security lab"] },
  { en: "Digital Image Processing", ar: "معالجة صور رقمية", code: "EELE 5426", aliases: ["معالجة الصور الرقمية", "image processing"] },
  { en: "Security In Computer Systems", ar: "أمن في أنظمة الحاسوب", code: "", aliases: ["امن في انظمة الحاسوب", "security in computer systems"] },
  { en: "Selected Topics Material", ar: "مواضيع مختارة", code: "ECOM 5400", aliases: ["مواضيع مختارة", "selected topics"] },
  { en: "Distributed and parallel computerization", ar: "حوسبة متوزعة ومتوازية", code: "ECOM 5416", aliases: ["حوسبة موزعة", "parallel computing"] },
  { en: "Renewable energy systems Lab", ar: "أنظمة الطاقة المتجددة (عملي)", code: "ESMA 4106", aliases: ["طاقة متجددة", "renewable energy"] }
];

function getDepartmentContext(query) {
  const cleanQ = cleanText(query);
  const matched = [];

  // 1. Check Software / Lab Programs
  for (const [pName, pData] of Object.entries(labPrograms)) {
    const cleanP = cleanText(pName);
    const pText = pData.text || "";
    const cleanTxt = cleanText(pText);
    let hit = false;

    for (const [swKey, syns] of Object.entries(softwareKeywords)) {
      if (cleanP.includes(swKey) || cleanTxt.includes(swKey)) {
        if (syns.some(s => cleanQ.includes(cleanText(s)))) {
          hit = true;
          break;
        }
      }
    }

    if (!hit && (cleanQ.includes(cleanP) || (cleanTxt && cleanQ.includes(cleanTxt)))) {
      hit = true;
    }

    if (hit) {
      const link = pData.link || (Array.isArray(pData.links) ? pData.links.map(l => `${l.name}: ${l.url}`).join(" | ") : "");
      matched.push(`💻 **برنامج/أداة معملية (${pName.trim()}):**\n- التفاصيل: ${pText}\n- الرابط: ${link}`);
    }
  }

  // 2. Check Uni Requirements
  for (const [rName, rData] of Object.entries(uniRequirements)) {
    const arName = rData.ar || rName;
    const cleanR = cleanText(rName);
    const cleanAr = cleanText(arName);

    if (cleanQ.includes(cleanR) || cleanQ.includes(cleanAr) ||
       (cleanR.length >= 3 && cleanQ.split(" ").some(w => w.length >= 3 && cleanR.includes(w))) ||
       (cleanAr.length >= 3 && cleanQ.split(" ").some(w => w.length >= 3 && cleanAr.includes(w)))) {
      let str = `📚 **متطلب جامعي (${arName}):**\n`;
      if (rData.drive) str += `- رابط ملفات ومذكرات الدرايف: ${rData.drive}\n`;
      if (rData.youtube) str += `- رابط قائمة شروحات اليوتيوب: ${rData.youtube}\n`;
      if (rData.book) str += `- رابط الكتاب: ${rData.book}\n`;
      matched.push(str.trim());
    }
  }

  // 3. Check Courses
  for (const meta of courseMeta) {
    const allKeywords = [meta.en, meta.ar, meta.code, ...(meta.aliases || [])].map(cleanText);
    const isHit = allKeywords.some(k => k.length >= 2 && (cleanQ.includes(k) || (k.length >= 4 && cleanQ.split(" ").some(w => w.length >= 4 && k.includes(w)))));

    if (isHit) {
      for (const y in courses) {
        for (const s in courses[y]) {
          for (const c in courses[y][s]) {
            if (c.toLowerCase() === meta.en.toLowerCase()) {
              const cData = courses[y][s][c];
              let str = `📖 **مساق: ${meta.ar} (${meta.en})** - كود المساق: \`${meta.code}\` (السنة: ${y} | الفصل: ${s})\n`;
              for (const [k, v] of Object.entries(cData)) {
                if (typeof v === "string") {
                  str += `- ${k}: ${v}\n`;
                } else if (typeof v === "object" && v !== null) {
                  for (const [subK, subV] of Object.entries(v)) {
                    str += `- ${k} (${subK}): ${subV}\n`;
                  }
                }
              }
              matched.push(str.trim());
            }
          }
        }
      }
    }
  }

  if (matched.length === 0) return "";
  return "\n\n[معلومات وروابط المواد من قاعدة بيانات قسم هندسة الحاسوب]:\n" + matched.slice(0, 4).join("\n\n");
}

module.exports = {
  getDepartmentContext,
  cleanText
};


const TelegramBot = require("node-telegram-bot-api");
const { courses } = require("./courses");
const { labPrograms } = require("./labPrograms");
const { uniRequirements } = require("./uniRequirements");
const courseCodes = require("./courseCodes");
const path = require("path");

const token = "8515128167:AAGRskapdCNiU-wVosktdc-hFLrvBuBUc8o";
const bot = new TelegramBot(token, { polling: true });

const userState = {};
const processedCallbacks = new Set();
const adminMessageMap = new Map();

const ADMIN_ID = 5687891184;

require("./data/rating")(bot, userState);
const utils = require("./data/utils");

// ==========================================
// 1. خريطة البيانات والفهارس والبحث المتقدم
// ==========================================

// بيانات ومطابقات مواد السنوات (courses.js) مع الأكواد والأسماء العربية والمرادفات
const metaMap = {
  year1: {
    semester1: {
      "Scientific Research Methodology": {
        code: "ENGG 1104",
        ar: "منهجية بحث علمي",
        aliases: ["منهجية بحث", "منهجيه بحث علمي", "بحث علمي", "research methodology"]
      },
      "Introduction to Engineering": {
        code: "ENGG 1101",
        ar: "مقدمة في الهندسة",
        aliases: ["مقدمة هندسة", "مقدمه هندسه", "مقدمه في الهندسه", "intro to engineering"]
      },
      "Engineering Drawing": {
        code: "ENGG 1204",
        ar: "رسم هندسي",
        aliases: ["رسم", "اوكاد", "autocad", "drawing", "engineering drawing"]
      },
      "Calculus A": {
        code: "MATHB1301",
        ar: "تفاضل وتكامل (أ)",
        aliases: ["تفاضل وتكامل أ", "تفاضل وتكامل 1", "تفاضل أ", "تفاضل 1", "كالكولاس أ", "كالكولاس 1", "calculus 1", "calculus a", "math 1"]
      },
      "General Physics Lab A": {
        code: "PHYSA1102",
        ar: "فيزياء عامة عملية (أ)",
        aliases: ["فيزياء عامة عملي أ", "فيزياء عامه عمليه أ", "معمل فيزياء أ", "مختبر فيزياء أ", "فيزياء عملي 1", "معمل فيزياء 1", "physics lab a", "physics lab 1"]
      },
      "General Physics A": {
        code: "PHYSA1301",
        ar: "فيزياء عامة (أ)",
        aliases: ["فيزياء عامة أ", "فيزياء عامه أ", "فيزياء أ", "فيزياء 1", "physics a", "physics 1"]
      }
    },
    semester2: {
      "General Chemistry": {
        code: "CHEM 1302",
        ar: "كيمياء عامة",
        aliases: ["كيمياء عامه", "كيمياء", "chemistry", "general chemistry"]
      },
      "Workshop Technology": {
        code: "ENGG 1103",
        ar: "تقنية الورش",
        aliases: ["تقنيه الورش", "ورش", "workshop"]
      },
      "Introduction to Computers": {
        code: "ENGG 1203",
        ar: "مقدمة في الحاسوب",
        aliases: ["مقدمة حاسوب", "مقدمه في الحاسوب", "اساسيات حاسوب", "بايثون", "python", "intro to computers"]
      },
      "Introduction to Computers Lab": {
        code: "",
        ar: "مقدمة في الحاسوب (عملي)",
        aliases: ["مقدمة حاسوب عملي", "معمل مقدمة حاسوب", "معمل بايثون", "intro to computers lab", "python lab"]
      },
      "Technical English": {
        code: "ENGG 1305",
        ar: "لغة إنجليزية تقنية",
        aliases: ["لغة انجليزية تقنية", "انجليزي تقني", "لغة انجليزية", "technical english", "english"]
      },
      "Calculus B": {
        code: "MATHB1401",
        ar: "تفاضل وتكامل (ب)",
        aliases: ["تفاضل وتكامل ب", "تفاضل وتكامل 2", "تفاضل ب", "تفاضل 2", "كالكولاس ب", "كالكولاس 2", "calculus 2", "calculus b", "math 2"]
      },
      "General Physics B": {
        code: "PHYSB1301",
        ar: "فيزياء عامة (ب)",
        aliases: ["فيزياء عامة ب", "فيزياء عامه ب", "فيزياء ب", "فيزياء 2", "physics b", "physics 2"]
      }
    }
  },
  year2: {
    semester1: {
      "Computer Programming 1": {
        code: "ECOM 2401",
        ar: "برمجة حاسوب (1)",
        aliases: ["برمجة حاسوب 1", "برمجة 1", "برمجه 1", "برمجة", "جافا 1", "جافا", "java 1", "java", "programming 1", "computer programming 1"]
      },
      "Digital Design 1": {
        code: "ECOM 2411",
        ar: "تصميم رقمي تجميعي",
        aliases: ["تصميم رقمي 1", "تصميم رقمي", "ديجيتال 1", "ديجيتال", "digital design 1", "digital 1"]
      },
      "Digital Design Lab 1": {
        code: "",
        ar: "تصميم رقمي تجميعي (عملي)",
        aliases: ["معمل تصميم رقمي 1", "معمل ديجيتال 1", "تصميم رقمي عملي 1", "digital design lab 1", "logisim"]
      },
      "Computer Programming Lab 1": {
        code: "",
        ar: "برمجة حاسوب (1) عملي",
        aliases: ["معمل برمجة حاسوب 1", "معمل برمجة 1", "معمل جافا 1", "برمجة عملي 1", "programming lab 1", "java lab 1"]
      },
      "Electric Circuits 1": {
        code: "EELE 2310",
        ar: "دوائر كهربائية (1) (اتصالات وتحكم)",
        aliases: ["دوائر كهربائية 1", "دوائر كهربائيه 1", "دوائر 1", "سيركت 1", "سيركتس 1", "electric circuits 1", "circuits 1"]
      },
      "Electric Circuits Lab 1": {
        code: "EELE 2110",
        ar: "دوائر كهربائية (1) (عملي)",
        aliases: ["معمل دوائر كهربائية 1", "معمل دوائر 1", "معمل سيركت 1", "دوائر عملي 1", "circuits lab 1", "ltspice"]
      }
    },
    semester2: {
      "Linear Algebra": {
        code: "MATH 2341",
        ar: "جبر خطي",
        aliases: ["جبر خطي", "جبر", "لينيار", "لينيار الجبرا", "linear algebra"]
      },
      "Computer Programming 2": {
        code: "ECOM 2402",
        ar: "برمجة حاسوب (2)",
        aliases: ["برمجة حاسوب 2", "برمجة 2", "برمجه 2", "جافا 2", "oop", "java 2", "programming 2", "computer programming 2"]
      },
      "Digital Design 2": {
        code: "ECOM 2421",
        ar: "تصميم رقمي تتابعي",
        aliases: ["تصميم رقمي 2", "ديجيتال 2", "digital design 2", "digital 2"]
      },
      "Electronics 1": {
        code: "EELE 2320",
        ar: "إلكترونيات (1)",
        aliases: ["الكترونيات 1", "الكترونيات", "إلكترونيات", "الكترونكس 1", "electronics 1"]
      },
      "Electronics Lab 1": {
        code: "EELE 2120",
        ar: "إلكترونيات (1) عملي",
        aliases: ["معمل إلكترونيات 1", "معمل الكترونيات 1", "الكترونيات عملي 1", "electronics lab 1"]
      },
      "Ordinary Differential Equations": {
        code: "MATH 2302",
        ar: "معادلات تفاضلية عادية",
        aliases: ["معادلات تفاضلية", "معادلات تفاضليه", "دفرنشل", "ode", "differential equations"]
      },
      "Computer Programming Lab 2": {
        code: "",
        ar: "برمجة حاسوب (2) عملي",
        aliases: ["معمل برمجة حاسوب 2", "معمل برمجة 2", "معمل جافا 2", "برمجة عملي 2", "programming lab 2", "java lab 2"]
      },
      "Digital Design Lab 2": {
        code: "",
        ar: "تصميم رقمي تتابعي (عملي)",
        aliases: ["معمل تصميم رقمي 2", "معمل ديجيتال 2", "تصميم رقمي عملي 2", "digital design lab 2"]
      }
    }
  },
  year3: {
    semester1: {
      "Discrete mathematics": {
        code: "ECOM 3411",
        ar: "رياضيات متقطعة",
        aliases: ["رياضيات متقطعه", "دسكريت", "دسجريت", "ديسكربت", "discrete math", "discrete mathematics"]
      },
      "Discrete mathematics Lab": {
        code: "",
        ar: "رياضيات متقطعة (عملي)",
        aliases: ["معمل رياضيات متقطعة", "رياضيات متقطعة عملي", "discrete math lab"]
      },
      "Data structures and algorithms": {
        code: "ECOM 3412",
        ar: "تراكيب بيانات وخوارزميات",
        aliases: ["تراكيب بيانات", "خوارزميات", "هياكل بيانات", "داتا ستراكشر", "data structures", "algorithms", "data structures and algorithms"]
      },
      "Data structures and algorithms Lab": {
        code: "",
        ar: "تراكيب بيانات وخوارزميات (عملي)",
        aliases: ["معمل تراكيب بيانات وخوارزميات", "معمل خوارزميات", "معمل تراكيب بيانات", "data structures lab"]
      },
      "Linear signals and systems": {
        code: "EELE 3310",
        ar: "إشارات وأنظمة خطية",
        aliases: ["اشارات وانظمة خطية", "اشارات وانظمه خطيه", "اشارات ونظم", "إشارات ونظم", "سيجنال", "signals and systems", "linear signals", "signals"]
      },
      "Practical linear signals and systems": {
        code: "EELE 3110",
        ar: "إشارات وأنظمة خطية (عملي)",
        aliases: ["معمل إشارات وأنظمة خطية", "معمل اشارات", "اشارات عملي", "signals lab"]
      },
      "Probability and Statistics Theory": {
        code: "EELE 3340",
        ar: "نظرية احتمالات وإحصاء",
        aliases: ["احتمالات وإحصاء", "احتمالات واحصاء", "احتمالات", "إحصاء", "احصاء", "بروبابيليتي", "probability and statistics", "probability"]
      }
    },
    semester2: {
      "Computer architecture": {
        code: "ECOM 3421",
        ar: "عمارة حاسوب",
        aliases: ["معمارية حاسوب", "عمارة الحاسوب", "اركيتكتشر", "computer architecture", "architecture"]
      },
      "Computer architecture Lab": {
        code: "",
        ar: "عمارة حاسوب (عملي)",
        aliases: ["معمل عمارة حاسوب", "عمارة حاسوب عملي", "computer architecture lab"]
      },
      "database systems": {
        code: "ECOM 3422",
        ar: "نظم قواعد بيانات",
        aliases: ["قواعد بيانات", "داتا بيز", "داتابيز", "database", "database systems", "db"]
      },
      "database systems Lab": {
        code: "",
        ar: "نظم قواعد بيانات (عملي)",
        aliases: ["معمل قواعد بيانات", "معمل داتابيز", "قواعد بيانات عملي", "database lab", "sql"]
      },
      "digital electronics": {
        code: "EELE 3321",
        ar: "إلكترونيات رقمية",
        aliases: ["الكترونيات رقمية", "الكترونيات رقميه", "ديجيتال الكترونكس", "digital electronics"]
      },
      "Practical digital electronics": {
        code: "EELE 3121",
        ar: "إلكترونيات رقمية (عملي)",
        aliases: ["معمل إلكترونيات رقمية", "معمل الكترونيات رقمية", "الكترونيات رقمية عملي", "digital electronics lab"]
      },
      "Linear control systems": {
        code: "EELE 3360",
        ar: "أنظمة التحكم الخطية",
        aliases: ["انظمة التحكم الخطية", "انظمة تحكم خطية", "انظمة تحكم", "كنترول", "control systems", "control"]
      },
      "Linear control systems practical": {
        code: "EELE 3160",
        ar: "أنظمة التحكم الخطية (عملي)",
        aliases: ["معمل أنظمة التحكم الخطية", "معمل تحكم", "انظمة تحكم عملي", "control lab", "labview"]
      }
    }
  },
  year4: {
    semester1: {
      "Operating Systems": {
        code: "ECOM 4401",
        ar: "نظم تشغيل",
        aliases: ["انظمة تشغيل", "انظمة التشغيل", "نظم التشغيل", "او اس", "operating systems", "os"]
      },
      "Operating Systems Lab": {
        code: "",
        ar: "نظم تشغيل (عملي)",
        aliases: ["معمل نظم تشغيل", "معمل لينكس", "نظم تشغيل عملي", "operating systems lab", "linux", "ubuntu"]
      },
      "Data Communication": {
        code: "ECOM 4411",
        ar: "اتصالات بيانات",
        aliases: ["اتصالات البيانات", "داتا كوم", "data communication", "data communications", "data comm"]
      },
      "Data Communication Lab": {
        code: "",
        ar: "اتصالات بيانات (عملي)",
        aliases: ["معمل اتصالات بيانات", "اتصالات بيانات عملي", "data communication lab", "wireshark"]
      },
      "Assembly Language": {
        code: "ECOM 4412",
        ar: "لغة تجميع",
        aliases: ["لغة التجميع", "اسمبلي", "اسمبلي لانجوج", "assembly language", "assembly"]
      },
      "Assembly Language Lab": {
        code: "",
        ar: "لغة تجميع (عملي)",
        aliases: ["معمل لغة تجميع", "معمل اسمبلي", "لغة تجميع عملي", "assembly lab"]
      },
      "تدريب عملي(250)ساعة": {
        code: "ECOM 5000",
        ar: "تدريب عملي (250 ساعة)",
        aliases: ["تدريب عملي", "تدريب ميداني", "تدريب", "تدريب 250 ساعة", "practical training", "internship"]
      }
    },
    semester2: {
      "Computer Networks": {
        code: "ECOM 4421",
        ar: "شبكات حاسوب",
        aliases: ["شبكات الحاسوب", "شبكات", "نتورك", "computer networks", "networks"]
      },
      "Computer Networks Lab": {
        code: "",
        ar: "شبكات حاسوب (عملي)",
        aliases: ["معمل شبكات حاسوب", "معمل شبكات", "شبكات عملي", "computer networks lab", "packet tracer"]
      },
      "Embedded Systems": {
        code: "ECOM 4422",
        ar: "نظم مدموجة",
        aliases: ["انظمة مدمجة", "انظمة مدموجة", "نظم مدمجة", "امبيدد", "امبيدد سيستمز", "embedded systems", "embedded"]
      },
      "Embedded Systems Lab": {
        code: "",
        ar: "نظم مدموجة (عملي)",
        aliases: ["معمل نظم مدموجة", "معمل امبيدد", "نظم مدمجة عملي", "embedded systems lab", "proteus"]
      },
      "VHDL": {
        code: "ECOM 4423",
        ar: "لغات وصف معدات حاسوب",
        aliases: ["في اتش دي ال", "vhdl", "hardware description language"]
      },
      "VHDL Lab": {
        code: "",
        ar: "لغات وصف معدات حاسوب (عملي)",
        aliases: ["معمل vhdl", "معمل لغات وصف معدات حاسوب", "vhdl lab", "quartus"]
      },
      "Software Engineering": {
        code: "ECOM 4424",
        ar: "هندسة برمجيات",
        aliases: ["هندسة البرمجيات", "سوفتوير", "software engineering", "software"]
      }
    }
  },
  year5: {
    semester1: {
      "AI": {
        code: "OPTI 5401",
        ar: "ذكاء اصطناعي",
        aliases: ["الذكاء الاصطناعي", "ai", "artificial intelligence"]
      },
      "AI Lab": {
        code: "",
        ar: "ذكاء اصطناعي (عملي)",
        aliases: ["معمل ذكاء اصطناعي", "ذكاء اصطناعي عملي", "ai lab"]
      },
      "Digital & SystemVerilog": {
        code: "",
        ar: "ديجيتال اند سيستم فيريلوج",
        aliases: ["سستم فيريلوج", "سيستم فيريلوج", "systemverilog", "system verilog", "digital & systemverilog"]
      },
      "Network Security": {
        code: "ECOM 5401",
        ar: "أمن حاسوب وشبكات",
        aliases: ["امن حاسوب وشبكات", "أمن شبكات", "امن شبكات", "سكيورتي", "network security", "cyber security"]
      },
      "Deep learning": {
        code: "ECOM 5448",
        ar: "تعلم عميق",
        aliases: ["التعلم العميق", "ديب ليرنينج", "ديب ليرننج", "deep learning"]
      },
      "Network Security Lab": {
        code: "",
        ar: "أمن حاسوب وشبكات (عملي)",
        aliases: ["معمل أمن شبكات", "معمل امن شبكات", "امن شبكات عملي", "network security lab"]
      },
      "Digital Image Processing": {
        code: "EELE 5426",
        ar: "معالجة صور رقمية",
        aliases: ["معالجة الصور الرقمية", "معالجة صور", "ايمج بروسيسنج", "image processing", "digital image processing"]
      }
    },
    semester2: {
      "Security In Computer Systems": {
        code: "",
        ar: "أمن في أنظمة الحاسوب",
        aliases: ["امن في انظمة الحاسوب", "امن انظمة", "security in computer systems"]
      },
      "Selected Topics Material": {
        code: "ECOM 5400",
        ar: "مواضيع مختارة",
        aliases: ["مواضيع مختارة في هندسة الحاسوب", "مواضيع مختاره", "selected topics"]
      },
      "Distributed and parallel computerization": {
        code: "ECOM 5416",
        ar: "حوسبة متوزعة ومتوازية",
        aliases: ["حوسبة موزعة ومتوازية", "حوسبة متوازية وموزعة", "حوسبة متوازية", "distributed and parallel", "parallel computing"]
      },
      "Renewable energy systems Lab": {
        code: "ESMA 4106",
        ar: "أنظمة الطاقة المتجددة (عملي)",
        aliases: ["أنظمة الطاقة المتجددة", "انظمة الطاقة المتجددة", "معمل طاقة متجددة", "طاقة متجددة", "renewable energy"]
      }
    }
  }
};

// فهرس متطلبات الجامعة (uniRequirements.js)
const uniReqMeta = {
  "قرآن كريم 1": { code: "QURN 1101", aliases: ["قران كريم 1", "قران 1", "قرآن 1", "قران كريم (1)", "قرآن كريم (1)"] },
  "قرآن كريم 2": { code: "QURN 2101", aliases: ["قران كريم 2", "قران 2", "قرآن 2", "قران كريم (2)", "قرآن كريم (2)"] },
  "قرآن كريم 3": { code: "QURN 3101", aliases: ["قران كريم 3", "قران 3", "قرآن 3", "قران كريم (3)", "قرآن كريم (3)"] },
  "قرآن كريم 4": { code: "QURN 4102", aliases: ["قران كريم 4", "قران 4", "قرآن 4", "قران كريم (4)", "قرآن كريم (4)"] },
  "دراسات في العقيدة": { code: "AQID 3306", aliases: ["عقيدة", "العقيدة", "دراسات في العقيده", "عقيده"] },
  "دراسات في الفقه": { code: "SHAR 1202", aliases: ["فقه", "الفقه", "دراسات فقه", "دراسات في الفقه"] },
  "دراسات في الحديث": { code: "HADT 4204", aliases: ["حديث", "الحديث", "دراسات في الحديث الشريف", "حديث شريف"] },
  "دراسات في السيرة النبوية": { code: "HADT 1202", aliases: ["سيرة", "السيرة", "دراسات في السيرة", "سيره نبوية", "سيرة نبوية"] },
  "دراسات في القرآن وعلومه": { code: "QURN 2201", aliases: ["علوم القران", "دراسات في القرآن وعلمه", "دراسات في القران وعلومه", "قران وعلومه"] },
  "دراسات فلسطينية": { code: "", aliases: ["دراسات فلسطينيه", "فلسطينية", "فلسطينيه", "قضية فلسطينية", "تاريخ فلسطين"] },
  "النظم الإسلامية": { code: "SHAR 2207", aliases: ["النظم الاسلامية", "نظم اسلامية", "النظم الاسلاميه", "نظم اسلاميه"] },
  "حاضر العالم الإسلامي": { code: "AQID 3201", aliases: ["حاضر العالم الاسلامي", "حاضر", "حاضر العالم"] },
  "نحو وصرف": { code: "ARAB 1202", aliases: ["اللغة العربية (نحو وصرف)", "عربي", "لغة عربية", "لغه عربيه", "اللغة العربية", "نحو"] },
  "إسعافات أولية": { code: "", aliases: ["اسعافات اولية", "اسعافات اوليه", "اسعافات", "إسعافات"] }
};

// إنشاء فهرس سريع للبحث في جميع المواد
const courseCatalog = [];
for (const year in courses) {
  for (const semester in courses[year]) {
    for (const subject in courses[year][semester]) {
      const meta = metaMap[year]?.[semester]?.[subject] || {};
      courseCatalog.push({
        id: courseCatalog.length,
        type: "course",
        name: subject,
        arName: meta.ar || "",
        code: meta.code || "",
        year: year,
        semester: semester,
        aliases: meta.aliases || [],
        data: courses[year][semester][subject]
      });
    }
  }
}

// دوال تنظيف وتطبيع النصوص للبحث الذكي
function normalizeText(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\(\)\-\_\,\.\:\;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCode(text) {
  if (!text) return "";
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// دالة محرك البحث الشامل
function searchAll(query) {
  const qNorm = normalizeText(query);
  const qCode = normalizeCode(query);
  const isLikelyCode = /^[a-z]{2,5}\d{3,4}[a-z]?$/i.test(qCode) || /^\d{4}$/.test(qCode);
  const results = [];

  // 1. البحث في مواد التخصص (courses.js)
  for (const item of courseCatalog) {
    let score = 0;
    const subNorm = normalizeText(item.name);
    const arNorm = normalizeText(item.arName);
    const codeNorm = normalizeCode(item.code);

    if (isLikelyCode && codeNorm) {
      if (qCode === codeNorm) {
        score += 200;
      } else if (codeNorm.includes(qCode) || qCode.includes(codeNorm)) {
        score += 150;
      }
    }

    if (qNorm === subNorm || qNorm === arNorm) {
      score += 120;
    } else if (subNorm.startsWith(qNorm) || arNorm.startsWith(qNorm)) {
      score += 80;
    } else if (subNorm.includes(qNorm) || arNorm.includes(qNorm)) {
      score += 60;
    } else if (qNorm.length >= 2) {
      for (const alias of item.aliases) {
        const aNorm = normalizeText(alias);
        if (aNorm === qNorm) {
          score += 100;
          break;
        }
        if (aNorm.startsWith(qNorm)) {
          score += 70;
          break;
        }
        if (aNorm.includes(qNorm)) {
          score += 50;
          break;
        }
      }
    }

    if (score > 0) {
      results.push({ ...item, score });
    }
  }

  // 2. البحث في متطلبات الجامعة (uniRequirements.js)
  for (const [reqName, reqData] of Object.entries(uniRequirements)) {
    const meta = uniReqMeta[reqName] || {};
    const code = meta.code || "";
    const aliases = meta.aliases || [];

    let score = 0;
    const nameNorm = normalizeText(reqName);
    const codeNorm = normalizeCode(code);

    if (isLikelyCode && codeNorm) {
      if (qCode === codeNorm) {
        score += 200;
      } else if (codeNorm.includes(qCode) || qCode.includes(codeNorm)) {
        score += 150;
      }
    }

    if (nameNorm === qNorm) {
      score += 120;
    } else if (nameNorm.startsWith(qNorm)) {
      score += 80;
    } else if (nameNorm.includes(qNorm)) {
      score += 60;
    } else if (qNorm.length >= 2) {
      for (const alias of aliases) {
        const aNorm = normalizeText(alias);
        if (aNorm === qNorm) {
          score += 100;
          break;
        }
        if (aNorm.startsWith(qNorm)) {
          score += 70;
          break;
        }
        if (aNorm.includes(qNorm)) {
          score += 50;
          break;
        }
      }
    }

    if (score > 0) {
      results.push({
        type: "uni_req",
        name: reqName,
        code: code,
        data: reqData,
        score: score
      });
    }
  }

  // 3. البحث في برامج المختبرات (labPrograms.js)
  for (const [labName, labData] of Object.entries(labPrograms)) {
    let score = 0;
    const nameNorm = normalizeText(labName);
    const descNorm = normalizeText(labData.text || "");

    if (nameNorm === qNorm) {
      score += 100;
    } else if (nameNorm.includes(qNorm) || descNorm.includes(qNorm)) {
      score += 50;
    }

    if (score > 0) {
      results.push({
        type: "lab",
        name: labName.trim(),
        data: labData,
        score: score
      });
    }
  }

  // فرز النتائج تنازلياً حسب درجة المطابقة
  results.sort((a, b) => b.score - a.score);
  return results;
}

// دالة لتوليد عناوين الأقسام بأيقونات واضحة
function getSectionTitle(key) {
  const k = key.trim();
  if (/tips/i.test(k)) return "💡 نصائح وتوجيهات للدراسة (Tips)";
  if (/book/i.test(k)) return "📖 الكتاب والحلول (Book & Solutions)";
  if (/lecture/i.test(k)) return "🎬 المحاضرات والشروحات (Lectures)";
  if (/slide.*chapter|chapter.*slide/i.test(k)) return "📑 السلايدات والشباتر (Slides & Chapters)";
  if (/slide/i.test(k)) return "📑 السلايدات (Slides)";
  if (/chapter/i.test(k)) return "📑 الشباتر (Chapters)";
  if (/lab/i.test(k)) return "🧪 المعمل / المختبر (Lab)";
  if (/recorded video/i.test(k)) return "🎥 فيديوهات مسجلة (Recorded Videos)";
  if (/discussion|problem/i.test(k)) return "📝 المناقشات والمسائل والحلول (Discussion & Problems)";
  if (/quiz|exam|homework/i.test(k)) return "📋 كويزات وامتحانات وواجبات (Quizzes & Exams)";
  return `🔗 ${k}`;
}

// تنسيق وعرض تفاصيل المادة بالكامل
function formatCourseDetails(courseItem) {
  const title = courseItem.arName
    ? `📚 ${courseItem.name} | ${courseItem.arName}`
    : `📚 ${courseItem.name}`;
  const codeText = courseItem.code ? `\n🏷️ كود المساق: ${courseItem.code}` : "";

  let reply = `${title}${codeText}\n━━━━━━━━━━━━━━━━━━━━\n\n`;

  for (const [key, value] of Object.entries(courseItem.data)) {
    const sectionTitle = getSectionTitle(key);

    if (!value || value === "لا توجد روابط") {
      reply += `${sectionTitle}:\n⚠️ لا توجد روابط حالياً\n\n`;
      continue;
    }

    if (typeof value === "string") {
      reply += `${sectionTitle}:\n${value}\n\n`;
    } else if (typeof value === "object" && value !== null) {
      reply += `${sectionTitle}:\n`;
      for (const [subKey, subVal] of Object.entries(value)) {
        reply += `  • ${subKey}:\n    ${subVal}\n`;
      }
      reply += "\n";
    }
  }

  return reply;
}

// دالة إرسال تفاصيل المادة مع الأزرار
function sendCourseDetails(chatId, courseItem, isTreeNav = false) {
  const message = formatCourseDetails(courseItem);

  const keyboard = [
    [{ text: "📤 ارفع ملفاتك المهمة للمادة لكي يستفيد غيرنا", url: "https://t.me/+lUyeZmUh7KpjM2Fi" }]
  ];

  if (isTreeNav) {
    keyboard.push([{ text: "🔙 رجوع للفصول", callback_data: "back_semesters" }]);
  }
  keyboard.push([{ text: "🏠 العودة للقائمة الرئيسية", callback_data: "main_menu" }]);

  bot.sendMessage(chatId, message, {
    reply_markup: { inline_keyboard: keyboard }
  });
}

// دالة إرسال تفاصيل متطلب الجامعة
function sendUniReqDetails(chatId, reqName, reqItem) {
  const buttons = [
    [
      { text: "📁 ملفات المادة (Drive)", url: reqItem.drive },
      { text: "🎬 المحاضرات (YouTube)", url: reqItem.youtube }
    ],
    [{ text: "🔙 رجوع لمتطلبات الجامعة", callback_data: "show_uni_reqs" }],
    [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
  ];

  bot.sendMessage(chatId, `📖 *${reqName}*\n\nاختر نوع المصدر المطلوب من الأزرار أدناه:`, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: buttons }
  });
}

// دالة إرسال تفاصيل مادة المختبر
function sendLabDetails(chatId, labName, item) {
  const message = "📚 " + labName + "\n\n" + (item.text || "");

  if (item.link) {
    const buttons = [
      [{ text: "🔗 رابط التنزيل / الشرح", url: item.link }],
      [{ text: "🔙 رجوع لبرامج المختبرات", callback_data: "open_lab_programs" }],
      [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
    ];
    bot.sendMessage(chatId, message, {
      reply_markup: { inline_keyboard: buttons }
    });
  } else if (item.links) {
    const buttons = item.links.map((l) => [{ text: l.name, url: l.url }]);
    buttons.push([{ text: "🔙 رجوع لبرامج المختبرات", callback_data: "open_lab_programs" }]);
    buttons.push([{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]);

    bot.sendMessage(chatId, message, {
      reply_markup: { inline_keyboard: buttons }
    });
  } else if (item.file) {
    const filePath = path.join(__dirname, item.file);
    bot.sendDocument(chatId, filePath, { caption: message });
  }
}

// جهات التواصل
const contacts = {
  "القبول والتسجيل": [
    { name: "د. زهير الكردي", phone: "+970599332109" },
    { name: "أ. توفيق حرز الله", phone: "+972599167405" },
    { name: "أ. ألفت أبو صفية", phone: "+970599946275" },
    { name: "أ. إيمان علي", phone: "+972599623259" }
  ],
  "شؤون الطلبة": [
    { name: "رقم 1", phone: "+972595630401" },
    { name: "رقم 2", phone: "+972598923793" },
    { name: "رقم 3", phone: "+972599332109" }
  ],
  "الشؤون الأكاديمية": [
    { name: "أ. مصطفى بروخ", phone: "+972597246896" }
  ],
  "الشؤون المالية": [
    { name: "أ. إبراهيم فرحات", phone: "+970594702230" },
    { name: "أ. خالد طبش", phone: "+972599834582" },
    { name: "أ. هاني مطر", phone: "+972599261992" }
  ],
  "المنح": [
    { name: "أ. محمد أبو قضامة", phone: "+972592628297" },
    { name: "م. علاء الهاشيم", phone: "+970599403090" },
    { name: "رقم إضافي", phone: "+972599489703" }
  ],
  "الدعم الفني": [
    { name: "أ. محمد حرز الله", phone: "+970599051274" },
    { name: "م. محمد الحلو", phone: "+90598066646" }
  ],
  "سكرتير كلية الهندسة": [
    { name: "أ. بسام نصار", phone: "+972599465605" }
  ],
  "رقم الجامعة تركيا": [
    { name: "الجامعة", phone: "+905014613767" }
  ],
  "التدريب الميداني": [
    { name: "م. رنا عبده", phone: "+972599630429" }
  ]
};

// القائمة الرئيسية
function showMainMenu(chatId, name = "طالب") {
  bot.sendMessage(chatId, "مرحباً " + name + "!\nاختر من القائمة التالية أو أرسل اسم/كود المادة مباشرة للبحث:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔍 البحث عن مادة / كود مساق", callback_data: "start_search" }],
        [{ text: "💬 تواصل مع الأدمن / إرسال استفسار أو ملف", callback_data: "contact_admin" }],
        [{ text: "🏛️ متطلبات الجامعة الاسلامية", callback_data: "show_uni_reqs" }],
        [{ text: "📚 عرض كل السنوات", callback_data: "show_years" }],
        [{ text: "🧪 روابط تنزيل برامج المختبرات للمواد ", callback_data: "open_lab_programs" }],
        [{ text: "📊 احسب معدلك الفصلي والتراكمي", callback_data: "gpa_file" }],
        [{ text: "📞 جهات التواصل المهمة", callback_data: "show_contacts" }],
        [{ text: "📷 عرض المواد المعتمدة على بعض", callback_data: "show_prerequisites" }],
        [{ text: "📄 خطة هندسة الحاسوب 5 سنوات", callback_data: "plan5" }],
        [{ text: "🖼 خطة هندسة الحاسوب 4 سنوات", callback_data: "plan4" }],
        [{ text: "🌐 يمكنك استخدام الموقع الالكتروني", url: "https://computer-engineering-iug.vercel.app" }]
      ]
    }
  });
}

// أمر البدء /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || "طالب";
  userState[chatId] = { name: name };
  showMainMenu(chatId, name);
});

// التعامل مع جميع أزرار Callback Queries
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (processedCallbacks.has(query.id)) return;
  processedCallbacks.add(query.id);

  bot.answerCallbackQuery(query.id);
  setTimeout(() => processedCallbacks.delete(query.id), 5000);

  // القائمة الرئيسية
  if (data === "main_menu") {
    if (userState[chatId]) userState[chatId].waitingAdminMessage = false;
    const name = userState[chatId]?.name || "طالب";
    showMainMenu(chatId, name);
    return;
  }

  // تواصل مع الأدمن
  if (data === "contact_admin") {
    userState[chatId] = { ...userState[chatId], waitingAdminMessage: true };
    bot.sendMessage(
      chatId,
      "💬 *تواصل مع الأدمن / إرسال استفسار أو ملف*\n━━━━━━━━━━━━━━━━━━━━\n\nأهلاً بك! يمكنك الآن كتابة استفسارك أو إرسال أي ملف (مستند PDF، صورة، تسجيل صوتي، كود، إلخ) وسيتم إيصاله للأدمن مباشرة ليقوم بالرد عليك.\n\n👇 *أرسل رسالتك أو ملفك الآن في المحادثة:*",
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ إلغاء والعودة للقائمة الرئيسية", callback_data: "cancel_contact_admin" }]
          ]
        }
      }
    );
    return;
  }

  // إلغاء التواصل مع الأدمن
  if (data === "cancel_contact_admin") {
    if (userState[chatId]) userState[chatId].waitingAdminMessage = false;
    const name = userState[chatId]?.name || "طالب";
    showMainMenu(chatId, name);
    return;
  }

  // ضغط الأدمن على زر الرد على الطالب
  if (data.startsWith("admin_reply_")) {
    const studentChatId = data.replace("admin_reply_", "");
    userState[ADMIN_ID] = { ...userState[ADMIN_ID], replyingToStudent: studentChatId };
    bot.sendMessage(
      chatId,
      `✍️ *الرد على الطالب:*\n🆔 الآيدي: \`${studentChatId}\`\n\nأرسل الآن ردك (رسالة نصية، صورة، ملف، تسجيل صوتي) وسيتم تسليمها للطالب مباشرة:`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ إلغاء الرد", callback_data: "cancel_admin_reply" }]
          ]
        }
      }
    );
    return;
  }

  // إلغاء رد الأدمن
  if (data === "cancel_admin_reply") {
    if (userState[ADMIN_ID]) userState[ADMIN_ID].replyingToStudent = null;
    bot.sendMessage(chatId, "تم إلغاء عملية الرد.");
    return;
  }

  // زر البدء بالبحث
  if (data === "start_search") {
    bot.sendMessage(
      chatId,
      "🔍 أرسل اسم المادة أو كود المساق مباشرة في المحادثة:\n(مثال: `ECOM 2401` أو `برمجة` أو `Calculus` أو `شبكات`)",
      { parse_mode: "Markdown" }
    );
    return;
  }

  // عرض قائمة متطلبات الجامعة
  if (data === "show_uni_reqs") {
    const buttons = Object.keys(uniRequirements).map((sub) => [
      { text: "📖 " + sub, callback_data: "req_" + sub }
    ]);
    buttons.push([{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]);

    bot.sendMessage(chatId, "🏛️ اختر مساق متطلبات الجامعة المطلوب:", {
      reply_markup: { inline_keyboard: buttons }
    });
    return;
  }

  // اختيار مادة من متطلبات الجامعة
  if (data.startsWith("req_")) {
    const subjectName = data.replace("req_", "");
    const item = uniRequirements[subjectName];

    if (!item) {
      bot.sendMessage(chatId, "❌ حدث خطأ، المادة غير موجودة");
      return;
    }
    sendUniReqDetails(chatId, subjectName, item);
    return;
  }

  // متطلب جامعة من نتائج البحث
  if (data.startsWith("find_req_")) {
    const reqName = data.replace("find_req_", "");
    const item = uniRequirements[reqName];
    if (item) {
      sendUniReqDetails(chatId, reqName, item);
    }
    return;
  }

  // برنامج مختبر من نتائج البحث
  if (data.startsWith("find_lab_")) {
    const labName = data.replace("find_lab_", "");
    const item = labPrograms[labName];
    if (item) {
      sendLabDetails(chatId, labName, item);
    }
    return;
  }

  // ملف المعدل
  if (data === "gpa_file") {
    const filePath = path.join(__dirname, "gpa_calculator.xlsx");
    bot.sendDocument(chatId, filePath, {
      caption: "📊 ملف حساب المعدل الفصلي والتراكمي"
    });
    return;
  }

  // خطة 5 سنوات
  if (data === "plan5") {
    const filePath = path.join(__dirname, "plan_5years.pdf");
    bot.sendDocument(chatId, filePath, {
      caption: "📄 خطة هندسة الحاسوب - نظام 5 سنوات"
    });
    return;
  }

  // خطة 4 سنوات
  if (data === "plan4") {
    const img1 = path.join(__dirname, "plan4_1.png");
    const img2 = path.join(__dirname, "plan4_2.png");
    bot.sendPhoto(chatId, img1);
    bot.sendPhoto(chatId, img2);
    return;
  }

  // المتطلبات المعتمدة
  if (data === "show_prerequisites") {
    const imagePath = path.join(__dirname, "prerequisites.png");
    bot.sendPhoto(chatId, imagePath, {
      caption: "📷 المواد المعتمدة على بعضها"
    });
    return;
  }

  // عرض السنوات
  if (data === "show_years" || data === "back_years") {
    const buttons = Object.keys(courses).map((year) => [
      { text: year, callback_data: "year_" + year }
    ]);
    buttons.push([{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]);

    bot.sendMessage(chatId, "اختر السنة:", {
      reply_markup: { inline_keyboard: buttons }
    });
    return;
  }

  // جهات الاتصال
  if (data === "show_contacts") {
    const buttons = Object.keys(contacts).map((c) => [
      { text: c, callback_data: "contact_" + c }
    ]);
    buttons.push([{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]);

    bot.sendMessage(chatId, "اختر الجهة:", {
      reply_markup: { inline_keyboard: buttons }
    });
    return;
  }

  // تفاصيل جهة الاتصال
  if (data.startsWith("contact_")) {
    const name = data.replace("contact_", "");
    const buttons = contacts[name].map((c) => [
      { text: c.name, url: "https://wa.me/" + c.phone.replace(/\D/g, "") }
    ]);
    buttons.push(
      [{ text: "🔙 رجوع لجهات الاتصال", callback_data: "show_contacts" }],
      [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
    );

    bot.sendMessage(chatId, "📞 " + name + "\nاضغط على الاسم للتواصل:", {
      reply_markup: { inline_keyboard: buttons }
    });
    return;
  }

  // عرض مواد المختبرات
  if (data === "open_lab_programs") {
    const buttons = Object.keys(labPrograms).map((name) => [
      { text: name, callback_data: "labItem_" + name }
    ]);
    buttons.push([{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]);

    bot.sendMessage(chatId, "🧪 اختر المادة:", {
      reply_markup: { inline_keyboard: buttons }
    });
    return;
  }

  // اختيار مادة من المختبر
  if (data.startsWith("labItem_")) {
    const name = data.replace("labItem_", "");
    const item = labPrograms[name];

    if (!item) {
      bot.sendMessage(chatId, "❌ حدث خطأ، المادة غير موجودة");
      return;
    }
    sendLabDetails(chatId, name, item);
    return;
  }

  // اختيار السنة
  if (data.startsWith("year_")) {
    const year = data.replace("year_", "");
    userState[chatId] = { year: year };

    const semesters = Object.keys(courses[year]).map((s) => [
      { text: s, callback_data: "semester_" + s }
    ]);
    semesters.push(
      [{ text: "🔙 رجوع للسنوات", callback_data: "back_years" }],
      [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
    );

    bot.sendMessage(chatId, "اختر الفصل:", {
      reply_markup: { inline_keyboard: semesters }
    });
    return;
  }

  // الرجوع للفصول
  if (data === "back_semesters") {
    const year = userState[chatId]?.year;
    if (!year) return;

    const semesters = Object.keys(courses[year]).map((s) => [
      { text: s, callback_data: "semester_" + s }
    ]);
    semesters.push(
      [{ text: "🔙 رجوع للسنوات", callback_data: "back_years" }],
      [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
    );

    bot.sendMessage(chatId, "اختر الفصل:", {
      reply_markup: { inline_keyboard: semesters }
    });
    return;
  }

  // اختيار فصل
  if (data.startsWith("semester_")) {
    const semester = data.replace("semester_", "");
    const year = userState[chatId]?.year;

    if (!year) {
      bot.sendMessage(chatId, "حدث خطأ، اختر السنة أولاً.");
      return;
    }

    userState[chatId].semester = semester;

    const subjects = Object.keys(courses[year][semester]).map((sub) => [
      { text: sub, callback_data: "subject_" + sub }
    ]);
    subjects.push(
      [{ text: "🔙 رجوع للفصول", callback_data: "back_semesters" }],
      [{ text: "🏠 العودة للقائمة الرئيسية", callback_data: "main_menu" }]
    );

    bot.sendMessage(chatId, "اختر المادة:", {
      reply_markup: { inline_keyboard: subjects }
    });
    return;
  }

  // اختيار مادة من شجرة السنوات
  if (data.startsWith("subject_")) {
    const subject = data.replace("subject_", "");
    const state = userState[chatId];

    if (!state?.year || !state?.semester) {
      bot.sendMessage(chatId, "حدث خطأ. اختر السنة والفصل أولاً.");
      return;
    }
    state.currentSubject = subject;

    const courseData = courses[state.year]?.[state.semester]?.[subject];
    if (!courseData) {
      bot.sendMessage(chatId, "❌ حدث خطأ، لم يتم العثور على المادة.");
      return;
    }

    const meta = metaMap[state.year]?.[state.semester]?.[subject] || {};
    const courseItem = {
      name: subject,
      arName: meta.ar || "",
      code: meta.code || "",
      year: state.year,
      semester: state.semester,
      data: courseData
    };

    sendCourseDetails(chatId, courseItem, true);
    return;
  }

  // اختيار مادة من فهرس نتائج البحث عبر المعرّف
  if (data.startsWith("find_c_")) {
    const courseId = parseInt(data.replace("find_c_", ""), 10);
    const courseItem = courseCatalog[courseId];

    if (courseItem) {
      userState[chatId] = {
        year: courseItem.year,
        semester: courseItem.semester,
        currentSubject: courseItem.name
      };
      sendCourseDetails(chatId, courseItem, false);
      return;
    }
  }

  // للتوافق مع أزرار البحث القديمة
  if (data.startsWith("find_subject_")) {
    const subjectName = data.replace("find_subject_", "");
    const match = courseCatalog.find(
      (c) => c.name.toLowerCase() === subjectName.toLowerCase() || c.arName === subjectName
    );

    if (match) {
      userState[chatId] = {
        year: match.year,
        semester: match.semester,
        currentSubject: match.name
      };
      sendCourseDetails(chatId, match, false);
      return;
    }
  }
});

// ==========================================
// 2. معالج الرسائل المباشرة والتواصل مع الأدمن
// ==========================================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  // تجاهل الأوامر الرسمية مثل /start
  if (msg.text && msg.text.startsWith("/")) return;

  // 1. حالة: الأدمن يقوم بالرد على طالب (سواء بعمل Reply على رسالة أو بالضغط على زر الرد)
  let targetStudentId = null;
  if (chatId === ADMIN_ID) {
    if (userState[ADMIN_ID]?.replyingToStudent) {
      targetStudentId = userState[ADMIN_ID].replyingToStudent;
    } else if (msg.reply_to_message) {
      targetStudentId = adminMessageMap.get(msg.reply_to_message.message_id);
    }
  }

  if (targetStudentId) {
    try {
      const studentKeyboard = {
        inline_keyboard: [
          [{ text: "💬 إرسال رد أو استفسار آخر", callback_data: "contact_admin" }],
          [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
        ]
      };

      if (msg.text) {
        await bot.sendMessage(
          targetStudentId,
          `📩 *رد من إدارة البوت / الأدمن:*\n━━━━━━━━━━━━━━━━━━━━\n\n${msg.text}`,
          { parse_mode: "Markdown", reply_markup: studentKeyboard }
        );
      } else if (msg.photo) {
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        await bot.sendPhoto(targetStudentId, fileId, {
          caption: `📩 *رد من إدارة البوت / الأدمن:*\n━━━━━━━━━━━━━━━━━━━━\n\n${msg.caption || ""}`,
          parse_mode: "Markdown",
          reply_markup: studentKeyboard
        });
      } else if (msg.document) {
        await bot.sendDocument(targetStudentId, msg.document.file_id, {
          caption: `📩 *رد من إدارة البوت / الأدمن:*\n━━━━━━━━━━━━━━━━━━━━\n\n${msg.caption || ""}`,
          parse_mode: "Markdown",
          reply_markup: studentKeyboard
        });
      } else if (msg.voice) {
        await bot.sendVoice(targetStudentId, msg.voice.file_id, {
          caption: `📩 *تسجيل صوتي من إدارة البوت / الأدمن*`,
          parse_mode: "Markdown",
          reply_markup: studentKeyboard
        });
      } else if (msg.video) {
        await bot.sendVideo(targetStudentId, msg.video.file_id, {
          caption: `📩 *فيديو من إدارة البوت / الأدمن:*\n━━━━━━━━━━━━━━━━━━━━\n\n${msg.caption || ""}`,
          parse_mode: "Markdown",
          reply_markup: studentKeyboard
        });
      } else if (msg.audio) {
        await bot.sendAudio(targetStudentId, msg.audio.file_id, {
          caption: `📩 *ملف صوتي من إدارة البوت / الأدمن:*\n━━━━━━━━━━━━━━━━━━━━\n\n${msg.caption || ""}`,
          parse_mode: "Markdown",
          reply_markup: studentKeyboard
        });
      }

      bot.sendMessage(ADMIN_ID, "✅ تم إرسال الرد إلى الطالب بنجاح.");
      if (userState[ADMIN_ID]) userState[ADMIN_ID].replyingToStudent = null;
    } catch (err) {
      console.error("Error sending reply to student:", err.message);
      bot.sendMessage(ADMIN_ID, "❌ تعذر إرسال الرد إلى الطالب (قد يكون قام بحظر البوت أو حذف المحادثة).");
    }
    return;
  }

  // 2. حالة: الطالب يرسل رسالة أو ملف إلى الأدمن
  if (userState[chatId]?.waitingAdminMessage) {
    try {
      const studentName = ((msg.from?.first_name || "") + " " + (msg.from?.last_name || "")).trim() || "طالب";
      const username = msg.from?.username ? `@${msg.from.username}` : "لا يوجد معرف";
      const header = `📨 *رسالة جديدة من طالب / مستخدم:*\n━━━━━━━━━━━━━━━━━━━━\n👤 *الاسم:* ${studentName}\n🔗 *المعرف:* ${username}\n🆔 *الآيدي:* \`${chatId}\``;
      const adminKeyboard = {
        inline_keyboard: [
          [{ text: "✍️ الرد على الطالب", callback_data: `admin_reply_${chatId}` }]
        ]
      };

      let sentMsg = null;
      if (msg.text) {
        sentMsg = await bot.sendMessage(
          ADMIN_ID,
          `${header}\n\n💬 *نص الرسالة:*\n${msg.text}`,
          { parse_mode: "Markdown", reply_markup: adminKeyboard }
        );
      } else if (msg.photo) {
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        sentMsg = await bot.sendPhoto(ADMIN_ID, fileId, {
          caption: `${header}\n\n📷 *صورة مرفقة*` + (msg.caption ? `\n📝 *الوصف:* ${msg.caption}` : ""),
          parse_mode: "Markdown",
          reply_markup: adminKeyboard
        });
      } else if (msg.document) {
        sentMsg = await bot.sendDocument(ADMIN_ID, msg.document.file_id, {
          caption: `${header}\n\n📄 *ملف مرفق:* ${msg.document.file_name || ""}` + (msg.caption ? `\n📝 *الوصف:* ${msg.caption}` : ""),
          parse_mode: "Markdown",
          reply_markup: adminKeyboard
        });
      } else if (msg.voice) {
        sentMsg = await bot.sendVoice(ADMIN_ID, msg.voice.file_id, {
          caption: `${header}\n\n🎙️ *تسجيل صوتي*`,
          parse_mode: "Markdown",
          reply_markup: adminKeyboard
        });
      } else if (msg.video) {
        sentMsg = await bot.sendVideo(ADMIN_ID, msg.video.file_id, {
          caption: `${header}\n\n🎥 *فيديو مرفق*` + (msg.caption ? `\n📝 *الوصف:* ${msg.caption}` : ""),
          parse_mode: "Markdown",
          reply_markup: adminKeyboard
        });
      } else if (msg.audio) {
        sentMsg = await bot.sendAudio(ADMIN_ID, msg.audio.file_id, {
          caption: `${header}\n\n🎵 *ملف صوتي مرفق*` + (msg.caption ? `\n📝 *الوصف:* ${msg.caption}` : ""),
          parse_mode: "Markdown",
          reply_markup: adminKeyboard
        });
      }

      if (sentMsg) {
        adminMessageMap.set(sentMsg.message_id, chatId);
      }

      userState[chatId].waitingAdminMessage = false;

      bot.sendMessage(
        chatId,
        "✅ *تم إرسال رسالتك / ملفك إلى الأدمن بنجاح!*\nسيتم مراجعتها والرد عليك هنا في البوت قريباً 👍",
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
            ]
          }
        }
      );
    } catch (err) {
      console.error("Error forwarding to admin:", err.message);
      bot.sendMessage(chatId, "❌ حدث خطأ أثناء إرسال الرسالة، يرجى المحاولة لاحقاً.");
    }
    return;
  }

  // 3. حالة: إرسال ملف/صورة بدون تفعيل وضع التواصل
  if (msg.photo || msg.document || msg.voice || msg.video || msg.audio) {
    bot.sendMessage(
      chatId,
      "💡 هل ترغب في إرسال هذا الملف أو الاستفسار عنه للأدمن؟\nاضغط على الزر أدناه ثم أرسل الملف:",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "💬 تواصل مع الأدمن / إرسال ملف", callback_data: "contact_admin" }],
            [{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]
          ]
        }
      }
    );
    return;
  }

  // 4. حالة: رسالة نصية عادية للبحث عن المواد
  if (msg.text) {
    const text = msg.text.trim();
    const results = searchAll(text);

    // في حال عدم وجود نتائج
    if (results.length === 0) {
      const keyboard = [[{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]];
      bot.sendMessage(
        chatId,
        `❌ لم يتم العثور على أي نتائج لـ "${text}".\n\n💡 جرب البحث بكود المساق (مثل: \`ECOM 2401\` أو \`MATHB1301\`) أو اسم المادة بالعربي أو الإنجليزي (مثل: \`برمجة\`، \`تفاضل\`، \`شبكات\`).`,
        {
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: keyboard }
        }
      );
      return;
    }

    // في حال وجود نتيجة واحدة مؤكدة ومباشرة، يتم عرض تفاصيل المادة فوراً
    if (results.length === 1 || results[0].score >= 150) {
      const top = results[0];
      if (top.type === "course") {
        userState[chatId] = {
          year: top.year,
          semester: top.semester,
          currentSubject: top.name
        };
        sendCourseDetails(chatId, top, false);
        return;
      } else if (top.type === "uni_req") {
        sendUniReqDetails(chatId, top.name, top.data);
        return;
      } else if (top.type === "lab") {
        sendLabDetails(chatId, top.name, top.data);
        return;
      }
    }

    // في حال وجود أكثر من نتيجة مطابقة، يتم تقديم قائمة أزرار لاختيار المادة المطلوبة
    const buttons = results.slice(0, 8).map((res) => {
      if (res.type === "course") {
        const label = res.arName
          ? `📚 ${res.arName} (${res.name})` + (res.code ? ` - ${res.code}` : "")
          : `📚 ${res.name}` + (res.code ? ` - ${res.code}` : "");
        return [{ text: label, callback_data: "find_c_" + res.id }];
      } else if (res.type === "uni_req") {
        return [{ text: "🏛️ " + res.name + (res.code ? ` (${res.code})` : ""), callback_data: "find_req_" + res.name }];
      } else {
        return [{ text: "🧪 " + res.name, callback_data: "find_lab_" + res.name }];
      }
    });

    buttons.push([{ text: "🏠 الصفحة الرئيسية", callback_data: "main_menu" }]);

    bot.sendMessage(chatId, `🔍 تم العثور على ${results.length} نتيجة لـ "${text}".\nاختر المادة المطلوبة لعرض روابطها وملفاتها:`, {
      reply_markup: { inline_keyboard: buttons }
    });
  }
});

// التعامل مع الأخطاء
bot.on("polling_error", (err) => {
  console.log("Polling error:", err.message);
});
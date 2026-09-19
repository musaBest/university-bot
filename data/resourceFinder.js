/**
 * Resource Finder & Knowledge Base Retriever for IUG Computer Engineering AI
 * Integrates the complete department course catalog, university requirements, and lab software.
 */

const { courses } = require("../courses");
const { labPrograms } = require("../labPrograms");
const { uniRequirements } = require("../uniRequirements");
const courseCodes = require("../courseCodes");

// تطبيع وتنظيف النصوص العربية والإنجليزية للبحث الذكي
function normalizeText(t) {
  return (t || "")
    .toString()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "") // إزالة التشكيل
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\-_()|/,\.]/g, " ")
    .replace(/(?:^|\s)ال/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// خريطة البيانات والفهارس الشاملة لكافة مساقات القسم (السنوات من الأولى حتى الخامسة)
const metaMap = {
  year1: {
    semester1: {
      "Scientific Research Methodology": {
        code: "ENGG 1104",
        ar: "منهجية بحث علمي",
        aliases: ["منهجية بحث", "منهجيه بحث علمي", "بحث علمي", "research methodology", "منهجية", "منهجيه"]
      },
      "Introduction to Engineering": {
        code: "ENGG 1101",
        ar: "مقدمة في الهندسة",
        aliases: ["مقدمة هندسة", "مقدمه هندسه", "مقدمه في الهندسه", "مقدمة في الهندسة", "intro to engineering", "مقدمة هندسية"]
      },
      "Engineering Drawing": {
        code: "ENGG 1204",
        ar: "رسم هندسي",
        aliases: ["رسم", "رسم هندسي", "الرسم الهندسي", "اوكاد", "اوتوكاد", "autocad", "drawing", "engineering drawing"]
      },
      "Calculus A": {
        code: "MATHB1301",
        ar: "تفاضل وتكامل (أ)",
        aliases: ["تفاضل وتكامل أ", "تفاضل وتكامل 1", "تفاضل أ", "تفاضل 1", "كالكولاس أ", "كالكولس أ", "كالكولاس 1", "calculus 1", "calculus a", "math 1", "تفاضل"]
      },
      "General Physics Lab A": {
        code: "PHYSA1102",
        ar: "فيزياء عامة عملية (أ)",
        aliases: ["فيزياء عامة عملي أ", "فيزياء عامه عمليه أ", "معمل فيزياء أ", "مختبر فيزياء أ", "فيزياء عملي 1", "معمل فيزياء 1", "physics lab a", "physics lab 1"]
      },
      "General Physics A": {
        code: "PHYSA1301",
        ar: "فيزياء عامة (أ)",
        aliases: ["فيزياء عامة أ", "فيزياء عامه أ", "فيزياء أ", "فيزياء 1", "physics a", "physics 1", "فيزياء"]
      }
    },
    semester2: {
      "General Chemistry": {
        code: "CHEM 1302",
        ar: "كيمياء عامة",
        aliases: ["كيمياء عامه", "كيمياء", "كيمستري", "chemistry", "general chemistry"]
      },
      "Workshop Technology": {
        code: "ENGG 1103",
        ar: "تقنية الورش",
        aliases: ["تقنيه الورش", "ورش", "ورشه", "workshop", "workshop technology"]
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
        aliases: ["لغة انجليزية تقنية", "انجليزي تقني", "لغة انجليزية", "technical english", "english", "انجليزي"]
      },
      "Calculus B": {
        code: "MATHB1401",
        ar: "تفاضل وتكامل (ب)",
        aliases: ["تفاضل وتكامل ب", "تفاضل وتكامل 2", "تفاضل ب", "تفاضل 2", "كالكولاس ب", "كالكولس ب", "كالكولاس 2", "calculus 2", "calculus b", "math 2"]
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
        aliases: ["تصميم رقمي 1", "تصميم رقمي", "ديجيتال 1", "ديجيتال", "digital design 1", "digital 1", "دوائر منطقية", "logic design"]
      },
      "Digital Design Lab 1": {
        code: "",
        ar: "تصميم رقمي تجميعي (عملي)",
        aliases: ["معمل تصميم رقمي 1", "معمل ديجيتال 1", "تصميم رقمي عملي 1", "digital design lab 1", "logisim", "لوجسم"]
      },
      "Computer Programming Lab 1": {
        code: "",
        ar: "برمجة حاسوب (1) عملي",
        aliases: ["معمل برمجة حاسوب 1", "معمل برمجة 1", "معمل جافا 1", "برمجة عملي 1", "programming lab 1", "java lab 1", "netbeans"]
      },
      "Electric Circuits 1": {
        code: "EELE 2310",
        ar: "دوائر كهربائية (1) (اتصالات وتحكم)",
        aliases: ["دوائر كهربائية 1", "دوائر كهربائيه 1", "دوائر 1", "سيركت 1", "سيركتس 1", "electric circuits 1", "circuits 1", "سيركت"]
      },
      "Electric Circuits Lab 1": {
        code: "EELE 2110",
        ar: "دوائر كهربائية (1) (عملي)",
        aliases: ["معمل دوائر كهربائية 1", "معمل دوائر 1", "معمل سيركت 1", "دوائر عملي 1", "circuits lab 1", "ltspice", "سبايس"]
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

// فهرس متطلبات الجامعة
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

const softwareKeywords = {
  "logisim": ["logisim", "لوجسم", "لوجيزم", "لوجسيم", "لوجيسيم", "لوجزم"],
  "matlab": ["matlab", "ماتلاب", "مات لاب"],
  "ltspice": ["ltspice", "سبايس", "سبايز", "التسبايس", "سبايس1", "lt spice"],
  "netbeans": ["netbeans", "نت بينز", "نتبينز", "جافا", "java ide"],
  "labview": ["labview", "لاب فيو", "لابفيو"],
  "pydroid": ["pydroid", "بايثون", "python"],
  "packet tracer": ["packet tracer", "باكيت تريسر", "باكت تريسر", "باكيت"],
  "proteus": ["proteus", "بروتيوس", "بروتس"],
  "quartus": ["quartus", "كورتس", "كوارتس", "كوارترز"],
  "autocad": ["autocad", "اوتوكاد", "اوكاد"]
};

// إنشاء فهرس سريع للبحث في جميع المواد
const courseCatalog = [];
for (const year in courses) {
  for (const semester in courses[year]) {
    for (const subject in courses[year][semester]) {
      const meta = metaMap[year]?.[semester]?.[subject] || {};
      courseCatalog.push({
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

// دالة لتوليد عناوين الأقسام بأيقونات واضحة ومطابقة تماماً لعرض السنوات
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

/**
 * تنسيق تفاصيل المادة بالكامل بنفس هيئة عرض السنوات بالبوت تماماً
 */
function formatCourseCard(courseItem) {
  const title = courseItem.arName
    ? `📚 ${courseItem.name} | ${courseItem.arName}`
    : `📚 ${courseItem.name}`;
  const codeText = courseItem.code ? `\n🏷️ كود المساق: ${courseItem.code}` : "";

  let reply = `${title}${codeText}\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  let tipsSection = "";

  for (const [key, value] of Object.entries(courseItem.data || {})) {
    const sectionTitle = getSectionTitle(key);

    if (/tips/i.test(key)) {
      if (value && value !== "لا توجد روابط") {
        tipsSection = `${sectionTitle}:\n${value}\n\n`;
      }
      continue;
    }

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

  if (tipsSection) {
    reply += tipsSection;
  }

  return reply.trim();
}

/**
 * البحث عن المادة ومطابقتها في الكتالوج
 */
function findMatchingCourses(query) {
  const cleanQ = normalizeText(query);
  if (!cleanQ || cleanQ.length < 2) return [];

  const matched = [];
  const words = cleanQ.split(" ").filter(w => w.length >= 2);

  for (const item of courseCatalog) {
    let score = 0;
    const nameNorm = normalizeText(item.name);
    const arNorm = normalizeText(item.arName);
    const codeNorm = normalizeText(item.code);

    // مطابقة تامة للكود
    if (codeNorm && cleanQ.includes(codeNorm)) {
      score += 150;
    }

    // مطابقة تامة للاسم
    if (nameNorm && cleanQ.includes(nameNorm)) {
      score += 100;
    }
    if (arNorm && cleanQ.includes(arNorm)) {
      score += 100;
    }

    // فحص المرادفات
    for (const alias of item.aliases) {
      const aliasNorm = normalizeText(alias);
      if (aliasNorm === cleanQ) {
        score += 120;
        break;
      }
      if (aliasNorm.length >= 3 && cleanQ.includes(aliasNorm)) {
        score += 80;
        break;
      }
    }

    // فحص الكلمات الفردية الدالة
    if (score === 0) {
      for (const w of words) {
        if (w.length >= 3) {
          if (arNorm.includes(w) || nameNorm.includes(w) || (item.aliases && item.aliases.some(a => normalizeText(a).includes(w)))) {
            score += 30;
          }
        }
      }
    }

    if (score >= 30) {
      matched.push({ course: item, score });
    }
  }

  matched.sort((a, b) => b.score - a.score);
  if (matched.length > 0) {
    const highestScore = matched[0].score;
    if (highestScore >= 80) {
      return matched.filter(m => m.score >= 80).slice(0, 2).map(m => m.course);
    }
  }
  return matched.slice(0, 3).map(m => m.course);
}

/**
 * استخراج سياق القسم والمواد وروابط الدرايف المباشرة لإعطائها للمساعد الذكي
 */
function getDepartmentContext(query) {
  const cleanQ = normalizeText(query);
  const contextParts = [];

  // 1. فحص ومطابقة المساقات (courses.js)
  const matchedCourses = findMatchingCourses(query);
  for (const course of matchedCourses) {
    const card = formatCourseCard(course);
    contextParts.push(`📌 **بطاقة المساق الرسمية المعتمدة وروابط الدرايف والشروحات لمادة (${course.arName || course.name}):**\n\`\`\`\n${card}\n\`\`\``);
  }

  // 2. فحص متطلبات الجامعة (uniRequirements.js)
  for (const [rName, rData] of Object.entries(uniRequirements)) {
    const arName = rData.ar || rName;
    const cleanR = normalizeText(rName);
    const cleanAr = normalizeText(arName);
    const meta = uniReqMeta[rName] || uniReqMeta[arName] || { aliases: [] };

    let isHit = cleanQ.includes(cleanR) || cleanQ.includes(cleanAr);
    if (!isHit && meta.aliases) {
      isHit = meta.aliases.some(a => cleanQ.includes(normalizeText(a)));
    }

    if (isHit) {
      let str = `📚 **متطلب جامعي (${arName}):**\n`;
      if (rData.drive) str += `• رابط الدرايف والملفات: ${rData.drive}\n`;
      if (rData.youtube) str += `• شروحات اليوتيوب: ${rData.youtube}\n`;
      if (rData.book) str += `• الكتاب: ${rData.book}\n`;
      contextParts.push(str.trim());
    }
  }

  // 3. فحص البرامج المعملية (labPrograms.js)
  for (const [pName, pData] of Object.entries(labPrograms)) {
    const cleanP = normalizeText(pName);
    const pText = pData.text || "";
    let hit = cleanQ.includes(cleanP);

    for (const [swKey, syns] of Object.entries(softwareKeywords)) {
      if (cleanP.includes(swKey)) {
        if (syns.some(s => cleanQ.includes(normalizeText(s)))) {
          hit = true;
          break;
        }
      }
    }

    if (hit) {
      const link = pData.link || (Array.isArray(pData.links) ? pData.links.map(l => `${l.name}: ${l.url}`).join("\n") : "");
      contextParts.push(`💻 **برنامج معمل (${pName.trim()}):**\n• التفاصيل: ${pText}\n• رابط التنزيل: ${link}`);
    }
  }

  return contextParts.join("\n\n");
}

module.exports = {
  getDepartmentContext,
  findMatchingCourses,
  formatCourseCard,
  courseCatalog,
  metaMap
};

/**
 * Resource Finder & Knowledge Base Retriever for IUG Computer Engineering AI
 * Integrates the complete department course catalog, university requirements, and lab software.
 * Supports both 4-Year and 5-Year study plan course codes.
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

// خريطة البيانات والفهارس الشاملة لكافة مساقات القسم مع دعم أكواد خطة 4 سنوات وخطة 5 سنوات
const metaMap = {
  year1: {
    semester1: {
      "Scientific Research Methodology": {
        code5: "ENGG 1104",
        code4: "ENGG 1206",
        code: "ENGG 1104 (خطة 5 سنوات) | ENGG 1206 (خطة 4 سنوات)",
        codes: ["ENGG 1104", "ENGG 1206"],
        ar: "منهجية بحث علمي",
        aliases: ["ENGG 1104", "ENGG 1206", "ENGG1104", "ENGG1206", "أساسيات الهندسة والبحث العلمي", "اساسيات الهندسة والبحث العلمي", "منهجية بحث", "منهجيه بحث علمي", "بحث علمي", "research methodology", "منهجية", "منهجيه"]
      },
      "Introduction to Engineering": {
        code5: "ENGG 1101",
        code4: "ENGG 1206",
        code: "ENGG 1101 (خطة 5 سنوات) | ENGG 1206 (خطة 4 سنوات)",
        codes: ["ENGG 1101", "ENGG 1206"],
        ar: "مقدمة في الهندسة",
        aliases: ["ENGG 1101", "ENGG 1206", "ENGG1101", "ENGG1206", "أساسيات الهندسة والبحث العلمي", "اساسيات الهندسة والبحث العلمي", "مقدمة هندسة", "مقدمه هندسه", "مقدمه في الهندسه", "مقدمة في الهندسة", "intro to engineering", "مقدمة هندسية"]
      },
      "Engineering Drawing": {
        code5: "ENGG 1204",
        code4: "ENGG 1209",
        code: "ENGG 1204 (خطة 5 سنوات) | ENGG 1209 (خطة 4 سنوات)",
        codes: ["ENGG 1204", "ENGG 1209"],
        ar: "رسم هندسي",
        aliases: ["ENGG 1204", "ENGG 1209", "ENGG1204", "ENGG1209", "رسم هندسي بالحاسوب", "رسم", "رسم هندسي", "الرسم الهندسي", "اوكاد", "اوتوكاد", "autocad", "drawing", "engineering drawing"]
      },
      "Calculus A": {
        code5: "MATHB1301",
        code4: "MATHA1301",
        code: "MATHB1301 (خطة 5 سنوات) | MATHA1301 (خطة 4 سنوات)",
        codes: ["MATHB1301", "MATHA1301", "MATH 1301"],
        ar: "تفاضل وتكامل (أ)",
        aliases: ["MATHB1301", "MATHA1301", "MATH 1301", "MATHA 1301", "MATHB 1301", "تفاضل وتكامل أ", "تفاضل وتكامل 1", "تفاضل أ", "تفاضل 1", "كالكولاس أ", "كالكولس أ", "كالكولاس 1", "calculus 1", "calculus a", "math 1", "تفاضل"]
      },
      "General Physics Lab A": {
        code5: "PHYSA1102",
        code4: "PHYSA1102",
        code: "PHYSA1102",
        codes: ["PHYSA1102", "PHYS 1102", "PHYSA 1102"],
        ar: "فيزياء عامة عملية (أ)",
        aliases: ["PHYSA1102", "PHYS 1102", "PHYSA 1102", "فيزياء عامة عملي أ", "فيزياء عامه عمليه أ", "معمل فيزياء أ", "مختبر فيزياء أ", "فيزياء عملي 1", "معمل فيزياء 1", "physics lab a", "physics lab 1"]
      },
      "General Physics A": {
        code5: "PHYSA1301",
        code4: "PHYSA1301",
        code: "PHYSA1301",
        codes: ["PHYSA1301", "PHYS 1301", "PHYSA 1301"],
        ar: "فيزياء عامة (أ)",
        aliases: ["PHYSA1301", "PHYS 1301", "PHYSA 1301", "فيزياء عامة أ", "فيزياء عامه أ", "فيزياء أ", "فيزياء 1", "physics a", "physics 1", "فيزياء"]
      }
    },
    semester2: {
      "General Chemistry": {
        code5: "CHEM 1302",
        code: "CHEM 1302",
        codes: ["CHEM 1302"],
        ar: "كيمياء عامة",
        aliases: ["CHEM 1302", "CHEM1302", "كيمياء عامه", "كيمياء", "كيمستري", "chemistry", "general chemistry"]
      },
      "Workshop Technology": {
        code5: "ENGG 1103",
        code: "ENGG 1103",
        codes: ["ENGG 1103"],
        ar: "تقنية الورش",
        aliases: ["ENGG 1103", "ENGG1103", "تقنيه الورش", "ورش", "ورشه", "workshop", "workshop technology"]
      },
      "Introduction to Computers": {
        code5: "ENGG 1203",
        code4: "ENGG 1301",
        code: "ENGG 1203 (خطة 5 سنوات) | ENGG 1301 (خطة 4 سنوات)",
        codes: ["ENGG 1203", "ENGG 1301"],
        ar: "مقدمة في الحاسوب",
        aliases: ["ENGG 1203", "ENGG 1301", "ENGG1203", "ENGG1301", "أساسيات البرمجة", "اساسيات البرمجة", "مقدمة حاسوب", "مقدمه في الحاسوب", "اساسيات حاسوب", "بايثون", "python", "intro to computers"]
      },
      "Introduction to Computers Lab": {
        code: "",
        ar: "مقدمة في الحاسوب (عملي)",
        aliases: ["مقدمة حاسوب عملي", "معمل مقدمة حاسوب", "معمل بايثون", "intro to computers lab", "python lab"]
      },
      "Technical English": {
        code5: "ENGG 1305",
        code4: "ENGG 1305",
        code: "ENGG 1305",
        codes: ["ENGG 1305"],
        ar: "لغة إنجليزية تقنية",
        aliases: ["ENGG 1305", "ENGG1305", "لغة انجليزية تقنية", "انجليزي تقني", "لغة انجليزية", "technical english", "english", "انجليزي"]
      },
      "Calculus B": {
        code5: "MATHB1401",
        code4: "MATHB1302",
        code: "MATHB1401 (خطة 5 سنوات) | MATHB1302 (خطة 4 سنوات)",
        codes: ["MATHB1401", "MATHB1302", "MATH 1401", "MATH 1302"],
        ar: "تفاضل وتكامل (ب)",
        aliases: ["MATHB1401", "MATHB1302", "MATH 1401", "MATH 1302", "MATHB 1401", "MATHB 1302", "تفاضل وتكامل ب", "تفاضل وتكامل 2", "تفاضل ب", "تفاضل 2", "كالكولاس ب", "كالكولس ب", "كالكولاس 2", "calculus 2", "calculus b", "math 2"]
      },
      "General Physics B": {
        code5: "PHYSB1301",
        code: "PHYSB1301",
        codes: ["PHYSB1301", "PHYS 1302", "PHYSB 1301"],
        ar: "فيزياء عامة (ب)",
        aliases: ["PHYSB1301", "PHYS 1302", "PHYSB 1301", "فيزياء عامة ب", "فيزياء عامه ب", "فيزياء ب", "فيزياء 2", "physics b", "physics 2"]
      }
    }
  },
  year2: {
    semester1: {
      "Computer Programming 1": {
        code5: "ECOM 2401",
        code4: "ECOM 1401",
        code: "ECOM 2401 (خطة 5 سنوات) | ECOM 1401 (خطة 4 سنوات)",
        codes: ["ECOM 2401", "ECOM 1401"],
        ar: "برمجة حاسوب (1)",
        aliases: ["ECOM 2401", "ECOM 1401", "ECOM2401", "ECOM1401", "برمجة حاسوب 1", "برمجة 1", "برمجه 1", "برمجة", "جافا 1", "جافا", "java 1", "java", "programming 1", "computer programming 1"]
      },
      "Digital Design 1": {
        code5: "ECOM 2411",
        code4: "ECOM 1301",
        code: "ECOM 2411 (خطة 5 سنوات) | ECOM 1301 (خطة 4 سنوات)",
        codes: ["ECOM 2411", "ECOM 1301"],
        ar: "تصميم رقمي تجميعي",
        aliases: ["ECOM 2411", "ECOM 1301", "ECOM2411", "ECOM1301", "تصميم رقمي 1", "تصميم رقمي", "ديجيتال 1", "ديجيتال", "digital design 1", "digital 1", "دوائر منطقية", "logic design"]
      },
      "Digital Design Lab 1": {
        code4: "ECOM 1101",
        code: "ECOM 1101 (خطة 4 سنوات)",
        codes: ["ECOM 1101"],
        ar: "تصميم رقمي تجميعي (عملي)",
        aliases: ["ECOM 1101", "ECOM1101", "مختبر تصميم رقمي", "معمل تصميم رقمي 1", "معمل ديجيتال 1", "تصميم رقمي عملي 1", "digital design lab 1", "logisim", "لوجسم"]
      },
      "Computer Programming Lab 1": {
        code: "",
        ar: "برمجة حاسوب (1) عملي",
        aliases: ["معمل برمجة حاسوب 1", "معمل برمجة 1", "معمل جافا 1", "برمجة عملي 1", "programming lab 1", "java lab 1", "netbeans"]
      },
      "Electric Circuits 1": {
        code5: "EELE 2310",
        code4: "EELE 1301",
        code: "EELE 2310 (خطة 5 سنوات) | EELE 1301 (خطة 4 سنوات)",
        codes: ["EELE 2310", "EELE 1301"],
        ar: "دوائر كهربائية (1) (اتصالات وتحكم)",
        aliases: ["EELE 2310", "EELE 1301", "EELE2310", "EELE1301", "دوائر كهربائية 1", "دوائر كهربائيه 1", "دوائر 1", "سيركت 1", "سيركتس 1", "electric circuits 1", "circuits 1"]
      },
      "Electric Circuits Lab 1": {
        code5: "EELE 2110",
        code4: "EELE 1101",
        code: "EELE 2110 (خطة 5 سنوات) | EELE 1101 (خطة 4 سنوات)",
        codes: ["EELE 2110", "EELE 1101"],
        ar: "دوائر كهربائية (1) (عملي)",
        aliases: ["EELE 2110", "EELE 1101", "EELE2110", "EELE1101", "مختبر دوائر كهربائية 1", "معمل دوائر كهربائية 1", "معمل دوائر 1", "معمل سيركت 1", "دوائر عملي 1", "circuits lab 1", "ltspice"]
      }
    },
    semester2: {
      "Linear Algebra": {
        code5: "MATH 2341",
        code4: "MATH 2341",
        code: "MATH 2341",
        codes: ["MATH 2341"],
        ar: "جبر خطي",
        aliases: ["MATH 2341", "MATH2341", "جبر خطي", "جبر", "لينيار", "لينيار الجبرا", "linear algebra"]
      },
      "Computer Programming 2": {
        code5: "ECOM 2402",
        code4: "ECOM 2402",
        code: "ECOM 2402",
        codes: ["ECOM 2402"],
        ar: "برمجة حاسوب (2)",
        aliases: ["ECOM 2402", "ECOM2402", "برمجة حاسوب 2", "برمجة 2", "برمجه 2", "جافا 2", "oop", "java 2", "programming 2", "computer programming 2"]
      },
      "Digital Design 2": {
        code5: "ECOM 2421",
        code: "ECOM 2421",
        codes: ["ECOM 2421"],
        ar: "تصميم رقمي تتابعي",
        aliases: ["ECOM 2421", "ECOM2421", "تصميم رقمي 2", "ديجيتال 2", "digital design 2", "digital 2"]
      },
      "Electronics 1": {
        code5: "EELE 2320",
        code4: "EELE 1303",
        code: "EELE 2320 (خطة 5 سنوات) | EELE 1303 (خطة 4 سنوات)",
        codes: ["EELE 2320", "EELE 1303"],
        ar: "إلكترونيات (1)",
        aliases: ["EELE 2320", "EELE 1303", "EELE2320", "EELE1303", "الكترونيات 1", "الكترونيات", "إلكترونيات", "الكترونكس 1", "electronics 1"]
      },
      "Electronics Lab 1": {
        code5: "EELE 2120",
        code4: "EELE 1103",
        code: "EELE 2120 (خطة 5 سنوات) | EELE 1103 (خطة 4 سنوات)",
        codes: ["EELE 2120", "EELE 1103"],
        ar: "إلكترونيات (1) عملي",
        aliases: ["EELE 2120", "EELE 1103", "EELE2120", "EELE1103", "مختبر إلكترونيات 1", "مختبر الكترونيات 1", "معمل إلكترونيات 1", "معمل الكترونيات 1", "الكترونيات عملي 1", "electronics lab 1"]
      },
      "Ordinary Differential Equations": {
        code5: "MATH 2302",
        code4: "MATH 2302",
        code: "MATH 2302",
        codes: ["MATH 2302"],
        ar: "معادلات تفاضلية عادية",
        aliases: ["MATH 2302", "MATH2302", "معادلات تفاضلية", "معادلات تفاضليه", "دفرنشل", "ode", "differential equations"]
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
        code5: "ECOM 3411",
        code4: "ECOM 2311",
        code: "ECOM 3411 (خطة 5 سنوات) | ECOM 2311 (خطة 4 سنوات)",
        codes: ["ECOM 3411", "ECOM 2311"],
        ar: "رياضيات متقطعة",
        aliases: ["ECOM 3411", "ECOM 2311", "ECOM3411", "ECOM2311", "رياضيات متقطعه", "دسكريت", "دسجريت", "ديسكربت", "discrete math", "discrete mathematics"]
      },
      "Discrete mathematics Lab": {
        code: "",
        ar: "رياضيات متقطعة (عملي)",
        aliases: ["معمل رياضيات متقطعة", "رياضيات متقطعة عملي", "discrete math lab"]
      },
      "Data structures and algorithms": {
        code5: "ECOM 3412",
        code4: "ECOM 2407",
        code: "ECOM 3412 (خطة 5 سنوات) | ECOM 2407 (خطة 4 سنوات)",
        codes: ["ECOM 3412", "ECOM 2407"],
        ar: "تراكيب بيانات وخوارزميات",
        aliases: ["ECOM 3412", "ECOM 2407", "ECOM3412", "ECOM2407", "تراكيب بيانات", "خوارزميات", "هياكل بيانات", "داتا ستراكشر", "data structures", "algorithms", "data structures and algorithms"]
      },
      "Data structures and algorithms Lab": {
        code: "",
        ar: "تراكيب بيانات وخوارزميات (عملي)",
        aliases: ["معمل تراكيب بيانات وخوارزميات", "معمل خوارزميات", "معمل تراكيب بيانات", "data structures lab"]
      },
      "Linear signals and systems": {
        code5: "EELE 3310",
        code4: "EELE 2307",
        code: "EELE 3310 (خطة 5 سنوات) | EELE 2307 (خطة 4 سنوات)",
        codes: ["EELE 3310", "EELE 2307"],
        ar: "إشارات وأنظمة خطية",
        aliases: ["EELE 3310", "EELE 2307", "EELE3310", "EELE2307", "اشارات وانظمة خطية", "اشارات وانظمه خطيه", "اشارات ونظم", "إشارات ونظم", "سيجنال", "signals and systems", "linear signals", "signals"]
      },
      "Practical linear signals and systems": {
        code5: "EELE 3110",
        code4: "EELE 2107",
        code: "EELE 3110 (خطة 5 سنوات) | EELE 2107 (خطة 4 سنوات)",
        codes: ["EELE 3110", "EELE 2107"],
        ar: "إشارات وأنظمة خطية (عملي)",
        aliases: ["EELE 3110", "EELE 2107", "EELE3110", "EELE2107", "معمل إشارات وأنظمة خطية", "معمل اشارات", "اشارات عملي", "signals lab"]
      },
      "Probability and Statistics Theory": {
        code5: "EELE 3340",
        code4: "MATH 2300",
        code: "EELE 3340 (خطة 5 سنوات) | MATH 2300 (خطة 4 سنوات)",
        codes: ["EELE 3340", "MATH 2300"],
        ar: "نظرية احتمالات وإحصاء",
        aliases: ["EELE 3340", "MATH 2300", "EELE3340", "MATH2300", "الإحصاء والاحتمالات", "احتمالات وإحصاء", "احتمالات واحصاء", "احتمالات", "إحصاء", "احصاء", "بروبابيليتي", "probability and statistics", "probability"]
      }
    },
    semester2: {
      "Computer architecture": {
        code5: "ECOM 3421",
        code4: "ECOM 3421",
        code: "ECOM 3421",
        codes: ["ECOM 3421"],
        ar: "عمارة حاسوب",
        aliases: ["ECOM 3421", "ECOM3421", "عمارة حاسبات", "معمارية حاسوب", "عمارة الحاسوب", "اركيتكتشر", "computer architecture", "architecture"]
      },
      "Computer architecture Lab": {
        code: "",
        ar: "عمارة حاسوب (عملي)",
        aliases: ["معمل عمارة حاسوب", "عمارة حاسوب عملي", "computer architecture lab"]
      },
      "database systems": {
        code5: "ECOM 3422",
        code4: "ECOM 3409",
        code: "ECOM 3422 (خطة 5 سنوات) | ECOM 3409 (خطة 4 سنوات)",
        codes: ["ECOM 3422", "ECOM 3409"],
        ar: "نظم قواعد بيانات",
        aliases: ["ECOM 3422", "ECOM 3409", "ECOM3422", "ECOM3409", "نظم قواعد البيانات", "قواعد بيانات", "داتا بيز", "داتابيز", "database", "database systems", "db"]
      },
      "database systems Lab": {
        code: "",
        ar: "نظم قواعد بيانات (عملي)",
        aliases: ["معمل قواعد بيانات", "معمل داتابيز", "قواعد بيانات عملي", "database lab", "sql"]
      },
      "digital electronics": {
        code5: "EELE 3321",
        code4: "EELE 2303",
        code: "EELE 3321 (خطة 5 سنوات) | EELE 2303 (خطة 4 سنوات)",
        codes: ["EELE 3321", "EELE 2303"],
        ar: "إلكترونيات رقمية",
        aliases: ["EELE 3321", "EELE 2303", "EELE3321", "EELE2303", "الكترونيات رقمية", "الكترونيات رقميه", "ديجيتال الكترونكس", "digital electronics"]
      },
      "Practical digital electronics": {
        code5: "EELE 3121",
        code4: "EELE 2103",
        code: "EELE 3121 (خطة 5 سنوات) | EELE 2103 (خطة 4 سنوات)",
        codes: ["EELE 3121", "EELE 2103"],
        ar: "إلكترونيات رقمية (عملي)",
        aliases: ["EELE 3121", "EELE 2103", "EELE3121", "EELE2103", "معمل إلكترونيات رقمية", "معمل الكترونيات رقمية", "الكترونيات رقمية عملي", "digital electronics lab"]
      },
      "Linear control systems": {
        code5: "EELE 3360",
        code4: "EELE 3360",
        code: "EELE 3360",
        codes: ["EELE 3360"],
        ar: "أنظمة التحكم الخطية",
        aliases: ["EELE 3360", "EELE3360", "انظمة التحكم الخطية", "انظمة تحكم خطية", "انظمة تحكم", "كنترول", "control systems", "control"]
      },
      "Linear control systems practical": {
        code5: "EELE 3160",
        code4: "EELE 3160",
        code: "EELE 3160",
        codes: ["EELE 3160"],
        ar: "أنظمة التحكم الخطية (عملي)",
        aliases: ["EELE 3160", "EELE3160", "معمل أنظمة التحكم الخطية", "معمل تحكم", "انظمة تحكم عملي", "control lab", "labview"]
      }
    }
  },
  year4: {
    semester1: {
      "Operating Systems": {
        code5: "ECOM 4401",
        code4: "ECOM 3401",
        code: "ECOM 4401 (خطة 5 سنوات) | ECOM 3401 (خطة 4 سنوات)",
        codes: ["ECOM 4401", "ECOM 3401"],
        ar: "نظم تشغيل",
        aliases: ["ECOM 4401", "ECOM 3401", "ECOM4401", "ECOM3401", "انظمة تشغيل", "انظمة التشغيل", "نظم التشغيل", "او اس", "operating systems", "os"]
      },
      "Operating Systems Lab": {
        code: "",
        ar: "نظم تشغيل (عملي)",
        aliases: ["معمل نظم تشغيل", "معمل لينكس", "نظم تشغيل عملي", "operating systems lab", "linux", "ubuntu"]
      },
      "Data Communication": {
        code5: "ECOM 4411",
        code4: "ECOM 3403",
        code: "ECOM 4411 (خطة 5 سنوات) | ECOM 3403 (خطة 4 سنوات)",
        codes: ["ECOM 4411", "ECOM 3403"],
        ar: "اتصالات بيانات",
        aliases: ["ECOM 4411", "ECOM 3403", "ECOM4411", "ECOM3403", "اتصالات البيانات", "داتا كوم", "data communication", "data communications", "data comm"]
      },
      "Data Communication Lab": {
        code: "",
        ar: "اتصالات بيانات (عملي)",
        aliases: ["معمل اتصالات بيانات", "اتصالات بيانات عملي", "data communication lab", "wireshark"]
      },
      "Assembly Language": {
        code5: "ECOM 4412",
        code4: "ECOM 3306",
        code: "ECOM 4412 (خطة 5 سنوات) | ECOM 3306 (خطة 4 سنوات)",
        codes: ["ECOM 4412", "ECOM 3306"],
        ar: "لغة تجميع",
        aliases: ["ECOM 4412", "ECOM 3306", "ECOM4412", "ECOM3306", "لغة التجميع", "اسمبلي", "اسمبلي لانجوج", "assembly language", "assembly"]
      },
      "Assembly Language Lab": {
        code: "",
        ar: "لغة تجميع (عملي)",
        aliases: ["معمل لغة تجميع", "معمل اسمبلي", "لغة تجميع عملي", "assembly lab"]
      },
      "تدريب عملي(250)ساعة": {
        code5: "ECOM 5000",
        code4: "ECOM 3002",
        code: "ECOM 5000 (خطة 5 سنوات) | ECOM 3002 (خطة 4 سنوات)",
        codes: ["ECOM 5000", "ECOM 3002"],
        ar: "تدريب عملي (250 ساعة)",
        aliases: ["ECOM 5000", "ECOM 3002", "ECOM5000", "ECOM3002", "تدريب عملي", "تدريب ميداني", "تدريب", "تدريب 250 ساعة", "practical training", "internship"]
      }
    },
    semester2: {
      "Computer Networks": {
        code5: "ECOM 4421",
        code4: "ECOM 3402",
        code: "ECOM 4421 (خطة 5 سنوات) | ECOM 3402 (خطة 4 سنوات)",
        codes: ["ECOM 4421", "ECOM 3402"],
        ar: "شبكات حاسوب",
        aliases: ["ECOM 4421", "ECOM 3402", "ECOM4421", "ECOM3402", "شبكات الحاسوب", "شبكات", "نتورك", "computer networks", "networks"]
      },
      "Computer Networks Lab": {
        code: "",
        ar: "شبكات حاسوب (عملي)",
        aliases: ["معمل شبكات حاسوب", "معمل شبكات", "شبكات عملي", "computer networks lab", "packet tracer"]
      },
      "Embedded Systems": {
        code5: "ECOM 4422",
        code4: "ECOM 4301",
        code: "ECOM 4422 (خطة 5 سنوات) | ECOM 4301 (خطة 4 سنوات)",
        codes: ["ECOM 4422", "ECOM 4301"],
        ar: "نظم مدموجة",
        aliases: ["ECOM 4422", "ECOM 4301", "ECOM4422", "ECOM4301", "نظم مغموسة", "انظمة مدمجة", "انظمة مدموجة", "نظم مدمجة", "امبيدد", "امبيدد سيستمز", "embedded systems", "embedded"]
      },
      "Embedded Systems Lab": {
        code: "",
        ar: "نظم مدموجة (عملي)",
        aliases: ["معمل نظم مدموجة", "معمل امبيدد", "نظم مدمجة عملي", "embedded systems lab", "proteus"]
      },
      "VHDL": {
        code5: "ECOM 4423",
        code: "ECOM 4423",
        codes: ["ECOM 4423"],
        ar: "لغات وصف معدات حاسوب",
        aliases: ["ECOM 4423", "ECOM4423", "في اتش دي ال", "vhdl", "hardware description language"]
      },
      "VHDL Lab": {
        code: "",
        ar: "لغات وصف معدات حاسوب (عملي)",
        aliases: ["معمل vhdl", "معمل لغات وصف معدات حاسوب", "vhdl lab", "quartus"]
      },
      "Software Engineering": {
        code5: "ECOM 4424",
        code: "ECOM 4424",
        codes: ["ECOM 4424"],
        ar: "هندسة برمجيات",
        aliases: ["ECOM 4424", "ECOM4424", "هندسة البرمجيات", "سوفتوير", "software engineering", "software"]
      }
    }
  },
  year5: {
    semester1: {
      "AI": {
        code5: "OPTI 5401",
        code: "OPTI 5401",
        codes: ["OPTI 5401"],
        ar: "ذكاء اصطناعي",
        aliases: ["OPTI 5401", "OPTI5401", "الذكاء الاصطناعي", "ai", "artificial intelligence"]
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
        code5: "ECOM 5401",
        code: "ECOM 5401",
        codes: ["ECOM 5401"],
        ar: "أمن حاسوب وشبكات",
        aliases: ["ECOM 5401", "ECOM5401", "امن حاسوب وشبكات", "أمن شبكات", "امن شبكات", "سكيورتي", "network security", "cyber security"]
      },
      "Deep learning": {
        code5: "ECOM 5448",
        code: "ECOM 5448",
        codes: ["ECOM 5448"],
        ar: "تعلم عميق",
        aliases: ["ECOM 5448", "ECOM5448", "التعلم العميق", "ديب ليرنينج", "ديب ليرننج", "deep learning"]
      },
      "Network Security Lab": {
        code: "",
        ar: "أمن حاسوب وشبكات (عملي)",
        aliases: ["معمل أمن شبكات", "معمل امن شبكات", "امن شبكات عملي", "network security lab"]
      },
      "Digital Image Processing": {
        code5: "EELE 5426",
        code: "EELE 5426",
        codes: ["EELE 5426"],
        ar: "معالجة صور رقمية",
        aliases: ["EELE 5426", "EELE5426", "معالجة الصور الرقمية", "معالجة صور", "ايمج بروسيسنج", "image processing", "digital image processing"]
      }
    },
    semester2: {
      "Security In Computer Systems": {
        code: "",
        ar: "أمن في أنظمة الحاسوب",
        aliases: ["امن في انظمة الحاسوب", "امن انظمة", "security in computer systems"]
      },
      "Selected Topics Material": {
        code5: "ECOM 5400",
        code: "ECOM 5400",
        codes: ["ECOM 5400"],
        ar: "مواضيع مختارة",
        aliases: ["ECOM 5400", "ECOM5400", "مواضيع مختارة في هندسة الحاسوب", "مواضيع مختاره", "selected topics"]
      },
      "Distributed and parallel computerization": {
        code5: "ECOM 5416",
        code: "ECOM 5416",
        codes: ["ECOM 5416"],
        ar: "حوسبة متوزعة ومتوازية",
        aliases: ["ECOM 5416", "ECOM5416", "حوسبة موزعة ومتوازية", "حوسبة متوازية وموزعة", "حوسبة متوازية", "distributed and parallel", "parallel computing"]
      },
      "Renewable energy systems Lab": {
        code5: "ESMA 4106",
        code: "ESMA 4106",
        codes: ["ESMA 4106"],
        ar: "أنظمة الطاقة المتجددة (عملي)",
        aliases: ["ESMA 4106", "ESMA4106", "أنظمة الطاقة المتجددة", "انظمة الطاقة المتجددة", "معمل طاقة متجددة", "طاقة متجددة", "renewable energy"]
      }
    }
  }
};

// فهرس متطلبات الجامعة (uniRequirements.js)
const uniReqMeta = {
  "قرآن كريم 1": { code: "QURN 1101", codes: ["QURN 1101"], aliases: ["QURN 1101", "QURN1101", "قران كريم 1", "قران 1", "قرآن 1", "قران كريم (1)", "قرآن كريم (1)"] },
  "قرآن كريم 2": { code: "QURN 2101", codes: ["QURN 2101"], aliases: ["QURN 2101", "QURN2101", "قران كريم 2", "قران 2", "قرآن 2", "قران كريم (2)", "قرآن كريم (2)"] },
  "قرآن كريم 3": { code: "QURN 3101", codes: ["QURN 3101"], aliases: ["QURN 3101", "QURN3101", "قران كريم 3", "قران 3", "قرآن 3", "قران كريم (3)", "قرآن كريم (3)"] },
  "قرآن كريم 4": { code: "QURN 4102", codes: ["QURN 4102"], aliases: ["QURN 4102", "QURN4102", "قران كريم 4", "قران 4", "قرآن 4", "قران كريم (4)", "قرآن كريم (4)"] },
  "دراسات في العقيدة": { code: "AQID 3306", codes: ["AQID 3306"], aliases: ["AQID 3306", "AQID3306", "عقيدة", "العقيدة", "دراسات في العقيده", "عقيده"] },
  "دراسات في الفقه": { code: "SHAR 1202", codes: ["SHAR 1202"], aliases: ["SHAR 1202", "SHAR1202", "فقه", "الفقه", "دراسات فقه", "دراسات في الفقه"] },
  "دراسات في الحديث": { code: "HADT 4204", codes: ["HADT 4204"], aliases: ["HADT 4204", "HADT4204", "حديث", "الحديث", "دراسات في الحديث الشريف", "حديث شريف"] },
  "دراسات في السيرة النبوية": { code: "HADT 1202", codes: ["HADT 1202"], aliases: ["HADT 1202", "HADT1202", "سيرة", "السيرة", "دراسات في السيرة", "سيره نبوية", "سيرة نبوية"] },
  "دراسات في القرآن وعلومه": { code: "QURN 2201", codes: ["QURN 2201"], aliases: ["QURN 2201", "QURN2201", "علوم القران", "دراسات في القرآن وعلمه", "دراسات في القران وعلومه", "قران وعلومه"] },
  "دراسات فلسطينية": { code: "POLS 3220", codes: ["POLS 3220"], aliases: ["POLS 3220", "POLS3220", "دراسات فلسطينيه", "فلسطينية", "فلسطينيه", "قضية فلسطينية", "تاريخ فلسطين"] },
  "النظم الإسلامية": { code: "SHAR 2207", codes: ["SHAR 2207"], aliases: ["SHAR 2207", "SHAR2207", "النظم الاسلامية", "نظم اسلامية", "النظم الاسلاميه", "نظم اسلاميه"] },
  "حاضر العالم الإسلامي": { code: "AQID 3201", codes: ["AQID 3201"], aliases: ["AQID 3201", "AQID3201", "حاضر العالم الاسلامي", "حاضر", "حاضر العالم"] },
  "نحو وصرف": { code: "ARAB 1202", codes: ["ARAB 1202"], aliases: ["ARAB 1202", "ARAB1202", "اللغة العربية (نحو وصرف)", "عربي", "لغة عربية", "لغه عربيه", "اللغة العربية", "نحو"] },
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
        codes: meta.codes || (meta.code ? [meta.code] : []),
        code5: meta.code5 || "",
        code4: meta.code4 || "",
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
  const qPure = cleanQ.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

  for (const item of courseCatalog) {
    let score = 0;
    const nameNorm = normalizeText(item.name);
    const arNorm = normalizeText(item.arName);

    // فحص جميع الأكواد الخاصة بالمادة (سواء خطة 4 سنوات أو 5 سنوات)
    const codesList = Array.isArray(item.codes) && item.codes.length > 0
      ? item.codes
      : (item.code ? [item.code] : []);

    for (const c of codesList) {
      const cNorm = normalizeText(c);
      const cPure = c.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      if ((cNorm && cleanQ.includes(cNorm)) || (cPure && qPure && (qPure.includes(cPure) || cPure.includes(qPure)))) {
        score += 150;
        break;
      }
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

/**
 * Endless AI Quiz Generator Module for Computer Engineering Bot
 * Continuous, on-the-fly, subject-specialized question generation powered by Gemini AI.
 */

const { generateAIResponse } = require("./aiService");

const POPULAR_QUIZ_COURSES = [
  {
    name: "دوائر منطقية (Logic Design)",
    key: "Digital Logic Design",
    topics: "Boolean Algebra, K-Maps, Logic Gates, Flip-Flops, Combinational & Sequential Circuits, Counters, Decoders, Multiplexers, FSMs"
  },
  {
    name: "هياكل بيانات (Data Structures)",
    key: "Data Structures & Algorithms in C++",
    topics: "Linked Lists, Stacks, Queues, Binary Trees, BST, AVL Trees, Heaps, Graph BFS/DFS, Sorting, Time & Space Complexity Big-O"
  },
  {
    name: "برمجة C++ و OOP",
    key: "C++ Object Oriented Programming",
    topics: "Classes, Objects, Inheritance, Polymorphism, Virtual Functions, Pointers, Memory Allocation, Operator Overloading, Code Output Tracing"
  },
  {
    name: "معمارية حاسوب (Architecture)",
    key: "Computer Architecture & Assembly",
    topics: "8086 & MIPS Assembly, CPU Registers, Pipelining, Hazards, Cache Memory Hierarchy, Instruction Set Architecture (ISA)"
  },
  {
    name: "أنظمة تشغيل (OS)",
    key: "Operating Systems",
    topics: "Processes & Threads, CPU Scheduling (RR, SJF, FCFS), Deadlocks, Mutex & Semaphores, Virtual Memory, Paging, File Systems"
  },
  {
    name: "شبكات حاسوب (Networks)",
    key: "Computer Networks",
    topics: "OSI 7 Layers, TCP/IP Suite, Subnetting & IP Routing, TCP vs UDP, DNS, HTTP, ARP, Network Security & Protocols"
  },
  {
    name: "قواعد بيانات (Database & SQL)",
    key: "Database Systems & SQL",
    topics: "ER Modeling, Relational Algebra, SQL Queries (JOIN, GROUP BY, Subqueries), Normalization (1NF to BCNF), Transactions & ACID"
  },
  {
    name: "جبر خطي وكالكولس (Math)",
    key: "Linear Algebra & Engineering Calculus",
    topics: "Matrices, Determinants, Eigenvalues & Eigenvectors, Derivatives, Integrals, Taylor Series, Differential Equations"
  }
];

/**
 * عرض قائمة اختيار المادة للكويز
 */
function renderQuizSubjectMenu(chatId, bot) {
  const text = `📝 *مولّد الكويزات التفاعلي الذكي (Endless AI Quiz)*
━━━━━━━━━━━━━━━━━━━━

أهلاً بك! يولد هذا النظام أسئلة تدريبية واختبارية ذكية ومستمرة مخصصة لكل مادة بأسئلة جديدة ومتنوعة، ويستمر بالاختبار سؤالاً تلو الآخر حتى تقرر بنفسك إنهاء الكويز! 🎯🚀

👇 *اختر المادة للبدء، أو اكتب موضوعاً مخصصاً:*`;

  const keyboard = [];
  for (let i = 0; i < POPULAR_QUIZ_COURSES.length; i += 2) {
    const row = [
      { text: POPULAR_QUIZ_COURSES[i].name, callback_data: `quiz_subject_${i}` }
    ];
    if (POPULAR_QUIZ_COURSES[i + 1]) {
      row.push({ text: POPULAR_QUIZ_COURSES[i + 1].name, callback_data: `quiz_subject_${i + 1}` });
    }
    keyboard.push(row);
  }

  keyboard.push([
    { text: "✍️ كتابة موضوع أو مادة مخصصة", callback_data: "quiz_custom_subject_prompt" }
  ]);
  keyboard.push([
    { text: "🔙 العودة للقائمة الرئيسية", callback_data: "main_menu" }
  ]);

  bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard }
  });
}

/**
 * توليد دفعة جديدة من الأسئلة المتخصصة عبر الذكاء الاصطناعي
 */
async function fetchQuizBatch(subject, count = 4, alreadyAskedQuestions = []) {
  const matchedCourse = POPULAR_QUIZ_COURSES.find(c => c.name.includes(subject) || c.key.includes(subject));
  const topicsContext = matchedCourse ? `المواضيع الرئيسية للمساق تشمل: ${matchedCourse.topics}.` : "";
  const avoidContext = alreadyAskedQuestions.length > 0 
    ? `تجنب تكرار هذه الأسئلة التي طُرحت مسبقاً:\n- ${alreadyAskedQuestions.slice(-6).map(q => q.slice(0, 60)).join("\n- ")}`
    : "";

  const prompt = `أنت أستاذ ومصمم اختبارات جامعي خبير في قسم هندسة الحاسوب بالجامعة الإسلامية بغزة.
المطلوب: قم بتوليد ${count} أسئلة اختبار اختيار من متعدد (MCQ) جديدة، ذكية، ومتنوعة في مساق/موضوع: "${subject}".
${topicsContext}
${avoidContext}

شروط ومعايير الأسئلة:
1. الأسئلة يجب أن تكون باللغة العربية (مع المصطلحات الهندسية بالإنجليزية عند اللزوم).
2. تنويع الأسئلة: (سؤال مفاهيمي، مسألة حسابية أو منطقية، تتبع كود أو دائرة، ومقارنة بين خوارزميات/تقنيات).
3. لكل سؤال 4 خيارات (A, B, C, D) خيار واحد فقط صحيح بدقة علمية.
4. حدد رقم الإجابة الصحيحة (0 لـ A، 1 لـ B، 2 لـ C، 3 لـ D).
5. اكتب شرحاً علمياً هندسياً مبسطاً للإجابة الصحيحة.
6. أعد الناتج بتنسيق JSON فقط ولا تكتب أي مقدمة أو خاتمة:
[
  {
    "question": "نص السؤال هنا بوضوح",
    "options": ["الخيار الأول A", "الخيار الثاني B", "الخيار الثالث C", "الخيار الرابع D"],
    "correctIndex": 0,
    "explanation": "شرح هندسي وتوضيح للإجابة الصحيحة"
  }
]`;

  try {
    const response = await generateAIResponse(prompt);
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Error generating quiz batch from Gemini:", err.message);
  }

  // أسئلة احتياطية ذكية ومحكمة في حال انقطاع مؤقت
  return [
    {
      question: `في مساق ${subject}، ما هو المفهوم الأساسي الأكثر استخداماً لتحسين الأداء وتقليل التعقيد؟`,
      options: ["التخزين المؤقت والتحسين الخوارزمي", "زيادة التكرار العشوائي", "تجاهل الشروط الحدية", "إلغاء فحص الذاكرة"],
      correctIndex: 0,
      explanation: "استخدام التخزين المؤقت (Caching) والتحسين الخوارزمي يقلل من العمليات المكررة ويخفض التعقيد الزمني."
    },
    {
      question: `ما هو أفضل تعقيد زمني ممكن لخوارزميات الترتيب القائمة على المقارنة (Comparison-based Sorting) في الحالة العامة؟`,
      options: ["O(n)", "O(n log n)", "O(log n)", "O(1)"],
      correctIndex: 1,
      explanation: "الحد الأدنى النظري لخوارزميات الترتيب بالمقارنة مثل Merge Sort و Heap Sort هو O(n log n)."
    },
    {
      question: `ما هي الوظيفة الأساسية لبروتوكول ARP في شبكات الحاسوب؟`,
      options: ["تحويل عنوان IP إلى عنوان MAC الفيزيائي", "تشفير حزم البيانات", "توزيع عناوين IP تلقائياً", "ترجمة أسماء النطاقات DNS"],
      correctIndex: 0,
      explanation: "بروتوكول ARP (Address Resolution Protocol) يقوم بربط عنوان IP للشبكة بعنوان MAC على مستوى طبقة ربط البيانات."
    },
    {
      question: `في لغة C++، ما الذي يحدث عند استخدام الكلمة المفتاحية virtual مع الدوال في الصنف الأساسي (Base Class)؟`,
      options: ["تفعيل التعددية الشكلية وتحديد الدالة وقت التشغيل (Dynamic Binding)", "منع وراثة الصنف", "جعل الدالة ثابتة", "تسريع ترجمة الكود فقط"],
      correctIndex: 0,
      explanation: "الكلمة virtual تتيح الـ Runtime Polymorphism عبر جدول الدوال الوهمية (vtable)."
    }
  ];
}

/**
 * إرسال السؤال الحالي للطالب مع إحصائيات فورية
 */
async function sendCurrentQuestion(chatId, bot, userState) {
  const quiz = userState[chatId]?.activeQuiz;
  if (!quiz) return;

  // إذا كانت الأسئلة المتبقية في المخزن قليلة، قم بتوليد الدفعة التالية في الخلفية
  const remaining = (quiz.questions?.length || 0) - quiz.currentIndex;
  if (remaining <= 2 && !quiz.isFetchingMore) {
    quiz.isFetchingMore = true;
    const askedList = (quiz.questions || []).map(q => q.question);
    fetchQuizBatch(quiz.subject, 4, askedList).then(newBatch => {
      if (userState[chatId]?.activeQuiz && Array.isArray(newBatch)) {
        userState[chatId].activeQuiz.questions.push(...newBatch);
      }
      if (userState[chatId]?.activeQuiz) {
        userState[chatId].activeQuiz.isFetchingMore = false;
      }
    }).catch(() => {
      if (userState[chatId]?.activeQuiz) {
        userState[chatId].activeQuiz.isFetchingMore = false;
      }
    });
  }

  // إذا فرغت الأسئلة بالكامل، اطلب دفعة فورية
  if (quiz.currentIndex >= quiz.questions.length) {
    const loadingMsg = await bot.sendMessage(chatId, "⏳ *جاري توليد السؤال التالي بالذكاء الاصطناعي...*", { parse_mode: "Markdown" });
    const askedList = (quiz.questions || []).map(q => q.question);
    const freshBatch = await fetchQuizBatch(quiz.subject, 4, askedList);
    quiz.questions.push(...freshBatch);
    try { await bot.deleteMessage(chatId, loadingMsg.message_id); } catch (e) {}
  }

  const q = quiz.questions[quiz.currentIndex];
  const qNum = quiz.currentIndex + 1;
  const currentScore = quiz.score || 0;
  const answeredCount = quiz.currentIndex;

  const scoreDisplay = answeredCount > 0 
    ? ` | 🎯 النتيجة الحالية: *${currentScore}/${answeredCount}* (${Math.round((currentScore / answeredCount) * 100)}%)`
    : "";

  const text = `📝 *السؤال رقم (${qNum})* 📚 *مادة:* ${quiz.subject}${scoreDisplay}
━━━━━━━━━━━━━━━━━━━━

${q.question}

💡 *الخيارات المتاحة:*
🇦 ${q.options[0]}
🇧 ${q.options[1]}
🇨 ${q.options[2]}
🇩 ${q.options[3]}`;

  const keyboard = [
    [
      { text: "🇦 الخيار A", callback_data: `quiz_ans_0` },
      { text: "🇧 الخيار B", callback_data: `quiz_ans_1` }
    ],
    [
      { text: "🇨 الخيار C", callback_data: `quiz_ans_2` },
      { text: "🇩 الخيار D", callback_data: `quiz_ans_3` }
    ],
    [
      { text: "🏁 إنهاء الكويز وعرض النتيجة", callback_data: "quiz_finish_now" },
      { text: "❌ خروج", callback_data: "quiz_cancel" }
    ]
  ];

  await bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard }
  });
}

/**
 * معالجة إجابة الطالب وتصحيحها فورياً
 */
async function handleQuizAnswer(chatId, bot, selectedIndex, userState) {
  const quiz = userState[chatId]?.activeQuiz;
  if (!quiz || !quiz.questions || quiz.currentIndex >= quiz.questions.length) return;

  const q = quiz.questions[quiz.currentIndex];
  const isCorrect = selectedIndex === q.correctIndex;

  if (isCorrect) {
    quiz.score = (quiz.score || 0) + 1;
  }
  quiz.totalAnswered = (quiz.totalAnswered || 0) + 1;

  const letters = ["A", "B", "C", "D"];
  const correctLetter = letters[q.correctIndex];
  const chosenLetter = letters[selectedIndex];

  let feedback = "";
  if (isCorrect) {
    feedback = `✅ *إجابة صحيحة وممتازة! (Option ${chosenLetter})* 🎉\n\n💡 *الشرح والتوضيح الأكاديمي:*\n${q.explanation}`;
  } else {
    feedback = `❌ *إجابة غير صحيحة!*\n• إجابتك: *(${chosenLetter}) ${q.options[selectedIndex]}*\n• الإجابة الصحيحة: *(${correctLetter}) ${q.options[q.correctIndex]}*\n\n💡 *الشرح والتوضيح الأكاديمي:*\n${q.explanation}`;
  }

  quiz.currentIndex += 1;
  userState[chatId].activeQuiz = quiz;

  const nextQuestionNumber = quiz.currentIndex + 1;
  const actionKeyboard = [
    [
      { text: `➡️ الانتقال للسؤال التالي (#${nextQuestionNumber})`, callback_data: "quiz_next_question" }
    ],
    [
      { text: "🏁 إنهاء الكويز وعرض النتيجة النهائية", callback_data: "quiz_finish_now" }
    ]
  ];

  await bot.sendMessage(chatId, feedback, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: actionKeyboard }
  });
}

/**
 * إنهاء الكويز وعرض التقييم الشامل للنتيجة
 */
async function finishQuiz(chatId, bot, userState) {
  const quiz = userState[chatId]?.activeQuiz;
  const score = quiz?.score || 0;
  const total = quiz?.totalAnswered || quiz?.currentIndex || 0;
  const subject = quiz?.subject || "هندسة الحاسوب";
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  delete userState[chatId].activeQuiz;

  if (total === 0) {
    bot.sendMessage(chatId, "لم تقم بالإجابة على أي أسئلة بعد.", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔄 بدء كويز جديد", callback_data: "start_ai_quiz" }],
          [{ text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }]
        ]
      }
    });
    return;
  }

  let rating = "";
  let advice = "";
  if (percentage >= 90) {
    rating = "🏆 *التقييم:* امتياز فائق (Excellent Mastery) 🔥";
    advice = "مستواك استثنائي ومعلوماتك عميقة وراسخة في هذه المادة! واصل هذا التألق 🌟";
  } else if (percentage >= 75) {
    rating = "🌟 *التقييم:* جيد جداً مرتفع (Very Good)";
    advice = "أداء قوي وفهم متميز لمعظم مفاهيم المادة، بمراجعة بسيطة للنقاط غير المحلولة ستصل للامتياز الكامل!";
  } else if (percentage >= 60) {
    rating = "👍 *التقييم:* جيد (Good Performance)";
    advice = "أساسياتك جيدة، ننصحك بمراجعة السلايدات وحل نماذج بنك الامتحانات لترسيخ المفاهيم أكثر.";
  } else {
    rating = "💪 *التقييم:* في طور التدريب والتعلم";
    advice = "الاختبارات المستمرة هي أفضل طريقة لاكتشاف نقاط الضعف وتقويتها! راجع شروحات المادة وجرب كويزاً آخر.";
  }

  const resultText = `🏁 *تقرير النتيجة النهائية للكويز الذكي*
━━━━━━━━━━━━━━━━━━━━
📚 *المادة:* ${subject}
📊 *إجمالي الأسئلة المنجزة:* ${total} سؤال
✅ *الإجابات الصحيحة:* ${score}
❌ *الإجابات الخاطئة:* ${total - score}
📈 *النسبة المئوية:* *${percentage}%*

${rating}
💡 *التوجيه الأكاديمي:*
${advice}`;

  const keyboard = [
    [{ text: `🔄 إعادة كويز جديد في (${subject})`, callback_data: `quiz_subject_custom_retry_${encodeURIComponent(subject)}` }],
    [{ text: "📚 اختيار مادة أخرى", callback_data: "start_ai_quiz" }],
    [{ text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }]
  ];

  await bot.sendMessage(chatId, resultText, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard }
  });
}

module.exports = {
  renderQuizSubjectMenu,
  fetchQuizBatch,
  sendCurrentQuestion,
  handleQuizAnswer,
  finishQuiz,
  POPULAR_QUIZ_COURSES
};

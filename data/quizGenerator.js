/**
 * Interactive AI Quiz Generator Module for Computer Engineering Bot
 */

const { generateAIResponse } = require("./aiService");

const POPULAR_QUIZ_COURSES = [
  { name: "دوائر منطقية (Logic Design)", key: "Logic Design" },
  { name: "هياكل بيانات (Data Structures)", key: "Data Structures & Algorithms in C++" },
  { name: "برمجة C++ و OOP", key: "C++ Object Oriented Programming" },
  { name: "معمارية حاسوب (Architecture)", key: "Computer Architecture & Assembly" },
  { name: "أنظمة تشغيل (OS)", key: "Operating Systems" },
  { name: "شبكات حاسوب (Networks)", key: "Computer Networks" },
  { name: "قواعد بيانات (Database & SQL)", key: "Database Systems & SQL" },
  { name: "جبر خطي وكالكولس (Math)", key: "Linear Algebra & Calculus" }
];

/**
 * عرض قائمة اختيار المادة للكويز
 */
function renderQuizSubjectMenu(chatId, bot) {
  const text = `📝 *مولّد الكويزات والاختبارات التجريبية الذكي (AI Quiz)*
━━━━━━━━━━━━━━━━━━━━

اختر المادة التي تريد اختبار نفسك فيها، أو أرسل اسم أي موضوع أو مادة أخرى وسيقوم الذكاء الاصطناعي بتوليد كويز تفاعلي فوري لك! 🎯`;

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
    { text: "✍️ كتابة موضوع/مادة مخصصة", callback_data: "quiz_custom_subject_prompt" }
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
 * توليد أسئلة الكويز بصيغة JSON من Gemini
 */
async function generateQuizQuestions(subject, count = 4, difficulty = "متوسط") {
  const prompt = `أنت أستاذ ومصمم اختبارات لمساقات قسم هندسة الحاسوب.
أنشئ كويز تدريبي واختباري تفاعلي عالي الجودة في مادة: "${subject}"
بمستوى صعوبة: "${difficulty}"
وعدد أسئلة: ${count} أسئلة اختيار من متعدد (MCQ).

شروط مهمة جداً:
1. الأسئلة يجب أن تكون دقيقة علمياً وهندسياً وتختبر الفهم والتحليل وحساب المسائل وكتابة/تتبع الأكواد.
2. لكل سؤال 4 خيارات (A, B, C, D).
3. حدد الإجابة الصحيحة ورقمها (0 لـ A، 1 لـ B، 2 لـ C، 3 لـ D).
4. اكتب شرحاً علمياً مبسطاً للإجابة الصحيحة.
5. أعد النتيجة بتنسيق JSON فقط ولا تكتب أي نص قبله أو بعده، بالهيكل التالي:
[
  {
    "question": "نص السؤال هنا بالتفصيل",
    "options": ["الخيار A", "الخيار B", "الخيار C", "الخيار D"],
    "correctIndex": 0,
    "explanation": "شرح الإجابة الصحيحة ولماذا هي الصواب"
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
    console.error("Error generating quiz JSON:", err);
  }

  // أسئلة احتياطية في حال تعذر التوليد
  return [
    {
      question: `ما هو التعقيد الزمني (Time Complexity) لعملية البحث الثنائي (Binary Search) في مصفوفة مرتبة؟`,
      options: ["O(1)", "O(log n)", "O(n)", "O(n^2)"],
      correctIndex: 1,
      explanation: "البحث الثنائي يقسم نطاق البحث إلى النصف في كل خطوة، لذلك تعقيده الزمني هو O(log n)."
    },
    {
      question: `في الدوائر الرقمية، ما هي البوابة المنطقية التي تعطي مخرج 1 فقط إذا كان عدد المداخل 1 فرداً؟`,
      options: ["AND", "OR", "XOR", "NAND"],
      correctIndex: 2,
      explanation: "بوابة XOR (Exclusive OR) تعطي 1 عندما تكون المداخل مختلفة (فردية في حالة المدخلين)."
    }
  ];
}

/**
 * إرسال السؤال الحالي للطالب
 */
async function sendCurrentQuestion(chatId, bot, userState) {
  const quiz = userState[chatId]?.activeQuiz;
  if (!quiz || !quiz.questions || quiz.currentIndex >= quiz.questions.length) {
    // إنهاء الكويز وعرض النتيجة
    finishQuiz(chatId, bot, userState);
    return;
  }

  const q = quiz.questions[quiz.currentIndex];
  const qNum = quiz.currentIndex + 1;
  const total = quiz.questions.length;

  const text = `📝 *السؤال (${qNum} من ${total}):*
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
      { text: "❌ إنهاء الكويز", callback_data: "quiz_cancel" }
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

  const letters = ["A", "B", "C", "D"];
  const correctLetter = letters[q.correctIndex];
  const chosenLetter = letters[selectedIndex];

  let feedback = "";
  if (isCorrect) {
    feedback = `✅ *إجابة صحيحة يا بطل! (Option ${chosenLetter})* 🎉\n\n💡 *الشرح والتوضيح:*\n${q.explanation}`;
  } else {
    feedback = `❌ *إجابة غير صحيحة!*\n• إجابتك: *(${chosenLetter}) ${q.options[selectedIndex]}*\n• الإجابة الصحيحة: *(${correctLetter}) ${q.options[q.correctIndex]}*\n\n💡 *الشرح والتوضيح:*\n${q.explanation}`;
  }

  quiz.currentIndex += 1;
  userState[chatId].activeQuiz = quiz;

  const nextBtn = quiz.currentIndex < quiz.questions.length
    ? [{ text: "➡️ الانتقال للسؤال التالي", callback_data: "quiz_next_question" }]
    : [{ text: "🏁 عرض النتيجة النهائية", callback_data: "quiz_next_question" }];

  await bot.sendMessage(chatId, feedback, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: [nextBtn] }
  });
}

/**
 * إنهاء الكويز وعرض التقييم النهائي
 */
async function finishQuiz(chatId, bot, userState) {
  const quiz = userState[chatId]?.activeQuiz;
  const score = quiz?.score || 0;
  const total = quiz?.questions?.length || 0;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  delete userState[chatId].activeQuiz;

  let praise = "";
  if (percentage >= 90) praise = "🌟 ممتاز جداً! أداء هندسي فائق وعبقري! 🔥";
  else if (percentage >= 75) praise = "👏 جيد جداً! معلوماتك قوية ومرتبة، استمر في التميز!";
  else if (percentage >= 50) praise = "👍 أداء جيد، بمزيد من المراجعة والتركيز ستصل للامتياز!";
  else praise = "💪 لا بأس، الاختبارات التجريبية وسيلة للتعلم وسد الثغرات! راجع المادة وجرب مجدداً.";

  const resultText = `🏁 *اكتمل الكويز بنجاح!*
━━━━━━━━━━━━━━━━━━━━
📊 *النتيجة النهائية:*
• الإجابات الصحيحة: *${score} من ${total}*
• النسبة المئوية: *${percentage}%*

${praise}`;

  const keyboard = [
    [{ text: "🔄 بدء كويز جديد في مادة أخرى", callback_data: "start_ai_quiz" }],
    [{ text: "🔙 العودة للقائمة الرئيسية", callback_data: "main_menu" }]
  ];

  await bot.sendMessage(chatId, resultText, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard }
  });
}

module.exports = {
  renderQuizSubjectMenu,
  generateQuizQuestions,
  sendCurrentQuestion,
  handleQuizAnswer,
  finishQuiz,
  POPULAR_QUIZ_COURSES
};

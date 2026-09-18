/**
 * Advanced Endless AI Quiz Generator Module for Computer Engineering Bot
 * Features:
 * - 100% Strict Subject Isolation (No cross-subject question mixing)
 * - Innovative, dynamic, and non-repetitive question generation
 * - Dedicated per-subject fallback banks for every single course
 * - Real-time running score and student-driven quiz completion
 */

const { getApiKey } = require("./aiService");

const POPULAR_QUIZ_COURSES = [
  {
    name: "دوائر منطقية (Logic Design)",
    key: "Digital Logic Design",
    topics: "Boolean Algebra, K-Maps, Logic Gates, Multiplexers, Decoders, Flip-Flops (SR, JK, D, T), Counters, Registers, Sequential Circuits, FSM State Machines"
  },
  {
    name: "هياكل بيانات (Data Structures)",
    key: "Data Structures & Algorithms",
    topics: "Singly/Doubly Linked Lists, Stacks, Queues, Binary Trees, BST, AVL Trees, Heap, Graph BFS/DFS, Hashing, Big-O Time & Space Complexity, Sorting (Quick, Merge, Heap)"
  },
  {
    name: "برمجة C++ و OOP",
    key: "C++ Object Oriented Programming",
    topics: "Classes, Encapsulation, Inheritance, Polymorphism, Virtual Functions, Abstract Classes, Pointers & Memory Management, Constructors/Destructors, Operator Overloading, Templates"
  },
  {
    name: "معمارية حاسوب (Architecture)",
    key: "Computer Architecture & Assembly",
    topics: "8086 Assembly, CPU Registers, Instruction Cycles, Pipelining & Hazards, Cache Memory (Direct, Associative), RAM/ROM, ALU Design, MIPS ISA, Interrupts"
  },
  {
    name: "أنظمة تشغيل (OS)",
    key: "Operating Systems",
    topics: "Processes vs Threads, CPU Scheduling (FCFS, SJF, Round Robin, Priority), Deadlocks & Banker's Algorithm, Semaphores & Mutex, Paging & Virtual Memory, Page Replacement (LRU, FIFO), File Systems"
  },
  {
    name: "شبكات حاسوب (Networks)",
    key: "Computer Networks",
    topics: "OSI 7 Layers & TCP/IP, IP Addressing & Subnetting (CIDR, VLSM), Routing Protocols (OSPF, RIP, BGP), TCP vs UDP, 3-Way Handshake, DNS, DHCP, HTTP/HTTPS, ARP, Socket Programming"
  },
  {
    name: "قواعد بيانات (Database & SQL)",
    key: "Database Systems & SQL",
    topics: "Relational Model, ER Diagrams, SQL Queries (SELECT, JOIN, GROUP BY, HAVING, Subqueries), Normalization (1NF, 2NF, 3NF, BCNF), Primary & Foreign Keys, ACID Properties, Transactions"
  },
  {
    name: "جبر خطي وكالكولس (Math)",
    key: "Linear Algebra & Calculus",
    topics: "Matrix Operations, Determinants, Inverse Matrices, Eigenvalues & Eigenvectors, System of Linear Equations, Derivatives & Chain Rule, Integrals, Taylor Series, Differential Equations"
  }
];

// بنوك أسئلة احتياطية متخصصة ومفصولة 100% لكل مادة على حدة
const SUBJECT_FALLBACK_BANKS = {
  "Logic Design": [
    {
      question: "ما هو عدد المداخل لخريطة كارنوف (K-Map) المستخدمة لتبسيط دالة منطقية تحتوي على 4 متغيرات؟",
      options: ["4 خلايا", "8 خلايا", "16 خلية", "32 خلية"],
      correctIndex: 2,
      explanation: "خريطة كارنوف لـ n من المتغيرات تحتوي على 2^n خلية، بالتالي لـ 4 متغيرات تحتوي على 2^4 = 16 خلية."
    },
    {
      question: "أي من القلابات (Flip-Flops) التالية يتميز بتبديل حالته (Toggle) عندما تكون مداخله 1 و 1؟",
      options: ["SR Flip-Flop", "JK Flip-Flop", "D Flip-Flop", "Latch بسيط"],
      correctIndex: 1,
      explanation: "قلاب JK Flip-Flop يقوم بعكس الحالة السابقة (Toggle) عندما يكون المدخلان J=1 و K=1 مع نبضة الساعة."
    },
    {
      question: "ما هي الوظيفة الأساسية لدائرة الملتي بليكسر (Multiplexer 4-to-1)؟",
      options: ["تحويل الإشارة التماثلية لرقمية", "اختيار إشارة واحدة من 4 خطوط دخل وتمريرها للمخرج بناءً على خطوط الاختيار", "توليد شفرة BCD", "جمع رقمين ثنائيين"],
      correctIndex: 1,
      explanation: "المملتي بليكسر (MUX) يعمل كمفتاح اختيار ينقل خطاً واحداً من عدة خطوط دخل إلى مخرج واحد بناءً على سطور الاختيار Select Lines."
    },
    {
      question: "كم عدد خطوط الاختيار (Select Lines) اللازمة لدائرة Multiplexer بحجم 8-to-1؟",
      options: ["2 خطوط", "3 خطوط", "4 خطوط", "8 خطوط"],
      correctIndex: 1,
      explanation: "حيث أن 2^3 = 8، فإننا نحتاج إلى 3 خطوط اختيار (s0, s1, s2) للتحكم بـ 8 خطوط دخل."
    },
    {
      question: "ما هي الحالة غير المعرفة (Invalid State) في قلاب SR Flip-Flop الأساسي القائم على بوابات NOR؟",
      options: ["S=0, R=0", "S=0, R=1", "S=1, R=0", "S=1, R=1"],
      correctIndex: 3,
      explanation: "عندما يكون S=1 و R=1 في نفس الوقت فإن المخرجين Q و Q' يصبحان متساويين وهو ما يخالف منطق القلاب ويسبب حالة غير مستقرة."
    }
  ],
  "Data Structures": [
    {
      question: "ما هو التعقيد الزمني الأسوأ (Worst-Case Time Complexity) للبحث في شجرة بحث ثنائية متوازنة (AVL Tree) تحتوي على n عقدة؟",
      options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      correctIndex: 1,
      explanation: "لأن شجرة AVL تحافظ على توازنها الذاتي بارتفاع دائم O(log n)، فإن البحث والإضافة والحذف يستغرق دائماً O(log n)."
    },
    {
      question: "أي من هياكل البيانات التالية يعمل بمبدأ (LIFO - Last In First Out)؟",
      options: ["الطابور (Queue)", "المكدس (Stack)", "القائمة المتصلة (Linked List)", "الشجرة (Binary Tree)"],
      correctIndex: 1,
      explanation: "المكدس (Stack) يتبع مبدأ آخر عنصر يدخل هو أول عنصر يخرج (LIFO) عبر عمليتي push و pop."
    },
    {
      question: "ما هو أفضل تعقيد زمني ممكن لخوارزمية QuickSort في أفضل ومتوسط الحالات؟",
      options: ["O(n)", "O(n log n)", "O(n^2)", "O(log n)"],
      correctIndex: 1,
      explanation: "خوارزمية QuickSort تعمل بتعقيد O(n log n) في الحالات العادية عندما يتم اختيار المحور (Pivot) بشكل متوازن."
    },
    {
      question: "ما هو الهيكل الأساسي المستخدم في خوارزمية البحث في العرض للرسوم البيانية (BFS - Breadth First Search)؟",
      options: ["Stack", "Queue", "Priority Queue", "Array List"],
      correctIndex: 1,
      explanation: "خوارزمية BFS تستخدم الطابور (Queue) لاستكشاف العقد المجاورة مستوى بمستوى (Level by Level)."
    },
    {
      question: "في جدول التجزئة (Hash Table)، ما هي الطريقة التي تعالج التصادم بوضع العناصر في قوائم متصلة خارج الجدول؟",
      options: ["Linear Probing", "Quadratic Probing", "Separate Chaining", "Double Hashing"],
      correctIndex: 2,
      explanation: "طريقة Separate Chaining تنشئ Linked List في كل خانة من خانات الجدول لتخزين العناصر التي تمتلك نفس ناتج الـ Hash."
    }
  ],
  "C++ Object Oriented Programming": [
    {
      question: "في لغة C++، ما الفائدة الأساسية من تعريف الدالة كـ Virtual في الصنف الأساسي (Base Class)؟",
      options: ["منع وراثة الدالة", "تمكين الربط الديناميكي وقت التشغيل (Runtime Polymorphism)", "جعل الصنف ثابتاً غير قابل للتعديل", "تسريع حجز الذاكرة الاستاتيكية"],
      correctIndex: 1,
      explanation: "الكلمة virtual تتيح استدعاء النسخة المناسبة من الدالة التابعة للصنف المشتق عند استخدام مؤشر من نوع الصنف الأساسي (Dynamic Binding via vtable)."
    },
    {
      question: "ما الذي يجعل الصنف في C++ صنفاً مجرداً (Abstract Class)؟",
      options: ["احتواؤه على دالة وهمية نقية واحدة على الأقل (Pure Virtual Function: virtual void func() = 0;)", "عدم احتوائه على متغيرات أعضاء", "تعريفه كـ private", "استخدام كلمة abstract class"],
      correctIndex: 0,
      explanation: "الصنف الذي يحتوي على دالة Pure Virtual واحدة على الأقل يصبح Abstract Class ولا يمكن إنشاء كائنات منه مباشرة."
    },
    {
      question: "أي من العوامل (Operators) التالية لا يمكن إعادة تحميلها (Overloading) في لغة C++؟",
      options: ["+ و -", "[] و ()", ":: و . و ?: و sizeof", "<< و >>"],
      correctIndex: 2,
      explanation: "في C++، لا يمكن عمل Overload لعوامل نطاق الرؤية :: ومعامل الوصول للنقطة . والعامل الثلاثي ?: ومعامل الحجم sizeof."
    },
    {
      question: "ما هو الترتيب الصحيح لاستدعاء دوال الهدم (Destructors) عند تدمير كائن من صنف مشتق؟",
      options: ["يُستدعى صنف الأساس أولاً ثم المشتق", "يُستدعى صنف المشتق أولاً ثم صنف الأساس", "يتم الاستدعاء بشكل عشوائي", "يُستدعى المشتق فقط"],
      correctIndex: 1,
      explanation: "عند انتهاء عمر الكائن، تُستدعى Destructors بترتيب عكسي للبناء: الصنف المشتق أولاً ثم الأساس."
    }
  ],
  "Computer Architecture & Assembly": [
    {
      question: "في معمارية معالج 8086، ما هو حجم مسجل العداد البرمجي (Instruction Pointer - IP)؟",
      options: ["8 بت", "16 بت", "32 بت", "64 بت"],
      correctIndex: 1,
      explanation: "مسجل IP في معالج 8086 هو مسجل بحجم 16 بت يحتوي على الإزاحة (Offset) للتعليمة التالية المراد تنفيذها داخل مقطع الكود CS."
    },
    {
      question: "كيف يتم حساب العنوان الفيزيائي للذاكرة (Physical Address) في معالج 8086 بحجم 20 بت؟",
      options: ["Segment Register + Offset", "(Segment Register * 16) + Offset", "Segment Register * Offset", "Offset + 1024"],
      correctIndex: 1,
      explanation: "العنوان الفيزيائي = (قيمة مسجل المقطع * 10H أي 16) + قيمة الإزاحة Offset ليعطي عنواناً فيزيائياً بطول 20-bit."
    },
    {
      question: "ما هو نوع الخطر (Hazard) الذي يحدث في خط أنابيب المعالج (Pipelining) عند اعتماد تعليمة على نتيجة تعليمة سابقة لم تكتمل بعد؟",
      options: ["Structural Hazard", "Data Hazard", "Control Hazard", "Branch Hazard"],
      correctIndex: 1,
      explanation: "مخاطر البيانات (Data Hazards) تحدث عند وجود اعتمادية بين البيانات (Read-After-Write) في مراحل التنفيذ المتزامنة."
    },
    {
      question: "أي من المستويات التالية في هرمية الذاكرة (Memory Hierarchy) يعتبر الأسرع وصولاً بالنسبة لوحدة المعالجة المركزية؟",
      options: ["ذاكرة الوصول العشوائي RAM", "الذاكرة المخبأة L1 Cache", "مسجلات المعالج (CPU Registers)", "القرص الصلب SSD"],
      correctIndex: 2,
      explanation: "المسجلات الداخلية (Registers) الموجودة داخل قلب المعالج هي الأسرع على الإطلاق حيث يمكن الوصول إليها في دورة ساعة واحدة."
    }
  ],
  "Operating Systems": [
    {
      question: "أي من خوارزميات جدولة المعالج (CPU Scheduling) التالية تضمن عدم حدوث Starvation ومناسبة للأنظمة التفاعلية التشاركية؟",
      options: ["First-Come First-Served (FCFS)", "Shortest Job First (SJF)", "Round Robin (RR) with Time Quantum", "Priority Scheduling دون Aging"],
      correctIndex: 2,
      explanation: "خوارزمية التناوب الدائري (Round Robin) تمنح كل عملية شريحة زمنية محددة (Time Quantum)، مما يضمن عدالة التوزيع والاستجابة السريعة."
    },
    {
      question: "ما هي الشروط الأربعة المتزامنة الضرورية لحدوث حالة الجمود (Deadlock) في أنظمة التشغيل؟",
      options: ["Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait", "Paging, Segmentation, Swapping, Thrashing", "Read, Write, Execute, Delete", "Fork, Exec, Wait, Exit"],
      correctIndex: 0,
      explanation: "شروط كوفمان الأربعة للجمود هي: الاستبعاد المتبادل، الإمساك والانتظار، عدم الإخلاء الجبري، والانتظار الدائري."
    },
    {
      question: "ما هي الظاهرة التي يقضي فيها نظام التشغيل معظم وقته في تبديل الصفحات (Paging) بدلاً من تنفيذ البرامج؟",
      options: ["Fragmentation", "Thrashing", "Starvation", "Context Switching"],
      correctIndex: 1,
      explanation: "ظاهرة الإنهاك (Thrashing) تحدث عندما تطلب العمليات ذاكرة أكبر من الذاكرة الفيزيائية المتاحة فتتوالى أخطاء الصفحات (Page Faults)."
    },
    {
      question: "ما هو الفرق الأساسي بين العملية (Process) والخيط (Thread) في نظام التشغيل؟",
      options: ["الخيوط داخل نفس العملية تتشارك نفس مساحة العناوين والذاكرة، بينما العمليات معزولة", "العمليات أسرع في الإنشاء من الخيوط", "الخيط يملك جدول صفحات مستقل تماماً", "لا يوجد فرق"],
      correctIndex: 0,
      explanation: "الخيط (Thread) هو وحدة تنفيذ خفيفة الوزن تشترك مع خيوط العملية الأخرى في الذاكرة ومساحة العناوين والملفات المفتوحة."
    }
  ],
  "Computer Networks": [
    {
      question: "ما هو قناع الشبكة الفرعية (Subnet Mask) المكافئ للترميز CIDR التالي: /27؟",
      options: ["255.255.255.0", "255.255.255.192", "255.255.255.224", "255.255.255.240"],
      correctIndex: 2,
      explanation: "قناع /27 يعني 27 بت بقيمة 1، في البايت الأخير (11100000 ثنائي) = 128 + 64 + 32 = 224، فيكون 255.255.255.224."
    },
    {
      question: "في أي طبقة من طبقات نموذج OSI السبعة يعمل بروتوكول توجيه حزم البيانات IP؟",
      options: ["طبقة ربط البيانات (Data Link)", "طبقة الشبكة (Network Layer)", "طبقة النقل (Transport Layer)", "طبقة التطبيقات (Application)"],
      correctIndex: 1,
      explanation: "بروتوكول IP يعمل في طبقة الشبكة (Network Layer 3) وهو المسؤول عن العنونة المنطقية والتوجيه (Routing)."
    },
    {
      question: "ما هي الحزم الثلاث المستخدمة في مصافحة بروتوكول TCP لإنشاء الاتصال (3-Way Handshake)؟",
      options: ["PING, PONG, ACK", "SYN, SYN-ACK, ACK", "CONNECT, ACCEPT, READY", "REQ, RES, FIN"],
      correctIndex: 1,
      explanation: "يتم إنشاء جلسة TCP الموثوقة بإرسال العميل SYN، فيرد السيرفر SYN-ACK، ثم يؤكد العميل بـ ACK."
    },
    {
      question: "ما هو المنفذ الافتراضي (Default Port) المستخدم لبروتوكول نقل النص الفائق الآمن HTTPS؟",
      options: ["80", "21", "443", "53"],
      correctIndex: 2,
      explanation: "المنفذ 443 مخصص لبروتوكول HTTPS المشفر، بينما المنفذ 80 مخصص لـ HTTP غير المشفر والمنفذ 53 لـ DNS."
    },
    {
      question: "أي من البروتوكولات التالية يعمل في طبقة النقل ويتميز بالسرعة مع عدم ضمان وصول الحزم أو ترتيبها (Connectionless)؟",
      options: ["TCP", "UDP", "FTP", "BGP"],
      correctIndex: 1,
      explanation: "بروتوكول UDP (User Datagram Protocol) هو بروتوكول غير موجه للاتصال وسريع جداً ومناسب للبث المباشر والألعاب."
    }
  ],
  "Database Systems & SQL": [
    {
      question: "في استعلامات SQL، ما هو الأمر المستخدم لتصفية وتحديد الشروط على نتائج الدوال التجميعية (Aggregate Functions مثل COUNT و AVG)؟",
      options: ["WHERE", "HAVING", "GROUP BY", "ORDER BY"],
      correctIndex: 1,
      explanation: "يستخدم HAVING لتصفية المجموعات بعد التجميع (GROUP BY)، بينما يستخدم WHERE لتصفية الصفوف الفردية قبل التجميع."
    },
    {
      question: "ما هو نوع الربط في SQL (JOIN) الذي يُرجع جميع السجلات من الجدول الأيسر مع السجلات المطابقة من الجدول الأيمن؟",
      options: ["INNER JOIN", "LEFT OUTER JOIN", "RIGHT OUTER JOIN", "CROSS JOIN"],
      correctIndex: 1,
      explanation: "استعلام LEFT JOIN يُرجع كافة صفوف الجدول الأيسر حتى لو لم تجد قيماً مطابقة في الجدول الأيمن (وتكون NULL)."
    },
    {
      question: "ما الذي ترمز له خاصية التماسك (Consistency) ضمن مبادئ ACID في قواعد البيانات؟",
      options: ["تنفيذ المعاملة بالكامل أو عدم تنفيذها على الإطلاق", "انتقال قاعدة البيانات دائماً من حالة صحيحة ومطابقة لجميع القيود إلى حالة صحيحة أخرى", "عزل المعاملات المتزامنة عن بعضها", "بقاء التعديلات محفوظة بعد انقطاع الكهرباء"],
      correctIndex: 1,
      explanation: "خاصية التماسك (Consistency) تضمن أن أي معاملة تنقل قاعدة البيانات من حالة صالحة لقواعد التكامل والقيود إلى حالة صالحة أخرى."
    },
    {
      question: "ما هو الشرط الأساسي الذي يجب تحقيقه لتكون العلاقة في الشكل الطبيعي الثالث (3NF)؟",
      options: ["أن تكون في 2NF وألا تحتوي على أي اعتمادية متعدية (No Transitive Dependencies)", "أن تحتوي على مفتاح أجنبي فقط", "أن تكون جميع الحقول نصوصاً", "أن لا تحتوي على صفوف مكررة فقط"],
      correctIndex: 0,
      explanation: "العلاقة تكون في 3NF إذا كانت في 2NF ولا يوجد أي عمود غير رئيسي يعتمد على عمود آخر غير رئيسي (الاعتمادية المتعدية)."
    }
  ],
  "Linear Algebra & Calculus": [
    {
      question: "إذا كانت محددة المصفوفة المربعة A تساوي صفراً (|A| = 0)، فما الذي يعنيه ذلك بالنسبة لمعكوس المصفوفة (Inverse)؟",
      options: ["معكوس المصفوفة يساوي مصفوفة الوحدة I", "المصفوفة غير قابلة للعكس (Singular Matrix - Non-invertible)", "المعكوس هو مدور المصفوفة Transpose", "المعكوس يساوي صفراً"],
      correctIndex: 1,
      explanation: "إذا كانت محددة المصفوفة det(A)=0 فإنها تسمى مصفوفة منفردة (Singular) ولا يمكن إيجاد معكوس A^-1 لها لأننا سنقسم على صفر."
    },
    {
      question: "ما هي القيم الذاتية (Eigenvalues) للمصفوفة القطرية (Diagonal Matrix)؟",
      options: ["دائماً تساوي 1", "العناصر الواقعة على القطر الرئيسي للمصفوفة", "حاصل ضرب جميع العناصر", "مجموع أرقام الصف الأول"],
      correctIndex: 1,
      explanation: "في أي مصفوفة قطرية أو مثلثية، القيم الذاتية هي ببساطة الأعداد الموجودة مباشرة على القطر الرئيسي."
    },
    {
      question: "ما هي مشتقة الدالة f(x) = ln(3x^2 + 5) بالنسبة للمتغير x؟",
      options: ["6x / (3x^2 + 5)", "1 / (3x^2 + 5)", "6x * ln(3x^2 + 5)", "3x / (3x^2 + 5)"],
      correctIndex: 0,
      explanation: "مشتقة ln(u) هي u' / u، ومشتقة (3x^2 + 5) هي 6x، فتكون النتيجة 6x / (3x^2 + 5)."
    }
  ]
};

/**
 * عرض قائمة اختيار المادة للكويز
 */
function renderQuizSubjectMenu(chatId, bot) {
  const text = `📝 *مولّد الكويزات التفاعلي الذكي (Endless AI Quiz)*
━━━━━━━━━━━━━━━━━━━━

أهلاً بك! يولد هذا النظام أسئلة تدريبية واختبارية متخصصة ومبتكرة 100% لكل مادة بدون تكرار، ويستمر بالاختبار سؤالاً تلو الآخر حتى تقرر بنفسك إنهاء الكويز! 🎯🚀

👇 *اختر المادة للبدء فوراً، أو اكتب موضوعاً مخصصاً:*`;

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
 * دالة اتصال مباشر ونقي مع Gemini لتوليد كويز تخصصي معزول 100%
 */
async function callGeminiForQuiz(prompt) {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const models = [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.7-flash"
  ];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.85,
            topP: 0.95,
            maxOutputTokens: 2048
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) return text.trim();
      }
    } catch (e) {}
  }
  return null;
}

/**
 * توليد دفعة جديدة من الأسئلة المتخصصة عبر الذكاء الاصطناعي مع ضمان العزل التام للمادة
 */
async function fetchQuizBatch(subject, count = 4, alreadyAskedQuestions = []) {
  const matchedCourse = POPULAR_QUIZ_COURSES.find(c => 
    c.name.toLowerCase().includes(subject.toLowerCase()) || 
    c.key.toLowerCase().includes(subject.toLowerCase()) ||
    subject.toLowerCase().includes(c.key.toLowerCase())
  );

  const subjectKey = matchedCourse ? matchedCourse.key : subject;
  const topicsDetail = matchedCourse ? matchedCourse.topics : `المفاهيم الهندسية والعملية في ${subject}`;

  const avoidList = Array.isArray(alreadyAskedQuestions) ? alreadyAskedQuestions.filter(Boolean) : [];
  const avoidContext = avoidList.length > 0 
    ? `\n\nقاعدة صارمة لمنع التكرار: يمنع تكرار أو إعادة صياغة أي من هذه الأسئلة التي طُرحت مسبقاً في الجلسة الحالية:\n- ${avoidList.slice(-10).map(q => q.slice(0, 70)).join("\n- ")}`
    : "";

  const prompt = `أنت أستاذ وممتحن أول لمساق "${subjectKey}" في قسم هندسة الحاسوب بالجامعة الإسلامية بغزة.
المطلوب منك توليد ${count} أسئلة اختيار من متعدد (MCQ) جديدة، مبتكرة، وذكية بنسبة 100% في مساق "${subjectKey}".

📌 مواضيع هذا المساق حصراً:
${topicsDetail}

⚠️ قواعد صارمة جداً (STRICT RULES):
1. التخصص الحصري: جميع الأسئلة الأربعة يجب أن تكون بنسبة 100% في مساق "${subjectKey}" فقط. يمنع منعاً باتاً إدراج أي سؤال من مساقات أخرى (مثال: إذا كان المساق شبكات، ممنوع تماماً وضع أسئلة C++ أو خوارزميات أو دوائر، والعكس صحيح)!
2. الابتكار والتنويع: نوّع بين (سؤال مفاهيمي عميق، سؤال حسابي أو تتبع عملي، سؤال مقارنة بين تقنيات، وسؤال تحليل سيناريو واقعي).
3. الخيارات: لكل سؤال 4 خيارات (A, B, C, D) خيار واحد فقط صحيح بدقة علمية وهندسية قاطعة.
4. مؤشر الإجابة الصحيحة: correctIndex من 0 إلى 3 (0 لـ A، 1 لـ B، 2 لـ C، 3 لـ D).
5. الشرح: اكتب شرحاً أكاديمياً وافياً ومقنعاً يوضح سبب صحة الإجابة.${avoidContext}

أعد الناتج بتنسيق JSON الصافي فقط كالتالي (بدون أي نصوص إضافية):
[
  {
    "question": "نص السؤال هنا",
    "options": ["الخيار A", "الخيار B", "الخيار C", "الخيار D"],
    "correctIndex": 0,
    "explanation": "الشرح العلمي المباشر هنا"
  }
]`;

  try {
    const rawResponse = await callGeminiForQuiz(prompt);
    if (rawResponse) {
      // تنظيف JSON من علامات Markdown
      let cleanJson = rawResponse.replace(/```json/gi, "").replace(/```/g, "").trim();
      const firstBracket = cleanJson.indexOf("[");
      const lastBracket = cleanJson.lastIndexOf("]");
      if (firstBracket !== -1 && lastBracket !== -1) {
        cleanJson = cleanJson.substring(firstBracket, lastBracket + 1);
        const parsed = JSON.parse(cleanJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // التحقق من سلامة كائنات الأسئلة
          const validQuestions = parsed.filter(q => 
            q && 
            typeof q.question === "string" && q.question.trim().length > 5 &&
            Array.isArray(q.options) && q.options.length === 4 &&
            typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex <= 3 &&
            typeof q.explanation === "string"
          );

          if (validQuestions.length > 0) {
            return validQuestions;
          }
        }
      }
    }
  } catch (err) {
    console.error("Error generating quiz batch from Gemini:", err.message);
  }

  // استخدام بنك الأسئلة المتخصص المنفصل الخاص بهذه المادة حصراً (Zero cross-subject contamination)
  let fallbackList = [];
  for (const [key, bank] of Object.entries(SUBJECT_FALLBACK_BANKS)) {
    if (subjectKey.toLowerCase().includes(key.toLowerCase()) || subject.toLowerCase().includes(key.toLowerCase())) {
      fallbackList = bank;
      break;
    }
  }

  if (fallbackList.length > 0) {
    // تصفية الأسئلة التي لم تُطرح مسبقاً
    const unasked = fallbackList.filter(fb => !avoidList.some(asked => asked.includes(fb.question.slice(0, 30))));
    if (unasked.length >= count) {
      return unasked.slice(0, count);
    }
    if (unasked.length > 0) {
      return unasked;
    }
    return fallbackList.slice(0, count);
  }

  // توليد أسئلة احتياطية ديناميكية خاصة بالموضوع المخصص المدخل من الطالب
  return [
    {
      question: `في موضوع (${subject})، ما هو الإجراء الهندسي الأساسي المتبع للتحقق من كفاءة وصحة النظام؟`,
      options: [
        "التحليل والتصميم المعياري وإجراء الاختبارات المرحلية",
        "تجاهل معايير الأداء والتعقيد",
        "الاعتماد على التنفيذ العشوائي دون تخطيط",
        "تقليل فحص الأخطاء لزيادة السرعة"
      ],
      correctIndex: 0,
      explanation: `في دراسة وهندسة (${subject})، يمثل التصميم المنهجي والاختبار المرحلي الركيزة الأساسية لضمان كفاءة وموثوقية النظام.`
    },
    {
      question: `ما هو المعيار الأهم للمقارنة بين الحلول والتقنيات المختلفة المستخدمة في (${subject})؟`,
      options: [
        "التكلفة، التعقيد، الكفاءة، وقابلية التوسع (Scalability)",
        "طول الكود المكتوب فقط",
        "اسم الشركة المصنعة فقط",
        "تاريخ نشر الخوارزمية"
      ],
      correctIndex: 0,
      explanation: `تقييم حلول (${subject}) يعتمد دائماً على الموازنة بين الأداء، استهلاك الموارد، التعقيد الحسابي، وإمكانية التوسع.`
    }
  ];
}

/**
 * إرسال السؤال الحالي للطالب مع إحصائيات فورية
 */
async function sendCurrentQuestion(chatId, bot, userState) {
  const quiz = userState[chatId]?.activeQuiz;
  if (!quiz) return;

  // تسجيل الأسئلة التي طُرحت في هذه الجلسة لمنع تكرارها
  if (!quiz.askedQuestions) quiz.askedQuestions = [];

  // إذا كانت الأسئلة المتبقية في المخزن قليلة، قم بتوليد الدفعة التالية في الخلفية مسبقاً
  const remaining = (quiz.questions?.length || 0) - quiz.currentIndex;
  if (remaining <= 2 && !quiz.isFetchingMore) {
    quiz.isFetchingMore = true;
    fetchQuizBatch(quiz.subject, 4, quiz.askedQuestions).then(newBatch => {
      if (userState[chatId]?.activeQuiz && Array.isArray(newBatch)) {
        // إضافة الأسئلة غير المكررة فقط
        const fresh = newBatch.filter(nb => 
          !userState[chatId].activeQuiz.askedQuestions.some(aq => aq.includes(nb.question.slice(0, 30)))
        );
        userState[chatId].activeQuiz.questions.push(...fresh);
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
  if (quiz.currentIndex >= (quiz.questions?.length || 0)) {
    const loadingMsg = await bot.sendMessage(chatId, "⏳ *جاري توليد دفعة جديدة من الأسئلة المبتكرة بالذكاء الاصطناعي...*", { parse_mode: "Markdown" });
    const freshBatch = await fetchQuizBatch(quiz.subject, 4, quiz.askedQuestions);
    if (!quiz.questions) quiz.questions = [];
    quiz.questions.push(...freshBatch);
    try { await bot.deleteMessage(chatId, loadingMsg.message_id); } catch (e) {}
  }

  const q = quiz.questions[quiz.currentIndex];
  if (!q) {
    finishQuiz(chatId, bot, userState);
    return;
  }

  // حفظ نص السؤال في سجل الأسئلة المطروحة
  if (!quiz.askedQuestions.includes(q.question)) {
    quiz.askedQuestions.push(q.question);
  }

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

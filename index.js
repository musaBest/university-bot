const readline = require("readline");
const courses = require("./courses");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// دالة لعرض روابط مادة معينة مع البحث الذكي
function showCourse(courseNameInput) {
  const inputLower = courseNameInput.toLowerCase();

  // البحث عن المواد التي تحتوي النص
  const matchedCourses = Object.keys(courses).filter(name =>
    name.toLowerCase().includes(inputLower)
  );

  if (matchedCourses.length === 0) {
    console.log("لا توجد مادة تحتوي '" + courseNameInput + "'.");
    return;
  }

  if (matchedCourses.length > 1) {
    console.log("وجدنا أكثر من مادة تحتوي '" + courseNameInput + "':");
    matchedCourses.forEach(name => console.log("- " + name));
    console.log("حاول كتابة الاسم بالكامل لعرض الروابط.");
    return;
  }

  // إذا وجدنا مادة واحدة
  const courseName = matchedCourses[0];
  const course = courses[courseName];

  console.log("\nروابط مادة " + courseName + ":");
  for (const [key, value] of Object.entries(course)) {
    console.log("- " + key + ": " + value);
  }
  console.log("-----------------------------------");
}

// دالة لعرض كل المواد
function listCourses() {
  console.log("\nقائمة المواد المتوفرة:");
  Object.keys(courses).forEach((name, index) => {
    console.log((index + 1) + ". " + name);
  });
}

// القائمة الرئيسية
function mainMenu() {
  console.log("\nمرحباً بك في University Bot!");
  console.log("\nاختر عملية:");
  console.log("1. عرض كل المواد");
  console.log("2. عرض روابط مادة معينة");
  console.log("3. خروج");

  rl.question("\nادخل رقم العملية: ", answer => {
    switch(answer) {
      case "1":
        listCourses();
        mainMenu();
        break;
      case "2":
        rl.question("\nاكتب اسم المادة: ", name => {
          showCourse(name);
          mainMenu();
        });
        break;
      case "3":
        console.log("مع السلامة!");
        rl.close();
        break;
      default:
        console.log("خيار غير صحيح.");
        mainMenu();
    }
  });
}

mainMenu();
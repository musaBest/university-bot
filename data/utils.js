const fs = require("fs");
const path = require("path");

// توليد اسم ملف فريد للملف المرسل من الطالب
function generateFileName(userId, originalName) {
  const timestamp = Date.now();
  const ext = path.extname(originalName);
  return `${userId}_${timestamp}${ext}`;
}

// حفظ رابط الملف في pending
function savePendingFile(userId, fileLink) {
  const fileName = `${userId}_${Date.now()}.txt`;
  const filePath = path.join(__dirname, "data", "pending", fileName);
  fs.writeFileSync(filePath, fileLink);
  return fileName;
}

// قراءة كل الملفات بعد الموافقة (مثال)
function readApprovedFiles(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const files = fs.readdirSync(filePath);
  return files;
}

module.exports = {
  generateFileName,
  savePendingFile,
  readApprovedFiles
};
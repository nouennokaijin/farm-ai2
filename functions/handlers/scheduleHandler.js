const fs = require("fs");

/**
 * 簡易保存（まずはJSON or ExcelでもOK）
 */
async function saveSchedule(schedule) {
  const filePath = "./data/schedules.json";

  let data = [];

  try {
    data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    data = [];
  }

  data.push({
    ...schedule,
    createdAt: new Date().toISOString(),
  });

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = { saveSchedule };

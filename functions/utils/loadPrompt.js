const fs = require("fs");
const path = require("path");

function loadPrompt(name) {
  const filePath = path.join(
    __dirname,
    "../config/prompts",
    `${name}.txt`
  );

  return fs.readFileSync(filePath, "utf8");
}

module.exports = loadPrompt;

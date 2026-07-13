const fs = require('fs');
const path = require('path');

const STORAGE_DIR = path.join(__dirname, '../storage');

function ensureStorage() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, {
      recursive: true
    });
  }
}

function getFilePath(fileName) {
  ensureStorage();

  return path.join(
    STORAGE_DIR,
    fileName
  );
}

function readJson(fileName, fallback = []) {
  try {
    const data = fs.readFileSync(
      getFilePath(fileName),
      'utf8'
    );

    return JSON.parse(data);
  } catch {
    return fallback;
  }
}

function writeJson(fileName, data) {
  fs.writeFileSync(
    getFilePath(fileName),
    JSON.stringify(data, null, 2)
  );
}

module.exports = {
  readJson,
  writeJson
};

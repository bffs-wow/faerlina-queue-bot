const { log, logError } = require("./logger");
const fs = require("fs");

const cacheFile = "__cache.json";

function saveCache(key, data) {
  try {
    const cached = getCache() || {};
    cached[key] = data;
    fs.writeFileSync(cacheFile, JSON.stringify(cached));
  } catch (e) {
    logError(`Failed to save cache`, e);
  }
}

function getCache() {
  let data = null;
  try {
    if (fs.existsSync(cacheFile)) {
      const json = fs.readFileSync(cacheFile, {
        encoding: "utf8",
        flag: "r",
      });
      data = JSON.parse(json);
    }
    return data;
  } catch (e) {
    logError(`Failed to read cache`, e);
    return null;
  }
}

function getCacheEntry(key) {
  const cached = getCache() || {};
  return cached[key] || null;
}

function getCachedDate(key) {
  const cached = getCacheEntry(key);
  if (cached) {
    return new Date(cached);
  }
  return null;
}
module.exports.getCache = getCache;
module.exports.getCacheEntry = getCacheEntry;
module.exports.getCachedDate = getCachedDate;
module.exports.saveCache = saveCache;

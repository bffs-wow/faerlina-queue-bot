const axios = require("axios");
const fs = require("fs");
const { uniqBy, orderBy } = require("lodash");
const { log, logError } = require("./logger");

const apiUrl = process.env.API_URL;

/** @typedef {object} ApiResponse
 * @property {object[]} Items
 * @property {string|number} Items.time
 * @property {string|number} Items.position
 * @property {number} Items.ts
 * @property {number} Count
 * @property {number} ScannedCount
 */

module.exports.getCurrentQueue = async () => {
  const res = await axios.get(apiUrl);
  if (Array.isArray(res.data.Items)) {
    const items = orderBy(res.data.Items, "ts");
    saveHistory(items);
    // Instantiate Date objects from the raw timestamp (ts)
    return items.map((d) => ({ ...d, date: new Date(d.ts) }));
  } else {
    logError(
      `The API may not be functioning correctly. It did not return an array of data! Data sample: (${res.data.substr(
        0,
        100
      )})`
    );
  }

  return null;
};

const historyFile = "./__history.json";

function saveHistory(data) {
  try {
    let history = [];
    if (fs.existsSync(historyFile)) {
      const json = fs.readFileSync(historyFile, {
        encoding: "utf8",
        flag: "r",
      });
      history = JSON.parse(json);
    }
    history = uniqBy([...history, ...data], "ts");

    fs.writeFileSync(historyFile, JSON.stringify(history));
  } catch (e) {
    logError(`Failed to save history`, e);
  }
}

function getHistory() {
  try {
    let history = [];
    if (fs.existsSync(historyFile)) {
      const json = fs.readFileSync(historyFile, {
        encoding: "utf8",
        flag: "r",
      });
      history = JSON.parse(json);
    }

    return history;
  } catch (e) {
    logError(`Failed to read history`, e);
  }
}

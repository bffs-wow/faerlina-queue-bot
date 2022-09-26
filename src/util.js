const { log, logError } = require("./logger");

module.exports = {
  wait: function (ms) {
    log(`Pausing for ${ms} ms.`);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, ms);
    });
  },
};

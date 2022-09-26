module.exports = {
  log: (msg, ...data) => {
    console.log(`[${new Date().toUTCString()}] ${msg}`, ...data);
  },
  logError: (msg, exc, ...data) => {
    console.error(`[${new Date().toUTCString()}] ${msg}`, exc, ...data);
  },
};

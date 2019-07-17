const config = require("./config.json");
const { spawn } = require("child_process");
const fs = require("fs");

let fx = null;
let fd = null;
let isStarting = false;

console.log("MASTER CONTROL PROGRAM by Daniel A. Hawton");
console.log(`Starting control processing for ${config.server}`);

const mainLoop = () => {
  if (fx === null && !isStarting) {
    console.log("Server does not appear to be running, attempting to start");
    startFx();
  }

  if (fs.existsSync(`${config.restartFlag}`)) {
    console.log("Restart flag found, restarting server.");
    fs.unlink(`${config.restartFlag}`);
    isStarting = true;
    startFx();
  }
};

const resetLogs = () => {
  if (fs.existsSync(`${config.logPath}\\${config.logPrefix}.log`)) {
    let d = new Date();
    let fn =
      d.getFullYear() +
      "-" +
      (d.getMonth() > 10 ? "0" : "") +
      d.getMonth() +
      "-" +
      (d.getDate() > 10 ? "0" : "") +
      d.getDate();
    fs.renameSync(
      `${config.logPath}\\${config.logPrefix}.log`,
      `${config.logPath}\\${config.logPrefix}-${fn}.log`
    );
  }
};

const startFx = () => {
  if (fx !== null) {
    if (fd !== null) {
      fd.end();
    }
    fx.kill();
    resetLogs();
  }

  fd = fs.createWriteStream(`${config.logPath}\\${config.logPrefix}.log`, {
    flags: "w"
  });
  isStarting = true;
  fx = spawn(config.cmd);
  fx.stdout.pipe(fd);
  fx.stderr.pipe(fd);
  fx.on("close", () => {
    fx = null;
  });
  fx.stdout.on("data", data => {
    fs.write(fd, data);
  });
  isStarting = false;
};

mainLoop();
setInterval(mainLoop, 30000);

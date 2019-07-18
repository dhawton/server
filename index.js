const config = require("./config.json");
const { spawn } = require("child_process");
const fs = require("fs");
const rcon = require("./rcon");

let fx = null;
let fd = null;
let firstStart = true;
let crashed = false;
let dailyRestart = 0;
let conn = null;

console.log("MASTER CONTROL PROGRAM by Daniel A. Hawton");
console.log(`Starting control processing for ${config.server}`);
console.log("");

const mainLoop = () => {
  if (firstStart) {
    console.log(`Starting up server.`);
    startFx();
    firstStart = false;
  } else if (crashed) {
    console.log("Server appears to have crashed... restarting...");
    startFx();
  } else if (fs.existsSync(`${config.restartFlag}`)) {
    console.log("Restart flag found, restarting server.");
    fs.unlinkSync(`${config.restartFlag}`);
    startFx();
  } else {
    const d = new Date();
    if (d.getHours() === 4 && d.getMinutes() > 56 && dailyRestart < 4) {
      console.log(`Starting checks for automatic restart at 0500`);
      if (!conn)
        conn = new rcon(config.hostname, config.port, config.password, {
          tcp: false,
          challenge: false
        });
      if (d.getMinutes() === 57 && dailyRestart === 0) {
        console.log(`3 minutes to shutdown.`);
        conn.send(
          "shutdown Reports of an tsunami roaring toward the island that will end the world in ~r~3~w~ minutes! Evacuate now!"
        );
        dailyRestart = 1;
      }
      if (d.getMinutes() === 58 && dailyRestart === 1) {
        console.log(`2 minutes to shutdown.`);
        conn.send(
          "shutdown The world will end in ~r~2~w~ minutes. Evacuate now!"
        );
        dailyRestart = 2;
      }
      if (d.getMinutes() === 59 && dailyRestart === 2) {
        console.log(`1 minute to shutdown.`);
        conn.send(
          "shutdown The world will end in ~r~1~w~ minute. Evacuate now!"
        );
        dailyRestart = 3;
      }
    } else if (
      d.getHours() === 5 &&
      d.getMinutes() === 0 &&
      dailyRestart !== 4
    ) {
      console.log(`Commencing restart...`);
      dailyRestart = 4;
      startFx();
      dailyRestart = 0;
    }
  }
};

const resetLogs = () => {
  if (fs.existsSync(`${config.logPath}\\${config.logPrefix}.log`)) {
    let d = new Date();
    let fn =
      d.getFullYear() +
      "-" +
      (d.getMonth() < 10 ? "0" : "") +
      d.getMonth() +
      "-" +
      (d.getDate() < 10 ? "0" : "") +
      " " +
      d.getHours() +
      d.getMinutes();
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
  fx = spawn(config.cmd);
  fx.stdout.pipe(fd);
  fx.stderr.pipe(fd);
  fx.on("exit", () => {
    crashed = true;
  });
};

mainLoop();
setInterval(mainLoop, 10000);

const config = require("./config.json");
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const rcon = require("./rcon");

let fx = null;
let fd = null;
let firstStart = true;
let crashed = false;
let dailyRestart = 0;
let conn = null;
let wasKilled = false;
let hasNotifiedRestart = false;
let isStarting = false;

const print = msg => {
  let d = new Date();
  let prefix =
    d.getFullYear() +
    "-" +
    (d.getMonth() < 10 ? "0" : "") +
    d.getMonth() +
    "-" +
    (d.getDate() < 10 ? "0" : "") +
    d.getDate() +
    " " +
    (d.getHours() < 10 ? "0" : "") +
    d.getHours() +
    (d.getMinutes() < 10 ? "0" : "") +
    d.getMinutes();
  console.log(`[${prefix}] ${msg}`);
};

console.log("MASTER CONTROL PROGRAM by Daniel A. Hawton");
console.log(`Starting control processing for ${config.server}`);
console.log("");

const mainLoop = () => {
  if (firstStart) {
    print(`Starting up server.`);
    startFx();
    firstStart = false;
  } else if (fx == null && !isStarting) {
    print(`Server appears down and not being started...`);
    startFx();
  } else if (fs.existsSync(`${config.restartFlag}`)) {
    print("Restart flag found, restarting server.");
    fs.unlinkSync(`${config.restartFlag}`);
    stopFx();
    startFx();
  } else {
    const d = new Date();
    if (d.getHours() === 4 && d.getMinutes() > 56 && dailyRestart < 4) {
      if (!hasNotifiedRestart) {
        print(`Starting checks for automatic restart at 0500`);
        hasNotifiedRestart = true;
      }
      if (!conn)
        conn = new rcon(config.hostname, config.port, config.password, {
          tcp: false,
          challenge: false
        });
      if (d.getMinutes() === 57 && dailyRestart === 0) {
        print(`3 minutes to shutdown.`);
        conn.send(
          "shutdown Reports of an tsunami roaring toward the island that will end the world in ~r~3~w~ minutes! Evacuate now!"
        );
        dailyRestart = 1;
      }
      if (d.getMinutes() === 58 && dailyRestart === 1) {
        print(`2 minutes to shutdown.`);
        conn.send(
          "shutdown The world will end in ~r~2~w~ minutes. Evacuate now!"
        );
        dailyRestart = 2;
      }
      if (d.getMinutes() === 59 && dailyRestart === 2) {
        print(`1 minute to shutdown.`);
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
      print(`Commencing restart...`);
      hasNotifiedRestart = false;
      dailyRestart = 4;
      stopFx();
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
      d.getDate() +
      " " +
      (d.getHours() < 10 ? "0" : "") +
      d.getHours() +
      (d.getMinutes() < 10 ? "0" : "") +
      d.getMinutes() +
      (d.getSeconds() < 10 ? "0" : "") +
      d.getSeconds();
    try {
      fs.renameSync(
        `${config.logPath}\\${config.logPrefix}.log`,
        `${config.logPath}\\${config.logPrefix}-${fn}.log`
      );
    } catch (err) {
      print(err);
    }
  }
};

const stopFx = () => {
  if (fx !== null && !isStarting) {
    if (fd !== null) fd.end();

    fx.kill("SIGKILL");
    wasKilled = true;
    resetLogs();
    fx = null;
    isStarting = false;
  }
};

const startFx = () => {
  print("Starting git repo sync process.");
  isStarting = true;
  spawnSync(config.git, null, {
    cwd: config.cwd
  });
  print("Received END OF LINE. Continuing startup.");

  fd = fs.createWriteStream(`${config.logPath}\\${config.logPrefix}.log`, {
    flags: "w"
  });
  fx = spawn(config.cmd, null, { cwd: config.cwd });
  fx.stdout.pipe(fd);
  fx.stderr.pipe(fd);
  fx.on("exit", (code, signal) => {
    print("Exited with " + code + " signal " + signal);
    print(" ");

    setTimeout(startFx, 5000);
  });
  isStarting = false;
};

const exitHandler = () => {
  print("END OF LINE.");
  process.exit();
};

process.on("SIGINT", exitHandler.bind());

mainLoop();
setInterval(mainLoop, 10000);

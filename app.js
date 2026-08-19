import { CONFIG } from "/config.js";

// Editable values for this device. SECRET_CODE lives here (not config.js,
// which is reserved for the owner's launch-day values only).
const SECRET_CODE = "0420";
const INITIAL_SECONDS = 4 * 60 + 20; // 00:04:20
const FINAL_THRESHOLD = 10;

const AUDIO_BASE = "/assets/audio/";
const AUDIO_FILES = {
  keypad: "keypad.mp3",
  beep: "beep.mp3",
  error: "error.mp3",
  defused: "defused.mp3",
  activate: "activate.mp3",
  glitch: "glitch.mp3",
  hum: "hum.mp3",
};

const IDLE_LOG = [
  "> device detected",
  "> scanning...",
  "> cat detected",
  "> explosives detected",
  "> thoughts detected: 0",
  "> c4t armed",
  "> threat level: silly",
  "> wire integrity nominal",
  "> keypad responsive",
  "> awaiting input",
  "> cat status: motionless",
];

const state = {
  secondsLeft: INITIAL_SECONDS,
  paused: false,
  activated: false,
  blown: false,
  digits: [],
  soundOn: false,
};

// ---- DOM refs ----
const statusDot = document.getElementById("statusDot");
const deviceStatus = document.getElementById("deviceStatus");
const xLink = document.getElementById("xLink");
const buyLink = document.getElementById("buyLink");
const c4tImage = document.getElementById("c4tImage");
const statusText = document.getElementById("statusText");
const countdownEl = document.getElementById("countdown");
const stageEl = document.querySelector(".stage");
const slotsEl = document.getElementById("slots");
const keypadMsg = document.getElementById("keypadMsg");
const keypadGrid = document.getElementById("keypadGrid");
const doNotPress = document.getElementById("doNotPress");
const terminalLines = document.getElementById("terminalLines");
const caValueEl = document.getElementById("caValue");
const copyCaBtn = document.getElementById("copyCa");
const soundToggle = document.getElementById("soundToggle");
const blownPayoff = document.getElementById("blownPayoff");
const taglineEl = document.getElementById("tagline");
const againBtn = document.getElementById("againBtn");
const flashEl = document.getElementById("flash");

// ---- audio ----
const audioCache = {};
function getAudio(name) {
  if (!audioCache[name]) {
    const el = new Audio(AUDIO_BASE + AUDIO_FILES[name]);
    el.preload = "none";
    audioCache[name] = el;
  }
  return audioCache[name];
}
function playSfx(name, volume) {
  if (!state.soundOn) return;
  const base = getAudio(name);
  const node = base.cloneNode(true);
  node.volume = volume == null ? 1 : volume;
  node.play().catch(() => {});
}
let humEl = null;
function setSound(on) {
  state.soundOn = on;
  soundToggle.textContent = "SOUND: " + (on ? "ON" : "OFF");
  soundToggle.dataset.on = String(on);
  if (on) {
    if (!humEl) {
      humEl = getAudio("hum");
      humEl.loop = true;
      humEl.volume = 0.5;
    }
    humEl.play().catch(() => {});
  } else if (humEl) {
    humEl.pause();
  }
}
soundToggle.addEventListener("click", () => setSound(!state.soundOn));

// ---- terminal log ----
let idleLogTimer = null;
let idleLogIndex = 0;
function logLine(text, kind) {
  const line = document.createElement("div");
  line.textContent = text;
  line.className = "line-in" + (kind ? " line-" + kind : "");
  terminalLines.appendChild(line);
  while (terminalLines.children.length > 6) {
    terminalLines.removeChild(terminalLines.firstChild);
  }
}
function scheduleIdleLog() {
  clearTimeout(idleLogTimer);
  idleLogTimer = setTimeout(() => {
    if (!state.blown) {
      logLine(IDLE_LOG[idleLogIndex % IDLE_LOG.length]);
      idleLogIndex++;
    }
    scheduleIdleLog();
  }, 5200 + Math.random() * 4200);
}
function runBootLog() {
  const boot = ["> device detected", "> scanning...", "> cat detected", "> explosives detected", "> thoughts detected: 0", "> c4t armed"];
  boot.forEach((line, i) => {
    setTimeout(() => logLine(line), 260 + i * 620);
  });
  idleLogIndex = boot.length;
  setTimeout(scheduleIdleLog, 260 + boot.length * 620 + 3000);
}

// ---- status / countdown ----
function setStatus(text, cls) {
  statusText.textContent = text;
  statusText.className = "status-text" + (cls ? " " + cls : "");
}
function pad2(n) {
  return String(n).padStart(2, "0");
}
function formatTime(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return "00:" + pad2(mm) + ":" + pad2(ss);
}
function updateCountdownDisplay() {
  countdownEl.textContent = formatTime(state.secondsLeft);
  countdownEl.classList.toggle("is-final", state.secondsLeft <= FINAL_THRESHOLD && !state.blown);
}

// ---- beep scheduling (self-correcting: reads live secondsLeft each fire) ----
let beepTimer = null;
function scheduleBeep() {
  clearTimeout(beepTimer);
  if (state.blown || state.paused) return;
  const final = state.secondsLeft <= FINAL_THRESHOLD;
  let delay;
  if (final) {
    const t = Math.max(0, Math.min(1, state.secondsLeft / FINAL_THRESHOLD));
    delay = 110 + t * 590; // 700ms at 10s down to 110ms near 0
  } else {
    delay = 4200 + Math.random() * 2600;
  }
  beepTimer = setTimeout(() => {
    if (state.blown || state.paused) return;
    playSfx("beep", final ? 0.55 : 0.32);
    if (final) triggerFinalPulse();
    scheduleBeep();
  }, delay);
}
function forceRescheduleBeep() {
  clearTimeout(beepTimer);
  scheduleBeep();
}

let lastGlitchAt = 0;
function triggerFinalPulse() {
  c4tImage.classList.remove("jitter-now");
  void c4tImage.offsetWidth;
  c4tImage.classList.add("jitter-now");

  const now = performance.now();
  if (now - lastGlitchAt > 220) {
    lastGlitchAt = now;
    stageEl.classList.remove("is-glitching");
    void stageEl.offsetWidth;
    stageEl.classList.add("is-glitching");
  }
}

// ---- main tick ----
setInterval(() => {
  if (state.paused || state.blown) return;
  state.secondsLeft -= 1;
  if (state.secondsLeft <= 0) {
    state.secondsLeft = 0;
    updateCountdownDisplay();
    detonate();
    return;
  }
  updateCountdownDisplay();
}, 1000);

// ---- keypad ----
function renderSlots() {
  const slots = slotsEl.querySelectorAll(".slot");
  slots.forEach((el, i) => {
    el.textContent = state.digits[i] || "";
    el.classList.toggle("filled", Boolean(state.digits[i]));
  });
}
function flashSlotsWrong() {
  const slots = slotsEl.querySelectorAll(".slot");
  slots.forEach((el) => el.classList.add("slot-wrong"));
  setTimeout(() => slots.forEach((el) => el.classList.remove("slot-wrong")), 500);
}

let defuseTimerA = null;
let defuseTimerB = null;
let wrongRevertTimer = null;

function submitCode() {
  if (state.blown) return;
  if (state.digits.length < 4) {
    keypadMsg.textContent = "CODE INCOMPLETE";
    flashSlotsWrong();
    playSfx("error", 0.2);
    logLine("> code incomplete");
    return;
  }
  const entered = state.digits.join("");
  state.digits = [];
  renderSlots();

  if (entered === SECRET_CODE) {
    clearTimeout(defuseTimerA);
    clearTimeout(defuseTimerB);
    clearTimeout(wrongRevertTimer);
    state.paused = true;
    keypadMsg.textContent = "";
    setStatus("BOMB DEFUSED", "is-defused");
    countdownEl.classList.add("is-frozen");
    playSfx("defused", 0.6);
    logLine("> defuse sequence accepted", "ok");
    defuseTimerA = setTimeout(() => {
      setStatus("just kidding", "is-defused");
      logLine("> just kidding");
      defuseTimerB = setTimeout(() => {
        state.paused = false;
        countdownEl.classList.remove("is-frozen");
        setStatus(state.activated ? "C4T ACTIVATED" : "C4T ARMED", state.activated ? "is-activated" : "");
        logLine("> c4t still armed", "warn");
        forceRescheduleBeep();
      }, 1400);
    }, 1500);
    return;
  }

  keypadMsg.textContent = "WRONG CODE";
  flashSlotsWrong();
  stageEl.classList.remove("is-glitching");
  void stageEl.offsetWidth;
  stageEl.classList.add("is-glitching");
  playSfx("error", 0.6);
  setStatus("WRONG CODE", "is-wrong");
  logLine("> wrong code", "warn");
  logLine("> c4t still armed", "warn");

  const penalty = 3 + Math.floor(Math.random() * 5);
  state.secondsLeft = Math.max(1, state.secondsLeft - penalty);
  updateCountdownDisplay();
  forceRescheduleBeep();

  clearTimeout(wrongRevertTimer);
  wrongRevertTimer = setTimeout(() => {
    if (!state.blown && !state.paused) {
      setStatus(state.activated ? "C4T ACTIVATED" : "C4T ARMED", state.activated ? "is-activated" : "");
      keypadMsg.textContent = "";
    }
  }, 1300);
}

// autoplay is only legal after a real user gesture; the very first keypad
// press or DO NOT PRESS click quietly turns sound on so visitors do not
// have to notice the small footer toggle first. the toggle still works to
// mute it again.
function ensureSoundOn() {
  if (!state.soundOn) setSound(true);
}

function onKeyPress(key) {
  if (state.blown) return;
  ensureSoundOn();
  if (key === "clr") {
    state.digits = [];
    renderSlots();
    keypadMsg.textContent = "";
    playSfx("keypad", 0.35);
    return;
  }
  if (key === "ok") {
    submitCode();
    return;
  }
  if (state.digits.length >= 4) {
    keypadMsg.textContent = "FULL - PRESS OK OR CLR";
    flashSlotsWrong();
    playSfx("error", 0.18);
    return;
  }
  state.digits.push(key);
  renderSlots();
  keypadMsg.textContent = "";
  playSfx("keypad", 0.45);
}

keypadGrid.addEventListener("click", (e) => {
  const btn = e.target.closest(".key");
  if (!btn) return;
  onKeyPress(btn.dataset.key);
  btn.classList.add("is-pressed");
  setTimeout(() => btn.classList.remove("is-pressed"), 90);
});

document.addEventListener("keydown", (e) => {
  if (state.blown) return;
  if (/^[0-9]$/.test(e.key)) onKeyPress(e.key);
  else if (e.key === "Enter") onKeyPress("ok");
  else if (e.key === "Backspace" || e.key === "Escape") onKeyPress("clr");
});

// ---- do not press ----
doNotPress.addEventListener("click", () => {
  if (state.blown) return;
  ensureSoundOn();
  clearTimeout(defuseTimerA);
  clearTimeout(defuseTimerB);
  clearTimeout(wrongRevertTimer);
  state.activated = true;
  state.paused = false;
  state.secondsLeft = FINAL_THRESHOLD;
  countdownEl.classList.remove("is-frozen");
  setStatus("C4T ACTIVATED", "is-activated");
  updateCountdownDisplay();
  playSfx("activate", 0.6);
  logLine("> unauthorized input detected", "warn");
  logLine("> c4t activated", "warn");
  forceRescheduleBeep();
});

// ---- detonate / reset ----
// The whole sequence stays INSIDE the existing interface (device panel,
// keypad, terminal all remain visible) - only a brief flash/shake, then
// the same terminal turns red and glitchy, the same cat JPEG gets punchy
// bigger, and the payoff text appears. No separate end screen.
function detonate() {
  if (state.blown) return;
  state.blown = true;
  clearTimeout(beepTimer);
  clearTimeout(defuseTimerA);
  clearTimeout(defuseTimerB);
  clearTimeout(wrongRevertTimer);
  clearTimeout(idleLogTimer);
  setStatus("C4T BLEW UP", "is-blown");
  updateCountdownDisplay();

  // 1. impact: flash + shake + glitch + sound
  flashEl.classList.remove("is-active");
  void flashEl.offsetWidth;
  flashEl.classList.add("is-active");
  stageEl.classList.add("is-glitching");
  playSfx("glitch", 0.7);

  setTimeout(() => {
    stageEl.classList.remove("is-glitching");
  }, 400);

  // 2. after flash: interface stays, gets fucked up
  setTimeout(() => {
    stageEl.classList.add("is-blown");
    logLine("> ERR0R // c4t bl3w up", "warn");
    logLine("> t3rminal c0rrupted", "warn");

    // 3. cat payoff: same JPEG, punchy bigger, brief shake, then settle
    c4tImage.classList.add("is-blown-scale");

    // 4. text
    taglineEl.hidden = true;
    blownPayoff.hidden = false;
  }, 150);
}

againBtn.addEventListener("click", () => {
  state.blown = false;
  state.activated = false;
  state.paused = false;
  state.digits = [];
  state.secondsLeft = INITIAL_SECONDS;
  renderSlots();
  keypadMsg.textContent = "";
  countdownEl.classList.remove("is-frozen");
  setStatus("C4T ARMED", "");
  updateCountdownDisplay();
  stageEl.classList.remove("is-glitching", "is-blown");
  c4tImage.classList.remove("is-blown-scale");
  blownPayoff.hidden = true;
  taglineEl.hidden = false;

  logLine("> device reassembled");
  logLine("> cat detected");
  logLine("> c4t armed");
  scheduleIdleLog();
  forceRescheduleBeep();
});

// ---- footer chrome ----
function wireLinks() {
  caValueEl.textContent = CONFIG.ca || "WIRE_NOT_CUT_YET";

  if (CONFIG.pump) {
    buyLink.href = CONFIG.pump;
  } else {
    buyLink.href = "#";
    buyLink.classList.add("is-disabled");
    buyLink.addEventListener("click", (e) => {
      e.preventDefault();
      logLine("> buy link not wired yet");
    });
  }

  if (CONFIG.x) {
    xLink.href = CONFIG.x;
  } else {
    xLink.href = "#";
    xLink.classList.add("is-disabled");
    xLink.addEventListener("click", (e) => {
      e.preventDefault();
      logLine("> x link not wired yet");
    });
  }
}

copyCaBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(caValueEl.textContent);
  } catch (e) {
    /* clipboard denied - still flip the label as an honest best-effort */
  }
  copyCaBtn.textContent = "COPIED";
  copyCaBtn.classList.add("is-copied");
  setTimeout(() => {
    copyCaBtn.textContent = "COPY";
    copyCaBtn.classList.remove("is-copied");
  }, 1400);
});

// ---- boot ----
function boot() {
  deviceStatus.textContent = "DEVICE ONLINE";
  deviceStatus.classList.add("is-online");
  statusDot.classList.add("is-online");
  wireLinks();
  renderSlots();
  updateCountdownDisplay();
  runBootLog();
  scheduleBeep();
}
boot();

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ui = {
  score: document.getElementById("score"),
  shotsUsed: document.getElementById("shotsUsed"),
  shotsTotal: document.getElementById("shotsTotal"),
  highScore: document.getElementById("highScore"),
  remainingTime: document.getElementById("remainingTime"),
  startOverlay: document.getElementById("startOverlay"),
  resultOverlay: document.getElementById("resultOverlay"),
  playerName: document.getElementById("playerName"),
  resultTitle: document.getElementById("resultTitle"),
  resultText: document.getElementById("resultText"),
  resultEyebrow: document.getElementById("resultEyebrow"),
  leaderboard: document.getElementById("leaderboardList"),
  resultLeaderboard: document.getElementById("resultLeaderboardList"),
  leaderboardTabs: document.getElementById("leaderboardTabs"),
  resultLeaderboardTabs: document.getElementById("resultLeaderboardTabs"),
  clearLeaderboard: document.getElementById("clearLeaderboardButton"),
  message: document.getElementById("shotMessage"),
  settingsButton: document.getElementById("settingsButton"),
  killLog: document.getElementById("killLog"),
  killLogName: document.getElementById("killLogName"),
  killLogCount: document.getElementById("killLogCount"),
  killLogBanner: document.getElementById("killLogBanner"),
  settingsOverlay: document.getElementById("settingsOverlay"),
  pauseOverlay: document.getElementById("pauseOverlay"),
  pauseButton: document.getElementById("pauseButton"),
  pauseSettingsButton: document.getElementById("pauseSettingsButton"),
  resumeButton: document.getElementById("resumeButton"),
  theme: document.getElementById("themeSelect"),
  killVolume: document.getElementById("killVolume"),
  killVolumeValue: document.getElementById("killVolumeValue"),
  backgroundMusicVolume: document.getElementById("backgroundMusicVolume"),
  backgroundMusicVolumeValue: document.getElementById("backgroundMusicVolumeValue"),
  killSounds: document.getElementById("killSounds"),
  killSoundSet: document.getElementById("killSoundSet"),
  extendedKillSounds: document.getElementById("extendedKillSounds"),
  backgroundMusicEnabled: document.getElementById("backgroundMusicEnabled"),
  targetColor: document.getElementById("targetColor"),
  textColor: document.getElementById("textColor"),
  closeSettings: document.getElementById("closeSettingsButton"),
  targetDuration: document.getElementById("targetDuration"),
  targetDurationValue: document.getElementById("targetDurationValue"),
  homeButton: document.getElementById("homeButton"),
  footerResetButton: document.getElementById("footerResetButton"),
  footerHomeButton: document.getElementById("footerHomeButton")
};

function loadNumberSetting(key, fallback, min, max) {
  const saved = Number(localStorage.getItem(key));
  return Number.isFinite(saved) && saved >= min && saved <= max ? saved : fallback;
}

function loadLeaderboard() {
  const saved = JSON.parse(localStorage.getItem("aimLeaderboard") || "[]");
  if (!Array.isArray(saved)) return [];
  return saved.filter(entry =>
    entry &&
    typeof entry.name === "string" &&
    Number.isInteger(entry.successes) &&
    entry.successes >= 0 &&
    entry.successes <= 100
  ).map(entry => ({
    ...entry,
    duration: Number.isFinite(Number(entry.duration)) && Number(entry.duration) >= 0.1 && Number(entry.duration) <= 5
      ? Number(entry.duration)
      : state?.targetDuration ?? null
  }));
}

function renderLeaderboard(list, entries, limit) {
  list.replaceChildren();
  const topEntries = entries.slice(0, limit);
  if (topEntries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "leaderboard-empty";
    empty.textContent = "まだ記録がありません";
    list.append(empty);
    return;
  }

  topEntries.forEach(entry => {
    const item = document.createElement("li");
    const name = document.createElement("span");
    const score = document.createElement("strong");
    name.textContent = entry.name;
    score.textContent = `${entry.successes} 個成功`;
    item.append(name, score);
    list.append(item);
  });
}

function getLeaderboard() {
  return loadLeaderboard().sort((first, second) => second.successes - first.successes);
}

function formatDuration(duration) {
  return `${Number(duration).toFixed(1)}秒`;
}

function getDurations(entries) {
  const durations = [...new Set(entries
    .map(entry => entry.duration)
    .filter(duration => Number.isFinite(duration)))];
  if (!durations.includes(state.targetDuration)) durations.push(state.targetDuration);
  return durations.sort((first, second) => first - second);
}

let selectedLeaderboardDuration = null;

function renderLeaderboardTabs(tabs, entries, targetList, limit) {
  const durations = getDurations(entries);
  if (selectedLeaderboardDuration === null || !durations.includes(selectedLeaderboardDuration)) {
    selectedLeaderboardDuration = durations.includes(state.targetDuration)
      ? state.targetDuration
      : durations[0];
  }

  tabs.replaceChildren();
  durations.forEach(duration => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = `leaderboard-tab${duration === selectedLeaderboardDuration ? " active" : ""}`;
    tab.textContent = formatDuration(duration);
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", String(duration === selectedLeaderboardDuration));
    tab.addEventListener("click", () => {
      selectedLeaderboardDuration = duration;
      renderLeaderboardTabs(ui.leaderboardTabs, loadLeaderboard(), ui.leaderboard, 10);
      renderLeaderboardTabs(ui.resultLeaderboardTabs, loadLeaderboard(), ui.resultLeaderboard, 5);
    });
    tabs.append(tab);
  });

  const filtered = entries
    .filter(entry => entry.duration === selectedLeaderboardDuration)
    .sort((first, second) => second.successes - first.successes);
  renderLeaderboard(targetList, filtered, limit);
}

const state = {
  active: false,
  paused: false,
  pausedAt: 0,
  hits: 0,
  misses: 0,
  streak: 0,
  sizeLevel: 0,
  levelProgress: 0,
  targetsUsed: 0,
  maxTargets: 100,
  target: null,
  pointer: { x: 0, y: 0 },
  targetDuration: loadNumberSetting("aimTargetDuration", 2, 0.1, 5),
  killVolume: loadNumberSetting("aimKillVolume", 70, 1, 100),
  backgroundMusicVolume: loadNumberSetting("aimBackgroundMusicVolume", 70, 1, 100),
  theme: localStorage.getItem("aimTheme") === "light" ? "light" : "dark",
  targetColor: ["black", "red", "yellow", "blue", "green"].includes(localStorage.getItem("aimTargetColor"))
    ? localStorage.getItem("aimTargetColor")
    : "yellow",
  textColor: ["white", "black", "red", "blue", "yellow"].includes(localStorage.getItem("aimTextColor"))
    ? localStorage.getItem("aimTextColor")
    : "white",
  killSoundSet: localStorage.getItem("aimKillSoundSet") === "1" ? "1" : "2",
  particles: [],
  killSoundsEnabled: localStorage.getItem("aimKillSounds") !== "false",
  extendedKillSoundsEnabled: localStorage.getItem("aimExtendedKillSounds") !== "false",
  backgroundMusicEnabled: localStorage.getItem("aimBackgroundMusic") !== "false"
};
ui.playerName.value = localStorage.getItem("aimPlayerName") || "";
renderLeaderboardTabs(ui.leaderboardTabs, getLeaderboard(), ui.leaderboard, 10);
ui.highScore.textContent = localStorage.getItem("aimHighSuccesses") || "0";

function applyTextColor() {
  const textColors = {
    white: "#ffffff",
    black: "#111111",
    red: "#ff3b30",
    blue: "#2388ff",
    yellow: "#ffd400"
  };
  document.documentElement.style.setProperty("--text-color", textColors[state.textColor]);
}

ui.playerName.addEventListener("input", () => {
  localStorage.setItem("aimPlayerName", ui.playerName.value);
});
ui.clearLeaderboard.addEventListener("click", () => {
  localStorage.removeItem("aimLeaderboard");
  renderLeaderboard(ui.leaderboard, [], 10);
  renderLeaderboard(ui.resultLeaderboard, [], 5);
  selectedLeaderboardDuration = state.targetDuration;
  renderLeaderboardTabs(ui.leaderboardTabs, [], ui.leaderboard, 10);
  renderLeaderboardTabs(ui.resultLeaderboardTabs, [], ui.resultLeaderboard, 5);
});

let width = 0;
let height = 0;
let dpr = 1;
let audioContext = null;
let lastTime = 0;
let nextTargetTimeout = null;
let killLogTimeout = null;

function toRomanNumeral(number) {
  const numerals = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]
  ];
  let remainder = number;
  let result = "";
  for (const [value, numeral] of numerals) {
    while (remainder >= value) {
      result += numeral;
      remainder -= value;
    }
  }
  return result;
}

function showKillLog() {
  ui.killLogName.textContent = ui.playerName.value.trim() || "名無し";
  ui.killLogCount.textContent = toRomanNumeral(state.streak);
  ui.killLog.classList.remove("show");
  void ui.killLog.offsetWidth;
  ui.killLog.classList.add("show");
  clearTimeout(killLogTimeout);
  killLogTimeout = setTimeout(() => ui.killLog.classList.remove("show"), 2600);
}

function createKillSoundSet(sources, active) {
  return sources.map(source => {
    const sound = new Audio(source);
    sound.preload = active ? "auto" : "none";
    return sound;
  });
}

const valorantKillSounds = createKillSoundSet([
  "https://www.myinstants.com/media/sounds/valorant-1-kill.mp3",
  "https://www.myinstants.com/media/sounds/valorant-2-kills.mp3",
  "https://www.myinstants.com/media/sounds/valorant-3-kills.mp3",
  "https://www.myinstants.com/media/sounds/valorant-4-kills.mp3",
  "https://www.myinstants.com/media/sounds/valorant-5-kills.mp3"
], state.killSoundSet === "1");
const reaverKillSounds = createKillSoundSet([
  "https://www.myinstants.com/media/sounds/reaverkill1.mp3",
  "https://www.myinstants.com/media/sounds/reaverkill2.mp3",
  "https://www.myinstants.com/media/sounds/reaverkill3.mp3",
  "https://www.myinstants.com/media/sounds/reaverkill4.mp3",
  "https://www.myinstants.com/media/sounds/reaverkill5.mp3"
], state.killSoundSet === "2");
const allKillSounds = [...valorantKillSounds, ...reaverKillSounds];
const backgroundMusic = new Audio("https://www.myinstants.com/media/sounds/valorant-theme-song.mp3");
backgroundMusic.loop = true;
backgroundMusic.preload = "none";

const killBannerSources = {
  "1": "assets/kill-banner.png",
  "2": "https://static.wikia.nocookie.net/valorant/images/a/ac/Reaver_Kill_Banner.png/revision/latest?cb=20260122050140"
};

function updateKillBanner() {
  ui.killLogBanner.src = killBannerSources[state.killSoundSet];
}

function getActiveKillSounds() {
  return state.killSoundSet === "1" ? valorantKillSounds : reaverKillSounds;
}

function stopKillSounds() {
  allKillSounds.forEach(sound => {
    sound.pause();
    sound.currentTime = 0;
  });
}

function startBackgroundMusic() {
  if (!state.backgroundMusicEnabled) return;
  backgroundMusic.volume = state.backgroundMusicVolume / 100;
  backgroundMusic.play().catch(error => {
    console.error("Could not play the background music.", error);
  });
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = rect.width;
  height = rect.height;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (state.target) findSafeTargetPosition(state.target);
}

function beep(frequency, duration, type = "sine", volume = 0.05) {
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume * state.killVolume / 100, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    osc.connect(gain).connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + duration);
  } catch (_) {}
}

function playStreakSound() {
  if (state.streak > 5 && !state.extendedKillSoundsEnabled) {
    stopKillSounds();
    return;
  }
  if (!state.killSoundsEnabled) {
    beep(480 + state.streak * 35, 0.08, "sine", 0.045);
    return;
  }
  const activeKillSounds = getActiveKillSounds();
  const soundIndex = Math.min(state.streak, activeKillSounds.length) - 1;
  const sound = activeKillSounds[soundIndex];
  activeKillSounds.forEach((otherSound, index) => {
    if (index !== soundIndex) {
      otherSound.pause();
      otherSound.currentTime = 0;
    }
  });
  sound.currentTime = 0;
  sound.volume = state.killVolume / 100;
  sound.play().catch(error => {
    console.error("Could not play the streak sound.", error);
  });
}

function placeTargetWithinBounds(target) {
  target.x = Math.max(target.r + 20, Math.min(width - target.r - 20, target.x));
  target.y = Math.max(target.r + 20, Math.min(height - target.r - 20, target.y));
}

function isTargetInKillLogArea(target) {
  const canvasRect = canvas.getBoundingClientRect();
  const logRect = ui.killLog.getBoundingClientRect();
  if (logRect.width === 0 || logRect.height === 0) return false;

  const padding = 12;
  const left = logRect.left - canvasRect.left - target.r - padding;
  const right = logRect.right - canvasRect.left + target.r + padding;
  const top = logRect.top - canvasRect.top - target.r - padding;
  const bottom = logRect.bottom - canvasRect.top + target.r + padding;

  return target.x >= left && target.x <= right &&
    target.y >= top && target.y <= bottom;
}

function findSafeTargetPosition(target) {
  placeTargetWithinBounds(target);
  if (!isTargetInKillLogArea(target)) return;

  const padding = target.r + 20;
  for (let attempt = 0; attempt < 80; attempt++) {
    target.x = padding + Math.random() * Math.max(1, width - padding * 2);
    target.y = padding + Math.random() * Math.max(1, height - padding * 2);
    placeTargetWithinBounds(target);
    if (!isTargetInKillLogArea(target)) return;
  }

  for (let y = padding; y <= height - padding; y += padding) {
    for (let x = padding; x <= width - padding; x += padding) {
      target.x = x;
      target.y = y;
      if (!isTargetInKillLogArea(target)) return;
    }
  }

  // Last resort for extremely small viewports: keep the target at the nearest in-bounds corner.
  target.x = target.r + 20;
  target.y = target.r + 20;
  placeTargetWithinBounds(target);
}

function spawnTarget() {
  if (state.paused) return;
  const sizeMultiplier = Math.max(1, 10 - state.sizeLevel);
  const r = 3 * sizeMultiplier;
  const target = {
    x: r + 20 + Math.random() * Math.max(1, width - (r + 20) * 2),
    y: r + 20 + Math.random() * Math.max(1, height - (r + 20) * 2),
    r,
    born: performance.now(),
    pulse: Math.random() * Math.PI * 2
  };
  findSafeTargetPosition(target);
  state.target = target;
  updateRemainingTime();
}

function updateRemainingTime() {
  if (!state.active || !state.target) {
    ui.remainingTime.textContent = "0.0秒";
    return;
  }
  const elapsed = state.paused
    ? state.pausedAt - state.target.born
    : performance.now() - state.target.born;
  const remaining = Math.max(0, state.targetDuration - elapsed / 1000);
  ui.remainingTime.textContent = `${remaining.toFixed(1)}秒`;
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 110;
    state.particles.push({
      x,
      y,
      r: 2 + Math.random() * 4,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.55 + Math.random() * 0.45,
      color
    });
  }
}

function showMessage(text, good) {
  ui.message.textContent = text;
  ui.message.style.color = good ? "#d7ff3f" : "#ff7868";
  ui.message.classList.remove("show");
  void ui.message.offsetWidth;
  ui.message.classList.add("show");
}

function hitTarget() {
  const target = state.target;
  const distance = Math.hypot(
    state.pointer.x - target.x,
    state.pointer.y - target.y
  );
  if (distance > target.r) return false;

  const precision = 1 - distance / target.r;
  state.hits++;
  state.targetsUsed++;
  state.streak++;
  showKillLog();
  state.levelProgress++;
  if (state.levelProgress >= 10) {
    state.sizeLevel = Math.min(9, state.sizeLevel + 1);
    state.levelProgress = 0;
  }
  ui.score.textContent = state.hits;
  ui.shotsUsed.textContent = state.targetsUsed;
  burst(target.x, target.y, "#d7ff3f", 18 + Math.round(precision * 12));
  playStreakSound();
  showMessage(precision > 0.82 ? "PERFECT" : "HIT", true);

  if (state.targetsUsed >= state.maxTargets) {
    state.active = false;
    setTimeout(showResult, 250);
  } else {
    scheduleTarget(180);
  }
  state.target = null;
  return true;
}

function scheduleTarget(delay) {
  clearTimeout(nextTargetTimeout);
  nextTargetTimeout = setTimeout(() => {
    nextTargetTimeout = null;
    if (state.active && !state.paused) spawnTarget();
  }, delay);
}

function missTarget(message = "MISS") {
  state.misses++;
  state.targetsUsed++;
  state.streak = 0;
  state.levelProgress = 0;
  state.target = null;
  ui.shotsUsed.textContent = state.targetsUsed;
  if (message === "MISS") {
    burst(state.pointer.x, state.pointer.y, "#ff7868", 8);
    beep(110, 0.12, "sawtooth", 0.035);
  }
  showMessage(message, false);

  if (state.targetsUsed >= state.maxTargets) {
    state.active = false;
    setTimeout(showResult, 250);
  } else {
    scheduleTarget(180);
  }
}

function startGame() {
  clearTimeout(nextTargetTimeout);
  nextTargetTimeout = null;
  clearTimeout(killLogTimeout);
  ui.killLog.classList.remove("show");
  state.paused = false;
  ui.pauseOverlay.classList.add("hidden");
  ui.pauseButton.setAttribute("aria-pressed", "false");
  ui.pauseButton.textContent = "Ⅱ";
  state.active = true;
  state.hits = 0;
  state.misses = 0;
  state.streak = 0;
  state.sizeLevel = 0;
  state.levelProgress = 0;
  state.targetsUsed = 0;
  state.particles = [];
  state.pointer = { x: width / 2, y: height / 2 };
  ui.score.textContent = "0";
  ui.shotsUsed.textContent = "0";
  ui.shotsTotal.textContent = state.maxTargets;
  ui.startOverlay.classList.add("hidden");
  ui.resultOverlay.classList.add("hidden");
  spawnTarget();
  startBackgroundMusic();
  beep(380, 0.08, "sine", 0.04);
}

function showResult() {
  const high = Math.max(Number(localStorage.getItem("aimHighSuccesses") || 0), state.hits);
  localStorage.setItem("aimHighSuccesses", String(high));
  const leaderboard = loadLeaderboard();
  leaderboard.push({
    name: ui.playerName.value.trim() || "名無し",
    successes: state.hits,
    duration: state.targetDuration
  });
  leaderboard.sort((first, second) => second.successes - first.successes);
  const topEntries = leaderboard.slice(0, 100);
  localStorage.setItem("aimLeaderboard", JSON.stringify(topEntries));
  selectedLeaderboardDuration = state.targetDuration;
  renderLeaderboardTabs(ui.leaderboardTabs, topEntries, ui.leaderboard, 10);
  renderLeaderboardTabs(ui.resultLeaderboardTabs, topEntries, ui.resultLeaderboard, 5);
  ui.highScore.textContent = high;
  ui.resultEyebrow.textContent = "TRAINING COMPLETE";
  ui.resultTitle.textContent =
    state.hits === state.maxTargets ? "エイムマスター！" : "結果";
  ui.resultText.textContent =
    `${state.hits} / ${state.maxTargets} 個成功`;
  ui.resultOverlay.classList.remove("hidden");
}

function returnHome() {
  clearTimeout(nextTargetTimeout);
  nextTargetTimeout = null;
  clearTimeout(killLogTimeout);
  ui.killLog.classList.remove("show");
  stopKillSounds();
  backgroundMusic.pause();
  backgroundMusic.currentTime = 0;
  state.active = false;
  state.paused = false;
  ui.pauseOverlay.classList.add("hidden");
  ui.pauseButton.setAttribute("aria-pressed", "false");
  ui.pauseButton.textContent = "Ⅱ";
  state.target = null;
  state.particles = [];
  ui.score.textContent = "0";
  ui.shotsUsed.textContent = "0";
  ui.resultOverlay.classList.add("hidden");
  ui.startOverlay.classList.remove("hidden");
}

function togglePause() {
  if (!state.active) return;
  state.paused = !state.paused;
  ui.pauseOverlay.classList.toggle("hidden", !state.paused);
  ui.pauseButton.setAttribute("aria-pressed", String(state.paused));
  ui.pauseButton.textContent = state.paused ? "▶" : "Ⅱ";

  if (state.paused) {
    state.pausedAt = performance.now();
    clearTimeout(nextTargetTimeout);
    nextTargetTimeout = null;
  } else {
    const pausedDuration = performance.now() - (state.pausedAt || performance.now());
    if (state.target) state.target.born += pausedDuration;
    if (!state.target) scheduleTarget(180);
  }
}

function openSettings() {
  ui.settingsOverlay.classList.remove("hidden");
}

function closeSettings() {
  ui.settingsOverlay.classList.add("hidden");
}

function moveAim(event) {
  state.pointer = canvasPoint(event);
}

canvas.addEventListener("pointermove", moveAim);

canvas.addEventListener("pointerdown", event => {
  if (!state.active || state.paused || !state.target) return;
  moveAim(event);
  if (!hitTarget()) missTarget();
});

window.addEventListener("keydown", event => {
  if (event.target !== ui.playerName) {
    if (event.key.toLowerCase() === "r") startGame();
    if (event.key.toLowerCase() === "p") togglePause();
  }
});

document.getElementById("startButton").addEventListener("click", startGame);
document.getElementById("restartButton").addEventListener("click", startGame);
ui.homeButton.addEventListener("click", returnHome);
ui.footerResetButton.addEventListener("click", startGame);
ui.footerHomeButton.addEventListener("click", returnHome);
ui.pauseButton.addEventListener("click", togglePause);
ui.resumeButton.addEventListener("click", togglePause);
ui.pauseSettingsButton.addEventListener("click", openSettings);
ui.targetDuration.value = String(state.targetDuration);
ui.targetDurationValue.textContent = state.targetDuration.toFixed(1);
ui.killVolume.value = String(state.killVolume);
ui.killVolumeValue.textContent = String(state.killVolume);
ui.backgroundMusicVolume.value = String(state.backgroundMusicVolume);
ui.backgroundMusicVolumeValue.textContent = String(state.backgroundMusicVolume);
ui.killSounds.checked = state.killSoundsEnabled;
ui.killSoundSet.value = state.killSoundSet;
updateKillBanner();
ui.extendedKillSounds.checked = state.extendedKillSoundsEnabled;
ui.extendedKillSounds.disabled = !state.killSoundsEnabled;
ui.backgroundMusicEnabled.checked = state.backgroundMusicEnabled;
ui.theme.value = state.theme;
ui.targetColor.value = state.targetColor;
ui.textColor.value = state.textColor;
document.documentElement.dataset.theme = state.theme;
applyTextColor();
ui.targetDuration.addEventListener("input", () => {
  state.targetDuration = Number(ui.targetDuration.value);
  ui.targetDurationValue.textContent = state.targetDuration.toFixed(1);
  localStorage.setItem("aimTargetDuration", String(state.targetDuration));
});
ui.settingsButton.addEventListener("click", openSettings);
ui.closeSettings.addEventListener("click", closeSettings);
ui.settingsOverlay.addEventListener("click", event => {
  if (event.target === ui.settingsOverlay) closeSettings();
});
ui.theme.addEventListener("change", () => {
  state.theme = ui.theme.value;
  document.documentElement.dataset.theme = state.theme;
  localStorage.setItem("aimTheme", state.theme);
});
ui.killVolume.addEventListener("input", () => {
  state.killVolume = Number(ui.killVolume.value);
  ui.killVolumeValue.textContent = String(state.killVolume);
  localStorage.setItem("aimKillVolume", String(state.killVolume));
});
ui.backgroundMusicVolume.addEventListener("input", () => {
  state.backgroundMusicVolume = Number(ui.backgroundMusicVolume.value);
  ui.backgroundMusicVolumeValue.textContent = String(state.backgroundMusicVolume);
  localStorage.setItem("aimBackgroundMusicVolume", String(state.backgroundMusicVolume));
  backgroundMusic.volume = state.backgroundMusicVolume / 100;
});
ui.killSounds.addEventListener("change", () => {
  state.killSoundsEnabled = ui.killSounds.checked;
  ui.extendedKillSounds.disabled = !state.killSoundsEnabled;
  localStorage.setItem("aimKillSounds", String(state.killSoundsEnabled));
  if (!state.killSoundsEnabled) {
    stopKillSounds();
  }
});
ui.killSoundSet.addEventListener("change", () => {
  state.killSoundSet = ui.killSoundSet.value;
  localStorage.setItem("aimKillSoundSet", state.killSoundSet);
  updateKillBanner();
  stopKillSounds();
  getActiveKillSounds().forEach(sound => {
    sound.preload = "auto";
  });
});
ui.extendedKillSounds.addEventListener("change", () => {
  state.extendedKillSoundsEnabled = ui.extendedKillSounds.checked;
  localStorage.setItem("aimExtendedKillSounds", String(state.extendedKillSoundsEnabled));
});
ui.backgroundMusicEnabled.addEventListener("change", () => {
  state.backgroundMusicEnabled = ui.backgroundMusicEnabled.checked;
  localStorage.setItem("aimBackgroundMusic", String(state.backgroundMusicEnabled));
  if (state.backgroundMusicEnabled && state.active) {
    startBackgroundMusic();
  } else if (!state.backgroundMusicEnabled) {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
  }
});
ui.targetColor.addEventListener("change", () => {
  state.targetColor = ui.targetColor.value;
  localStorage.setItem("aimTargetColor", state.targetColor);
});
ui.textColor.addEventListener("change", () => {
  state.textColor = ui.textColor.value;
  localStorage.setItem("aimTextColor", state.textColor);
  applyTextColor();
});
window.addEventListener("keydown", event => {
  if (event.key === "Escape" && !event.repeat) {
    if (ui.settingsOverlay.classList.contains("hidden")) {
      openSettings();
    } else {
      closeSettings();
    }
  }
});
function drawBackground() {
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, state.theme === "light" ? "#f5f7f2" : "#14251f");
  bg.addColorStop(1, state.theme === "light" ? "#dce5dc" : "#0a100d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = state.theme === "light" ? "rgba(31,65,43,.08)" : "rgba(215,255,63,.035)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawTarget(time) {
  if (!state.target) return;
  const target = state.target;
  const pulse = 1 + Math.sin(time * 0.006 + target.pulse) * 0.035;

  ctx.save();
  ctx.translate(target.x, target.y);
  ctx.scale(pulse, pulse);

  const targetColors = {
    black: "#111111",
    red: "#ff3b30",
    yellow: "#ffd400",
    blue: "#2388ff",
    green: "#28c840"
  };
  ctx.shadowColor = targetColors[state.targetColor];
  ctx.shadowBlur = 8;
  ctx.fillStyle = targetColors[state.targetColor];
  ctx.beginPath();
  ctx.arc(0, 0, target.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = state.targetColor === "black" ? "#edf1df" : "rgba(255,255,255,.9)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawPointer() {
  if (!state.active) return;
  ctx.save();
  ctx.translate(state.pointer.x, state.pointer.y);
  ctx.fillStyle = state.theme === "light" ? "rgba(16,28,22,.98)" : "rgba(237,241,223,.98)";
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function update(dt) {
  if (state.paused) return;
  if (state.active && state.target && performance.now() - state.target.born >= state.targetDuration * 1000) {
    missTarget("TIME UP");
  }

  state.particles.forEach(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.985;
    p.vy *= 0.985;
    p.life -= dt * 1.15;
  });
  state.particles = state.particles.filter(p => p.life > 0);
}

function drawParticles() {
  state.particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function frame(time) {
  const dt = Math.min((time - lastTime) / 1000 || 0, 0.033);
  lastTime = time;
  update(dt);
  updateRemainingTime();
  drawBackground();
  drawTarget(time);
  drawParticles();
  drawPointer();
  requestAnimationFrame(frame);
}

window.addEventListener("resize", resize);
resize();
requestAnimationFrame(frame);

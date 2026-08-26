/* =====================================================
   BOT BUSTER — game logic (MVP / 1. solis)
===================================================== */

/* ---------- DATA: message pools ---------- */

const HUMAN_USERNAMES = [
  "kaspars_lv", "night_owl22", "pixelPeach", "GamerGirl_99",
  "TomsR", "silent_wolf", "coffee_and_code", "zanzibar77",
  "luna.exe", "OldSchoolGamer", "veronika_v", "byte_me_maybe"
];

const BOT_USERNAMES = [
  "xXProGamerxX7841", "FreeCoins_Bot99", "Giveaway_Central2024",
  "StreamBooster_x3", "TwitchGrow_er", "ClaimYourGift00",
  "Follow4Follow_Bot", "CryptoKing_signals", "ViewerBoost99",
  "DiscordNitroFree1"
];

const HUMAN_MESSAGES = [
  "omggg that clutch was insane 😭",
  "kekw did you see that",
  "pog moment fr fr",
  "gg well played chat",
  "wait how did he do tht",
  "lmaooo nice recovery",
  "can you play the new map next?",
  "hi from Latvia! first time watching",
  "thats crazy no way",
  "W stream today ngl",
  "why does the enemy team keep resetting",
  "your mic is a bit quiet btw",
  "lol i missed that, replay?",
  "this game looks so good graphics wise",
  "finally friday stream let's gooo",
  "bro really said gg and left 💀"
];

const BOT_MESSAGES = [
  "🔥FREE V-BUCKS!! Click link in bio🔥",
  "Follow me for follow back guaranteed!!",
  "CHEAP FOLLOWERS! DM now www.fake-link.com",
  "Get 1000 free coins here: bit.ly/xxxxx",
  "SUBSCRIBE TO WIN A FREE PS5!!! LIMITED TIME",
  "Best crypto signals, join telegram now",
  "hi hi hi hi hi hi hi hi",
  "Check link in bio for free gift 🎁",
  "Selling cheap accounts, message me fast",
  "🎁 FREE NITRO CLAIM NOW discord.gg/xxxx",
  "Best deals only today, click here now!!",
  "I made $500 today working from home, DM me"
];

/* ---------- STATE ---------- */

const state = {
  score: 0,
  lives: 3,
  level: 1,
  spawnMs: 2200,
  botChance: 0.42,
  running: true,
  correctStreak: 0,
  levelUpEvery: 4,          // correct answers needed to level up
  maxMessages: 40,          // cap chat length (older ones get trimmed)
  spawnTimer: null
};

let messageIdCounter = 0;

/* ---------- DOM REFS ---------- */

const chatMessagesEl = document.getElementById("chatMessages");
const scoreValueEl   = document.getElementById("scoreValue");
const levelValueEl   = document.getElementById("levelValue");
const heartsEl        = [...document.querySelectorAll(".heart")];
const gameOverOverlay = document.getElementById("gameOverOverlay");
const finalScoreEl    = document.getElementById("finalScore");
const restartBtn      = document.getElementById("restartBtn");
const viewerCountEl   = document.getElementById("viewerCount");
const streamFrameEl   = document.querySelector(".stream__frame");

/* ---------- UTILITIES ---------- */

function pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; }

function randRange(min, max){ return Math.random() * (max - min) + min; }

function formatViewers(n){
  return (n / 1000).toFixed(1) + "K skatītāji";
}

/* ---------- SCORE / LIVES UI ---------- */

function updateScore(delta){
  state.score = Math.max(0, state.score + delta);
  scoreValueEl.textContent = state.score;
}

function updateLevelDisplay(){
  levelValueEl.textContent = state.level;
}

function loseLife(){
  const idx = state.lives - 1;
  state.lives -= 1;
  const heart = heartsEl[idx];
  if (heart){
    heart.classList.add("lost");
  }
  streamFrameEl.classList.remove("shake-screen");
  void streamFrameEl.offsetWidth; // restart animation
  streamFrameEl.classList.add("shake-screen");

  if (state.lives <= 0){
    endGame();
  }
}

function showFloatingPoints(delta, x, y){
  const el = document.createElement("div");
  el.className = "float-pts " + (delta >= 0 ? "pos" : "neg");
  el.textContent = (delta >= 0 ? "+" : "") + delta;
  el.style.left = x + "px";
  el.style.top = y + "px";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

/* ---------- DIFFICULTY PROGRESSION ---------- */

function maybeLevelUp(){
  state.correctStreak++;
  if (state.correctStreak >= state.levelUpEvery){
    state.correctStreak = 0;
    state.level++;
    state.spawnMs = Math.max(700, state.spawnMs - 220);
    state.botChance = Math.min(0.65, state.botChance + 0.04);
    updateLevelDisplay();
    restartSpawning();
  }
}

/* ---------- MESSAGE SPAWNING ---------- */

function spawnMessage(){
  if (!state.running) return;

  const isBot = Math.random() < state.botChance;
  const username = isBot ? pick(BOT_USERNAMES) : pick(HUMAN_USERNAMES);
  const text = isBot ? pick(BOT_MESSAGES) : pick(HUMAN_MESSAGES);
  const id = "msg-" + (++messageIdCounter);

  const msgEl = document.createElement("div");
  msgEl.className = "msg";
  msgEl.dataset.id = id;
  msgEl.dataset.isBot = isBot ? "1" : "0";
  msgEl.dataset.resolved = "0";

  msgEl.innerHTML = `
    <span class="msg__user" style="color:${isBot ? '#7dd3c0' : '#c9a6ff'}">${username}:</span>
    <span class="msg__text">${text}</span>
  `;

  msgEl.addEventListener("click", () => onMessageClick(msgEl));

  chatMessagesEl.appendChild(msgEl);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;

  trimOldMessages();
}

function trimOldMessages(){
  while (chatMessagesEl.children.length > state.maxMessages){
    const oldest = chatMessagesEl.firstElementChild;
    handleUnresolvedRemoval(oldest);
    oldest.remove();
  }
}

// Called when a message scrolls out of the chat (removed) without being clicked.
function handleUnresolvedRemoval(msgEl){
  if (!state.running) return;
  if (msgEl.dataset.resolved === "1") return;

  const isBot = msgEl.dataset.isBot === "1";
  if (isBot){
    // Missed bot -> penalty
    updateScore(-50);
    loseLife();
    flashMissedIndicator();
  }
  // Missed human messages are neutral - no penalty for not reacting to a human.
}

function flashMissedIndicator(){
  const rect = chatMessagesEl.getBoundingClientRect();
  showFloatingPoints(-50, rect.left + rect.width / 2, rect.top + 20);
}

/* ---------- MESSAGE INTERACTION ---------- */

function onMessageClick(msgEl){
  if (msgEl.dataset.resolved === "1") return;
  if (msgEl.querySelector(".msg__actions")) return; // already open

  msgEl.classList.add("scanning");

  const actions = document.createElement("div");
  actions.className = "msg__actions";
  actions.innerHTML = `
    <button class="action-btn action-btn--ban">⚙ Banot kā botu</button>
    <button class="action-btn action-btn--human">👤 Apstiprināt kā cilvēku</button>
  `;
  msgEl.appendChild(actions);

  actions.querySelector(".action-btn--ban")
    .addEventListener("click", (e) => { e.stopPropagation(); resolveMessage(msgEl, true); });
  actions.querySelector(".action-btn--human")
    .addEventListener("click", (e) => { e.stopPropagation(); resolveMessage(msgEl, false); });
}

function resolveMessage(msgEl, playerSaysBot){
  if (msgEl.dataset.resolved === "1") return;
  msgEl.dataset.resolved = "1";
  msgEl.classList.add("resolved");
  msgEl.classList.remove("scanning");

  const actions = msgEl.querySelector(".msg__actions");
  if (actions) actions.remove();

  const isBot = msgEl.dataset.isBot === "1";
  const correct = (playerSaysBot === isBot);

  const rect = msgEl.getBoundingClientRect();
  const tag = document.createElement("span");
  tag.className = "msg__tag";

  if (correct){
    if (isBot){
      updateScore(100);
      showFloatingPoints(100, rect.right - 10, rect.top);
      tag.classList.add("msg__tag--bot-caught");
      tag.textContent = "BOTS NOTVERTS";
    } else {
      tag.classList.add("msg__tag--human-ok");
      tag.textContent = "CILVĒKS ✓";
    }
    msgEl.classList.add("correct");
    maybeLevelUp();
  } else {
    updateScore(-50);
    showFloatingPoints(-50, rect.right - 10, rect.top);
    loseLife();
    tag.classList.add("msg__tag--wrong");
    tag.textContent = isBot ? "TAS BIJA BOTS" : "TAS BIJA CILVĒKS";
    msgEl.classList.add("wrong");
    state.correctStreak = 0;
  }

  msgEl.querySelector(".msg__text").appendChild(tag);
}

/* ---------- SPAWN LOOP CONTROL ---------- */

function restartSpawning(){
  if (state.spawnTimer) clearInterval(state.spawnTimer);
  state.spawnTimer = setInterval(spawnMessage, state.spawnMs);
}

/* ---------- GAME OVER / RESTART ---------- */

function endGame(){
  state.running = false;
  clearInterval(state.spawnTimer);
  finalScoreEl.textContent = state.score;
  gameOverOverlay.classList.remove("hidden");
}

function resetGame(){
  state.score = 0;
  state.lives = 3;
  state.level = 1;
  state.spawnMs = 2200;
  state.botChance = 0.42;
  state.running = true;
  state.correctStreak = 0;

  scoreValueEl.textContent = "0";
  updateLevelDisplay();
  heartsEl.forEach(h => h.classList.remove("lost"));
  chatMessagesEl.innerHTML = "";
  gameOverOverlay.classList.add("hidden");

  restartSpawning();
}

restartBtn.addEventListener("click", resetGame);

/* ---------- FAKE VIEWER COUNTER ---------- */

let viewers = 1200;
setInterval(() => {
  viewers += Math.floor(randRange(-15, 25));
  viewers = Math.max(800, viewers);
  viewerCountEl.textContent = formatViewers(viewers);
}, 2500);

/* ---------- CANVAS: abstract "gameplay" animation ---------- */

const canvas = document.getElementById("streamCanvas");
const ctx = canvas.getContext("2d");
let particles = [];

function resizeCanvas(){
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function initParticles(){
  particles = [];
  for (let i = 0; i < 18; i++){
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: randRange(2, 5),
      dx: randRange(-0.6, 0.6),
      dy: randRange(-0.6, 0.6),
      hue: pick([265, 172, 300])
    });
  }
}
initParticles();

function drawFrame(){
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // background gradient "arena"
  const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  g.addColorStop(0, "#0d0a1a");
  g.addColorStop(1, "#160f24");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // grid lines (arena floor feel)
  ctx.strokeStyle = "rgba(145,71,255,0.08)";
  ctx.lineWidth = 1;
  const spacing = 40;
  for (let x = 0; x < canvas.width; x += spacing){
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += spacing){
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  // particles ("players"/orbs)
  particles.forEach(p => {
    p.x += p.dx;
    p.y += p.dy;
    if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
    if (p.y < 0 || p.y > canvas.height) p.dy *= -1;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${p.hue}, 90%, 65%, 0.85)`;
    ctx.shadowColor = `hsla(${p.hue}, 90%, 65%, 0.9)`;
    ctx.shadowBlur = 10;
    ctx.fill();
  });
  ctx.shadowBlur = 0;

  requestAnimationFrame(drawFrame);
}
drawFrame();

/* ---------- BOOT ---------- */

restartSpawning();

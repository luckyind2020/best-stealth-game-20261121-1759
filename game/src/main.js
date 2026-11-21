// Night Gallery — the game itself: state, rules, input and the main loop.
// One fixed-step simulation (60 updates a second) drives the thief, the
// wardens and the detection meter; the renderer only draws the result.
// The thief wins a floor by taking every starlight shard and reaching the
// exit unseen; a warden that touches the thief during an alarm ends the run.
import { CANVAS, FLOOR, STEP, SCORE, SENSE, WARDEN, PLAYER, BEST_KEY } from './settings.js';
import { LEVELS } from './levels.js';
import { levelBlockers, pointInRect } from './sight.js';
import { makeWarden, stepWarden, wardenSees, wardenHears, STATE_PATROL, STATE_CURIOUS, STATE_CHASE } from './guard.js';
import { makeThief, stepThief } from './player.js';
import { makeAudio } from './audio.js';
import { drawGame, drawIntro, layoutButtons } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');

function readBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    window.localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // Private mode or no storage: the score just does not persist.
  }
}

export function loadFloor(game, index) {
  game.levelIndex = index;
  game.level = LEVELS[index];
  game.blockers = levelBlockers(game.level);
  game.wardens = game.level.wardens.map((def) => makeWarden(def));
  game.thief = makeThief(game.level.spawn);
  game.shardGot = game.level.shards.map(() => false);
  game.shardsTaken = 0;
  game.detection = 0;
  game.alarmed = false;
  game.alarmEver = false;
  game.ghostThisFloor = true;
  game.elapsed = 0;
  game.noiseRings = [];
  game.toast = null;
  game.toastUntil = 0;
  game.introUntil = game.clock + 4;
  game.screen = 'play';
  game.clearTime = '';
  game.lockedAt = 0;
}

// The shared detection meter: every warden that sees the thief adds to it,
// and it drains while nobody does. Crossing the curious line sends wardens
// to investigate; crossing the alarm line sends them all chasing.
export function updateWardens(game, dt) {
  let anyoneSees = false;
  let topGain = 0;
  for (const warden of game.wardens) {
    const seen = wardenSees(warden, game.thief, game.level, game.blockers);
    if (seen.seen) {
      anyoneSees = true;
      topGain = Math.max(topGain, seen.gain);
      warden.lastSeen = { x: game.thief.x, y: game.thief.y };
      warden.unseenFor = 0;
    } else {
      warden.unseenFor += dt;
    }
  }
  if (anyoneSees) {
    const before = game.detection;
    game.detection = Math.min(100, game.detection + topGain * dt);
    if (before < SENSE.curiousAt && game.detection >= SENSE.curiousAt && !game.alarmed) {
      game.audio.curious();
      for (const warden of game.wardens) {
        if (warden.state === STATE_PATROL) {
          warden.state = STATE_CURIOUS;
          warden.suspicious = true;
          warden.lastSeen = warden.lastSeen ?? { x: game.thief.x, y: game.thief.y };
        }
      }
    }
    if (game.detection >= SENSE.alarmAt && !game.alarmed) {
      game.alarmed = true;
      game.alarmEver = true;
      game.ghostThisFloor = false;
      game.audio.alarm();
      game.toast = 'ALARM! Break line of sight to cool it down.';
      game.toastUntil = game.clock + 3;
      for (const warden of game.wardens) {
        warden.state = STATE_CHASE;
        warden.alerted = true;
      }
    }
  } else {
    game.detection = Math.max(0, game.detection - SENSE.decay * dt);
    if (game.alarmed) {
      const allLost = game.wardens.every((w) => w.unseenFor >= WARDEN.alarmMemory);
      if (allLost) {
        game.alarmed = false;
        game.detection = 45;
        for (const warden of game.wardens) {
          warden.state = STATE_CURIOUS;
          warden.alerted = false;
        }
      }
    }
  }
  const events = {};
  game.level.wardens.forEach((def, i) => {
    stepWarden(game.wardens[i], def, dt, game, events);
  });
  if (events.caught) endRun(game);
}

function endRun(game) {
  game.screen = 'over';
  game.audio.caught();
  if (game.score > game.best) {
    game.best = game.score;
    saveBest(game.score);
  }
  announce(`Caught on floor ${game.levelIndex + 1}. Score ${game.score}.`);
}

function clearFloor(game) {
  const timeBonus = Math.max(0, SCORE.timeBonusBase - Math.round(game.elapsed) * SCORE.timeBonusPerSecond);
  const ghost = game.ghostThisFloor ? SCORE.ghostBonus : 0;
  game.score += timeBonus + ghost;
  game.clearTime = formatTime(game.elapsed);
  game.audio.clear();
  if (game.levelIndex + 1 >= LEVELS.length) {
    game.screen = 'win';
    game.audio.win();
    if (game.score > game.best) {
      game.best = game.score;
      saveBest(game.score);
    }
    announce(`Heist complete! Final score ${game.score}.`);
  } else {
    game.screen = 'clear';
    announce(`${game.level.name} cleared. Score ${game.score}.`);
  }
}

function formatTime(seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${mm}:${ss}`;
}

function announce(text) {
  if (statusLine) statusLine.textContent = text;
}

// One fixed step while the game is actually being played.
function update(game, dt) {
  game.clock += dt;
  if (game.screen !== 'play') return;
  game.elapsed += dt;
  const keys = { x: 0, y: 0 };
  if (game.keys.has('arrowleft') || game.keys.has('a')) keys.x -= 1;
  if (game.keys.has('arrowright') || game.keys.has('d')) keys.x += 1;
  if (game.keys.has('arrowup') || game.keys.has('w')) keys.y -= 1;
  if (game.keys.has('arrowdown') || game.keys.has('s')) keys.y += 1;
  game.thief.sneaking = game.keys.has('shift');
  stepThief(game.thief, game.level, dt, keys);
  if (game.thief.stepped) {
    game.audio.step();
    game.noiseRings.push({ x: game.thief.x, y: game.thief.y, r: 8, alpha: 0.5 });
    for (const warden of game.wardens) {
      const dist = Math.hypot(warden.x - game.thief.x, warden.y - game.thief.y);
      if (dist <= PLAYER.noiseRadius) wardenHears(warden, game.thief.x, game.thief.y);
    }
  }
  // Pick up shards.
  game.level.shards.forEach((shard, i) => {
    if (game.shardGot[i]) return;
    if (Math.hypot(shard.x - game.thief.x, shard.y - game.thief.y) < 28) {
      game.shardGot[i] = true;
      game.shardsTaken += 1;
      game.score += SCORE.shard;
      game.audio.shard();
      announce(`Shard ${game.shardsTaken} of ${game.level.shards.length}.`);
    }
  });
  // The exit: sealed until every shard is taken.
  if (pointInRect(game.thief.x, game.thief.y, game.level.exit)) {
    if (game.shardsTaken >= game.level.shards.length) {
      clearFloor(game);
      return;
    }
    if (game.clock - game.lockedAt > 2) {
      game.lockedAt = game.clock;
      game.audio.locked();
      game.toast = `The exit is sealed — recover all ${game.level.shards.length} shards first.`;
      game.toastUntil = game.clock + 2.5;
    }
  }
  updateWardens(game, dt);
  for (const ring of game.noiseRings) {
    ring.r += 130 * dt;
    ring.alpha -= 0.55 * dt;
  }
  game.noiseRings = game.noiseRings.filter((ring) => ring.alpha > 0);
}

function fitCanvas() {
  const scale = Math.min(window.innerWidth / CANVAS.width, window.innerHeight / CANVAS.height);
  canvas.style.width = `${Math.floor(CANVAS.width * scale)}px`;
  canvas.style.height = `${Math.floor(CANVAS.height * scale)}px`;
}

function toFloorCoords(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * CANVAS.width - FLOOR.x,
    y: ((event.clientY - rect.top) / rect.height) * CANVAS.height - FLOOR.y,
  };
}

function buttonAt(game, x, y) {
  const buttons = layoutButtons(game.screen);
  return buttons.find((b) => x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) ?? null;
}

function pressButton(game, id) {
  game.audio.ensure();
  game.audio.click();
  if (id === 'start') {
    loadFloor(game, 0);
    announce('Floor 1: Moonlit Gallery. Gather the shards, reach the exit unseen.');
  } else if (id === 'next') {
    loadFloor(game, game.levelIndex + 1);
  } else if (id === 'again' || id === 'retry' || id === 'restart') {
    loadFloor(game, game.levelIndex);
  } else if (id === 'menu') {
    loadFloor(game, 0);
    game.screen = 'title';
  } else if (id === 'resume') {
    game.screen = 'play';
  }
}

function boot() {
  canvas.width = CANVAS.width;
  canvas.height = CANVAS.height;
  const game = {
    canvas,
    audio: makeAudio(),
    levelIndex: 0,
    level: LEVELS[0],
    blockers: levelBlockers(LEVELS[0]),
    wardens: [],
    thief: null,
    shardGot: [],
    shardsTaken: 0,
    score: 0,
    detection: 0,
    alarmed: false,
    alarmEver: false,
    ghostThisFloor: true,
    elapsed: 0,
    clock: 0,
    screen: 'title',
    toast: null,
    toastUntil: 0,
    introUntil: 0,
    clearTime: '',
    lockedAt: 0,
    best: readBest(),
    muted: false,
    noiseRings: [],
    keys: new Set(),
  };
  loadFloor(game, 0);
  game.screen = 'title';
  // Screenshot staging: ?shot=start|play|end&seed=1 builds a real floor and
  // sets it to a chosen moment instead of starting a live game.
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) {
    stageShot(shot, game, { loadFloor, updateWardens });
  }
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
    game.audio.ensure();
    if (key === 'm') {
      game.muted = !game.muted;
      game.audio.setMuted(game.muted);
      return;
    }
    if (key === 'enter' || key === ' ') {
      if (game.screen === 'title') pressButton(game, 'start');
      else if (game.screen === 'clear') pressButton(game, 'next');
      else if (game.screen === 'over') pressButton(game, 'retry');
      else if (game.screen === 'win') pressButton(game, 'menu');
      else if (game.screen === 'paused') pressButton(game, 'resume');
      return;
    }
    if (key === 'p' || key === 'escape') {
      if (game.screen === 'play') game.screen = 'paused';
      else if (game.screen === 'paused') game.screen = 'play';
      return;
    }
    if (key === 'r') {
      if (game.screen === 'play' || game.screen === 'paused') loadFloor(game, game.levelIndex);
      return;
    }
    game.keys.add(key);
  });
  window.addEventListener('keyup', (event) => {
    game.keys.delete(event.key.toLowerCase());
  });
  canvas.addEventListener('mousedown', (event) => {
    game.audio.ensure();
    const point = toFloorCoords(event);
    // Overlay buttons live in canvas coordinates, not floor coordinates.
    const canvasPoint = {
      x: ((event.clientX - canvas.getBoundingClientRect().left) / canvas.getBoundingClientRect().width) * CANVAS.width,
      y: ((event.clientY - canvas.getBoundingClientRect().top) / canvas.getBoundingClientRect().height) * CANVAS.height,
    };
    const button = buttonAt(game, canvasPoint.x, canvasPoint.y);
    if (button) {
      pressButton(game, button.id);
      return;
    }
    if (game.screen === 'play') {
      game.thief.clickTarget = {
        x: Math.max(0, Math.min(FLOOR.width, point.x)),
        y: Math.max(0, Math.min(FLOOR.height, point.y)),
      };
    }
  });
  window.addEventListener('resize', fitCanvas);
  fitCanvas();
  // Exposed for play-testing over the DevTools protocol.
  window.__nightGallery = game;
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    accumulator += dt;
    while (accumulator >= STEP) {
      update(game, STEP);
      accumulator -= STEP;
    }
    // The clock drives pulsing glows even on overlay screens.
    if (game.screen !== 'play') game.clock += dt;
    drawGame(ctx, game);
    drawIntro(ctx, game);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot();

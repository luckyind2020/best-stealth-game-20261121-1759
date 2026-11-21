// Night Gallery — everything the player sees, drawn on one canvas.
// The renderer only reads game state; it never changes it. Floor coordinates
// are translated by the floor's offset, so levels stay in their own 1240x720
// space. Vision cones are drawn from the same ray-clipped polygons the
// sight rules use, so what you see is what the wardens see.
import { CANVAS, FLOOR, PALETTE, FONT, WARDEN } from './settings.js';
import { conePolygon, levelBlockers } from './sight.js';
import { STATE_CHASE, STATE_CURIOUS } from './guard.js';

const fx = (x) => FLOOR.x + x;
const fy = (y) => FLOOR.y + y;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawStar(ctx, x, y, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI / 4) * i - Math.PI / 2;
    const r = i % 2 === 0 ? radius : radius * 0.42;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawFloor(ctx, game) {
  const level = game.level;
  ctx.fillStyle = PALETTE.floorA;
  ctx.fillRect(FLOOR.x, FLOOR.y, FLOOR.width, FLOOR.height);
  // Checker tiles, faint, so the floor reads as stone slabs.
  ctx.fillStyle = PALETTE.floorB;
  const tile = 62;
  for (let ty = 0; ty < FLOOR.height / tile; ty += 1) {
    for (let tx = 0; tx < FLOOR.width / tile; tx += 1) {
      if ((tx + ty) % 2 === 0) continue;
      ctx.fillRect(FLOOR.x + tx * tile, FLOOR.y + ty * tile, tile, tile);
    }
  }
  // Moonlit rugs: dark pools where the thief is harder to spot.
  for (const s of level.shadows) {
    ctx.fillStyle = PALETTE.shadow;
    roundRect(ctx, fx(s.x), fy(s.y), s.width, s.height, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150, 165, 220, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // A pale moonbeam across the floor, purely decorative.
  const beam = ctx.createLinearGradient(FLOOR.x, FLOOR.y, FLOOR.x + 500, FLOOR.y + FLOOR.height);
  beam.addColorStop(0, 'rgba(190, 205, 255, 0.07)');
  beam.addColorStop(1, 'rgba(190, 205, 255, 0)');
  ctx.fillStyle = beam;
  ctx.fillRect(FLOOR.x, FLOOR.y, 500, FLOOR.height);
  ctx.strokeStyle = PALETTE.hudLine;
  ctx.lineWidth = 3;
  ctx.strokeRect(FLOOR.x, FLOOR.y, FLOOR.width, FLOOR.height);
}

function drawCones(ctx, game) {
  for (const warden of game.wardens) {
    const color = warden.state === STATE_CHASE
      ? PALETTE.coneAlarm
      : warden.state === STATE_CURIOUS
        ? PALETTE.coneCurious
        : PALETTE.coneCalm;
    const edge = warden.state === STATE_CHASE
      ? 'rgba(255, 70, 70, 0.6)'
      : warden.state === STATE_CURIOUS
        ? 'rgba(255, 150, 60, 0.6)'
        : PALETTE.coneCalmEdge;
    const poly = conePolygon(warden.x, warden.y, warden.facing,
      WARDEN.sightHalfAngle, WARDEN.sightRange, game.blockers, 26);
    ctx.beginPath();
    poly.forEach((p, i) => {
      if (i === 0) ctx.moveTo(fx(p.x), fy(p.y));
      else ctx.lineTo(fx(p.x), fy(p.y));
    });
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawExit(ctx, game) {
  const e = game.level.exit;
  const open = game.shardsTaken >= game.level.shards.length;
  const pulse = open ? 0.55 + 0.35 * Math.sin(game.clock * 3) : 0.5;
  ctx.save();
  ctx.shadowColor = open ? PALETTE.exitOpen : PALETTE.exitLocked;
  ctx.shadowBlur = open ? 22 * pulse + 8 : 8;
  ctx.fillStyle = open ? PALETTE.exitOpen : PALETTE.exitLocked;
  roundRect(ctx, fx(e.x), fy(e.y), e.width, e.height, 8);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#0d1020';
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(open ? 'EXIT' : 'LOCKED', fx(e.x + e.width / 2), fy(e.y + e.height / 2) - 8);
  ctx.font = `11px ${FONT}`;
  ctx.fillText(open ? 'slip out unseen' : `${game.shardsTaken}/${game.level.shards.length} shards`, fx(e.x + e.width / 2), fy(e.y + e.height / 2) + 10);
}

function drawShards(ctx, game) {
  game.level.shards.forEach((shard, i) => {
    if (game.shardGot[i]) return;
    const pulse = 0.8 + 0.2 * Math.sin(game.clock * 4 + i * 1.7);
    ctx.save();
    ctx.shadowColor = PALETTE.shardGlow;
    ctx.shadowBlur = 16 * pulse;
    drawStar(ctx, fx(shard.x), fy(shard.y), 13 * pulse, PALETTE.shard);
    ctx.restore();
    ctx.fillStyle = '#fff7cc';
    ctx.beginPath();
    ctx.arc(fx(shard.x), fy(shard.y), 3.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawObstacles(ctx, game) {
  const level = game.level;
  for (const wall of level.walls) {
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(fx(wall.x), fy(wall.y), wall.width, wall.height);
    ctx.strokeStyle = PALETTE.wallEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(fx(wall.x), fy(wall.y), wall.width, wall.height);
  }
  for (const crate of level.crates) {
    ctx.fillStyle = PALETTE.crate;
    ctx.fillRect(fx(crate.x), fy(crate.y), crate.width, crate.height);
    ctx.strokeStyle = PALETTE.crateEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(fx(crate.x), fy(crate.y), crate.width, crate.height);
    ctx.beginPath();
    ctx.moveTo(fx(crate.x), fy(crate.y));
    ctx.lineTo(fx(crate.x + crate.width), fy(crate.y + crate.height));
    ctx.moveTo(fx(crate.x + crate.width), fy(crate.y));
    ctx.lineTo(fx(crate.x), fy(crate.y + crate.height));
    ctx.stroke();
  }
  for (const pillar of level.pillars) {
    ctx.fillStyle = PALETTE.pillar;
    ctx.beginPath();
    ctx.arc(fx(pillar.x), fy(pillar.y), pillar.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.pillarEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.beginPath();
    ctx.arc(fx(pillar.x - 6), fy(pillar.y - 6), pillar.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHedgeBase(ctx, game) {
  for (const hedge of game.level.hedges) {
    ctx.fillStyle = PALETTE.hedge;
    ctx.beginPath();
    ctx.arc(fx(hedge.x), fy(hedge.y), hedge.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.hedgeLight;
    for (let i = 0; i < 7; i += 1) {
      const a = (i / 7) * Math.PI * 2 + hedge.x;
      ctx.beginPath();
      ctx.arc(
        fx(hedge.x + Math.cos(a) * hedge.radius * 0.55),
        fy(hedge.y + Math.sin(a) * hedge.radius * 0.55),
        7, 0, Math.PI * 2,
      );
      ctx.fill();
    }
  }
}

function drawHedgeCanopy(ctx, game) {
  // A soft canopy over anyone tucked inside a hedge, so hiding reads clearly.
  for (const hedge of game.level.hedges) {
    const thief = game.thief;
    const dx = thief.x - hedge.x;
    const dy = thief.y - hedge.y;
    if (dx * dx + dy * dy > hedge.radius * hedge.radius) continue;
    ctx.fillStyle = 'rgba(31, 77, 46, 0.5)';
    ctx.beginPath();
    ctx.arc(fx(hedge.x), fy(hedge.y), hedge.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWardens(ctx, game) {
  for (const warden of game.wardens) {
    const x = fx(warden.x);
    const y = fy(warden.y);
    // A faint lantern glow around each warden, so they read against the floor.
    const glow = ctx.createRadialGradient(x, y, 4, x, y, 46);
    glow.addColorStop(0, 'rgba(255, 200, 120, 0.20)');
    glow.addColorStop(1, 'rgba(255, 200, 120, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 46, 0, Math.PI * 2);
    ctx.fill();
    // Body: a maroon disc with a darker rim and a facing tick.
    ctx.fillStyle = PALETTE.warden;
    ctx.beginPath();
    ctx.arc(x, y, WARDEN.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.wardenDark;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = '#ffd9a0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(warden.facing) * (WARDEN.radius + 7),
      y + Math.sin(warden.facing) * (WARDEN.radius + 7));
    ctx.stroke();
    // A small lantern dot ahead of the warden.
    ctx.fillStyle = '#ffe1a1';
    ctx.beginPath();
    ctx.arc(x + Math.cos(warden.facing) * (WARDEN.radius + 9),
      y + Math.sin(warden.facing) * (WARDEN.radius + 9), 3.5, 0, Math.PI * 2);
    ctx.fill();
    // "?" while curious, "!" while chasing.
    if (warden.state === STATE_CHASE || warden.state === STATE_CURIOUS) {
      ctx.fillStyle = warden.state === STATE_CHASE ? '#ff6b6b' : '#ffb648';
      ctx.font = `bold 26px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(warden.state === STATE_CHASE ? '!' : '?', x, y - 30);
    }
  }
}

function drawThief(ctx, game) {
  const thief = game.thief;
  const x = fx(thief.x);
  const y = fy(thief.y);
  // A soft teal glow, so the player never loses the thief in the dark.
  const glow = ctx.createRadialGradient(x, y, 4, x, y, 40);
  glow.addColorStop(0, 'rgba(47, 214, 195, 0.25)');
  glow.addColorStop(1, 'rgba(47, 214, 195, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 40, 0, Math.PI * 2);
  ctx.fill();
  // Cloak: a teal disc with a darker hood wedge pointing where Pip faces.
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(x, y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.playerDark;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = PALETTE.playerDark;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, 13, thief.facing - 0.7, thief.facing + 0.7);
  ctx.closePath();
  ctx.fill();
  // Two pale eyes in the hood.
  const ex = Math.cos(thief.facing);
  const ey = Math.sin(thief.facing);
  const px = -ey;
  const py = ex;
  ctx.fillStyle = '#eafffb';
  ctx.beginPath();
  ctx.arc(x + ex * 5 - px * 4, y + ey * 5 - py * 4, 2.2, 0, Math.PI * 2);
  ctx.arc(x + ex * 5 + px * 4, y + ey * 5 + py * 4, 2.2, 0, Math.PI * 2);
  ctx.fill();
  if (thief.sneaking) {
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `bold 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('SNEAKING', x, y + 26);
  }
}

function drawNoise(ctx, game) {
  for (const ring of game.noiseRings) {
    ctx.strokeStyle = `rgba(230, 235, 255, ${ring.alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(fx(ring.x), fy(ring.y), ring.r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawHud(ctx, game) {
  ctx.fillStyle = PALETTE.hud;
  ctx.fillRect(0, 0, CANVAS.width, 64);
  ctx.strokeStyle = PALETTE.hudLine;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 64);
  ctx.lineTo(CANVAS.width, 64);
  ctx.stroke();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillText('Night Gallery', 20, 33);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `16px ${FONT}`;
  ctx.fillText(`Floor ${game.levelIndex + 1}/3 · ${game.level.name}`, 220, 33);
  const mm = String(Math.floor(game.elapsed / 60)).padStart(2, '0');
  const ss = String(Math.floor(game.elapsed % 60)).padStart(2, '0');
  ctx.fillText(`${mm}:${ss}`, 560, 33);
  ctx.fillStyle = PALETTE.shard;
  ctx.fillText(`◆ ${game.shardsTaken}/${game.level.shards.length}`, 650, 33);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`Score ${game.score}`, 760, 33);
  // The detection meter: the single most important number in the game.
  const barX = 920;
  const barW = 240;
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `bold 13px ${FONT}`;
  ctx.fillText('SEEN', barX, 20);
  ctx.fillStyle = '#10142a';
  roundRect(ctx, barX, 30, barW, 16, 8);
  ctx.fill();
  const frac = Math.max(0, Math.min(1, game.detection / 100));
  const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  grad.addColorStop(0, '#39d98a');
  grad.addColorStop(0.55, '#ffd94d');
  grad.addColorStop(1, '#ff5d5d');
  ctx.fillStyle = grad;
  if (frac > 0.005) {
    roundRect(ctx, barX, 30, barW * frac, 16, 8);
    ctx.fill();
  }
  ctx.strokeStyle = PALETTE.hudLine;
  ctx.lineWidth = 1.5;
  roundRect(ctx, barX, 30, barW, 16, 8);
  ctx.stroke();
  ctx.fillStyle = game.alarmed ? PALETTE.danger : PALETTE.muted;
  ctx.font = `bold 13px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(game.alarmed ? 'ALARM!' : game.detection >= 55 ? 'SUSPICIOUS' : 'HIDDEN', barX + barW, 20);
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `13px ${FONT}`;
  ctx.fillText(game.muted ? 'Sound off (M)' : 'Sound on (M)', 1180, 33);
  // Footer hint line.
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `14px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('WASD / arrows to move · hold Shift to sneak · click the floor to walk there · P pause · R restart',
    CANVAS.width / 2, 834);
  ctx.textAlign = 'left';
  // Toast message above the footer, when one is showing.
  if (game.toast && game.clock < game.toastUntil) {
    ctx.fillStyle = 'rgba(13, 16, 32, 0.85)';
    const w = ctx.measureText(game.toast).width + 36;
    roundRect(ctx, (CANVAS.width - w) / 2, 768, w, 34, 10);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = `15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(game.toast, CANVAS.width / 2, 786);
    ctx.textAlign = 'left';
  }
}

function drawPanel(ctx, title, lines, buttons) {
  ctx.fillStyle = 'rgba(10, 13, 28, 0.72)';
  ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
  const panelW = 640;
  const panelH = 150 + lines.length * 30 + (buttons.length ? 74 : 0);
  const px = (CANVAS.width - panelW) / 2;
  const py = (CANVAS.height - panelH) / 2;
  ctx.fillStyle = '#181d33';
  roundRect(ctx, px, py, panelW, panelH, 16);
  ctx.fill();
  ctx.strokeStyle = PALETTE.hudLine;
  ctx.lineWidth = 2;
  roundRect(ctx, px, py, panelW, panelH, 16);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `bold 30px ${FONT}`;
  ctx.fillText(title, CANVAS.width / 2, py + 52);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `16px ${FONT}`;
  lines.forEach((line, i) => {
    ctx.fillText(line, CANVAS.width / 2, py + 96 + i * 30);
  });
  buttons.forEach((button) => {
    ctx.fillStyle = button.primary ? PALETTE.gold : '#2b3152';
    roundRect(ctx, button.x, button.y, button.width, button.height, 10);
    ctx.fill();
    ctx.fillStyle = button.primary ? '#14141f' : PALETTE.text;
    ctx.font = `bold 17px ${FONT}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(button.label, button.x + button.width / 2, button.y + button.height / 2 + 1);
    ctx.textBaseline = 'alphabetic';
  });
  ctx.textAlign = 'left';
}

// Buttons for each overlay screen, centred under the panel text.
export function layoutButtons(screen) {
  const cy = CANVAS.height / 2 + 62;
  const one = [{ id: 'start', label: 'Begin the heist', x: CANVAS.width / 2 - 130, y: cy, width: 260, height: 48, primary: true }];
  const two = [
    { id: 'next', label: 'Next floor', x: CANVAS.width / 2 - 270, y: cy, width: 250, height: 48, primary: true },
    { id: 'again', label: 'Replay floor', x: CANVAS.width / 2 + 20, y: cy, width: 250, height: 48, primary: false },
  ];
  const over = [
    { id: 'retry', label: 'Try again', x: CANVAS.width / 2 - 270, y: cy, width: 250, height: 48, primary: true },
    { id: 'menu', label: 'Back to title', x: CANVAS.width / 2 + 20, y: cy, width: 250, height: 48, primary: false },
  ];
  if (screen === 'title') return one;
  if (screen === 'clear') return two;
  if (screen === 'over' || screen === 'win') return over;
  if (screen === 'paused') return [
    { id: 'resume', label: 'Resume', x: CANVAS.width / 2 - 270, y: cy, width: 250, height: 48, primary: true },
    { id: 'restart', label: 'Restart floor', x: CANVAS.width / 2 + 20, y: cy, width: 250, height: 48, primary: false },
  ];
  return [];
}

export function drawGame(ctx, game) {
  ctx.clearRect(0, 0, CANVAS.width, CANVAS.height);
  ctx.fillStyle = PALETTE.page;
  ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
  drawFloor(ctx, game);
  drawCones(ctx, game);
  drawExit(ctx, game);
  drawShards(ctx, game);
  drawObstacles(ctx, game);
  drawHedgeBase(ctx, game);
  drawWardens(ctx, game);
  drawThief(ctx, game);
  drawHedgeCanopy(ctx, game);
  drawNoise(ctx, game);
  drawHud(ctx, game);
  // Alarm vignette: a red frame that closes in while the alarm is live.
  if (game.alarmed) {
    const pulse = 0.10 + 0.05 * Math.sin(game.clock * 6);
    ctx.strokeStyle = `rgba(255, 60, 60, ${pulse + 0.12})`;
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, CANVAS.width - 14, CANVAS.height - 14);
  }
  const buttons = layoutButtons(game.screen);
  if (game.screen === 'title') {
    drawPanel(ctx, 'Night Gallery', [
      'You are Pip, a moth-thief. The museum keeps starlight shards',
      'behind its wardens. Gather them all, then slip out the green door.',
      'Stay out of the yellow cones — hedges hide you, shadows slow',
      'the wardens’ eyes, and sneaking is silent. Best score: ' + game.best,
    ], buttons);
  } else if (game.screen === 'paused') {
    drawPanel(ctx, 'Paused', ['Take a breath. The wardens are waiting.'], buttons);
  } else if (game.screen === 'clear') {
    drawPanel(ctx, `${game.level.name} cleared!`, [
      `Time ${game.clearTime} · shards ${game.level.shards.length}/${game.level.shards.length}`,
      game.ghostThisFloor ? 'Ghost bonus +300 — nobody ever raised the alarm.' : 'The alarm went off once. A ghost run pays +300.',
      `Score ${game.score}`,
    ], buttons);
  } else if (game.screen === 'over') {
    drawPanel(ctx, 'Caught!', [
      'A warden laid a hand on your shoulder. The shards stay behind.',
      `You reached floor ${game.levelIndex + 1} with ${game.score} points.`,
    ], buttons);
  } else if (game.screen === 'win') {
    drawPanel(ctx, 'The heist is done!', [
      'All three floors, every shard, and the dawn still hasn’t caught you.',
      `Final score ${game.score} · best ${game.best}`,
    ], buttons);
  }
}

// The level-intro banner the game shows for a few seconds after a floor loads.
export function drawIntro(ctx, game) {
  if (game.screen !== 'play' || game.clock > game.introUntil) return;
  ctx.fillStyle = 'rgba(13, 16, 32, 0.85)';
  const w = 720;
  roundRect(ctx, (CANVAS.width - w) / 2, 96, w, 64, 12);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillText(game.level.name, CANVAS.width / 2, 120);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `14px ${FONT}`;
  ctx.fillText(game.level.intro, CANVAS.width / 2, 146);
  ctx.textAlign = 'left';
}

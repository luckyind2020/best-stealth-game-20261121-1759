// Night Gallery — the thief. Pip moves with the keyboard or by clicking a
// spot on the floor (click-to-move walks there in a straight line and stops
// at the first obstacle). Walls, crates and pillars are solid; hedges and
// shadows are not. Sneaking is slower and silent and harder to spot.
import { PLAYER, FLOOR } from './settings.js';

export function makeThief(spawn) {
  return {
    x: spawn.x,
    y: spawn.y,
    facing: 0,
    sneaking: false,
    moving: false,
    // Click-to-move destination, or null.
    clickTarget: null,
    // Footstep timer: walking makes a soft noise every so often.
    stepClock: 0,
    stepped: false,
  };
}

// Push a circle out of a rectangle it overlaps; returns true when it did.
function pushOutOfRect(body, rect) {
  const nearestX = Math.max(rect.x, Math.min(body.x, rect.x + rect.width));
  const nearestY = Math.max(rect.y, Math.min(body.y, rect.y + rect.height));
  const dx = body.x - nearestX;
  const dy = body.y - nearestY;
  const dist2 = dx * dx + dy * dy;
  if (dist2 >= PLAYER.radius * PLAYER.radius) return false;
  if (dist2 < 1e-9) {
    // Centre inside the rectangle: push out along the shortest side.
    const left = body.x - rect.x;
    const right = rect.x + rect.width - body.x;
    const top = body.y - rect.y;
    const bottom = rect.y + rect.height - body.y;
    const smallest = Math.min(left, right, top, bottom);
    if (smallest === left) body.x = rect.x - PLAYER.radius;
    else if (smallest === right) body.x = rect.x + rect.width + PLAYER.radius;
    else if (smallest === top) body.y = rect.y - PLAYER.radius;
    else body.y = rect.y + rect.height + PLAYER.radius;
    return true;
  }
  const dist = Math.sqrt(dist2);
  body.x = nearestX + (dx / dist) * PLAYER.radius;
  body.y = nearestY + (dy / dist) * PLAYER.radius;
  return true;
}

function pushOutOfCircle(body, circle) {
  const dx = body.x - circle.x;
  const dy = body.y - circle.y;
  const dist = Math.hypot(dx, dy);
  const min = PLAYER.radius + circle.radius;
  if (dist >= min || dist < 1e-9) return false;
  body.x = circle.x + (dx / dist) * min;
  body.y = circle.y + (dy / dist) * min;
  return true;
}

export function resolveCollisions(thief, level) {
  thief.x = Math.max(PLAYER.radius, Math.min(FLOOR.width - PLAYER.radius, thief.x));
  thief.y = Math.max(PLAYER.radius, Math.min(FLOOR.height - PLAYER.radius, thief.y));
  for (const wall of level.walls) pushOutOfRect(thief, wall);
  for (const crate of level.crates) pushOutOfRect(thief, crate);
  for (const pillar of level.pillars) pushOutOfCircle(thief, pillar);
}

// Move the thief one fixed step. `keys` is {x, y} from the keyboard (-1..1),
// or null when no key is held; a click target overrides the keyboard.
// Returns true when the thief actually moved this step.
export function stepThief(thief, level, dt, keys) {
  let mx = 0;
  let my = 0;
  if (keys && (keys.x !== 0 || keys.y !== 0)) {
    mx = keys.x;
    my = keys.y;
    thief.clickTarget = null;
  } else if (thief.clickTarget) {
    const dx = thief.clickTarget.x - thief.x;
    const dy = thief.clickTarget.y - thief.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) {
      thief.clickTarget = null;
    } else {
      mx = dx / dist;
      my = dy / dist;
    }
  }
  const len = Math.hypot(mx, my);
  if (len < 1e-6) {
    thief.moving = false;
    thief.stepped = false;
    return false;
  }
  mx /= len;
  my /= len;
  const speed = thief.sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
  const beforeX = thief.x;
  const beforeY = thief.y;
  thief.x += mx * speed * dt;
  thief.y += my * speed * dt;
  resolveCollisions(thief, level);
  const moved = Math.hypot(thief.x - beforeX, thief.y - beforeY) > 0.01;
  thief.moving = moved;
  if (moved) thief.facing = Math.atan2(my, mx);
  // Footsteps: walking ticks twice a second, sneaking never ticks.
  thief.stepped = false;
  if (moved && !thief.sneaking) {
    thief.stepClock += dt;
    if (thief.stepClock >= 0.45) {
      thief.stepClock = 0;
      thief.stepped = true;
    }
  } else {
    thief.stepClock = 0;
  }
  return moved;
}

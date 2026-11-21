// Night Gallery — the wardens. A warden walks its patrol, pauses at each
// waypoint, and watches. Seeing the thief fills a shared detection meter:
// curious at half, alarm at full. A curious warden walks to where it last saw
// the thief and looks around; an alarmed warden chases, and catching the
// thief ends the game. Noise — a thief walking too close — draws a warden to
// investigate the sound.
import { WARDEN, SENSE } from './settings.js';
import { pointInCone, pointInCircle } from './sight.js';

export const STATE_PATROL = 'patrol';
export const STATE_CURIOUS = 'curious';
export const STATE_CHASE = 'chase';
export const STATE_SEARCH = 'search';

export function makeWarden(def) {
  const start = def.path[0];
  return {
    x: start[0],
    y: start[1],
    facing: Math.atan2(def.path[1][1] - start[1], def.path[1][0] - start[0]),
    waypoint: 1,
    pauseLeft: 0,
    state: STATE_PATROL,
    speedScale: def.speed ?? 1,
    // Where the warden is walking to right now (patrol point or last seen).
    target: null,
    // Where it last saw the thief, or heard a noise.
    lastSeen: null,
    searchLeft: 0,
    unseenFor: 0,
    // Shared detection meter lives on the game; this is the warden's own
    // contribution flag for the "!" / "?" marks.
    alerted: false,
    suspicious: false,
    // Smooth facing while searching: the warden slowly sweeps its gaze.
    sweepAngle: 0,
  };
}

function moveToward(warden, tx, ty, speed, dt) {
  const dx = tx - warden.x;
  const dy = ty - warden.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6) return true;
  const step = Math.min(dist, speed * dt);
  warden.x += (dx / dist) * step;
  warden.y += (dy / dist) * step;
  warden.facing = Math.atan2(dy, dx);
  return step >= dist - 1e-6;
}

// Can this warden see the thief right now? Hedges hide the thief unless the
// warden is nearly on top of them; shadows and sneaking slow the meter.
export function wardenSees(warden, thief, level, blockers) {
  const dx = thief.x - warden.x;
  const dy = thief.y - warden.y;
  const dist = Math.hypot(dx, dy);
  const hiddenInHedge = level.hedges.some((h) => pointInCircle(thief.x, thief.y, h));
  if (hiddenInHedge && dist > WARDEN.hedgeSpotDistance) return { seen: false, gain: 0 };
  if (dist > WARDEN.sightRange) return { seen: false, gain: 0 };
  if (!pointInCone(thief.x, thief.y, warden.x, warden.y, warden.facing,
    WARDEN.sightHalfAngle, WARDEN.sightRange, blockers)) return { seen: false, gain: 0 };
  const closeness = 1 - dist / WARDEN.sightRange;
  let gain = SENSE.gainFar + (SENSE.gainNear - SENSE.gainFar) * closeness;
  if (thief.sneaking) gain *= SENSE.sneakFactor;
  if (level.shadows.some((s) => thief.x >= s.x && thief.x <= s.x + s.width
    && thief.y >= s.y && thief.y <= s.y + s.height)) gain *= SENSE.shadowFactor;
  return { seen: true, gain };
}

// One fixed step of warden behaviour. `events` collects what happened so the
// game can play sounds and update the alarm: { heard, spotted, lost }.
export function stepWarden(warden, def, dt, game, events) {
  const speed = (base) => base * warden.speedScale;
  if (warden.state === STATE_PATROL) {
    if (warden.pauseLeft > 0) {
      warden.pauseLeft -= dt;
      return;
    }
    const point = def.path[warden.waypoint];
    if (moveToward(warden, point[0], point[1], speed(WARDEN.patrolSpeed), dt)) {
      warden.waypoint = (warden.waypoint + 1) % def.path.length;
      warden.pauseLeft = WARDEN.waypointPause;
    }
    return;
  }
  if (warden.state === STATE_CURIOUS) {
    const spot = warden.lastSeen;
    if (spot && moveToward(warden, spot.x, spot.y, speed(WARDEN.curiousSpeed), dt)) {
      warden.state = STATE_SEARCH;
      warden.searchLeft = WARDEN.searchTime;
      warden.sweepAngle = warden.facing;
    }
    return;
  }
  if (warden.state === STATE_SEARCH) {
    warden.searchLeft -= dt;
    warden.sweepAngle += dt * 1.4;
    warden.facing = warden.sweepAngle + Math.sin(warden.searchLeft * 2.2) * 0.9;
    if (warden.searchLeft <= 0) {
      warden.state = STATE_PATROL;
      warden.suspicious = false;
      // Walk back to the nearest waypoint instead of cutting across the room.
      let nearest = 0;
      let best = Infinity;
      def.path.forEach((p, i) => {
        const d = Math.hypot(p[0] - warden.x, p[1] - warden.y);
        if (d < best) { best = d; nearest = i; }
      });
      warden.waypoint = nearest;
    }
    return;
  }
  // STATE_CHASE: run at the thief's last known position; keep updating it
  // while the thief is visible.
  const thief = game.thief;
  const spot = warden.lastSeen ?? { x: thief.x, y: thief.y };
  moveToward(warden, spot.x, spot.y, speed(WARDEN.chaseSpeed), dt);
  const dist = Math.hypot(thief.x - warden.x, thief.y - warden.y);
  if (dist <= WARDEN.catchDistance) events.caught = true;
}

// A warden hears a noise at (x, y) and goes to look, if it is not chasing.
export function wardenHears(warden, x, y) {
  if (warden.state === STATE_CHASE) return;
  warden.lastSeen = { x, y };
  warden.state = STATE_CURIOUS;
  warden.suspicious = true;
}

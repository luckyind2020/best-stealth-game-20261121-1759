// Night Gallery — seeing and hiding: rays, segments and vision cones.
// A warden's cone is drawn ray by ray so walls, crates and pillars cut it short,
// and the same tests decide whether the thief is actually seen.

// Segment (x1,y1)-(x2,y2) against an axis-aligned rectangle. Slab method.
export function segmentHitsRect(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  for (const [p, d, lo, hi] of [
    [x1, dx, rect.x, rect.x + rect.width],
    [y1, dy, rect.y, rect.y + rect.height],
  ]) {
    if (Math.abs(d) < 1e-9) {
      if (p < lo || p > hi) return false;
    } else {
      let a = (lo - p) / d;
      let b = (hi - p) / d;
      if (a > b) [a, b] = [b, a];
      tMin = Math.max(tMin, a);
      tMax = Math.min(tMax, b);
      if (tMin > tMax) return false;
    }
  }
  return true;
}

// Segment against a circle: true when the segment passes within radius.
export function segmentHitsCircle(x1, y1, x2, y2, circle) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = 0;
  if (len2 > 0) {
    t = ((circle.x - x1) * dx + (circle.y - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
  }
  const cx = x1 + dx * t;
  const cy = y1 + dy * t;
  const ox = cx - circle.x;
  const oy = cy - circle.y;
  return ox * ox + oy * oy < circle.radius * circle.radius;
}

// Distance along a unit ray (ox,oy)+t*(dx,dy) to the first hit on a rectangle,
// or Infinity when the ray misses it. Used to clip vision cones at cover.
export function rayRectDistance(ox, oy, dx, dy, rect) {
  let tMin = 0;
  let tMax = Infinity;
  for (const [p, d, lo, hi] of [
    [ox, dx, rect.x, rect.x + rect.width],
    [oy, dy, rect.y, rect.y + rect.height],
  ]) {
    if (Math.abs(d) < 1e-9) {
      if (p < lo || p > hi) return Infinity;
    } else {
      let a = (lo - p) / d;
      let b = (hi - p) / d;
      if (a > b) [a, b] = [b, a];
      tMin = Math.max(tMin, a);
      tMax = Math.min(tMax, b);
      if (tMin > tMax) return Infinity;
    }
  }
  return tMin;
}

// Distance along a unit ray to the first hit on a circle, or Infinity.
export function rayCircleDistance(ox, oy, dx, dy, circle) {
  const cx = circle.x - ox;
  const cy = circle.y - oy;
  const along = cx * dx + cy * dy;
  if (along < 0) return Infinity;
  const closest2 = cx * cx + cy * cy - along * along;
  const r2 = circle.radius * circle.radius;
  if (closest2 > r2) return Infinity;
  return along - Math.sqrt(r2 - closest2);
}

// Every solid thing in a level, as the sight tests need it: rectangles for
// walls and crates, circles for pillars.
export function levelBlockers(level) {
  const rects = [...level.walls, ...level.crates];
  const circles = level.pillars.map((p) => ({ x: p.x, y: p.y, radius: p.radius }));
  return { rects, circles };
}

// Is the straight line from (x1,y1) to (x2,y2) clear of all blockers?
export function lineOfSightClear(x1, y1, x2, y2, blockers) {
  for (const rect of blockers.rects) {
    if (segmentHitsRect(x1, y1, x2, y2, rect)) return false;
  }
  for (const circle of blockers.circles) {
    if (segmentHitsCircle(x1, y1, x2, y2, circle)) return false;
  }
  return true;
}

// The visible part of a warden's cone: a fan of rays, each cut short by the
// first blocker it meets. Returns the polygon points (floor coordinates),
// starting at the warden's own position.
export function conePolygon(ox, oy, facing, halfAngle, range, blockers, rays = 26) {
  const points = [{ x: ox, y: oy }];
  for (let i = 0; i <= rays; i += 1) {
    const angle = facing - halfAngle + (2 * halfAngle * i) / rays;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let reach = range;
    for (const rect of blockers.rects) {
      reach = Math.min(reach, rayRectDistance(ox, oy, dx, dy, rect));
    }
    for (const circle of blockers.circles) {
      reach = Math.min(reach, rayCircleDistance(ox, oy, dx, dy, circle));
    }
    points.push({ x: ox + dx * Math.max(0, reach), y: oy + dy * Math.max(0, reach) });
  }
  return points;
}

// Is point (px,py) inside the cone and in line of sight? The angle and range
// checks come first because they are cheap; line of sight is the final word.
export function pointInCone(px, py, ox, oy, facing, halfAngle, range, blockers) {
  const dx = px - ox;
  const dy = py - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range || dist < 1e-6) return dist < 1e-6 ? false : dist <= range;
  let diff = Math.atan2(dy, dx) - facing;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) > halfAngle) return false;
  return lineOfSightClear(ox, oy, px, py, blockers);
}

export function pointInRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height;
}

export function pointInCircle(px, py, circle) {
  const dx = px - circle.x;
  const dy = py - circle.y;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

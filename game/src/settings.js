// Night Gallery — tuning numbers and colours in one place.
// The canvas is a fixed 1280x860 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.
export const CANVAS = { width: 1280, height: 860 };

// The playable floor sits below the HUD bar and above the footer hint line.
export const FLOOR = { x: 20, y: 84, width: 1240, height: 720 };

export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  walkSpeed: 158,
  sneakSpeed: 86,
  // A walking thief's steps carry this far; a sneaking thief makes no noise.
  noiseRadius: 62,
};

export const WARDEN = {
  radius: 14,
  patrolSpeed: 64,
  curiousSpeed: 96,
  chaseSpeed: 152,
  // How long a warden waits at each patrol point, in seconds.
  waypointPause: 0.9,
  // How long a warden stares around after losing a trail.
  searchTime: 2.6,
  // How long without seeing the thief before an alarm cools off.
  alarmMemory: 4.0,
  catchDistance: 27,
  // Vision: how far a warden sees and how wide the cone is (half-angle).
  sightRange: 235,
  sightHalfAngle: 0.62,
  // A thief hidden in a hedge is only spotted this close.
  hedgeSpotDistance: 48,
};

export const SENSE = {
  // Detection rises per second when the thief is seen; closer is faster.
  gainNear: 96,
  gainFar: 26,
  // Multipliers on the gain.
  sneakFactor: 0.55,
  shadowFactor: 0.5,
  // Detection falls per second while the thief is unseen.
  decay: 15,
  // Detection at which a warden grows curious, and at which the alarm trips.
  curiousAt: 55,
  alarmAt: 100,
};

export const SCORE = {
  shard: 150,
  // Level-clear time bonus: this minus two points a second, never below zero.
  timeBonusBase: 260,
  timeBonusPerSecond: 2,
  // Bonus for clearing a level without ever tripping the alarm.
  ghostBonus: 300,
};

export const PALETTE = {
  page: '#0d1020',
  hud: '#161a2e',
  hudLine: '#2b3152',
  floorA: '#232a45',
  floorB: '#1e2440',
  rug: '#2e3355',
  shadow: '#171c33',
  wall: '#3a4266',
  wallEdge: '#6a74a8',
  crate: '#7a5a34',
  crateEdge: '#a8834f',
  hedge: '#1f4d2e',
  hedgeLight: '#2f7a44',
  pillar: '#4a5178',
  pillarEdge: '#8b93c2',
  exitLocked: '#c98f2e',
  exitOpen: '#39d98a',
  shard: '#ffd94d',
  shardGlow: '#ffe98a',
  player: '#2fd6c3',
  playerDark: '#0e7a6e',
  warden: '#e5484d',
  wardenDark: '#8f1d22',
  coneCalm: 'rgba(255, 214, 90, 0.20)',
  coneCalmEdge: 'rgba(255, 214, 90, 0.55)',
  coneCurious: 'rgba(255, 150, 60, 0.30)',
  coneAlarm: 'rgba(255, 70, 70, 0.34)',
  text: '#eef1ff',
  muted: '#9aa3c7',
  danger: '#ff5d5d',
  gold: '#ffd94d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const BEST_KEY = 'night-gallery.best';

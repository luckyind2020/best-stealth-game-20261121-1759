// Night Gallery — the three floors of the museum, each one a plain data table.
// Coordinates live in floor space: x 0..1240, y 0..720, with (0, 0) the floor's
// top-left corner. Walls and crates are rectangles that block both movement and
// sight; pillars are circles that do the same; hedges hide the thief inside
// them; shadows are dark floor where the thief is harder to spot.
export const LEVELS = [
  {
    name: 'Moonlit Gallery',
    intro: 'Three wardens walk the hall. Gather the shards, then slip out the green door — unseen.',
    spawn: { x: 82, y: 82 },
    exit: { x: 1140, y: 636, width: 82, height: 58 },
    shards: [
      { x: 620, y: 118 },
      { x: 152, y: 622 },
      { x: 1122, y: 118 },
    ],
    walls: [
      { x: 420, y: 150, width: 400, height: 26 },
      { x: 820, y: 380, width: 26, height: 140 },
      { x: 300, y: 430, width: 26, height: 200 },
    ],
    crates: [
      { x: 180, y: 420, width: 70, height: 70 },
      { x: 640, y: 480, width: 70, height: 70 },
      { x: 980, y: 150, width: 70, height: 70 },
    ],
    pillars: [
      { x: 560, y: 380, radius: 26 },
      { x: 300, y: 180, radius: 24 },
      { x: 1020, y: 520, radius: 26 },
    ],
    hedges: [
      { x: 150, y: 150, radius: 52 },
      { x: 1050, y: 420, radius: 56 },
    ],
    shadows: [
      { x: 60, y: 560, width: 220, height: 120 },
      { x: 900, y: 560, width: 280, height: 120 },
    ],
    wardens: [
      { path: [[400, 120], [400, 560]], speed: 1.0 },
      { path: [[700, 300], [1080, 300]], speed: 1.0 },
      { path: [[900, 560], [900, 120]], speed: 1.0 },
    ],
  },
  {
    name: 'Sculpture Court',
    intro: 'The court is open and bright — hedges and statues are your only friends. Four wardens now.',
    spawn: { x: 82, y: 640 },
    exit: { x: 1140, y: 26, width: 82, height: 58 },
    shards: [
      { x: 200, y: 120 },
      { x: 620, y: 360 },
      { x: 1060, y: 620 },
      { x: 1060, y: 120 },
    ],
    walls: [
      { x: 380, y: 90, width: 26, height: 260 },
      { x: 830, y: 370, width: 26, height: 200 },
      { x: 520, y: 560, width: 300, height: 26 },
    ],
    crates: [
      { x: 480, y: 180, width: 70, height: 70 },
      { x: 700, y: 430, width: 70, height: 70 },
      { x: 200, y: 480, width: 70, height: 70 },
    ],
    pillars: [
      { x: 620, y: 180, radius: 26 },
      { x: 620, y: 540, radius: 26 },
      { x: 1000, y: 360, radius: 24 },
    ],
    hedges: [
      { x: 180, y: 300, radius: 58 },
      { x: 880, y: 180, radius: 56 },
      { x: 880, y: 560, radius: 58 },
      { x: 440, y: 640, radius: 50 },
    ],
    shadows: [
      { x: 60, y: 60, width: 240, height: 110 },
      { x: 940, y: 300, width: 240, height: 110 },
    ],
    wardens: [
      { path: [[300, 90], [300, 640]], speed: 1.05 },
      { path: [[520, 620], [1120, 620]], speed: 1.05 },
      { path: [[940, 90], [940, 640]], speed: 1.1 },
      { path: [[620, 280], [620, 460]], speed: 1.0 },
    ],
  },
  {
    name: 'The Vault',
    intro: 'Five wardens guard the last shards. Move slowly, use the dark.',
    spawn: { x: 80, y: 680 },
    exit: { x: 80, y: 26, width: 82, height: 58 },
    shards: [
      { x: 120, y: 360 },
      { x: 620, y: 120 },
      { x: 1120, y: 360 },
      { x: 300, y: 620 },
      { x: 940, y: 620 },
    ],
    walls: [
      { x: 220, y: 120, width: 26, height: 300 },
      { x: 994, y: 300, width: 26, height: 300 },
      { x: 460, y: 300, width: 120, height: 26 },
      { x: 660, y: 300, width: 120, height: 26 },
      { x: 460, y: 520, width: 320, height: 26 },
    ],
    crates: [
      { x: 340, y: 180, width: 70, height: 70 },
      { x: 830, y: 470, width: 70, height: 70 },
      { x: 480, y: 400, width: 70, height: 70 },
    ],
    pillars: [
      { x: 700, y: 240, radius: 24 },
      { x: 860, y: 360, radius: 24 },
      { x: 120, y: 560, radius: 24 },
      { x: 1060, y: 120, radius: 24 },
    ],
    hedges: [
      { x: 90, y: 180, radius: 46 },
      { x: 1150, y: 540, radius: 46 },
      { x: 700, y: 430, radius: 46 },
    ],
    shadows: [
      { x: 60, y: 260, width: 140, height: 200 },
      { x: 1040, y: 260, width: 140, height: 200 },
      { x: 520, y: 60, width: 200, height: 90 },
    ],
    wardens: [
      { path: [[200, 90], [200, 640]], speed: 1.15 },
      { path: [[1100, 90], [1100, 640]], speed: 1.15 },
      { path: [[340, 90], [900, 90]], speed: 1.1 },
      { path: [[340, 640], [900, 640]], speed: 1.1 },
      { path: [[620, 180], [620, 480]], speed: 1.2 },
    ],
  },
];

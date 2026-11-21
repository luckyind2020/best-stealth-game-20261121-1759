// Night Gallery — the three staged frames for screenshots/.
// Each one builds a real level with the real rules and then sets it to a
// chosen moment: the title over a fresh floor, a thief crouched behind a
// crate with a warden's cone cut short by that crate, and a floor cleared
// with the thief standing in the open exit. The same seed always gives the
// same frame, because the staging steps the real simulation forward a fixed
// number of steps.
import { STEP } from './settings.js';

// Run the wardens forward without the thief moving, so patrols look lived-in.
function settleWardens(game, seconds, updateWardens) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) updateWardens(game, STEP);
}

export function stageShot(name, game, api) {
  if (name !== 'play' && name !== 'end') {
    // START: a fresh floor 1, wardens a few seconds into their patrols,
    // the thief at the door, title panel on top.
    api.loadFloor(game, 0);
    settleWardens(game, 4, api.updateWardens);
    game.screen = 'title';
    game.elapsed = 0;
    game.score = 0;
    return;
  }
  if (name === 'play') {
    // PLAY: mid-floor, one shard already taken, the thief sneaking behind
    // the crate at (640, 480) while a warden's cone washes over the crate
    // and stops — cover doing its job. Detection sits just under curious.
    api.loadFloor(game, 0);
    game.shardGot[0] = true;
    game.shardsTaken = 1;
    game.score = 150;
    game.elapsed = 47;
    game.thief.x = 675;
    game.thief.y = 568;
    game.thief.sneaking = true;
    game.thief.facing = -Math.PI / 2;
    const warden = game.wardens[1];
    // Parked straight above the crate, facing down at the thief: the crate
    // cuts the middle of the cone clean in two, and the thief crouches in
    // the shadow it throws. Frozen mid-patrol so the frame stays put.
    warden.x = 675;
    warden.y = 400;
    warden.facing = Math.PI / 2;
    warden.state = 'patrol';
    warden.pauseLeft = 999;
    warden.suspicious = true;
    warden.lastSeen = { x: 700, y: 560 };
    game.detection = 60; // decays while unseen; lands near 46 when the shot is taken
    game.screen = 'play';
    game.introUntil = 0;
    return;
  }
  // END: floor 1 cleared — every shard taken, the thief in the open exit,
  // the clear panel on top.
  api.loadFloor(game, 0);
  game.shardGot = game.shardGot.map(() => true);
  game.shardsTaken = game.level.shards.length;
  game.score = 815;
  game.elapsed = 96;
  game.thief.x = game.level.exit.x + game.level.exit.width / 2;
  // Just outside the open door, so the EXIT sign stays readable.
  game.thief.y = game.level.exit.y - 34;
  game.thief.facing = Math.PI / 2;
  game.clearTime = '1:36';
  game.ghostThisFloor = true;
  game.screen = 'clear';
}

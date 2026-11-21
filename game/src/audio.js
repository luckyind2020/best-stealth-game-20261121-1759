// Night Gallery — all sound is synthesized with the Web Audio API; there are
// no audio files. A tiny helper builds short oscillator tones, and each game
// event gets its own small phrase. Sound starts only after the first user
// gesture, as browsers require, and M toggles it.
export function makeAudio() {
  return {
    ctx: null,
    master: null,
    muted: false,
    ensure() {
      if (this.ctx) return;
      const Ctx = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    },
    setMuted(muted) {
      this.muted = muted;
      if (this.master) this.master.gain.value = muted ? 0 : 0.5;
    },
    tone(freq, startAt, dur, type, vol) {
      if (!this.ctx || this.muted) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const t0 = this.ctx.currentTime + startAt;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    },
    // A soft floorboard tick for a walking step.
    step() {
      this.tone(170 + Math.random() * 30, 0, 0.07, 'triangle', 0.10);
    },
    // Two rising notes when a shard is picked up.
    shard() {
      this.tone(660, 0, 0.16, 'sine', 0.22);
      this.tone(990, 0.09, 0.22, 'sine', 0.22);
    },
    // A low warning buzz when a warden grows curious.
    curious() {
      this.tone(220, 0, 0.18, 'sawtooth', 0.10);
      this.tone(185, 0.12, 0.2, 'sawtooth', 0.10);
    },
    // A sharp two-note sting when the alarm trips.
    alarm() {
      this.tone(392, 0, 0.22, 'square', 0.14);
      this.tone(311, 0.16, 0.34, 'square', 0.14);
    },
    // A falling phrase when the thief is caught.
    caught() {
      this.tone(330, 0, 0.25, 'sawtooth', 0.16);
      this.tone(247, 0.2, 0.3, 'sawtooth', 0.16);
      this.tone(165, 0.45, 0.55, 'sawtooth', 0.16);
    },
    // A short arpeggio for clearing a floor.
    clear() {
      [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i * 0.1, 0.24, 'sine', 0.2));
    },
    // A longer fanfare for finishing the whole heist.
    win() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, i * 0.12, 0.3, 'triangle', 0.2));
    },
    // A dull thunk for bumping a locked exit.
    locked() {
      this.tone(140, 0, 0.14, 'square', 0.12);
    },
    click() {
      this.tone(520, 0, 0.06, 'sine', 0.14);
    },
  };
}

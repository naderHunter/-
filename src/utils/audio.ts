/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

// Safe browser audio context initializer
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
    }
  }
  // Try to resume if it was suspended (autoplay policy protection)
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Check if the narrator has enabled sound effects
 */
export function isAudioEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("mafia_sound_effects_enabled") !== "false";
}

/**
 * Toggle sound effects globally
 */
export function setAudioEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem("mafia_sound_effects_enabled", enabled ? "true" : "false");
}

/**
 * Play a beautiful, mysterious ambient chime for the Transition to Night (فاز شب)
 */
export function playNightChime() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  // Create a layered metallic and deep bell sound
  const notes = [220, 330, 440, 660]; // Chord A minor/E
  
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = idx % 2 === 0 ? "sine" : "triangle";
    osc.frequency.setValueAtTime(freq, now);
    
    // Add a tiny detune to make it warmer
    osc.detune.setValueAtTime(idx * 4, now);
    
    // Smooth release envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.12, now + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 2.0 + idx * 0.4);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 2.5 + idx * 0.4);
  });
}

/**
 * Play an optimistic, bright sweep for Day phase sunrise (طلوع آفتاب)
 */
export function playDaySunrise() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  // Bright major C major chord sweep
  const notes = [261.63, 329.63, 392.00, 523.25, 659.25];
  
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = "sine";
    // Stagger the notes to sound like a harp/strum
    const stagger = idx * 0.12;
    
    osc.frequency.setValueAtTime(freq, now + stagger);
    // pitch slide up
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + stagger + 1.2);
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.08, now + stagger + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + stagger + 1.8);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now + stagger);
    osc.stop(now + stagger + 2.0);
  });
}

/**
 * Play a grand victory fanfare (سرود پیروزی بازی)
 */
export function playVictoryFanfare() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  // Happy progression C major -> G major -> C major high
  const melody = [
    { freq: 261.63, time: 0, duration: 0.2 }, // C4
    { freq: 329.63, time: 0.2, duration: 0.2 }, // E4
    { freq: 392.00, time: 0.4, duration: 0.2 }, // G4
    { freq: 523.25, time: 0.6, duration: 0.6 }, // C5
  ];

  melody.forEach((note) => {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = "triangle";
    osc2.type = "sine"; 

    osc1.frequency.setValueAtTime(note.freq, now + note.time);
    osc2.frequency.setValueAtTime(note.freq * 1.01, now + note.time); // chorusing

    gainNode.gain.setValueAtTime(0, now + note.time);
    gainNode.gain.linearRampToValueAtTime(0.15, now + note.time + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + note.time + note.duration);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now + note.time);
    osc1.stop(now + note.time + note.duration);
    osc2.start(now + note.time);
    osc2.stop(now + note.time + note.duration);
  });
}

/**
 * Play a dramatic, low impact sound for a Player Death / Exile (خروج بازیکن)
 */
export function playDeathSound() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Deep dramatic gong/hit
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(100, now);
  // Pitch drops down heavily
  osc.frequency.exponentialRampToValueAtTime(45, now + 1.2);

  // Bandpass filter to make it sound muffled and professional
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(180, now);
  filter.frequency.exponentialRampToValueAtTime(60, now + 1.0);

  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 1.6);
}

/**
 * Play a short subtle tick sound for speaking timers (تیک تاک تایمر)
 */
export function playTimerTick() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(800, now);

  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.04, now + 0.005);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.08);
}

/**
 * Play an alarm/warning tone when timer is almost out (هشدار ثانیه‌های پایانی)
 */
export function playTimerWarning() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(1100, now);

  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.07, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.2);
}

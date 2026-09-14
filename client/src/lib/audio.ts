// Procedural Web Audio API sound generator & Haptic Feedback for Nimiq Arena
// Classic Arcade & Retro Gaming Sound Engine: zero latency, zero external file dependencies.

export function triggerHaptic(
  type: "light" | "medium" | "heavy" | "success" | "warning" | "error" = "medium"
) {
  if (typeof window === "undefined") return;

  // 1. Telegram WebApp native haptic engine
  try {
    const tgHaptic = (window as any).Telegram?.WebApp?.HapticFeedback;
    if (tgHaptic) {
      if (type === "light" || type === "medium" || type === "heavy") {
        tgHaptic.impactOccurred(type);
      } else {
        tgHaptic.notificationOccurred(type);
      }
      return;
    }
  } catch {}

  // 2. Standard Web Vibration API fallback
  try {
    if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
      switch (type) {
        case "light":
          navigator.vibrate(15);
          break;
        case "medium":
          navigator.vibrate(35);
          break;
        case "heavy":
          navigator.vibrate(60);
          break;
        case "success":
          navigator.vibrate([30, 50, 80]);
          break;
        case "warning":
        case "error":
          navigator.vibrate([60, 40, 60]);
          break;
      }
    }
  } catch {}
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private isMusicEnabled: boolean = false;
  private musicInterval: number | null = null;
  private musicStep = 0;

  constructor() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("nimiq_arena_muted");
      this.isMuted = stored === "true";
      const musicStored = localStorage.getItem("nimiq_arena_music_enabled");
      // Default to music enabled unless explicitly turned off
      this.isMusicEnabled = musicStored !== "false";

      const unlock = () => {
        this.unlockAudio();
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("click", unlock);
        window.removeEventListener("keydown", unlock);
      };
      window.addEventListener("pointerdown", unlock, { once: true });
      window.addEventListener("click", unlock, { once: true });
      window.addEventListener("keydown", unlock, { once: true });
    }
  }

  public unlockAudio() {
    try {
      const ctx = this.getContext();
      if (ctx && ctx.state === "suspended") {
        void ctx.resume();
      }
    } catch {}
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== "undefined") {
      localStorage.setItem("nimiq_arena_muted", String(this.isMuted));
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Classic Arcade Dice Roll (fast rattling tumble & solid tabletop drop)
   */
  public playDiceRoll() {
    triggerHaptic("light");
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Rapid tumbling clicks
    for (let i = 0; i < 7; i++) {
      const time = now + i * 0.035 + Math.random() * 0.01;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = i % 2 === 0 ? "square" : "triangle";
      osc.frequency.setValueAtTime(320 + Math.random() * 260, time);
      osc.frequency.exponentialRampToValueAtTime(80, time + 0.025);

      gain.gain.setValueAtTime(0.09, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.028);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.03);
    }

    // Final decisive dice landing thud
    const landTime = now + 0.26;
    const landOsc = ctx.createOscillator();
    const landGain = ctx.createGain();
    landOsc.type = "sine";
    landOsc.frequency.setValueAtTime(160, landTime);
    landOsc.frequency.exponentialRampToValueAtTime(50, landTime + 0.06);

    landGain.gain.setValueAtTime(0.18, landTime);
    landGain.gain.exponentialRampToValueAtTime(0.001, landTime + 0.07);

    landOsc.connect(landGain);
    landGain.connect(ctx.destination);
    landOsc.start(landTime);
    landOsc.stop(landTime + 0.08);
  }

  /**
   * Classic Retro Hop / Move Sound (classic bouncy arcade hop)
   */
  public playPieceMove() {
    triggerHaptic("medium");
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.07);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  /**
   * Classic Arcade Step Tick (ascending 8-bit counting chime)
   */
  public playStepTick(stepNum: number = 1) {
    triggerHaptic("light");
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Classic arcade scale: C5, D5, E5, F5, G5, A5, B5, C6
    const scale = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5];
    const freq = scale[(stepNum - 1) % scale.length];

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq + 40, now + 0.04);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * Classic Arcade Elimination / Capture Impact ("Pow & Smash")
   */
  public playCapture() {
    triggerHaptic("heavy");
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Initial crisp punch attack
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "square";
    osc1.frequency.setValueAtTime(450, now);
    osc1.frequency.exponentialRampToValueAtTime(90, now + 0.12);

    gain1.gain.setValueAtTime(0.22, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // 2. Heavy sub bass resonance
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(140, now);
    sub.frequency.exponentialRampToValueAtTime(45, now + 0.2);

    subGain.gain.setValueAtTime(0.28, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.24);

    // 3. Ascending score bling
    const sparkle = ctx.createOscillator();
    const sparkleGain = ctx.createGain();
    sparkle.type = "triangle";
    sparkle.frequency.setValueAtTime(880, now + 0.08);
    sparkle.frequency.setValueAtTime(1318.51, now + 0.14); // E6

    sparkleGain.gain.setValueAtTime(0.18, now + 0.08);
    sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    sparkle.connect(sparkleGain);
    sparkleGain.connect(ctx.destination);
    sparkle.start(now + 0.08);
    sparkle.stop(now + 0.3);
  }

  /**
   * Classic Retro 1-Up / Power Bonus (Double 6 / Bonus Turn)
   */
  public playBonusTurn() {
    triggerHaptic("medium");
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Classic rapid ascending power-up arpeggio: E5 -> G#5 -> B5 -> E6
    const notes = [659.25, 830.61, 987.77, 1318.51];
    notes.forEach((freq, idx) => {
      const time = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.22, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.14);
    });
  }

  /**
   * Classic Retro Victory Fanfare
   */
  public playVictoryFanfare() {
    triggerHaptic("success");
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Classic 8-bit victory fanfare: G4 -> C5 -> E5 -> G5 -> C6 (held)
    const melody = [
      { f: 392.0, d: 0.1 },  // G4
      { f: 523.25, d: 0.1 }, // C5
      { f: 659.25, d: 0.1 }, // E5
      { f: 783.99, d: 0.15 }, // G5
      { f: 1046.5, d: 0.45 }, // C6
    ];

    let t = now;
    melody.forEach(({ f, d }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, t);

      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + d + 0.05);
      t += d + 0.03;
    });
  }

  /**
   * Classic Retro Turn Alert (high double ping)
   */
  public playTurnAlert() {
    triggerHaptic("light");
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [784, 1046.5].forEach((freq, idx) => {
      const time = now + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.18, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.14);
    });
  }

  /**
   * Classic Connect 4 Disc Drop & Slot Lock
   */
  public playChipDrop() {
    triggerHaptic("medium");
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(720, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * Classic Pop / Bubble
   */
  public playEmotePop() {
    triggerHaptic("light");
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(950, now + 0.07);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  /**
   * Classic Low Timer Warning Beep
   */
  public playTimerWarning() {
    triggerHaptic("warning");
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(660, now + 0.04);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  /**
   * Classic Retro Game Over / Defeat Jingle
   */
  public playDefeatChord() {
    triggerHaptic("error");
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Classic descending minor progression
    const notes = [
      { f: 493.88, d: 0.14 }, // B4
      { f: 466.16, d: 0.14 }, // Bb4
      { f: 440.0, d: 0.14 },  // A4
      { f: 415.3, d: 0.35 },  // Ab4
    ];

    let t = now;
    notes.forEach(({ f, d }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(f, t);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + d + 0.05);
      t += d + 0.02;
    });
  }

  public getMusicEnabled(): boolean {
    return this.isMusicEnabled;
  }

  public setMusicEnabled(enabled: boolean) {
    this.isMusicEnabled = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("nimiq_arena_music_enabled", String(enabled));
    }
    if (enabled) {
      this.startAmbientMusic();
    } else {
      this.stopAmbientMusic();
    }
  }

  public toggleAmbientMusic(): boolean {
    this.setMusicEnabled(!this.isMusicEnabled);
    return this.isMusicEnabled;
  }

  /**
   * Classic Arcade 8-Bit BGM Loop: Upbeat, bouncy, authentic video game chiptune
   */
  public startAmbientMusic() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    if (this.musicInterval !== null) return;

    // Classic arcade chiptune pattern (Bouncy C major / A minor arcade melody with bass groove)
    const melodyPattern = [
      // Bar 1: C - E - G - C
      { note: 523.25, bass: 130.81, dur: 0.22 }, // C5, C3
      { note: 659.25, bass: 130.81, dur: 0.22 }, // E5
      { note: 783.99, bass: 196.00, dur: 0.22 }, // G5, G3
      { note: 1046.5, bass: 130.81, dur: 0.22 }, // C6
      // Bar 2: A - C - E - A
      { note: 880.00, bass: 110.00, dur: 0.22 }, // A5, A2
      { note: 1046.5, bass: 110.00, dur: 0.22 }, // C6
      { note: 659.25, bass: 164.81, dur: 0.22 }, // E5, E3
      { note: 880.00, bass: 110.00, dur: 0.22 }, // A5
      // Bar 3: F - A - C - F
      { note: 698.46, bass: 87.31, dur: 0.22 },  // F5, F2
      { note: 880.00, bass: 87.31, dur: 0.22 },  // A5
      { note: 1046.5, bass: 130.81, dur: 0.22 }, // C6, C3
      { note: 698.46, bass: 87.31, dur: 0.22 },  // F5
      // Bar 4: G - B - D - G (Ascending turnaround)
      { note: 783.99, bass: 98.00, dur: 0.22 },  // G5, G2
      { note: 987.77, bass: 98.00, dur: 0.22 },  // B5
      { note: 1174.66, bass: 146.83, dur: 0.22 }, // D6, D3
      { note: 783.99, bass: 98.00, dur: 0.22 },  // G5
    ];

    const stepDurationMs = 240;

    const playNextNote = () => {
      if (!this.isMusicEnabled || this.isMuted) return;
      const audioCtx = this.getContext();
      if (!audioCtx) return;

      const current = melodyPattern[this.musicStep % melodyPattern.length];
      this.musicStep++;
      const now = audioCtx.currentTime;

      // 1. Chiptune Lead Melody (triangle/square synth)
      const leadOsc = audioCtx.createOscillator();
      const leadGain = audioCtx.createGain();
      leadOsc.type = "triangle";
      leadOsc.frequency.setValueAtTime(current.note, now);

      leadGain.gain.setValueAtTime(0.045, now);
      leadGain.gain.exponentialRampToValueAtTime(0.001, now + current.dur);

      leadOsc.connect(leadGain);
      leadGain.connect(audioCtx.destination);
      leadOsc.start(now);
      leadOsc.stop(now + current.dur + 0.02);

      // 2. Punchy 8-bit Bass Groove
      const bassOsc = audioCtx.createOscillator();
      const bassGain = audioCtx.createGain();
      bassOsc.type = "sine";
      bassOsc.frequency.setValueAtTime(current.bass, now);

      bassGain.gain.setValueAtTime(0.065, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      bassOsc.connect(bassGain);
      bassGain.connect(audioCtx.destination);
      bassOsc.start(now);
      bassOsc.stop(now + 0.2);
    };

    playNextNote();
    this.musicInterval = window.setInterval(playNextNote, stepDurationMs);
  }

  public stopAmbientMusic() {
    if (this.musicInterval !== null) {
      window.clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const soundEngine = new SoundEngine();

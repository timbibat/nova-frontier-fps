import { WeaponType } from '../types.ts';

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private isPlayingMusic = false;
  private musicInterval: any = null;
  private currentStep = 0;
  private backgroundDroneNode: {
    osc: OscillatorNode;
    gain: GainNode;
  } | null = null;

  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Generate standard white noise buffer
  private createNoiseBuffer(): AudioBuffer {
    this.initContext();
    const bufferSize = this.ctx!.sampleRate * 0.4; // 0.4 seconds of noise
    const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public playShootSound(type: WeaponType) {
    try {
      this.initContext();
      const ctx = this.ctx!;
      const now = ctx.currentTime;

      if (type === WeaponType.PISTOL) {
        // Pulse Pistol: Punchy digital blast
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.15);

      } else if (type === WeaponType.RIFLE) {
        // Rapid Rifle: Fast high-pitch snaps
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.08);
      }
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }

  public playBladeSwingSound() {
    try {
      this.initContext();
      const ctx = this.ctx!;
      const now = ctx.currentTime;

      // 1. Kinetic wind swoosh (bandpassed white noise)
      const noise = ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer();

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.Q.setValueAtTime(4, now);
      noiseFilter.frequency.setValueAtTime(1200, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(180, now + 0.25);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      // 2. Plasma hum sweep (low frequency triangle oscillator)
      const humOsc = ctx.createOscillator();
      humOsc.type = 'triangle';
      humOsc.frequency.setValueAtTime(280, now);
      humOsc.frequency.exponentialRampToValueAtTime(80, now + 0.25);

      // Add a slight detuned sub-oscillator for warmth
      const subOsc = ctx.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(283, now);
      subOsc.frequency.exponentialRampToValueAtTime(82, now + 0.25);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.18, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      humOsc.connect(oscGain);
      subOsc.connect(oscGain);
      oscGain.connect(ctx.destination);

      // Start triggers
      noise.start(now);
      humOsc.start(now);
      subOsc.start(now);

      noise.stop(now + 0.25);
      humOsc.stop(now + 0.25);
      subOsc.stop(now + 0.25);
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }

  public playHitMarkerSound() {
    try {
      this.initContext();
      const ctx = this.ctx!;
      const now = ctx.currentTime;

      // Clean metallic bip
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, now);
      
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }

  public startBackgroundMusic(arena: 'space' | 'desert') {
    try {
      this.initContext();
      this.stopBackgroundMusic(); // clear existing

      const ctx = this.ctx!;
      this.isPlayingMusic = true;
      this.currentStep = 0;

      const tempo = 128; // Dynamic Cyber Tempo (BPM)
      const stepTime = 60 / tempo / 2; // 8th notes (0.234 seconds per step)

      // Sci-fi arpeggiator chord structures (G Minor & Phrygian Dominant)
      const spacePattern = [
        196.00, 233.08, 293.66, 233.08, // G3, Bb3, D4, Bb3
        261.63, 311.13, 392.00, 311.13, // C4, Eb4, G4, Eb4
        293.66, 349.23, 440.00, 349.23, // D4, F4, A4, F4
        261.63, 311.13, 392.00, 293.66  // C4, Eb4, G4, D4
      ];

      const desertPattern = [
        196.00, 207.65, 246.94, 207.65, // G3, Ab3, B3, Ab3
        261.63, 311.13, 392.00, 311.13, // C4, Eb4, G4, Eb4
        293.66, 311.13, 246.94, 311.13, // D4, Eb4, B3, Eb4
        207.65, 246.94, 196.00, 146.83  // Ab3, B3, G3, D3
      ];

      const pattern = arena === 'space' ? spacePattern : desertPattern;

      // Deep cyber background sub-drone
      const droneOsc = ctx.createOscillator();
      const droneGain = ctx.createGain();
      const droneFilter = ctx.createBiquadFilter();

      droneOsc.type = arena === 'space' ? 'sawtooth' : 'triangle';
      droneOsc.frequency.setValueAtTime(arena === 'space' ? 55 : 48.99, ctx.currentTime);
      
      droneFilter.type = 'lowpass';
      droneFilter.frequency.setValueAtTime(90, ctx.currentTime);

      droneGain.gain.setValueAtTime(0.08, ctx.currentTime);

      droneOsc.connect(droneFilter);
      droneFilter.connect(droneGain);
      droneGain.connect(ctx.destination);
      
      droneOsc.start();
      this.backgroundDroneNode = { osc: droneOsc, gain: droneGain };

      const playStep = () => {
        if (!this.isPlayingMusic || !this.ctx) return;
        const now = this.ctx.currentTime;

        // --- 1. KICK DRUM BEAT ---
        // Play on steps 0, 4, 8, 12 (standard 4/4 floor)
        if (this.currentStep % 4 === 0) {
          const kickOsc = ctx.createOscillator();
          const kickGain = ctx.createGain();
          
          kickOsc.frequency.setValueAtTime(120, now);
          kickOsc.frequency.exponentialRampToValueAtTime(45, now + 0.15);

          kickGain.gain.setValueAtTime(0.24, now);
          kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

          kickOsc.connect(kickGain);
          kickGain.connect(ctx.destination);
          
          kickOsc.start(now);
          kickOsc.stop(now + 0.2);
        }

        // --- 2. HI-HAT RHYTHM ---
        // Play on steps 2, 6, 10, 14 (classic offbeats)
        if (this.currentStep % 4 === 2) {
          const hatSource = ctx.createBufferSource();
          hatSource.buffer = this.createNoiseBuffer();

          const hatFilter = ctx.createBiquadFilter();
          hatFilter.type = 'highpass';
          hatFilter.frequency.setValueAtTime(8000, now);

          const hatGain = ctx.createGain();
          hatGain.gain.setValueAtTime(0.035, now);
          hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

          hatSource.connect(hatFilter);
          hatFilter.connect(hatGain);
          hatGain.connect(ctx.destination);

          hatSource.start(now);
          hatSource.stop(now + 0.05);
        }

        // --- 3. DYNAMIC MELODY ARPEGGIATOR ---
        // Play G-Minor or desert Phrygian melody notes on each step
        const noteFreq = pattern[this.currentStep];
        const synthOsc = ctx.createOscillator();
        const synthGain = ctx.createGain();
        const synthFilter = ctx.createBiquadFilter();

        synthOsc.type = arena === 'space' ? 'sawtooth' : 'triangle';
        synthOsc.frequency.setValueAtTime(noteFreq, now);

        synthFilter.type = 'lowpass';
        // Elegant cyber filter sweep
        synthFilter.frequency.setValueAtTime(arena === 'space' ? 700 : 500, now);
        synthFilter.frequency.exponentialRampToValueAtTime(160, now + 0.2);

        synthGain.gain.setValueAtTime(0.065, now);
        synthGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        synthOsc.connect(synthFilter);
        synthFilter.connect(synthGain);
        synthGain.connect(ctx.destination);

        synthOsc.start(now);
        synthOsc.stop(now + 0.24);

        this.currentStep = (this.currentStep + 1) % 16;
      };

      playStep();
      this.musicInterval = setInterval(playStep, stepTime * 1000);

    } catch (e) {
      console.warn('Procedural sequencer failed to start:', e);
    }
  }

  public stopBackgroundMusic() {
    this.isPlayingMusic = false;
    
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }

    if (this.backgroundDroneNode) {
      try {
        const { osc, gain } = this.backgroundDroneNode;
        const now = this.ctx?.currentTime || 0;

        if (this.ctx) {
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(gain.gain.value, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

          setTimeout(() => {
            try {
              osc.stop();
            } catch (e) {}
          }, 400);
        } else {
          osc.stop();
        }
      } catch (e) {}
      this.backgroundDroneNode = null;
    }
  }
}

export const audioSynth = new SoundSynthesizer();

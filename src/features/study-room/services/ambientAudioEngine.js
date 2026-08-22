export class AmbientEngine {
  constructor() {
    this.ctx = null;
    this.nodes = {};
    this.volumes = {};
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playChime() {
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const osc3 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 1.2); // C6

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(659.25, now); // E5
      osc2.frequency.exponentialRampToValueAtTime(1318.5, now + 1.2);

      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(783.99, now); // G5
      osc3.frequency.exponentialRampToValueAtTime(1567.98, now + 1.2);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.8);

      osc1.connect(gain);
      osc2.connect(gain);
      osc3.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc3.start(now);
      osc1.stop(now + 2.8);
      osc2.stop(now + 2.8);
      osc3.stop(now + 2.8);
    } catch (e) {
      console.warn('Chime error:', e);
    }
  }

  // Çok hafif, tatlı ve rahatsız etmeyen soru başı süre hatırlatma sesi (Soft Ding)
  playSoftDing() {
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.05); // E6
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.5);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.65);
    } catch (e) {
      console.warn('Soft ding error:', e);
    }
  }

  setSoundVolume(type, vol) {
    this.init();
    if (!this.ctx) return;
    this.volumes[type] = vol;

    if (vol <= 0) {
      this.stopSound(type);
      return;
    }

    if (!this.nodes[type]) {
      this.startSound(type);
    }

    if (this.nodes[type]?.gain) {
      this.nodes[type].gain.gain.setTargetAtTime(vol * 0.25, this.ctx.currentTime, 0.1);
    }
  }

  startSound(type) {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.connect(this.ctx.destination);

      if (type === 'rain') {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          data[i] = (b0 + b1 + b2 + white * 0.05) * 0.1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, now);

        noise.connect(filter);
        filter.connect(gain);
        noise.start(0);
        this.nodes[type] = { source: noise, gain, filter };
      } else if (type === 'waves') {
        const bufferSize = this.ctx.sampleRate * 3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.2;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, now);

        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(0.15, now);
        lfoGain.gain.setValueAtTime(300, now);
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start(0);

        noise.connect(filter);
        filter.connect(gain);
        noise.start(0);
        this.nodes[type] = { source: noise, gain, lfo };
      } else if (type === 'binaural') {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(432, now);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(442, now);

        osc1.connect(gain);
        osc2.connect(gain);
        osc1.start(0);
        osc2.start(0);
        this.nodes[type] = { sources: [osc1, osc2], gain };
      } else if (type === 'fire') {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          const r = Math.random();
          data[i] = r > 0.96 ? (Math.random() * 2 - 1) * 0.7 : (Math.random() * 2 - 1) * 0.03;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);

        noise.connect(filter);
        filter.connect(gain);
        noise.start(0);
        this.nodes[type] = { source: noise, gain };
      } else if (type === 'whitenoise') {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1500, now);

        noise.connect(filter);
        filter.connect(gain);
        noise.start(0);
        this.nodes[type] = { source: noise, gain };
      }
    } catch (e) {
      console.warn('Start sound error:', e);
    }
  }

  stopSound(type) {
    if (this.nodes[type]) {
      try {
        if (this.nodes[type].source) this.nodes[type].source.stop();
        if (this.nodes[type].sources) this.nodes[type].sources.forEach(s => s.stop());
        if (this.nodes[type].lfo) this.nodes[type].lfo.stop();
      } catch (e) {}
      delete this.nodes[type];
    }
  }

  stopAll() {
    Object.keys(this.nodes).forEach(k => this.stopSound(k));
  }
}

const ambientAudio = new AmbientEngine();

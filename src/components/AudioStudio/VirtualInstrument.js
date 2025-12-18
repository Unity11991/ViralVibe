export class VirtualInstrument {
    constructor(audioContext) {
        this.ctx = audioContext;
        this.output = this.ctx.createGain();
        this.activeNotes = new Map(); // Map<noteId, { osc, env }>

        // Default Patch
        this.patch = {
            waveform: 'sawtooth', // sine, square, sawtooth, triangle
            attack: 0.01,
            decay: 0.1,
            sustain: 0.5,
            release: 0.2,
            filterCutoff: 2000,
            filterRes: 0
        };
    }

    connect(destination) {
        this.output.connect(destination);
    }

    // Convert MIDI Note Number to Frequency
    midiToFreq(note) {
        return 440 * Math.pow(2, (note - 69) / 12);
    }

    playNote(note, time, duration, velocity = 0.7) {
        const freq = this.midiToFreq(note);
        const t = time;

        // Oscillator
        const osc = this.ctx.createOscillator();
        osc.type = this.patch.waveform;
        osc.frequency.setValueAtTime(freq, t);

        // Filter (Lowpass)
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(this.patch.filterCutoff, t);
        filter.Q.value = this.patch.filterRes;

        // Envelope (VCA)
        const env = this.ctx.createGain();
        env.gain.setValueAtTime(0, t);

        // ADSR
        const atk = this.patch.attack;
        const dec = this.patch.decay;
        const sus = this.patch.sustain;
        const rel = this.patch.release;

        // Attack
        env.gain.linearRampToValueAtTime(velocity, t + atk);
        // Decay to Sustain
        env.gain.exponentialRampToValueAtTime(velocity * sus, t + atk + dec);

        // Release (scheduled at end of duration)
        const releaseStart = t + duration;
        env.gain.setValueAtTime(velocity * sus, releaseStart);
        env.gain.exponentialRampToValueAtTime(0.001, releaseStart + rel);

        // Connect Graph
        osc.connect(filter);
        filter.connect(env);
        env.connect(this.output);

        // Start/Stop
        osc.start(t);
        osc.stop(releaseStart + rel + 0.1); // Stop after release

        // Store active note (optional, for manual stop if needed)
        // For sequenced notes, we schedule stop immediately.
        // For live playing, we'd need to track noteOff.
    }

    // For live keyboard playing (Note On)
    noteOn(note, velocity = 0.7) {
        const t = this.ctx.currentTime;
        const freq = this.midiToFreq(note);

        const osc = this.ctx.createOscillator();
        osc.type = this.patch.waveform;
        osc.frequency.setValueAtTime(freq, t);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = this.patch.filterCutoff;

        const env = this.ctx.createGain();
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(velocity, t + this.patch.attack);
        env.gain.exponentialRampToValueAtTime(velocity * this.patch.sustain, t + this.patch.attack + this.patch.decay);

        osc.connect(filter);
        filter.connect(env);
        env.connect(this.output);

        osc.start(t);

        this.activeNotes.set(note, { osc, env, filter });
    }

    // For live keyboard playing (Note Off)
    noteOff(note) {
        const active = this.activeNotes.get(note);
        if (active) {
            const t = this.ctx.currentTime;
            const { osc, env } = active;

            // Release phase
            env.gain.cancelScheduledValues(t);
            env.gain.setValueAtTime(env.gain.value, t);
            env.gain.exponentialRampToValueAtTime(0.001, t + this.patch.release);

            osc.stop(t + this.patch.release + 0.1);
            this.activeNotes.delete(note);
        }
    }
}

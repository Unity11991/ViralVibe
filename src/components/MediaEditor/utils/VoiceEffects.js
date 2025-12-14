/**
 * Utility to manage Voice Effects using Web Audio API
 */
class VoiceEffectsManager {
    constructor() {
        this.ctx = null;
        this.sources = new Map(); // Map<Element, { source, input, output, currentEffect }>
    }

    getContext() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    }

    /**
     * Connect a media element to the audio context.
     * @param {HTMLMediaElement} element 
     * @returns {Object} The connection node info
     */
    connect(element) {
        if (this.sources.has(element)) {
            return this.sources.get(element);
        }

        const ctx = this.getContext();

        // Create Source
        const source = ctx.createMediaElementSource(element);

        // Create Input/Output Gain Nodes (for easy routing)
        const input = ctx.createGain();
        const output = ctx.createGain();

        // Connect default chain (bypass)
        source.connect(input);
        input.connect(output);
        output.connect(ctx.destination);

        const connection = {
            source,
            input,
            output,
            effects: [], // Store effect nodes to disconnect later
            currentEffect: null
        };

        this.sources.set(element, connection);
        return connection;
    }

    /**
     * Apply an effect to the connected element.
     * @param {HTMLMediaElement} element 
     * @param {string} effectType 'none', 'chipmunk', 'monster', 'robot', 'echo', 'telephone'
     */
    applyEffect(element, effectType) {
        const conn = this.connect(element);

        // Optimize: Don't re-apply if it's the same effect
        if (conn.currentEffect === effectType) return;
        conn.currentEffect = effectType;

        const ctx = this.getContext();

        // 1. Cleanup previous effects
        conn.input.disconnect();
        conn.effects.forEach(node => {
            try { node.disconnect(); } catch (e) { }
        });
        conn.effects = [];

        // 2. Build new chain based on effect
        // console.log(`Applying effect: ${effectType} to`, element);

        switch (effectType) {
            case 'robot':
                // Ring Modulator
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = 50; // 50Hz Ring Mod

                const ringGain = ctx.createGain();
                ringGain.gain.value = 0.0;

                const robotGain = ctx.createGain();
                robotGain.gain.value = 1.0;

                // Modulate gain of the signal with oscillator
                osc.connect(robotGain.gain);
                conn.input.connect(robotGain);
                robotGain.connect(conn.output);

                osc.start();
                conn.effects.push(osc, robotGain, ringGain);
                break;

            case 'echo':
                const delay = ctx.createDelay(1.0);
                delay.delayTime.value = 0.3;

                const feedback = ctx.createGain();
                feedback.gain.value = 0.4;

                const echoFilter = ctx.createBiquadFilter();
                echoFilter.type = 'lowpass';
                echoFilter.frequency.value = 2000;

                conn.input.connect(conn.output); // Dry
                conn.input.connect(delay);
                delay.connect(echoFilter);
                echoFilter.connect(feedback);
                feedback.connect(delay);
                delay.connect(conn.output);

                conn.effects.push(delay, feedback, echoFilter);
                break;

            case 'telephone':
                const lowpass = ctx.createBiquadFilter();
                lowpass.type = 'lowpass';
                lowpass.frequency.value = 2000;

                const highpass = ctx.createBiquadFilter();
                highpass.type = 'highpass';
                highpass.frequency.value = 500;

                const compressor = ctx.createDynamicsCompressor();

                conn.input.connect(lowpass);
                lowpass.connect(highpass);
                highpass.connect(compressor);
                compressor.connect(conn.output);

                conn.effects.push(lowpass, highpass, compressor);
                break;

            case 'chipmunk':
                // Emulate "Helium" sound with formant shifting via EQ
                // Remove bass completely
                const chipHighPass = ctx.createBiquadFilter();
                chipHighPass.type = 'highpass';
                chipHighPass.frequency.value = 500;

                // Boost "squeaky" frequencies
                const chipPeaking = ctx.createBiquadFilter();
                chipPeaking.type = 'peaking';
                chipPeaking.frequency.value = 2500;
                chipPeaking.Q.value = 1;
                chipPeaking.gain.value = 20;

                // Graph
                conn.input.connect(chipHighPass);
                chipHighPass.connect(chipPeaking);
                chipPeaking.connect(conn.output);

                conn.effects.push(chipHighPass, chipPeaking);
                break;

            case 'monster':
                // Deep distorted growl
                // 1. Boost bass massively
                const monsterLowShelf = ctx.createBiquadFilter();
                monsterLowShelf.type = 'lowshelf';
                monsterLowShelf.frequency.value = 200;
                monsterLowShelf.gain.value = 25;

                // 2. Cut high end
                const monsterLowPass = ctx.createBiquadFilter();
                monsterLowPass.type = 'lowpass';
                monsterLowPass.frequency.value = 800;

                // 3. Ring Mod for "Growl" (Sub-harmonic generation)
                const growlOsc = ctx.createOscillator();
                growlOsc.type = 'sawtooth'; // Gritty
                growlOsc.frequency.value = 30; // 30Hz sub-bass growl

                // Add parallel growl layer
                const growlPathGain = ctx.createGain();
                growlPathGain.gain.value = 0; // Controlled by Osc

                conn.input.connect(growlPathGain);
                growlPathGain.connect(conn.output);

                // Connect Osc to Gain.gain
                growlOsc.connect(growlPathGain.gain);
                growlOsc.start();

                // Basic Graph for dry(ish) signal
                conn.input.connect(monsterLowShelf);
                monsterLowShelf.connect(monsterLowPass);
                monsterLowPass.connect(conn.output);

                conn.effects.push(monsterLowShelf, monsterLowPass, growlOsc, growlPathGain);
                break;

            default: // None
                conn.input.connect(conn.output);
                break;
        }
    }

    disconnect(element) {
        if (this.sources.has(element)) {
            const conn = this.sources.get(element);
            conn.source.disconnect();
            conn.input.disconnect();
            conn.output.disconnect();
            conn.effects.forEach(e => {
                if (e.stop) e.stop();
                e.disconnect();
            });
            this.sources.delete(element);
        }
    }
}

export const voiceEffects = new VoiceEffectsManager();

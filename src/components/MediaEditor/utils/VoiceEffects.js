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
        const ctx = this.getContext();

        // 1. Cleanup previous effects
        conn.input.disconnect();
        conn.effects.forEach(node => {
            try { node.disconnect(); } catch (e) { }
        });
        conn.effects = [];

        // 2. Build new chain based on effect
        console.log(`Applying effect: ${effectType} to`, element);

        switch (effectType) {
            case 'robot':
                // Ring Modulator
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = 50; // 50Hz Ring Mod

                const ringGain = ctx.createGain();
                ringGain.gain.value = 0.0; // AM modulation depth? 
                // Actually standard Ring Mod: Source * Carrier
                // Web Audio: connect Source to Gain.gain, connect Osc to Gain? No.
                // It's Source -> GainNode. GainNode.gain controlled by Osc.

                const robotGain = ctx.createGain();
                robotGain.gain.value = 1.0;

                // Modulate gain of the signal with oscillator
                // Workaround for Ring Mod in simple Web Audio:
                // Source -> GainNode
                // Oscillator -> GainNode.gain

                // Better Robot: Delay + Feedback + some modulation
                // Let's stick to simple Ring Mod style
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

                // Graph: Input -> Output (Dry)
                //       Input -> Delay -> Filter -> Feedback -> Delay
                //       Delay -> Output (Wet)

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
                // Pitch shift is hard without libraries. 
                // We will rely on playbackRate (speed) change in the main component.
                // Just add a EQ to emphasize "smallness"
                const chipFilter = ctx.createBiquadFilter();
                chipFilter.type = 'highshelf';
                chipFilter.frequency.value = 3000;
                chipFilter.gain.value = 10;

                conn.input.connect(chipFilter);
                chipFilter.connect(conn.output);
                conn.effects.push(chipFilter);
                break;

            case 'monster':
                // Deep voice EQ
                const monsterFilter = ctx.createBiquadFilter();
                monsterFilter.type = 'lowshelf';
                monsterFilter.frequency.value = 200;
                monsterFilter.gain.value = 15;

                conn.input.connect(monsterFilter);
                monsterFilter.connect(conn.output);
                conn.effects.push(monsterFilter);
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

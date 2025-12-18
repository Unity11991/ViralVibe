import { VirtualInstrument } from './VirtualInstrument';

// Helper to write string to DataView
const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
};

// Encode AudioBuffer to WAV Blob
const bufferToWav = (buffer) => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArr = new ArrayBuffer(length);
    const view = new DataView(bufferArr);
    const channels = [];
    let i;
    let sample;
    let offset = 0;
    let pos = 0;

    // Write WAV Header
    writeString(view, pos, 'RIFF'); pos += 4;
    view.setUint32(pos, length - 8, true); pos += 4;
    writeString(view, pos, 'WAVE'); pos += 4;
    writeString(view, pos, 'fmt '); pos += 4;
    view.setUint32(pos, 16, true); pos += 4;
    view.setUint16(pos, 1, true); pos += 2;
    view.setUint16(pos, numOfChan, true); pos += 2;
    view.setUint32(pos, buffer.sampleRate, true); pos += 4;
    view.setUint32(pos, buffer.sampleRate * 2 * numOfChan, true); pos += 4;
    view.setUint16(pos, numOfChan * 2, true); pos += 2;
    view.setUint16(pos, 16, true); pos += 2;
    writeString(view, pos, 'data'); pos += 4;
    view.setUint32(pos, length - pos - 4, true); pos += 4;

    // Interleave channels
    for (i = 0; i < buffer.numberOfChannels; i++) {
        channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset])); // Clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // Scale to 16-bit PCM
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }

    return new Blob([view], { type: 'audio/wav' });
};

// Main Render Function
export const renderAudio = async (tracks, duration) => {
    // 1. Create Offline Context
    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

    // 2. Reconstruct Graph
    // We need to replicate the logic from AudioStudio.jsx togglePlayback
    // Ideally, this logic should be shared, but for now we duplicate for isolation.

    // Main Mix Bus
    const masterGain = offlineCtx.createGain();
    masterGain.connect(offlineCtx.destination);

    // Process Tracks
    tracks.forEach(track => {
        if (track.muted) return;

        // Track Bus
        const trackGain = offlineCtx.createGain();
        trackGain.gain.value = track.volume;
        trackGain.connect(masterGain);

        // Effects Chain (Simplified for Export - Full chain would require replicating all nodes)
        // For MVP Export, let's implement Volume and basic EQ/Comp if possible.
        // Replicating the FULL chain is complex because we need to set params.
        // Let's assume we apply the same effects.

        const effects = track.effects;

        // Input Node (Start of chain)
        let inputNode = offlineCtx.createGain(); // Placeholder input

        // EQ
        const eqLow = offlineCtx.createBiquadFilter();
        eqLow.type = 'lowshelf';
        eqLow.frequency.value = 320;
        eqLow.gain.value = effects.eq.low;

        const eqMid = offlineCtx.createBiquadFilter();
        eqMid.type = 'peaking';
        eqMid.frequency.value = 1000;
        eqMid.gain.value = effects.eq.mid;

        const eqHigh = offlineCtx.createBiquadFilter();
        eqHigh.type = 'highshelf';
        eqHigh.frequency.value = 3200;
        eqHigh.gain.value = effects.eq.high;

        // Compressor
        const compressor = offlineCtx.createDynamicsCompressor();
        if (effects.compressor.active) {
            compressor.threshold.value = effects.compressor.threshold;
            compressor.ratio.value = effects.compressor.ratio;
        }

        // Chain Connection
        inputNode.connect(eqLow);
        eqLow.connect(eqMid);
        eqMid.connect(eqHigh);
        eqHigh.connect(compressor);
        compressor.connect(trackGain);

        // Sources
        if (track.type === 'midi') {
            // MIDI Rendering
            const inst = new VirtualInstrument(offlineCtx);
            inst.connect(inputNode);

            track.clips.forEach(clip => {
                clip.notes.forEach(note => {
                    const noteTime = clip.startTime + note.startTime;
                    if (noteTime < duration) {
                        inst.playNote(note.pitch, noteTime, note.duration, note.velocity);
                    }
                });
            });
        } else {
            // Audio Clips
            track.clips.forEach(clip => {
                if (!clip.buffer) return;

                const source = offlineCtx.createBufferSource();
                source.buffer = clip.buffer;
                source.playbackRate.value = clip.speed || 1.0;
                source.detune.value = clip.pitch || 0;

                // Scheduling
                const startTime = clip.startTime;
                if (startTime < duration) {
                    source.connect(inputNode);
                    source.start(startTime, clip.offset || 0, clip.duration);
                }
            });
        }
    });

    // 3. Render
    const renderedBuffer = await offlineCtx.startRendering();

    // 4. Encode
    const wavBlob = bufferToWav(renderedBuffer);
    return wavBlob;
};

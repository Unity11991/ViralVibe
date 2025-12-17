// Helper to render Spectrogram
export const renderSpectrogram = async (buffer, width, height) => {
    const offlineCtx = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;

    // Analyzer configuration
    const analyser = offlineCtx.createAnalyser();
    analyser.fftSize = 1024; // Resolution
    analyser.smoothingTimeConstant = 0;

    source.connect(analyser);
    source.start(0);

    // We can't step-render easily with OfflineContext as it speeds through.
    // Instead, we manually iterate the channel data and perform FFT logic 
    // OR we use a separate rendering approach.
    // simpler approach for Web: 
    // Use `web-audio-api` script processor? Deprecated.
    // Use raw math on Float32Array channel data.

    /* 
       Basic JS FFT Implementation for Spectrogram 
       (Simplified for size constraint, robust enough for visual)
    */

    const channelData = buffer.getChannelData(0);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Fill Black
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);

    // Params
    const step = Math.floor(channelData.length / width);
    const fftSize = 256; // Low res for speed

    // We will cheat slightly: Mapping Amplitude/Frequency crudely directly from time domain is hard.
    // We need real FFT.
    // Let's use a very simplified approach:
    // "Zero Crossing Rate" for color/frequency approximation + Amplitude for brightness? 
    // No, users want to see "phone ringing" (distinct high freq).

    // Let's assume we can't implement full FFT library here in one go.
    // We'll create a "Fake" spectrogram that visualizes amplitude (brightness) and local variation (color).
    // High variation (high freq) -> Blue/Purple. Low variation (bass) -> Red/Orange.
    // This provides a "Spectral-like" view.

    // Real implementation requires importing an FFT lib or writing 50 lines of FFT code.
    // I will write a minimal DFT for columns.

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    for (let x = 0; x < width; x++) {
        const start = x * step;
        const slice = channelData.slice(start, start + fftSize);

        // Simple Real-DFT for a few bins (Height rows)
        // We only calculate e.g. 50 bins and stretch.
        const bins = new Float32Array(height);

        for (let k = 0; k < height; k++) {
            // Frequency k
            let real = 0;
            let imag = 0;
            // Sample fewer points for speed
            for (let n = 0; n < slice.length; n += 4) {
                const angle = -2 * Math.PI * k * n / slice.length;
                real += slice[n] * Math.cos(angle);
                imag += slice[n] * Math.sin(angle);
            }
            const magnitude = Math.sqrt(real * real + imag * imag);
            bins[k] = magnitude; // Normally needs log scale
        }

        // Draw column
        for (let y = 0; y < height; y++) {
            const val = Math.min(255, bins[height - 1 - y] * 10); // Check orientation
            const idx = (x + y * width) * 4;

            // Heatmap Color: 
            // Low (Blue), Mid (Green), High (Red)
            // Here 'val' is intensity.
            // We want Frequency (y) to map to position, Intensity (val) to brightness/color.

            // Standard Spectrogram:
            // X = time, Y = freq. Color = Intensity.

            const intensity = val;

            // Color mapping based on intensity
            data[idx] = intensity; // R
            data[idx + 1] = intensity * 0.5; // G
            data[idx + 2] = 255 - intensity; // B
            data[idx + 3] = 255; // Alpha
        }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL();
};

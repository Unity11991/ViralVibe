
/**
 * Renders a spectrogram for a given AudioBuffer.
 * @param {AudioBuffer} buffer - The audio buffer to analyze.
 * @param {number} width - Target width of the image.
 * @param {number} height - Target height of the image.
 * @returns {Promise<string>} - Resolves with a Data URL of the generated image.
 */
export const renderSpectrogram = async (buffer, width, height) => {
    if (!buffer) return null;

    const offlineCtx = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;

    const analyser = offlineCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0;

    // Use ScriptProcessor to capture FFT data
    // BufferSize 2048 means we get a callback every ~46ms (at 44.1k)
    const bufferSize = 2048;
    const scriptProcessor = offlineCtx.createScriptProcessor(bufferSize, 1, 1);

    const fftData = [];

    scriptProcessor.onaudioprocess = () => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        fftData.push(data);
    };

    source.connect(analyser);
    analyser.connect(scriptProcessor);
    scriptProcessor.connect(offlineCtx.destination);

    source.start(0);

    await offlineCtx.startRendering();

    // Draw to Canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Draw Background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    if (fftData.length === 0) return canvas.toDataURL();

    // Render
    // We have fftData.length columns (time) and fftData[0].length rows (frequency)
    // We need to map this to width x height

    const timeSteps = fftData.length;
    const binCount = fftData[0].length;

    // Create ImageData
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    for (let x = 0; x < width; x++) {
        // Map x to time index
        const timeIndex = Math.floor((x / width) * timeSteps);
        const spectrum = fftData[Math.min(timeIndex, timeSteps - 1)];

        for (let y = 0; y < height; y++) {
            // Map y to frequency bin
            // y=0 is top (high freq), y=height is bottom (low freq)
            // spectrum[0] is low freq.
            // So map (height - 1 - y) to bin index.

            // Linear scale
            const binIndex = Math.floor(((height - 1 - y) / height) * binCount);

            // Log scale (optional, better for audio)
            // const binIndex = Math.floor(binCount * (1 - Math.log(y + 1) / Math.log(height + 1))); 

            const value = spectrum[Math.min(binIndex, binCount - 1)];

            // Color Map (Heatmap: Blue -> Green -> Red)
            let r = 0, g = 0, b = 0;
            if (value < 5) {
                // Silence / Noise floor
                r = 0; g = 0; b = 0;
            } else if (value < 128) {
                // Blue to Green
                b = 255 - (value * 2);
                g = value * 2;
            } else {
                // Green to Red
                g = 255 - ((value - 128) * 2);
                r = (value - 128) * 2;
            }

            const pixelIndex = (y * width + x) * 4;
            data[pixelIndex] = r;
            data[pixelIndex + 1] = g;
            data[pixelIndex + 2] = b;
            data[pixelIndex + 3] = 255; // Alpha
        }
    }

    ctx.putImageData(imgData, 0, 0);

    return canvas.toDataURL();
};

/**
 * Video Encoder Utility
 * Wraps WebCodecs VideoEncoder and mp4-muxer for high-quality offline rendering.
 */
import * as Mp4Muxer from 'mp4-muxer';

export class VideoExporter {
    constructor(options) {
        this.width = options.width;
        this.height = options.height;
        this.fps = options.fps || 30;
        this.bitrate = options.bitrate || 5000000; // 5 Mbps default
        this.audioTrack = options.audioTrack || null;

        this.muxer = null;
        this.videoEncoder = null;
        this.audioEncoder = null; // Future expansion

        this.init();
    }

    init() {
        // 1. Initialize Muxer
        this.muxer = new Mp4Muxer.Muxer({
            target: new Mp4Muxer.ArrayBufferTarget(),
            video: {
                codec: 'avc', // H.264
                width: this.width,
                height: this.height
            },
            audio: {
                codec: 'aac',
                numberOfChannels: 2,
                sampleRate: 48000
            },
            fastStart: 'in-memory' // Optimize for web playback
        });

        // 2. Initialize Video Encoder
        this.videoEncoder = new VideoEncoder({
            output: (chunk, meta) => this.muxer.addVideoChunk(chunk, meta),
            error: (e) => {
                console.error('VideoEncoder error:', e);
                this.errMsg = e.message;
            }
        });

        // Determine Codec Level based on resolution
        // Level 4.2 (avc1.4d002a) supports up to 2,228,224 pixels (approx 2048x1080)
        // Level 5.1 (avc1.4d0033) supports up to 8,912,896 pixels (approx 4096x2160)
        // We use Level 5.1 for anything larger than standard HD to support 4K.
        const pixelCount = this.width * this.height;
        const is4K = pixelCount > 2228224;
        const codecString = is4K ? 'avc1.4d0033' : 'avc1.4d002a';

        this.videoEncoder.configure({
            codec: codecString,
            width: this.width,
            height: this.height,
            bitrate: this.bitrate,
            framerate: this.fps
        });

        // 3. Initialize Audio Encoder
        this.audioEncoder = new AudioEncoder({
            output: (chunk, meta) => this.muxer.addAudioChunk(chunk, meta),
            error: (e) => {
                console.error('AudioEncoder error:', e);
                this.errMsg = e.message;
            }
        });

        this.audioEncoder.configure({
            codec: 'mp4a.40.2', // AAC LC
            numberOfChannels: 2,
            sampleRate: 48000,
            bitrate: 128000
        });
    }

    /**
     * Encode a single video frame
     * @param {HTMLCanvasElement} canvas - Canvas containing the frame
     * @param {number} frameNumber - Current frame number
     * @param {number} durationInSeconds - Duration of the frame (usually 1/fps)
     */
    async encodeFrame(canvas, frameNumber) {
        if (this.videoEncoder.state === 'closed' || this.errMsg) {
            throw new Error(this.errMsg || 'VideoEncoder is closed');
        }

        // Calculate timestamp in microseconds
        const timestamp = (frameNumber / this.fps) * 1_000_000;
        const duration = (1 / this.fps) * 1_000_000;

        // Create VideoFrame from canvas
        const frame = new VideoFrame(canvas, {
            timestamp: timestamp,
            duration: duration
        });

        // Encode
        // Keyframe every 2 seconds (2 * fps)
        const keyFrame = frameNumber % (this.fps * 2) === 0;
        this.videoEncoder.encode(frame, { keyFrame });

        frame.close();
    }

    /**
     * Encode the entire audio buffer
     * @param {AudioBuffer} audioBuffer 
     */
    async encodeAudio(audioBuffer) {
        if (this.audioEncoder.state === 'closed') return;

        // Process in chunks (e.g., 1 second) to assume manageable memory usage
        // actually for WebCodecs we create AudioData. 
        // 1s = 48000 samples.
        const channels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length;
        const sampleRate = audioBuffer.sampleRate;

        // We need to interleave the data for AudioData 'f32' format? 
        // Or we can use "planar"? "f32-planar" is supported in Chrome.

        // Let's create one AudioData for the whole thing if it's short, but safer to chunk.
        // Let's do 1 second chunks.
        const chunkSize = sampleRate; // 1 second

        for (let frameBy = 0; frameBy < length; frameBy += chunkSize) {
            const end = Math.min(frameBy + chunkSize, length);
            const frameLength = end - frameBy;

            // Prepare timestamps (microseconds)
            const timestamp = (frameBy / sampleRate) * 1_000_000;
            const duration = (frameLength / sampleRate) * 1_000_000;

            // Create buffer for this chunk (Planar F32)
            // AudioData expects a single ArrayBuffer containing all planes for planar.
            const sizePerChannel = frameLength * 4; // float32 = 4 bytes
            const totalSize = sizePerChannel * channels;
            const buffer = new Float32Array(totalSize / 4);

            // Copy data
            for (let c = 0; c < channels; c++) {
                const channelData = audioBuffer.getChannelData(c);
                // Copy slice
                const slice = channelData.subarray(frameBy, end);
                // Place in planar layout: [Channel 0][Channel 1]...
                buffer.set(slice, c * frameLength);
            }

            const audioData = new AudioData({
                format: 'f32-planar',
                sampleRate: sampleRate,
                numberOfFrames: frameLength,
                numberOfChannels: channels,
                timestamp: timestamp,
                data: buffer
            });

            this.audioEncoder.encode(audioData);
            audioData.close();
        }

        // Finish
        await this.audioEncoder.flush();
    }

    /**
     * Finalize the export and release resources
     * @returns {Blob} The final MP4 blob
     */
    async stop() {
        await this.videoEncoder.flush();
        // audio flush handled in encodeAudio but good to ensure
        if (this.audioEncoder.state !== 'closed') {
            await this.audioEncoder.flush();
        }

        this.muxer.finalize();
        /* ... rest of function ... */
        const buffer = this.muxer.target.buffer;
        return new Blob([buffer], { type: 'video/mp4' });
    }
}

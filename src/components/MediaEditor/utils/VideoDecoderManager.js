import * as MP4Box from 'mp4box';

/**
 * Manages video decoding using WebCodecs and MP4Box.
 * Replaces the slow HTML5 <video> element seeking mechanism.
 */
class VideoDecoderManager {
    constructor(url) {
        this.url = url;
        this.mp4boxfile = MP4Box.createFile();
        this.decoder = null;
        this.frames = []; // Buffer for decoded VideoFrames
        this.pendingResolves = []; // Queue of requests waiting for frames

        this.isReady = false;
        this.trackInfo = null;
        this.description = null; // AVCC/HVCC content for decoder config

        this.demuxingStarted = false;

        // MP4Box Callbacks
        this.mp4boxfile.onReady = this.onReady.bind(this);
        this.mp4boxfile.onSamples = this.onSamples.bind(this);
    }

    async prepare() {
        if (this.isReady) return;

        return new Promise((resolve, reject) => {
            fetch(this.url)
                .then(response => {
                    if (!response.ok) throw new Error(`Failed to fetch ${this.url}`);
                    return response.arrayBuffer();
                })
                .then(arrayBuffer => {
                    // MP4Box requires arrayBuffer to be passed with an offset
                    // Since we fetch the whole file, we pass the buffer at offset 0
                    arrayBuffer.fileStart = 0;
                    this.mp4boxfile.appendBuffer(arrayBuffer);
                    this.mp4boxfile.flush();

                    // Wait for onReady to trigger
                    const checkReady = setInterval(() => {
                        if (this.isReady) {
                            clearInterval(checkReady);
                            resolve();
                        }
                    }, 50);
                })
                .catch(err => {
                    console.error("VideoDecoderManager Init Error:", err);
                    reject(err);
                });
        });
    }

    onReady(info) {
        const track = info.videoTracks[0];
        if (!track) {
            console.error("No video track found");
            return;
        }

        this.trackInfo = track;

        // Extract Description for Decoder Config (AVCC/HVCC)
        this.mp4boxfile.setExtractionOptions(track.id, 'user', { nbSamples: 1000 }); // Extract all samples? or chunked.

        // Configuration for VideoDecoder
        // We need to build the description buffer
        // Note: For simplicity in V1, we assume AVC (H.264)
        const avccBox = this.mp4boxfile.moov.traks.find(t => t.tkhd.track_id === track.id).mdia.minf.stbl.stsd.entries[0].avcC;

        if (!avccBox) {
            console.warn("Could not find avcC box. Might not be standard H.264");
            return;
        }

        // Create Video Decoder
        this.decoder = new VideoDecoder({
            output: this.onFrameDecoded.bind(this),
            error: (e) => console.error("VideoDecoder Error:", e)
        });

        // Convert MP4Box avcC to specific description format if needed
        // But usually we can just construct the config.

        // Actually, getting the raw description buffer from MP4Box is tricky.
        // It's often easier to let MP4Box provide sps/pps.
        // Let's use a simpler config if possible, or construct it.

        // A robust way to get description is:
        const stream = new MP4Box.DataStream(undefined, 0, MP4Box.DataStream.BIG_ENDIAN);
        avccBox.write(stream);
        const buffer = new Uint8Array(stream.buffer.slice(8)); // Skip box header (size + type)

        this.decoder.configure({
            codec: track.codec,
            codedWidth: track.video.width,
            codedHeight: track.video.height,
            description: buffer
        });

        this.startDemuxing();
        this.isReady = true;
    }

    startDemuxing() {
        if (this.demuxingStarted) return;
        this.demuxingStarted = true;
        this.mp4boxfile.start(); // Triggers onSamples
    }

    onSamples(track_id, user, samples) {
        if (track_id !== this.trackInfo.id) return;

        for (const sample of samples) {
            const type = sample.is_sync ? "key" : "delta";

            const chunk = new EncodedVideoChunk({
                type: type,
                timestamp: (1e6 * sample.cts) / sample.timescale,
                duration: (1e6 * sample.duration) / sample.timescale,
                data: sample.data // This is the raw bytes
            });

            this.decoder.decode(chunk);
        }
    }

    onFrameDecoded(frame) {
        this.frames.push(frame);

        // Sort frames by timestamp to ensure order (decoding implies display order usually, but checking doesn't hurt)
        this.frames.sort((a, b) => a.timestamp - b.timestamp);

        this.processPendingResolves();
    }

    processPendingResolves() {
        if (this.pendingResolves.length === 0) return;

        // Check if we have the frames needed
        // For now, we assume linear export, so we look for exact or closest frame?
        // Since export is frame-exact iteration, we need robust matching

        // For each pending request, try to find a frame
        // Loop backwards so we can splice safely? No, standard loop.

        const remainingResolves = [];

        for (const req of this.pendingResolves) {
            const { time, resolve } = req;
            const timeMicros = time * 1e6;

            // Find frame with closest timestamp (within tolerance)
            // Tolerance: 1/60th of a second approx 16ms -> 16000 micros
            const tolerance = 30000;

            const frameIndex = this.frames.findIndex(f => Math.abs(f.timestamp - timeMicros) < tolerance);

            if (frameIndex !== -1) {
                const frame = this.frames[frameIndex];

                // Clone the frame because we might reuse it for "holding" if strictly needed, 
                // but usually we consume it.
                // However, VideoDecoder output frames must be closed.
                // We resolve the frame. The caller represents the consumer.
                // NOTE: Caller MUST Close this frame!

                // If we found a frame that is "too old" relative to other requests, we should probably discard it
                // But since requests are usually linear, we just pop it.

                // Remove this frame and all previous frames (they are past)
                const consumedFrames = this.frames.splice(0, frameIndex + 1);

                // We only return the specific match, others are discarded (skip logic)
                // Wait, if we discard, subsequent requests might fail?
                // But export moves forward.

                // Close discarded frames
                for (let i = 0; i < consumedFrames.length - 1; i++) {
                    consumedFrames[i].close();
                }

                resolve(frame);
            } else {
                // Not found yet
                // Check if we have frames WAY past this time?
                if (this.frames.length > 0 && this.frames[this.frames.length - 1].timestamp > (timeMicros + tolerance)) {
                    // We passed it. This frame likely doesn't exist (gap?).
                    // Resolve closest match or null?
                    // Resolve null to fallback
                    // resolve(null);
                    remainingResolves.push(req); // Keep waiting? Or fail?
                } else {
                    remainingResolves.push(req);
                }
            }
        }

        this.pendingResolves = remainingResolves;
    }

    /**
     * Get a frame for a specific timestamp (in seconds)
     */
    async getFrame(time) {
        // Return a promise that resolves when the frame is decoded

        // First, check buffer immediately
        const timeMicros = time * 1e6;
        const tolerance = 30000;
        const frameIndex = this.frames.findIndex(f => Math.abs(f.timestamp - timeMicros) < tolerance);

        if (frameIndex !== -1) {
            const frame = this.frames[frameIndex];
            const consumedFrames = this.frames.splice(0, frameIndex + 1);
            for (let i = 0; i < consumedFrames.length - 1; i++) {
                consumedFrames[i].close();
            }
            return frame.clone(); // Clone so internal buffer management doesn't auto-close if we kept reference? 
            // Actually, we removed from array, so transferring ownership. No clone needed but safer.
        }

        return new Promise((resolve) => {
            this.pendingResolves.push({ time, resolve });
        });
    }

    release() {
        if (this.decoder) {
            this.decoder.close();
        }
        if (this.mp4boxfile) {
            this.mp4boxfile.flush();
        }
        this.frames.forEach(f => f.close());
        this.frames = [];
    }
}

export default VideoDecoderManager;

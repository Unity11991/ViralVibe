
/**
 * Extracts key frames from a video file.
 * @param {File} videoFile - The video file to extract frames from.
 * @param {number} numberOfFrames - The number of frames to extract (default: 3).
 * @returns {Promise<string[]>} - A promise that resolves to an array of base64 image strings.
 */
export const extractFramesFromVideo = async (videoFile, numberOfFrames = 3) => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const frames = [];
        const url = URL.createObjectURL(videoFile);

        video.src = url;
        video.crossOrigin = 'anonymous';
        video.muted = true;

        video.onloadedmetadata = async () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const duration = video.duration;
            const interval = duration / (numberOfFrames + 1);

            try {
                for (let i = 1; i <= numberOfFrames; i++) {
                    const time = interval * i;
                    video.currentTime = time;
                    await new Promise(r => video.onseeked = r);

                    context.drawImage(video, 0, 0, canvas.width, canvas.height);
                    frames.push(canvas.toDataURL('image/jpeg', 0.8));
                }
                URL.revokeObjectURL(url);
                resolve(frames);
            } catch (error) {
                URL.revokeObjectURL(url);
                reject(error);
            }
        };

        video.onerror = (error) => {
            URL.revokeObjectURL(url);
            reject(error);
        };
    });
};

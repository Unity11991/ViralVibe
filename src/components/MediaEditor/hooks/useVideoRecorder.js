import { useState, useRef, useCallback, useEffect } from 'react';

export const useVideoRecorder = () => {
    const [isRecordingVideo, setIsRecordingVideo] = useState(false);
    const [recordingVideoTime, setRecordingVideoTime] = useState(0);
    const [videoError, setVideoError] = useState(null);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const streamRef = useRef(null);

    const startVideoRecording = useCallback(async () => {
        try {
            setVideoError(null);
            chunksRef.current = [];

            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = stream;

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            };

            mediaRecorder.start();
            setIsRecordingVideo(true);
            setRecordingVideoTime(0);

            const startTime = Date.now();
            timerRef.current = setInterval(() => {
                setRecordingVideoTime((Date.now() - startTime) / 1000);
            }, 100);

        } catch (err) {
            console.error("Error accessing camera:", err);
            setVideoError("Could not access camera. Please ensure you have granted permission.");
        }
    }, []);

    const stopVideoRecording = useCallback(() => {
        return new Promise((resolve) => {
            if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
                resolve(null);
                return;
            }

            const recorder = mediaRecorderRef.current;

            const handleStop = () => {
                clearInterval(timerRef.current);
                setIsRecordingVideo(false);
                setRecordingVideoTime(0);

                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);

                resolve({ blob, url });
            };

            const originalOnStop = recorder.onstop;
            recorder.onstop = (e) => {
                if (originalOnStop) originalOnStop(e);
                handleStop();
            };

            recorder.stop();
        });
    }, []);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    return {
        isRecordingVideo,
        recordingVideoTime,
        startVideoRecording,
        stopVideoRecording,
        videoError
    };
};

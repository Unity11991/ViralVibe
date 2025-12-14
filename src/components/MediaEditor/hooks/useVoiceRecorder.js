import { useState, useRef, useCallback, useEffect } from 'react';

export const useVoiceRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [error, setError] = useState(null);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);

    const startRecording = useCallback(async () => {
        try {
            setError(null);
            chunksRef.current = []; // Reset chunks

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                // Stop all tracks to release mic
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            // Start timer
            const startTime = Date.now();
            timerRef.current = setInterval(() => {
                setRecordingTime((Date.now() - startTime) / 1000);
            }, 100);

        } catch (err) {
            console.error("Error accessing microphone:", err);
            setError("Could not access microphone. Please ensure you have granted permission.");
        }
    }, []);

    const stopRecording = useCallback(() => {
        return new Promise((resolve, reject) => {
            if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
                resolve(null);
                return;
            }

            const recorder = mediaRecorderRef.current;

            // Define the handler for when stop actually finishes
            const handleStop = () => {
                clearInterval(timerRef.current);
                setIsRecording(false);
                setRecordingTime(0);

                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);

                resolve({ blob, url });
            };

            // Hook into the onstop we defined earlier (or wrap it)
            // We need to ensure we don't overwrite if we need internal cleanup,
            // but the internal cleanup was just stream stopping. 
            // Let's chain them.
            const originalOnStop = recorder.onstop;
            recorder.onstop = (e) => {
                if (originalOnStop) originalOnStop(e);
                handleStop();
            };

            recorder.stop();
        });
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    return {
        isRecording,
        recordingTime,
        startRecording,
        stopRecording,
        error
    };
};

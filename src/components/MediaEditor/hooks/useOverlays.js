import { useState, useCallback, useRef } from 'react';

/**
 * Custom hook for managing text and sticker overlays
 */
export const useOverlays = () => {
    const [textOverlays, setTextOverlays] = useState([]);
    const [stickers, setStickers] = useState([]);
    const [stickerImages, setStickerImages] = useState([]);
    const [activeOverlayId, setActiveOverlayId] = useState(null);
    const [isDraggingOverlay, setIsDraggingOverlay] = useState(null);
    const overlayRef = useRef(null);

    // Text overlay operations
    const addTextOverlay = useCallback((options = {}) => {
        const newText = {
            id: `text-${Date.now()}`,
            text: 'Double-click to edit',
            x: 50,
            y: 50,
            fontSize: 48,
            fontFamily: 'Arial',
            fontWeight: 'bold',
            color: '#ffffff',
            rotation: 0,
            ...options
        };
        setTextOverlays(prev => [...prev, newText]);
        setActiveOverlayId(newText.id);
    }, []);

    const updateTextOverlay = useCallback((id, updates) => {
        setTextOverlays(prev => prev.map(text =>
            text.id === id ? { ...text, ...updates } : text
        ));
    }, []);

    const deleteTextOverlay = useCallback((id) => {
        setTextOverlays(prev => prev.filter(text => text.id !== id));
        if (activeOverlayId === id) {
            setActiveOverlayId(null);
        }
    }, [activeOverlayId]);

    // Sticker operations
    const addSticker = useCallback((imageFile) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const newSticker = {
                        id: `sticker-${Date.now()}`,
                        x: 50,
                        y: 50,
                        scale: 1,
                        rotation: 0
                    };
                    setStickers(prev => [...prev, newSticker]);
                    setStickerImages(prev => [...prev, img]);
                    setActiveOverlayId(newSticker.id);
                    resolve(newSticker);
                };
                img.onerror = () => reject(new Error('Failed to load sticker'));
                img.src = event.target.result;
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(imageFile);
        });
    }, []);

    const updateSticker = useCallback((id, updates) => {
        setStickers(prev => prev.map(sticker =>
            sticker.id === id ? { ...sticker, ...updates } : sticker
        ));
    }, []);

    const deleteSticker = useCallback((id) => {
        const index = stickers.findIndex(s => s.id === id);
        if (index !== -1) {
            setStickers(prev => prev.filter((_, i) => i !== index));
            setStickerImages(prev => prev.filter((_, i) => i !== index));
        }
        if (activeOverlayId === id) {
            setActiveOverlayId(null);
        }
    }, [stickers, activeOverlayId]);

    // Generic delete
    const deleteOverlay = useCallback((id) => {
        if (id.startsWith('text-')) {
            deleteTextOverlay(id);
        } else if (id.startsWith('sticker-')) {
            deleteSticker(id);
        }
    }, [deleteTextOverlay, deleteSticker]);

    // Drag operations
    const startDragging = useCallback((id) => {
        setIsDraggingOverlay(id);
        setActiveOverlayId(id);
    }, []);

    const updateOverlayPosition = useCallback((id, clientX, clientY) => {
        if (!overlayRef.current) return;

        const rect = overlayRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

        if (id.startsWith('text-')) {
            updateTextOverlay(id, { x, y });
        } else if (id.startsWith('sticker-')) {
            updateSticker(id, { x, y });
        }
    }, [updateTextOverlay, updateSticker]);

    const stopDragging = useCallback(() => {
        setIsDraggingOverlay(null);
    }, []);

    return {
        // State
        textOverlays,
        stickers,
        stickerImages,
        activeOverlayId,
        isDraggingOverlay,
        overlayRef,

        // Actions
        addTextOverlay,
        updateTextOverlay,
        deleteTextOverlay,
        addSticker,
        updateSticker,
        deleteSticker,
        deleteOverlay,
        setActiveOverlayId,
        startDragging,
        updateOverlayPosition,
        stopDragging
    };
};

import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

export const useImageEditorState = (initialImage = null) => {
    // --- State ---
    const [layers, setLayers] = useState([]);
    const [activeLayerId, setActiveLayerId] = useState(null);
    const [canvasSize, setCanvasSize] = useState({ width: 1080, height: 1080 }); // Default square

    // History
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const isUndoing = useRef(false);

    // Crop
    const [isCropping, setIsCropping] = useState(false);
    const [cropRect, setCropRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [cropAspectRatio, setCropAspectRatio] = useState(null); // e.g., 1 for square, null for free

    // --- History Management ---
    const addToHistory = useCallback((newLayers) => {
        if (isUndoing.current) return;

        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newLayers);

        // Limit history size
        if (newHistory.length > 20) newHistory.shift();

        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [history, historyIndex]);

    const undo = useCallback(() => {
        if (historyIndex > 0) {
            isUndoing.current = true;
            const newIndex = historyIndex - 1;
            setLayers(history[newIndex]);
            setHistoryIndex(newIndex);
            isUndoing.current = false;
        }
    }, [history, historyIndex]);

    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            isUndoing.current = true;
            const newIndex = historyIndex + 1;
            setLayers(history[newIndex]);
            setHistoryIndex(newIndex);
            isUndoing.current = false;
        }
    }, [history, historyIndex]);

    // --- Layer Actions ---
    const addLayer = useCallback((type, content, options = {}) => {
        const newLayer = {
            id: uuidv4(),
            type, // 'image', 'text', 'sticker', 'drawing'
            content, // url, text string, or path data
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'normal',
            transform: {
                x: options.transform?.x || canvasSize.width / 2,
                y: options.transform?.y || canvasSize.height / 2,
                scaleX: options.transform?.scaleX || 1,
                scaleY: options.transform?.scaleY || 1,
                rotation: options.transform?.rotation || 0,
            },
            width: options.width || 0,
            height: options.height || 0,
            filters: {}, // brightness, contrast, etc.
            style: options.style || {}, // color, font, etc.
            ...options
        };

        setLayers(prev => {
            const next = [...prev, newLayer];
            addToHistory(next);
            return next;
        });
        setActiveLayerId(newLayer.id);
    }, [canvasSize, addToHistory]);

    const updateLayer = useCallback((id, updates) => {
        setLayers(prev => {
            const next = prev.map(layer =>
                layer.id === id ? { ...layer, ...updates } : layer
            );
            addToHistory(next);
            return next;
        });
    }, [addToHistory]);

    const removeLayer = useCallback((id) => {
        setLayers(prev => {
            const next = prev.filter(layer => layer.id !== id);
            addToHistory(next);
            return next;
        });
        if (activeLayerId === id) setActiveLayerId(null);
    }, [activeLayerId, addToHistory]);

    const reorderLayers = useCallback((dragIndex, hoverIndex) => {
        setLayers(prev => {
            const next = [...prev];
            const [removed] = next.splice(dragIndex, 1);
            next.splice(hoverIndex, 0, removed);
            addToHistory(next);
            return next;
        });
    }, [addToHistory]);

    // --- Crop Actions ---
    const startCrop = useCallback(() => {
        setIsCropping(true);
        // Initialize cropRect to cover the whole canvas or active image layer
        setCropRect({ x: 0, y: 0, width: canvasSize.width, height: canvasSize.height });
    }, [canvasSize]);

    const updateCropRect = useCallback((rect) => {
        setCropRect(rect);
    }, []);

    const cancelCrop = useCallback(() => {
        setIsCropping(false);
        setCropRect({ x: 0, y: 0, width: 0, height: 0 });
        setCropAspectRatio(null);
    }, []);

    const applyCrop = useCallback(() => {
        // Logic to apply crop to the canvas or selected layers
        // This would typically involve rendering the cropped area to a new image
        // and replacing the current background/image layer, or updating layer transforms.
        console.log("Applying crop:", cropRect);
        setIsCropping(false);
        setCropAspectRatio(null);
        // TODO: Implement actual crop application logic
    }, [cropRect]);

    // --- Initialization ---
    const initializeEditor = useCallback((imageFileOrUrl) => {
        // Clear existing
        setLayers([]);
        setHistory([]);
        setHistoryIndex(-1);

        if (imageFileOrUrl) {
            const url = typeof imageFileOrUrl === 'string' ? imageFileOrUrl : URL.createObjectURL(imageFileOrUrl);
            const img = new Image();
            img.onload = () => {
                // Set canvas size to match image aspect ratio, but max out at 1080p-ish
                const maxDim = 1080;
                let w = img.width;
                let h = img.height;

                if (w > maxDim || h > maxDim) {
                    const ratio = w / h;
                    if (w > h) {
                        w = maxDim;
                        h = maxDim / ratio;
                    } else {
                        h = maxDim;
                        w = maxDim * ratio;
                    }
                }

                setCanvasSize({ width: w, height: h });

                // Add base layer
                addLayer('image', url, {
                    id: 'background',
                    image: img,
                    transform: {
                        x: w / 2,
                        y: h / 2,
                        scaleX: 1,
                        scaleY: 1,
                        rotation: 0
                    },
                    width: w,
                    height: h,
                    opacity: 100,
                    locked: true,
                    name: 'Background'
                });
            };
            img.src = url;
        }
    }, [addLayer]);

    return {
        layers,
        activeLayerId,
        setActiveLayerId,
        canvasSize,
        setCanvasSize,
        addLayer,
        updateLayer,
        removeLayer,
        reorderLayers,
        undo,
        redo,
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1,
        initializeEditor,
        // Crop
        isCropping,
        cropRect,
        cropAspectRatio,
        startCrop,
        updateCropRect,
        setAspectRatio: setCropAspectRatio, // Renamed for clarity in consumer
        cancelCrop,
        applyCrop
    };
};

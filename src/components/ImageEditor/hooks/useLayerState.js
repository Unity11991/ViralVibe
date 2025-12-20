import { useState, useCallback, useRef } from 'react';

/**
 * Custom hook for managing Image Editor layers
 * Supports: Images, Text, Stickers, Drawing
 */
export const useLayerState = () => {
    const [layers, setLayers] = useState([]);
    const [selectedLayerId, setSelectedLayerId] = useState(null);

    // History
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const isUndoing = useRef(false);

    const addToHistory = useCallback((newLayers) => {
        if (isUndoing.current) return;
        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            return [...newHistory, newLayers];
        });
        setHistoryIndex(prev => prev + 1);
    }, [historyIndex]);

    // Initialize with base image
    const initializeLayers = useCallback((imageFile, imageUrl) => {
        const baseLayer = {
            id: 'layer-base',
            type: 'image',
            name: 'Background',
            visible: true,
            locked: true, // Usually background is locked initially
            opacity: 100,
            blendMode: 'normal',
            source: imageUrl,
            file: imageFile,
            transform: { x: 0, y: 0, scale: 100, rotation: 0 },
            adjustments: {},
            filter: 'normal'
        };
        const newLayers = [baseLayer];
        setLayers(newLayers);
        setHistory([newLayers]);
        setHistoryIndex(0);
        setSelectedLayerId('layer-base');
    }, []);

    // Add Layer
    const addLayer = useCallback((type, content) => {
        setLayers(prev => {
            const newLayer = {
                id: `layer-${type}-${Date.now()}`,
                type,
                name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${prev.length + 1}`,
                visible: true,
                locked: false,
                opacity: 100,
                blendMode: 'normal',
                transform: { x: 0, y: 0, scale: 100, rotation: 0 },
                ...content // e.g., { text: 'Hello', ... } or { source: 'url', ... }
            };
            const newLayers = [...prev, newLayer];
            addToHistory(newLayers);
            // Auto-select new layer
            setTimeout(() => setSelectedLayerId(newLayer.id), 0);
            return newLayers;
        });
    }, [addToHistory]);

    // Update Layer
    const updateLayer = useCallback((layerId, updates) => {
        setLayers(prev => {
            const newLayers = prev.map(layer =>
                layer.id === layerId ? { ...layer, ...updates } : layer
            );
            addToHistory(newLayers);
            return newLayers;
        });
    }, [addToHistory]);

    // Remove Layer
    const removeLayer = useCallback((layerId) => {
        setLayers(prev => {
            const newLayers = prev.filter(l => l.id !== layerId);
            addToHistory(newLayers);
            return newLayers;
        });
        setSelectedLayerId(null);
    }, [addToHistory]);

    // Reorder Layers
    const reorderLayers = useCallback((fromIndex, toIndex) => {
        setLayers(prev => {
            const newLayers = [...prev];
            const [moved] = newLayers.splice(fromIndex, 1);
            newLayers.splice(toIndex, 0, moved);
            addToHistory(newLayers);
            return newLayers;
        });
    }, [addToHistory]);

    // Undo/Redo
    const undo = useCallback(() => {
        if (historyIndex > 0) {
            isUndoing.current = true;
            const newIndex = historyIndex - 1;
            setLayers(history[newIndex]);
            setHistoryIndex(newIndex);
            setTimeout(() => { isUndoing.current = false; }, 0);
        }
    }, [history, historyIndex]);

    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            isUndoing.current = true;
            const newIndex = historyIndex + 1;
            setLayers(history[newIndex]);
            setHistoryIndex(newIndex);
            setTimeout(() => { isUndoing.current = false; }, 0);
        }
    }, [history, historyIndex]);

    return {
        layers,
        selectedLayerId,
        setSelectedLayerId,
        initializeLayers,
        addLayer,
        updateLayer,
        removeLayer,
        reorderLayers,
        undo,
        redo,
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1
    };
};

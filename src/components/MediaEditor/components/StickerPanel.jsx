import React, { useState, useEffect } from 'react';
import { Upload, Trash2, Search, Loader2 } from 'lucide-react';
import { Button, Slider } from './UI';
import { getTrendingGifs, searchGifs } from '../../../utils/tenorService';

/**
 * Sticker Panel Component
 * Handles adding new GSIfs/Stickers from Tenor and editing existing ones.
 */
export const StickerPanel = ({
    stickers = [], // Active stickers on timeline (for editing) - might need to be passed if we keep edit logic here
    activeOverlayId,
    onAddAsset, // New prop for adding to timeline
    onUploadSticker, // Legacy? Or mapped to onAddAsset
    onUpdateSticker,
    onDeleteSticker
}) => {
    const activeSticker = stickers.find(s => s.id === activeOverlayId);

    // Tenor State
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [category, setCategory] = useState('gifs'); // 'gifs' or 'stickers' (Tenor stickers are transparent gifs)

    // Debounce Search
    useEffect(() => {
        const fetchContent = async () => {
            setIsLoading(true);
            try {
                let data = [];
                // If Tenor API supports 'stickers' search explicitly we'd use that endpoint or param.
                // Our service currently maps 'searchGifs'. We might need 'searchStickers' in service if different.
                // For now, let's treat category just as a query modifier or use same endpoint.
                // Tenor has valid 'search' endpoint. query "sticker" usually finds stickers.
                // Or we can just use searchGifs for now.

                if (!searchQuery) {
                    data = await getTrendingGifs(20);
                } else {
                    // Start search
                    data = await searchGifs(searchQuery + (category === 'stickers' ? ' sticker' : ''), 20);
                }
                setResults(data);
            } catch (err) {
                console.error("Failed to load stickers", err);
            } finally {
                setIsLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchContent, 500);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, category]);

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (file && onUploadSticker) {
            onUploadSticker(file);
        }
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Edit Section (if active) */}
            {activeSticker && (
                <div className="shrink-0 space-y-4 p-4 bg-white/5 rounded-2xl border border-white/10 mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-white">Edit Selected</span>
                        <Button
                            onClick={() => onDeleteSticker(activeSticker.id)}
                            variant="danger"
                            size="sm"
                            icon={Trash2}
                        />
                    </div>
                    <Slider
                        label="Scale"
                        value={activeSticker.scale || 100}
                        min={10}
                        max={300}
                        step={5}
                        onChange={(scale) => onUpdateSticker(activeSticker.id, { scale })}
                        unit="%"
                    />
                    <Slider
                        label="Rotation"
                        value={activeSticker.rotation || 0}
                        min={-180}
                        max={180}
                        onChange={(rotation) => onUpdateSticker(activeSticker.id, { rotation })}
                        unit="°"
                    />
                </div>
            )}

            {/* Search & Tabs */}
            <div className="shrink-0 space-y-3 px-1">
                <div className="flex gap-2 p-1 bg-black/20 rounded-lg">
                    {['gifs', 'stickers'].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${category === cat ? 'bg-blue-500 text-white shadow-lg' : 'text-white/40 hover:text-white'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Search ${category}...`}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50"
                    />
                </div>

                {/* Upload Button */}
                <div className="relative">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="sticker-upload-btn"
                    />
                    <label
                        htmlFor="sticker-upload-btn"
                        className="w-full py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer border border-dashed border-white/10"
                    >
                        <Upload size={14} />
                        Upload Custom Image
                    </label>
                </div>
            </div>

            {/* Grid Results */}
            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 mt-2">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40 text-white/40">
                        <Loader2 className="animate-spin" size={24} />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2 pb-4">
                        {results.map(item => (
                            <div
                                key={item.id}
                                className="aspect-square bg-black/20 rounded-lg overflow-hidden relative group cursor-pointer border border-transparent hover:border-blue-500"
                                onClick={() => onAddAsset('sticker', {
                                    url: item.url,
                                    type: 'sticker',
                                    isAnimated: true,
                                    thumbnail: item.thumbnail
                                })}
                                draggable="true"
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('application/json', JSON.stringify({
                                        type: 'sticker',
                                        url: item.url,
                                        isAnimated: true, // Marker for render logic
                                        thumbnail: item.thumbnail
                                    }));
                                }}
                            >
                                <img
                                    src={item.thumbnail}
                                    alt={item.title}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <span className="text-xs font-bold text-white">+ Add</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

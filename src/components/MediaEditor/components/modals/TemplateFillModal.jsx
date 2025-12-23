import React, { useState, useEffect } from 'react';
import { X, Upload, Check, Video, Image as ImageIcon } from 'lucide-react';
import { Button } from '../UI';

export const TemplateFillModal = ({ isOpen, onClose, onApply, template }) => {
    const [slots, setSlots] = useState([]);
    const [numSlots, setNumSlots] = useState(template?.slots || 7);
    const [gap, setGap] = useState(0);

    // Initial load
    useEffect(() => {
        if (template && isOpen) {
            setNumSlots(template.slots || 7);
            setSlots(Array(template.slots || 7).fill(null).map((_, i) => ({
                id: i,
                media: null,
                type: 'video',
                url: null
            })));
        }
    }, [template, isOpen]);

    // Handle numSlots change
    const updateSlotCount = (newCount) => {
        if (!template) return;
        const min = template.minSlots || 2;
        const max = template.maxSlots || 20;
        const count = Math.max(min, Math.min(max, newCount));

        setNumSlots(count);

        setSlots(prev => {
            if (count > prev.length) {
                // Add slots
                const added = Array(count - prev.length).fill(null).map((_, i) => ({
                    id: prev.length + i,
                    media: null,
                    type: 'video',
                    url: null
                }));
                return [...prev, ...added];
            } else {
                // Remove slots (from end)
                return prev.slice(0, count);
            }
        });
    };

    if (!isOpen || !template) return null;

    const handleFileSelect = (index, e) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            const type = file.type.startsWith('image') ? 'image' : 'video';

            setSlots(prev => prev.map(slot =>
                slot.id === index ? { ...slot, media: file, url, type } : slot
            ));
        }
    };

    const handleApply = () => {
        const filledSlots = slots.filter(s => s.media);
        if (filledSlots.length < numSlots) {
            alert(`Please fill all ${numSlots} slots to continue.`);
            return;
        }
        onApply(slots, { gap });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-[900px] bg-[#1a1a1f] rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">Fill Template: {template.name}</h2>
                        <p className="text-white/50 text-sm">Select media for each slot</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {template.isConfigurable && (
                            <div className="flex items-center gap-3 bg-black/30 rounded-lg p-1 border border-white/10 px-3">
                                <span className="text-xs text-white/50 font-medium uppercase tracking-wider">Strip Count</span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => updateSlotCount(numSlots - 1)}
                                        className="w-6 h-6 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
                                    >
                                        -
                                    </button>
                                    <span className="text-white font-mono w-4 text-center">{numSlots}</span>
                                    <button
                                        onClick={() => updateSlotCount(numSlots + 1)}
                                        className="w-6 h-6 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        )}

                        {template.isConfigurable && (
                            <div className="flex items-center gap-3 bg-black/30 rounded-lg p-1 border border-white/10 px-3">
                                <span className="text-xs text-white/50 font-medium uppercase tracking-wider">Gap</span>
                                <input
                                    type="range"
                                    min="0"
                                    max="50"
                                    value={gap}
                                    onChange={(e) => setGap(parseInt(e.target.value))}
                                    className="w-20"
                                />
                                <span className="text-white font-mono w-6 text-center text-xs">{gap}</span>
                            </div>
                        )}

                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-4 gap-4">
                        {slots.map((slot, index) => (
                            <div key={slot.id} className="aspect-[9/16] bg-black/40 rounded-xl border border-white/10 relative group overflow-hidden">
                                {slot.media ? (
                                    <>
                                        {slot.type === 'video' ? (
                                            <video src={slot.url} className="w-full h-full object-cover" />
                                        ) : (
                                            <img src={slot.url} alt="Slot" className="w-full h-full object-cover" />
                                        )}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity gap-2">
                                            <button
                                                onClick={() => setSlots(prev => prev.map(s => s.id === index ? { ...s, media: null, url: null } : s))}
                                                className="p-2 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500 hover:text-white transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors gap-2 text-white/30 hover:text-white">
                                        <Upload size={24} />
                                        <span className="text-xs font-medium">Slot {index + 1}</span>
                                        <input
                                            type="file"
                                            accept="image/*,video/*"
                                            className="hidden"
                                            onChange={(e) => handleFileSelect(index, e)}
                                        />
                                    </label>
                                )}
                                <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-xs font-bold text-white border border-white/10 pointer-events-none">
                                    {index + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-[#131318]">
                    <Button onClick={onClose} variant="ghost">Cancel</Button>
                    <Button onClick={handleApply} variant="primary" icon={Check} disabled={slots.filter(s => s.media).length < numSlots}>
                        Create Video
                    </Button>
                </div>
            </div>
        </div>
    );
};

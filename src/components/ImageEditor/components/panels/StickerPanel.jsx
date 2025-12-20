import React from 'react';

export const StickerPanel = ({ onAddSticker }) => {
    const stickers = [
        '🔥', '✨', '💯', '❤️', '😂', '🎉', '🚀', '👀',
        '👑', '💡', '💪', '🌈', '🍕', '☕', '🎵', '📸'
    ];

    return (
        <div className="p-6 animate-slide-up">
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
                {stickers.map((sticker, idx) => (
                    <button
                        key={idx}
                        onClick={() => onAddSticker(sticker)} // In real app, this would be an image URL
                        className="aspect-square bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-3xl transition-transform hover:scale-110 cursor-pointer"
                    >
                        {sticker}
                    </button>
                ))}
            </div>
        </div>
    );
};

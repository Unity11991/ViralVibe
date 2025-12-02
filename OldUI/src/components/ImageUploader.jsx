import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';

const ImageUploader = ({ onImageSelect, isAnalyzing }) => {
    const [preview, setPreview] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const [error, setError] = useState(null);

    const handleFile = (file) => {
        setError(null);
        if (file) {
            // Basic validation
            if (!file.type.startsWith('image/')) {
                setError('Please upload a valid image file (JPG, PNG, WebP).');
                return;
            }

            // Size validation (e.g., 20MB limit)
            if (file.size > 20 * 1024 * 1024) {
                setError('Image is too large. Please choose an image under 20MB.');
                return;
            }

            const reader = new FileReader();
            reader.onloadstart = () => {
                // Optional: set loading state if needed
            };
            reader.onloadend = () => {
                setPreview(reader.result);
                onImageSelect(file, reader.result);
            };
            reader.onerror = () => {
                setError('Failed to read file. Please try again.');
            };
            reader.readAsDataURL(file);
        }
    };

    const onDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const onDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const clearImage = (e) => {
        e.stopPropagation();
        setPreview(null);
        setError(null);
        onImageSelect(null, null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div
            className={`glass-panel p-4 md:p-8 transition-all duration-300 border-2 border-dashed 
        ${isDragging ? 'border-purple-500 bg-slate-800/50' : 'border-slate-600'}
        ${preview ? 'border-solid border-transparent p-2 md:p-4' : ''}
        cursor-pointer relative group`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => {
                if (!preview && fileInputRef.current) {
                    fileInputRef.current.value = ''; // Reset input to allow re-selecting same file
                    fileInputRef.current.click();
                }
            }}
        >
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFile(e.target.files[0])}
                disabled={isAnalyzing}
            />

            {error && (
                <div className="absolute top-4 left-4 right-4 bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm font-medium animate-fade-in z-10 flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={(e) => { e.stopPropagation(); setError(null); }} className="ml-2 hover:bg-white/20 rounded-full p-1">
                        <X size={14} />
                    </button>
                </div>
            )}

            {preview ? (
                    <div className="relative rounded-lg overflow-hidden animate-fade-in 
                    h-[300px] w-full flex items-center justify-center bg-black/20 p-2">

                    <img
                    src={preview}
                    alt="Preview"
                    className="preview-image"
                    />



                    {!isAnalyzing && (
                        <button
                            onClick={clearImage}
                            className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-red-500/80 rounded-full text-white transition-colors z-10"
                        >
                            <X size={20} />
                        </button>
                    )}

                    {isAnalyzing && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm z-20">
                            <div className="text-white font-semibold flex flex-col items-center gap-2">
                                <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                Analyzing Vibe...
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 group-hover:text-purple-400 transition-colors">
                    <Upload size={48} className="mb-4" />
                    <p className="text-lg font-medium">Drop your image here</p>
                    <p className="text-sm opacity-70 mt-2">or click to browse</p>
                </div>
            )}
        </div>
    );
};

export default ImageUploader;

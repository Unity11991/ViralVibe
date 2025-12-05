import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, Sparkles, Video } from 'lucide-react';

const ImageUploader = ({ onImageSelect, isAnalyzing }) => {
    const [preview, setPreview] = useState(null);
    const [fileType, setFileType] = useState(null); // 'image' or 'video'
    const [isDragging, setIsDragging] = useState(false);

    const onDrop = useCallback((acceptedFiles) => {
        const file = acceptedFiles[0];
        if (file) {
            const objectUrl = URL.createObjectURL(file);
            setPreview(objectUrl);
            setFileType(file.type.startsWith('video/') ? 'video' : 'image');
            onImageSelect(file, objectUrl);
        }
    }, [onImageSelect]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
            'video/*': ['.mp4', '.mov', '.webm']
        },
        maxFiles: 1,
        disabled: isAnalyzing,
        onDragEnter: () => setIsDragging(true),
        onDragLeave: () => setIsDragging(false),
        onDropAccepted: () => setIsDragging(false)
    });

    const clearImage = (e) => {
        e.stopPropagation();
        setPreview(null);
        setFileType(null);
        onImageSelect(null, null);
    };

    // Cleanup object URL
    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    return (
        <div className="w-full animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div
                {...getRootProps()}
                className={`
                    relative group cursor-pointer rounded-2xl transition-all duration-500 ease-out overflow-hidden
                    ${preview ? 'h-[400px]' : 'h-64'}
                    ${isDragActive || isDragging
                        ? 'border-2 border-indigo-500 bg-indigo-500/10 scale-[1.02] shadow-2xl shadow-indigo-500/20'
                        : 'border border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                    }
                `}
            >
                <input {...getInputProps()} />

                {preview ? (
                    <>
                        {/* Cinematic Background Preview */}
                        <div className="absolute inset-0 z-0">
                            {fileType === 'video' ? (
                                <video
                                    src={preview}
                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity duration-500"
                                    muted
                                    loop
                                    autoPlay
                                    playsInline
                                />
                            ) : (
                                <img
                                    src={preview}
                                    alt="Upload preview"
                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity duration-500"
                                />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                        </div>

                        {/* Overlay Actions */}
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
                            <button
                                onClick={clearImage}
                                className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 backdrop-blur-md transition-all hover:scale-105"
                            >
                                <X size={18} />
                                <span className="font-medium">Remove {fileType === 'video' ? 'Video' : 'Image'}</span>
                            </button>
                            <p className="mt-4 text-white/60 text-sm">Click or drop to replace</p>
                        </div>

                        {/* Status Badge */}
                        <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs font-medium text-white/80">
                                {fileType === 'video' ? 'Video Ready' : 'Image Ready'}
                            </span>
                        </div>
                    </>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                        {/* Icon Circle */}
                        <div className={`
                            w-16 h-16 mb-6 rounded-2xl flex items-center justify-center
                            bg-gradient-to-br from-indigo-500/20 to-purple-500/20
                            border border-white/10 backdrop-blur-sm
                            transition-all duration-500 group-hover:scale-110 group-hover:rotate-3
                            ${isDragActive ? 'animate-pulse' : ''}
                        `}>
                            {isDragActive ? (
                                <Sparkles className="w-8 h-8 text-indigo-400 animate-spin-slow" />
                            ) : (
                                <div className="relative">
                                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-white transition-colors" />
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 max-w-xs mx-auto">
                            <h3 className="text-xl font-medium text-white transition-all">
                                {isDragActive ? "Drop it here!" : "Upload Image or Video"}
                            </h3>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                Drag & drop or click to browse. <br />
                                <span className="text-xs opacity-60">JPG, PNG, MP4 up to 50MB</span>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageUploader;

import React from 'react';

/**
 * Reusable Slider Component
 */
export const Slider = ({ label, value, min, max, step = 1, onChange, unit = '' }) => {
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-xs">
                <span className="text-white/60">{label}</span>
                <span className="text-blue-400 font-mono">{value}{unit}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg hover:[&::-webkit-slider-thumb]:bg-blue-400 transition-all"
            />
        </div>
    );
};

/**
 * Reusable Button Component
 */
export const Button = ({
    children,
    onClick,
    variant = 'primary',
    size = 'md',
    disabled = false,
    icon: Icon,
    className = ''
}) => {
    const baseStyles = "font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2";

    const variants = {
        primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg",
        secondary: "bg-white/10 hover:bg-white/20 text-white border border-white/10",
        danger: "bg-red-600 hover:bg-red-500 text-white",
        ghost: "bg-transparent hover:bg-white/5 text-white"
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base"
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        >
            {Icon && <Icon size={size === 'sm' ? 16 : size === 'lg' ? 20 : 18} />}
            {children}
        </button>
    );
};

/**
 * Reusable Input Component
 */
export const Input = ({
    type = 'text',
    value,
    onChange,
    placeholder,
    className = ''
}) => {
    return (
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500 transition-colors ${className}`}
        />
    );
};

/**
 * Reusable Color Picker
 */
export const ColorPicker = ({ value, onChange, presets = [] }) => {
    return (
        <div className="space-y-2">
            <label className="text-xs text-white/60">Color</label>
            <div className="flex gap-2 flex-wrap items-center">
                {presets.map(color => (
                    <button
                        key={color}
                        onClick={() => onChange(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${value === color ? 'border-white shadow-lg' : 'border-transparent'
                            }`}
                        style={{ backgroundColor: color }}
                    />
                ))}
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-8 h-8 rounded-full overflow-hidden cursor-pointer border-0 p-0"
                />
            </div>
        </div>
    );
};

/**
 * Collapsible Section
 */
export const CollapsibleSection = ({ title, isOpen, onToggle, children, icon: Icon }) => {
    return (
        <div className="space-y-4">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between text-sm font-bold text-white/80 hover:text-white transition-colors"
            >
                <div className="flex items-center gap-2">
                    {Icon && <Icon size={16} />}
                    <span>{title}</span>
                </div>
                <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isOpen && (
                <div className="space-y-4 pl-2 border-l border-white/5 animate-slide-down">
                    {children}
                </div>
            )}
        </div>
    );
};

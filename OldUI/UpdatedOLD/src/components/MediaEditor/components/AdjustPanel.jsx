import React, { useState } from 'react';
import { Sun, Palette, Droplet, Sparkles } from 'lucide-react';
import { Slider, CollapsibleSection } from './UI';

/**
 * Adjustment Panel Component
 */
export const AdjustPanel = ({ adjustments, onUpdate }) => {
    const [expandedSections, setExpandedSections] = useState({
        light: true,
        color: false,
        hsl: false,
        style: false
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const handleChange = (key, value) => {
        onUpdate({ ...adjustments, [key]: value });
    };

    return (
        <div className="space-y-4 animate-slide-up">
            {/* Light Section */}
            <CollapsibleSection
                title="Light"
                icon={Sun}
                isOpen={expandedSections.light}
                onToggle={() => toggleSection('light')}
            >
                <Slider label="Exposure" value={adjustments.exposure} min={-100} max={100} onChange={(v) => handleChange('exposure', v)} />
                <Slider label="Contrast" value={adjustments.contrast} min={-100} max={100} onChange={(v) => handleChange('contrast', v)} />
                <Slider label="Brightness" value={adjustments.brightness} min={-100} max={100} onChange={(v) => handleChange('brightness', v)} />
                <Slider label="Highlights" value={adjustments.highlights} min={-100} max={100} onChange={(v) => handleChange('highlights', v)} />
                <Slider label="Shadows" value={adjustments.shadows} min={-100} max={100} onChange={(v) => handleChange('shadows', v)} />
            </CollapsibleSection>

            {/* Color Section */}
            <CollapsibleSection
                title="Color"
                icon={Palette}
                isOpen={expandedSections.color}
                onToggle={() => toggleSection('color')}
            >
                <Slider label="Saturation" value={adjustments.saturation} min={-100} max={100} onChange={(v) => handleChange('saturation', v)} />
                <Slider label="Vibrance" value={adjustments.vibrance} min={-100} max={100} onChange={(v) => handleChange('vibrance', v)} />
                <Slider label="Temp" value={adjustments.temp} min={-100} max={100} onChange={(v) => handleChange('temp', v)} />
                <Slider label="Tint" value={adjustments.tint} min={-100} max={100} onChange={(v) => handleChange('tint', v)} />
            </CollapsibleSection>

            {/* HSL Section */}
            <CollapsibleSection
                title="HSL"
                icon={Droplet}
                isOpen={expandedSections.hsl}
                onToggle={() => toggleSection('hsl')}
            >
                <Slider label="Hue" value={adjustments.hue} min={-180} max={180} onChange={(v) => handleChange('hue', v)} />
                <Slider label="Saturation" value={adjustments.hslSaturation} min={-100} max={100} onChange={(v) => handleChange('hslSaturation', v)} />
                <Slider label="Lightness" value={adjustments.hslLightness} min={-100} max={100} onChange={(v) => handleChange('hslLightness', v)} />
            </CollapsibleSection>

            {/* Style Section */}
            <CollapsibleSection
                title="Style"
                icon={Sparkles}
                isOpen={expandedSections.style}
                onToggle={() => toggleSection('style')}
            >
                <Slider label="Sharpen" value={adjustments.sharpen} min={0} max={100} onChange={(v) => handleChange('sharpen', v)} />
                <Slider label="Blur" value={adjustments.blur} min={0} max={100} onChange={(v) => handleChange('blur', v)} />
                <Slider label="Vignette" value={adjustments.vignette} min={0} max={100} onChange={(v) => handleChange('vignette', v)} />
                <Slider label="Grain" value={adjustments.grain} min={0} max={100} onChange={(v) => handleChange('grain', v)} />
                <Slider label="Fade" value={adjustments.fade} min={0} max={100} onChange={(v) => handleChange('fade', v)} />
                <Slider label="Grayscale" value={adjustments.grayscale} min={0} max={100} onChange={(v) => handleChange('grayscale', v)} />
                <Slider label="Sepia" value={adjustments.sepia} min={0} max={100} onChange={(v) => handleChange('sepia', v)} />
            </CollapsibleSection>
        </div>
    );
};

import React, { useState, useRef, useEffect } from 'react';

export const CustomCurveEditor = ({ value, onChange }) => {
    // value is { x1, y1, x2, y2 }
    // Default to linear if not provided
    const [points, setPoints] = useState(value || { x1: 0.33, y1: 0, x2: 0.67, y2: 1 });
    const pointsRef = useRef(points); // Keep ref in sync for event handlers
    const svgRef = useRef(null);
    const draggingRef = useRef(null);
    const dragRectRef = useRef(null);
    const rafRef = useRef(null);

    useEffect(() => {
        if (value && !draggingRef.current) {
            setPoints(value);
            pointsRef.current = value;
        }
    }, [value]);

    const handleMouseDown = (e, point) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent bubbling
        draggingRef.current = point;
        if (svgRef.current) {
            dragRectRef.current = svgRef.current.getBoundingClientRect();
        }
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    // Configuration
    const VIEWBOX_SIZE = 100;
    const PADDING = 12; // Space for handles
    const GRAPH_SIZE = VIEWBOX_SIZE - (PADDING * 2);

    const handleMouseMove = (e) => {
        if (!draggingRef.current || !dragRectRef.current) return;

        const rect = dragRectRef.current;

        // Convert mouse position to SVG coordinates (0-100)
        const svgX = (e.clientX - rect.left) / rect.width * VIEWBOX_SIZE;
        const svgY = (e.clientY - rect.top) / rect.height * VIEWBOX_SIZE;

        // Convert SVG coordinates to Graph coordinates (0-1)
        // x = (svgX - PADDING) / GRAPH_SIZE
        let x = (svgX - PADDING) / GRAPH_SIZE;
        let rawY = (svgY - PADDING) / GRAPH_SIZE;

        // Clamp to 0-1
        x = Math.min(1, Math.max(0, x));
        rawY = Math.min(1, Math.max(0, rawY));

        const y = 1 - rawY;

        // Calculate new points based on ref to avoid closure staleness
        const currentPoints = pointsRef.current;
        const newPoints = { ...currentPoints };

        if (draggingRef.current === 'p1') {
            newPoints.x1 = x;
            newPoints.y1 = y;
        } else {
            newPoints.x2 = x;
            newPoints.y2 = y;
        }

        // Update state and ref immediately for smooth UI
        setPoints(newPoints);
        pointsRef.current = newPoints;

        // Throttle parent update
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
            onChange(newPoints);
        });
    };

    const handleMouseUp = () => {
        draggingRef.current = null;
        dragRectRef.current = null;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };

    // Convert to SVG coordinates
    const toSvg = (x, y) => ({
        x: (x * GRAPH_SIZE) + PADDING,
        y: ((1 - y) * GRAPH_SIZE) + PADDING
    });

    const p0 = toSvg(0, 0);
    const p1 = toSvg(points.x1, points.y1);
    const p2 = toSvg(points.x2, points.y2);
    const p3 = toSvg(1, 1);

    const pathData = `M${p0.x},${p0.y} C${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`;

    return (
        <div className="w-full aspect-square bg-gradient-to-br from-white/5 to-white/0 rounded-lg border border-white/10 relative select-none overflow-hidden group">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
                    backgroundSize: '25% 25%'
                }}
            />

            <svg
                ref={svgRef}
                viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
                className="w-full h-full overflow-visible relative z-10"
                style={{ touchAction: 'none' }}
            >
                {/* Diagonal Reference */}
                <line x1={p0.x} y1={p0.y} x2={p3.x} y2={p3.y} stroke="white" strokeOpacity="0.1" strokeWidth="1" strokeDasharray="4 4" />

                {/* Axes / Box */}
                <rect x={PADDING} y={PADDING} width={GRAPH_SIZE} height={GRAPH_SIZE} fill="none" stroke="white" strokeOpacity="0.05" strokeWidth="1" />

                {/* Control Lines (Handles) */}
                <line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke="white" strokeOpacity="0.4" strokeWidth="1.5" />
                <line x1={p3.x} y1={p3.y} x2={p2.x} y2={p2.y} stroke="white" strokeOpacity="0.4" strokeWidth="1.5" />

                {/* The Curve */}
                <path
                    d={pathData}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                />

                {/* Start/End Points */}
                <circle cx={p0.x} cy={p0.y} r="3" fill="white" fillOpacity="0.8" />
                <circle cx={p3.x} cy={p3.y} r="3" fill="white" fillOpacity="0.8" />

                {/* Control Points (Interactive) */}
                <g className="cursor-pointer" onMouseDown={(e) => handleMouseDown(e, 'p1')}>
                    <circle cx={p1.x} cy={p1.y} r="12" fill="transparent" /> {/* Hit area */}
                    <circle
                        cx={p1.x} cy={p1.y} r="5"
                        fill="#3b82f6"
                        stroke="white"
                        strokeWidth="2"
                        className="transition-transform hover:scale-125 shadow-lg"
                    />
                </g>
                <g className="cursor-pointer" onMouseDown={(e) => handleMouseDown(e, 'p2')}>
                    <circle cx={p2.x} cy={p2.y} r="12" fill="transparent" /> {/* Hit area */}
                    <circle
                        cx={p2.x} cy={p2.y} r="5"
                        fill="#3b82f6"
                        stroke="white"
                        strokeWidth="2"
                        className="transition-transform hover:scale-125 shadow-lg"
                    />
                </g>
            </svg>

            {/* Coordinate Labels (Optional, for pro feel) */}
            <div className="absolute bottom-1 left-2 text-[8px] text-white/30 font-mono pointer-events-none">0,0</div>
            <div className="absolute top-1 right-2 text-[8px] text-white/30 font-mono pointer-events-none">1,1</div>
        </div>
    );
};

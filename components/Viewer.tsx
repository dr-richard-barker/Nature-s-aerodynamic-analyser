import React, { useState, useRef, useCallback, useEffect } from 'react';
import { SimulationState, VisualizationOptions } from '../types';
import { CubeIcon } from './icons/CubeIcon';

// --- Visualization Overlays ---

const StreamlinesOverlay: React.FC<{ windSpeed: number; windDirection: number }> = ({ windSpeed, windDirection }) => {
  const duration = Math.max(0.2, 3 - (windSpeed / 50) * 2.8); // Animation gets faster as speed increases
  const animationStyle = { animation: `stream-flow ${duration}s linear infinite` };

  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" viewBox="0 0 800 600" preserveAspectRatio="none">
      <style>{`
        @keyframes stream-flow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -40; }
        }
      `}</style>
      <g transform={`rotate(${windDirection} 400 300)`}>
        <path d="M -50 150 Q 200 100, 400 200 T 850 300" stroke="#3abff8" strokeWidth="2" fill="none" style={{ ...animationStyle, strokeDasharray: '15 25' }} />
        <path d="M -50 250 Q 250 220, 400 250 T 850 220" stroke="#3abff8" strokeWidth="2" fill="none" style={{ ...animationStyle, strokeDasharray: '15 25', animationDelay: '-0.3s' }} />
        <path d="M -50 350 Q 200 400, 400 380 T 850 450" stroke="#3abff8" strokeWidth="2" fill="none" style={{ ...animationStyle, strokeDasharray: '15 25', animationDelay: '-0.6s' }}/>
        <path d="M -50 450 Q 250 480, 400 450 T 850 420" stroke="#3abff8" strokeWidth="2" fill="none" style={{ ...animationStyle, strokeDasharray: '15 25', animationDelay: '-0.8s' }}/>
      </g>
    </svg>
  );
};

const PressureOverlay: React.FC<{ windSpeed: number; windDirection: number }> = ({ windSpeed, windDirection }) => {
    const intensity = Math.min(1, 0.4 + windSpeed / 40); // Intensity increases with speed
    return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none mix-blend-screen" viewBox="0 0 800 600" preserveAspectRatio="none">
    <defs>
        <filter id="blurFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="15" />
        </filter>
        <radialGradient id="highPressureGrad" cx="0.3" cy="0.5" r="0.4">
            <stop offset="0%" stopColor="#f87272" stopOpacity="1" />
            <stop offset="50%" stopColor="#fbbd23" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#36d399" stopOpacity="0.2" />
        </radialGradient>
         <radialGradient id="lowPressureGrad" cx="0.5" cy="0.25" r="0.5">
            <stop offset="0%" stopColor="#3abff8" stopOpacity="1" />
            <stop offset="60%" stopColor="#3abff8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3abff8" stopOpacity="0" />
        </radialGradient>
    </defs>
    
    <g filter="url(#blurFilter)" transform={`rotate(${windDirection} 400 300)`} style={{ opacity: intensity }}>
      {/* High pressure zone at the front */}
      <ellipse cx="280" cy="300" rx="150" ry="200" fill="url(#highPressureGrad)" />

      {/* Low pressure zone over the top */}
      <ellipse cx="450" cy="180" rx="200" ry="80" fill="url(#lowPressureGrad)" />

      {/* Another low pressure/wake area */}
       <ellipse cx="650" cy="300" rx="180" ry="150" fill="url(#lowPressureGrad)" opacity="0.7" />
    </g>
  </svg>
)};

const VelocityOverlay: React.FC<{ windSpeed: number; windDirection: number }> = ({ windSpeed, windDirection }) => {
    const vecLength = 20 + windSpeed * 2.5; // Vector length increases with speed
    return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" viewBox="0 0 800 600" preserveAspectRatio="none">
        <defs>
            <marker id="vec-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#fbbd23" />
            </marker>
        </defs>
        <g transform={`rotate(${windDirection} 400 300)`}>
            {/* Vectors around the object */}
            <line x1="100" y1="200" x2={100 + vecLength} y2="200" stroke="#fbbd23" strokeWidth="3" markerEnd="url(#vec-arrow)" />
            <line x1="100" y1="300" x2={100 + vecLength} y2="300" stroke="#fbbd23" strokeWidth="3" markerEnd="url(#vec-arrow)" />
            <line x1="100" y1="400" x2={100 + vecLength} y2="400" stroke="#fbbd23" strokeWidth="3" markerEnd="url(#vec-arrow)" />
            
            {/* Accelerated flow over the top */}
            <path d="M 300 150 C 400 130, 500 150, 600 180" stroke="#fbbd23" strokeWidth="4" fill="none" markerEnd="url(#vec-arrow)" />
            
            {/* Wake region */}
            <line x1="650" y1="280" x2="620" y2="280" stroke="#3abff8" strokeWidth="2" markerEnd="url(#vec-arrow)" />
            <line x1="660" y1="320" x2="630" y2="320" stroke="#3abff8" strokeWidth="2" markerEnd="url(#vec-arrow)" />
        </g>
    </svg>
)};

interface ForceCoefficients {
  cd: number | null;
  cl: number | null;
}

const ForcesOverlay: React.FC<{ coefficients: ForceCoefficients; windDirection: number; windSpeed: number }> = ({ coefficients, windDirection, windSpeed }) => {
    const { cd, cl } = coefficients;

    // Base properties
    const centerX = 400;
    const centerY = 300;
    const dragBaseLength = 50;
    const liftBaseLength = 50;
    const scaleFactor = 100; // Multiplier for coefficient effect on arrow length

    // Forces scale with velocity squared. Normalize against a moderate speed (e.g., 25 m/s)
    const speedScale = Math.max(0.1, Math.min(4, (windSpeed * windSpeed) / (25 * 25)));

    // Calculate dynamic properties, with fallbacks for null values to ensure something is always rendered
    const dragLength = dragBaseLength + Math.abs(cd ?? 0.5) * scaleFactor * speedScale;
    const liftValue = cl ?? 0.2; // Default to small positive lift if not found in analysis
    const liftLength = liftBaseLength + Math.abs(liftValue) * scaleFactor * speedScale;
    const liftYEnd = centerY - (liftLength * Math.sign(liftValue));
    
    const isDownforce = liftValue < 0;
    const liftLabel = isDownforce ? "Downforce" : "Lift";
    const liftColor = isDownforce ? "#fbbd23" : "#36d399"; // Warning color for downforce, success for lift
    const liftLabelY = (centerY + liftYEnd) / 2;
    
    // Text coordinates in the un-rotated system
    const dragTextX = centerX + dragLength / 2;
    const dragTextY = centerY - 10;
    const liftTextX = centerX - 10;

    return (
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" viewBox="0 0 800 600" preserveAspectRatio="none">
             <defs>
                <marker id="force-arrow-drag" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto" fill="#f87272">
                    <path d="M 0 0 L 10 5 L 0 10 z" />
                </marker>
                <marker id="force-arrow-lift" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto" fill={liftColor}>
                    <path d="M 0 0 L 10 5 L 0 10 z" />
                </marker>
            </defs>
            <g transform={`rotate(${windDirection} 400 300)`}>
                {/* Drag Force */}
                <g className="opacity-90 animate-[fadeIn_0.5s_ease-in-out]">
                    <line className="transition-all duration-300 ease-in-out" x1={centerX} y1={centerY} x2={centerX + dragLength} y2={centerY} stroke="#f87272" strokeWidth="5" markerEnd="url(#force-arrow-drag)" />
                    <text x={dragTextX} y={dragTextY} fill="white" fontSize="24" textAnchor="middle" className="font-bold drop-shadow-lg transition-all duration-300 ease-in-out" transform={`rotate(${-windDirection} ${dragTextX} ${dragTextY})`}>Drag</text>
                </g>
                {/* Lift/Downforce */}
                <g className="opacity-90 animate-[fadeIn_0.5s_ease-in-out]">
                    <line className="transition-all duration-300 ease-in-out" x1={centerX} y1={centerY} x2={centerX} y2={liftYEnd} stroke={liftColor} strokeWidth="5" markerEnd="url(#force-arrow-lift)" />
                    <text x={liftTextX} y={liftLabelY} fill="white" fontSize="24" textAnchor="end" className="font-bold drop-shadow-lg transition-all duration-300 ease-in-out" transform={`rotate(${-windDirection} ${liftTextX} ${liftLabelY})`}>{liftLabel}</text>
                </g>
            </g>
        </svg>
    );
};
// --- End Visualization Overlays ---

// --- Analysis Highlight Components ---
const HighlightPoint: React.FC<{ cx: string; cy: string; color: string; label: string }> = ({ cx, cy, color, label }) => (
  <g className="animate-[fadeIn_0.5s_ease-in-out]">
    <circle cx={cx} cy={cy} r="15" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2">
      <animate attributeName="r" from="15" to="25" dur="1.5s" begin="0s" repeatCount="indefinite" />
      <animate attributeName="opacity" from="0.7" to="0" dur="1.5s" begin="0s" repeatCount="indefinite" />
    </circle>
    <circle cx={cx} cy={cy} r="8" fill={color} />
    <text x={cx} y={cy} dy="40" textAnchor="middle" fill="white" fontSize="16" className="font-sans font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        {label}
    </text>
  </g>
);

const TurbulentArea: React.FC = () => (
  <g className="animate-[fadeIn_0.5s_ease-in-out]">
    <style>{`
      .turbulent-path {
        stroke-dasharray: 8 12;
        stroke-dashoffset: 0;
        animation: turbulent-flow 1.2s linear infinite;
      }
      @keyframes turbulent-flow {
        from { stroke-dashoffset: 0; }
        to { stroke-dashoffset: -20; }
      }
    `}</style>
    <path className="turbulent-path" d="M 600 250 c 30 -50, 80 50, 0 0 z" stroke="#828df8" strokeWidth="2.5" fill="none" />
    <path className="turbulent-path" d="M 620 320 c 40 40, 20 -60, 0 0 z" stroke="#828df8" strokeWidth="2" fill="none" style={{ animationDelay: '-0.4s', animationDuration: '1s' }} />
    <path className="turbulent-path" d="M 650 280 c -30 40, 40 -30, 0 0 z" stroke="#828df8" strokeWidth="2" fill="none" style={{ animationDelay: '-0.8s', animationDuration: '1.5s' }} />
    <path className="turbulent-path" d="M 630 380 c 50 -30, -20 50, 0 0 z" stroke="#828df8" strokeWidth="2.5" fill="none" style={{ animationDelay: '-0.2s', animationDuration: '1.3s' }} />
    <text x="680" y="330" textAnchor="middle" fill="white" fontSize="16" className="font-sans font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        Turbulent Wake
    </text>
  </g>
);


interface AnalysisHighlightsOverlayProps {
  analysisResult: string;
  visualization: VisualizationOptions;
}

const AnalysisHighlightsOverlay: React.FC<AnalysisHighlightsOverlayProps> = ({ analysisResult, visualization }) => {
  const hasHighPressure = /high-pressure|stagnation point/i.test(analysisResult);
  const hasLowPressure = /low-pressure|flow acceleration/i.test(analysisResult);
  const hasTurbulence = /wake region|turbulence|flow separation/i.test(analysisResult);

  const showTurbulence = hasTurbulence && (visualization.streamlines || visualization.velocity);
  const showPressurePoints = hasHighPressure && hasLowPressure && visualization.pressure;

  if (!analysisResult) return null;

  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" viewBox="0 0 800 600" preserveAspectRatio="none">
      {showPressurePoints && (
        <>
          <HighlightPoint cx="250" cy="300" color="#f87272" label="High Pressure" />
          <HighlightPoint cx="400" cy="180" color="#3abff8" label="Low Pressure" />
        </>
      )}
      {showTurbulence && <TurbulentArea />}
    </svg>
  );
};

// --- Main Viewer Component ---
interface ViewerProps {
  simulationState: SimulationState;
  visualization: VisualizationOptions;
  analysisResult: string;
  forceCoefficients: ForceCoefficients;
  windSpeed: number;
  windDirection: number;
}

const Viewer: React.FC<ViewerProps> = ({ simulationState, visualization, analysisResult, forceCoefficients, windSpeed, windDirection }) => {
  const [rotation, setRotation] = useState({ x: -20, y: 30 });
  const isDragging = useRef(false);
  const prevMousePos = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    prevMousePos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - prevMousePos.current.x;
    const deltaY = e.clientY - prevMousePos.current.y;
    // Fix: The updater function for setRotation must return a complete state object with both x and y.
    setRotation(prev => ({
      x: Math.max(-90, Math.min(90, prev.x - deltaY * 0.5)),
      y: prev.y + deltaX * 0.5,
    }));
    prevMousePos.current = { x: e.clientX, y: e.clientY };
  }, []);

  // Fix: The component must return a JSX element to be a valid React Functional Component.
  return (
    <div
      className="w-full h-full bg-base-100 rounded-md relative cursor-grab active:cursor-grabbing perspective-[1000px] touch-none select-none"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseMove={handleMouseMove}
    >
      {simulationState === SimulationState.IDLE || simulationState === SimulationState.CONFIGURING ? (
        <div className="w-full h-full flex flex-col items-center justify-center text-base-content/60 p-4 text-center">
          <CubeIcon className="w-24 h-24 mb-4" />
          <p>Upload a model and run the simulation to see results.</p>
        </div>
      ) : (
        <>
          <div
            className="absolute inset-0 flex items-center justify-center transition-transform duration-100 ease-out"
            style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`, transformStyle: 'preserve-3d' }}
          >
            <div className="w-64 h-32 bg-primary/20 rounded-lg shadow-xl relative flex items-center justify-center">
              <CubeIcon className="w-16 h-16 text-primary" />
            </div>
          </div>
          {/* Overlays */}
          {simulationState === SimulationState.COMPLETED && (
             <>
                {visualization.streamlines && <StreamlinesOverlay windSpeed={windSpeed} windDirection={windDirection} />}
                {visualization.pressure && <PressureOverlay windSpeed={windSpeed} windDirection={windDirection} />}
                {visualization.velocity && <VelocityOverlay windSpeed={windSpeed} windDirection={windDirection} />}
                {visualization.forces && <ForcesOverlay coefficients={forceCoefficients} windSpeed={windSpeed} windDirection={windDirection} />}
                <AnalysisHighlightsOverlay analysisResult={analysisResult} visualization={visualization} />
            </>
          )}
        </>
      )}
    </div>
  );
};

// Fix: Add a default export so the component can be imported correctly in App.tsx.
export default Viewer;

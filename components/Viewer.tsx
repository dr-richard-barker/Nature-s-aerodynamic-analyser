import React, { useState, useRef, useCallback, useEffect } from 'react';
import { SimulationState, VisualizationOptions } from '../types';
import { CubeIcon } from './icons/CubeIcon';

// --- New Icons for Viewer Controls ---
const CameraResetIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M10.6 4.6a9.9 9.9 0 1 0 5.8 16.8" />
    <path d="M2 12h2a8 8 0 0 1 8-8V2" />
    <path d="m12 12 4-4" />
  </svg>
);
const ArrowIcon: React.FC<React.SVGProps<SVGSVGElement> & { direction: 'up' | 'down' | 'left' | 'right' }> = ({ direction, ...props }) => {
  const rotations = { up: 0, right: 90, down: 180, left: 270 };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <g transform={`rotate(${rotations[direction]} 12 12)`}>
        <path d="M12 19V5M5 12l7-7 7 7" />
      </g>
    </svg>
  );
};
const ZoomInIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        <line x1="11" y1="8" x2="11" y2="14"></line>
        <line x1="8" y1="11" x2="14" y2="11"></line>
    </svg>
);
const ZoomOutIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        <line x1="8" y1="11" x2="14" y2="11"></line>
    </svg>
);
// --- End New Icons ---


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
        <path d="M -50 450 Q 250 480, 400 450 T 850 420" stroke="#3abff8" strokeWidth="2" fill="none" style={{ ...animationStyle, strokeDasharray: '15 25', animationDelay: '-0.9s' }}/>
      </g>
    </svg>
  );
};

const VelocityOverlay: React.FC<{ windDirection: number }> = ({ windDirection }) => (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ transform: `rotate(${windDirection}deg)` }}>
        {[...Array(5)].map((_, i) => (
             <div key={i} className="absolute text-primary text-2xl font-bold" style={{ top: `${15 + i*15}%`, left: '10%', animation: `flow-arrow 1.5s ease-in-out ${i*0.1}s infinite` }}>&rarr;</div>
        ))}
        <style>{`
          @keyframes flow-arrow {
            0% { transform: translateX(0); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translateX(50px); opacity: 0; }
          }
        `}</style>
    </div>
);

const PressureOverlay: React.FC<{ windDirection: number }> = ({ windDirection }) => {
    return (
        <div className="absolute w-full h-full top-0 left-0 pointer-events-none flex items-center justify-center">
             <div className="absolute w-12 h-24 bg-red-500/30 rounded-full blur-xl animate-pulse" style={{ transform: `translateX(-60px) rotate(${windDirection}deg)` }}></div>
             <div className="absolute w-20 h-32 bg-blue-500/30 rounded-full blur-2xl animate-pulse" style={{ transform: `translateX(70px) rotate(${windDirection}deg)` }}></div>
        </div>
    )
};

const ForceOverlay: React.FC<{ forceCoefficients: { cd: number | null; cl: number | null }, windDirection: number }> = ({ forceCoefficients, windDirection }) => {
    const { cd, cl } = forceCoefficients;
    const dragMagnitude = cd ? Math.min(150, 20 + cd * 100) : 0;
    const liftMagnitude = cl ? cl * 100 : 0;

    const arrowStyle: React.CSSProperties = {
        position: 'absolute',
        left: '50%',
        top: '50%',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
    };

    return (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex items-center justify-center" style={{ transform: `rotate(${windDirection}deg)` }}>
            {dragMagnitude > 0 && (
                <div style={{...arrowStyle, transform: 'translate(50px, -50%)', color: '#f87272'}}>
                    <span className="text-xs font-bold">Drag</span>
                    <svg width={dragMagnitude} height="20" viewBox={`0 0 ${dragMagnitude} 20`}>
                        <line x1="0" y1="10" x2={dragMagnitude - 10} y2="10" stroke="currentColor" strokeWidth="2" />
                        <polygon points={`${dragMagnitude-10},5 ${dragMagnitude},10 ${dragMagnitude-10},15`} fill="currentColor" />
                    </svg>
                </div>
            )}
            {liftMagnitude !== 0 && (
                 <div style={{ ...arrowStyle, color: '#3abff8', transform: `translate(-50%, ${liftMagnitude > 0 ? '-50px' : '30px'}) rotate(${liftMagnitude > 0 ? -90 : 90}deg)` }}>
                    <span className="text-xs font-bold">{liftMagnitude > 0 ? 'Lift' : 'Downforce'}</span>
                    <svg width={Math.abs(liftMagnitude)} height="20" viewBox={`0 0 ${Math.abs(liftMagnitude)} 20`}>
                        <line x1="0" y1="10" x2={Math.abs(liftMagnitude) - 10} y2="10" stroke="currentColor" strokeWidth="2" />
                        <polygon points={`${Math.abs(liftMagnitude)-10},5 ${Math.abs(liftMagnitude)},10 ${Math.abs(liftMagnitude)-10},15`} fill="currentColor" />
                    </svg>
                </div>
            )}
        </div>
    );
};

interface ViewerProps {
  simulationState: SimulationState;
  visualization: VisualizationOptions;
  analysisResult: string;
  forceCoefficients: { cd: number | null; cl: number | null };
  windSpeed: number;
  windDirection: number;
}

const Viewer: React.FC<ViewerProps> = ({ 
    simulationState, 
    visualization,
    analysisResult,
    forceCoefficients,
    windSpeed,
    windDirection,
}) => {
  const [rotation, setRotation] = useState({ x: -20, y: 20 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePosition, setLastMousePosition] = useState({ x: 0, y: 0 });

  const viewerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setLastMousePosition({ x: e.clientX, y: e.clientY });
    if (e.button === 2) {
      setIsPanning(true);
    } else {
      setIsDragging(true);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsPanning(false);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging && !isPanning) return;
    
    const dx = e.clientX - lastMousePosition.x;
    const dy = e.clientY - lastMousePosition.y;

    if (isDragging) {
      setRotation(prev => ({
        x: prev.x + dx * 0.5,
        y: Math.max(-90, Math.min(90, prev.y - dy * 0.5)),
      }));
    }

    if (isPanning) {
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    }
    
    setLastMousePosition({ x: e.clientX, y: e.clientY });
  }, [isDragging, isPanning, lastMousePosition.x, lastMousePosition.y]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    setZoom(prev => {
        const newZoom = prev - e.deltaY * 0.001;
        return Math.max(0.1, Math.min(5, newZoom));
    });
  }, []);
  
  const handleContextMenu = (e: React.MouseEvent) => e.preventDefault();

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // --- New Handlers for explicit controls ---
  const resetView = useCallback(() => {
    setRotation({ x: -20, y: 20 });
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handlePanClick = (dx: number, dy: number) => {
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const handleZoomSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZoom(parseFloat(e.target.value));
  };
  // --- End New Handlers ---

  // --- Updated Logic: Show model as soon as it's loaded ---
  const showPlaceholder = simulationState === SimulationState.IDLE;
  const showSimulation = simulationState !== SimulationState.IDLE;
  
  return (
    <div 
        ref={viewerRef}
        className="w-full h-full bg-base-100 rounded-lg flex items-center justify-center overflow-hidden relative cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
    >
      {showPlaceholder && (
        <div className="text-center text-base-content/50">
          <CubeIcon className="w-24 h-24 mx-auto mb-4" />
          <p className="font-semibold">Upload a 3D model to begin</p>
        </div>
      )}

      {showSimulation && (
        <>
            <div 
                className="relative w-full h-full"
                style={{ perspective: '1000px' }}
                >
                {/* 3D Model Placeholder */}
                <div 
                    className="absolute w-48 h-48 top-1/2 left-1/2"
                    style={{
                    transform: `translate3d(-50%, -50%, 0) translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom}) rotateX(${rotation.y}deg) rotateY(${rotation.x}deg)`,
                    transformStyle: 'preserve-3d',
                    transition: isDragging || isPanning ? 'none' : 'transform 0.1s ease-out',
                    }}
                >
                    <div className="absolute w-full h-full bg-primary/20 border-2 border-primary rounded-lg flex items-center justify-center text-primary" style={{ transform: 'rotateY(0deg) translateZ(24px)' }}><CubeIcon className="w-16 h-16"/></div>
                </div>
                
                {/* Visualization Overlays */}
                <div 
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    style={{
                        transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                        transition: isDragging || isPanning ? 'none' : 'transform 0.1s ease-out',
                    }}
                >
                    {simulationState === SimulationState.COMPLETED && visualization.streamlines && <StreamlinesOverlay windSpeed={windSpeed} windDirection={windDirection} />}
                    {simulationState === SimulationState.COMPLETED && visualization.velocity && <VelocityOverlay windDirection={windDirection} />}
                    {simulationState === SimulationState.COMPLETED && visualization.pressure && <PressureOverlay windDirection={windDirection} />}
                    {simulationState === SimulationState.COMPLETED && visualization.forces && <ForceOverlay forceCoefficients={forceCoefficients} windDirection={windDirection} />}
                </div>
            </div>

            {/* --- NEW Explicit Viewer Controls --- */}
            <div 
                className="absolute top-2 left-2 bg-base-300/80 text-base-content rounded-lg p-2 flex flex-col items-center gap-2 backdrop-blur-sm shadow-lg"
                onMouseDown={(e) => e.stopPropagation()} // Prevent triggering drag on the parent
                onWheel={(e) => e.stopPropagation()}
            >
                <div className="grid grid-cols-3 gap-1 w-24">
                    <div/>
                    <button onClick={() => handlePanClick(0, -20)} className="p-1 rounded-md hover:bg-base-100 transition-colors" title="Pan Up"><ArrowIcon direction="up" className="w-5 h-5 mx-auto" /></button>
                    <div/>
                    <button onClick={() => handlePanClick(-20, 0)} className="p-1 rounded-md hover:bg-base-100 transition-colors" title="Pan Left"><ArrowIcon direction="left" className="w-5 h-5 mx-auto" /></button>
                    <button onClick={resetView} title="Reset View" className="p-1 rounded-md hover:bg-base-100 transition-colors"><CameraResetIcon className="w-5 h-5 mx-auto" /></button>
                    <button onClick={() => handlePanClick(20, 0)} className="p-1 rounded-md hover:bg-base-100 transition-colors" title="Pan Right"><ArrowIcon direction="right" className="w-5 h-5 mx-auto" /></button>
                    <div/>
                    <button onClick={() => handlePanClick(0, 20)} className="p-1 rounded-md hover:bg-base-100 transition-colors" title="Pan Down"><ArrowIcon direction="down" className="w-5 h-5 mx-auto" /></button>
                    <div/>
                </div>
                <div className="flex items-center gap-2 w-full px-1">
                    <ZoomOutIcon className="w-4 h-4 text-base-content/70" />
                    <input
                        type="range"
                        min="0.2"
                        max="3"
                        step="0.05"
                        value={zoom}
                        onChange={handleZoomSliderChange}
                        className="w-full h-1 bg-base-100 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full"
                        title="Zoom"
                    />
                    <ZoomInIcon className="w-4 h-4 text-base-content/70" />
                </div>
            </div>

            {/* Updated Controls Hint */}
            <div className="absolute bottom-2 right-2 bg-base-300/80 text-base-content/80 text-xs rounded-md p-2 pointer-events-none backdrop-blur-sm animate-[fadeIn_0.5s_ease-in-out]">
                <h4 className="font-bold">Controls</h4>
                <ul className="mt-1">
                    <li><strong className="font-semibold">Rotate:</strong> Left-click + Drag</li>
                    <li><strong className="font-semibold">Pan:</strong> Right-click + Drag</li>
                    <li><strong className="font-semibold">Zoom:</strong> Mouse Wheel</li>
                </ul>
            </div>
        </>
      )}
    </div>
  );
};

export default Viewer;

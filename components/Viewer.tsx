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

  const showPlaceholder = simulationState === SimulationState.IDLE || simulationState === SimulationState.CONFIGURING;
  const showSimulation = simulationState === SimulationState.RUNNING || simulationState === SimulationState.COMPLETED;
  const showControlsHint = simulationState === SimulationState.IDLE || simulationState === SimulationState.CONFIGURING;
  
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
            className="absolute top-0 left-0 w-full h-full"
             style={{
                transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                transition: isDragging || isPanning ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            {visualization.streamlines && <StreamlinesOverlay windSpeed={windSpeed} windDirection={windDirection} />}
            {visualization.velocity && <VelocityOverlay windDirection={windDirection} />}
            {visualization.pressure && <PressureOverlay windDirection={windDirection} />}
            {visualization.forces && <ForceOverlay forceCoefficients={forceCoefficients} windDirection={windDirection} />}
          </div>
        </div>
      )}

      {showControlsHint && (
         <div className="absolute bottom-2 right-2 bg-base-300/80 text-base-content/80 text-xs rounded-md p-2 pointer-events-none backdrop-blur-sm animate-[fadeIn_0.5s_ease-in-out]">
            <h4 className="font-bold">Controls</h4>
            <ul className="mt-1">
                <li><strong className="font-semibold">Rotate:</strong> Left-click + Drag</li>
                <li><strong className="font-semibold">Pan:</strong> Right-click + Drag</li>
                <li><strong className="font-semibold">Zoom:</strong> Mouse Wheel</li>
            </ul>
         </div>
      )}

    </div>
  );
};

export default Viewer;
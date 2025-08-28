import React, { useCallback, useRef } from 'react';
import { SimulationState } from '../types';
import { UploadIcon } from './icons/UploadIcon';
import { PlayIcon } from './icons/PlayIcon';
import { ResetIcon } from './icons/ResetIcon';
import Compass from './Compass';

interface ControlPanelProps {
  simulationState: SimulationState;
  windSpeed: number;
  windDirection: number;
  onModelUpload: (file: File) => void;
  onWindSpeedChange: (speed: number) => void;
  onWindDirectionChange: (direction: number) => void;
  onRunSimulation: () => void;
  onReset: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  simulationState,
  windSpeed,
  windDirection,
  onModelUpload,
  onWindSpeedChange,
  onWindDirectionChange,
  onRunSimulation,
  onReset,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onModelUpload(event.target.files[0]);
    }
  };
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleLoadDemo = useCallback(() => {
    const objContent = `
# Simple Leaf 3D Model by AI Studio
# Vertices
v 0.0 0.0 0.0    # 1 Stem base
v 0.0 5.0 0.0    # 2 Tip

# Top surface
v -1.0 1.5 0.1   # 3 Left 1
v -1.5 3.0 0.15  # 4 Left 2
v 1.0 1.5 0.1    # 5 Right 1
v 1.5 3.0 0.15   # 6 Right 2

# Bottom surface (mirror Z)
v -1.0 1.5 -0.1  # 7 Left 1 bottom
v -1.5 3.0 -0.15 # 8 Left 2 bottom
v 1.0 1.5 -0.1   # 9 Right 1 bottom
v 1.5 3.0 -0.15  # 10 Right 2 bottom

# Top Faces
f 1 3 5
f 3 4 6
f 3 6 5
f 4 2 6

# Bottom Faces
f 1 9 7
f 7 10 8
f 7 9 10
f 8 10 2

# Edge Faces
f 1 7 3
f 1 5 9
f 3 7 8
f 3 8 4
f 5 6 10
f 5 10 9
f 4 8 2
f 6 2 10
    `.trim();
    const blob = new Blob([objContent], { type: 'text/plain' });
    const file = new File([blob], 'leaf_demo.obj', { type: 'text/plain' });
    onModelUpload(file);
  }, [onModelUpload]);

  const isIdle = simulationState === SimulationState.IDLE;
  const isConfiguring = simulationState === SimulationState.CONFIGURING;
  const isRunning = simulationState === SimulationState.RUNNING;

  return (
    <div className="flex flex-col h-full space-y-6">
      <h2 className="text-xl font-bold text-white border-b border-primary/20 pb-2">Simulation Setup</h2>
      
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white mb-2">1. 3D Model</h3>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".stl,.obj,.ply"
          disabled={!isIdle}
        />
        <button
          onClick={handleUploadClick}
          disabled={!isIdle}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary/10 text-primary border-2 border-primary/30 rounded-lg hover:bg-primary/20 hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <UploadIcon className="w-5 h-5" />
          <span>{isIdle ? 'Upload Model' : 'Model Loaded'}</span>
        </button>
        <div className="text-center">
            <span className="text-xs text-base-content/60">or </span>
            <button 
                onClick={handleLoadDemo}
                disabled={!isIdle}
                className="text-xs text-secondary hover:underline disabled:text-base-content/50 disabled:no-underline disabled:cursor-not-allowed"
            >
                load a demo leaf model
            </button>
        </div>
        <p className="text-xs text-center text-base-content/60 pt-1">
          Accepted formats: .stl, .obj, .ply
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">2. Wind Conditions</h3>
        <div className="p-4 bg-base-300/50 rounded-lg">
          <label htmlFor="windSpeed" className="block mb-2 text-sm font-medium">Wind Speed: <span className="font-bold text-primary">{windSpeed.toFixed(1)} m/s</span></label>
          <input
            id="windSpeed"
            type="range"
            min="0.1"
            max="50"
            step="0.1"
            value={windSpeed}
            onChange={(e) => onWindSpeedChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-base-100 rounded-lg appearance-none cursor-pointer"
            disabled={isIdle || isRunning}
          />
        </div>
        <div className="p-4 bg-base-300/50 rounded-lg flex flex-col items-center">
           <label className="block mb-2 text-sm font-medium">Wind Direction: <span className="font-bold text-primary">{windDirection}°</span></label>
           <Compass direction={windDirection} setDirection={onWindDirectionChange} disabled={isIdle || isRunning} />
        </div>
      </div>

      <div className="flex-grow"></div>

      <div className="space-y-3 pt-4 border-t border-primary/20">
        <button
          onClick={onRunSimulation}
          disabled={!isConfiguring}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-success/80 text-white font-bold rounded-lg hover:bg-success transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlayIcon className="w-5 h-5"/>
          <span>Run Simulation</span>
        </button>
         <button
          onClick={onReset}
          disabled={isRunning}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-neutral/50 text-base-content font-semibold rounded-lg hover:bg-neutral/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ResetIcon className="w-5 h-5"/>
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
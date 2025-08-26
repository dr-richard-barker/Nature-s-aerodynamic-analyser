
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
        <p className="text-xs text-center text-base-content/60">
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

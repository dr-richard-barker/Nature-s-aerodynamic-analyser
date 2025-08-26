
import React, { useEffect, useRef } from 'react';
import { SimulationState } from '../types';

interface StatusPanelProps {
  simulationState: SimulationState;
  progress: number;
  log: string[];
}

const StatusPanel: React.FC<StatusPanelProps> = ({ simulationState, progress, log }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [log]);

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-lg font-bold text-white mb-2">Simulation Status</h3>
      <div className="mb-3">
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-primary bg-primary/20">
                {simulationState}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-primary">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-base-100">
            <div
              style={{ width: `${progress}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary transition-all duration-500"
            ></div>
          </div>
        </div>
      </div>
      <div 
        ref={logContainerRef}
        className="flex-grow bg-base-100 rounded-md p-2 text-xs font-mono overflow-y-auto"
      >
        {log.map((entry, index) => (
          <p key={index} className="whitespace-pre-wrap">{`> ${entry}`}</p>
        ))}
      </div>
    </div>
  );
};

export default StatusPanel;

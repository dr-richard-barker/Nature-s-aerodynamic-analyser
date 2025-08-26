import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SimulationState, VisualizationOptions } from './types';
import { generateAnalysis } from './services/geminiService';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import Viewer from './components/Viewer';
import StatusPanel from './components/StatusPanel';
import ResultsPanel from './components/ResultsPanel';

const App: React.FC = () => {
  const [simulationState, setSimulationState] = useState<SimulationState>(SimulationState.IDLE);
  const [model, setModel] = useState<{ name: string } | null>(null);
  const [windSpeed, setWindSpeed] = useState<number>(10);
  const [windDirection, setWindDirection] = useState<number>(0);
  const [simulationProgress, setSimulationProgress] = useState<number>(0);
  const [simulationLog, setSimulationLog] = useState<string[]>([]);
  const [visualization, setVisualization] = useState<VisualizationOptions>({
    pressure: false,
    velocity: false,
    streamlines: true,
    forces: false,
  });
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState<boolean>(false);

  const handleModelUpload = (file: File) => {
    setModel({ name: file.name });
    setSimulationState(SimulationState.CONFIGURING);
    setSimulationLog(['Model loaded: ' + file.name]);
    setAnalysisResult('');
    setVisualization({ pressure: false, velocity: false, streamlines: true, forces: false });
  };
  
  const handleRunSimulation = useCallback(() => {
    if (simulationState !== SimulationState.CONFIGURING) return;
    
    setSimulationState(SimulationState.RUNNING);
    setSimulationProgress(0);
    setAnalysisResult('');
    setSimulationLog(prev => [...prev, 'Starting simulation...']);
  }, [simulationState]);
  
  useEffect(() => {
    let interval: ReturnType<typeof setTimeout>;
    if (simulationState === SimulationState.RUNNING && simulationProgress < 100) {
      const logMessages = [
        'Generating computational domain...',
        'Performing automated meshing...',
        'Applying boundary conditions...',
        'Initializing solver...',
        'Iterating solution (Step 1)...',
        'Iterating solution (Step 2)...',
        'Converging solution...',
        'Post-processing results...',
        'Finalizing simulation...'
      ];

      interval = setInterval(() => {
        setSimulationProgress(prev => {
          const next = prev + 5;
          const logIndex = Math.floor((next-1) / (100 / logMessages.length));
          if (next > prev && logIndex < logMessages.length && !simulationLog.includes(logMessages[logIndex])) {
              setSimulationLog(prevLog => [...prevLog, logMessages[logIndex]]);
          }
          if (next >= 100) {
            clearInterval(interval);
            setSimulationState(SimulationState.COMPLETED);
            setSimulationLog(prevLog => [...prevLog, 'Simulation completed successfully.']);
            return 100;
          }
          return next;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [simulationState, simulationProgress, simulationLog]);

  const handleGenerateAnalysis = async () => {
    if (!model) return;
    setIsGeneratingAnalysis(true);
    setAnalysisResult('');
    try {
      const result = await generateAnalysis({
        objectName: model.name.split('.')[0] || 'the object',
        windSpeed,
        windDirection,
        visualization,
      });
      setAnalysisResult(result);
    } catch (error) {
      console.error('Error generating analysis:', error);
      setAnalysisResult('An error occurred while generating the analysis. Please check the console.');
    } finally {
      setIsGeneratingAnalysis(false);
    }
  };

  const handleReset = () => {
    setSimulationState(SimulationState.IDLE);
    setModel(null);
    setWindSpeed(10);
    setWindDirection(0);
    setSimulationProgress(0);
    setSimulationLog([]);
    setVisualization({ pressure: false, velocity: false, streamlines: true, forces: false });
    setAnalysisResult('');
  };

  const forceCoefficients = useMemo(() => {
    if (!analysisResult) return { cd: null, cl: null };

    const cdRegex = /(?:drag coefficient \(Cd\)|Cd)\s*[:≈≈~]?\s*(-?\d+(?:\.\d+)?)/i;
    const clRegex = /(?:lift coefficient \(Cl\)|Cl)\s*[:≈≈~]?\s*(-?\d+(?:\.\d+)?)/i;

    const cdMatch = analysisResult.match(cdRegex);
    const clMatch = analysisResult.match(clRegex);

    return {
      cd: cdMatch ? parseFloat(cdMatch[1]) : null,
      cl: clMatch ? parseFloat(clMatch[1]) : null,
    };
  }, [analysisResult]);


  return (
    <div className="min-h-screen bg-base-300 text-base-content font-sans">
      <Header />
      <main className="p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-80px)]">
        <div className="lg:col-span-3 bg-base-200/50 rounded-lg shadow-lg p-6 overflow-y-auto">
          <ControlPanel
            simulationState={simulationState}
            windSpeed={windSpeed}
            windDirection={windDirection}
            onModelUpload={handleModelUpload}
            onWindSpeedChange={setWindSpeed}
            onWindDirectionChange={setWindDirection}
            onRunSimulation={handleRunSimulation}
            onReset={handleReset}
          />
        </div>

        <div className="lg:col-span-6 flex flex-col gap-6">
          <div className="flex-grow bg-base-200/50 rounded-lg shadow-lg p-4 flex items-center justify-center">
             <Viewer 
                simulationState={simulationState} 
                visualization={visualization} 
                analysisResult={analysisResult} 
                forceCoefficients={forceCoefficients}
                windSpeed={windSpeed}
                windDirection={windDirection}
            />
          </div>
          <div className="h-48 bg-base-200/50 rounded-lg shadow-lg p-4">
            <StatusPanel 
              simulationState={simulationState}
              progress={simulationProgress}
              log={simulationLog}
            />
          </div>
        </div>

        <div className="lg:col-span-3 bg-base-200/50 rounded-lg shadow-lg p-6 overflow-y-auto">
           <ResultsPanel
              simulationState={simulationState}
              visualization={visualization}
              onVisualizationChange={setVisualization}
              analysisResult={analysisResult}
              isGeneratingAnalysis={isGeneratingAnalysis}
              onGenerateAnalysis={handleGenerateAnalysis}
              forceCoefficients={forceCoefficients}
            />
        </div>
      </main>
    </div>
  );
};

export default App;

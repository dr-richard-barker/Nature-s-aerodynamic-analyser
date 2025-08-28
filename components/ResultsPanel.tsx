import React, { useCallback, useMemo } from 'react';
import { SimulationState, VisualizationOptions } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { DownloadIcon } from './icons/DownloadIcon';

// --- Visualization Icons ---
const StreamlineIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path d="M3 6s4-1 8-1 8 1 8 1"/>
    <path d="M3 12s4-1 8-1 8 1 8 1"/>
    <path d="M3 18s4-1 8-1 8 1 8 1"/>
  </svg>
);

const VelocityVectorIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path d="M4 12h16m-4-4l4 4-4 4"/>
    <path d="M4 6h10m-2-2l2 2-2 2"/>
    <path d="M4 18h13m-3-2l3 2-3 2"/>
  </svg>
);

const PressureContourIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>
    <path d="M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z"/>
    <path d="M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
  </svg>
);

const ForcesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path d="M2 12c4-3 10-3 16-1l4-1"/>
    <path d="M12 11V3m-2 2l2-2 2 2"/>
    <path d="M18 11h4m-2-2l2 2-2 2"/>
  </svg>
);
// --- End Visualization Icons ---

interface ForceCoefficients {
  cd: number | null;
  cl: number | null;
}

interface ResultsPanelProps {
  simulationState: SimulationState;
  visualization: VisualizationOptions;
  onVisualizationChange: (viz: VisualizationOptions) => void;
  analysisResult: string;
  isGeneratingAnalysis: boolean;
  onGenerateAnalysis: () => void;
  forceCoefficients: ForceCoefficients;
}

const ToggleButton: React.FC<{ label: string; icon: React.ReactNode; active: boolean; onClick: () => void }> = ({ label, icon, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 text-left px-3 py-2 text-sm rounded-md transition-colors ${
      active ? 'bg-primary text-black font-semibold' : 'bg-base-300/50 hover:bg-base-300'
    }`}
  >
    <span className={`w-5 h-5 ${active ? 'text-black/70' : 'text-primary'}`}>{icon}</span>
    <span>{label}</span>
  </button>
);

const DataRow: React.FC<{ label: string; value: string | number | null; unit?: string; title?: string; colorClass?: string }> = ({ label, value, unit, title, colorClass = 'text-info' }) => (
    <div className="flex justify-between items-center py-0.5" title={title}>
        <span className="text-base-content">{label}:</span>
        {value !== null && value !== undefined ? (
            <span className={`font-mono font-bold ${colorClass}`}>
                {typeof value === 'number' ? value.toFixed(3) : value}
                {unit && <span className="text-xs font-sans opacity-70"> {unit}</span>}
            </span>
        ) : (
            <span className="font-mono text-base-content/50" title="Value not found in analysis text">N/A</span>
        )}
    </div>
);

/**
 * A simple markdown renderer that handles headings, paragraphs, lists, and bold text.
 */
const renderMarkdown = (text: string) => {
  if (!text) return null;

  const renderInline = (line: string): React.ReactNode => {
    return (
      <React.Fragment>
        {line.split(/(\*\*.*?\*\*)/g).map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index}>{part.slice(2, -2)}</strong>;
          }
          return part;
        })}
      </React.Fragment>
    );
  };

  const elements: React.ReactNode[] = [];
  let currentListItems: string[] = [];

  const flushList = () => {
    if (currentListItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc list-inside my-2 pl-2">
          {currentListItems.map((item, index) => (
            <li key={index}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      currentListItems = [];
    }
  };

  text.split('\n').forEach((line, index) => {
    if (line.startsWith('### ')) {
      flushList();
      elements.push(<h3 key={index} className="text-secondary mt-4 mb-2">{renderInline(line.substring(4))}</h3>);
    } else if (line.startsWith('## ')) {
      flushList();
      elements.push(<h2 key={index} className="text-primary mt-4 mb-2">{renderInline(line.substring(3))}</h2>);
    } else if (line.startsWith('# ')) {
      flushList();
      elements.push(<h1 key={index} className="mt-4 mb-2">{renderInline(line.substring(2))}</h1>);
    } else if (line.startsWith('- ')) {
      currentListItems.push(line.substring(2));
    } else if (line.trim()) {
      flushList();
      elements.push(<p key={index}>{renderInline(line)}</p>);
    } else {
      flushList(); // An empty line breaks a list
    }
  });

  flushList(); // Flush any remaining list items at the end

  return elements;
};

const AnalysisSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse p-2">
    <div className="h-4 bg-base-300 rounded w-1/3"></div>
    <div className="space-y-3 pt-2">
      <div className="h-3 bg-base-300 rounded w-full"></div>
      <div className="h-3 bg-base-300 rounded w-5/6"></div>
      <div className="h-3 bg-base-300 rounded w-full"></div>
    </div>
    <div className="h-4 bg-base-300 rounded w-1/4 mt-6"></div>
     <div className="space-y-3 pt-2">
      <div className="h-3 bg-base-300 rounded w-full"></div>
      <div className="h-3 bg-base-300 rounded w-4/6"></div>
    </div>
  </div>
);


const ResultsPanel: React.FC<ResultsPanelProps> = ({
  simulationState,
  visualization,
  onVisualizationChange,
  analysisResult,
  isGeneratingAnalysis,
  onGenerateAnalysis,
  forceCoefficients,
}) => {
  if (simulationState !== SimulationState.COMPLETED) {
    return (
      <div className="flex items-center justify-center h-full text-base-content/70">
        <p>Complete a simulation to view results.</p>
      </div>
    );
  }

  const handleVisualizationToggle = (activeViz: keyof VisualizationOptions) => {
    onVisualizationChange({
      streamlines: activeViz === 'streamlines',
      pressure: activeViz === 'pressure',
      velocity: activeViz === 'velocity',
      forces: activeViz === 'forces',
    });
  };

  const pressureData = useMemo(() => {
    if (!analysisResult) return { peakGaugePressure: null, peakNegativePressure: null };

    const gaugeRegex = /(?:peak gauge pressure)\s*.*?(-?\d+(?:\.\d+)?)\s*Pa/i;
    const negativeRegex = /(?:peak negative pressure)\s*.*?(-?\d+(?:\.\d+)?)\s*Pa/i;

    const gaugeMatch = analysisResult.match(gaugeRegex);
    const negativeMatch = analysisResult.match(negativeRegex);

    return {
        peakGaugePressure: gaugeMatch ? parseFloat(gaugeMatch[1]).toFixed(2) : null,
        peakNegativePressure: negativeMatch ? parseFloat(negativeMatch[1]).toFixed(2) : null,
    };
  }, [analysisResult]);

  const { cd, cl } = forceCoefficients;
  const liftToDragRatio = cd !== null && cl !== null && cd !== 0 ? cl / cd : null;
  
  const hasQuantData = cd !== null || cl !== null || pressureData.peakGaugePressure !== null || pressureData.peakNegativePressure !== null;

  const handleExportCSV = useCallback(() => {
    const data: [string, string | number | null][] = [
      ['Drag Coefficient (Cd)', cd],
      ['Lift Coefficient (Cl)', cl],
      ['L/D Ratio', liftToDragRatio ? liftToDragRatio.toFixed(3) : null],
      ['Peak Gauge Pressure (Pa)', pressureData.peakGaugePressure],
      ['Peak Negative Pressure (Pa)', pressureData.peakNegativePressure],
    ];

    const filteredData = data.filter(([, value]) => value !== null && value !== undefined);

    if (filteredData.length === 0) {
      alert("No quantitative data found in the analysis to export. Try generating an analysis focused on 'Aerodynamic Forces' or 'Pressure Contours' for more data.");
      return;
    }

    const headers = ["Parameter", "Value"];
    const csvRows = [
        headers.join(','),
        ...filteredData.map(([key, value]) => `"${key}",${value}`)
    ];
    const csvString = csvRows.join('\n');
    
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "simulation_analysis_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [cd, cl, liftToDragRatio, pressureData]);

  const hasExportableData = hasQuantData;

  return (
    <div className="flex flex-col h-full space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white border-b border-primary/20 pb-2 mb-4">Results Visualization</h2>
        <div className="space-y-2">
          <ToggleButton
            label="Streamlines"
            icon={<StreamlineIcon />}
            active={visualization.streamlines}
            onClick={() => handleVisualizationToggle('streamlines')}
          />
          <ToggleButton
            label="Velocity Vectors"
            icon={<VelocityVectorIcon />}
            active={visualization.velocity}
            onClick={() => handleVisualizationToggle('velocity')}
          />
          <ToggleButton
            label="Pressure Contours"
            icon={<PressureContourIcon />}
            active={visualization.pressure}
            onClick={() => handleVisualizationToggle('pressure')}
          />
          <ToggleButton
            label="Aerodynamic Forces"
            icon={<ForcesIcon />}
            active={visualization.forces}
            onClick={() => handleVisualizationToggle('forces')}
          />
        </div>

        {visualization.pressure && analysisResult && !isGeneratingAnalysis && (() => {
            const hasPressureData = pressureData.peakGaugePressure !== null || pressureData.peakNegativePressure !== null;
            if (!hasPressureData) return null;
            
            return (
              <div className="mt-4 p-3 bg-base-100 rounded-lg animate-[fadeIn_0.3s_ease-in-out]">
                  <h4 className="text-sm font-semibold text-white mb-2">Pressure Summary</h4>
                  <div className="space-y-1 text-xs">
                      <DataRow label="Peak Gauge Pressure" value={pressureData.peakGaugePressure} unit="Pa" colorClass="text-success" />
                      <DataRow label="Peak Negative Pressure" value={pressureData.peakNegativePressure} unit="Pa" colorClass="text-warning" />
                  </div>
              </div>
            );
        })()}

        {visualization.forces && analysisResult && !isGeneratingAnalysis && (() => {
            const hasCoefficients = cd !== null || cl !== null;
            if (!hasCoefficients) return null;
            
            const maxAbsCoeff = Math.max(Math.abs(cd ?? 0), Math.abs(cl ?? 0), 0.1);
            const getBarWidth = (val: number | null) => {
                if (val === null) return '0%';
                return `${(Math.abs(val) / maxAbsCoeff) * 100}%`;
            };

            return (
              <div className="mt-4 p-3 bg-base-100 rounded-lg animate-[fadeIn_0.3s_ease-in-out]">
                  <h4 className="text-sm font-semibold text-white mb-2">Force Comparison</h4>
                  <div className="space-y-2 text-xs font-mono">
                      {cd !== null && (
                          <div className="grid grid-cols-[5rem_1fr] items-center gap-2">
                              <span className="text-base-content truncate" title="Drag (Cd)">Drag (Cd)</span>
                              <div className="flex-1 bg-base-300/50 rounded-sm h-5 p-0.5">
                                  <div 
                                      className="bg-info h-full rounded-sm text-right px-2 text-black text-xs font-bold flex items-center justify-end transition-all duration-500"
                                      style={{ width: getBarWidth(cd) }}
                                  >
                                      <span>{cd.toFixed(3)}</span>
                                  </div>
                              </div>
                          </div>
                      )}
                      {cl !== null && (
                          <div className="grid grid-cols-[5rem_1fr] items-center gap-2">
                              <span className="text-base-content truncate" title={cl >= 0 ? 'Lift (Cl)' : 'Downforce (Cl)'}>
                                  {cl >= 0 ? 'Lift (Cl)' : 'Downforce (Cl)'}
                              </span>
                              <div className="flex-1 bg-base-300/50 rounded-sm h-5 p-0.5">
                                  <div
                                      className="bg-secondary h-full rounded-sm text-right px-2 text-black text-xs font-bold flex items-center justify-end transition-all duration-500"
                                      style={{ width: getBarWidth(cl) }}
                                  >
                                      <span>{cl.toFixed(3)}</span>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          )})()}
      </div>

      <div className="flex-grow flex flex-col">
        <div className="flex justify-between items-center border-b border-primary/20 pb-2 mb-4">
            <h2 className="text-xl font-bold text-white">AI Analysis</h2>
            <button
              onClick={handleExportCSV}
              disabled={!hasExportableData || isGeneratingAnalysis}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-neutral/60 text-base-content rounded-md hover:bg-neutral/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export Data as CSV"
            >
              <DownloadIcon className="w-4 h-4"/>
              <span>Export</span>
            </button>
        </div>
        
        {analysisResult && !isGeneratingAnalysis && hasQuantData && (
          <div className="mb-4 p-3 bg-base-100 rounded-lg animate-[fadeIn_0.3s_ease-in-out]">
            <h4 className="text-sm font-semibold text-white mb-2">Quantitative Summary</h4>
            <div className="space-y-1 text-xs">
              <DataRow label="Drag Coefficient (Cd)" value={cd} title="A measure of air resistance. Lower is generally better." colorClass="text-info"/>
              <DataRow label="Lift Coefficient (Cl)" value={cl} title="Positive for upward lift, negative for downforce." colorClass="text-secondary"/>
              <div className="border-t border-primary/10 pt-1 mt-1">
                 <DataRow label="L/D Ratio" value={liftToDragRatio !== null ? liftToDragRatio.toFixed(2) : null} title="Lift-to-Drag Ratio: A key indicator of aerodynamic efficiency." colorClass="text-accent"/>
              </div>
              <div className="border-t border-primary/10 pt-1 mt-1">
                  <DataRow label="Peak Gauge Pressure" value={pressureData.peakGaugePressure} unit="Pa" colorClass="text-success" />
                  <DataRow label="Peak Negative Pressure" value={pressureData.peakNegativePressure} unit="Pa" colorClass="text-warning" />
              </div>
            </div>
          </div>
        )}

        <button
          onClick={onGenerateAnalysis}
          disabled={isGeneratingAnalysis}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-4 bg-secondary/80 text-white font-bold rounded-lg hover:bg-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <SparklesIcon className={`w-5 h-5 ${isGeneratingAnalysis ? 'animate-pulse' : ''}`}/>
          <span>{isGeneratingAnalysis ? 'Generating...' : 'Generate Analysis'}</span>
        </button>
        <div className="flex-grow bg-base-100 rounded-md p-3 text-sm overflow-y-auto prose prose-invert prose-sm max-w-none prose-p:text-base-content prose-headings:text-white">
          {isGeneratingAnalysis && <AnalysisSkeleton />}
          {!isGeneratingAnalysis && !analysisResult && <p className="text-base-content/70">Click the button above to generate an AI-powered analysis of the simulation results.</p>}
          {analysisResult && renderMarkdown(analysisResult)}
        </div>
      </div>
    </div>
  );
};

export default ResultsPanel;
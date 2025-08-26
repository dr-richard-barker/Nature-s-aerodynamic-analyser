
export enum SimulationState {
  IDLE = 'IDLE',
  CONFIGURING = 'CONFIGURING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface VisualizationOptions {
  pressure: boolean;
  velocity: boolean;
  streamlines: boolean;
  forces: boolean;
}
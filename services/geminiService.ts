import { GoogleGenAI } from "@google/genai";
import { VisualizationOptions } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface AnalysisParams {
  objectName: string;
  windSpeed: number;
  windDirection: number;
  visualization: VisualizationOptions;
}

export const generateAnalysis = async ({ objectName, windSpeed, windDirection, visualization }: AnalysisParams): Promise<string> => {
  let activeVisualization = 'streamlines';
  if (visualization.pressure) activeVisualization = 'pressure';
  else if (visualization.velocity) activeVisualization = 'velocity';
  else if (visualization.forces) activeVisualization = 'forces';

  let visualizationContext = '';
  let currentTopic = 'flow';

  switch(activeVisualization) {
    case 'pressure':
      currentTopic = 'pressure';
      // Dynamic pressure q = 0.5 * rho * v^2 (using standard air density)
      const dynamicPressure = 0.5 * 1.225 * Math.pow(windSpeed, 2);
      visualizationContext = `The current visualization shows **Pressure Contours**. Your primary analysis should focus on this.
      - **Pressure Zone Identification:** Specifically identify and explain the likely locations of high-pressure (stagnation points) and low-pressure zones. Explain *why* these zones form on the "${objectName}" based on its geometry and the airflow direction.
      - **Quantitative Pressure Analysis:** Provide an estimated peak gauge pressure value at the primary stagnation point. This value should be close to the theoretical dynamic pressure of **${dynamicPressure.toFixed(2)} Pa**. Also, estimate the peak negative pressure in the low-pressure zones, explaining how flow acceleration causes this drop.
      - **Pressure Gradients and Forces:** Discuss how the observed pressure gradients (the differences in pressure between the high and low-pressure zones) across the surface generate the overall aerodynamic forces. Explain how this pressure distribution directly contributes to both pressure drag and lift/downforce on the "${objectName}".`;
      break;
    case 'velocity':
      currentTopic = 'flow';
      visualizationContext = `The current visualization shows **Velocity Vectors**. Your primary analysis should focus on this, providing a detailed breakdown of the fluid's motion.
      - **Flow Acceleration & Deceleration:** Pinpoint and describe specific regions where the airflow accelerates (e.g., over curved surfaces) and decelerates. Explain the aerodynamic principles behind these changes (e.g., the Venturi effect).
      - **Boundary Layer Analysis:** Discuss the boundary layer forming on the surface of the "${objectName}". Speculate on whether the flow within the boundary layer is likely to be laminar or turbulent, and explain why.
      - **Impact on the Object:** Analyze how these velocity variations and boundary layer behaviors directly impact the object. For instance, connect flow acceleration to low-pressure areas (potential for lift) and deceleration to high-pressure or flow separation points, which contribute to pressure drag.`;
      break;
    case 'forces':
      currentTopic = 'forces';
      visualizationContext = `The current visualization is for **Aerodynamic Forces**. Your primary analysis should focus on this.
      - **Detailed Force Analysis:** Elaborate on the concepts of drag and lift as they apply to the "${objectName}". Explain the primary sources of drag (e.g., pressure drag from shape, skin friction drag from surface roughness) and what features might generate lift.
      - **Quantitative Coefficient Estimates:** Provide a plausible quantitative estimate for the drag coefficient (Cd) and lift coefficient (Cl) for the "${objectName}" under these conditions. For example, "Cd ≈ 0.5" or "Cl ≈ -0.1". Justify your estimates based on the object's likely shape and orientation to the flow.`;
      break;
    case 'streamlines':
    default:
       currentTopic = 'flow';
       visualizationContext = `The current visualization shows **Streamlines**. Your primary analysis should focus on this.
      - **Detailed Flow Pattern Analysis:** Describe the overall flow pattern indicated by the streamlines. Explain the concepts of flow attachment, separation points, and the formation and characteristics of the wake region behind the "${objectName}".`;
      break;
  }
  
  const secondaryTopics: string[] = [];
  if (currentTopic !== 'pressure') secondaryTopics.push('Pressure Distribution');
  if (currentTopic !== 'flow') secondaryTopics.push('Flow Pattern (separation, wake, etc.)');
  if (currentTopic !== 'forces') secondaryTopics.push('Key Aerodynamic Forces (drag and lift)');

  let secondaryAnalysisPrompt = '';
  if (secondaryTopics.length > 0) {
    secondaryAnalysisPrompt = `
In a secondary section, please provide a **brief summary** of the following topics not covered in the primary analysis:
- ${secondaryTopics.join('\n- ')}
`
  }

  const prompt = `
    You are an expert in computational fluid dynamics (CFD) and aerodynamics.
    A simulation was performed on a 3D model of a "${objectName}".
    The simulation parameters are:
    - Wind Speed: ${windSpeed} m/s
    - Wind Direction: Airflow is coming from ${windDirection} degrees (where 0 is from the North).

    ${visualizationContext}

    ${secondaryAnalysisPrompt}

    Please structure your response in markdown format. Keep the language accessible to students, researchers in biology, and enthusiasts, avoiding overly technical jargon where possible.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API call failed:", error);
    return "Error: Could not generate analysis from the AI model.";
  }
};
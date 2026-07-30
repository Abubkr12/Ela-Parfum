export type RefillMode = 'ai' | 'gambar' | 'custom';

export type WizardStep = 
  | 'method'    // Step 0: Choose method
  | 'input'     // Step 1: Provide input (prompt/image/bibit selection)
  | 'analyzing' // Step 1.5: Loading state while AI analyzes
  | 'result'    // Step 2: AI analysis result
  | 'ratio'     // Step 3: Choose ratio
  | 'bottle'    // Step 4: Choose bottle
  | 'summary';  // Step 5: Price calculation & confirm

export interface BibitData {
  id: number;
  name: string;
  slug: string;
  collection: string; // 'Global Parfume' | 'Arabian Parfume'
  intensity: string;
  main_accord: string;
  price_per_ml: number;
  top_notes: any[];
  middle_notes: any[];
  base_notes: any[];
}

export interface BottleData {
  id: number;
  name: string;
  capacity_ml: number;
  price: number;
  image_url: string | null;
  is_active: boolean;
}

export interface AiAnalysis {
  predicted_notes: { top: string[]; middle: string[]; base: string[] };
  predicted_intensity: string;
  description: string;
  reasoning: string;
  confidence: number;
}

export interface WizardState {
  mode: RefillMode | null;
  step: WizardStep;
  // Input data
  prompt: string;
  imageBase64: string | null;
  selectedBibits: BibitData[];
  // AI result
  recommendedBibit: BibitData | null;
  analysis: AiAnalysis | null;
  // Selections
  ratio: '50/50' | '70/30' | null;
  selectedBottle: BottleData | null;
  // Loading/error
  loading: boolean;
  error: string | null;
}

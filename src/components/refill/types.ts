export type RefillMode = 'ai' | 'gambar' | 'custom';

export type WizardStep = 
  | 'method'        // Step 0: Choose method
  | 'input'         // Step 1: Provide input (prompt/image/bibit selection)
  | 'analyzing'     // Step 1.5: Loading state while AI analyzes
  | 'result'        // Step 2: AI analysis result
  | 'ratio'         // Step 3: Choose ratio
  | 'bottle_choice' // Step 4: Choose bottle type (ours vs own)
  | 'bottle'        // Step 5: Choose bottle (if using ours)
  | 'summary';      // Step 6: Price calculation & confirm

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
  custom_name?: string;
  technical_recipe?: string;
  predicted_notes: { top: string[]; middle: string[]; base: string[] };
  predicted_intensity: string;
  description: string;
  reasoning: string;
  confidence: number;
  blend_verdict?: string;
  blend_warning?: string;
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
  ratio: '30/70' | '50/50' | '70/30' | '100/0' | null;
  useOwnBottle: boolean;
  ownBottleVolumeMl: number;
  selectedBottle: BottleData | null;
  // Loading/error
  loading: boolean;
  error: string | null;
}

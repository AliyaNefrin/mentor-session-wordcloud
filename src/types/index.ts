export interface WordItem {
  text: string;
  value: number; // Normalized prominence weight (e.g. 10 - 100)
  rawCount?: number;
  category?: 'core_topic' | 'concept' | 'action' | 'keyword';
}

export interface AnalysisResult {
  id: string;
  title: string;
  transcript: string;
  words: WordItem[];
  summary?: string;
  audioDurationSeconds?: number;
  providerUsed: string;
  createdAt: number;
}

export type ProcessingStage =
  | 'idle'
  | 'validating'
  | 'uploading'
  | 'transcribing'
  | 'extracting'
  | 'rendering'
  | 'complete'
  | 'error';

export interface ProgressState {
  stage: ProcessingStage;
  percent: number;
  message: string;
  detail?: string;
}

export type CloudShape = 'rectangle' | 'oval' | 'cloud' | 'diamond';

export type ColorTheme = 'aurora' | 'emerald' | 'sunset' | 'indigo' | 'slate';

export interface CloudCustomization {
  theme: ColorTheme;
  shape: CloudShape;
  fontFamily: string;
}

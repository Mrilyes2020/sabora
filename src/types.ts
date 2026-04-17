export interface AnalysisResult {
  topic: string;
  subject: string;
  latex: string;
  organized: string;
  summary: string;
  exercises: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  imageUrl: string | null;
  audioUrl?: string;
  result: AnalysisResult;
}

export interface AnalysisOptions {
  fullLatex: boolean;
  organizedLesson: boolean;
  arabicExplanation: boolean;
  suggestedExercises: boolean;
  summary: boolean;
}

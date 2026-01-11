
export interface AnalysisResult {
  topic: string;
  topicType?: string;
  keyPoints: string[];
  suggestedTopics?: string[];
}

export interface SEOResult {
  titles: string[];
  description: string;
  hashtags: string[];
  keywords: string;
  thumbnailPrompt: string;
  thumbnailTextIdeas: string[];
}

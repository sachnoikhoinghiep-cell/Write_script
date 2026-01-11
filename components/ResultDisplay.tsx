
import React, { useState } from 'react';
import type { AnalysisResult } from '../types';
import { CopyButton } from './CopyButton';
import { LanguageSelector } from './LanguageSelector';
import { KeyPointIcon, ScriptIcon, TranslateIcon, BrushIcon, CopyIcon, CheckIcon } from './icons';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';

interface ResultDisplayProps {
  result: AnalysisResult;
  translatedResult: AnalysisResult | null;
  onTranslate: () => void;
  isTranslating: boolean;
  targetLanguage: string;
  onLanguageChange: (lang: string) => void;
  translationError: string | null;
  onGoToScriptWriter: () => void;
  onSelectSuggestedTopic: (topic: string) => void;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({
  result,
  translatedResult,
  onTranslate,
  isTranslating,
  targetLanguage,
  onLanguageChange,
  translationError,
  onGoToScriptWriter,
  onSelectSuggestedTopic
}) => {
  const [topicsCopied, setTopicsCopied] = useState(false);
  const keyPointsText = result.keyPoints.map(point => `- ${point}`).join('\n');
  const translatedKeyPointsText = translatedResult?.keyPoints.map(point => `- ${point}`).join('\n') ?? '';

  // Use translated suggested topics if available, otherwise original
  const suggestedTopicsToDisplay = translatedResult?.suggestedTopics || result.suggestedTopics || [];

  const handleCopyAllTopics = () => {
    if (suggestedTopicsToDisplay.length === 0) return;
    const textToCopy = suggestedTopicsToDisplay.map((topic, index) => `${index + 1}. ${topic}`).join('\n');
    navigator.clipboard.writeText(textToCopy).then(() => {
      setTopicsCopied(true);
      setTimeout(() => setTopicsCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-8">
      {/* Original Results */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-3">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-sky-400">Chủ Đề</h2>
            {result.topicType && (
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mt-1">
                Kiểu: {result.topicType}
              </span>
            )}
          </div>
          <CopyButton textToCopy={result.topic} />
        </div>
        <p className="text-slate-300 text-lg font-medium">{result.topic}</p>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-sky-400">
            {result.keyPoints.length > 8 ? 'Dàn Ý Chi Tiết' : 'Các Điểm Cốt Lõi'}
          </h2>
          <CopyButton textToCopy={keyPointsText} />
        </div>
        <ul className="space-y-3">
          {result.keyPoints.map((point, index) => (
            <li key={index} className="flex items-start">
              <span className="text-sky-400 mr-3 mt-1"><KeyPointIcon /></span>
              <span className="text-slate-300 leading-relaxed">{point}</span>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Suggested Topics Section */}
      {suggestedTopicsToDisplay.length > 0 && (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <BrushIcon />
              <span>Đề xuất các chủ đề tiếp theo</span>
            </h3>
            <button
              onClick={handleCopyAllTopics}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
                topicsCopied 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600'
              }`}
            >
              {topicsCopied ? <CheckIcon /> : <CopyIcon />}
              {topicsCopied ? 'Đã sao chép' : 'Sao chép tất cả'}
            </button>
          </div>
          <p className="text-sm text-slate-400 mb-6">Nhấp vào một chủ đề để AI tự động phân tích kiểu chủ đề và đề xuất dàn ý phát triển nội dung mới.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {suggestedTopicsToDisplay.map((topic, index) => (
              <button
                key={index}
                onClick={() => onSelectSuggestedTopic(topic)}
                className="text-left p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-sky-500/50 rounded-xl transition-all duration-300 group shadow-sm hover:shadow-sky-500/10"
              >
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-sky-500/10 flex items-center justify-center text-[10px] font-bold text-sky-400 border border-sky-500/20 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                    {index + 1}
                  </span>
                  <span className="text-slate-300 group-hover:text-white font-medium text-sm leading-snug">
                    {topic}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Translation Section */}
      <div className="border-t-2 border-slate-700/50 pt-8 mt-8">
         <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-800 p-4 rounded-lg">
            <h3 className="text-xl font-semibold text-slate-300 flex items-center gap-2 flex-shrink-0">
                <TranslateIcon />
                <span>Dịch Kết Quả</span>
            </h3>
            <div className="w-full sm:w-auto flex-grow">
              <LanguageSelector 
                value={targetLanguage}
                onChange={onLanguageChange}
                disabled={isTranslating}
              />
            </div>
            <button
                onClick={onTranslate}
                disabled={isTranslating}
                className="w-full sm:w-auto px-6 py-2.5 bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:bg-sky-700 disabled:bg-slate-700 disabled:cursor-not-allowed disabled:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-sky-500"
            >
                {isTranslating ? 'Đang dịch...' : 'Dịch'}
            </button>
        </div>
        {translationError && <div className="mt-4"><ErrorDisplay message={translationError} /></div>}
        {isTranslating && <LoadingSpinner />}
        {translatedResult && !isTranslating && (
          <div className="mt-8 space-y-8 animate-fade-in">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div className="flex flex-col">
                    <h2 className="text-2xl font-bold text-green-400">Chủ Đề (Đã dịch)</h2>
                    {translatedResult.topicType && (
                      <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mt-1">
                        Kiểu: {translatedResult.topicType}
                      </span>
                    )}
                  </div>
                  <CopyButton textToCopy={translatedResult.topic} />
                </div>
                <p className="text-slate-300 text-lg font-medium">{translatedResult.topic}</p>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-start gap-4 mb-4">
                  <h2 className="text-2xl font-bold text-green-400">
                    {translatedResult.keyPoints.length > 8 ? 'Dàn Ý Chi Tiết (Đã dịch)' : 'Các Điểm Cốt Lõi (Đã dịch)'}
                  </h2>
                  <CopyButton textToCopy={translatedKeyPointsText} />
                </div>
                <ul className="space-y-3">
                  {translatedResult.keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-400 mr-3 mt-1"><KeyPointIcon /></span>
                      <span className="text-slate-300 leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

               <div className="text-center pt-4">
                    <button
                        onClick={onGoToScriptWriter}
                        disabled={!translatedResult}
                        className="inline-flex items-center gap-3 px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500"
                    >
                        <ScriptIcon />
                        Chuyển Thành Câu Chuyện
                    </button>
                </div>
          </div>
        )}
      </div>
    </div>
  );
};

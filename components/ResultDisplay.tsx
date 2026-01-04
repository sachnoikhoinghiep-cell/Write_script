import React from 'react';
import type { AnalysisResult } from '../types';
import { CopyButton } from './CopyButton';
import { LanguageSelector } from './LanguageSelector';
import { KeyPointIcon, ScriptIcon, TranslateIcon } from './icons';
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
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({
  result,
  translatedResult,
  onTranslate,
  isTranslating,
  targetLanguage,
  onLanguageChange,
  translationError,
  onGoToScriptWriter
}) => {
  const keyPointsText = result.keyPoints.map(point => `- ${point}`).join('\n');
  const translatedKeyPointsText = translatedResult?.keyPoints.map(point => `- ${point}`).join('\n') ?? '';

  return (
    <div className="space-y-8">
      {/* Original Results */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-2xl font-bold text-sky-400">Chủ Đề</h2>
          <CopyButton textToCopy={result.topic} />
        </div>
        <p className="text-slate-300 text-lg">{result.topic}</p>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-sky-400">Các Điểm Cốt Lõi</h2>
          <CopyButton textToCopy={keyPointsText} />
        </div>
        <ul className="space-y-3">
          {result.keyPoints.map((point, index) => (
            <li key={index} className="flex items-start">
              <span className="text-sky-400 mr-3 mt-1"><KeyPointIcon /></span>
              <span className="text-slate-300">{point}</span>
            </li>
          ))}
        </ul>
      </div>
      
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
                  <h2 className="text-2xl font-bold text-green-400">Chủ Đề (Đã dịch)</h2>
                  <CopyButton textToCopy={translatedResult.topic} />
                </div>
                <p className="text-slate-300 text-lg">{translatedResult.topic}</p>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-start gap-4 mb-4">
                  <h2 className="text-2xl font-bold text-green-400">Các Điểm Cốt Lõi (Đã dịch)</h2>
                  <CopyButton textToCopy={translatedKeyPointsText} />
                </div>
                <ul className="space-y-3">
                  {translatedResult.keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-400 mr-3 mt-1"><KeyPointIcon /></span>
                      <span className="text-slate-300">{point}</span>
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

import React, { useState, useCallback } from 'react';
import { analyzeTranscript, translateResult, extractContentFromUrl } from './services/geminiService';
import type { AnalysisResult } from './types';
import { Header } from './components/Header';
import { TranscriptInput } from './components/TranscriptInput';
import { ResultDisplay } from './components/ResultDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorDisplay } from './components/ErrorDisplay';
import { ScriptWriter } from './components/ScriptWriter';

type View = 'main' | 'scriptWriter';

const App: React.FC = () => {
  const [view, setView] = useState<View>('main');
  
  const [transcript, setTranscript] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('Đang phân tích...');
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [translatedResult, setTranslatedResult] = useState<AnalysisResult | null>(null);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string>('Vietnamese');

  const [scriptWriterInput, setScriptWriterInput] = useState<{ result: AnalysisResult; language: string } | null>(null);

  const isUrl = (text: string) => {
    try {
      const url = new URL(text.trim());
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
      return false;
    }
  };

  const handleAnalyze = useCallback(async () => {
    if (!transcript.trim()) {
      setError('Vui lòng nhập bản ghi hoặc liên kết trước khi phân tích.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setTranslatedResult(null);
    setTranslationError(null);

    try {
      let contentToAnalyze = transcript;

      if (isUrl(transcript)) {
        setLoadingMessage('Đang trích xuất nội dung từ liên kết...');
        contentToAnalyze = await extractContentFromUrl(transcript.trim());
      }

      setLoadingMessage('Đang phân tích chủ đề...');
      const analysis = await analyzeTranscript(contentToAnalyze);
      setResult(analysis);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('Đang phân tích...');
    }
  }, [transcript]);

  const handleTranslate = useCallback(async () => {
    if (!result) return;
    setIsTranslating(true);
    setTranslationError(null);
    setTranslatedResult(null);
    try {
        const translation = await translateResult(result, targetLanguage);
        setTranslatedResult(translation);
    } catch (err) {
        console.error(err);
        setTranslationError('Không thể dịch kết quả. Vui lòng thử lại.');
    } finally {
        setIsTranslating(false);
    }
  }, [result, targetLanguage]);

  const handleGoToScriptWriter = useCallback(() => {
    if (!translatedResult) return;
    setScriptWriterInput({ result: translatedResult, language: targetLanguage });
    setView('scriptWriter');
  }, [translatedResult, targetLanguage]);
  
  const handleBackToMain = useCallback(() => {
    setScriptWriterInput(null);
    setView('main');
  }, []);

  // Màn hình ScriptWriter
  if (view === 'scriptWriter' && scriptWriterInput) {
    return <ScriptWriter input={scriptWriterInput} onBack={handleBackToMain} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <Header />
        <main className="mt-8">
          <TranscriptInput
            transcript={transcript}
            onTranscriptChange={setTranscript}
            onAnalyze={handleAnalyze}
            isLoading={isLoading}
          />

          {error && <ErrorDisplay message={error} />}

          {isLoading && (
            <div className="text-center">
              <LoadingSpinner />
              <p className="text-sky-400 mt-2 animate-pulse">{loadingMessage}</p>
            </div>
          )}

          {result && !isLoading && (
            <div className="mt-8 animate-fade-in">
              <ResultDisplay
                result={result}
                translatedResult={translatedResult}
                onTranslate={handleTranslate}
                isTranslating={isTranslating}
                targetLanguage={targetLanguage}
                onLanguageChange={setTargetLanguage}
                translationError={translationError}
                onGoToScriptWriter={handleGoToScriptWriter}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;


import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { analyzeTranscript, translateResult, extractContentFromUrl } from './services/geminiService';
import type { AnalysisResult } from './types';
import { Header } from './components/Header';
import { TranscriptInput } from './components/TranscriptInput';
import { ResultDisplay } from './components/ResultDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorDisplay } from './components/ErrorDisplay';
import { ScriptWriter } from './components/ScriptWriter';
import { Footer } from './components/Footer';
import { SetupScreen } from './components/SetupScreen';

type View = 'main' | 'scriptWriter';

const App: React.FC = () => {
  const [view, setView] = useState<View>('main');
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [isAppLoading, setIsAppLoading] = useState<boolean>(true);
  
  const [transcript, setTranscript] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('Đang phân tích...');
  const [error, setError] = useState<string | null>(null);

  // YouTube API States
  const [youtubeApiKey, setYoutubeApiKey] = useState<string>('');
  const [userIp, setUserIp] = useState<string | null>(null);

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [translatedResult, setTranslatedResult] = useState<AnalysisResult | null>(null);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string>('Vietnamese');

  const [scriptWriterInput, setScriptWriterInput] = useState<{ result: AnalysisResult; language: string } | null>(null);

  // Lấy IP người dùng và kiểm tra session đã lưu
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        const currentIp = data.ip;
        setUserIp(currentIp);

        const savedKey = localStorage.getItem('yt_api_key');
        const savedIp = localStorage.getItem('yt_last_ip');

        // Nếu có key và IP không đổi, bỏ qua màn hình setup
        if (savedKey && savedIp === currentIp) {
          setYoutubeApiKey(savedKey);
          setIsConfigured(true);
        } else if (savedIp && savedIp !== currentIp) {
          // IP đã thay đổi, xóa sạch session để bảo mật
          localStorage.removeItem('yt_api_key');
          localStorage.removeItem('yt_last_ip');
          setIsConfigured(false);
        } else {
          setIsConfigured(false);
        }
      } catch (err) {
        console.error("Không thể lấy IP người dùng:", err);
        // Nếu không lấy được IP, vẫn cho phép setup nhưng không lưu IP check
        setIsConfigured(localStorage.getItem('yt_api_key') ? true : false);
      } finally {
        setIsAppLoading(false);
      }
    };
    checkSession();
  }, []);

  const isUrl = useCallback((text: string) => {
    try {
      const url = new URL(text.trim());
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
      return false;
    }
  }, []);

  const isYoutubeUrl = useMemo(() => {
    if (!isUrl(transcript)) return false;
    const url = transcript.trim().toLowerCase();
    return url.includes('youtube.com') || url.includes('youtu.be');
  }, [transcript, isUrl]);

  const handleSetupComplete = (key: string) => {
    setYoutubeApiKey(key);
    setIsConfigured(true);
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
        setLoadingMessage('Đang cố gắng trích xuất nội dung từ liên kết...');
        try {
          contentToAnalyze = await extractContentFromUrl(transcript.trim(), youtubeApiKey);
        } catch (extractErr: any) {
          setError(extractErr.message);
          setIsLoading(false);
          return;
        }
      }

      setLoadingMessage('Đang phân tích chủ đề và điểm cốt lõi...');
      const analysis = await analyzeTranscript(contentToAnalyze);
      setResult(analysis);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('Đang phân tích...');
    }
  }, [transcript, isUrl, youtubeApiKey]);

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

  if (isAppLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center">
        <LoadingSpinner />
        <p className="text-indigo-400 mt-4 animate-pulse font-mono text-sm">INITIALIZING AI SYSTEM...</p>
      </div>
    );
  }

  if (!isConfigured) {
    return <SetupScreen onComplete={handleSetupComplete} currentIp={userIp} />;
  }

  if (view === 'scriptWriter' && scriptWriterInput) {
    return <ScriptWriter input={scriptWriterInput} onBack={handleBackToMain} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto flex-grow">
        <Header />
        <main className="mt-8">
          <TranscriptInput
            transcript={transcript}
            onTranscriptChange={setTranscript}
            onAnalyze={handleAnalyze}
            isLoading={isLoading}
            isYoutubeUrl={isYoutubeUrl}
          />

          <div className="mt-4 flex justify-end">
            <button 
              onClick={() => setIsConfigured(false)}
              className="text-[10px] uppercase tracking-widest font-bold text-slate-600 hover:text-indigo-400 transition-colors"
            >
              Thiết lập lại API
            </button>
          </div>

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
      <Footer />
    </div>
  );
};

export default App;
